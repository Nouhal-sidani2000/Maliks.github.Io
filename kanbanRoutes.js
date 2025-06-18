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
  const {
    title,
    description,
    status,
    owner,         // branch name
    starr_date,    // correct spelling from your DB
    due_date,
    label,
    color,
    branch_id
  } = req.body;

  if (!title || !status || !owner || !branch_id) {
    return res.status(400).json({ message: 'Missing required fields: title, status, owner, or branch_id' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, status, owner, starr_date, due_date, label, color, branch_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [title, description, status, owner, starr_date || null, due_date || null, label || null, color || null, branch_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error creating task:', err.message);
    res.status(500).json({ message: 'Error creating task', error: err.message });
  }
});

// ✅ Get All Tasks by Branch Name
router.get('/tasks', async (req, res) => {
  const { owner } = req.query; // this is the branch name
  if (!owner) return res.status(400).json({ message: 'Missing owner (branch) query parameter' });

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
  const {
    title,
    description,
    status,
    starr_date,
    due_date,
    label,
    color,
    branch_id,
    owner
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks SET
         title = $1,
         description = $2,
         status = $3,
         starr_date = $4,
         due_date = $5,
         label = $6,
         color = $7,
         branch_id = $8,
         owner = $9
       WHERE id = $10 RETURNING *`,
      [title, description, status, starr_date || null, due_date || null, label || null, color || null, branch_id, owner, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error updating task:', err.message);
    res.status(500).json({ message: 'Error updating task', error: err.message });
  }
});

// ✅ Delete Task
router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('❌ Error deleting task:', err.message);
    res.status(500).json({ message: 'Error deleting task', error: err.message });
  }
});

// ✅ Filter Tasks
router.get('/tasks/filter', async (req, res) => {
  const { owner, title, description, starr_date, due_date, label, status } = req.query;
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
  addFilter(starr_date, 'starr_date', '=');
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

// ✅ Get Branch List
router.get('/users/branches', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT branch_id, owner AS branch_name FROM users WHERE branch_id IS NOT NULL ORDER BY branch_name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching branches:', err.message);
    res.status(500).json({ message: 'Failed to fetch branches' });
  }
});

module.exports = router;
