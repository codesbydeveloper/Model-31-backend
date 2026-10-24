const { randomUUID } = require("crypto");
const { TwitterApi } = require("twitter-api-v2");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const Dealership = require("../models/Dealership");

const LOW_INTENT = new Set([
  "nice",
  "cool",
  "wow",
  "lol",
  "haha",
  "love",
  "love this",
  "awesome",
  "great",
  "amazing",
  "beautiful",
  "congrats",
  "congratulations",
  "first",
  "ok",
  "okay",
  "yes",
  "hi",
  "hii",
  "hiii",
  "hello",
  "hey",
]);

let client = null;
let myId = null;

function xClient() {
  if (!client) {
    client = new TwitterApi({
      appKey: process.env.X_API_KEY,
      appSecret: process.env.X_API_SECRET,
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_SECRET,
    });
  }
  return client;
}

function cleanedText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isGreeting(text) {
  const cleaned = cleanedText(text);
  if (!cleaned) return true;
  if (LOW_INTENT.has(cleaned)) return true;
  const compact = cleaned.replace(/\s/g, "");
  return /^(h+i+|h+e+y+|h+e+l+o+|helo+|yo+|hola|sup)$/.test(compact) || cleaned.length < 4;
}

function extractPhone(text) {
  const match = String(text || "").match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/
  );
  if (!match) return "";
  const digits = match[0].replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return "";
  return match[0].trim();
}

function extractVehicle(text, phone) {
  let rest = String(text || "");
  if (phone) rest = rest.replace(phone, " ");
  rest = rest
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!rest || isGreeting(rest) || rest.length < 3) return "";
  return rest.slice(0, 255);
}

function extractName(text) {
  const match = String(text || "").match(
    /\b(?:my name is|this is|i am|i'm)\s+([A-Za-z][A-Za-z' -]{1,40})/i
  );
  if (!match) return "";
  return match[1].trim().slice(0, 191);
}

async function getMyId() {
  if (myId) return myId;
  const me = await xClient().v2.me();
  myId = me.data.id;
  console.log("X account:", me.data.username, myId);
  return myId;
}

async function dealershipId() {
  const [rows] = await pool.query(
    `SELECT dealership_id FROM social_accounts
     WHERE platform = 'Facebook' AND status = 'CONNECTED'
     ORDER BY updated_at DESC LIMIT 1`
  );
  if (rows[0]?.dealership_id) return rows[0].dealership_id;
  const options = await Dealership.listAllOptions();
  return options[0]?.id || null;
}

async function inventoryLines() {
  try {
    const id = await dealershipId();
    const params = [];
    let where = "";
    if (id) {
      where = "WHERE dealership_id = ?";
      params.push(id);
    }
    const [rows] = await pool.query(
      `SELECT year, make, model, vehicle, price
       FROM merchandising_vehicles
       ${where}
       ORDER BY updated_at DESC
       LIMIT 30`,
      params
    );
    if (!rows.length) return "No vehicles are in inventory.";
    return rows
      .map((row) => {
        const name = row.vehicle || [row.year, row.make, row.model].filter(Boolean).join(" ");
        const price = Number(row.price) > 0 ? `$${Number(row.price)}` : "price not listed";
        return `- ${name} — ${price}`;
      })
      .join("\n");
  } catch (err) {
    console.error("X inventory read failed:", err.message);
    return "Inventory could not be loaded.";
  }
}

async function askAI(text, isPublic, extra) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const inventory = await inventoryLines();
    const publicRules =
      "You are the assistant for Model 31, a vehicle dealer, replying publicly on X. " +
      "Reply in under 240 characters, friendly. Never ask for a phone number in public. " +
      "If they want to buy, invite them to send us a DM. " +
      "Use only the inventory list. Do not invent vehicles or prices.";
    const dmRules =
      "You are the sales assistant for Model 31, a vehicle dealer, replying to a DM on X. " +
      "Be short and friendly. Use only the inventory list. Do not invent vehicles or prices. " +
      "If the chat already names a vehicle, stay on that vehicle. " +
      "Find out which vehicle they want, then politely ask for their name and phone number. " +
      "If a phone number is already known, do not ask for it again.";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: isPublic ? publicRules : dmRules },
          {
            role: "user",
            content: `Inventory:\n${inventory}\n\n${extra || ""}\n\nMessage: ${text}`,
          },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("X OpenAI error:", data?.error?.message || response.status);
      return null;
    }
    let reply = String(data.choices?.[0]?.message?.content || "").trim();
    if (!reply) return null;
    if (isPublic && reply.length > 270) reply = reply.slice(0, 267) + "...";
    return reply;
  } catch (err) {
    console.error("X OpenAI error:", err.message);
    return null;
  }
}

async function isProcessed(id) {
  const [rows] = await pool.query(
    "SELECT item_id FROM x_processed_items WHERE item_id = ?",
    [id]
  );
  return rows.length > 0;
}

async function markProcessed(id, type) {
  await pool.query(
    "INSERT IGNORE INTO x_processed_items (item_id, item_type) VALUES (?, ?)",
    [id, type]
  );
}

async function isFirstRun() {
  const [rows] = await pool.query("SELECT COUNT(*) AS c FROM x_processed_items");
  return Number(rows[0].c) === 0;
}

async function findThread(externalKey) {
  const [rows] = await pool.query(
    "SELECT * FROM social_reply_threads WHERE external_key = ? LIMIT 1",
    [externalKey]
  );
  return rows[0] || null;
}

async function saveThread(senderId, fields) {
  const key = `xdm:${senderId}`;
  const current = await findThread(key);
  if (!current) {
    const id = `socrep_${randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO social_reply_threads
        (id, channel, external_key, page_id, sender_id, sender_name, last_message, phone, vehicle, lead_id, status)
       VALUES (?, 'x', ?, 'x', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        key,
        senderId,
        fields.senderName || null,
        fields.lastMessage || null,
        fields.phone || null,
        fields.vehicle || null,
        fields.leadId || null,
        fields.status || "OPEN",
      ]
    );
    return findThread(key);
  }
  await pool.query(
    `UPDATE social_reply_threads
     SET last_message = ?, phone = ?, vehicle = ?, lead_id = ?, status = ?, sender_name = ?
     WHERE external_key = ?`,
    [
      fields.lastMessage !== undefined ? fields.lastMessage : current.last_message,
      fields.phone !== undefined ? fields.phone : current.phone,
      fields.vehicle !== undefined ? fields.vehicle : current.vehicle,
      fields.leadId !== undefined ? fields.leadId : current.lead_id,
      fields.status || current.status,
      fields.senderName !== undefined ? fields.senderName : current.sender_name,
      key,
    ]
  );
  return findThread(key);
}

async function createXLead(thread) {
  const lead = await Lead.create({
    customerName: thread.sender_name || "X customer",
    customerPhone: thread.phone,
    vehicle: thread.vehicle,
    source: "X",
    pipeline: "MODEL 31",
    status: "NEW",
    score: 70,
    tier: "Tier B",
    dealershipId: await dealershipId(),
    notes: "DETECT. Mobile number and vehicle captured from X. A person should take over.",
  });
  return lead;
}

function mentionList(res) {
  if (Array.isArray(res?.tweets)) return res.tweets;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function dmList(res) {
  if (Array.isArray(res?.events)) return res.events;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function dmBody(dm) {
  return String(dm.text || dm.message_create?.message_data?.text || "").trim();
}

async function checkMentions(firstRun) {
  const id = await getMyId();
  const res = await xClient().v2.userMentionTimeline(id, {
    max_results: 20,
    "tweet.fields": ["author_id", "created_at"],
  });

  for (const tweet of mentionList(res)) {
    if (!tweet?.id || tweet.author_id === id) continue;
    if (await isProcessed(tweet.id)) continue;
    if (firstRun) {
      await markProcessed(tweet.id, "mention");
      continue;
    }

    console.log("X mention:", tweet.text);
    const reply = await askAI(tweet.text, true);
    if (!reply) continue;
    await xClient().v2.reply(reply, tweet.id);
    await markProcessed(tweet.id, "mention");
    console.log("X mention reply sent");
  }
}

async function checkDMs(firstRun) {
  const id = await getMyId();
  const res = await xClient().v2.listDmEvents({
    event_types: "MessageCreate",
    "dm_event.fields": ["sender_id", "text", "created_at"],
    max_results: 20,
  });

  for (const dm of dmList(res)) {
    const text = dmBody(dm);
    if (!dm?.id || !text || dm.sender_id === id) continue;
    if (await isProcessed(dm.id)) continue;
    if (firstRun) {
      await markProcessed(dm.id, "dm");
      continue;
    }

    const key = `xdm:${dm.sender_id}`;
    const existing = await findThread(key);
    const phone = existing?.phone || extractPhone(text);
    const vehicle = existing?.vehicle || extractVehicle(text, phone);
    const senderName = existing?.sender_name || extractName(text) || null;
    const chat = [existing?.last_message, `Customer: ${text}`].filter(Boolean).join("\n");

    let leadId = existing?.lead_id || null;
    let status = existing?.status || "OPEN";
    if (phone && vehicle && !leadId) {
      const lead = await createXLead({
        sender_name: senderName,
        phone,
        vehicle,
      });
      leadId = lead?.id || null;
      status = "HANDED_OFF";
    }

    console.log("X DM:", dm.sender_id, text);
    const reply = await askAI(
      text,
      false,
      `Recent chat:\n${chat}\nKnown mobile: ${phone || "none"}\nKnown vehicle interest: ${vehicle || "none"}`
    );
    if (!reply) continue;

    await xClient().v2.sendDmToParticipant(dm.sender_id, { text: reply });
    await saveThread(dm.sender_id, {
      senderName,
      lastMessage: `${chat}\nModel 31: ${reply}`.slice(-4000),
      phone: phone || null,
      vehicle: vehicle || null,
      leadId,
      status,
    });
    await markProcessed(dm.id, "dm");
    console.log("X DM reply sent");
  }
}

async function checkX() {
  if (!process.env.X_API_KEY || !process.env.X_ACCESS_TOKEN) return;
  try {
    const firstRun = await isFirstRun();
    if (firstRun) console.log("First run: saving old X items without replying");
    await checkMentions(firstRun);
    await checkDMs(firstRun);
  } catch (err) {
    console.error("X error:", err.data || err.message);
  }
}

module.exports = { checkX };
