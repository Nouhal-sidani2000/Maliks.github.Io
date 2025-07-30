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

// ✅ Create Task
router.post('/', async (req, res) => {
  const {
    title,
    description,
    status,
    owner,
    start_date,
    due_date,
    urgency,
    assigned_by,
    assigned_to,
  } = req.body;

  if (!title || !status || !owner) {
    return res.status(400).json({ message: 'Missing required fields: title, status, or owner' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, owner, start_date, due_date, urgency, assigned_by, assigned_to, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [title, description, status, owner, start_date || null, due_date || null, urgency || null, assigned_by || null, assigned_to || null]
    );
    res.status(201).json(result.rows[0]); // Return created task
  } catch (err) {
    console.error('❌ Error creating task:', err.message);
    res.status(500).json({ message: 'Error creating task', error: err.message });
  }
});

// ✅ Get Tasks by Owner
router.get('/', async (req, res) => {
  const { owner } = req.query;
  if (!owner) return res.status(400).json({ message: 'Missing owner query parameter' });

  try {
    const result = await pool.query(
      'SELECT * FROM tasks WHERE owner = $1 ORDER BY created_at DESC',
      [owner]
    );
    res.json(result.rows); // Return array of tasks
  } catch (err) {
    console.error('❌ Error fetching tasks:', err.message);
    res.status(500).json({ message: 'Error fetching tasks', error: err.message });
  }
});

// ✅ Get All Tasks (for admin/head_of_department)
router.get('/all', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows); // Return array of all tasks
  } catch (err) {
    console.error('❌ Error fetching all tasks:', err.message);
    res.status(500).json({ message: 'Error fetching all tasks', error: err.message });
  }
});

// ✅ Update Task
router.put('/:id', async (req, res) => {
  const {
    title,
    description,
    status,
    start_date,
    due_date,
    urgency,
    assigned_by,
    assigned_to,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks SET
         title = $1,
         description = $2,
         status = $3,
         start_date = $4,
         due_date = $5,
         urgency = $6,
         assigned_by = $7,
         assigned_to = $8
       WHERE id = $9
       RETURNING *`,
      [
        title,
        description,
        status,
        start_date || null,
        due_date || null,
        urgency || null,
        assigned_by || null,
        assigned_to || null,
        req.params.id,
      ]
    );
    res.json(result.rows[0]); // Return updated task
  } catch (err) {
    console.error('❌ Error updating task:', err.message);
    res.status(500).json({ message: 'Error updating task', error: err.message });
  }
});

// ✅ Delete Task
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.sendStatus(204); // No content
  } catch (err) {
    console.error('❌ Error deleting task:', err.message);
    res.status(500).json({ message: 'Error deleting task', error: err.message });
  }
});

// ✅ Task Summary by Branch
router.get('/summary', async (req, res) => {
  const { start_date, end_date } = req.query;
  let query = 'SELECT owner AS branch, COUNT(*) AS task_count FROM tasks';
  const values = [];

  if (start_date && end_date) {
    query += ' WHERE start_date BETWEEN $1 AND $2';
    values.push(start_date, end_date);
  }

  query += ' GROUP BY owner ORDER BY task_count DESC';

  try {
    const result = await pool.query(query, values);
    res.json(result.rows); // Return summary array
  } catch (err) {
    console.error('❌ Error generating summary:', err.message);
    res.status(500).json({ message: 'Error generating summary', error: err.message });
  }
});

module.exports = router;
