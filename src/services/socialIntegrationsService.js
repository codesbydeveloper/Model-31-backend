const SocialAccount = require("../models/SocialAccount");
const AppError = require("../utils/AppError");
const {
  listGates,
  setPlatformOpen,
} = require("./socialPlatformGateService");

const PLATFORMS = [
  { slug: "facebook", name: "Facebook", icon: "facebook" },
  { slug: "instagram", name: "Instagram", icon: "instagram" },
  { slug: "whatsapp", name: "WhatsApp", icon: "whatsapp" },
  { slug: "tiktok", name: "TikTok", icon: "tiktok" },
  { slug: "youtube", name: "YouTube", icon: "youtube" },
  { slug: "x", name: "X", icon: "x" },
];

const SETTINGS_PLACEHOLDER =
  "OAuth and publishing settings will be connected in a later step. This modal is a simulated placeholder for";

function slugToName(slug) {
  const match = PLATFORMS.find((p) => p.slug === slug);
  return match ? match.name : null;
}

function nameToSlug(name) {
  const match = PLATFORMS.find(
    (p) => p.name.toLowerCase() === String(name).toLowerCase()
  );
  return match ? match.slug : null;
}

function formatLastActivity(value) {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function mapPlatformCard(platform, gate = null, posts = 0) {
  const connected = Boolean(gate?.connected);
  return {
    slug: platform.slug,
    name: platform.name,
    icon: platform.icon,
    connectionStatus: connected ? "Connected" : "Disconnected",
    activityStatus: connected ? "Active" : "Inactive",
    lastActivity: formatLastActivity(gate?.updatedAt),
    lastActivityRaw: gate?.updatedAt || null,
    posts,
    canConnect: !connected,
    canDisconnect: connected,
    canSettings: true,
  };
}

function mapStaffAccountRow(account) {
  const ownerType =
    account.ownerName &&
    account.ownerName !== "Dealership Account" &&
    !String(account.ownerName).toLowerCase().includes("dealership")
      ? "Staff Account"
      : "Dealership";

  return {
    id: account.id,
    account: account.accountName,
    platform: account.platform,
    owner: ownerType,
    ownerName: account.ownerName,
    model31Source: account.model31Source,
    status: account.status,
    dealershipId: account.dealershipId,
    dealershipName: account.dealershipName,
  };
}

async function findPrimaryAccountForPlatform(platformName) {
  const accounts = await SocialAccount.list({ platform: platformName });
  if (!accounts.length) return null;
  return (
    accounts.find((a) => a.ownerName === "Dealership Account") || accounts[0]
  );
}

async function getOverview() {
  const [accounts, gates] = await Promise.all([
    SocialAccount.list(),
    listGates(),
  ]);
  const gateByName = new Map(gates.map((gate) => [gate.platform, gate]));
  const postsByPlatform = accounts.reduce((acc, account) => {
    const name = account.platform;
    acc[name] = (acc[name] || 0) + (Number(account.posts) || 0);
    return acc;
  }, {});

  return {
    pageTitle: "Social Integrations",
    platforms: PLATFORMS.map((platform) =>
      mapPlatformCard(
        platform,
        gateByName.get(platform.name),
        postsByPlatform[platform.name] || 0
      )
    ),
    staffAccounts: {
      title: "Authorized Staff Social Accounts",
      description:
        "Engagement from accounts with Model 31 Source ON is treated as a Model 31 source.",
      rows: accounts
        .filter((account) => String(account.platform || "").toLowerCase() !== "whatnot")
        .map(mapStaffAccountRow),
    },
  };
}

async function getPlatformSettings(platformSlug) {
  const platformName = slugToName(platformSlug);
  if (!platformName) throw new AppError("Platform not found", 404);

  const account = await findPrimaryAccountForPlatform(platformName);

  return {
    platform: platformName,
    slug: platformSlug,
    title: `${platformName} Settings`,
    placeholder: `${SETTINGS_PLACEHOLDER} ${platformName}.`,
    account: account
      ? {
          id: account.id,
          accountName: account.accountName,
          status: account.status,
          environment: account.environment,
          postingEnabled: account.postingEnabled,
          autoPublishing: account.autoPublishing,
        }
      : null,
  };
}

async function connectPlatform(platformSlug) {
  const platformName = slugToName(platformSlug);
  if (!platformName) throw new AppError("Platform not found", 404);

  const current = (await listGates()).find((gate) => gate.platform === platformName);
  if (current?.connected) {
    throw new AppError(`${platformName} is already connected`, 400);
  }

  const gate = await setPlatformOpen(platformName, true);
  return {
    message: `${platformName} connected. Dealerships can now connect this platform.`,
    platform: mapPlatformCard(
      PLATFORMS.find((p) => p.slug === platformSlug),
      gate
    ),
  };
}

async function disconnectPlatform(platformSlug) {
  const platformName = slugToName(platformSlug);
  if (!platformName) throw new AppError("Platform not found", 404);

  const current = (await listGates()).find((gate) => gate.platform === platformName);
  if (!current?.connected) {
    throw new AppError(`${platformName} is already disconnected`, 400);
  }

  const gate = await setPlatformOpen(platformName, false);
  await SocialAccount.disconnectByPlatform(platformName);
  return {
    message: `${platformName} disconnected. Dealerships can no longer keep this platform connected.`,
    platform: mapPlatformCard(
      PLATFORMS.find((p) => p.slug === platformSlug),
      gate
    ),
  };
}

async function updateStaffAccountSource(accountId, body = {}) {
  const account = await SocialAccount.findById(accountId);
  if (!account) throw new AppError("Social account not found", 404);

  if (body.model31Source === undefined) {
    throw new AppError("model31Source is required (ON or OFF)", 400);
  }

  const updated = await SocialAccount.update(accountId, {
    model31Source: body.model31Source,
  });

  return {
    message: "Model 31 Source updated",
    account: mapStaffAccountRow(updated),
  };
}

module.exports = {
  getOverview,
  getPlatformSettings,
  connectPlatform,
  disconnectPlatform,
  updateStaffAccountSource,
  slugToName,
  nameToSlug,
};
