// manualRoutes.js
router.get('/manual-invoices', async (req, res) => {
  const { branch_id } = req.query;
  const query = `
    SELECT client_name, invoice_number, date, amount, category 
    FROM manual 
    WHERE branch_id = $1
  `;
  try {
    const result = await pool.query(query, [branch_id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch manual invoices.' });
  }
});
