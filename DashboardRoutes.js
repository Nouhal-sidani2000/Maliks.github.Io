// ✅ BACKEND: dashboardRoutes.js
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

// ✅ Corporate Sales
router.get('/sales', async (req, res) => {
  const { period = 'month', start, end, branch_id } = req.query;
  if (!branch_id) return res.status(400).json({ message: 'branch_id is required' });
  try {
    const result = await pool.query(`
      SELECT type, SUM(amount) AS total
      FROM branch_corporate
      WHERE branch_id = $1 AND ${getDateCondition(period, start, end)}
      GROUP BY type
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving corporate sales', error: err.message });
  }
});

// ✅ Branch Sales
router.get('/branch-sales', async (req, res) => {
  const { period = 'month', start, end, branch_id } = req.query;
  if (!branch_id) return res.status(400).json({ message: 'branch_id is required' });
  try {
    const result = await pool.query(`
      SELECT category, SUM(amount) AS total
      FROM branch_sales
      WHERE branch_id = $1 AND ${getDateCondition(period, start, end)}
      GROUP BY category
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving branch sales', error: err.message });
  }
});

// ✅ Leads
router.get('/leads', async (req, res) => {
  const { period = 'month', start, end } = req.query;
  try {
    const result = await pool.query(`
      SELECT branch_id, SUM(leads_sent)::INT AS count
      FROM leads
      WHERE ${getDateCondition(period, start, end)}
      GROUP BY branch_id
      ORDER BY branch_id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving leads', error: err.message });
  }
});

// Add profit route if needed here

module.exports = router;
