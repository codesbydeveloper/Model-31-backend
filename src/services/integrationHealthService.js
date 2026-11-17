const pool = require("../config/database");
const SocialAccount = require("../models/SocialAccount");
const { getSocialAppCredentials } = require("../config/socialAppCredentials");
const { listGates } = require("./socialPlatformGateService");

const SOCIAL_PLATFORMS = [
  "Facebook",
  "Instagram",
  "WhatsApp",
  "TikTok",
  "YouTube",
  "X",
];

function formatLastCheck(value) {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toISOString();
}

function card(item) {
  const dealers = item.connectedDealerships || [];
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    lastCheck: item.lastCheck || "-",
    latency: "-",
    latencyMs: null,
    errors: Number(item.errors) || 0,
    detail: item.detail || "",
    connectedCount: dealers.length,
    connectedDealerships: dealers,
  };
}

function socialStatus({ envOk, gateOpen, connectedCount }) {
  if (!envOk) {
    return {
      status: "DISCONNECTED",
      detail: "App keys are missing on the server.",
    };
  }
  if (connectedCount > 0) {
    return {
      status: "HEALTHY",
      detail: `${connectedCount} dealership${connectedCount === 1 ? "" : "s"} connected.`,
    };
  }
  if (gateOpen) {
    return {
      status: "WARNING",
      detail: "Super Admin connected this app. No dealership has connected it yet.",
    };
  }
  return {
    status: "DISCONNECTED",
    detail: "Super Admin has not connected this app.",
  };
}

async function buildIntegrations() {
  const [accounts, gates, smsRows] = await Promise.all([
    SocialAccount.list(),
    listGates(),
    pool.query(
      `SELECT id, name, sms_provider, sms_phone_number, sms_status
       FROM dealerships
       WHERE sms_provider IS NOT NULL AND sms_phone_number IS NOT NULL
       ORDER BY name ASC`
    ),
  ]);

  const gateByName = new Map(gates.map((gate) => [gate.platform, gate]));
  const dealersByPlatform = {};
  const lastSyncByPlatform = {};
  for (const account of accounts) {
    if (String(account.status).toUpperCase() !== "CONNECTED") continue;
    if (!dealersByPlatform[account.platform]) dealersByPlatform[account.platform] = [];
    dealersByPlatform[account.platform].push({
      id: account.dealershipId,
      name: account.dealershipName || account.accountName,
      accountName: account.accountName,
    });
    if (account.lastSync) {
      const next = new Date(account.lastSync);
      const prev = lastSyncByPlatform[account.platform];
      if (!prev || next > prev) lastSyncByPlatform[account.platform] = next;
    }
  }

  const socialCards = SOCIAL_PLATFORMS.map((name) => {
    const envOk = getSocialAppCredentials(name).configured;
    const gate = gateByName.get(name);
    const connectedDealerships = dealersByPlatform[name] || [];
    const { status, detail } = socialStatus({
      envOk,
      gateOpen: Boolean(gate?.connected),
      connectedCount: connectedDealerships.length,
    });
    return card({
      id: name.toLowerCase(),
      name,
      status,
      lastCheck: formatLastCheck(lastSyncByPlatform[name] || gate?.updatedAt),
      errors: envOk ? 0 : 1,
      detail,
      connectedDealerships,
    });
  });

  const smsDealerships = (smsRows[0] || [])
    .filter((row) => String(row.sms_status || "CONNECTED").toUpperCase() === "CONNECTED")
    .map((row) => ({
      id: row.id,
      name: row.name,
      accountName: row.sms_phone_number,
      providerType: row.sms_provider,
      phoneNumber: row.sms_phone_number,
    }));
  const smsSaved = (smsRows[0] || []).length;
  let smsStatus = "DISCONNECTED";
  let smsDetail = "No dealership has saved a text account.";
  if (smsDealerships.length > 0) {
    smsStatus = "HEALTHY";
    smsDetail = `${smsDealerships.length} dealership${smsDealerships.length === 1 ? "" : "s"} sending texts.`;
  } else if (smsSaved > 0) {
    smsStatus = "WARNING";
    smsDetail = "A text account is saved but disconnected.";
  }

  const openaiOk = Boolean(String(process.env.OPENAI_API_KEY || "").trim());

  return [
    ...socialCards,
    card({
      id: "sms",
      name: "SMS",
      status: smsStatus,
      lastCheck: formatLastCheck(new Date()),
      errors: 0,
      detail: smsDetail,
      connectedDealerships: smsDealerships,
    }),
    card({
      id: "openai",
      name: "OpenAI",
      status: openaiOk ? "HEALTHY" : "DISCONNECTED",
      lastCheck: formatLastCheck(new Date()),
      errors: openaiOk ? 0 : 1,
      detail: openaiOk ? "AI replies are configured." : "OPENAI_API_KEY is missing.",
      connectedDealerships: [],
    }),
  ];
}

async function getOverview() {
  const integrations = await buildIntegrations();
  const healthyCount = integrations.filter((i) => i.status === "HEALTHY").length;
  const warningCount = integrations.filter((i) => i.status === "WARNING").length;
  const errorCount = integrations.filter(
    (i) => i.status === "ERROR" || i.status === "DISCONNECTED"
  ).length;

  return {
    pageTitle: "Integration Health",
    description:
      "Monitor the health of platform integrations and supporting services.",
    lastHealthCheckAt: new Date().toISOString(),
    summary: {
      total: integrations.length,
      healthy: healthyCount,
      warning: warningCount,
      error: errorCount,
    },
    integrations,
    actions: {
      canRunHealthCheck: true,
      runHealthCheckPath: "/api/super-admin/integration-health/run-check",
    },
  };
}

async function runHealthCheck() {
  const overview = await getOverview();
  return {
    message: "Health check completed",
    checkedAt: overview.lastHealthCheckAt,
    ...overview,
  };
}

module.exports = {
  getOverview,
  runHealthCheck,
};
