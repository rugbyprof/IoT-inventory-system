const express = require('express');
const cors = require('cors');
const path = require('path');


require('dotenv').config();


// console.log('Path:', path);
// console.log('Current working directory:', process.cwd());
// console.log('Current file location:', __dirname);

const db = process.env.DB

console.log('DB .env:', process.env.DB);

// if(db==='MySQL') {

const authRoutes = require('./routes/auth');
const componentRoutes = require('./routes/components');
const checkoutRoutes = require('./routes/checkout');
const adminRoutes = require('./routes/admin');

// // }else{
//   const authRoutes = require('./routes/auth2');
//   const componentRoutes = require('./routes/components2');
//   const checkoutRoutes = require('./routes/checkout2');
//   const adminRoutes = require('./routes/admin2');
// //}
const app = express();
const PORT = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

console.log(db);

// if(db=='MySQL') {
app.use('/api/auth', authRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);
// // }else{
//   app.use('/api/auth2', authRoutes);
//   app.use('/api/components2', componentRoutes);
//   app.use('/api/checkout2', checkoutRoutes);
//   app.use('/api/admin2', adminRoutes);
// //}


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


