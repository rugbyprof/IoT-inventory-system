const express = require('express');
const db = require('../db2');
const authenticateToken = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const sendEmail = require('../utils/sendEmail');
const router = express.Router();

// 🔍 View pending requests
router.get('/pending-checkouts', authenticateToken, isAdmin, (req, res) => {
  const query = `
    SELECT c.id, u.username, u.email, comp.name AS component, c.quantity, c.checkout_date
    FROM checkouts c
    JOIN users u ON c.user_id = u.id
    JOIN components comp ON c.component_id = comp.id
    WHERE c.status = 'requested'
    ORDER BY c.checkout_date
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(rows);
  });
});

// ✅ Approve a checkout
router.post('/approve-checkout/:id', authenticateToken, isAdmin, (req, res) => {
  const checkoutId = req.params.id;

  const infoQuery = `
    SELECT c.component_id, c.quantity, u.email, u.username, comp.name AS component_name
    FROM checkouts c
    JOIN users u ON c.user_id = u.id
    JOIN components comp ON c.component_id = comp.id
    WHERE c.id = ? AND c.status = 'requested'
  `;

  db.get(infoQuery, [checkoutId], (err, info) => {
    if (err || !info)
      return res.status(404).json({ error: 'Request not found or already handled' });

    const { component_id, quantity, email, username, component_name } = info;

    db.get('SELECT quantity FROM components WHERE id = ?', [component_id], (err, comp) => {
      if (err || !comp || comp.quantity < quantity)
        return res.status(400).json({ error: 'Insufficient stock' });

      db.serialize(() => {
        db.run('UPDATE components SET quantity = quantity - ? WHERE id = ?', [quantity, component_id]);
        db.run('UPDATE checkouts SET status = "approved" WHERE id = ?', [checkoutId]);

        sendEmail({
          to: email,
          subject: `Request Approved – ${component_name}`,
          html: `<p>Hello ${username},<br>Your checkout request for <strong>${quantity} × ${component_name}</strong> has been <strong>approved</strong>.</p>`
        });

        res.json({ message: 'Checkout approved and user notified' });
      });
    });
  });
});

// ❌ Reject a checkout
router.post('/reject-checkout/:id', authenticateToken, isAdmin, (req, res) => {
  const checkoutId = req.params.id;
  const { reason } = req.body;

  const infoQuery = `
    SELECT c.quantity, u.email, u.username, comp.name AS component_name
    FROM checkouts c
    JOIN users u ON c.user_id = u.id
    JOIN components comp ON c.component_id = comp.id
    WHERE c.id = ? AND c.status = 'requested'
  `;

  db.get(infoQuery, [checkoutId], (err, info) => {
    if (err || !info)
      return res.status(404).json({ error: 'Request not found or already handled' });

    const { email, username, component_name, quantity } = info;

    db.run(
      'UPDATE checkouts SET status = "rejected", rejection_reason = ? WHERE id = ?',
      [reason || 'No reason provided', checkoutId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        sendEmail({
          to: email,
          subject: `Request Rejected – ${component_name}`,
          html: `<p>Hi ${username},<br>Your request for <strong>${quantity} × ${component_name}</strong> was <strong>rejected</strong>.<br><em>Reason:</em> ${reason}</p>`
        });

        res.json({ message: 'Checkout rejected and user notified' });
      }
    );
  });
});

// 📊 Pending requests count (dashboard tile)
router.get('/pending-count', authenticateToken, isAdmin, (req, res) => {
  db.get('SELECT COUNT(*) AS pending FROM checkouts WHERE status = "requested"', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ pending: row.pending });
  });
});

module.exports = router;