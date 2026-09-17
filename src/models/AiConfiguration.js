const pool = require("../config/database");

const DEFAULT_ID = "ai_config_default";

function toBool(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationAi: {
      aiEnabled: Boolean(row.ai_enabled),
      automaticResponses: Boolean(row.automatic_responses),
      languageDetection: Boolean(row.language_detection),
      english: Boolean(row.english),
      spanish: Boolean(row.spanish),
      tone: row.tone,
      responseStyle: row.response_style,
    },
    leadQualification: {
      budget: Boolean(row.qualify_budget),
      desiredVehicle: Boolean(row.qualify_desired_vehicle),
      buyingTimeline: Boolean(row.qualify_buying_timeline),
      location: Boolean(row.qualify_location),
      financingPreference: Boolean(row.qualify_financing_preference),
    },
    aiBehavior: {
      conversationAi: Boolean(row.behavior_conversation_ai),
      leadQualification: Boolean(row.behavior_lead_qualification),
      automaticLeadRouting: Boolean(row.behavior_automatic_lead_routing),
      aiContentGeneration: Boolean(row.behavior_ai_content_generation),
      aiFollowUp: Boolean(row.behavior_ai_follow_up),
      appointmentAssistance: Boolean(row.behavior_appointment_assistance),
    },
    updatedAt: row.updated_at,
  };
}

async function find() {
  const [rows] = await pool.query(
    `SELECT * FROM ai_configuration WHERE id = ? LIMIT 1`,
    [DEFAULT_ID]
  );
  return mapRow(rows[0]);
}

async function ensureDefault() {
  const existing = await find();
  if (existing) return existing;

  await pool.query(
    `INSERT INTO ai_configuration (
      id,
      ai_enabled, automatic_responses, language_detection, english, spanish,
      tone, response_style,
      qualify_budget, qualify_desired_vehicle, qualify_buying_timeline,
      qualify_location, qualify_financing_preference,
      behavior_conversation_ai, behavior_lead_qualification,
      behavior_automatic_lead_routing, behavior_ai_content_generation,
      behavior_ai_follow_up, behavior_appointment_assistance
    ) VALUES (?, 1, 1, 1, 1, 1, 'Professional', 'Balanced', 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)`,
    [DEFAULT_ID]
  );
  return find();
}

async function save(data) {
  const c = data.conversationAi;
  const q = data.leadQualification;
  const b = data.aiBehavior;

  await pool.query(
    `UPDATE ai_configuration SET
      ai_enabled = ?,
      automatic_responses = ?,
      language_detection = ?,
      english = ?,
      spanish = ?,
      tone = ?,
      response_style = ?,
      qualify_budget = ?,
      qualify_desired_vehicle = ?,
      qualify_buying_timeline = ?,
      qualify_location = ?,
      qualify_financing_preference = ?,
      behavior_conversation_ai = ?,
      behavior_lead_qualification = ?,
      behavior_automatic_lead_routing = ?,
      behavior_ai_content_generation = ?,
      behavior_ai_follow_up = ?,
      behavior_appointment_assistance = ?
     WHERE id = ?`,
    [
      toBool(c.aiEnabled) ? 1 : 0,
      toBool(c.automaticResponses) ? 1 : 0,
      toBool(c.languageDetection) ? 1 : 0,
      toBool(c.english) ? 1 : 0,
      toBool(c.spanish) ? 1 : 0,
      c.tone,
      c.responseStyle,
      toBool(q.budget) ? 1 : 0,
      toBool(q.desiredVehicle) ? 1 : 0,
      toBool(q.buyingTimeline) ? 1 : 0,
      toBool(q.location) ? 1 : 0,
      toBool(q.financingPreference) ? 1 : 0,
      toBool(b.conversationAi) ? 1 : 0,
      toBool(b.leadQualification) ? 1 : 0,
      toBool(b.automaticLeadRouting) ? 1 : 0,
      toBool(b.aiContentGeneration) ? 1 : 0,
      toBool(b.aiFollowUp) ? 1 : 0,
      toBool(b.appointmentAssistance) ? 1 : 0,
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
