const express = require('express');
const router = express.Router();

// ✅ Get all transfers or by status
router.get('/', async (req, res) => {
  const db = req.app.get('db');
  const status = req.query.status;

  try {
    const result = status
      ? await db.query('SELECT * FROM transfers WHERE status = $1 ORDER BY id DESC', [status])
      : await db.query('SELECT * FROM transfers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// ✅ Get distinct branches from users table (excluding current user branch)
router.get('/branches', async (req, res) => {
  const db = req.app.get('db');
  const exclude = req.query.exclude;

  try {
    const result = await db.query(
      'SELECT DISTINCT branch FROM users WHERE branch IS NOT NULL AND branch != $1',
      [exclude || '']
    );
    const branches = result.rows.map(r => r.branch);
    res.json(branches);
  } catch (err) {
    console.error('Failed to load branches:', err);
    res.status(500).json({ message: 'Failed to load branches', error: err.message });
  }
});

// ✅ Create new transfer request
router.post('/', async (req, res) => {
  const db = req.app.get('db');
  const {
    item_code,
    description,
    quantity,
    from_location,
    to_location,
    cost,
    status,
    notes
  } = req.body;

  try {
    await db.query(
      `INSERT INTO transfers 
        (item_code, description, quantity, from_location, to_location, cost, status, notes, creation_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)`,
      [item_code, description, quantity, from_location, to_location, cost, status, notes]
    );
    res.sendStatus(201);
  } catch (err) {
    console.error('Insert failed:', err);
    res.status(500).json({ message: 'Insert failed', error: err.message });
  }
});

// ✅ Update existing transfer request
router.put('/:id', async (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const {
    item_code,
    description,
    quantity,
    from_location,
    to_location,
    cost,
    status,
    notes
  } = req.body;

  try {
    await db.query(
      `UPDATE transfers SET 
        item_code=$1, description=$2, quantity=$3,
        from_location=$4, to_location=$5, cost=$6, 
        status=$7, notes=$8 WHERE id=$9`,
      [item_code, description, quantity, from_location, to_location, cost, status, notes, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error('Update failed:', err);
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

// ✅ Delete transfer request
router.delete('/:id', async (req, res) => {
  const db = req.app.get('db');
  try {
    await db.query('DELETE FROM transfers WHERE id = $1', [req.params.id]);
    res.sendStatus(200);
  } catch (err) {
    console.error('Delete failed:', err);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
});

module.exports = router;
