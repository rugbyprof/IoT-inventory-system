const express = require('express');
const db = require('../db');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// ✅ Add a new component (protected)
router.post('/add', authenticateToken, (req, res) => {
  const { name, category, quantity } = req.body;
  const query = 'INSERT INTO components (name, category, quantity) VALUES (?, ?, ?)';
  db.query(query, [name, category, quantity], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Component added successfully' });
  });
});

// 📋 Get all components (public)
router.get('/', (req, res) => {
  db.query('SELECT * FROM components', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// 📊 Dashboard listing (authenticated)
router.get('/dashboard', authenticateToken, (req, res) => {
  db.query('SELECT * FROM components ORDER BY category, name', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

module.exports = router;