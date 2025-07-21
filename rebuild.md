```bash
mkdir -p backend/routes backend/middleware backend/utils frontend scripts
touch backend/server.js backend/db.js
touch backend/routes/auth.js backend/routes/components.js backend/routes/checkout.js backend/routes/admin.js
touch backend/middleware/auth.js backend/middleware/isAdmin.js backend/utils/sendEmail.js
touch frontend/index.html frontend/register.html frontend/admin-login.html frontend/add-component.html
touch frontend/checkout.html frontend/admin-dashboard.html frontend/admin-approvals.html frontend/checkout-status.html frontend/style.css
touch scripts/deploy.sh
```

Here’s the latest and complete code for **`backend/db.js`**:

---

### 📄 `backend/db.js`

```js
const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: "localhost",
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: "lab_inventory",
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to MySQL database.");
});

module.exports = db;
```

---

Let me know when you're ready for **`backend/server.js`** ✅

Here’s the full and latest version of **`backend/server.js`**:

---

### 📄 `backend/server.js`

```js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const componentRoutes = require("./routes/components");
const checkoutRoutes = require("./routes/checkout");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/components", componentRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
```

---

Let me know when you're ready for the next file: **`backend/routes/auth.js`** 🔐

Awesome! Here’s the latest version of **`backend/routes/auth.js`** – includes **registration**, **login**, and **JWT with role support**:

---

### 📄 `backend/routes/auth.js`

```js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db");
const router = express.Router();

const SECRET = "supersecretkey"; // In production, store in .env

// Register new user
router.post("/register", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email)
    return res.status(400).json({ error: "Missing fields" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query =
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, "user")';
    db.query(query, [username, hashedPassword, email], (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(400).json({ error: "Username or email exists" });
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ message: "User registered successfully" });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login existing user
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err || results.length === 0)
        return res.status(401).json({ error: "Invalid credentials" });

      const user = results[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign(
        { user_id: user.id, username: user.username, role: user.role },
        SECRET,
        { expiresIn: "2h" }
      );

      res.status(200).json({ message: "Login successful", token });
    }
  );
});

module.exports = router;
```

---

Ready for **`backend/routes/components.js`**? 🧩

Here’s the full code for **`backend/routes/components.js`**, including **add** and **list components**, with JWT-based protection:

---

### 📄 `backend/routes/components.js`

```js
const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/auth");
const router = express.Router();

// ✅ Add a new component (protected)
router.post("/add", authenticateToken, (req, res) => {
  const { name, category, quantity } = req.body;
  const query =
    "INSERT INTO components (name, category, quantity) VALUES (?, ?, ?)";
  db.query(query, [name, category, quantity], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Component added successfully" });
  });
});

// 📋 Get all components (public)
router.get("/", (req, res) => {
  db.query("SELECT * FROM components", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(200).json(results);
  });
});

// 📊 Dashboard listing (authenticated)
router.get("/dashboard", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM components ORDER BY category, name",
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json(results);
    }
  );
});

module.exports = router;
```

---

Next up: **`backend/routes/checkout.js`** for user request submissions and status lookup 🔄. Ready?

Here’s the full and updated version of **`backend/routes/checkout.js`** – includes **submitting a checkout request** and **viewing request status**:

---

### 📄 `backend/routes/checkout.js`

```js
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
```

---

Ready for the next one: **`backend/routes/admin.js`** for approving/rejecting requests and dashboard data? 🛠️

Here’s the full, final version of **`backend/routes/admin.js`** – handles **approvals, rejections**, **pending requests**, **dashboard counts**, and **email notifications**:

---

### 📄 `backend/routes/admin.js`

```js
const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const sendEmail = require("../utils/sendEmail");
const router = express.Router();

// 🔍 Get pending requests
router.get("/pending-checkouts", authenticateToken, isAdmin, (req, res) => {
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
router.post("/approve-checkout/:id", authenticateToken, isAdmin, (req, res) => {
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
      return res
        .status(404)
        .json({ error: "Request not found or already handled" });

    const { component_id, quantity, email, username, component_name } =
      results[0];

    db.query(
      "SELECT quantity FROM components WHERE id = ?",
      [component_id],
      (err, res2) => {
        if (err || res2.length === 0 || res2[0].quantity < quantity)
          return res.status(400).json({ error: "Insufficient stock" });

        db.query("UPDATE components SET quantity = quantity - ? WHERE id = ?", [
          quantity,
          component_id,
        ]);
        db.query('UPDATE checkouts SET status = "approved" WHERE id = ?', [
          checkoutId,
        ]);

        // Send approval email
        sendEmail({
          to: email,
          subject: `Request Approved – ${component_name}`,
          html: `<p>Hello ${username},<br>Your checkout request for <strong>${quantity} × ${component_name}</strong> has been <strong>approved</strong>.<br>You're good to go!</p>`,
        });

        res.json({ message: "Checkout approved and user notified" });
      }
    );
  });
});

// ❌ Reject a checkout
router.post("/reject-checkout/:id", authenticateToken, isAdmin, (req, res) => {
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
      return res
        .status(404)
        .json({ error: "Request not found or already handled" });

    const { email, username, component_name, quantity } = results[0];

    db.query(
      'UPDATE checkouts SET status = "rejected", rejection_reason = ? WHERE id = ?',
      [reason || "No reason provided", checkoutId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Send rejection email
        sendEmail({
          to: email,
          subject: `Request Rejected – ${component_name}`,
          html: `<p>Hi ${username},<br>Your request for <strong>${quantity} × ${component_name}</strong> was <strong>rejected</strong>.<br><br><em>Reason:</em> ${reason}</p>`,
        });

        res.json({ message: "Checkout rejected and user notified" });
      }
    );
  });
});

// 📊 Get pending request count for dashboard
router.get("/pending-count", authenticateToken, isAdmin, (req, res) => {
  db.query(
    'SELECT COUNT(*) AS pending FROM checkouts WHERE status = "requested"',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ pending: results[0].pending });
    }
  );
});

module.exports = router;
```

---

Ready for the next file: **`backend/middleware/auth.js`** (JWT verification)? 🔐

Here’s the full, final version of **`backend/routes/admin.js`** – handles **approvals, rejections**, **pending requests**, **dashboard counts**, and **email notifications**:

---

### 📄 `backend/routes/admin.js`

```js
const express = require("express");
const db = require("../db");
const authenticateToken = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");
const sendEmail = require("../utils/sendEmail");
const router = express.Router();

// 🔍 Get pending requests
router.get("/pending-checkouts", authenticateToken, isAdmin, (req, res) => {
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
router.post("/approve-checkout/:id", authenticateToken, isAdmin, (req, res) => {
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
      return res
        .status(404)
        .json({ error: "Request not found or already handled" });

    const { component_id, quantity, email, username, component_name } =
      results[0];

    db.query(
      "SELECT quantity FROM components WHERE id = ?",
      [component_id],
      (err, res2) => {
        if (err || res2.length === 0 || res2[0].quantity < quantity)
          return res.status(400).json({ error: "Insufficient stock" });

        db.query("UPDATE components SET quantity = quantity - ? WHERE id = ?", [
          quantity,
          component_id,
        ]);
        db.query('UPDATE checkouts SET status = "approved" WHERE id = ?', [
          checkoutId,
        ]);

        // Send approval email
        sendEmail({
          to: email,
          subject: `Request Approved – ${component_name}`,
          html: `<p>Hello ${username},<br>Your checkout request for <strong>${quantity} × ${component_name}</strong> has been <strong>approved</strong>.<br>You're good to go!</p>`,
        });

        res.json({ message: "Checkout approved and user notified" });
      }
    );
  });
});

// ❌ Reject a checkout
router.post("/reject-checkout/:id", authenticateToken, isAdmin, (req, res) => {
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
      return res
        .status(404)
        .json({ error: "Request not found or already handled" });

    const { email, username, component_name, quantity } = results[0];

    db.query(
      'UPDATE checkouts SET status = "rejected", rejection_reason = ? WHERE id = ?',
      [reason || "No reason provided", checkoutId],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });

        // Send rejection email
        sendEmail({
          to: email,
          subject: `Request Rejected – ${component_name}`,
          html: `<p>Hi ${username},<br>Your request for <strong>${quantity} × ${component_name}</strong> was <strong>rejected</strong>.<br><br><em>Reason:</em> ${reason}</p>`,
        });

        res.json({ message: "Checkout rejected and user notified" });
      }
    );
  });
});

// 📊 Get pending request count for dashboard
router.get("/pending-count", authenticateToken, isAdmin, (req, res) => {
  db.query(
    'SELECT COUNT(*) AS pending FROM checkouts WHERE status = "requested"',
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ pending: results[0].pending });
    }
  );
});

module.exports = router;
```

---

Ready for the next file: **`backend/middleware/auth.js`** (JWT verification)? 🔐

Here’s the complete code for **`backend/middleware/isAdmin.js`** – this ensures that only users with the `admin` role can access certain routes:

---

### 📄 `backend/middleware/isAdmin.js`

```js
function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admins only" });
  }
  next();
}

module.exports = isAdmin;
```

---

Next: **`backend/utils/sendEmail.js`** to handle email notifications with Nodemailer. Ready? ✉️

Here’s the full code for **`backend/utils/sendEmail.js`** using **Nodemailer** to send approval/rejection emails:

---

### 📄 `backend/utils/sendEmail.js`

```js
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("❌ Failed to send email:", err.message);
  }
}

module.exports = sendEmail;
```

---

Next: the frontend! We’ll start with **`frontend/style.css`** for global styles. Ready? 💅

Awesome! Here’s the full and clean style sheet for your frontend: **`frontend/style.css`** – used by all HTML pages.

---

### 📄 `frontend/style.css`

```css
body {
  font-family: Arial, sans-serif;
  background-color: #f2f2f2;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 600px;
  margin: 50px auto;
  background-color: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
}

h2,
h3 {
  text-align: center;
  color: #333;
}

input,
select,
button {
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

th,
td {
  padding: 10px;
  border: 1px solid #ccc;
  text-align: left;
}

th {
  background-color: #eee;
}

button.approve-btn {
  background: green;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button.reject-btn {
  background: crimson;
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 5px;
  margin-left: 5px;
  cursor: pointer;
}
```

---

Next up: the HTML files! Starting with **`frontend/register.html`** for user registration. Ready? 📝

Here’s the full code for **`frontend/register.html`** – user registration form that calls your backend API:

---

### 📄 `frontend/register.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Register</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>User Registration</h2>
      <input type="text" id="username" placeholder="Username" required />
      <input type="email" id="email" placeholder="Email" required />
      <input type="password" id="password" placeholder="Password" required />
      <button onclick="register()">Register</button>
    </div>

    <script>
      function register() {
        fetch("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: document.getElementById("username").value,
            email: document.getElementById("email").value,
            password: document.getElementById("password").value,
          }),
        })
          .then((res) => res.json())
          .then((data) => alert(data.message || data.error));
      }
    </script>
  </body>
</html>
```

---

Ready for the next one: **`frontend/admin-login.html`**? 🔐

Perfect! Here's the full code for **`frontend/admin-login.html`** – allows admin (or any user) to log in and stores the JWT token:

---

### 📄 `frontend/admin-login.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Admin Login</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>Admin Login</h2>
      <input type="text" id="username" placeholder="Username" required />
      <input type="password" id="password" placeholder="Password" required />
      <button onclick="login()">Login</button>
    </div>

    <script>
      function login() {
        fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: document.getElementById("username").value,
            password: document.getElementById("password").value,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.token) {
              localStorage.setItem("token", data.token);
              alert("Login successful!");
              window.location.href = "admin-dashboard.html"; // Redirect after login
            } else {
              alert(data.error || "Login failed");
            }
          });
      }
    </script>
  </body>
</html>
```

---

Next up: **`frontend/add-component.html`** – for adding new inventory items. Ready? ➕📦

Awesome! Here’s the full code for **`frontend/add-component.html`** – allows admins to add components to inventory:

---

### 📄 `frontend/add-component.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Add Component</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>Add New Component</h2>
      <input type="text" id="name" placeholder="Component Name" required />
      <select id="category">
        <option>main board</option>
        <option>breakout board</option>
        <option>capacitor</option>
        <option>diode</option>
        <option>resistor</option>
        <option>transistor</option>
        <option>sensor</option>
      </select>
      <input type="number" id="quantity" placeholder="Quantity" required />
      <button onclick="addComponent()">Add Component</button>
    </div>

    <script>
      function addComponent() {
        fetch("http://localhost:3000/api/components/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({
            name: document.getElementById("name").value,
            category: document.getElementById("category").value,
            quantity: parseInt(document.getElementById("quantity").value),
          }),
        })
          .then((res) => res.json())
          .then((data) => alert(data.message || data.error));
      }
    </script>
  </body>
</html>
```

---

Next: **`frontend/checkout.html`** – for users to request components. Ready? 🔄📦

Here’s the full code for **`frontend/checkout.html`** – allows regular users to submit component checkout requests:

---

### 📄 `frontend/checkout.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Checkout Component</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>Checkout Request</h2>
      <input
        type="number"
        id="component_id"
        placeholder="Component ID"
        required
      />
      <input
        type="number"
        id="quantity"
        placeholder="Quantity to Checkout"
        required
      />
      <button onclick="checkoutComponent()">Submit Request</button>
    </div>

    <script>
      function checkoutComponent() {
        fetch("http://localhost:3000/api/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
          body: JSON.stringify({
            component_id: parseInt(
              document.getElementById("component_id").value
            ),
            quantity: parseInt(document.getElementById("quantity").value),
          }),
        })
          .then((res) => res.json())
          .then((data) => alert(data.message || data.error));
      }
    </script>
  </body>
</html>
```

---

Next up: **`frontend/admin-dashboard.html`** – shows inventory and recent checkouts to admins. Ready? 📊

Here’s the full code for **`frontend/admin-dashboard.html`** – shows the inventory and recent checkouts, plus a pending request count tile:

---

### 📄 `frontend/admin-dashboard.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Admin Dashboard</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>Admin Dashboard</h2>
      <div
        id="pending-tile"
        style="padding: 15px; background: #ffeeba; margin-bottom: 20px; border-radius: 5px;"
      >
        Pending Requests: <span id="pending-count">0</span>
      </div>

      <h3>Inventory</h3>
      <table id="inventory-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Category</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <h3>Recent Checkouts</h3>
      <table id="checkout-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Component</th>
            <th>Qty</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <script>
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Login required");
        window.location.href = "admin-login.html";
      }

      async function fetchInventory() {
        const res = await fetch(
          "http://localhost:3000/api/components/dashboard",
          {
            headers: { Authorization: "Bearer " + token },
          }
        );
        const data = await res.json();
        const tbody = document.querySelector("#inventory-table tbody");
        tbody.innerHTML = "";
        data.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${item.id}</td><td>${item.name}</td><td>${item.category}</td><td>${item.quantity}</td>`;
          tbody.appendChild(tr);
        });
      }

      async function fetchCheckouts() {
        const res = await fetch("http://localhost:3000/api/admin/checkouts", {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await res.json();
        const tbody = document.querySelector("#checkout-table tbody");
        tbody.innerHTML = "";
        data.forEach((c) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${c.id}</td><td>${c.username}</td><td>${
            c.component
          }</td><td>${c.quantity}</td><td>${new Date(
            c.checkout_date
          ).toLocaleString()}</td>`;
          tbody.appendChild(tr);
        });
      }

      async function updatePendingCount() {
        const res = await fetch(
          "http://localhost:3000/api/admin/pending-count",
          {
            headers: { Authorization: "Bearer " + token },
          }
        );
        const { pending } = await res.json();
        document.getElementById("pending-count").innerText = pending;
      }

      fetchInventory();
      fetchCheckouts();
      updatePendingCount();
    </script>
  </body>
</html>
```

---

Next: **`frontend/admin-approvals.html`** – approve or reject pending checkout requests. Ready? 🛠️✅❌

Here’s the full code for **`frontend/admin-approvals.html`** – lets admins **approve or reject** pending checkout requests:

---

### 📄 `frontend/admin-approvals.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Approve Checkouts</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>Pending Checkout Requests</h2>
      <table id="requests-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Component</th>
            <th>Quantity</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <script>
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Login required");
        window.location.href = "admin-login.html";
      }

      async function fetchRequests() {
        const res = await fetch(
          "http://localhost:3000/api/admin/pending-checkouts",
          {
            headers: { Authorization: "Bearer " + token },
          }
        );
        const data = await res.json();
        const tbody = document.querySelector("#requests-table tbody");
        tbody.innerHTML = "";
        data.forEach((req) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
        <td>${req.id}</td>
        <td>${req.username}</td>
        <td>${req.component}</td>
        <td>${req.quantity}</td>
        <td>${new Date(req.checkout_date).toLocaleString()}</td>
        <td>
          <button class="approve-btn" onclick="approve(${
            req.id
          })">Approve</button>
          <button class="reject-btn" onclick="reject(${req.id})">Reject</button>
        </td>
      `;
          tbody.appendChild(tr);
        });
      }

      function approve(id) {
        fetch(`http://localhost:3000/api/admin/approve-checkout/${id}`, {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
        })
          .then((res) => res.json())
          .then((data) => {
            alert(data.message || data.error);
            fetchRequests();
          });
      }

      function reject(id) {
        const reason = prompt("Enter rejection reason:");
        if (!reason) return;
        fetch(`http://localhost:3000/api/admin/reject-checkout/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({ reason }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(data.message || data.error);
            fetchRequests();
          });
      }

      fetchRequests();
    </script>
  </body>
</html>
```

---

Next: **`frontend/checkout-status.html`** – for users to view the status of their requests. Ready? 📋🔍

Here’s the full code for **`frontend/checkout-status.html`** – lets users view the **status of their checkout requests**:

---

### 📄 `frontend/checkout-status.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <title>My Checkout Requests</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div class="container">
      <h2>My Checkout Requests</h2>
      <table id="status-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Component</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <script>
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Login required");
        window.location.href = "admin-login.html";
      }

      fetch("http://localhost:3000/api/checkout/my-requests", {
        headers: { Authorization: "Bearer " + token },
      })
        .then((res) => res.json())
        .then((data) => {
          const tbody = document.querySelector("#status-table tbody");
          tbody.innerHTML = "";
          data.forEach((row) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
        <td>${row.id}</td>
        <td>${row.component}</td>
        <td>${row.quantity}</td>
        <td>${row.status}</td>
        <td>${row.rejection_reason || "-"}</td>
        <td>${new Date(row.checkout_date).toLocaleString()}</td>
      `;
            tbody.appendChild(tr);
          });
        });
    </script>
  </body>
</html>
```

---

Next: the optional **deployment script** – `scripts/deploy.sh` for pushing to GitHub and your server. Ready? ⚙️📤

Here’s the full code for **`scripts/deploy.sh`** – lets you push to **GitHub** and **your server** in one command:

---

### 📄 `scripts/deploy.sh`

```bash
#!/bin/bash

# Push to GitHub
echo "🔄 Pushing to GitHub..."
git push github main

# Push to your server via SSH
echo "🚀 Deploying to profgriffin.com..."
git push server main

echo "✅ Deployment complete!"
```

---

### ✅ Make It Executable

Run this once to allow execution:

```bash
chmod +x scripts/deploy.sh
```

---

With this, your full stack lab inventory system is ready to deploy and evolve! Would you like a quick checklist of things to double-check before going live (e.g. `.env`, ports, roles, SMTP)?
