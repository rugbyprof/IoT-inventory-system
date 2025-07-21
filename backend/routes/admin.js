const express = require('express');
const db = require('../db');
const authenticateToken = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

// 🔍 Get pending requests
router.get('/pending-checkouts', authenticateToken, isAdmin, (req, res) => {
  const query = `
    SELECT c.id, u.username, u.email, comp.name AS component, c.quantity, c.checkout_date
    FROM checkouts c
    JOIN users u ON c.user_id = u.id
    JOIN components comp ON c.component_id = comp.id
    WHERE c.status = 'requested'
    ORDER BY c.checkout_date
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// ✅ Approve a checkout
router.post('/approve-checkout/:id', authenticateToken, isAdmin, (req, res) => {
  const checkoutId = req.params.id;

  const getInfo = `
    SELECT c.component_id, c.quantity, u.email, u.username, comp.name AS component_name
    FROM checkouts c
    JOIN users u ON c.user_id = u.id
    JOIN components comp ON c.component_id = comp.id
    WHERE c.id = ? AND c.status = 'requested'
  `;
  db.query(getInfo, [checkoutId], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: 'Request not found or already handled' });

    const { component_id, quantity, email, username, component_name } = results[0];

    db.query('SELECT quantity FROM components WHERE id = ?', [component_id], (err, res2) => {
      if (err || res2.length === 0 || res2[0].quantity < quantity)
        return res.status(400).json({ error: 'Insufficient stock' });

      db.query('UPDATE components SET quantity = quantity - ? WHERE id = ?', [quantity, component_id]);
      db.query('UPDATE checkouts SET status = "approved" WHERE id = ?', [checkoutId]);

      // Send approval email
      sendEmail({
        to: email,
        subject: `Request Approved – ${component_name}`,
        html: `<p>Hello ${username},<br>Your checkout request for <strong>${quantity} × ${component_name}</strong> has been <strong>approved</strong>.<br>You're good to go!</p>`
      });

      res.json({ message: 'Checkout approved and user notified' });
    });
  });
});

// ❌ Reject a checkout
router.post('/reject-checkout/:id', authenticateToken, isAdmin, (req, res) => {
  const checkoutId = req.params.id;
  const { reason } = req.body;

  const getInfo = `
    SELECT c.quantity, u.email, u.username, comp.name AS component_name
    FROM checkouts c
    JOIN users u ON c.user_id = u.id
    JOIN components comp ON c.component_id = comp.id
    WHERE c.id = ? AND c.status = 'requested'
  `;

  db.query(getInfo, [checkoutId], (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: 'Request not found or already handled' });

    const { email, username, component_name, quantity } = results[0];

    db.query(
      'UPDATE checkouts SET status = "rejected", rejection_reason = ? WHERE id = ?',
      [reason || 'No reason provided', checkoutId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Send rejection email
        sendEmail({
          to: email,
          subject: `Request Rejected – ${component_name}`,
          html: `<p>Hi ${username},<br>Your request for <strong>${quantity} × ${component_name}</strong> was <strong>rejected</strong>.<br><br><em>Reason:</em> ${reason}</p>`
        });

        res.json({ message: 'Checkout rejected and user notified' });
      }
    );
  });
});

// 📊 Get pending request count for dashboard
router.get('/pending-count', authenticateToken, isAdmin, (req, res) => {
  db.query(
    'SELECT COUNT(*) AS pending FROM checkouts WHERE status = "requested"',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ pending: results[0].pending });
    }
  );
});

module.exports = router;