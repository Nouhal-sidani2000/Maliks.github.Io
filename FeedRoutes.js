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

// ✅ Create a post (admin only)
router.post('/posts', async (req, res) => {
  const { username, text, image, role } = req.body;
  if (role !== 'head_of_department') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const result = await pool.query(
      'INSERT INTO posts (username, text, image, date, likes) VALUES ($1, $2, $3, NOW(), 0) RETURNING *',
      [username, text, image]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
});

// ✅ Get all posts
router.get('/posts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch posts', error: err.message });
  }
});

// ✅ Like a post
router.post('/posts/:id/like', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = $1', [id]);
    res.status(200).json({ message: 'Liked' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to like post', error: err.message });
  }
});

// ✅ Edit a post (admin only)
router.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { text, image, role } = req.body;
  if (role !== 'head_of_department') return res.status(403).json({ message: 'Unauthorized' });

  try {
    const result = await pool.query(
      'UPDATE posts SET text = $1, image = $2 WHERE id = $3 RETURNING *',
      [text, image, id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Failed to edit post', error: err.message });
  }
});

// ✅ Delete a post (admin only)
router.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== 'head_of_department') {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    res.status(200).json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete post', error: err.message });
  }
});

// ✅ Add story (admin only)
router.post('/stories', async (req, res) => {
  const { image, role } = req.body;
  if (role !== 'head_of_department') return res.status(403).json({ message: 'Unauthorized' });

  try {
    await pool.query('INSERT INTO stories (image, created_at) VALUES ($1, NOW())', [image]);
    res.status(201).json({ message: 'Story added' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add story', error: err.message });
  }
});

// ✅ Get active stories (24h)
router.get('/stories', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM stories WHERE created_at > NOW() - INTERVAL '24 hours'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch stories', error: err.message });
  }
});

// ✅ Clean up expired stories
router.delete('/stories/cleanup', async (req, res) => {
  try {
    await pool.query("DELETE FROM stories WHERE created_at <= NOW() - INTERVAL '24 hours'");
    res.json({ message: 'Old stories cleaned up' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cleanup stories', error: err.message });
  }
});

module.exports = router;
