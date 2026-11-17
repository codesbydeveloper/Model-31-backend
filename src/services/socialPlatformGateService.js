const pool = require("../config/database");
const AppError = require("../utils/AppError");

const PLATFORM_NAMES = [
  "Facebook",
  "Instagram",
  "WhatsApp",
  "TikTok",
  "YouTube",
  "X",
];

function canonicalPlatform(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "twitter") return "X";
  return PLATFORM_NAMES.find((name) => name.toLowerCase() === raw) || "";
}

async function listGates() {
  const [rows] = await pool.query(
    `SELECT platform, connected, updated_at FROM social_platform_gates`
  );
  const byName = new Map(
    rows.map((row) => [
      row.platform,
      {
        platform: row.platform,
        connected: Boolean(row.connected),
        updatedAt: row.updated_at,
      },
    ])
  );
  return PLATFORM_NAMES.map(
    (platform) =>
      byName.get(platform) || {
        platform,
        connected: false,
        updatedAt: null,
      }
  );
}

async function isPlatformOpen(platformName) {
  const platform = canonicalPlatform(platformName);
  if (!platform) return false;
  const [rows] = await pool.query(
    `SELECT connected FROM social_platform_gates WHERE platform = ? LIMIT 1`,
    [platform]
  );
  return Boolean(rows[0]?.connected);
}

async function assertPlatformOpen(platformName) {
  const platform = canonicalPlatform(platformName) || String(platformName || "").trim();
  if (await isPlatformOpen(platform)) return;
  throw new AppError(
    `Super Admin has not provided permission to connect ${platform || "this platform"}.`,
    403
  );
}

async function setPlatformOpen(platformName, connected) {
  const platform = canonicalPlatform(platformName);
  if (!platform) throw new AppError("Platform not found", 404);
  await pool.query(
    `INSERT INTO social_platform_gates (platform, connected)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE connected = VALUES(connected), updated_at = CURRENT_TIMESTAMP`,
    [platform, connected ? 1 : 0]
  );
  const [rows] = await pool.query(
    `SELECT platform, connected, updated_at FROM social_platform_gates WHERE platform = ? LIMIT 1`,
    [platform]
  );
  const row = rows[0];
  return {
    platform: row.platform,
    connected: Boolean(row.connected),
    updatedAt: row.updated_at,
  };
}

function applyConnectGate(account, open) {
  if (!account) return account;
  const disconnected =
    account.status === "DISCONNECTED" || account.status === "ERROR";
  return {
    ...account,
    superAdminConnected: Boolean(open),
    canConnect: disconnected && Boolean(open),
  };
}

module.exports = {
  PLATFORM_NAMES,
  canonicalPlatform,
  listGates,
  isPlatformOpen,
  assertPlatformOpen,
  setPlatformOpen,
  applyConnectGate,
};
