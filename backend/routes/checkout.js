const express = require('express');
const db = require('../db');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.post('/', authenticate, (req, res) => {
  const { component_id, quantity } = req.body;
  const user_id = req.user.user_id;
  db.query(
    `INSERT INTO checkouts (user_id, component_id, quantity, status)
     VALUES (?, ?, ?, 'requested')`,
    [user_id, component_id, quantity],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Checkout request submitted' });
    }
  );
});

router.get('/my-requests', authenticate, (req, res) => {
  const uid = req.user.user_id;
  db.query(
    `SELECT c.id, comp.name AS component, c.quantity, c.status, c.rejection_reason, c.checkout_date
     FROM checkouts c
     JOIN components comp ON comp.id = c.component_id
     WHERE c.user_id = ?
     ORDER BY c.checkout_date DESC`,
    [uid],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

module.exports = router;