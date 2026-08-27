const { randomUUID } = require("crypto");
const pool = require("../config/database");

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.lead_id || null,
    salespersonId: row.salesperson_id,
    dealershipId: row.dealership_id || null,
    dealership: row.dealership_name || null,
    customerName: row.customer_name,
    vehicle: row.vehicle || "",
    dealAmount: Number(row.deal_amount) || 0,
    saleDate: row.sale_date,
    commissionRate: Number(row.commission_rate) || 0,
    baseCommission: Number(row.base_commission) || 0,
    bonus: Number(row.bonus) || 0,
    totalCommission: Number(row.total_commission) || 0,
    commissionStatus: row.commission_status,
    paymentMethod: row.payment_method || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_LIST = `
  SELECT s.*, d.name AS dealership_name
  FROM sold_deals s
  LEFT JOIN dealerships d ON d.id = s.dealership_id
`;

async function findById(id) {
  const [rows] = await pool.query(`${SELECT_LIST} WHERE s.id = ? LIMIT 1`, [id]);
  return mapRow(rows[0]);
}

async function listBySalesperson(
  salespersonId,
  { page = 1, limit = 10 } = {}
) {
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM sold_deals WHERE salesperson_id = ?`,
    [salespersonId]
  );
  const total = Number(countRows[0]?.total) || 0;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const offset = (safePage - 1) * safeLimit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safeLimit);

  const [rows] = await pool.query(
    `${SELECT_LIST} WHERE s.salesperson_id = ?
     ORDER BY s.sale_date DESC LIMIT ? OFFSET ?`,
    [salespersonId, safeLimit, offset]
  );

  return {
    deals: rows.map(mapRow),
    pagination: { page: safePage, limit: safeLimit, total, totalPages },
  };
}

async function getCommissionSummary(salespersonId) {
  const [rows] = await pool.query(
    `SELECT
      COUNT(*) AS sales_count,
      COALESCE(SUM(deal_amount), 0) AS total_sales,
      COALESCE(SUM(total_commission), 0) AS total_commission,
      COALESCE(SUM(CASE WHEN commission_status = 'PENDING' THEN total_commission ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN commission_status = 'PAID' THEN total_commission ELSE 0 END), 0) AS paid,
      COALESCE(AVG(deal_amount), 0) AS avg_deal
     FROM sold_deals
     WHERE salesperson_id = ?
       AND YEAR(sale_date) = YEAR(CURDATE())
       AND MONTH(sale_date) = MONTH(CURDATE())`,
    [salespersonId]
  );
  const row = rows[0] || {};
  return {
    currentMonthSales: Number(row.sales_count) || 0,
    currentMonthCommission: Number(row.total_commission) || 0,
    pendingCommission: Number(row.pending) || 0,
    paidCommission: Number(row.paid) || 0,
    averageDealValue: Number(row.avg_deal) || 0,
  };
}

async function create(data) {
  const id = data.id || `deal_${randomUUID().slice(0, 8)}`;
  const dealAmount = Number(data.dealAmount) || 0;
  const rate = Number(data.commissionRate) || 2.5;
  const bonus = Number(data.bonus) || 500;
  const base = Math.round((dealAmount * rate) / 100);
  const total = base + bonus;

  await pool.query(
    `INSERT INTO sold_deals
      (id, lead_id, salesperson_id, dealership_id, customer_name, vehicle, deal_amount,
       sale_date, commission_rate, base_commission, bonus, total_commission,
       commission_status, payment_method)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.leadId || null,
      data.salespersonId,
      data.dealershipId || null,
      data.customerName,
      data.vehicle || null,
      dealAmount,
      data.saleDate || new Date().toISOString().slice(0, 10),
      rate,
      base,
      bonus,
      total,
      data.commissionStatus || "PENDING",
      data.paymentMethod || null,
    ]
  );
  return findById(id);
}

async function updateCommissionStatus(id, status) {
  await pool.query(`UPDATE sold_deals SET commission_status = ? WHERE id = ?`, [
    status,
    id,
  ]);
  return findById(id);
}

module.exports = {
  findById,
  listBySalesperson,
  getCommissionSummary,
  create,
  updateCommissionStatus,
};
