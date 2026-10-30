const ROLE_NOTIFICATION_CATALOG = {
  "Super Admin": [
    {
      type: "PLATFORM_MAINTENANCE",
      title: "Platform maintenance",
      message: "Platform maintenance is scheduled or in progress.",
    },
    {
      type: "CRM_SYNC_FAILED",
      title: "CRM sync failed",
      message: "A CRM sync failed and needs attention.",
    },
    {
      type: "CRM_LOGIN_FAILED",
      title: "CRM login failed",
      message: "A CRM login failed.",
    },
    {
      type: "SOCIAL_ACCOUNT_DISCONNECTED",
      title: "Social account disconnected",
      message: "A social account was disconnected.",
    },
    {
      type: "LEAD_DISPATCH_MISSED_SLA",
      title: "Lead dispatch missed the time limit",
      message: "A lead was not dispatched within the time limit.",
    },
    {
      type: "AI_REPLIES_BACKED_UP",
      title: "AI replies are backed up",
      message: "AI replies are backed up and waiting to send.",
    },
    {
      type: "SCHEDULED_POST_FAILED",
      title: "Scheduled post failed",
      message: "A scheduled post failed to publish.",
    },
    {
      type: "AUTOMATION_SETTING_CHANGED",
      title: "Automation setting was changed",
      message: "An automation setting was changed.",
    },
    {
      type: "DEAL_READY_FOR_REVIEW",
      title: "Deal is ready for review",
      message: "A deal is ready for review.",
    },
  ],
  "Dealership Admin": [
    {
      type: "NEW_LEAD",
      title: "New lead for their store",
      message: "A new lead was received for your store.",
    },
    {
      type: "DEAL_READY_FOR_REVIEW",
      title: "Deal is ready for review",
      message: "A deal is ready for review.",
    },
    {
      type: "CRM_SYNC_FAILED",
      title: "CRM sync failed for their store",
      message: "CRM sync failed for your store.",
    },
    {
      type: "SOCIAL_ACCOUNT_DISCONNECTED",
      title: "Social account disconnected",
      message: "A social account was disconnected.",
    },
    {
      type: "SALESPERSON_MISSED_LEAD",
      title: "Salesperson missed a new lead",
      message: "A salesperson missed a new lead.",
    },
    {
      type: "TRUST_PORTAL_SOLD_PROOF_READY",
      title: "Sold-car proof is ready in the Trust Portal",
      message: "Sold-car proof is ready in the Trust Portal.",
    },
  ],
  "BDC Manager": [
    {
      type: "QUALIFIED_LEAD_READY",
      title: "New qualified lead is ready to send",
      message: "A new qualified lead is ready to send.",
    },
    {
      type: "LEAD_WAITING_IN_QUEUE",
      title: "Lead is waiting in the queue",
      message: "A lead is waiting in the queue.",
    },
    {
      type: "LEAD_MISSED_RESPONSE_TIME",
      title: "Lead missed the response time",
      message: "A lead missed the response time.",
    },
    {
      type: "CONVERSATION_ESCALATED",
      title: "Conversation was escalated",
      message: "A conversation was escalated.",
    },
    {
      type: "SALESPERSON_DID_NOT_ACCEPT",
      title: "Salesperson did not accept a lead",
      message: "A salesperson did not accept a lead.",
    },
  ],
  Salesperson: [
    {
      type: "NEW_LEAD_ASSIGNED",
      title: "New lead assigned to them",
      message: "A new lead was assigned to you.",
    },
    {
      type: "CUSTOMER_REPLIED",
      title: "Customer replied",
      message: "A customer replied.",
    },
    {
      type: "APPOINTMENT_UPCOMING",
      title: "Appointment is coming up",
      message: "An appointment is coming up.",
    },
    {
      type: "APPOINTMENT_CHANGED",
      title: "Appointment was cancelled or rescheduled",
      message: "An appointment was cancelled or rescheduled.",
    },
    {
      type: "DEAL_MARKED_SOLD",
      title: "Their deal was marked sold",
      message: "Your deal was marked sold.",
    },
    {
      type: "COMMISSION_UPDATED",
      title: "Commission was updated",
      message: "Your commission was updated.",
    },
  ],
  "Marketing Manager": [
    {
      type: "SCRIPT_WAITING_APPROVAL",
      title: "Script is waiting for approval",
      message: "A script is waiting for approval.",
    },
    {
      type: "SCRIPT_APPROVED_OR_REJECTED",
      title: "Script was approved or rejected",
      message: "A script was approved or rejected.",
    },
    {
      type: "SCHEDULED_POST_REMINDER",
      title: "Scheduled post reminder",
      message: "A scheduled post is coming up.",
    },
    {
      type: "SOCIAL_ACCOUNT_DISCONNECTED",
      title: "Social account disconnected",
      message: "A social account was disconnected.",
    },
    {
      type: "HIGH_INTENT_BUYER_SIGNAL",
      title: "New high-intent buyer signal",
      message: "A new high-intent buyer signal was detected.",
    },
    {
      type: "NEW_REFERRAL",
      title: "New referral",
      message: "A new referral was received.",
    },
  ],
  "Service Advisor": [
    {
      type: "SERVICE_APPOINTMENT_TODAY",
      title: "Service appointment booked for them today",
      message: "A service appointment is booked for you today.",
    },
    {
      type: "APPOINTMENT_CHANGED",
      title: "Appointment was cancelled or rescheduled",
      message: "An appointment was cancelled or rescheduled.",
    },
    {
      type: "REPAIR_ORDER_ASSIGNED",
      title: "Repair order was assigned to them",
      message: "A repair order was assigned to you.",
    },
    {
      type: "REPAIR_ORDER_READY",
      title: "Repair order is ready",
      message: "A repair order is ready.",
    },
  ],
  "Service Manager": [
    {
      type: "JOB_DELAYED",
      title: "Job is delayed",
      message: "A job is delayed.",
    },
    {
      type: "JOB_WAITING_ON_PARTS",
      title: "Job is waiting on parts",
      message: "A job is waiting on parts.",
    },
    {
      type: "NEW_REPAIR_ORDER",
      title: "New repair order opened",
      message: "A new repair order was opened.",
    },
    {
      type: "ADVISOR_WORKLOAD_HIGH",
      title: "Advisor workload is too high",
      message: "An advisor workload is too high.",
    },
  ],
  "Inventory Manager": [
    {
      type: "VEHICLE_NEEDS_PHOTOS",
      title: "Vehicle needs photos",
      message: "A vehicle needs photos.",
    },
    {
      type: "VEHICLE_IN_STOCK_TOO_LONG",
      title: "Vehicle has been in stock too long",
      message: "A vehicle has been in stock too long.",
    },
    {
      type: "LISTING_UPDATED",
      title: "Listing was updated",
      message: "A listing was updated.",
    },
    {
      type: "VEHICLE_SOLD_OFF_LOT",
      title: "Vehicle was sold and should come off the lot",
      message: "A vehicle was sold and should come off the lot.",
    },
  ],
};

ROLE_NOTIFICATION_CATALOG["Dealership Manager"] =
  ROLE_NOTIFICATION_CATALOG["Dealership Admin"];

function catalogRolesFor(role) {
  if (role === "Dealership Manager") return ["Dealership Admin", "Dealership Manager"];
  if (role === "Dealership Admin") return ["Dealership Admin", "Dealership Manager"];
  return [role];
}

function getCatalogForRole(role) {
  return ROLE_NOTIFICATION_CATALOG[role] || [];
}

function isValidTypeForRole(role, type) {
  const roles = catalogRolesFor(role);
  return roles.some((name) =>
    (ROLE_NOTIFICATION_CATALOG[name] || []).some((item) => item.type === type)
  );
}

function findCatalogItem(role, type) {
  const roles = catalogRolesFor(role);
  for (const name of roles) {
    const item = (ROLE_NOTIFICATION_CATALOG[name] || []).find((row) => row.type === type);
    if (item) return item;
  }
  return null;
}

module.exports = {
  ROLE_NOTIFICATION_CATALOG,
  catalogRolesFor,
  getCatalogForRole,
  isValidTypeForRole,
  findCatalogItem,
};
