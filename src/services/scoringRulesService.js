const ScoringRules = require("../models/ScoringRules");
const AppError = require("../utils/AppError");

function toInt(value, field) {
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isInteger(num)) {
    throw new AppError(`${field} must be an integer`, 400);
  }
  return num;
}

function validateWeights(weights) {
  if (!weights || typeof weights !== "object") {
    throw new AppError("weights is required", 400);
  }

  const budget = toInt(weights.budget, "Budget");
  const desiredVehicle = toInt(weights.desiredVehicle, "Desired Vehicle");
  const buyingTimeline = toInt(weights.buyingTimeline, "Buying Timeline");
  const location = toInt(weights.location, "Location / Neighborhood");
  const financingPreference = toInt(
    weights.financingPreference,
    "Financing Preference"
  );

  const fields = [
    ["Budget", budget],
    ["Desired Vehicle", desiredVehicle],
    ["Buying Timeline", buyingTimeline],
    ["Location / Neighborhood", location],
    ["Financing Preference", financingPreference],
  ];

  for (const [label, value] of fields) {
    if (value < 0 || value > 100) {
      throw new AppError(`${label} must be between 0 and 100`, 400);
    }
  }

  const total =
    budget + desiredVehicle + buyingTimeline + location + financingPreference;
  if (total !== 100) {
    throw new AppError(
      `Qualification parameters must total 100 points (current total: ${total})`,
      400
    );
  }

  return {
    budget,
    desiredVehicle,
    buyingTimeline,
    location,
    financingPreference,
  };
}

function validateTier(tiers) {
  if (!tiers || typeof tiers !== "object") {
    throw new AppError("tiers is required", 400);
  }
  if (!tiers.tierA || !tiers.tierB || !tiers.tierC) {
    throw new AppError("tiers must include tierA, tierB, and tierC", 400);
  }

  const tierA = {
    min: toInt(tiers.tierA.min, "Tier A min"),
    max: toInt(tiers.tierA.max, "Tier A max"),
  };
  const tierB = {
    min: toInt(tiers.tierB.min, "Tier B min"),
    max: toInt(tiers.tierB.max, "Tier B max"),
  };
  const tierC = {
    min: toInt(tiers.tierC.min, "Tier C min"),
    max: toInt(tiers.tierC.max, "Tier C max"),
  };

  for (const [label, tier] of [
    ["Tier A", tierA],
    ["Tier B", tierB],
    ["Tier C", tierC],
  ]) {
    if (tier.min < 0 || tier.max > 100) {
      throw new AppError(`${label} range must be between 0 and 100`, 400);
    }
    if (tier.min > tier.max) {
      throw new AppError(`${label} min cannot be greater than max`, 400);
    }
  }

  return { tierA, tierB, tierC };
}

async function getScoringRules() {
  return ScoringRules.ensureDefault();
}

async function saveScoringRules(body) {
  const weights = validateWeights(body.weights);
  const tiers = validateTier(body.tiers);
  await ScoringRules.ensureDefault();
  return ScoringRules.save({ weights, tiers });
}

module.exports = {
  getScoringRules,
  saveScoringRules,
};
