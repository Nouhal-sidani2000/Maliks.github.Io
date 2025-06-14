const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

function getDateCondition(period, start, end) {
  switch (period) {
    case 'week':
      return "created_at >= CURRENT_DATE - INTERVAL '7 days'";
    case 'month':
      return "DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)";
    case 'year':
      return "EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
    case 'custom':
      if (start && end) {
        return `created_at::date BETWEEN '${start}' AND '${end}'`;
      } else if (start) {
        return `created_at::date >= '${start}'`;
      } else if (end) {
        return `created_at::date <= '${end}'`;
      } else {
        return "TRUE";
      }
    default:
      return "TRUE";
  }
}

// ✅ GET /api/dashboard/sales
router.get('/sales', async (req, res) => {
  const { period = 'month', start, end } = req.query;
  const branchId = req.user?.branch_id;

  if (!branchId) return res.status(403).json({ message: 'Unauthorized' });

  try {
    const result = await pool.query(`
      SELECT "Type" AS category, SUM(amount)::FLOAT AS total
      FROM Branch_Corporate
      WHERE branch_id = $1 AND ${getDateCondition(period, start, end)}
      GROUP BY "Type"
    `, [branchId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error retrieving branch sales:", err);
    res.status(500).json({ message: 'Error retrieving sales' });
  }
});

// ✅ GET /api/dashboard/leads
router.get('/leads', async (req, res) => {
  const { period = 'month', start, end } = req.query;

  try {
    const result = await pool.query(`
      SELECT branch_id, SUM(leads_sent)::INT AS count
      FROM leads
      WHERE ${getDateCondition(period, start, end)}
      GROUP BY branch_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error retrieving leads:", err);
    res.status(500).json({ message: 'Error retrieving leads' });
  }
});

module.exports = router;
