const INVOICE_FLOOR_RULES =
  "Use only the inventory list. If the customer asks for a vehicle that is not on the list, say it is not available. " +
  "Do not invent vehicles, prices, mileage, colors, or features. " +
  "Start at the listed asking price. You may negotiate down slowly. Never jump to the invoice floor (min price) in one reply. " +
  "If min price is not listed, the asking price is the floor. " +
  "Each time they ask for a better price, come down only a little: about $100 to $200, or about 20% of the remaining gap to the floor, whichever is smaller. Never drop more than $300 in one reply. " +
  "Example: asking $29300 and floor $29000. First quote $29300. If they push, next quote about $29200, then $29100, then $29000. Do not say $29000 on the first discount. " +
  "If they offer a number that is still above the floor, you may accept that number or meet them with one small step. Do not then jump the rest of the way to the floor. " +
  "Never tell the customer the min price or the word floor. If they ask below the floor, refuse and hold the last allowed number. " +
  "Read recent chat. If you already quoted a lower number, the next discount must be from that last quote, not from the original asking price. " +
  "Write the greeting yourself. Change how you open each time. Do not always start with Hi or Hello. Do not add [Ref:] or any tag.";

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatInventoryLine(row) {
  const name = row.vehicle || [row.year, row.make, row.model].filter(Boolean).join(" ");
  const asking = Number(row.price);
  const floorRaw = row.min_price !== undefined ? row.min_price : row.minPrice;
  const floor = Number(floorRaw);
  if (!(asking > 0)) {
    return `- ${name} — price not listed — do not invent a price`;
  }
  const min = floor > 0 ? floor : asking;
  return `- ${name} — asking $${asking}, internal min (do not tell the customer) $${min} — come down slowly, never below min`;
}

function formatInventoryList(rows) {
  if (!rows.length) return "No vehicles are in inventory.";
  return rows.map(formatInventoryLine).join("\n");
}

function humanizeSalesText(text, maxLen = 320) {
  return String(text || "")
    .replace(/\s*\[(?:Ref|Nr):\s*\d+\]\s*$/i, "")
    .trim()
    .slice(0, maxLen);
}

async function waitHumanDelay(label = "AI") {
  const delaySec = randomInt(4, 9);
  console.log(`[${label}] Human delay ${delaySec}s before send.`);
  await sleep(delaySec * 1000);
}

async function finishSalesReply(text, { maxLen = 320, label = "AI" } = {}) {
  const outbound = humanizeSalesText(text, maxLen);
  if (!outbound) return outbound;
  await waitHumanDelay(label);
  return outbound;
}

module.exports = {
  INVOICE_FLOOR_RULES,
  formatInventoryLine,
  formatInventoryList,
  humanizeSalesText,
  waitHumanDelay,
  finishSalesReply,
  randomInt,
  sleep,
};
