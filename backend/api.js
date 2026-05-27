const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize Database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        login BIGINT NOT NULL,
        type VARCHAR(10) NOT NULL,
        expiry BIGINT DEFAULT 0,
        trial_h BIGINT DEFAULT 24,
        sub_amt DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        admin_email VARCHAR(255),
        action TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_clients_code ON clients(code);
      CREATE INDEX IF NOT EXISTS idx_clients_login ON clients(login);
    `);
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ DB init error:', err);
  }
};

// Middleware: Verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// ==================== AUTH ====================

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: admin.id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO admins (email, password_hash) VALUES ($1, $2)', [email, hash]);
    res.json({ message: 'Admin created' });
  } catch (err) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// ==================== CLIENTS ====================

app.get('/api/clients', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients', verifyToken, async (req, res) => {
  const { name, email, login, type, expiry, trial_h, sub_amt } = req.body;
  const code = 'MXV11-' + Math.random().toString(36).substring(2, 6).toUpperCase();

  try {
    await pool.query(
      'INSERT INTO clients (code, email, name, login, type, expiry, trial_h, sub_amt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [code, email, name, login, type, expiry || 0, trial_h || 24, sub_amt || 0]
    );
    
    await pool.query(
      'INSERT INTO activity_log (admin_email, action) VALUES ($1, $2)',
      [req.user.email, `Added client "${name}" (MT5: ${login})`]
    );
    
    res.json({ code, message: 'Client created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:code', verifyToken, async (req, res) => {
  const { name, email, login, type, expiry, sub_amt } = req.body;

  try {
    await pool.query(
      'UPDATE clients SET name=$1, email=$2, login=$3, type=$4, expiry=$5, sub_amt=$6, updated_at=NOW() WHERE code=$7',
      [name, email, login, type, expiry, sub_amt, req.params.code]
    );
    res.json({ message: 'Client updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:code', verifyToken, async (req, res) => {
  try {
    const client = await pool.query('SELECT name FROM clients WHERE code=$1', [req.params.code]);
    await pool.query('DELETE FROM clients WHERE code=$1', [req.params.code]);
    await pool.query(
      'INSERT INTO activity_log (admin_email, action) VALUES ($1, $2)',
      [req.user.email, `Deleted client "${client.rows[0]?.name}"`]
    );
    res.json({ message: 'Client deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SYNC (For MT5 EA) ====================

app.get('/api/sync/clients', async (req, res) => {
  try {
    const result = await pool.query('SELECT code, email, name, login, type, expiry, trial_h, sub_amt FROM clients');
    const csv = result.rows.map(c =>
      [c.code, c.email, c.name, c.login, c.type, c.expiry, c.trial_h, c.sub_amt].join(',')
    ).join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="MX_Clients.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sync/check/:login', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM clients WHERE login=$1', [req.params.login]);
    if (result.rows.length === 0) return res.json({ licensed: false });
    
    const client = result.rows[0];
    const now = Math.floor(Date.now() / 1000);
    const licensed = client.expiry === 0 || client.expiry > now;
    
    res.json({
      licensed,
      name: client.name,
      expiry: client.expiry,
      trial_h: client.trial_h
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== ANALYTICS ====================

app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM clients');
    const monthly = await pool.query('SELECT COUNT(*) FROM clients WHERE type=$1', ['1']);
    const trial = await pool.query('SELECT COUNT(*) FROM clients WHERE type=$1', ['0']);
    const expiring = await pool.query(
      'SELECT COUNT(*) FROM clients WHERE expiry > 0 AND expiry < $1 AND expiry > $2',
      [Math.floor(Date.now() / 1000) + 7 * 86400, Math.floor(Date.now() / 1000)]
    );

    res.json({
      total: total.rows[0].count,
      monthly: monthly.rows[0].count,
      trial: trial.rows[0].count,
      expiring: expiring.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/logs', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== INIT & START ====================

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ API running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
