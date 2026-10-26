// seed.js
// Creates app.db and fills it with fake users and products.
// Run once with `npm run seed` before starting the app.

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('app.db');

db.serialize(() => {
  db.run('DROP TABLE IF EXISTS users');
  db.run('DROP TABLE IF EXISTS products');

  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    role TEXT
  )`);

  db.run(`CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    category TEXT
  )`);

  const users = [
    ['admin', 'SuperSecret123', 'admin'],
    ['tenzin', 'password1', 'user'],
    ['karma', 'letmein', 'user'],
    ['sonam', 'qwerty', 'user']
  ];
  const userStmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
  users.forEach(u => userStmt.run(u));
  userStmt.finalize();

  const products = [
    ['Wireless Mouse', 799, 'electronics'],
    ['Mechanical Keyboard', 2499, 'electronics'],
    ['USB-C Cable', 299, 'electronics'],
    ['Office Chair', 6500, 'furniture'],
    ['Standing Desk', 14999, 'furniture'],
    ['Notebook', 120, 'stationery'],
    ['Gel Pen Pack', 180, 'stationery']
  ];
  const prodStmt = db.prepare('INSERT INTO products (name, price, category) VALUES (?, ?, ?)');
  products.forEach(p => prodStmt.run(p));
  prodStmt.finalize();

  console.log('Seeded app.db with users and products.');
});

db.close();
