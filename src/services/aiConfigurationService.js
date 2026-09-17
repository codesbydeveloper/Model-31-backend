const AiConfiguration = require("../models/AiConfiguration");
const AppError = require("../utils/AppError");

const TONE_OPTIONS = [
  "Professional",
  "Friendly",
  "Casual",
  "Luxury",
  "Concise",
];

const RESPONSE_STYLE_OPTIONS = ["Short", "Balanced", "Detailed"];

function requireSection(body, key) {
  if (!body[key] || typeof body[key] !== "object") {
    throw new AppError(`${key} is required`, 400);
  }
  return body[key];
}

function requireBool(section, field, label) {
  if (section[field] === undefined) {
    throw new AppError(`${label} is required`, 400);
  }
  return (
    section[field] === true ||
    section[field] === 1 ||
    section[field] === "1" ||
    section[field] === "true"
  );
}

function validatePayload(body) {
  const conversationAi = requireSection(body, "conversationAi");
  const leadQualification = requireSection(body, "leadQualification");
  const aiBehavior = requireSection(body, "aiBehavior");

  const tone = String(conversationAi.tone || "").trim();
  if (!TONE_OPTIONS.includes(tone)) {
    throw new AppError(
      `tone must be one of: ${TONE_OPTIONS.join(", ")}`,
      400
    );
  }

  const responseStyle = String(conversationAi.responseStyle || "").trim();
  if (!RESPONSE_STYLE_OPTIONS.includes(responseStyle)) {
    throw new AppError(
      `responseStyle must be one of: ${RESPONSE_STYLE_OPTIONS.join(", ")}`,
      400
    );
  }

  return {
    conversationAi: {
      aiEnabled: requireBool(conversationAi, "aiEnabled", "AI Enabled"),
      automaticResponses: requireBool(
        conversationAi,
        "automaticResponses",
        "Automatic Responses"
      ),
      languageDetection: requireBool(
        conversationAi,
        "languageDetection",
        "Language Detection"
      ),
      english: requireBool(conversationAi, "english", "English"),
      spanish: requireBool(conversationAi, "spanish", "Spanish"),
      tone,
      responseStyle,
    },
    leadQualification: {
      budget: requireBool(leadQualification, "budget", "Budget"),
      desiredVehicle: requireBool(
        leadQualification,
        "desiredVehicle",
        "Desired Vehicle"
      ),
      buyingTimeline: requireBool(
        leadQualification,
        "buyingTimeline",
        "Buying Timeline"
      ),
      location: requireBool(
        leadQualification,
        "location",
        "Location / Neighborhood"
      ),
      financingPreference: requireBool(
        leadQualification,
        "financingPreference",
        "Financing Preference"
      ),
    },
    aiBehavior: {
      conversationAi: requireBool(
        aiBehavior,
        "conversationAi",
        "Conversation AI"
      ),
      leadQualification: requireBool(
        aiBehavior,
        "leadQualification",
        "Lead Qualification"
      ),
      automaticLeadRouting: requireBool(
        aiBehavior,
        "automaticLeadRouting",
        "Automatic Lead Routing"
      ),
      aiContentGeneration: requireBool(
        aiBehavior,
        "aiContentGeneration",
        "AI Content Generation"
      ),
      aiFollowUp: requireBool(aiBehavior, "aiFollowUp", "AI Follow-up"),
      appointmentAssistance: requireBool(
        aiBehavior,
        "appointmentAssistance",
        "Appointment Assistance"
      ),
    },
  };
}

async function getAiConfiguration() {
  const config = await AiConfiguration.ensureDefault();
  return {
    ...config,
    options: {
      tones: TONE_OPTIONS,
      responseStyles: RESPONSE_STYLE_OPTIONS,
    },
  };
}

async function saveAiConfiguration(body) {
  await AiConfiguration.ensureDefault();
  const payload = validatePayload(body);
  const config = await AiConfiguration.save(payload);
  return {
    ...config,
    options: {
      tones: TONE_OPTIONS,
      responseStyles: RESPONSE_STYLE_OPTIONS,
    },
  };
}

module.exports = {
  TONE_OPTIONS,
  RESPONSE_STYLE_OPTIONS,
  getAiConfiguration,
  saveAiConfiguration,
};
