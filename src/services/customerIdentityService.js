const AppError = require("../utils/AppError");

const customers = [];

const detailExtras = {};

function getCustomerOrThrow(customerId) {
  const customer = customers.find((c) => c.id === customerId);
  if (!customer) throw new AppError("Customer not found", 404);
  return customer;
}

function listCustomers(query = {}) {
  const search = String(query.search || "").trim().toLowerCase();
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 8));

  let rows = customers.filter((c) => !c.mergedInto);

  if (search) {
    rows = rows.filter(
      (c) =>
        c.customer.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.replace(/\s/g, "").includes(search.replace(/\s/g, "")) ||
        c.leadId.toLowerCase().includes(search) ||
        (c.crmId && c.crmId.toLowerCase().includes(search))
    );
  }

  const total = rows.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  const start = (page - 1) * limit;

  const items = rows.slice(start, start + limit).map((c) => ({
    id: c.id,
    customer: c.customer,
    email: c.email,
    phone: c.phone,
    leadId: c.leadId,
    crmId: c.crmId,
    channels: c.channels,
    dealership: c.dealership,
    lastActivity: c.lastActivity,
    status: c.status,
    actions: {
      view: `/api/super-admin/customer-identity/${c.id}`,
    },
  }));

  return {
    customers: items,
    pagination: { page, limit, total, totalPages },
  };
}

function buildDefaultDetail(customer) {
  return {
    subtitle: `${customer.dealership}`,
    leadPipeline: {
      pipeline: "DEALERSHIP",
      leadSource: customer.channels[0] || "CRM",
      leadId: customer.leadId,
      model31Status: "Read Only",
    },
    buyerGenome: {
      intent: "—",
      subtitle: "",
      urgency: { value: 0, level: "—" },
      budgetSensitivity: { value: 0, level: "—" },
      hesitation: { value: 0, level: "—" },
      riskTolerance: { value: 0, level: "—" },
      preferredTone: "—",
      preferredMessageLength: "—",
      bestReplyTiming: "—",
    },
    behavioralSignals: {
      subtitle: "Engagement signals only. No covert tracking.",
      dmOpens: 0,
      dmReplies: 0,
      averageReplyDelay: "—",
      storyViews: 0,
      storyReplays: 0,
      contentSaves: 0,
      returnVisits: 0,
      priceQuestions: 0,
      vehicleInterest: "—",
    },
    profile: {
      email: customer.email,
      phone: customer.phone,
      location: "—",
      language: "English",
    },
    identifiers: {
      model31CustomerId: `M31-C-${customer.id.replace("cust_", "")}`,
      crmId: customer.crmId,
      leadIds: [customer.leadId],
      channels: customer.channels,
    },
    potentialDuplicate: null,
    timeline: [],
  };
}

function getCustomerDetail(customerId) {
  const customer = getCustomerOrThrow(customerId);
  const extras = detailExtras[customerId] || buildDefaultDetail(customer);

  return {
    customer: {
      id: customer.id,
      name: customer.customer,
      status: customer.status,
      subtitle: extras.subtitle,
      dealership: customer.dealership,
    },
    leadPipeline: extras.leadPipeline,
    buyerGenome: extras.buyerGenome,
    behavioralSignals: extras.behavioralSignals,
    profile: extras.profile,
    identifiers: extras.identifiers,
    potentialDuplicate: extras.potentialDuplicate
      ? {
          ...extras.potentialDuplicate,
          actions: {
            reviewDuplicate: `/api/super-admin/customer-identity/${customerId}/duplicate-review`,
          },
        }
      : null,
    timeline: extras.timeline,
  };
}

function getDuplicateReview(customerId) {
  const customer = getCustomerOrThrow(customerId);
  const extras = detailExtras[customerId] || buildDefaultDetail(customer);

  if (!extras.potentialDuplicate) {
    throw new AppError("No duplicate found for this customer", 404);
  }

  const duplicate = getCustomerOrThrow(extras.potentialDuplicate.customerId);

  return {
    title: "Review Duplicate",
    customerA: {
      label: "Customer A",
      name: customer.customer,
      email: customer.email,
      phone: customer.phone,
      crmId: customer.crmId,
      customerId: customer.id,
    },
    customerB: {
      label: "Customer B",
      name: duplicate.customer,
      email: duplicate.email,
      phone: duplicate.phone,
      crmId: duplicate.crmId,
      customerId: duplicate.id,
    },
    actions: {
      merge: `/api/super-admin/customer-identity/${customerId}/merge`,
    },
  };
}

function mergeDuplicate(customerId, body = {}) {
  const customer = getCustomerOrThrow(customerId);
  const extras = detailExtras[customerId] || buildDefaultDetail(customer);

  if (!extras.potentialDuplicate) {
    throw new AppError("No duplicate to merge", 404);
  }

  const mergeWithId =
    body.mergeWithCustomerId ||
    body.mergeWithId ||
    extras.potentialDuplicate.customerId;

  const duplicate = getCustomerOrThrow(mergeWithId);
  if (duplicate.id === customer.id) {
    throw new AppError("Cannot merge customer with itself", 400);
  }

  duplicate.mergedInto = customer.id;
  duplicate.status = "MERGED";

  if (detailExtras[customerId]) {
    if (!detailExtras[customerId].identifiers.leadIds.includes(duplicate.leadId)) {
      detailExtras[customerId].identifiers.leadIds.push(duplicate.leadId);
    }
    const mergedChannels = new Set([
      ...detailExtras[customerId].identifiers.channels,
      ...duplicate.channels,
    ]);
    detailExtras[customerId].identifiers.channels = [...mergedChannels];
    detailExtras[customerId].potentialDuplicate = null;
    detailExtras[customerId].timeline.unshift({
      id: `tl_merge_${Date.now()}`,
      title: "Records Merged",
      description: `Merged with ${duplicate.customer} (${duplicate.crmId || duplicate.leadId})`,
      timestamp: new Date().toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    });
  }

  return {
    message: "Records merged successfully",
    mergedCustomer: {
      id: customer.id,
      name: customer.customer,
      email: customer.email,
      phone: customer.phone,
      crmId: customer.crmId,
    },
    mergedFrom: {
      id: duplicate.id,
      name: duplicate.customer,
    },
  };
}

module.exports = {
  listCustomers,
  getCustomerDetail,
  getDuplicateReview,
  mergeDuplicate,
};
