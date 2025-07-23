const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db2');
const router = express.Router();

const SECRET = 'supersecretkey'; // move to .env for security

// Register a new user
router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email)
    return res.status(400).json({ error: 'Missing fields' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertQuery = `INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, 'user')`;
    db.run(insertQuery, [username, hashedPassword, email], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed'))
          return res.status(400).json({ error: 'Username or email already exists' });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login existing user
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { user_id: user.id, username: user.username, role: user.role },
      SECRET,
      { expiresIn: '2h' }
    );

    res.status(200).json({ message: 'Login successful', token });
  });
});

module.exports = router;