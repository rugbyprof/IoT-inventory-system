const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const componentRoutes = require('./routes/components');
const checkoutRoutes = require('./routes/checkout');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5055;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});