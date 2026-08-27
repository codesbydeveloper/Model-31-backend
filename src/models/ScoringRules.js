const pool = require("../config/database");

const DEFAULT_ID = "scoring_default";

function mapRow(row) {
  if (!row) return null;
  const weights = {
    budget: Number(row.budget_weight) || 0,
    desiredVehicle: Number(row.desired_vehicle_weight) || 0,
    buyingTimeline: Number(row.buying_timeline_weight) || 0,
    location: Number(row.location_weight) || 0,
    financingPreference: Number(row.financing_preference_weight) || 0,
  };
  const total =
    weights.budget +
    weights.desiredVehicle +
    weights.buyingTimeline +
    weights.location +
    weights.financingPreference;

  return {
    id: row.id,
    weights,
    total,
    tiers: {
      tierA: {
        min: Number(row.tier_a_min) || 0,
        max: Number(row.tier_a_max) || 0,
      },
      tierB: {
        min: Number(row.tier_b_min) || 0,
        max: Number(row.tier_b_max) || 0,
      },
      tierC: {
        min: Number(row.tier_c_min) || 0,
        max: Number(row.tier_c_max) || 0,
      },
    },
    updatedAt: row.updated_at,
  };
}

async function find() {
  const [rows] = await pool.query(
    `SELECT * FROM scoring_rules WHERE id = ? LIMIT 1`,
    [DEFAULT_ID]
  );
  return mapRow(rows[0]);
}

async function ensureDefault() {
  const existing = await find();
  if (existing) return existing;

  await pool.query(
    `INSERT INTO scoring_rules
      (id, budget_weight, desired_vehicle_weight, buying_timeline_weight,
       location_weight, financing_preference_weight,
       tier_a_min, tier_a_max, tier_b_min, tier_b_max, tier_c_min, tier_c_max)
     VALUES (?, 20, 20, 20, 20, 20, 80, 100, 40, 79, 0, 39)`,
    [DEFAULT_ID]
  );
  return find();
}

async function save(data) {
  const w = data.weights;
  const t = data.tiers;

  await pool.query(
    `UPDATE scoring_rules SET
      budget_weight = ?,
      desired_vehicle_weight = ?,
      buying_timeline_weight = ?,
      location_weight = ?,
      financing_preference_weight = ?,
      tier_a_min = ?,
      tier_a_max = ?,
      tier_b_min = ?,
      tier_b_max = ?,
      tier_c_min = ?,
      tier_c_max = ?
     WHERE id = ?`,
    [
      w.budget,
      w.desiredVehicle,
      w.buyingTimeline,
      w.location,
      w.financingPreference,
      t.tierA.min,
      t.tierA.max,
      t.tierB.min,
      t.tierB.max,
      t.tierC.min,
      t.tierC.max,
      DEFAULT_ID,
    ]
  );
  return find();
}

module.exports = {
  DEFAULT_ID,
  find,
  ensureDefault,
  save,
};
