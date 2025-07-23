const express = require('express');
const db = require('../db');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.post('/add', authenticate, (req, res) => {
  const { name, category, quantity } = req.body;
  db.query(
    'INSERT INTO components (name, category, quantity) VALUES (?, ?, ?)',
    [name, category, quantity],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Component added successfully' });
    }
  );
});

router.get('/', (req, res) =>
  db.query('SELECT * FROM components', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  })
);

router.get('/dashboard', authenticate, (req, res) =>
  db.query(
    'SELECT * FROM components ORDER BY category, name',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  )
);

module.exports = router;