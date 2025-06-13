// backend/users.js
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

router.get("/branches", async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT id, branch FROM users WHERE branch IS NOT NULL");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Failed to fetch branches:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
