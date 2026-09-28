function digits(phone) {
  const only = String(phone || "").replace(/\D/g, "");
  if (only.length >= 10) return only.slice(-10);
  return only;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function lastName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts[parts.length - 1] || "").toLowerCase();
}

function diceSimilarity(a, b) {
  const s1 = String(a || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
  const s2 = String(b || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;

  const bigrams = (value) => {
    const map = new Map();
    for (let i = 0; i < value.length - 1; i += 1) {
      const bg = value.slice(i, i + 2);
      map.set(bg, (map.get(bg) || 0) + 1);
    }
    return map;
  };

  const left = bigrams(s1);
  const right = bigrams(s2);
  let overlap = 0;
  let totalLeft = 0;
  let totalRight = 0;
  for (const count of left.values()) totalLeft += count;
  for (const count of right.values()) totalRight += count;
  for (const [bg, count] of left) {
    if (right.has(bg)) overlap += Math.min(count, right.get(bg));
  }
  return (2 * overlap) / (totalLeft + totalRight || 1);
}

function buildCustomerKey({ phone, email, name }) {
  const phoneKey = digits(phone);
  const emailKey = normalizeEmail(email);
  const last = lastName(name);
  if (phoneKey && emailKey) {
    return { key: `phone:${phoneKey}|email:${emailKey}`, tier: 1 };
  }
  if (phoneKey && last) {
    return { key: `phone:${phoneKey}|last:${last}`, tier: 2 };
  }
  if (emailKey && String(name || "").trim()) {
    return {
      key: `email:${emailKey}|name:${String(name).trim().toLowerCase()}`,
      tier: 3,
    };
  }
  if (phoneKey) return { key: `phone:${phoneKey}`, tier: 2 };
  if (emailKey) return { key: `email:${emailKey}`, tier: 3 };
  return { key: "", tier: null };
}

module.exports = {
  digits,
  normalizeEmail,
  lastName,
  diceSimilarity,
  buildCustomerKey,
};
