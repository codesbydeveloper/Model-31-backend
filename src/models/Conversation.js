const { randomUUID } = require("crypto");
const pool = require("../config/database");

async function listByLead(leadId, search = "") {
  const where = ["lead_id = ?"];
  const params = [leadId];
  const q = String(search || "").trim();
  if (q) {
    where.push("message LIKE ?");
    params.push(`%${q}%`);
  }
  const [rows] = await pool.query(
    `SELECT * FROM conversation_messages WHERE ${where.join(" AND ")} ORDER BY created_at ASC`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    senderType: row.sender_type,
    message: row.message,
    createdAt: row.created_at,
  }));
}

async function listConversationLeads(dealershipId, search = "") {
  const where = ["l.dealership_id = ?"];
  const params = [dealershipId];
  const q = String(search || "").trim();
  if (q) {
    const like = `%${q}%`;
    where.push(
      `(l.id LIKE ?
        OR l.customer_name LIKE ?
        OR l.customer_phone LIKE ?
        OR l.vehicle LIKE ?
        OR EXISTS (
          SELECT 1 FROM conversation_messages cm
          WHERE cm.lead_id = l.id AND cm.message LIKE ?
        ))`
    );
    params.push(like, like, like, like, like);
  }
  const [rows] = await pool.query(
    `SELECT l.id, l.customer_name, l.status, l.on_lot, l.on_lot_at, l.updated_at,
      (SELECT message FROM conversation_messages cm
       WHERE cm.lead_id = l.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message
     FROM leads l
     WHERE ${where.join(" AND ")}
     ORDER BY l.on_lot DESC, l.updated_at DESC`,
    params
  );
  return rows.map((row) => ({
    leadId: row.id,
    customerName: row.customer_name,
    status: row.status,
    onLot: Boolean(Number(row.on_lot)),
    onLotAt: row.on_lot_at || null,
    onLotBadge: Number(row.on_lot) ? "Customer on lot" : "",
    lastMessage: row.last_message || "",
    updatedAt: row.updated_at,
  }));
}

async function createMessage({ leadId, senderType, message }) {
  const id = `msg_${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO conversation_messages (id, lead_id, sender_type, message)
     VALUES (?, ?, ?, ?)`,
    [id, leadId, senderType, message]
  );
  const [rows] = await pool.query(
    `SELECT * FROM conversation_messages WHERE id = ? LIMIT 1`,
    [id]
  );
  const row = rows[0];
  return {
    id: row.id,
    leadId: row.lead_id,
    senderType: row.sender_type,
    message: row.message,
    createdAt: row.created_at,
  };
}

module.exports = { listByLead, listConversationLeads, createMessage };
