const AppError = require("../utils/AppError");

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const LANGUAGES = ["English", "Spanish"];

function parseBool(value, fallback) {
  if (value === undefined) return fallback;
  if (value === true || value === 1 || value === "1") return true;
  if (typeof value === "string" && value.toUpperCase() === "ON") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string" && value.toUpperCase() === "OFF") return false;
  return fallback;
}

const settings = {
  general: {
    platformName: "Model 31",
    timezone: "America/New_York",
    defaultLanguage: "English",
  },
  notifications: {
    emailNotifications: true,
    leadAlerts: true,
    systemAlerts: true,
    crmAlerts: true,
  },
  aiAndSystemControls: {
    aiConversation: true,
    leadQualification: true,
    leadDispatch: true,
    socialPosting: true,
    crmSync: true,
    systemAutonomy: true,
  },
};

function mapToggles(section, labels) {
  return Object.keys(labels).map((key) => ({
    key,
    label: labels[key],
    enabled: section[key],
    status: section[key] ? "ON" : "OFF",
  }));
}

function getOverview() {
  return {
    pageTitle: "Platform Settings",
    description: "Manage global platform configuration.",
    general: {
      platformName: settings.general.platformName,
      timezone: settings.general.timezone,
      defaultLanguage: settings.general.defaultLanguage,
    },
    notifications: {
      title: "Notification Settings",
      toggles: mapToggles(settings.notifications, {
        emailNotifications: "Email Notifications",
        leadAlerts: "Lead Alerts",
        systemAlerts: "System Alerts",
        crmAlerts: "CRM Alerts",
      }),
    },
    aiAndSystemControls: {
      title: "AI Settings & System Controls",
      toggles: mapToggles(settings.aiAndSystemControls, {
        aiConversation: "AI Conversation",
        leadQualification: "Lead Qualification",
        leadDispatch: "Lead Dispatch",
        socialPosting: "Social Posting",
        crmSync: "CRM Sync",
        systemAutonomy: "System Autonomy",
      }),
    },
    options: {
      timezones: TIMEZONES,
      languages: LANGUAGES,
    },
    enforcementNote:
      "Toggling AI or dispatch settings does not allow mixing pipelines. MODEL31_LEAD and DEALERSHIP_LEAD remain separate and cannot be changed manually.",
  };
}

function applyToggleGroup(target, incoming, keys) {
  if (!incoming || typeof incoming !== "object") return;
  keys.forEach((key) => {
    if (incoming[key] === undefined) return;
    target[key] = parseBool(incoming[key], target[key]);
  });

  if (Array.isArray(incoming.toggles)) {
    incoming.toggles.forEach((toggle) => {
      if (!toggle || !toggle.key || !keys.includes(toggle.key)) return;
      target[toggle.key] = parseBool(
        toggle.enabled !== undefined ? toggle.enabled : toggle.status,
        target[toggle.key]
      );
    });
  }
}

function saveSettings(body = {}) {
  if (body.general) {
    if (body.general.platformName !== undefined) {
      const name = String(body.general.platformName).trim();
      if (!name) throw new AppError("Platform name is required", 400);
      settings.general.platformName = name;
    }

    if (body.general.timezone !== undefined) {
      const timezone = String(body.general.timezone).trim();
      if (!TIMEZONES.includes(timezone)) {
        throw new AppError(
          `timezone must be one of: ${TIMEZONES.join(", ")}`,
          400
        );
      }
      settings.general.timezone = timezone;
    }

    if (body.general.defaultLanguage !== undefined) {
      const language = String(body.general.defaultLanguage).trim();
      if (!LANGUAGES.includes(language)) {
        throw new AppError(
          `defaultLanguage must be one of: ${LANGUAGES.join(", ")}`,
          400
        );
      }
      settings.general.defaultLanguage = language;
    }
  }

  applyToggleGroup(settings.notifications, body.notifications, [
    "emailNotifications",
    "leadAlerts",
    "systemAlerts",
    "crmAlerts",
  ]);

  applyToggleGroup(settings.aiAndSystemControls, body.aiAndSystemControls, [
    "aiConversation",
    "leadQualification",
    "leadDispatch",
    "socialPosting",
    "crmSync",
    "systemAutonomy",
  ]);

  return {
    message: "Settings saved",
    ...getOverview(),
  };
}

module.exports = {
  getOverview,
  saveSettings,
};
