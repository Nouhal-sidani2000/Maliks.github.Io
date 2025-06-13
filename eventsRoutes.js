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

// ✅ GET all events
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM events ORDER BY "start" ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ POST new event (restricted to head_of_department)
router.post('/', async (req, res) => {
  const { title, description, start, end } = req.body;
  const role = req.headers['user-role'];

  if (role !== 'head_of_department') {
    return res.status(403).json({ error: 'Only head of department can add events.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO events (title, description, "start", "end") VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, start, end]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error adding event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ PUT update event date (drag and drop)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { start } = req.body;

  try {
    const result = await pool.query(
      'UPDATE events SET "start" = $1 WHERE id = $2 RETURNING *',
      [start, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error updating event:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
