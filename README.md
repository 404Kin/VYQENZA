# VYQENZA - Full Stack E-commerce

Node.js + Express + MongoDB (Mongoose) backend, plain HTML/CSS/JS frontend (served by the backend).

## Run locally
1. `cd backend && npm install`
2. Create `backend/.env`:
   ```
   MONGO_URI=your-mongodb-atlas-uri
   JWT_SECRET=a-long-random-string
   PORT=5000
   ADMIN_EMAIL=you@example.com      # optional
   ADMIN_PASSWORD=choose-a-password # optional
   ```
3. `npm run seed` (once): adds colours/sizes to existing products, sample products if empty, and the admin account
4. `npm run dev` -> open http://localhost:5000

## What is saved in MongoDB
users (+ wishlist) · products (colours, sizes, stock, views, saves) · reviews · orders · newsletter subscribers · support chats

## Pages
Shop (`index`) · Product · Cart/Checkout · Profile (orders, saved, account) · Login · Info · **Admin dashboard (`/admin.html`)**

## Admin dashboard
Login with the admin account, then open `/admin.html` (also linked in the menu). Manage products (add/edit/delete, colours, sizes, stock, sale price), orders (status), users (roles, delete), customer chats (reply), reviews, subscribers.

## Deploy (Render + MongoDB Atlas)
1. Push to GitHub (`.env` is git-ignored).
2. Atlas: Network Access -> allow `0.0.0.0/0` (Render IPs change).
3. Render -> New Web Service -> your repo. Root Directory `backend`, Build `npm install`, Start `npm start`.
4. Environment variables on Render: `MONGO_URI`, `JWT_SECRET` (and optionally `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
5. Run `npm run seed` once from your own computer (it uses the same Atlas database), then open your Render URL.
