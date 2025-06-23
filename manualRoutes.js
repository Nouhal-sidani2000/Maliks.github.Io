// 📁 manualRoutes.js
const express = require('express');
const router = express.Router(); // ✅ Define router before using it

router.get('/manual-invoices', async (req, res) => {
  const { branch_id } = req.query;

  if (!branch_id) {
    return res.status(400).json({ message: 'branch_id is required' });
  }

  try {
    const pool = req.app.get('db'); // Reuse DB pool from app
    const result = await pool.query(
      `SELECT id, invoice_number, client_name, date, amount, category
       FROM manual
       WHERE branch_id = $1
       ORDER BY date DESC`,
      [branch_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching manual invoices:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
