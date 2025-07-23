const express = require('express');
const db = require('../db');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

// ✅ Add new component (authenticated users)
router.post('/add', authenticateToken, (req, res) => {
  const { name, category, quantity } = req.body;

  const query = `INSERT INTO components (name, category, quantity) VALUES (?, ?, ?)`;
  db.run(query, [name, category, quantity], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Component added', id: this.lastID });
  });
});

// 📋 List all components (public)
router.get('/', (req, res) => {
  db.all('SELECT * FROM components', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(rows);
  });
});

// 📊 Dashboard view (authenticated)
router.get('/dashboard', authenticateToken, (req, res) => {
  db.all('SELECT * FROM components ORDER BY category, name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(rows);
  });
});

module.exports = router;