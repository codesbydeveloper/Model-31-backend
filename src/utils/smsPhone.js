function normalizePhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const compact = raw.replace(/[^\d+]/g, "");
  const digits = compact.replace(/\D/g, "");
  let phone = "";
  if (compact.startsWith("+")) {
    phone = `+${digits}`;
  } else if (digits.length === 10) {
    phone = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    phone = `+${digits}`;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return "";
  return phone;
}

function phoneField(value) {
  if (!value) return "";
  if (Array.isArray(value)) return phoneField(value[0]);
  if (typeof value === "object") {
    return phoneField(value.phone_number || value.number || value.phoneNumber || "");
  }
  return normalizePhone(value);
}

function formatDisplayPhone(value) {
  const phone = normalizePhone(value) || String(value || "").trim();
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

module.exports = { normalizePhone, phoneField, formatDisplayPhone };
