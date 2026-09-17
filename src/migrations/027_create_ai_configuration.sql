-- Super Admin AI Configuration (single config row)

CREATE TABLE IF NOT EXISTS ai_configuration (
  id VARCHAR(64) NOT NULL,
  -- Conversation AI
  ai_enabled TINYINT(1) NOT NULL DEFAULT 1,
  automatic_responses TINYINT(1) NOT NULL DEFAULT 1,
  language_detection TINYINT(1) NOT NULL DEFAULT 1,
  english TINYINT(1) NOT NULL DEFAULT 1,
  spanish TINYINT(1) NOT NULL DEFAULT 1,
  tone VARCHAR(32) NOT NULL DEFAULT 'Professional',
  response_style VARCHAR(32) NOT NULL DEFAULT 'Balanced',
  -- Lead Qualification parameters
  qualify_budget TINYINT(1) NOT NULL DEFAULT 1,
  qualify_desired_vehicle TINYINT(1) NOT NULL DEFAULT 1,
  qualify_buying_timeline TINYINT(1) NOT NULL DEFAULT 1,
  qualify_location TINYINT(1) NOT NULL DEFAULT 1,
  qualify_financing_preference TINYINT(1) NOT NULL DEFAULT 1,
  -- AI Behavior modules
  behavior_conversation_ai TINYINT(1) NOT NULL DEFAULT 1,
  behavior_lead_qualification TINYINT(1) NOT NULL DEFAULT 1,
  behavior_automatic_lead_routing TINYINT(1) NOT NULL DEFAULT 1,
  behavior_ai_content_generation TINYINT(1) NOT NULL DEFAULT 1,
  behavior_ai_follow_up TINYINT(1) NOT NULL DEFAULT 1,
  behavior_appointment_assistance TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);
