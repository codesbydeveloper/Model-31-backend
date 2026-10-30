const crypto = require("crypto");
const { randomUUID } = require("crypto");
const pool = require("../config/database");
const Lead = require("../models/Lead");
const Conversation = require("../models/Conversation");
const { decryptToken } = require("../utils/tokenCrypto");
const { phoneField } = require("../utils/smsPhone");

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twiml(status = 200) {
  return { status, type: "application/xml", body: EMPTY_TWIML };
}

function textResult(status, body) {
  return { status, type: "text/plain", body };
}

function readInboundMessage(body) {
  if (!body) return null;

  if (Array.isArray(body)) {
    const event = body.find((item) => item && (item.message || item.text || item.from)) || body[0];
    if (!event) return null;
    const message = event.message || event;
    return {
      to: phoneField(message.to),
      from: phoneField(message.from),
      text: String(message.text || message.body || "").trim(),
      messageId: message.id || event.id || null,
    };
  }

  if (body.data?.payload) {
    const payload = body.data.payload;
    return {
      to: phoneField(payload.to),
      from: phoneField(payload.from),
      text: String(payload.text || payload.body || "").trim(),
      messageId: body.data.id || payload.id || null,
    };
  }

  const to = body.To || body.to;
  const from = body.From || body.from;
  if (!to && !from) return null;
  return {
    to: phoneField(to),
    from: phoneField(from),
    text: String(body.Body || body.body || body.Text || body.text || "").trim(),
    messageId: body.MessageSid || body.MessageUUID || body.id || null,
  };
}

function unsignedWebhookAllowed() {
  if (String(process.env.SMS_ALLOW_UNSIGNED_WEBHOOK || "").toLowerCase() === "true") return true;
  return String(process.env.NODE_ENV || "").toLowerCase() !== "production";
}

function twilioSignatureValid(req, token) {
  const signature = req.get("X-Twilio-Signature") || "";
  if (!signature) return null;
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  const url = `${proto}://${host}${req.originalUrl}`;
  const params = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const signed = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + String(params[key] ?? ""), url);
  const expected = crypto.createHmac("sha1", token).update(signed, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function findDealerByPhone(phone) {
  const [rows] = await pool.query(
    `SELECT id, name, timezone, sms_provider, sms_account_sid, sms_auth_token, sms_phone_number
     FROM dealerships
     WHERE sms_phone_number = ?
     LIMIT 1`,
    [phone]
  );
  return rows[0] || null;
}

async function findOrCreateLead(dealer, from) {
  const [rows] = await pool.query(
    `SELECT id FROM leads
     WHERE dealership_id = ? AND customer_phone = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [dealer.id, from]
  );
  if (rows[0]) {
    await pool.query(`UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [rows[0].id]);
    return rows[0].id;
  }
  const lead = await Lead.create({
    customerName: from,
    customerPhone: from,
    source: "SMS",
    pipeline: "MODEL 31",
    status: "NEW",
    score: 50,
    tier: "Tier C",
    dealershipId: dealer.id,
    notes: "Text message lead.",
  });
  return lead.id;
}

async function handleSmsWebhook(req) {
  const inbound = readInboundMessage(req.body);
  if (!inbound?.to || !inbound.from) {
    return textResult(400, "Missing To or From");
  }
  if (!inbound.text) {
    return twiml();
  }

  const dealer = await findDealerByPhone(inbound.to);
  if (!dealer) {
    return textResult(404, "Dealer not found");
  }

  let authToken = "";
  try {
    authToken = decryptToken(dealer.sms_auth_token);
  } catch (err) {
    console.error(`[SMS] Dealership ${dealer.id} token could not be decrypted.`);
    return textResult(500, "SMS secret could not be read");
  }
  if (!authToken) {
    return textResult(500, "SMS secret could not be read");
  }
  console.log(`[SMS] Found dealership ${dealer.id} for ${inbound.to}. Token decrypted.`);

  if (dealer.sms_provider === "Twilio") {
    const signatureOk = twilioSignatureValid(req, authToken);
    if (signatureOk === false) {
      return textResult(403, "Invalid Twilio signature");
    }
    if (signatureOk === null && !unsignedWebhookAllowed()) {
      return textResult(403, "Twilio signature is required");
    }
    if (signatureOk === null) {
      console.log("[SMS] No Twilio signature on this request.");
    }
  }

  const messageId = inbound.messageId ? String(inbound.messageId).slice(0, 191) : null;
  if (messageId) {
    const [existing] = await pool.query(
      `SELECT id FROM sms_messages WHERE provider_message_id = ? LIMIT 1`,
      [messageId]
    );
    if (existing.length) return twiml();
  }

  const leadId = await findOrCreateLead(dealer, inbound.from);
  await Conversation.createMessage({
    leadId,
    senderType: "CUSTOMER",
    message: inbound.text,
  });

  const id = `sms_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO sms_messages
      (id, dealership_id, lead_id, provider_message_id, from_number, to_number, body, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
    [id, dealer.id, leadId, messageId, inbound.from, inbound.to, inbound.text]
  );
  console.log(`[SMS] Queued message ${id} in sms_messages from ${inbound.from}.`);
  return twiml();
}

module.exports = { handleSmsWebhook, readInboundMessage };
