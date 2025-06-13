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

// Helper: Date condition SQL
function getDateCondition(period) {
  switch (period) {
    case 'today':
      return "created_at::date = CURRENT_DATE";
    case 'week':
      return "created_at >= CURRENT_DATE - INTERVAL '7 days'";
    case 'year':
      return "EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)";
    default:
      return "TRUE";
  }
}

// ✅ GET /api/dashboard/sales?period=week
router.get('/sales', async (req, res) => {
  const period = req.query.period || 'week';
  try {
    const result = await pool.query(`
      SELECT category, SUM(amount)::FLOAT AS total
      FROM sales_data
      WHERE ${getDateCondition(period)}
      GROUP BY category
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error retrieving sales:", err);
    res.status(500).json({ message: 'Error retrieving sales' });
  }
});

// ✅ GET /api/dashboard/leads?period=week
router.get('/leads', async (req, res) => {
  const period = req.query.period || 'week';
  try {
    const result = await pool.query(`
      SELECT branch, COUNT(*)::INT AS count
      FROM leads
      WHERE ${getDateCondition(period)}
      GROUP BY branch
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error retrieving leads:", err);
    res.status(500).json({ message: 'Error retrieving leads' });
  }
});

// ✅ GET /api/dashboard/profit?period=week
router.get('/profit', async (req, res) => {
  const period = req.query.period || 'week';
  try {
    const result = await pool.query(`
      SELECT SUM(amount)::FLOAT AS total
      FROM profit
      WHERE ${getDateCondition(period)}
    `);
    res.json(result.rows[0] || { total: 0 });
  } catch (err) {
    console.error("❌ Error retrieving profit:", err);
    res.status(500).json({ message: 'Error retrieving profit' });
  }
});

module.exports = router;
