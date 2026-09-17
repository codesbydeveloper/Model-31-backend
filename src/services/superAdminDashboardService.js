const AppError = require("../utils/AppError");

/** In-memory Nuclear Mode (matches dashboard toggle) */
let nuclearModeOn = false;

const ROOFTOPS = [
  "Chicago Auto Group",
  "Dallas Premium Motors",
  "Houston Automotive Group",
  "Los Angeles Auto Center",
  "Miami Luxury Motors",
];

const UNIFIED_LEADS = [];

const FINGERPRINTS = {};

const RESCUE_ACTIVITY = [];

function buildFingerprint(leadId) {
  if (FINGERPRINTS[leadId]) return FINGERPRINTS[leadId];

  const lead = UNIFIED_LEADS.find((l) => l.leadId === leadId);
  if (!lead) return null;

  return {
    leadId: lead.leadId,
    badges: [
      lead.source === "CRM" ? "DEALERSHIP" : "MODEL 31",
      lead.source === "CRM" ? "NOT APPLICABLE" : lead.source.toUpperCase(),
    ],
    timeline: [],
    details: {
      contentId: lead.source === "CRM" ? "NOT APPLICABLE" : "",
      leadId: lead.leadId,
      source: lead.source,
      engagementTimestamp: "",
      conversationTimestamp: "",
      leadQualification: "",
      dispatchTimestamp: "",
      assignedSalesperson: lead.salesperson || "Unassigned",
      appointment: "None",
      saleStatus: lead.status === "Closed" ? "Closed" : "Open",
      model31Access: lead.source === "CRM" ? "READ ONLY" : "FULL",
    },
  };
}

function getKpis() {
  return {
    totalLeads: { value: 0, trend: "0%", subtitle: "All pipelines this month" },
    qualifiedLeads: { value: 0, trend: "0%", subtitle: "Passed qualification" },
    routedLeads: { value: 0, trend: "0%", subtitle: "Assigned to sales" },
    appointments: { value: 0, trend: "0%", subtitle: "Scheduled this month" },
    sold: { value: 0, trend: "0%", subtitle: "Closed deals" },
    conversionRate: { value: 0, unit: "%", trend: "0 pts", subtitle: "Lead to sold" },
  };
}

function getNuclearMode() {
  return {
    enabled: nuclearModeOn,
    status: nuclearModeOn ? "ON" : "OFF",
    metrics: {
      activeDeals: 0,
      qualifiedBuyers: 0,
      managerHandoffs: 0,
      dealsReady: 0,
    },
  };
}

function setNuclearMode(enabled) {
  if (typeof enabled !== "boolean") {
    throw new AppError("enabled must be a boolean", 400);
  }
  nuclearModeOn = enabled;
  return getNuclearMode();
}

function getBuyerGenome() {
  return { items: [] };
}

function getDealsReady() {
  return { items: [] };
}

function getManagerHandoffs() {
  return {
    summary: "",
    count: 0,
    items: [],
  };
}

function getNegotiationControls() {
  return {
    description: "Manager-defined price, payment and trade limits.",
    items: [
      { label: "Price floor / ceiling", value: "Set per rooftop" },
      { label: "Payment range", value: "Lease and finance" },
      { label: "Trade allowance", value: "Manager override" },
    ],
    actions: ["Negotiation Control", "Templates"],
  };
}

function getBuyOnlineReadiness() {
  return {
    description:
      "Buy Online unavailable until Nuclear Mode is ON and a deal is ready.",
    nuclearMode: nuclearModeOn ? "ON" : "OFF",
    intentRequired: "HIGH",
    dealStatus: "DEAL READY",
    available: nuclearModeOn,
  };
}

function listUnifiedLeads(query = {}) {
  const search = String(query.search || "").trim().toLowerCase();
  const tier = String(query.tier || "").trim();
  const status = String(query.status || "").trim();
  const rooftop = String(query.rooftop || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

  let rows = [...UNIFIED_LEADS];

  if (search) {
    rows = rows.filter(
      (r) =>
        r.leadId.toLowerCase().includes(search) ||
        r.customer.toLowerCase().includes(search) ||
        r.source.toLowerCase().includes(search) ||
        r.vehicle.toLowerCase().includes(search)
    );
  }
  if (tier && tier !== "All tiers") {
    rows = rows.filter((r) => r.tier.toLowerCase() === tier.toLowerCase());
  }
  if (status && status !== "All statuses") {
    rows = rows.filter((r) => r.status.toLowerCase() === status.toLowerCase());
  }
  if (rooftop && rooftop !== "All rooftops") {
    rows = rows.filter((r) => r.rooftop === rooftop);
  }

  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const leads = rows.slice(start, start + limit).map((r) => ({
    ...r,
    actions: {
      view: `/api/super-admin/dashboard/leads/${r.leadId}`,
      fingerprint: `/api/super-admin/dashboard/fingerprint/${r.leadId}`,
    },
  }));

  return {
    filters: {
      tiers: ["All tiers", "Tier A", "Tier B", "Tier C"],
      statuses: [
        "All statuses",
        "New",
        "Qualifying",
        "Qualified",
        "Routed",
        "Closed",
        "Contacted",
      ],
      rooftops: ["All rooftops", ...ROOFTOPS],
    },
    leads,
    pagination: { page, limit, total, totalPages },
  };
}

function getLeadDetail(leadId) {
  const lead = UNIFIED_LEADS.find((l) => l.leadId === leadId);
  if (!lead) throw new AppError("Lead not found", 404);
  return {
    lead: {
      ...lead,
      actions: {
        view: `/api/super-admin/dashboard/leads/${lead.leadId}`,
        fingerprint: `/api/super-admin/dashboard/fingerprint/${lead.leadId}`,
      },
    },
  };
}

function getFingerprint(leadId) {
  const fingerprint = buildFingerprint(leadId);
  if (!fingerprint) throw new AppError("Fingerprint not found", 404);
  return { fingerprint };
}

function getDispatchMap() {
  return {
    subtitle: "Lead → Rooftop → Available Salesperson",
    cities: [],
    legend: ["Online", "Busy", "Offline", "Active Lead"],
  };
}

function getSmartInbox() {
  return { items: [] };
}

function getRooftopPerformance() {
  return {
    chart: {
      categories: [],
      series: [
        { name: "Qualified", data: [] },
        { name: "Sold", data: [] },
      ],
    },
    table: [],
  };
}

function getActivityFeed() {
  return { items: [] };
}

function getSocialEngine() {
  return {
    subtitle: "Content performance by platform. Visualization only.",
    rows: [],
  };
}

function getLeadWorkflow() {
  return {
    title: "Staff Social → Official Dealer",
    source: "Staff Personal Social Account",
    status: "MODEL 31 LEAD",
    steps: [],
  };
}

function getCrmSync() {
  return {
    title: "CRM Read-Only Sync",
    description: "Model 31 reads dealership CRM records. It does not write back.",
    info: {
      crmMode: "READ ONLY",
      pipeline: "DEALERSHIP",
      source: "CRM",
      model31Access: "READ ONLY",
      note: "Model 31 does not modify dealership leads.",
    },
    crmStatus: "Disconnected",
    mode: "READ ONLY",
    lastSync: "—",
    recordsRead: 0,
    newUpdates: 0,
    errors: 0,
  };
}

function getOemReporting(query = {}) {
  const brandFilter = String(query.brand || "All Brands").trim();

  const rows =
    !brandFilter || brandFilter === "All Brands"
      ? []
      : [];

  return {
    readOnly: true,
    reportingMonth: "AUGUST 2026",
    brandsFilter: ["All Brands"],
    selectedBrand: brandFilter || "All Brands",
    complianceNote:
      "Model 31 operates fully within OEM guidelines. All routing, consent, and reporting follow brand standards and franchise rules.",
    rows,
    footer: "OEM reporting data. View and export only.",
    export: {
      csv: "/api/super-admin/dashboard/oem-reporting/export?format=csv",
      json: "/api/super-admin/dashboard/oem-reporting/export?format=json",
    },
  };
}

function exportOemReporting(query = {}) {
  const data = getOemReporting(query);
  const format = String(query.format || "json").toLowerCase();

  if (format === "csv") {
    const header = "Brand,Stores,Opt-Ins,Sales Influenced,Attribution,Compliance";
    const lines = data.rows.map(
      (r) =>
        `${r.brand},"${r.stores.join("; ")}",${r.optIns},${r.salesInfluenced},${r.attribution}%,${r.compliance}`
    );
    return {
      format: "csv",
      filename: `oem-reporting-august-2026.csv`,
      content: [header, ...lines].join("\n"),
      contentType: "text/csv",
    };
  }

  return {
    format: "json",
    filename: `oem-reporting-august-2026.json`,
    content: data,
    contentType: "application/json",
  };
}

function getUnderwaterRescue() {
  return {
    badge: "Included Free in Model 31",
    description:
      "Recover cold, abandoned, and at-risk opportunities. Read-only CRM access only.",
    kpis: {
      rescuedLeads: 0,
      rescuedAppointments: 0,
      rescuedSales: 0,
      averageGross: 0,
      revenueRecoveredThisMonth: 0,
      revenueRecoveredThisYear: 0,
    },
    charts: {
      rescueActivity: {
        weeks: [],
        series: [
          { name: "Appointments", data: [] },
          { name: "Rescued", data: [] },
          { name: "Sales", data: [] },
        ],
      },
      revenueRecovered: {
        weeks: [],
        data: [],
      },
      signalSourceBreakdown: [],
    },
  };
}

function listRescueActivity(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const total = RESCUE_ACTIVITY.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;

  const activity = RESCUE_ACTIVITY.slice(start, start + limit).map((row) => ({
    ...row,
    recoveredAmount:
      row.recoveredAmount == null
        ? null
        : row.recoveredAmount,
    fingerprint: `/api/super-admin/dashboard/fingerprint/${row.leadId}`,
  }));

  return {
    activity,
    pagination: { page, limit, total, totalPages },
  };
}

function getRescueFingerprint(activityId) {
  const row = RESCUE_ACTIVITY.find((r) => r.id === activityId);
  if (!row) throw new AppError("Rescue activity not found", 404);
  return getFingerprint(row.leadId);
}

module.exports = {
  getKpis,
  getNuclearMode,
  setNuclearMode,
  getBuyerGenome,
  getDealsReady,
  getManagerHandoffs,
  getNegotiationControls,
  getBuyOnlineReadiness,
  listUnifiedLeads,
  getLeadDetail,
  getFingerprint,
  getDispatchMap,
  getSmartInbox,
  getRooftopPerformance,
  getActivityFeed,
  getSocialEngine,
  getLeadWorkflow,
  getCrmSync,
  getOemReporting,
  exportOemReporting,
  getUnderwaterRescue,
  listRescueActivity,
  getRescueFingerprint,
};
