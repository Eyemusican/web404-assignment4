# WEB404 Secure Coding Practices — Assignment 4

**Student:** Tenzin Namgay (Cuney)
**Student ID:** 02230307

## Topic

SQL Injection

## What this is

A small Node.js app with four routes that are deliberately vulnerable to
SQL injection. I demonstrated all four attacks, then fixed them and
re-tested to confirm the fixes work. This is for coursework only, run it
locally, do not deploy it anywhere.

## Stack

Node.js, Express, EJS, SQLite

## Setup and run

    npm install
    npm run seed
    npm start

Then open http://localhost:3000. All four features are linked from the home
page, and every SQL query gets printed to the terminal so you can see what
actually runs.

Run npm run seed again anytime to reset the data.

## Seed data

users table

| username | password | role |
|---|---|---|
| admin | SuperSecret123 | admin |
| tenzin | password1 | user |
| karma | letmein | user |
| sonam | qwerty | user |

products table has id, name, price, category (electronics, furniture, stationery)

## The four vulnerable routes

| # | Feature | Route | Attack type |
|---|---|---|---|
| 1 | Login | POST /login | Authentication bypass |
| 2 | Product search | GET /products?category= | UNION based |
| 3 | Product lookup | GET /product?id= | Error based |
| 4 | Check username | GET /check?username= | Boolean based blind |

All four build their SQL by concatenating strings on purpose. Each one is
marked with a VULNERABLE comment in app.js.

## Payloads I used

1. Login bypass
   Username: admin' --
   Password: anything

   The -- comments out the password check, so it logs in as admin with no
   real password.

2. UNION based (product search)

       electronics' UNION SELECT id, username, password, role FROM users --

   Both tables have 4 columns, so this pulls every username and password into
   the results table.

3. Error based (product lookup)

       1'

   Breaks the query and prints the raw SQLite error on the page, which leaks
   info about the database.

4. Boolean blind (check username)

       admin' AND '1'='1

   says exists, and

       admin' AND '1'='2

   says does not exist. That true/false gap lets you extract data one
   character at a time without seeing any actual data.

## The fix

All four queries now use parameterized queries (? placeholders with the
values passed separately), so user input is always treated as data, never
as part of the SQL. Each fixed line has a FIXED comment in app.js.

| Attack | Before | After |
|---|---|---|
| Login bypass | logged in as admin | Invalid username or password |
| UNION based | leaked all credentials | No products found |
| Error based | raw SQLite error shown | Product not found |
| Boolean blind | true/false distinguishable | both say does not exist |

Normal use still works fine after the fix: admin / SuperSecret123 logs in,
electronics lists products, id=1 returns a product.

## Status

Done. All four vulnerabilities built, attacked, fixed, and re-tested.
