function validZone(timeZone) {
  const zone = String(timeZone || "").trim() || "America/New_York";
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return "America/New_York";
  }
}

function partsInZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: validZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function isQuietHours(timeZone, date = new Date()) {
  const hour = partsInZone(date, timeZone).hour;
  return hour < 8 || hour >= 21;
}

function zonedToUtc(timeZone, year, month, day, hour, minute) {
  const zone = validZone(timeZone);
  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i += 1) {
    const shown = partsInZone(new Date(utc), zone);
    const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, 0);
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = shownUtc - wanted;
    if (delta === 0) break;
    utc -= delta;
  }
  return new Date(utc);
}

function nextOpenUtc(timeZone, date = new Date()) {
  const nowParts = partsInZone(date, timeZone);
  let { year, month, day, hour } = nowParts;
  if (hour >= 21) {
    const next = new Date(Date.UTC(year, month - 1, day));
    next.setUTCDate(next.getUTCDate() + 1);
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  return zonedToUtc(timeZone, year, month, day, 8, 0);
}

function formatUtcSql(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

module.exports = { validZone, isQuietHours, nextOpenUtc, formatUtcSql };
