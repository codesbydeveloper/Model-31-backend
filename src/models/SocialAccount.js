const { randomUUID } = require("crypto");
const pool = require("../config/database");

function toOnOff(value, fallback = "OFF") {
  if (value === true || value === 1 || value === "1" || String(value).toUpperCase() === "ON") {
    return "ON";
  }
  if (value === false || value === 0 || value === "0" || String(value).toUpperCase() === "OFF") {
    return "OFF";
  }
  return fallback;
}

function toBool(value, fallback = false) {
  if (value === true || value === 1 || value === "1" || String(value).toUpperCase() === "ON") {
    return true;
  }
  if (value === false || value === 0 || value === "0" || String(value).toUpperCase() === "OFF") {
    return false;
  }
  return fallback;
}

function mapRow(row) {
  if (!row) return null;
  const status = String(row.status || "DISCONNECTED").toUpperCase();
  return {
    id: row.id,
    dealershipId: row.dealership_id,
    dealershipName: row.dealership_name || null,
    platform: row.platform,
    accountName: row.account_name,
    ownerName: row.owner_name || "Dealership Account",
    status,
    model31Source: toOnOff(row.model31_source, "OFF"),
    environment: row.environment || "Production",
    postingEnabled: toBool(row.posting_enabled, true),
    autoPublishing: toBool(row.auto_publishing, false),
    defaultContentType: row.default_content_type || "Vehicle Promotion",
    defaultLanguage: row.default_language || "English",
    defaultTimezone: row.default_timezone || "America/New_York",
    posts: Number(row.posts) || 0,
    followers: Number(row.followers) || 0,
    reach: Number(row.reach) || 0,
    leads: Number(row.leads_count) || 0,
    engagement: Number(row.engagement) || 0,
    lastSync: row.last_sync,
    canConnect: status === "DISCONNECTED" || status === "ERROR",
    canDisconnect: status === "CONNECTED",
    canSettings: status === "CONNECTED",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCard(account) {
  if (!account) return null;
  return {
    id: account.id,
    platform: account.platform,
    accountName: account.accountName,
    ownerName: account.ownerName,
    status: account.status,
    model31Source: account.model31Source,
    lastSync: account.lastSync,
    posts: account.posts,
    followers: account.followers,
    reach: account.reach,
    leads: account.leads,
    engagement: account.engagement,
    dealershipId: account.dealershipId,
    dealershipName: account.dealershipName,
    canConnect: account.canConnect,
    canDisconnect: account.canDisconnect,
    canSettings: account.canSettings,
  };
}

async function list(query = {}) {
  const where = [];
  const params = [];

  if (query.dealershipId) {
    where.push("sa.dealership_id = ?");
    params.push(query.dealershipId);
  }
  if (query.platform && query.platform !== "ALL") {
    where.push("sa.platform = ?");
    params.push(query.platform);
  }
  if (query.status && String(query.status).toUpperCase() !== "ALL") {
    where.push("sa.status = ?");
    params.push(String(query.status).toUpperCase());
  }
  if (query.search) {
    where.push(
      "(sa.account_name LIKE ? OR sa.owner_name LIKE ? OR sa.platform LIKE ? OR d.name LIKE ?)"
    );
    const q = `%${query.search}%`;
    params.push(q, q, q, q);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT sa.*, d.name AS dealership_name
     FROM social_accounts sa
     LEFT JOIN dealerships d ON d.id = sa.dealership_id
     ${whereSql}
     ORDER BY sa.platform ASC, sa.account_name ASC`,
    params
  );
  return rows.map(mapRow);
}

async function listByDealership(dealershipId) {
  return list({ dealershipId });
}

async function findById(id) {
  if (!id) return null;
  const [rows] = await pool.query(
    `SELECT sa.*, d.name AS dealership_name
     FROM social_accounts sa
     LEFT JOIN dealerships d ON d.id = sa.dealership_id
     WHERE sa.id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0]);
}

async function create(data) {
  const id = data.id || `soc_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO social_accounts
      (id, dealership_id, platform, account_name, owner_name, status, model31_source,
       environment, posting_enabled, auto_publishing, default_content_type,
       default_language, default_timezone, posts, followers, reach, leads_count,
       engagement, last_sync)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.dealershipId,
      data.platform,
      data.accountName,
      data.ownerName || null,
      data.status || "CONNECTED",
      toOnOff(data.model31Source, "OFF"),
      data.environment || "Production",
      toBool(data.postingEnabled, true) ? 1 : 0,
      toBool(data.autoPublishing, false) ? 1 : 0,
      data.defaultContentType || "Vehicle Promotion",
      data.defaultLanguage || "English",
      data.defaultTimezone || "America/New_York",
      data.posts || 0,
      data.followers || 0,
      data.reach || 0,
      data.leads || 0,
      data.engagement || 0,
      data.lastSync || null,
    ]
  );
  return findById(id);
}

async function update(id, data) {
  const existing = await findById(id);
  if (!existing) return null;

  await pool.query(
    `UPDATE social_accounts SET
      account_name = ?,
      owner_name = ?,
      model31_source = ?,
      status = ?,
      environment = ?,
      posting_enabled = ?,
      auto_publishing = ?,
      default_content_type = ?,
      default_language = ?,
      default_timezone = ?,
      last_sync = ?
     WHERE id = ?`,
    [
      data.accountName !== undefined ? data.accountName : existing.accountName,
      data.ownerName !== undefined ? data.ownerName : existing.ownerName,
      data.model31Source !== undefined
        ? toOnOff(data.model31Source, existing.model31Source)
        : existing.model31Source,
      data.status !== undefined ? data.status : existing.status,
      data.environment !== undefined ? data.environment : existing.environment,
      data.postingEnabled !== undefined
        ? toBool(data.postingEnabled, existing.postingEnabled)
          ? 1
          : 0
        : existing.postingEnabled
          ? 1
          : 0,
      data.autoPublishing !== undefined
        ? toBool(data.autoPublishing, existing.autoPublishing)
          ? 1
          : 0
        : existing.autoPublishing
          ? 1
          : 0,
      data.defaultContentType !== undefined
        ? data.defaultContentType
        : existing.defaultContentType,
      data.defaultLanguage !== undefined
        ? data.defaultLanguage
        : existing.defaultLanguage,
      data.defaultTimezone !== undefined
        ? data.defaultTimezone
        : existing.defaultTimezone,
      data.lastSync !== undefined ? data.lastSync : existing.lastSync,
      id,
    ]
  );
  return findById(id);
}

async function connect(id, data = {}) {
  return update(id, {
    accountName:
      data.accountName !== undefined ? data.accountName : undefined,
    environment: data.environment || "Production",
    status: "CONNECTED",
    lastSync: new Date(),
  });
}

async function disconnect(id) {
  await pool.query(
    `UPDATE social_accounts SET status = 'DISCONNECTED' WHERE id = ?`,
    [id]
  );
  return findById(id);
}

module.exports = {
  list,
  listByDealership,
  findById,
  create,
  update,
  connect,
  disconnect,
  mapCard,
  toOnOff,
  toBool,
};
