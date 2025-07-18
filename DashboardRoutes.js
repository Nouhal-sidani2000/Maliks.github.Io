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
      // Monday to Sunday of current week
      return `${column}::date BETWEEN date_trunc('week', CURRENT_DATE)::date 
              AND (date_trunc('week', CURRENT_DATE) + interval '6 days')::date`;
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
// ✅ Branch sales trend (last 7 days)
router.get('/branch-sales-trend', async (req, res) => {
  const { branch_id } = req.query;
  if (!branch_id) return res.status(400).json({ message: 'branch_id is required' });

  try {
    const result = await pool.query(`
      SELECT date::date AS sales_date, SUM(amount) AS total
      FROM sales_data
      WHERE branch_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY sales_date
      ORDER BY sales_date
    `, [branch_id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error in /branch-sales-trend:', err);
    res.status(500).json({ message: 'Error retrieving branch sales trend', error: err.message });
  }
});
// ✅ Monthly sales total + target for progress bar
router.get('/branch-sales-target-progress', async (req, res) => {
  const { branch_id } = req.query;
  if (!branch_id) {
    return res.status(400).json({ message: 'branch_id is required' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(s.total_sales, 0) AS total_sales,
        COALESCE(t.target_amount, 10000) AS target_amount
      FROM 
        (SELECT SUM(amount) AS total_sales
         FROM sales_data
         WHERE branch_id = $1
           AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)) s,
        (
          SELECT target_amount
          FROM sales_target
          WHERE branch_id = $1
            AND DATE_TRUNC('month', month) = DATE_TRUNC('month', CURRENT_DATE)
          ORDER BY month DESC
          LIMIT 1
        ) t
    `, [branch_id]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error in /branch-sales-target-progress:', err);
    res.status(500).json({
      message: 'Error retrieving target progress',
      error: err.message,
    });
  }
});


router.post('/update-sales-target', async (req, res) => {
  const { branch_id, target_amount } = req.body;
  if (!branch_id || target_amount == null) {
    return res.status(400).json({ message: 'branch_id and target_amount are required' });
  }

  try {
    const month = new Date();
    month.setDate(1); // First of current month
    const formattedMonth = month.toISOString().split('T')[0];

    await pool.query(`
      INSERT INTO sales_target (branch_id, month, target_amount)
      VALUES ($1, $2, $3)
      ON CONFLICT (branch_id, month)
      DO UPDATE SET target_amount = EXCLUDED.target_amount
    `, [branch_id, formattedMonth, target_amount]);

    res.json({ message: 'Monthly target updated successfully' });
  } catch (err) {
    console.error('Error in /update-sales-target:', err);
    res.status(500).json({ message: 'Error updating target', error: err.message });
  }
});

module.exports = router;
