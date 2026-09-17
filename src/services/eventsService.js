const AppError = require("../utils/AppError");

const EVENT_TYPES = [
  "LEAD_CREATED",
  "LEAD_QUALIFIED",
  "LEAD_ROUTED",
  "MESSAGE_RECEIVED",
  "APPOINTMENT_CREATED",
  "CRM_SYNC",
  "SOCIAL_POST",
  "DEAL_SOLD",
];

const STATUSES = ["PROCESSED", "PENDING", "FAILED"];

const SOURCES = [
  "Website",
  "AI Engine",
  "Dispatch",
  "CRM",
  "Marketing",
  "Salesperson Portal",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

const EVENTS = [];

function findEvent(eventId) {
  return EVENTS.find((e) => e.id === eventId) || null;
}

function listEvents(query = {}) {
  const search = String(query.search || query.eventId || "").trim().toLowerCase();
  const eventType = String(query.eventType || query.type || "All event types").trim();
  const status = String(query.status || "All statuses").trim();
  const source = String(query.source || "All sources").trim();
  const date = String(query.date || "").trim();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

  let filtered = [...EVENTS];

  if (search) {
    filtered = filtered.filter(
      (e) =>
        e.id.toLowerCase().includes(search) ||
        e.entity.toLowerCase().includes(search) ||
        e.eventType.toLowerCase().includes(search)
    );
  }

  if (eventType && eventType !== "All event types") {
    filtered = filtered.filter(
      (e) => e.eventType.toLowerCase() === eventType.toLowerCase()
    );
  }

  if (status && status !== "All statuses") {
    filtered = filtered.filter(
      (e) => e.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (source && source !== "All sources") {
    filtered = filtered.filter(
      (e) => e.source.toLowerCase() === source.toLowerCase()
    );
  }

  if (date) {
    let isoDate = date;
    const usMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      isoDate = `${usMatch[3]}-${pad(usMatch[1])}-${pad(usMatch[2])}`;
    }
    filtered = filtered.filter((e) => e.createdAt.startsWith(isoDate));
  }

  const total = filtered.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const rows = filtered.slice(start, start + limit).map((e) => ({
    id: e.id,
    eventType: e.eventType,
    source: e.source,
    entity: e.entity,
    status: e.status,
    createdAt: e.createdAt,
    processedAt: e.processedAt || "-",
    duration: e.duration,
    actions: {
      canQuickView: true,
      canOpen: true,
      quickViewPath: `/api/super-admin/events/${e.id}/quick-view`,
      openPath: `/api/super-admin/events/${e.id}`,
    },
  }));

  return {
    pageTitle: "Event Monitor",
    description: "Monitor platform events and automation activity.",
    filters: {
      search: search || "",
      eventType,
      status,
      source,
      date: date || "",
    },
    options: {
      eventTypes: ["All event types", ...EVENT_TYPES],
      statuses: ["All statuses", ...STATUSES],
      sources: ["All sources", ...SOURCES],
    },
    rows,
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

function getQuickView(eventId) {
  const event = findEvent(eventId);
  if (!event) throw new AppError("Event not found", 404);

  return {
    modalTitle: "Event Details",
    eventId: event.id,
    eventType: event.eventType,
    timestamp: event.timestamp,
    source: event.source,
    entity: event.entity,
    payloadSummary: event.payloadSummary,
    processingStatus: event.status,
    duration: event.duration,
    actions: {
      canClose: true,
      canFullDetails: true,
      fullDetailsPath: `/api/super-admin/events/${event.id}`,
      frontendPath: `/super-admin/events/${event.id}`,
    },
  };
}

function getFullDetail(eventId) {
  const event = findEvent(eventId);
  if (!event) throw new AppError("Event not found", 404);

  return {
    pageTitle: "Event Details",
    title: event.eventType,
    subtitle: event.id,
    status: event.status,
    eventId: event.id,
    eventType: event.eventType,
    timestamp: event.timestamp,
    source: event.source,
    entity: event.entity,
    payloadSummary: event.payloadSummary,
    processingStatus: event.status,
    duration: event.duration,
    processed: event.processedAt || "-",
    backPath: "/super-admin/events",
  };
}

module.exports = {
  listEvents,
  getQuickView,
  getFullDetail,
};
