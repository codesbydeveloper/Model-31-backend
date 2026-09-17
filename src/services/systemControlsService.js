const AppError = require("../utils/AppError");

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const state = {
  nuclearMode: {
    enabled: false,
    descriptionOff: "Model 31 operates in standard assist mode.",
    descriptionOn:
      "Nuclear Mode is ON. Model 31 may run advanced deal assistance within manager-defined limits.",
  },
  salespersonControl: {
    salespersonAvailability: true,
    leadDispatch: true,
    automaticRouting: true,
    afterHoursRouting: true,
  },
  dealershipControl: {
    dealershipAutomation: true,
    aiConversations: true,
    leadQualification: true,
    crmSync: true,
    appointmentAutomation: true,
  },
  socialPostingControl: {
    socialPosting: true,
    scheduledPosts: true,
    autoPublishing: false,
    aiContentPublishing: true,
  },
  systemAutonomyControl: {
    aiAutonomy: true,
    automaticLeadRouting: true,
    automaticFollowUp: true,
    automaticAppointmentAssistance: true,
    automaticCrmSync: true,
    automaticMarketingPublishing: false,
  },
};

const TOGGLE_MAP = {
  salespersonAvailability: ["salespersonControl", "salespersonAvailability"],
  leadDispatch: ["salespersonControl", "leadDispatch"],
  automaticRouting: ["salespersonControl", "automaticRouting"],
  afterHoursRouting: ["salespersonControl", "afterHoursRouting"],
  dealershipAutomation: ["dealershipControl", "dealershipAutomation"],
  aiConversations: ["dealershipControl", "aiConversations"],
  leadQualification: ["dealershipControl", "leadQualification"],
  crmSync: ["dealershipControl", "crmSync"],
  appointmentAutomation: ["dealershipControl", "appointmentAutomation"],
  socialPosting: ["socialPostingControl", "socialPosting"],
  scheduledPosts: ["socialPostingControl", "scheduledPosts"],
  autoPublishing: ["socialPostingControl", "autoPublishing"],
  aiContentPublishing: ["socialPostingControl", "aiContentPublishing"],
  aiAutonomy: ["systemAutonomyControl", "aiAutonomy"],
  automaticLeadRouting: ["systemAutonomyControl", "automaticLeadRouting"],
  automaticFollowUp: ["systemAutonomyControl", "automaticFollowUp"],
  automaticAppointmentAssistance: [
    "systemAutonomyControl",
    "automaticAppointmentAssistance",
  ],
  automaticCrmSync: ["systemAutonomyControl", "automaticCrmSync"],
  automaticMarketingPublishing: [
    "systemAutonomyControl",
    "automaticMarketingPublishing",
  ],
};

function parseBool(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (typeof value === "string" && value.toUpperCase() === "ON") return true;
  if (value === false || value === 0 || value === "0") return false;
  if (typeof value === "string" && value.toUpperCase() === "OFF") return false;
  return null;
}

function statusLabel(on) {
  return on ? "ACTIVE" : "INACTIVE";
}

function onOff(on) {
  return on ? "ON" : "OFF";
}

function mapToggles(section, labels) {
  return Object.keys(labels).map((key) => ({
    key,
    label: labels[key],
    enabled: section[key],
    status: onOff(section[key]),
  }));
}

function buildControlStatus() {
  return [
    {
      key: "systemAutonomy",
      label: "System Autonomy",
      status: statusLabel(state.systemAutonomyControl.aiAutonomy),
    },
    {
      key: "leadDispatch",
      label: "Lead Dispatch",
      status: statusLabel(state.salespersonControl.leadDispatch),
    },
    {
      key: "aiConversation",
      label: "AI Conversation",
      status: statusLabel(state.dealershipControl.aiConversations),
    },
    {
      key: "crmSync",
      label: "CRM Sync",
      status: statusLabel(state.dealershipControl.crmSync),
    },
    {
      key: "socialPublishing",
      label: "Social Publishing",
      status: statusLabel(state.socialPostingControl.socialPosting),
    },
  ];
}

function getOverview() {
  return {
    pageTitle: "System Control Center",
    description:
      "Manage platform automation, AI behavior, and dealership operations.",
    controlStatus: buildControlStatus(),
    nuclearMode: {
      enabled: state.nuclearMode.enabled,
      status: onOff(state.nuclearMode.enabled),
      description: state.nuclearMode.enabled
        ? state.nuclearMode.descriptionOn
        : state.nuclearMode.descriptionOff,
    },
    salespersonControl: {
      title: "Salesperson Control",
      toggles: mapToggles(state.salespersonControl, {
        salespersonAvailability: "Salesperson Availability",
        leadDispatch: "Lead Dispatch",
        automaticRouting: "Automatic Routing",
        afterHoursRouting: "After-Hours Routing",
      }),
    },
    dealershipControl: {
      title: "Dealership Control",
      toggles: mapToggles(state.dealershipControl, {
        dealershipAutomation: "Dealership Automation",
        aiConversations: "AI Conversations",
        leadQualification: "Lead Qualification",
        crmSync: "CRM Sync",
        appointmentAutomation: "Appointment Automation",
      }),
    },
    socialPostingControl: {
      title: "Social Posting Control",
      toggles: mapToggles(state.socialPostingControl, {
        socialPosting: "Social Posting",
        scheduledPosts: "Scheduled Posts",
        autoPublishing: "Auto Publishing",
        aiContentPublishing: "AI Content Publishing",
      }),
    },
    systemAutonomyControl: {
      title: "System Autonomy Control",
      toggles: mapToggles(state.systemAutonomyControl, {
        aiAutonomy: "AI Autonomy",
        automaticLeadRouting: "Automatic Lead Routing",
        automaticFollowUp: "Automatic Follow-Up",
        automaticAppointmentAssistance: "Automatic Appointment Assistance",
        automaticCrmSync: "Automatic CRM Sync",
        automaticMarketingPublishing: "Automatic Marketing Publishing",
      }),
    },
  };
}

function setNuclearMode(enabled) {
  state.nuclearMode.enabled = enabled;
  return {
    message: `Nuclear Mode ${onOff(enabled)}`,
    ...getOverview(),
  };
}

function updateToggle(key, enabled) {
  const path = TOGGLE_MAP[key];
  if (!path) {
    throw new AppError(
      `Unknown toggle key. Valid keys: ${Object.keys(TOGGLE_MAP).join(", ")}`,
      400
    );
  }
  const [section, field] = path;
  state[section][field] = enabled;
  return {
    message: `${key} ${onOff(enabled)}`,
    key,
    enabled,
    status: onOff(enabled),
    ...getOverview(),
  };
}

function updateControls(body = {}) {
  if (body.nuclearMode !== undefined) {
    const value = parseBool(
      body.nuclearMode.enabled !== undefined
        ? body.nuclearMode.enabled
        : body.nuclearMode
    );
    if (value === null) throw new AppError("nuclearMode must be ON or OFF", 400);
    state.nuclearMode.enabled = value;
  }

  const sections = [
    "salespersonControl",
    "dealershipControl",
    "socialPostingControl",
    "systemAutonomyControl",
  ];

  sections.forEach((section) => {
    if (!body[section] || typeof body[section] !== "object") return;
    Object.keys(state[section]).forEach((field) => {
      if (body[section][field] === undefined) return;
      const value = parseBool(body[section][field]);
      if (value === null) {
        throw new AppError(`${section}.${field} must be ON or OFF`, 400);
      }
      state[section][field] = value;
    });
  });

  return {
    message: "System controls updated",
    ...getOverview(),
  };
}

module.exports = {
  getOverview,
  setNuclearMode,
  updateToggle,
  updateControls,
  parseBool,
};
