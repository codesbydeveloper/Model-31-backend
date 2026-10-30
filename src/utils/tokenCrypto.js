const crypto = require("crypto");
const AppError = require("./AppError");

function keyBuffer() {
  const raw = String(process.env.MODEL31_MASTER_ENCRYPTION_KEY || "").trim();
  if (!raw) {
    throw new AppError("SMS encryption is not configured on the server", 500);
  }
  const asBase64 = Buffer.from(raw, "base64");
  if (asBase64.length === 32) return asBase64;
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

function encryptToken(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptToken(cipherText) {
  if (!cipherText) return "";
  try {
    const buf = Buffer.from(String(cipherText), "base64");
    if (buf.length < 29) {
      throw new Error("short cipher");
    }
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError("Saved SMS secret could not be read", 500);
  }
}

module.exports = { encryptToken, decryptToken };
