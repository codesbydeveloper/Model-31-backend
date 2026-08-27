const ROLES = [
  "Super Admin",
  "Dealership Admin",
  "Dealership Manager",
  "BDC Manager",
  "Salesperson",
  "Marketing Manager",
];

const STATUSES = ["Active", "Inactive", "Suspended"];

const LEAD_STATUSES = [
  "NEW",
  "QUALIFYING",
  "QUALIFIED",
  "CONTACTED",
  "APPOINTMENT",
  "ROUTED",
  "CLOSED",
];
const LEAD_TIERS = ["Tier A", "Tier B", "Tier C", "Tier D"];
const LEAD_PIPELINES = ["MODEL 31", "DEALERSHIP"];
const LEAD_FINANCING = ["Lease", "Finance", "Cash", "Other"];

const CITY_STATUSES = ["Active", "Inactive"];
const CITY_PRIMARY_LANGUAGES = ["English", "Spanish", "English / Spanish"];
const CITY_FINANCING_FOCUS = ["Lease", "Financing", "Cash", "Lease / Financing"];

const PERSONA_STATUSES = ["Active", "Inactive"];
const PERSONA_LANGUAGES = ["English", "Spanish", "English / Spanish"];

const TEMPLATE_STATUSES = ["ACTIVE", "INACTIVE"];
const TEMPLATE_VEHICLE_TYPES = ["New", "Used", "Certified Used", "EV", "Luxury"];

const DEALERSHIP_PORTAL_ROLES = ["Dealership Manager", "Dealership Admin"];

const BDC_DISPATCH_STATUSES = [
  "QUALIFIED",
  "ASSIGNED",
  "ACCEPTED",
  "WAITING",
  "EXPIRED",
  "ESCALATED",
];
const BDC_PRIORITIES = ["HIGH", "MEDIUM", "LOW"];
const ESCALATION_STATUSES = ["OPEN", "RESOLVED"];

module.exports = {
  ROLES,
  STATUSES,
  LEAD_STATUSES,
  LEAD_TIERS,
  LEAD_PIPELINES,
  LEAD_FINANCING,
  CITY_STATUSES,
  CITY_PRIMARY_LANGUAGES,
  CITY_FINANCING_FOCUS,
  PERSONA_STATUSES,
  PERSONA_LANGUAGES,
  TEMPLATE_STATUSES,
  TEMPLATE_VEHICLE_TYPES,
  DEALERSHIP_PORTAL_ROLES,
  BDC_DISPATCH_STATUSES,
  BDC_PRIORITIES,
  ESCALATION_STATUSES,
};
