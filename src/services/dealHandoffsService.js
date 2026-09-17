const AppError = require("../utils/AppError");

const STATUSES = [
  "All statuses",
  "QUALIFIED",
  "DEAL READY",
  "MANAGER REVIEW",
  "MANAGER ACCEPTED",
  "CLOSED",
];

const FLOW_STEPS = [
  "Qualified Buyer",
  "Nuclear Mode",
  "Deal Guidance",
  "Deal Ready",
  "Manager Handoff",
  "Manager Review",
  "Manager Takes Over",
  "Closed",
];

let handoffs = [];

function findOne(id) {
  return handoffs.find((h) => h.id === id) || null;
}

function pushActivity(item, action, detail) {
  item.activityHistory = [
    {
      id: `${item.id}_act_${item.activityHistory.length + 1}`,
      action,
      actor: "Super Admin",
      timestamp: new Date().toISOString(),
      detail,
    },
    ...item.activityHistory,
  ];
}

function mapListRow(item) {
  return {
    id: item.id,
    customer: item.customer,
    vehicle: item.vehicle,
    leadScore: item.leadScore,
    intent: item.intent,
    nuclearMode: item.nuclearMode,
    dealStatus: item.dealStatus,
    salesperson: item.salesperson,
    handoffTime: item.handoffTime,
    priority: item.priority,
    actions: {
      canReview: true,
      reviewPath: `/api/super-admin/deal-handoffs/${item.id}`,
      frontendPath: `/super-admin/deal-handoffs/${item.id}`,
    },
  };
}

function buildFlow(item) {
  const currentIndex = FLOW_STEPS.indexOf(item.currentFlowStep);
  return {
    steps: FLOW_STEPS.map((step, index) => ({
      step,
      completed: index <= currentIndex,
      current: index === currentIndex,
    })),
    disclaimer: "Model 31 does not automatically mark a deal as sold.",
  };
}

function mapActions(item) {
  const closed = item.dealStatus === "CLOSED";
  return {
    canAcceptHandoff: !closed && item.dealStatus !== "MANAGER ACCEPTED",
    canRequestMoreInfo: !closed,
    canTakeOver: !closed,
    canMarkClosed: !closed,
    canOpenLead: true,
    canViewPackage: item.visualPackage?.status === "READY",
    acceptHandoffPath: `/api/super-admin/deal-handoffs/${item.id}/accept-handoff`,
    requestMoreInfoPath: `/api/super-admin/deal-handoffs/${item.id}/request-more-info`,
    takeOverPath: `/api/super-admin/deal-handoffs/${item.id}/take-over`,
    markClosedPath: `/api/super-admin/deal-handoffs/${item.id}/mark-closed`,
    openLeadPath: `/api/super-admin/deal-handoffs/${item.id}/open-lead`,
    viewPackagePath: `/api/super-admin/deal-handoffs/${item.id}/visual-package`,
  };
}

function listHandoffs(query = {}) {
  const search = String(query.search || "").trim().toLowerCase();
  const status = String(query.status || "All statuses").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 8));

  let filtered = [...handoffs];

  if (search) {
    filtered = filtered.filter(
      (h) =>
        h.customer.toLowerCase().includes(search) ||
        h.vehicle.toLowerCase().includes(search) ||
        h.salesperson.toLowerCase().includes(search) ||
        h.vin.toLowerCase().includes(search)
    );
  }

  if (status && status !== "All statuses") {
    filtered = filtered.filter(
      (h) => h.dealStatus.toLowerCase() === status.toLowerCase()
    );
  }

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    pageTitle: "Deal Handoffs",
    description:
      "Review qualified buyers and structured deals requiring management attention.",
    filters: { search: search || "", status },
    options: { statuses: STATUSES },
    rows: filtered.slice(start, start + limit).map(mapListRow),
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

function getHandoffDetail(id) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);

  return {
    pageTitle: item.customer,
    subtitle: `${item.vehicle} — ${item.vin}`,
    badges: {
      dealStatus: item.dealStatus,
      intent: item.intent,
      priority: item.priority,
    },
    flow: buildFlow(item),
    actions: mapActions(item),
    dealDetails: {
      customer: item.customer,
      vehicle: item.vehicle,
      vin: item.vin,
      leadScore: item.leadScore,
      budget: item.budget,
      paymentPreference: item.paymentPreference,
      tradeInformation: item.tradeInformation,
      appointment: item.appointment,
      salesperson: item.salesperson,
      dealStatus: item.dealStatus,
      notes: item.notes,
    },
    buyerGenome: item.buyerGenome,
    negotiationLimits: item.negotiationLimits,
    buyOnline: item.buyOnline,
    visualPackage: {
      status: item.visualPackage.status,
      note: item.visualPackage.note,
      exterior: item.visualPackage.exterior,
      color: item.visualPackage.color,
      interior: item.visualPackage.interior,
      trim: item.visualPackage.trim,
      canViewPackage: true,
      viewPackagePath: `/api/super-admin/deal-handoffs/${item.id}/visual-package`,
    },
    pipeline: {
      pipeline: item.pipeline,
      classification: item.classification,
      source: item.source,
      leadId: item.leadId,
    },
    activityHistory: item.activityHistory,
    backPath: "/super-admin/deal-handoffs",
  };
}

function getVisualPackage(id) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);

  return {
    modalTitle: "Vehicle Visual Package",
    vehicle: item.vehicle,
    vin: item.vin,
    status: item.visualPackage.status,
    note: item.visualPackage.note,
    exterior: item.visualPackage.exterior,
    color: item.visualPackage.color,
    interior: item.visualPackage.interior,
    trim: item.visualPackage.trim,
    images: item.visualPackage.images,
    video: item.visualPackage.video,
  };
}

function acceptHandoff(id) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);
  if (item.dealStatus === "CLOSED") {
    throw new AppError("Closed deals cannot accept handoff", 400);
  }

  item.dealStatus = "MANAGER ACCEPTED";
  item.currentFlowStep = "Manager Review";
  pushActivity(
    item,
    "ACCEPT_HANDOFF",
    "Manager accepted handoff. Deal marked as MANAGER ACCEPTED. Sale is not closed."
  );

  return {
    message: "Handoff accepted",
    modal: {
      title: "Accept handoff?",
      note: "This action marks the deal as manager accepted. It does not close the sale.",
    },
    deal: getHandoffDetail(id),
  };
}

function requestMoreInfo(id, body = {}) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);
  if (item.dealStatus === "CLOSED") {
    throw new AppError("Closed deals cannot request more information", 400);
  }

  const note = String(body.note || "Manager requested more information.").trim();
  item.dealStatus = "MANAGER REVIEW";
  item.currentFlowStep = "Manager Review";
  pushActivity(item, "REQUEST_MORE_INFO", note);

  return {
    message: "More information requested",
    deal: getHandoffDetail(id),
  };
}

function takeOver(id) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);
  if (item.dealStatus === "CLOSED") {
    throw new AppError("Closed deals cannot be taken over", 400);
  }

  item.dealStatus = "MANAGER ACCEPTED";
  item.currentFlowStep = "Manager Takes Over";
  pushActivity(item, "TAKE_OVER", "Deal taken over by manager.");

  return {
    message: "Deal taken over",
    modal: {
      title: "Take over this deal?",
      note: "No live messaging is sent.",
    },
    deal: getHandoffDetail(id),
  };
}

function markClosed(id) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);
  if (item.dealStatus === "CLOSED") {
    throw new AppError("Deal is already closed", 400);
  }

  item.dealStatus = "CLOSED";
  item.currentFlowStep = "Closed";
  item.priority = "LOW";
  pushActivity(
    item,
    "MARK_CLOSED",
    "Deal marked closed by manager. Model 31 does not automatically mark this deal as sold."
  );

  return {
    message: "Deal marked closed",
    modal: {
      title: "Mark closed?",
      note: "Model 31 will not automatically mark this deal as sold.",
    },
    deal: getHandoffDetail(id),
  };
}

function openLead(id) {
  const item = findOne(id);
  if (!item) throw new AppError("Deal handoff not found", 404);

  return {
    message: "Open lead",
    leadId: item.leadId,
    frontendPath: `/super-admin/leads/${item.leadId}`,
    apiPath: `/api/super-admin/pipeline-transparency/${item.leadId}`,
  };
}

module.exports = {
  listHandoffs,
  getHandoffDetail,
  getVisualPackage,
  acceptHandoff,
  requestMoreInfo,
  takeOver,
  markClosed,
  openLead,
};
