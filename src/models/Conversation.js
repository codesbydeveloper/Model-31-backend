const { randomUUID } = require("crypto");
const pool = require("../config/database");

async function listByLead(leadId) {
  const [rows] = await pool.query(
    `SELECT * FROM conversation_messages WHERE lead_id = ? ORDER BY created_at ASC`,
    [leadId]
  );
  return rows.map((row) => ({
    id: row.id,
    leadId: row.lead_id,
    senderType: row.sender_type,
    message: row.message,
    createdAt: row.created_at,
  }));
}

async function listConversationLeads(dealershipId) {
  const [rows] = await pool.query(
    `SELECT l.id, l.customer_name, l.status, l.updated_at,
      (SELECT message FROM conversation_messages cm
       WHERE cm.lead_id = l.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message
     FROM leads l
     WHERE l.dealership_id = ?
     ORDER BY l.updated_at DESC`,
    [dealershipId]
  );
  return rows.map((row) => ({
    leadId: row.id,
    customerName: row.customer_name,
    status: row.status,
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
