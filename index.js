const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const kanbanRoutes = require('./kanbanRoutes');
const commentRoutes = require('./commentRoutes');
const eventsRoutes = require('./eventsRoutes');
const DashboardRoutes = require('./DashboardRoutes');
const FeedRoutes = require('./FeedRoutes');
const TransferRoutes = require('./TransferRoutes');
const userRoutes = require('./users');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ PostgreSQL DB Connection
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

// ✅ Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Log all incoming requests
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

// ✅ Auth: Register
app.post('/register', async (req, res) => {
  const { branch, email, password, role, branch_id } = req.body;
  try {
    if (!branch || !email || !password || !role || isNaN(parseInt(branch_id))) {
      return res.status(400).json({ message: 'Invalid input. All fields are required.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (branch, email, password, role, branch_id, created_on)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
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

// ✅ Auth: Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
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

// ✅ Routes
app.use('/api/comments', commentRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/dashboard', DashboardRoutes);
app.use('/api/feed', FeedRoutes);
app.use('/api/transfers', TransferRoutes);
app.use('/api/users', userRoutes);
app.use('/', kanbanRoutes); 

// ✅ Health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// ✅ Catch-All 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
