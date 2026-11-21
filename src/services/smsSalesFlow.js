const pool = require("../config/database");
const Lead = require("../models/Lead");
const Appointment = require("../models/Appointment");
const { partsInZone } = require("../utils/dealerClock");

const OPEN_HOUR = 8;
const CLOSE_HOUR = 21;
const SUGGEST_HOURS = [10, 11, 14, 16, 18];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function addDays(year, month, day, count) {
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + count);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function weekdayName(year, month, day) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  ];
}

function formatTime(hour, minute = 0) {
  const ampm = hour >= 12 ? "PM" : "AM";
  let display = hour % 12;
  if (display === 0) display = 12;
  return `${display}:${pad(minute)} ${ampm}`;
}

function isWithinHours(hour, minute = 0) {
  if (hour < OPEN_HOUR) return false;
  if (hour > CLOSE_HOUR) return false;
  if (hour === CLOSE_HOUR && minute > 0) return false;
  return true;
}

function parseClock(raw) {
  const match = String(raw || "").match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i
  );
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const period = String(match[3] || "").toLowerCase().replace(/\./g, "");
  if (period.startsWith("p") && hour < 12) hour += 12;
  if (period.startsWith("a") && hour === 12) hour = 0;
  if (!period && hour <= 7) hour += 12;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, time: formatTime(hour, minute) };
}

function dateKey(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function slotLabel(slot) {
  return `${slot.weekday} at ${slot.time} (${slot.date})`;
}

async function listOpenSlots(dealershipId, timeZone, limit = 8) {
  const now = partsInZone(new Date(), timeZone);
  const slots = [];
  let year = now.year;
  let month = now.month;
  let day = now.day;
  for (let i = 0; i < 10 && slots.length < limit; i += 1) {
    for (const hour of SUGGEST_HOURS) {
      if (!isWithinHours(hour, 0)) continue;
      if (i === 0 && (hour < now.hour || (hour === now.hour && now.minute >= 0))) {
        continue;
      }
      const date = dateKey(year, month, day);
      const time = formatTime(hour, 0);
      if (await Appointment.slotTaken(dealershipId, date, time)) continue;
      slots.push({
        date,
        time,
        hour,
        weekday: weekdayName(year, month, day),
        label: `${weekdayName(year, month, day)} at ${time}`,
      });
      if (slots.length >= limit) break;
    }
    ({ year, month, day } = addDays(year, month, day, 1));
  }
  return slots;
}

function resolveDay(text, timeZone) {
  const now = partsInZone(new Date(), timeZone);
  const raw = String(text || "").toLowerCase();
  if (/\btoday\b/.test(raw)) return { year: now.year, month: now.month, day: now.day };
  if (/\btomorrow\b/.test(raw)) return addDays(now.year, now.month, now.day, 1);
  for (let i = 0; i < WEEKDAYS.length; i += 1) {
    if (!new RegExp(`\\b${WEEKDAYS[i]}\\b`).test(raw)) continue;
    let year = now.year;
    let month = now.month;
    let day = now.day;
    for (let step = 0; step < 8; step += 1) {
      const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      if (wd === i) return { year, month, day };
      ({ year, month, day } = addDays(year, month, day, 1));
    }
  }
  return null;
}

function extractRequestedSlot(text, timeZone) {
  const clock = parseClock(text);
  if (!clock) return null;
  const day = resolveDay(text, timeZone) || partsInZone(new Date(), timeZone);
  const now = partsInZone(new Date(), timeZone);
  let year = day.year;
  let month = day.month;
  let d = day.day;
  const sameDay = year === now.year && month === now.month && d === now.day;
  if (
    sameDay &&
    (clock.hour < now.hour || (clock.hour === now.hour && clock.minute <= now.minute))
  ) {
    const namedDay = WEEKDAYS.some((name) => new RegExp(`\\b${name}\\b`, "i").test(text));
    ({ year, month, day: d } = addDays(year, month, d, namedDay ? 7 : 1));
  }
  const weekday = weekdayName(year, month, d);
  const slot = {
    date: dateKey(year, month, d),
    time: clock.time,
    hour: clock.hour,
    minute: clock.minute,
    weekday,
    label: `${weekday} at ${clock.time}`,
  };
  slot.withinHours = isWithinHours(clock.hour, clock.minute);
  return slot;
}

function parseOfferedSlot(timeline) {
  const match = String(timeline || "").match(
    /(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i
  );
  if (!match) return null;
  const clock = parseClock(match[2]);
  if (!clock) return null;
  return { date: match[1], time: clock.time };
}

function parseSlotFromReply(text, timeZone) {
  return extractRequestedSlot(text, timeZone);
}

function isAffirmative(text) {
  const word = String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[.!?]/g, "");
  return (
    /^(ok|okay|k|yes|yep|yeah|sure|sounds good|book it|that works|let'?s do it|confirmed)$/i.test(
      word
    ) || /^(ok|okay|yes|sure)\b/.test(word)
  );
}

function extractBudget(text) {
  const match = String(text || "").match(
    /\$?\s*([1-9]\d{2,4})\s*(?:\/\s*mo(?:nth)?|a\s*month|per\s*month)/i
  );
  return match ? `$${match[1]}/month` : "";
}

function extractTradeIn(text) {
  const raw = String(text || "");
  if (
    /\bno\b.{0,20}trade|\bno trade|don'?t have a trade|do not have a trade|without a trade/i.test(
      raw
    )
  ) {
    return "none";
  }
  if (
    /available|in stock|do you have|how much|what(?:'s| is) the price/i.test(raw) &&
    !/trade/i.test(raw)
  ) {
    return "";
  }
  const yearModel = raw.match(
    /\b((?:19|20)\d{2})\s+([A-Za-z][A-Za-z0-9\-]+(?:\s+[A-Za-z][A-Za-z0-9\-]+)?)/
  );
  if (yearModel) return `${yearModel[1]} ${yearModel[2]}`.trim();
  return "";
}

function extractVehicle(text) {
  const match = String(text || "").match(
    /\b((?:honda|toyota|ford|chevrolet|chevy|bmw|mercedes|nissan|kia|hyundai|mazda|jeep|ram|gmc|audi|lexus|volkswagen|vw|subaru|dodge|chrysler)\s+[a-z0-9\-]+)/i
  );
  return match ? match[1].replace(/\b\w/g, (ch) => ch.toUpperCase()) : "";
}

async function findHost(dealershipId, preferredId) {
  if (preferredId) return preferredId;
  const [sales] = await pool.query(
    `SELECT id FROM users
     WHERE dealership_id = ? AND role = 'Salesperson' AND status = 'Active'
     ORDER BY created_at ASC
     LIMIT 1`,
    [dealershipId]
  );
  if (sales[0]) return sales[0].id;
  const [staff] = await pool.query(
    `SELECT id FROM users
     WHERE dealership_id = ?
     ORDER BY FIELD(role, 'Dealership Admin', 'Dealership Manager', 'BDC Manager') ASC
     LIMIT 1`,
    [dealershipId]
  );
  return staff[0]?.id || null;
}

async function prepareSmsSalesTurn({ dealershipId, timezone, leadId, text }) {
  const hours = `Open 8:00 AM to 9:00 PM dealer time (${timezone || "America/New_York"}). Closed before 8:00 AM and from 9:00 PM.`;
  const openSlots = leadId ? await listOpenSlots(dealershipId, timezone) : [];
  if (!leadId) {
    return { hours, openSlots, offered: null, booked: false };
  }

  let lead = await Lead.findById(leadId);
  if (!lead) return { hours, openSlots, offered: null, booked: false };

  const tradeIn = extractTradeIn(text);
  const budget = extractBudget(text);
  const vehicle = extractVehicle(text);
  const patch = {};
  if (tradeIn && !lead.tradeIn) patch.tradeIn = tradeIn;
  if (budget && !lead.budget) patch.budget = budget;
  if (vehicle && !lead.vehicle) patch.vehicle = vehicle;

  const existingAppt = await Appointment.findByLead(leadId);
  if (existingAppt) {
    if (Object.keys(patch).length) lead = await Lead.updateSalesFacts(leadId, patch);
    return {
      hours,
      openSlots,
      tradeIn: lead.tradeIn || "",
      budget: lead.budget || "",
      vehicle: lead.vehicle || "",
      offered: {
        date: existingAppt.date,
        time: existingAppt.time,
        label: `${existingAppt.date} at ${existingAppt.time}`,
      },
      booked: true,
    };
  }

  if (isAffirmative(text)) {
    const offered = parseOfferedSlot(lead.timeline);
    const hostId = await findHost(dealershipId, lead.salespersonId);
    if (offered && hostId) {
      const appointment = await Appointment.create({
        leadId,
        salespersonId: hostId,
        dealershipId,
        customerName: lead.customerName || lead.customerPhone || "Customer",
        vehicle: lead.vehicle || "",
        appointmentType: "Test Drive",
        date: offered.date,
        time: offered.time,
        notes: "Booked by SMS",
        status: "SCHEDULED",
      });
      lead = await Lead.updateSalesFacts(leadId, {
        ...patch,
        status: "APPOINTMENT",
        timeline: `${offered.date} ${offered.time}`,
      });
      return {
        hours,
        openSlots,
        tradeIn: lead.tradeIn || "",
        budget: lead.budget || "",
        vehicle: lead.vehicle || "",
        offered: {
          date: appointment.date,
          time: appointment.time,
          label: `${offered.date} at ${offered.time}`,
        },
        booked: true,
      };
    }
  }

  const requested = extractRequestedSlot(text, timezone);
  let closedRequest = null;
  if (requested && !isAffirmative(text)) {
    if (!requested.withinHours) {
      closedRequest = requested;
    } else {
      patch.timeline = `${requested.date} ${requested.time}`;
    }
  }

  const canOffer = Boolean(lead.tradeIn || patch.tradeIn);
  if (Object.keys(patch).length) {
    lead = await Lead.updateSalesFacts(leadId, patch);
  }

  const offered = parseOfferedSlot(lead.timeline);

  return {
    hours,
    openSlots,
    tradeIn: lead.tradeIn || "",
    budget: lead.budget || "",
    vehicle: lead.vehicle || "",
    offered: offered
      ? { ...offered, label: `${offered.date} at ${offered.time}` }
      : null,
    closedRequest,
    booked: false,
    readyToOffer: canOffer,
  };
}

async function rememberOfferedFromReply(leadId, reply, timeZone) {
  if (!leadId || !reply) return;
  const slot = parseSlotFromReply(reply, timeZone);
  if (!slot || !slot.withinHours) return;
  await Lead.updateSalesFacts(leadId, {
    timeline: `${slot.date} ${slot.time}`,
  });
}

function salesPromptBlock(sales) {
  if (!sales) return "";
  const lines = [
    `Store hours: ${sales.hours}`,
    "Pick a visit time with your own judgment. Any time during open hours is allowed. Do not always say Saturday at 11 AM. That was only an example.",
    "Do not offer a time before 8:00 AM or from 9:00 PM onward.",
  ];
  if (sales.openSlots?.length) {
    lines.push(
      `Open times you may choose from: ${sales.openSlots.map((slot) => slot.label).join("; ")}.`
    );
  }
  if (sales.vehicle) lines.push(`Vehicle interest: ${sales.vehicle}`);
  lines.push(`Trade-in on file: ${sales.tradeIn || "(none yet)"}`);
  lines.push(`Budget on file: ${sales.budget || "(none yet)"}`);
  if (sales.closedRequest) {
    lines.push(
      `Customer asked for ${sales.closedRequest.label}, which is outside store hours. Say the store is closed then and offer one open time instead.`
    );
  }
  if (sales.booked && sales.offered) {
    lines.push(`BOOKED: ${sales.offered.label}. Confirm this time. Do not offer another time.`);
  } else if (sales.offered) {
    lines.push(`If they already agreed to a time, keep ${sales.offered.label}.`);
  }
  if (sales.readyToOffer && !sales.booked) {
    lines.push("Trade-in is answered. Suggest one open visit time now.");
  }
  return lines.join("\n");
}

module.exports = {
  OPEN_HOUR,
  CLOSE_HOUR,
  prepareSmsSalesTurn,
  rememberOfferedFromReply,
  salesPromptBlock,
  slotLabel,
};
