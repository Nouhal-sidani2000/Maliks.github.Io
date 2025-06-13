const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post('/', async (req, res) => {
  const { fullName, email, message } = req.body;

  try {
    // Save to DB
    await pool.query(
      'INSERT INTO comments (full_name, email, message, submitted_at) VALUES ($1, $2, $3, NOW())',
      [fullName, email, message]
    );

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'nuhalsidani@gmail.com',
      subject: '📬 New Feedback Submission',
      text: `Name: ${fullName}\nEmail: ${email}\nMessage: ${message}`
    });

    res.status(200).json({ message: 'Comment submitted successfully!' });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ message: 'Submission failed', error: err.message });
  }
});

module.exports = router;
