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

// 🔁 Helper to build SQL condition based on period
function getDateCondition(period, start, end) {
  switch (period) {
    case 'today':
      return "created_at::date = CURRENT_DATE";
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

// ✅ GET /api/dashboard/sales?period=month&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/sales', async (req, res) => {
  const { period = 'month', start, end } = req.query;
  try {
    const result = await pool.query(`
      SELECT category, SUM(amount)::FLOAT AS total
      FROM sales_data
      WHERE ${getDateCondition(period, start, end)}
      GROUP BY category
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error retrieving sales:", err);
    res.status(500).json({ message: 'Error retrieving sales' });
  }
});

// ✅ GET /api/dashboard/leads?period=month&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/leads', async (req, res) => {
  const { period = 'month', start, end } = req.query;
  try {
    const result = await pool.query(`
      SELECT branch, COUNT(*)::INT AS count
      FROM leads
      WHERE ${getDateCondition(period, start, end)}
      GROUP BY branch
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error retrieving leads:", err);
    res.status(500).json({ message: 'Error retrieving leads' });
  }
});

// ✅ GET /api/dashboard/profit?period=month&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/profit', async (req, res) => {
  const { period = 'month', start, end } = req.query;
  try {
    const result = await pool.query(`
      SELECT SUM(amount)::FLOAT AS total
      FROM profit
      WHERE ${getDateCondition(period, start, end)}
    `);
    res.json(result.rows[0] || { total: 0 });
  } catch (err) {
    console.error("❌ Error retrieving profit:", err);
    res.status(500).json({ message: 'Error retrieving profit' });
  }
});

module.exports = router;
