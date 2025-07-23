const express = require('express');
const db = require('../db');
const authenticate = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

router.get('/pending-checkouts', authenticate, isAdmin, (req, res) => {
  db.query(
    `SELECT c.id, u.username, u.email, comp.name AS component, c.quantity, c.checkout_date
     FROM checkouts c
     JOIN users u ON u.id = c.user_id
     JOIN components comp ON comp.id = c.component_id
     WHERE c.status = 'requested'
     ORDER BY c.checkout_date`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

router.post('/approve-checkout/:id', authenticate, isAdmin, (req, res) => {
  const cid = req.params.id;
  db.query(
    `SELECT c.component_id, c.quantity, u.email, u.username, comp.name AS component_name
     FROM checkouts c
     JOIN users u ON u.id = c.user_id
     JOIN components comp ON comp.id = c.component_id
     WHERE c.id = ? AND c.status = 'requested'`,
    [cid],
    (err, rows) => {
      if (err || rows.length === 0)
        return res.status(404).json({ error: 'Request not found' });
      const { component_id, quantity, email, username, component_name } = rows[0];
      db.query(
        'SELECT quantity FROM components WHERE id = ?',
        [component_id],
        (e2, compRows) => {
          if (e2 || compRows.length === 0 || compRows[0].quantity < quantity)
            return res.status(400).json({ error: 'Insufficient stock' });
          db.query(
            'UPDATE components SET quantity = quantity - ? WHERE id = ?',
            [quantity, component_id]
          );
          db.query(
            'UPDATE checkouts SET status = "approved" WHERE id = ?',
            [cid]
          );
          sendEmail({
            to: email,
            subject: `Approved: ${component_name}`,
            html: `<p>Hello ${username}, your request for ${quantity}×${component_name} has been approved.</p>`
          });
          res.json({ message: 'Approved and notified' });
        }
      );
    }
  );
});

router.post('/reject-checkout/:id', authenticate, isAdmin, (req, res) => {
  const cid = req.params.id;
  const reason = req.body.reason || 'No reason provided';
  db.query(
    `SELECT c.quantity, u.email, u.username, comp.name AS component_name
     FROM checkouts c
     JOIN users u ON u.id = c.user_id
     JOIN components comp ON comp.id = c.component_id
     WHERE c.id = ? AND c.status = 'requested'`,
    [cid],
    (err, rows) => {
      if (err || rows.length === 0)
        return res.status(404).json({ error: 'Request not found' });
      const { quantity, email, username, component_name } = rows[0];
      db.query(
        'UPDATE checkouts SET status = "rejected", rejection_reason = ? WHERE id = ?',
        [reason, cid],
        err2 => {
          if (err2) return res.status(500).json({ error: err2.message });
          sendEmail({
            to: email,
            subject: `Rejected: ${component_name}`,
            html: `<p>Hi ${username}, your request for ${quantity}×${component_name} was rejected—Reason: ${reason}</p>`
          });
          res.json({ message: 'Rejected and notified' });
        }
      );
    }
  );
});

router.get('/pending-count', authenticate, isAdmin, (req, res) => {
  db.query(
    'SELECT COUNT(*) AS pending FROM checkouts WHERE status = "requested"',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ pending: rows[0].pending });
    }
  );
});

module.exports = router;