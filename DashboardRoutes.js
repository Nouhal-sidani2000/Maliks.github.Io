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

// ✅ Helper for dynamic date filtering
function getDateCondition(period, start, end, column = 'created_at') {
  switch (period) {
    case 'week':
      return `${column} >= CURRENT_DATE - INTERVAL '7 days'`;
    case 'month':
      return `DATE_TRUNC('month', ${column}) = DATE_TRUNC('month', CURRENT_DATE)`;
    case 'year':
      return `EXTRACT(YEAR FROM ${column}) = EXTRACT(YEAR FROM CURRENT_DATE)`;
    case 'custom':
      if (start && end) {
        return `${column}::date BETWEEN '${start}' AND '${end}'`;
      } else if (start) {
        return `${column}::date >= '${start}'`;
      } else if (end) {
        return `${column}::date <= '${end}'`;
      } else {
        return "TRUE";
      }
    default:
      return "TRUE";
  }
}

// ✅ Corporate Sales (by type from branch_corporate)
router.get('/sales', async (req, res) => {
  const { period = 'month', start, end, branch_id } = req.query;
  if (!branch_id) return res.status(400).json({ message: 'branch_id is required' });
  try {
    const result = await pool.query(`
      SELECT type, SUM(amount) AS total
      FROM branch_corporate
      WHERE branch_id = $1 AND ${getDateCondition(period, start, end, 'date')}
      GROUP BY type
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /sales route:', err);
    res.status(500).json({ message: 'Error retrieving corporate sales', error: err.message });
  }
});

// ✅ Branch Sales (by category from sales_data)
router.get('/branch-sales', async (req, res) => {
  const { period = 'month', start, end, branch_id } = req.query;
  if (!branch_id) return res.status(400).json({ message: 'branch_id is required' });
  try {
    const result = await pool.query(`
      SELECT category, SUM(amount) AS total
      FROM sales_data
      WHERE branch_id = $1 AND ${getDateCondition(period, start, end, 'date')}
      GROUP BY category
    `, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /branch-sales route:', err);
    res.status(500).json({ message: 'Error retrieving branch sales', error: err.message });
  }
});

// ✅ Leads (from leads table, using 'date' column)
router.get('/leads', async (req, res) => {
  const { period = 'month', start, end } = req.query;
  try {
    const dateCondition = getDateCondition(period, start, end, 'date');
    const result = await pool.query(`
      SELECT branch_id, COALESCE(SUM(leads_sent), 0)::INT AS count
      FROM leads
      WHERE ${dateCondition}
      GROUP BY branch_id
      ORDER BY branch_id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in /leads route:', err);
    res.status(500).json({ message: 'Error retrieving leads', error: err.message });
  }
});

// Add more routes like /profit if needed

module.exports = router;
