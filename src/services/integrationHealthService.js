const INITIAL_INTEGRATIONS = [];

let integrations = INITIAL_INTEGRATIONS.map((item) => ({ ...item }));
let lastHealthCheckAt = new Date().toISOString();

function mapCard(item) {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    lastCheck: item.lastCheck,
    latency: item.latency,
    latencyMs: item.latencyMs,
    errors: item.errors,
  };
}

function getOverview() {
  const healthyCount = integrations.filter((i) => i.status === "HEALTHY").length;
  const warningCount = integrations.filter((i) => i.status === "WARNING").length;
  const errorCount = integrations.filter(
    (i) => i.status === "ERROR" || i.status === "DISCONNECTED"
  ).length;

  return {
    pageTitle: "Integration Health",
    description:
      "Monitor the health of platform integrations and supporting services.",
    lastHealthCheckAt,
    summary: {
      total: integrations.length,
      healthy: healthyCount,
      warning: warningCount,
      error: errorCount,
    },
    integrations: integrations.map(mapCard),
    actions: {
      canRunHealthCheck: true,
      runHealthCheckPath: "/api/super-admin/integration-health/run-check",
    },
  };
}

function runHealthCheck() {
  integrations = integrations.map((item) => {
    if (item.status === "DISCONNECTED") {
      return {
        ...item,
        lastCheck: "-",
        latencyMs: null,
        latency: "-",
      };
    }

    const jitter = Math.floor(Math.random() * 40) - 20;
    const nextLatency = Math.max(30, (item.latencyMs || 100) + jitter);

    return {
      ...item,
      lastCheck: "Just now",
      latencyMs: nextLatency,
      latency: `${nextLatency} ms`,
    };
  });

  lastHealthCheckAt = new Date().toISOString();

  return {
    message: "Health check completed",
    checkedAt: lastHealthCheckAt,
    ...getOverview(),
  };
}

module.exports = {
  getOverview,
  runHealthCheck,
};
