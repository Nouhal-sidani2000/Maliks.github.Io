const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');
const { Pool } = require('pg');
require('dotenv').config();

const kanbanRoutes = require('./kanbanRoutes');
const commentRoutes = require('./commentRoutes');
const eventsRoutes = require('./eventsRoutes');
const DashboardRoutes = require('./DashboardRoutes');
const FeedRoutes = require('./FeedRoutes');
const TransferRoutes = require('./TransferRoutes');
const userRoutes = require('./users');
const manualRoutes = require('./manualRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

app.set('db', pool);

// ✅ CORS
app.use(cors({
  origin: 'https://iridescent-begonia-1b7fad.netlify.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// ✅ Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Log requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ✅ Register
app.post('/register', async (req, res) => {
  const { branch, email, password, role, branch_id } = req.body;
  try {
    if (!branch || !email || !password || !role || isNaN(parseInt(branch_id))) {
      return res.status(400).json({ message: 'Invalid input. All fields are required.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (branch, email, password, role, branch_id, created_on)
       VALUES ($1, LOWER($2), $3, $4, $5, NOW()) RETURNING *`,
      [branch, email, hashedPassword, role, parseInt(branch_id)]
    );
    res.status(201).json({ message: 'User registered', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Registration failed:', error);
    if (error.code === '23505') {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Registration failed', error: error.message });
    }
  }
});

// ✅ Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'User not found' });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        branch: user.branch,
        branch_id: user.branch_id,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ✅ Forgot Password: Send OTP
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'No user with that email' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await pool.query(
      'UPDATE users SET reset_otp = $1, reset_otp_expires = $2 WHERE LOWER(email) = LOWER($3)',
      [otp, expires, email]
    );

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Your Company" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is: ${otp}`,
    });

    res.json({ message: 'OTP sent to your email' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not send OTP' });
  }
});

// ✅ Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    if (user.reset_otp !== otp || new Date() > new Date(user.reset_otp_expires)) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = $1, reset_otp = NULL, reset_otp_expires = NULL WHERE LOWER(email) = LOWER($2)',
      [hashed, email]
    );

    res.json({ message: 'Password reset successful' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not reset password' });
  }
});

// ✅ Other Routes
app.use('/api/comments', commentRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/dashboard', DashboardRoutes);
app.use('/api/feed', FeedRoutes);
app.use('/api/transfers', TransferRoutes);
app.use('/api/users', userRoutes);
app.use('/api', manualRoutes);

// ✅ Health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ✅ 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
