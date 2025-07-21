const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/auth");
const router = express.Router();

// 📨 Submit a checkout request (user)
router.post("/", authenticateToken, (req, res) => {
  const { component_id, quantity } = req.body;
  const user_id = req.user.user_id;

  const query = `
    INSERT INTO checkouts (user_id, component_id, quantity, status)
    VALUES (?, ?, ?, 'requested')
  `;
  db.query(query, [user_id, component_id, quantity], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res
      .status(200)
      .json({ message: "Checkout request submitted for approval" });
  });
});

// 📋 Get user's own requests
router.get("/my-requests", authenticateToken, (req, res) => {
  const userId = req.user.user_id;

  const query = `
    SELECT c.id, comp.name AS component, c.quantity, c.status, c.rejection_reason, c.checkout_date
    FROM checkouts c
    JOIN components comp ON c.component_id = comp.id
    WHERE c.user_id = ?
    ORDER BY c.checkout_date DESC
  `;
  db.query(query, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

module.exports = router;