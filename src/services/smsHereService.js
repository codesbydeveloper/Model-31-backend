const pool = require("../config/database");
const Lead = require("../models/Lead");
const { sendSms } = require("./smsCarrierService");
const { sendDealSheetEmail } = require("./postmarkService");
const { formatDisplayPhone } = require("../utils/smsPhone");

const JOHN_REPLY = "Got it! Our manager has your details and is bringing the keys out now.";

function looksLikePhone(value) {
  return /^\+?\d[\d\s()-]{6,}$/.test(String(value || "").trim());
}

function displayName(lead, phone) {
  const name = String(lead?.customerName || "").trim();
  if (name && !looksLikePhone(name)) return name;
  return phone || "Customer";
}

function lineFor(label, value) {
  const text = String(value || "").trim();
  return `${label}: ${text || "not captured"}`;
}

function fallbackSheet(lead, phone) {
  return [
    lineFor("Name", displayName(lead, phone)),
    lineFor("Vehicle", lead?.vehicle),
    lineFor("Trade-in", lead?.tradeIn),
    lineFor("Budget", lead?.budget),
  ].join("\n");
}

function pickLine(lines, label, fallback) {
  const match = lines.find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`));
  if (!match) return fallback;
  const value = match.slice(label.length + 1).trim();
  if (!value || /^not captured$/i.test(value)) return fallback;
  return `${label}: ${value}`;
}

function normalizeSheet(raw, fallback) {
  const fallbackLines = String(fallback || "").split(/\r?\n/).map((line) => line.trim());
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return [
    pickLine(lines, "Name", fallbackLines[0]),
    pickLine(lines, "Vehicle", fallbackLines[1]),
    pickLine(lines, "Trade-in", fallbackLines[2]),
    pickLine(lines, "Budget", fallbackLines[3]),
  ].join("\n");
}

async function loadChat(leadId) {
  if (!leadId) return "";
  const [rows] = await pool.query(
    `SELECT sender_type, message
     FROM conversation_messages
     WHERE lead_id = ?
     ORDER BY created_at ASC
     LIMIT 100`,
    [leadId]
  );
  return rows
    .map((row) => `${row.sender_type === "CUSTOMER" ? "Customer" : "Dealership"}: ${row.message}`)
    .join("\n");
}

async function inventoryForVehicle(dealershipId, vehicle) {
  const needle = String(vehicle || "").trim();
  if (!needle) return "";
  try {
    const [rows] = await pool.query(
      `SELECT year, make, model, trim, price
       FROM merchandising_vehicles
       WHERE dealership_id = ?
       ORDER BY updated_at DESC
       LIMIT 40`,
      [dealershipId]
    );
    const lower = needle.toLowerCase();
    const match = rows.find((row) => {
      const name = [row.year, row.make, row.model, row.trim].filter(Boolean).join(" ").toLowerCase();
      const shortName = [row.make, row.model].filter(Boolean).join(" ").toLowerCase();
      return (name && lower.includes(name)) || (shortName && lower.includes(shortName));
    });
    if (!match) return needle;
    const name = [match.year, match.make, match.model, match.trim].filter(Boolean).join(" ");
    const price = Number(match.price);
    if (price > 0) return `${name} ($${price.toLocaleString("en-US")})`;
    return name || needle;
  } catch (err) {
    console.error("[HERE] Inventory lookup failed:", err.message);
    return needle;
  }
}

async function aiDealSheet({ lead, phone, chat, vehicle }) {
  const fallback = fallbackSheet({ ...lead, vehicle: vehicle || lead?.vehicle }, phone);
  const apiKey = process.env.OPENAI_API_KEY;
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
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Write a 4-line deal sheet for a car dealership manager. " +
              "Use exactly these labels, one per line: Name, Vehicle, Trade-in, Budget. " +
              "Vehicle may include the asking price in parentheses if it is in the file. " +
              "Use only the customer file and chat. Do not invent facts. " +
              "If a field is missing, write not captured. Return only the 4 lines.",
          },
          {
            role: "user",
            content:
              `Customer file:\n` +
              `Name: ${displayName(lead, phone)}\n` +
              `Phone: ${phone || "unknown"}\n` +
              `Vehicle: ${vehicle || lead?.vehicle || "not captured"}\n` +
              `Trade-in: ${lead?.tradeIn || "not captured"}\n` +
              `Budget: ${lead?.budget || "not captured"}\n\n` +
              `Full chat:\n${chat || "none"}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[HERE] Deal sheet AI failed:", data?.error?.message || response.status);
      return fallback;
    }
    const text = String(data.choices?.[0]?.message?.content || "").trim();
    return normalizeSheet(text, fallback);
  } catch (err) {
    console.error("[HERE] Deal sheet AI failed:", err.message);
    return fallback;
  }
}

async function handleHereArrival({ message, account }) {
  const phone = message.from_number || "";
  const displayPhone = formatDisplayPhone(phone) || phone;
  const lead = message.lead_id ? await Lead.findById(message.lead_id) : null;
  const chat = await loadChat(message.lead_id);
  const vehicle = await inventoryForVehicle(account.dealershipId, lead?.vehicle);
  const sheet = await aiDealSheet({ lead, phone: displayPhone, chat, vehicle });

  if (message.lead_id) {
    await Lead.markOnLot(message.lead_id, true);
  }

  const managerBody = `VIP ON LOT (${displayPhone}):\n${sheet}`;
  if (account.managerMobile) {
    try {
      await sendSms(account, { to: account.managerMobile, body: managerBody });
      console.log(`[HERE] Manager SMS sent to ${account.managerMobile}.`);
    } catch (err) {
      console.error("[HERE] Manager SMS failed:", err.message);
    }
  } else {
    console.log("[HERE] Manager mobile is missing; skip manager SMS.");
  }

  await sendDealSheetEmail({
    to: account.managerEmail,
    customerName: displayName(lead, displayPhone),
    phone: displayPhone,
    sheet,
  });

  return { johnReply: JOHN_REPLY, sheet };
}

module.exports = { handleHereArrival, JOHN_REPLY };
