const pool = require("../config/database");
const Conversation = require("../models/Conversation");
const { decryptToken } = require("../utils/tokenCrypto");
const { isQuietHours, nextOpenUtc, formatUtcSql } = require("../utils/dealerClock");
const { sendSms } = require("./smsCarrierService");
const {
  INVOICE_FLOOR_RULES,
  SMS_SALES_PATH,
  formatInventoryList,
  finishSalesReply,
} = require("../utils/aiSalesTalk");
const { prepareSmsSalesTurn, rememberOfferedFromReply, salesPromptBlock } = require("./smsSalesFlow");
const { handleHereArrival } = require("./smsHereService");

let running = false;

function keywordOf(text) {
  const word = String(text || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(word)) return "STOP";
  if (["HELP", "INFO"].includes(word)) return "HELP";
  if (["START", "UNSTOP"].includes(word)) return "START";
  if (["HERE", "IMHERE", "IAMHERE", "HERENOW"].includes(word)) return "HERE";
  const first = String(text || "")
    .trim()
    .split(/\s+/)[0]
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (first === "HERE") return "HERE";
  return "";
}

async function claimNext() {
  const [rows] = await pool.query(
    `SELECT id FROM sms_messages
     WHERE status IN ('queued', 'held')
       AND (send_after IS NULL OR send_after <= UTC_TIMESTAMP())
     ORDER BY created_at ASC
     LIMIT 1`
  );
  if (!rows[0]) return null;
  const [result] = await pool.query(
    `UPDATE sms_messages
     SET status = 'sending', updated_at = UTC_TIMESTAMP()
     WHERE id = ? AND status IN ('queued', 'held')`,
    [rows[0].id]
  );
  if (!result.affectedRows) return null;
  const [full] = await pool.query(`SELECT * FROM sms_messages WHERE id = ? LIMIT 1`, [rows[0].id]);
  return full[0] || null;
}

async function mark(id, status, lastError = null, sendAfter = null) {
  await pool.query(
    `UPDATE sms_messages
     SET status = ?, last_error = ?, send_after = ?, updated_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [status, lastError ? String(lastError).slice(0, 255) : null, sendAfter, id]
  );
}

async function loadAccount(dealershipId) {
  const [rows] = await pool.query(
    `SELECT id, name, timezone, sms_provider, sms_account_sid, sms_auth_token,
            sms_phone_number, sms_manager_mobile, sms_manager_email, sms_profile_id, sms_status
     FROM dealerships
     WHERE id = ?
     LIMIT 1`,
    [dealershipId]
  );
  const row = rows[0];
  if (!row) return null;
  if (!row.sms_provider || !row.sms_phone_number || !row.sms_auth_token) return null;
  return {
    dealershipId: row.id,
    dealershipName: row.name,
    timezone: row.timezone || "America/New_York",
    providerType: row.sms_provider,
    accountSid: row.sms_account_sid,
    authToken: decryptToken(row.sms_auth_token),
    phoneNumber: row.sms_phone_number,
    managerMobile: row.sms_manager_mobile || "",
    managerEmail: row.sms_manager_email || "",
    carrierProfileId: row.sms_profile_id || null,
    paused: String(row.sms_status || "CONNECTED").toUpperCase() === "DISCONNECTED",
  };
}

async function isOptedOut(dealershipId, phone) {
  const [rows] = await pool.query(
    `SELECT 1 AS opted_out FROM sms_opt_outs WHERE dealership_id = ? AND phone_number = ? LIMIT 1`,
    [dealershipId, phone]
  );
  return Boolean(rows[0]);
}

async function optOut(dealershipId, phone) {
  await pool.query(
    `INSERT IGNORE INTO sms_opt_outs (dealership_id, phone_number) VALUES (?, ?)`,
    [dealershipId, phone]
  );
}

async function optIn(dealershipId, phone) {
  await pool.query(
    `DELETE FROM sms_opt_outs WHERE dealership_id = ? AND phone_number = ?`,
    [dealershipId, phone]
  );
}

async function inventoryLines(dealershipId) {
  try {
    const [rows] = await pool.query(
      `SELECT year, make, model, trim, mileage, color, vin, stock_number, vehicle, price, min_price
       FROM merchandising_vehicles
       WHERE dealership_id = ?
       ORDER BY updated_at DESC
       LIMIT 30`,
      [dealershipId]
    );
    return formatInventoryList(rows);
  } catch (err) {
    console.error("[SMS] Inventory read failed:", err.message);
    return "No vehicles are in inventory.";
  }
}

async function recentChat(leadId) {
  if (!leadId) return "";
  const [rows] = await pool.query(
    `SELECT sender_type, message
     FROM conversation_messages
     WHERE lead_id = ?
     ORDER BY created_at DESC
     LIMIT 8`,
    [leadId]
  );
  return rows
    .reverse()
    .map((row) => `${row.sender_type === "CUSTOMER" ? "Customer" : "Dealership"}: ${row.message}`)
    .join("\n");
}

async function aiReply({ dealershipName, text, inventory, chat, sales }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const fallback =
    sales?.booked && sales?.offered
      ? `You are booked for ${sales.offered.label}. See you then.`
      : sales?.readyToOffer
        ? "Want to come in for a visit during store hours?"
        : `Thanks for texting ${dealershipName}. Which vehicle are you asking about?`;
  if (!apiKey) return fallback;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              `You reply to SMS messages for the car dealership ${dealershipName}. ` +
              INVOICE_FLOOR_RULES +
              SMS_SALES_PATH +
              " Write 1 or 2 short sentences in plain text. Do not mention AI. " +
              "If they only greet you and no vehicle is named, ask which vehicle they want.",
          },
          {
            role: "user",
            content:
              `Inventory:\n${inventory}\n\n` +
              `Customer file:\n${salesPromptBlock(sales) || "none"}\n\n` +
              `Recent chat:\n${chat || "none"}\n\n` +
              `Newest customer message: ${text}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[SMS] AI reply failed:", data?.error?.message || response.status);
      return fallback;
    }
    const reply = String(data.choices?.[0]?.message?.content || "").trim().slice(0, 260);
    return reply || fallback;
  } catch (err) {
    console.error("[SMS] AI reply failed:", err.message);
    return fallback;
  }
}

async function sendAndRecord(message, account, text, { humanize = false } = {}) {
  let outbound = String(text || "").trim();
  if (humanize) {
    outbound = await finishSalesReply(outbound, { label: "SMS" });
  }
  await sendSms(account, { to: message.from_number, body: outbound });
  if (message.lead_id) {
    await Conversation.createMessage({
      leadId: message.lead_id,
      senderType: "AI",
      message: outbound,
    });
    await rememberOfferedFromReply(message.lead_id, outbound, account.timezone);
  }
  await mark(message.id, "sent");
}

async function processOne() {
  const message = await claimNext();
  if (!message) return false;

  try {
    const account = await loadAccount(message.dealership_id);
    if (!account) {
      await mark(message.id, "failed", "Dealership SMS account is missing");
      return true;
    }
    if (account.paused) {
      await mark(message.id, "skipped", "Text account is disconnected");
      return true;
    }

    const keyword = keywordOf(message.body);
    const name = account.dealershipName || "this dealership";

    if (keyword === "STOP") {
      await optOut(account.dealershipId, message.from_number);
      // Twilio, Telnyx, Plivo, Bandwidth already send the STOP SMS.
      // Only Sinch needs Model 31 to send it, or the customer gets no confirmation.
      const carrierSendsStop = ["Twilio", "Telnyx", "Plivo", "Bandwidth"].includes(
        account.providerType
      );
      if (carrierSendsStop) {
        await mark(message.id, "skipped", "Carrier sends STOP confirmation");
        return true;
      }
      await sendAndRecord(
        message,
        account,
        `You are unsubscribed from ${name} texts and will not be texted again. Reply START to opt back in.`
      );
      return true;
    }

    if (keyword === "HELP") {
      await sendAndRecord(
        message,
        account,
        `${name} texts. Reply STOP to unsubscribe. Message and data rates may apply.`
      );
      return true;
    }

    if (keyword === "START") {
      await optIn(account.dealershipId, message.from_number);
      await sendAndRecord(
        message,
        account,
        `You are subscribed to texts from ${name} again. Reply STOP to unsubscribe.`
      );
      return true;
    }

    if (keyword === "HERE") {
      const arrival = await handleHereArrival({ message, account });
      await sendAndRecord(message, account, arrival.johnReply);
      console.log(`[HERE] Arrival handled for message ${message.id}.`);
      return true;
    }

    if (await isOptedOut(account.dealershipId, message.from_number)) {
      await mark(message.id, "skipped", "Customer texted STOP");
      return true;
    }

    if (isQuietHours(account.timezone)) {
      const sendAfter = formatUtcSql(nextOpenUtc(account.timezone));
      await mark(message.id, "held", null, sendAfter);
      console.log(`[SMS] Held message ${message.id} until ${sendAfter} UTC.`);
      return true;
    }

    const [inventory, chat, sales] = await Promise.all([
      inventoryLines(account.dealershipId),
      recentChat(message.lead_id),
      prepareSmsSalesTurn({
        dealershipId: account.dealershipId,
        timezone: account.timezone,
        leadId: message.lead_id,
        text: message.body,
      }),
    ]);
    const reply = await aiReply({
      dealershipName: name,
      text: message.body,
      inventory,
      chat,
      sales,
    });
    await sendAndRecord(message, account, reply, { humanize: true });
    console.log(`[SMS] Sent reply for message ${message.id}.`);
    return true;
  } catch (err) {
    console.error(`[SMS] Message ${message.id} failed:`, err.message);
    await mark(message.id, "failed", err.message);
    return true;
  }
}

async function processSmsQueue() {
  if (running) return;
  running = true;
  try {
    for (let i = 0; i < 5; i += 1) {
      const worked = await processOne();
      if (!worked) break;
    }
  } finally {
    running = false;
  }
}

module.exports = { processSmsQueue, keywordOf };
