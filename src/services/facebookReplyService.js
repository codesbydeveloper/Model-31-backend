const { randomUUID } = require("crypto");
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

function graphVersion() {
  const version = String(process.env.META_GRAPH_VERSION || "v23.0").trim();
  return version.startsWith("v") ? version : `v${version}`;
}

function pageId() {
  return String(process.env.META_PAGE_ID || "").trim();
}

function pageToken() {
  return String(process.env.META_PAGE_ACCESS_TOKEN || "").trim();
}

function instagramAccountId() {
  return String(process.env.INSTAGRAM_ACCOUNT_ID || "").trim();
}

async function graphPost(path, params) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path}`);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const message = body.error?.message || "Facebook did not accept the reply";
    throw new Error(message);
  }
  return body;
}

async function graphGet(path, params) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url);
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(body.error?.message || "Facebook could not be read");
  }
  return body;
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
  if (/^(h+i+|h+e+y+|h+e+l+o+|helo+|yo+|hola|sup)$/.test(compact)) return true;
  return cleaned.length < 4;
}

function isLowIntent(text) {
  return isGreeting(text);
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
  if (!rest || isGreeting(rest)) return "";
  if (rest.length < 3) return "";
  return rest.slice(0, 255);
}

async function findThread(externalKey) {
  const [rows] = await pool.query(
    `SELECT * FROM social_reply_threads WHERE external_key = ? LIMIT 1`,
    [externalKey]
  );
  return rows[0] || null;
}

async function insertThread(data) {
  const id = `socrep_${randomUUID().slice(0, 8)}`;
  try {
    await pool.query(
      `INSERT INTO social_reply_threads
        (id, channel, external_key, page_id, sender_id, sender_name, last_message, phone, vehicle, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [
        id,
        data.channel,
        data.externalKey,
        pageId(),
        data.senderId || null,
        data.senderName || null,
        data.lastMessage || null,
        data.phone || null,
        data.vehicle || null,
      ]
    );
    return findThread(data.externalKey);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") return null;
    throw err;
  }
}

async function updateThread(externalKey, fields) {
  const current = await findThread(externalKey);
  if (!current) return null;
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
      externalKey,
    ]
  );
  return findThread(externalKey);
}

async function dealershipIdForPage() {
  const [rows] = await pool.query(
    `SELECT dealership_id FROM social_accounts
     WHERE platform = 'Facebook' AND status = 'CONNECTED'
     ORDER BY updated_at DESC LIMIT 1`
  );
  if (rows[0]?.dealership_id) return rows[0].dealership_id;
  const options = await Dealership.listAllOptions();
  return options[0]?.id || null;
}

async function sendFacebookReplyToLead(leadId, text) {
  const AppError = require("../utils/AppError");
  if (!leadId || !text) return { sent: false };
  const [rows] = await pool.query(
    `SELECT sender_id FROM social_reply_threads
     WHERE lead_id = ? AND channel = 'messenger' AND sender_id IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [leadId]
  );
  const senderId = rows[0]?.sender_id;
  if (!senderId) return { sent: false };
  if (!pageId() || !pageToken()) {
    throw new AppError("Facebook Page is not configured", 400);
  }
  try {
    await sendPageMessage({ id: senderId }, text);
  } catch (err) {
    throw new AppError(err.message || "Facebook did not accept the reply", 400);
  }
  await pool.query(
    `UPDATE social_reply_threads SET last_message = ? WHERE lead_id = ? AND channel = 'messenger' AND sender_id = ?`,
    [text, leadId, senderId]
  );
  return {
    sent: true,
    message: {
      id: `fb_out_${Date.now()}`,
      leadId,
      senderType: "AI",
      senderName: "Model 31",
      message: text,
      createdAt: new Date().toISOString(),
      source: "facebook",
    },
  };
}

async function sendPageMessage(recipient, text) {
  await graphPost(`${pageId()}/messages`, {
    recipient: JSON.stringify(recipient),
    message: JSON.stringify({ text }),
    messaging_type: "RESPONSE",
    access_token: pageToken(),
  });
}

async function replyToCommentPublicly(commentId, text) {
  await graphPost(`${commentId}/comments`, {
    message: text,
    access_token: pageToken(),
  });
}

function publicReply(message, lowIntent) {
  if (lowIntent) {
    return "Thanks for stopping by Model 31.";
  }
  const snippet = String(message || "").trim().slice(0, 80);
  return snippet
    ? `Thanks for the question about “${snippet}”. We sent you a private message so we can help.`
    : "Thanks for commenting. We sent you a private message so we can help.";
}

function openingDm(name) {
  const who = name ? `Hi ${name}, ` : "Hi, ";
  return `${who}thanks for commenting on Model 31. What is the best mobile number to reach you, and which vehicle are you interested in?`;
}

async function loadInventoryLines(dealershipId) {
  const params = [];
  let where = "";
  if (dealershipId) {
    where = "WHERE dealership_id = ?";
    params.push(dealershipId);
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
}

async function recentChatLines(senderId) {
  if (!senderId || !pageId() || !pageToken()) return "";
  try {
    const body = await graphGet(`${pageId()}/conversations`, {
      user_id: senderId,
      fields: "messages.limit(12){message,from,created_time}",
      access_token: pageToken(),
    });
    const page = pageId();
    const lines = (body.data?.[0]?.messages?.data || [])
      .filter((item) => item.message)
      .sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime())
      .map((item) => `${item.from?.id === page ? "Model 31" : "Customer"}: ${item.message}`);
    return lines.join("\n");
  } catch (err) {
    console.error("Facebook chat history read failed:", err.message);
    return "";
  }
}

async function aiFacebookReply({ text, phone, vehicle, inventory, chat }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";
  try {
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
          {
            role: "system",
            content: `You reply to Facebook messages for a car dealership named Model 31.
Use only the inventory list. If the customer asks for a vehicle that is not on the list, say it is not available.
Do not invent vehicles, prices, mileage, colors, or features. You may repeat a detail only when it is already written in an inventory line.
Write 1 or 2 short sentences in plain text. Do not mention AI.
Read the recent chat. If the customer says "that", "tell me more", or "I want to purchase", continue about the vehicle already named in the chat. Do not ask which vehicle again when the chat already names one.
If they only greet you and no vehicle is in the chat yet, greet them and ask which vehicle they want.
If they are interested and no mobile number is known, ask for the best mobile number.
If a mobile number is already known, do not ask for it again.`,
          },
          {
            role: "user",
            content: `Inventory:\n${inventory}\n\nRecent chat:\n${chat || "none"}\n\nKnown mobile: ${phone || "none"}\nKnown vehicle interest: ${vehicle || "none"}\n\nNewest customer message: ${text}`,
          },
        ],
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Facebook AI reply failed:", data?.error?.message || response.status);
      return "";
    }
    return String(data.choices?.[0]?.message?.content || "")
      .trim()
      .slice(0, 500);
  } catch (err) {
    console.error("Facebook AI reply failed:", err.message);
    return "";
  }
}

function fallbackReply(phone) {
  if (!phone) {
    return "I can help with the vehicles we have in stock. Which vehicle are you looking for, and what is the best mobile number to reach you?";
  }
  return "I can help with the vehicles we have in stock. Which vehicle are you looking for?";
}

async function createDetectLead(thread, source = "Facebook") {
  const dealershipId = await dealershipIdForPage();
  const lead = await Lead.create({
    customerName: thread.sender_name || `${source} customer`,
    customerPhone: thread.phone,
    vehicle: thread.vehicle,
    source,
    pipeline: "MODEL 31",
    status: "NEW",
    score: 70,
    tier: "Tier B",
    dealershipId,
    notes: `DETECT. Mobile number and vehicle captured from ${source}. A person should take over.`,
  });
  return lead;
}

async function handleDirectMessage({ senderId, senderName, text }) {
  if (!senderId || !text) return;
  if (senderId === pageId()) return;
  const key = `dm:${senderId}`;
  let thread = await findThread(key);
  if (!thread) {
    thread = await insertThread({
      channel: "messenger",
      externalKey: key,
      senderId,
      senderName: senderName || null,
      lastMessage: text,
    });
    if (!thread) return;
  }

  const phone = thread.phone || extractPhone(text);
  const vehicle = thread.vehicle || extractVehicle(text, phone);
  let leadId = thread.lead_id || null;
  if (phone && vehicle && !leadId) {
    const saved = await updateThread(key, {
      lastMessage: text,
      phone,
      vehicle,
      senderName: senderName || thread.sender_name,
      status: "HANDED_OFF",
    });
    const lead = await createDetectLead(saved);
    leadId = lead.id;
    await updateThread(key, { leadId, status: "HANDED_OFF" });
  } else {
    await updateThread(key, {
      lastMessage: text,
      phone: phone || null,
      vehicle: vehicle || null,
      senderName: senderName || thread.sender_name,
    });
  }

  const [inventory, chat] = await Promise.all([
    loadInventoryLines(await dealershipIdForPage()),
    recentChatLines(senderId),
  ]);
  const reply =
    (await aiFacebookReply({ text, phone, vehicle, inventory, chat })) || fallbackReply(phone);
  await sendPageMessage({ id: senderId }, reply);
}

async function handleComment({ commentId, message, fromId, fromName }) {
  if (!commentId) return;
  if (fromId && fromId === pageId()) return;
  const key = `comment:${commentId}`;
  const existing = await findThread(key);
  if (existing) return;

  const lowIntent = isLowIntent(message);
  const thread = await insertThread({
    channel: "comment",
    externalKey: key,
    senderId: fromId || null,
    senderName: fromName || null,
    lastMessage: message || "",
  });
  if (!thread) return;

  try {
    await replyToCommentPublicly(commentId, publicReply(message, lowIntent));
  } catch (err) {
    console.error("Facebook public reply failed:", err.message);
  }

  if (lowIntent) return;

  try {
    await sendPageMessage({ comment_id: commentId }, openingDm(fromName));
  } catch (err) {
    console.error("Facebook private reply failed:", err.message);
  }

  if (fromId) {
    await insertThread({
      channel: "messenger",
      externalKey: `dm:${fromId}`,
      senderId: fromId,
      senderName: fromName || null,
      lastMessage: message || "",
    });
  }
}

async function graphPostJson(path, payload) {
  const url = new URL(`https://graph.facebook.com/${graphVersion()}/${path}`);
  url.searchParams.set("access_token", pageToken());
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    throw new Error(body.error?.message || "Instagram did not accept the reply");
  }
  return body;
}

async function instagramReplyText(text, phone = "", vehicle = "") {
  const inventory = await loadInventoryLines(await dealershipIdForPage());
  return (
    (await aiFacebookReply({ text, phone, vehicle, inventory, chat: "" })) ||
    fallbackReply(phone)
  );
}

async function sendInstagramMessage(userId, text) {
  if (!pageId() || !pageToken()) {
    console.error("Instagram DM error: Facebook Page is not configured");
    return;
  }
  await graphPostJson(`${pageId()}/messages`, {
    recipient: { id: userId },
    message: { text },
  });
  console.log("Instagram DM reply sent");
}

async function replyInstagramComment(commentId, text) {
  if (!pageToken()) {
    console.error("Instagram comment error: Facebook Page is not configured");
    return;
  }
  await graphPostJson(`${commentId}/replies`, { message: text });
  console.log("Instagram comment reply sent");
}

async function handleInstagramDirectMessage({ senderId, senderName, text }) {
  console.log("Instagram DM:", senderId, text);
  try {
    const key = `ig:${senderId}`;
    let thread = await findThread(key);
    if (!thread) {
      thread = await insertThread({
        channel: "instagram",
        externalKey: key,
        senderId,
        senderName: senderName || null,
        lastMessage: text,
      });
      if (!thread) return;
    }

    const phone = thread.phone || extractPhone(text);
    const vehicle = thread.vehicle || extractVehicle(text, phone);
    if (phone && vehicle && !thread.lead_id) {
      const saved = await updateThread(key, {
        lastMessage: text,
        phone,
        vehicle,
        senderName: senderName || thread.sender_name,
        status: "HANDED_OFF",
      });
      const lead = await createDetectLead(saved, "Instagram");
      await updateThread(key, { leadId: lead.id, status: "HANDED_OFF" });
    } else {
      await updateThread(key, {
        lastMessage: text,
        phone: phone || null,
        vehicle: vehicle || null,
        senderName: senderName || thread.sender_name,
      });
    }

    const reply = await instagramReplyText(text, phone, vehicle);
    await sendInstagramMessage(senderId, reply);
  } catch (err) {
    console.error("Instagram DM error:", err.message);
  }
}

async function handleInstagramComment({ commentId, text, username }) {
  console.log("Instagram comment:", username || "", text);
  try {
    const reply = await instagramReplyText(text);
    await replyInstagramComment(commentId, reply);
  } catch (err) {
    console.error("Instagram comment error:", err.message);
  }
}

function handleInstagramPayload(body = {}) {
  const igId = instagramAccountId();
  const tasks = [];
  for (const entry of body.entry || []) {
    for (const event of entry.messaging || []) {
      const text = event.message?.text;
      const isEcho = event.message?.is_echo;
      const senderId = event.sender?.id;
      if (text && !isEcho && senderId && senderId !== igId) {
        tasks.push(
          handleInstagramDirectMessage({
            senderId,
            senderName: event.sender?.name || null,
            text,
          })
        );
      }
    }
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;
      const value = change.value || {};
      const text = value.message?.text;
      const senderId = value.sender?.id;
      if (text && senderId) {
        tasks.push(
          (async () => {
            console.log("🧪 Instagram TEST DM:", senderId, text);
            const reply = await instagramReplyText(text);
            console.log("🤖 AI reply would be:", reply);
          })()
        );
      }
    }
    for (const change of entry.changes || []) {
      const value = change.value || {};
      if (change.field === "comments" && value.text && value.id && value.from?.id !== igId) {
        tasks.push(
          handleInstagramComment({
            commentId: value.id,
            text: value.text,
            username: value.from?.username,
          })
        );
      }
    }
  }
  return Promise.all(tasks);
}

async function sendWhatsAppMessage(to, text) {
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const token = String(process.env.WHATSAPP_TOKEN || "").trim();
  if (!phoneNumberId || !token || !text) {
    console.error("WhatsApp error: WhatsApp is not configured");
    return;
  }
  const response = await fetch(
    `https://graph.facebook.com/${graphVersion()}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    console.error("WhatsApp error:", body.error?.message || body.error || response.status);
    return;
  }
  console.log("WhatsApp reply sent");
}

async function handleWhatsAppMessage({ messageId, from, text, name }) {
  console.log("WhatsApp:", name, from, text);
  try {
    if (messageId) {
      const marker = await insertThread({
        channel: "whatsapp",
        externalKey: `wamsg:${messageId}`,
        senderId: from,
        senderName: name || null,
        lastMessage: text,
      });
      if (!marker) return;
    }

    const key = `wa:${from}`;
    let thread = await findThread(key);
    if (!thread) {
      thread = await insertThread({
        channel: "whatsapp",
        externalKey: key,
        senderId: from,
        senderName: name || null,
        lastMessage: text,
      });
      if (!thread) thread = await findThread(key);
      if (!thread) return;
    }

    const previous = thread.last_message || "";
    const phone = from;
    const vehicle = thread.vehicle || extractVehicle(text, "");
    if (vehicle && !thread.lead_id) {
      const saved = await updateThread(key, {
        lastMessage: text,
        phone,
        vehicle,
        senderName: name || thread.sender_name,
        status: "HANDED_OFF",
      });
      const lead = await createDetectLead(saved, "WhatsApp");
      await updateThread(key, { leadId: lead.id, status: "HANDED_OFF" });
    } else {
      await updateThread(key, {
        lastMessage: text,
        phone,
        vehicle: vehicle || null,
        senderName: name || thread.sender_name,
      });
    }

    const inventory = await loadInventoryLines(await dealershipIdForPage());
    const reply =
      (await aiFacebookReply({
        text,
        phone,
        vehicle: vehicle || "",
        inventory,
        chat: previous && previous !== text ? previous : "",
      })) || fallbackReply(phone);
    await sendWhatsAppMessage(from, reply);
    await updateThread(key, {
      lastMessage: [previous, `Customer: ${text}`, `Model 31: ${reply}`].filter(Boolean).join("\n").slice(-4000),
      phone,
      vehicle: vehicle || null,
      senderName: name || thread.sender_name,
    });
  } catch (err) {
    console.error("WhatsApp error:", err.message);
  }
}

function handleWhatsAppPayload(body = {}) {
  const tasks = [];
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const name = value.contacts?.[0]?.profile?.name || "";
      for (const msg of value.messages || []) {
        if (msg.type !== "text" || !msg.from || !msg.text?.body) continue;
        tasks.push(
          handleWhatsAppMessage({
            messageId: msg.id,
            from: msg.from,
            text: msg.text.body,
            name,
          })
        );
      }
    }
  }
  return Promise.all(tasks);
}

function handleWebhookPayload(body = {}) {
  if (body.object === "whatsapp_business_account") return handleWhatsAppPayload(body);
  if (body.object === "instagram") return handleInstagramPayload(body);
  if (body.object !== "page" || !Array.isArray(body.entry)) return;
  const tasks = [];
  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      if (change.field !== "feed") continue;
      if (value.item !== "comment" || value.verb !== "add") continue;
      tasks.push(
        handleComment({
          commentId: value.comment_id,
          message: value.message,
          fromId: value.from?.id,
          fromName: value.from?.name,
        })
      );
    }
    for (const event of entry.messaging || []) {
      if (!event.message || event.message.is_echo) continue;
      tasks.push(
        handleDirectMessage({
          senderId: event.sender?.id,
          text: event.message.text,
        })
      );
    }
  }
  return Promise.all(tasks);
}

async function listFacebookMessagesForLead(leadId) {
  if (!leadId) return null;
  const [rows] = await pool.query(
    `SELECT sender_id FROM social_reply_threads
     WHERE lead_id = ? AND channel = 'messenger' AND sender_id IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [leadId]
  );
  const senderId = rows[0]?.sender_id;
  if (!senderId) return null;
  if (!pageId() || !pageToken()) return [];

  try {
    const body = await graphGet(`${pageId()}/conversations`, {
      user_id: senderId,
      fields: "messages.limit(50){id,message,from,created_time}",
      access_token: pageToken(),
    });
    const raw = body.data?.[0]?.messages?.data || [];
    const page = pageId();
    return raw
      .filter((item) => item.message)
      .map((item) => ({
        id: item.id,
        leadId,
        senderType: item.from?.id === page ? "AI" : "CUSTOMER",
        senderName: item.from?.name || (item.from?.id === page ? "Model 31" : "Customer"),
        message: item.message,
        createdAt: item.created_time,
        source: "facebook",
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } catch (err) {
    console.error("Facebook conversation read failed:", err.message);
    return [];
  }
}

function messagesForConversation(localMessages, facebookMessages) {
  if (facebookMessages === null) return localMessages;
  return facebookMessages;
}

async function subscribePageEvents() {
  if (!pageId() || !pageToken()) return;
  await graphPost(`${pageId()}/subscribed_apps`, {
    subscribed_fields: "feed,messages,messaging_postbacks",
    access_token: pageToken(),
  });
}

async function replyToRecentComments() {
  if (!pageId() || !pageToken()) return;
  const feed = await graphGet(`${pageId()}/posts`, {
    fields: "id,comments.limit(20){id,message,from,created_time}",
    limit: "5",
    access_token: pageToken(),
  });
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  for (const post of feed.data || []) {
    for (const comment of post.comments?.data || []) {
      const created = comment.created_time ? new Date(comment.created_time).getTime() : 0;
      if (created && created < cutoff) continue;
      await handleComment({
        commentId: comment.id,
        message: comment.message,
        fromId: comment.from?.id,
        fromName: comment.from?.name,
      });
    }
  }
}

module.exports = {
  handleWebhookPayload,
  replyToRecentComments,
  subscribePageEvents,
  listFacebookMessagesForLead,
  messagesForConversation,
  sendFacebookReplyToLead,
};
