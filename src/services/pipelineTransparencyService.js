const AppError = require("../utils/AppError");

const PIPELINES = ["All pipelines", "MODEL 31", "DEALERSHIP"];
const CLASSIFICATIONS = ["MODEL31_LEAD", "DEALERSHIP_LEAD"];

const SOURCES = [
  "All sources",
  "Website",
  "CRM",
  "Facebook",
  "Instagram",
  "WhatsApp",
  "TikTok",
  "YouTube",
  "Model 31 Content",
  "Authorized Staff Social Account",
  "Comment",
  "DM",
  "Proactive Engagement",
  "Phone",
  "Walk-in",
  "Service",
  "Showroom",
  "Cars.com",
  "AutoTrader",
  "Third Party",
  "Referral",
];

const STATUSES = [
  "All statuses",
  "NEW",
  "QUALIFYING",
  "QUALIFIED",
  "ROUTED",
  "CONTACTED",
  "CLOSED",
];

const LEADS = [];

function computeSummary() {
  return {
    model31Pipeline: {
      totalLeads: 0,
      active: 0,
      qualified: 0,
      appointments: 0,
      sold: 0,
    },
    dealershipPipeline: {
      totalLeads: 0,
      active: 0,
      qualified: 0,
      appointments: 0,
      sold: 0,
    },
  };
}

function mapTableRow(lead) {
  return {
    id: lead.id,
    customer: lead.customer,
    pipeline: lead.pipeline,
    source: lead.source,
    classification: lead.classification,
    status: lead.status,
    salesperson: lead.salesperson,
    createdAt: lead.createdAt,
    model31Signature: lead.model31Signature,
    detailPath: `/api/super-admin/pipeline-transparency/${lead.id}`,
  };
}

function getOverview(query = {}) {
  const search = String(query.search || "").trim().toLowerCase();
  const pipeline = String(query.pipeline || "All pipelines").trim();
  const source = String(query.source || "All sources").trim();
  const status = String(query.status || "All statuses").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

  let filtered = [...LEADS];

  if (search) {
    filtered = filtered.filter(
      (l) =>
        l.id.toLowerCase().includes(search) ||
        l.customer.toLowerCase().includes(search) ||
        l.email.toLowerCase().includes(search)
    );
  }

  if (pipeline !== "All pipelines") {
    filtered = filtered.filter(
      (l) => l.pipeline.toLowerCase() === pipeline.toLowerCase()
    );
  }

  if (source !== "All sources") {
    filtered = filtered.filter(
      (l) => l.source.toLowerCase() === source.toLowerCase()
    );
  }

  if (status !== "All statuses") {
    filtered = filtered.filter(
      (l) => l.status.toLowerCase() === status.toLowerCase()
    );
  }

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    pageTitle: "Pipeline Transparency",
    description:
      "Monitor the separation between Model 31 leads and dealership leads.",
    enforcementNote:
      "Pipeline separation is enforced by the backend. Model 31 and dealership leads cannot be mixed or reclassified manually.",
    summary: computeSummary(),
    mockFlows: {
      staffSocialLead: {
        title: "Staff Social Lead Flow (Model 31)",
        steps: [],
      },
      dealershipCrmLead: {
        title: "Dealership CRM Lead Flow",
        steps: [],
      },
    },
    filters: {
      search: search || "",
      pipeline,
      source,
      status,
    },
    options: {
      pipelines: PIPELINES,
      sources: SOURCES,
      statuses: STATUSES,
      classifications: CLASSIFICATIONS,
    },
    rows: filtered.slice(start, start + limit).map(mapTableRow),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      showingFrom: total === 0 ? 0 : start + 1,
      showingTo: Math.min(start + limit, total),
      label: `Showing ${total === 0 ? 0 : start + 1}-${Math.min(start + limit, total)} of ${total}`,
    },
  };
}

function getLeadDetail(leadId) {
  const lead = LEADS.find((l) => l.id === leadId);
  if (!lead) throw new AppError("Lead not found", 404);

  return {
    pageTitle: "Pipeline Transparency Detail",
    lead: {
      id: lead.id,
      customer: lead.customer,
      email: lead.email,
      pipeline: lead.pipeline,
      classification: lead.classification,
      source: lead.source,
      status: lead.status,
      salesperson: lead.salesperson,
      createdAt: lead.createdAt,
      accessLevel: lead.accessLevel,
      bdcQueue: lead.bdcQueue,
      routingEligible: lead.routingEligible,
      classifiedAt: lead.classifiedAt,
    },
    fingerprint: lead.fingerprint,
    transparency: {
      whereDidThisLeadComeFrom: lead.source,
      whichPipelineDoesItBelongTo: lead.pipeline,
      whyWasItClassifiedThisWay: lead.classificationReason,
      whatHappenedAfterwards: lead.activityHistory.map((a) => a.detail),
    },
    activityHistory: lead.activityHistory,
    routingHistory: lead.routingHistory,
    rulesApplied: lead.rulesApplied,
    permissions: {
      canChangePipeline: false,
      canChangeClassification: false,
      canModifyFingerprint: false,
      reason:
        "Pipeline and classification are immutable after intake. Backend enforces separation.",
    },
    backPath: "/super-admin/pipeline-transparency",
  };
}

function attemptPipelineChange(leadId, body = {}) {
  const lead = LEADS.find((l) => l.id === leadId);
  if (!lead) throw new AppError("Lead not found", 404);

  const blockedFields = [
    "pipeline",
    "classification",
    "model31Signature",
    "fingerprint",
    "routingEligible",
    "accessLevel",
    "bdcQueue",
  ];

  const attempted = blockedFields.filter((field) => body[field] !== undefined);
  if (attempted.length) {
    throw new AppError(
      `Unauthorized change blocked. These fields are immutable: ${attempted.join(", ")}`,
      403
    );
  }

  throw new AppError(
    "Pipeline transparency records are read-only. Classification cannot be changed manually.",
    403
  );
}

function classifyIncomingLead(payload = {}) {
  const source = String(payload.source || "").trim();
  if (!source) throw new AppError("source is required", 400);

  const model31Sources = new Set([
    "Facebook",
    "Instagram",
    "WhatsApp",
    "YouTube",
    "TikTok",
    "Model 31 Content",
    "Authorized Staff Social Account",
    "Comment",
    "DM",
    "Proactive Engagement",
    "Referral",
  ]);

  const dealershipSources = new Set([
    "CRM",
    "Website",
    "Phone",
    "Walk-in",
    "Service",
    "Showroom",
    "Cars.com",
    "AutoTrader",
    "Third Party",
  ]);

  let classification;
  let pipeline;
  let reason;

  if (payload.model31SourceOn === true || model31Sources.has(source)) {
    classification = "MODEL31_LEAD";
    pipeline = "MODEL 31";
    reason =
      "Lead matched Model 31 source rules and was classified before routing.";
  } else if (dealershipSources.has(source)) {
    classification = "DEALERSHIP_LEAD";
    pipeline = "DEALERSHIP";
    reason =
      "Lead matched dealership-owned source rules. Model 31 routing is not applied.";
  } else {
    classification = "DEALERSHIP_LEAD";
    pipeline = "DEALERSHIP";
    reason = "Unknown source defaulted to dealership pipeline for safety.";
  }

  return {
    message: "Lead classified before AI, routing, or scoring",
    classification,
    pipeline,
    source,
    classificationReason: reason,
    fingerprint:
      classification === "MODEL31_LEAD"
        ? {
            trackingId: `M31-TRK-${Date.now().toString().slice(-4)}`,
            signature: "VERIFIED",
            verified: true,
          }
        : {
            trackingId: null,
            signature: "NOT APPLICABLE",
            verified: false,
          },
    nextSteps: [
      "Save pipeline information",
      "Create activity/audit history",
      "Apply correct routing rules",
    ],
  };
}

module.exports = {
  getOverview,
  getLeadDetail,
  attemptPipelineChange,
  classifyIncomingLead,
};
