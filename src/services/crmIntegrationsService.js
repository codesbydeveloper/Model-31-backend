const AppError = require("../utils/AppError");

const MODE_BANNER = {
  crmMode: "READ ONLY",
  pipeline: "DEALERSHIP",
  source: "CRM",
  model31Access: "READ ONLY",
  note: "Model 31 does not modify dealership leads.",
};

const ENVIRONMENT_OPTIONS = ["Production", "Sandbox"];
const SYNC_FREQUENCY_OPTIONS = [
  "Every 5 minutes",
  "Every 15 minutes",
  "Every 30 minutes",
  "Every hour",
];
const TIMEZONE_OPTIONS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const crmStore = {};

let syncErrors = [];

const platformActivity = [];

function getCrmOrThrow(crmId) {
  const crm = crmStore[crmId];
  if (!crm) throw new AppError("CRM integration not found", 404);
  return crm;
}

function toBool(value, field) {
  if (value === undefined) throw new AppError(`${field} is required`, 400);
  return value === true || value === 1 || value === "1" || value === "true";
}

function listCard(crm) {
  return {
    id: crm.id,
    name: crm.name,
    environment: crm.environment,
    status: crm.status,
    lastSync: crm.lastSyncLabel,
    recordsSynced: crm.recordsSynced,
    syncErrors: crm.syncErrors,
    actions: {
      view: `/api/super-admin/crm-integrations/${crm.id}`,
      syncNow: `/api/super-admin/crm-integrations/${crm.id}/sync-now`,
      settings: `/api/super-admin/crm-integrations/${crm.id}/settings`,
      disconnect: `/api/super-admin/crm-integrations/${crm.id}/disconnect`,
    },
  };
}

function getOverview() {
  const list = Object.values(crmStore);
  const connected = list.filter((c) => c.status === "CONNECTED").length;
  const errors = syncErrors.filter((e) => e.status === "FAILED").length;

  return {
    banner: MODE_BANNER,
    metrics: {
      connectedCrms: connected,
      activeSyncs: 0,
      recordsSyncedToday: 0,
      syncErrors: errors,
      lastSuccessfulSync: "—",
    },
    integrations: list.map(listCard),
  };
}

function listSyncErrors() {
  return {
    errors: syncErrors.map((e) => ({
      ...e,
      action:
        e.status === "FAILED"
          ? {
              label: "Retry",
              endpoint: `/api/super-admin/crm-integrations/sync-errors/${e.id}/retry`,
            }
          : null,
    })),
  };
}

function listPlatformActivity() {
  return { activity: platformActivity };
}

function getConnectionDetails(crmId) {
  const crm = getCrmOrThrow(crmId);
  return {
    banner: MODE_BANNER,
    connection: {
      id: crm.id,
      name: crm.name,
      environment: crm.environment,
      status: crm.status,
      connectedAt: crm.connectedAt,
      subtitle: `${crm.environment} · Connected ${crm.connectedAt}`,
    },
    stats: {
      lastSync: crm.lastSyncLabel,
      nextSync: crm.nextSyncLabel,
      recordsSynced: crm.recordsSynced,
      errors: crm.syncErrors,
    },
    tabs: ["Connection", "Synchronization", "Field Mapping", "Activity", "Health"],
  };
}

function getSettings(crmId) {
  const crm = getCrmOrThrow(crmId);
  return {
    settings: { ...crm.settings },
    options: {
      environments: ENVIRONMENT_OPTIONS,
      syncFrequencies: SYNC_FREQUENCY_OPTIONS,
      timezones: TIMEZONE_OPTIONS,
    },
  };
}

function updateSettings(crmId, body) {
  const crm = getCrmOrThrow(crmId);
  const environment = String(body.environment || "").trim();
  const syncFrequency = String(body.syncFrequency || "").trim();
  const timezone = String(body.timezone || "").trim();

  if (!ENVIRONMENT_OPTIONS.includes(environment)) {
    throw new AppError(
      `environment must be one of: ${ENVIRONMENT_OPTIONS.join(", ")}`,
      400
    );
  }
  if (!SYNC_FREQUENCY_OPTIONS.includes(syncFrequency)) {
    throw new AppError(
      `syncFrequency must be one of: ${SYNC_FREQUENCY_OPTIONS.join(", ")}`,
      400
    );
  }
  if (!TIMEZONE_OPTIONS.includes(timezone)) {
    throw new AppError(
      `timezone must be one of: ${TIMEZONE_OPTIONS.join(", ")}`,
      400
    );
  }

  crm.settings = {
    environment,
    syncFrequency,
    timezone,
    autoSync: toBool(body.autoSync, "autoSync"),
    leadSync: toBool(body.leadSync, "leadSync"),
    customerSync: toBool(body.customerSync, "customerSync"),
    appointmentSync: toBool(body.appointmentSync, "appointmentSync"),
    soldDealSync: toBool(body.soldDealSync, "soldDealSync"),
  };
  crm.environment = environment;

  return getSettings(crmId);
}

function syncNow(crmId) {
  const crm = getCrmOrThrow(crmId);
  if (crm.status === "DISCONNECTED") {
    throw new AppError("CRM is disconnected", 400);
  }

  crm.lastSyncLabel = "Just now";
  crm.nextSyncLabel = "in 15 minutes";
  if (crm.status === "ERROR") crm.status = "CONNECTED";

  crm.activity.unshift({
    id: `act_${Date.now()}`,
    event: "CRM Sync Started",
    timestamp: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    status: "SUCCESS",
  });
  crm.activity.unshift({
    id: `act_${Date.now() + 1}`,
    event: "Sync Completed",
    timestamp: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    status: "SUCCESS",
  });

  return {
    message: "Sync started successfully",
    connection: getConnectionDetails(crmId).connection,
    stats: getConnectionDetails(crmId).stats,
  };
}

function disconnect(crmId) {
  const crm = getCrmOrThrow(crmId);
  crm.status = "DISCONNECTED";
  crm.lastSyncLabel = "—";
  crm.nextSyncLabel = "—";
  crm.activity.unshift({
    id: `act_${Date.now()}`,
    event: "CRM Disconnected",
    timestamp: new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    status: "SUCCESS",
  });

  return {
    message: "CRM disconnected.",
    connection: {
      id: crm.id,
      name: crm.name,
      status: crm.status,
    },
  };
}

function listConnectionSyncErrors(crmId) {
  getCrmOrThrow(crmId);
  const errors = syncErrors
    .filter((e) => e.crmId === crmId)
    .map((e) => ({
      ...e,
      action:
        e.status === "FAILED"
          ? {
              label: "Retry",
              endpoint: `/api/super-admin/crm-integrations/sync-errors/${e.id}/retry`,
            }
          : null,
    }));
  return { errors };
}

function getFieldMapping(crmId) {
  const crm = getCrmOrThrow(crmId);
  return { fieldMapping: crm.fieldMapping };
}

function getActivity(crmId) {
  const crm = getCrmOrThrow(crmId);
  return { activity: crm.activity };
}

function getHealth(crmId) {
  const crm = getCrmOrThrow(crmId);
  return { health: crm.health };
}

function retrySyncError(errorId) {
  const err = syncErrors.find((e) => e.id === errorId);
  if (!err) throw new AppError("Sync error not found", 404);
  if (err.status === "RETRIED") {
    throw new AppError("Error already retried", 400);
  }

  err.status = "RETRIED";
  const crm = crmStore[err.crmId];
  if (crm && crm.syncErrors > 0) crm.syncErrors -= 1;
  if (crm) {
    crm.activity.unshift({
      id: `act_${Date.now()}`,
      event: "Sync Error Retry",
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      status: "SUCCESS",
    });
  }

  return {
    message: "Retry queued successfully",
    error: {
      ...err,
      action: null,
    },
  };
}

module.exports = {
  getOverview,
  listSyncErrors,
  listPlatformActivity,
  getConnectionDetails,
  getSettings,
  updateSettings,
  syncNow,
  disconnect,
  listConnectionSyncErrors,
  getFieldMapping,
  getActivity,
  getHealth,
  retrySyncError,
};
