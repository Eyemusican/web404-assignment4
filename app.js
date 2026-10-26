// app.js
// WEB404 Assignment 4 - SQL injection demo app (Stage 2: FIXED version).
// Every database query now uses parameterized queries (? placeholders with a
// separate parameter array) so user input is treated as data, not SQL. See
// the `FIXED:` comment above each query for why it is safe. The Stage 1
// attack payloads (in the README) no longer work against this version.

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('app.db');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// Home page - links to every vulnerable feature
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.render('home');
});

// ---------------------------------------------------------------------------
// 1. LOGIN  (POST /login)  -> authentication bypass attack
// ---------------------------------------------------------------------------
app.get('/login', (req, res) => {
  res.render('login', { result: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // FIXED: the query uses ? placeholders and the values are passed as a
  // separate parameter array. SQLite treats them strictly as data, never as
  // SQL, so input like  admin' --  is matched as a literal username and the
  // authentication bypass no longer works.
  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";
  console.log('LOGIN SQL:', sql, '-- params:', [username, password]);

  db.all(sql, [username, password], (err, rows) => {
    if (err) {
      return res.render('login', { result: { error: err.message } });
    }
    if (rows && rows.length > 0) {
      res.render('login', { result: { user: rows[0] } });
    } else {
      res.render('login', { result: { failed: true } });
    }
  });
});

// ---------------------------------------------------------------------------
// 2. PRODUCT SEARCH BY CATEGORY  (GET /products?category=)  -> UNION attack
// ---------------------------------------------------------------------------
app.get('/products', (req, res) => {
  const category = req.query.category;

  if (category === undefined) {
    return res.render('products', { rows: null, error: null, category: '' });
  }

  // FIXED: the category is bound through a ? placeholder, so the whole value
  // is treated as one string literal. An injected  ' UNION SELECT ... --  is
  // searched for as a literal category name and matches nothing, which defeats
  // the UNION attack.
  const sql = "SELECT id, name, price, category FROM products WHERE category = ?";
  console.log('PRODUCTS SQL:', sql, '-- params:', [category]);

  db.all(sql, [category], (err, rows) => {
    if (err) {
      return res.render('products', { rows: null, error: err.message, category });
    }
    res.render('products', { rows, error: null, category });
  });
});

// ---------------------------------------------------------------------------
// 3. PRODUCT LOOKUP BY ID  (GET /product?id=)  -> error based attack (fixed)
// ---------------------------------------------------------------------------
app.get('/product', (req, res) => {
  const id = req.query.id;

  if (id === undefined) {
    return res.render('product', { row: null, error: null, id: '' });
  }

  // FIXED: the id is bound through a ? placeholder instead of being
  // concatenated. Non-numeric input like  1'  no longer breaks the SQL, so it
  // cannot trigger a database error or inject a UNION.
  const sql = "SELECT id, name, price, category FROM products WHERE id = ?";
  console.log('PRODUCT SQL:', sql, '-- params:', [id]);

  db.get(sql, [id], (err, row) => {
    // FIXED: database errors are logged server-side only. The page never shows
    // the raw error message, so there is nothing for an error-based attack to
    // read back.
    if (err) {
      console.error('PRODUCT lookup error:', err.message);
      return res.render('product', { row: null, error: null, id });
    }
    res.render('product', { row, error: null, id });
  });
});

// ---------------------------------------------------------------------------
// 4. CHECK USERNAME  (GET /check?username=)  -> boolean based blind attack
//    Only ever reports "exists" or "does not exist" - no data is shown.
// ---------------------------------------------------------------------------
app.get('/check', (req, res) => {
  const username = req.query.username;

  if (username === undefined) {
    return res.render('check', { status: null, username: '' });
  }

  // FIXED: the username is bound through a ? placeholder. A blind payload such
  // as  admin' AND '1'='1  is matched as a literal username (which does not
  // exist), so the true/false answers no longer differ and the boolean blind
  // attack cannot extract data.
  const sql = "SELECT * FROM users WHERE username = ?";
  console.log('CHECK SQL:', sql, '-- params:', [username]);

  db.all(sql, [username], (err, rows) => {
    if (err) {
      // Even on error we leak nothing but exists / does not exist.
      return res.render('check', { status: 'does not exist', username });
    }
    const status = (rows && rows.length > 0) ? 'exists' : 'does not exist';
    res.render('check', { status, username });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Vulnerable app running at http://localhost:${PORT}`);
});
