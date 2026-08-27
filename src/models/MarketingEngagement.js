const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerName: row.customer_name,
    persona: row.persona || null,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    platform: row.platform,
    likes: Number(row.likes) || 0,
    comments: Number(row.comments) || 0,
    dms: Number(row.dms) || 0,
    stories: Number(row.stories) || 0,
    returns: Number(row.returns_count) || 0,
    level: row.level || "LOW",
    lastActivity: row.last_activity,
    firstInteraction: row.first_interaction || null,
    totalInteractions: Number(row.total_interactions) || 0,
    shares: Number(row.shares) || 0,
    saves: Number(row.saves) || 0,
    leadLabel: row.lead_label || null,
    dmOpens: Number(row.dm_opens) || 0,
    dmReplies: Number(row.dm_replies) || 0,
    repeatOpens: Number(row.repeat_opens) || 0,
    conversationReturns: Number(row.conversation_returns) || 0,
    responseTime: row.response_time || null,
    signals: {
      engagement: row.signal_engagement || null,
      intent: row.signal_intent || null,
      budget: row.budget || null,
      lifeEvent: row.life_event || null,
      referral: row.referral_status || null,
      persona: row.persona || null,
      community: row.community || null,
      returnVisits: Number(row.returns_count) || 0,
      followUp: row.follow_up || null,
    },
    potentialLead: Boolean(row.potential_lead),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (query.level) {
    where.push("e.level = ?");
    params.push(query.level);
  }
  if (query.platform) {
    where.push("e.platform = ?");
    params.push(query.platform);
  }
  if (query.search) {
    where.push("(e.customer_name LIKE ? OR e.persona LIKE ?)");
    const q = `%${query.search}%`;
    params.push(q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM marketing_engagements e ${whereSql}`,
    params
  );
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS dealership_name
     FROM marketing_engagements e
     LEFT JOIN dealerships d ON d.id = e.dealership_id
     ${whereSql}
     ORDER BY e.last_activity DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    items: rows.map(mapRow),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT e.*, d.name AS dealership_name
     FROM marketing_engagements e
     LEFT JOIN dealerships d ON d.id = e.dealership_id
     WHERE e.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function listActivities(engagementId) {
  const [rows] = await pool.query(
    `SELECT * FROM engagement_activities
     WHERE engagement_id = ?
     ORDER BY created_at DESC`,
    [engagementId]
  );
  return rows.map((row) => ({
    id: row.id,
    engagementId: row.engagement_id,
    actionType: row.action_type,
    detail: row.detail || "",
    createdAt: row.created_at,
  }));
}

async function listStoryInteractions(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 6));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM engagement_story_interactions`
  );
  const [rows] = await pool.query(
    `SELECT * FROM engagement_story_interactions
     ORDER BY interaction_date DESC, created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      engagementId: row.engagement_id,
      customerName: row.customer_name,
      story: row.story_title,
      platform: row.platform,
      interaction: row.interaction,
      date: row.interaction_date,
      intent: row.intent,
      status: row.status,
    })),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function listReturningVisitors(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 6));
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM engagement_returning_visitors`
  );
  const [rows] = await pool.query(
    `SELECT * FROM engagement_returning_visitors
     ORDER BY latest_visit DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return {
    items: rows.map((row) => ({
      id: row.id,
      engagementId: row.engagement_id,
      customerName: row.customer_name,
      firstVisit: row.first_visit,
      latestVisit: row.latest_visit,
      visits: Number(row.visits) || 0,
      lastInteraction: row.last_interaction || null,
      engagement: row.engagement_level,
      potentialIntent: row.potential_intent,
    })),
    pagination: {
      page,
      limit,
      total: Number(countRows[0].total) || 0,
      totalPages: Math.ceil((Number(countRows[0].total) || 0) / limit) || 1,
    },
  };
}

async function getStats() {
  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS total,
      COALESCE(SUM(dm_opens), 0) AS dmOpens,
      COALESCE(SUM(dm_replies), 0) AS dmReplies,
      COALESCE(SUM(repeat_opens), 0) AS repeatOpens,
      COALESCE(SUM(conversation_returns), 0) AS conversationReturns
     FROM marketing_engagements`
  );
  return {
    total: Number(rows[0].total) || 0,
    dmOpens: Number(rows[0].dmOpens) || 0,
    dmReplies: Number(rows[0].dmReplies) || 0,
    repeatOpens: Number(rows[0].repeatOpens) || 0,
    conversationReturns: Number(rows[0].conversationReturns) || 0,
  };
}

async function create(data) {
  const id = data.id || `eng_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO marketing_engagements
      (id, customer_name, persona, dealership_id, platform, engagement_type, score,
       likes, comments, dms, stories, returns_count, level, last_activity,
       first_interaction, total_interactions, shares, saves, lead_label,
       dm_opens, dm_replies, repeat_opens, conversation_returns, response_time,
       signal_engagement, signal_intent, budget, life_event, referral_status,
       community, follow_up, potential_lead, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.customerName,
      data.persona || null,
      data.dealershipId || null,
      data.platform,
      data.engagementType || "GENERAL",
      data.score || 0,
      data.likes || 0,
      data.comments || 0,
      data.dms || 0,
      data.stories || 0,
      data.returns || 0,
      data.level || "LOW",
      data.lastActivity || new Date(),
      data.firstInteraction || null,
      data.totalInteractions || 0,
      data.shares || 0,
      data.saves || 0,
      data.leadLabel || null,
      data.dmOpens || 0,
      data.dmReplies || 0,
      data.repeatOpens || 0,
      data.conversationReturns || 0,
      data.responseTime || null,
      data.signalEngagement || null,
      data.signalIntent || null,
      data.budget || null,
      data.lifeEvent || null,
      data.referralStatus || null,
      data.community || null,
      data.followUp || null,
      data.potentialLead ? 1 : 0,
      data.status || "ACTIVE",
    ]
  );
  return findById(id);
}

async function addActivity(engagementId, actionType, detail, createdAt) {
  const id = `ega_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO engagement_activities (id, engagement_id, action_type, detail, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, engagementId, actionType, detail || "", createdAt || new Date()]
  );
}

module.exports = {
  list,
  findById,
  listActivities,
  listStoryInteractions,
  listReturningVisitors,
  getStats,
  create,
  addActivity,
};
