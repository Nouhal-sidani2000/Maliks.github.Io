const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
require('dotenv').config();

// DB Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

// ✅ Create Task
router.post('/tasks', async (req, res) => {
  const { title, description, status, owner, start_date, due_date, label, color } = req.body;
  if (!title || !status || !owner) {
    return res.status(400).json({ message: 'Missing required fields: title, status, or owner' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, owner, start_date, due_date, label, color, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [title, description, status, owner, start_date || null, due_date || null, label || null, color || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating task:', err.message);
    res.status(500).json({ message: 'Error creating task', error: err.message });
  }
});

// ✅ Get All Tasks by Owner
router.get('/tasks', async (req, res) => {
  const { owner } = req.query;
  if (!owner) return res.status(400).json({ message: 'Missing owner query parameter' });

  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE owner = $1 ORDER BY created_at DESC',
      [owner]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching tasks:', err.message);
    res.status(500).json({ message: 'Error fetching tasks', error: err.message });
  }
});

// ✅ Update Task
router.put('/tasks/:id', async (req, res) => {
  const { title, description, status, start_date, due_date, label, color } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks SET
         title = $1,
         description = $2,
         status = $3,
         start_date = $4,
         due_date = $5,
         label = $6,
         color = $7
       WHERE id = $8 RETURNING *`,
      [title, description, status, start_date || null, due_date || null, label || null, color || null, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating task:', err.message);
    res.status(500).json({ message: 'Error updating task', error: err.message });
  }
});

// ✅ Filter Tasks by Fields
router.get('/tasks/filter', async (req, res) => {
  const { owner, title, description, start_date, due_date, label, status } = req.query;
  if (!owner) return res.status(400).json({ message: 'Missing owner query parameter' });

  let query = 'SELECT * FROM tasks WHERE owner = $1';
  const values = [owner];
  let i = 2;

  const addFilter = (field, sqlField, operator = 'ILIKE') => {
    if (field?.trim()) {
      query += ` AND ${sqlField} ${operator} $${i}`;
      values.push(operator === '=' ? field : `%${field}%`);
      i++;
    }
  };

  addFilter(title, 'title');
  addFilter(description, 'description');
  addFilter(label, 'label');
  addFilter(start_date, 'start_date', '=');
  addFilter(due_date, 'due_date', '=');
  addFilter(status, 'status', '=');

  query += ' ORDER BY created_at DESC';

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error filtering tasks:', err.message);
    res.status(500).json({ message: 'Error filtering tasks', error: err.message });
  }
});

module.exports = router;
