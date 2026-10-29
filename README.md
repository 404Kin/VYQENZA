<div align="center">
  <h1>VYQENZA — Full-Stack E-commerce Store</h1>
  <p>A complete online fashion store with customer accounts, product variants, reviews, wishlist, orders, live support chat, and a powerful admin dashboard.</p>

  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
  ![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
  ![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)
  ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
</div>

---

## About The Project
**VYQENZA** is a full-stack e-commerce platform designed to provide a seamless shopping experience for customers and powerful management tools for administrators. It handles everything from product variants (colors and sizes) and customer reviews to live support chats. All data is securely stored in MongoDB and served via an Express backend.

---

## ✨ Key Features

### Storefront
- **Product Listing:** Category tabs (Men, Women, Accessories), Sale filter, saved items, and live search.
- **Product Page:** Colour swatches, size selection, quantity selector, live stock status, and wishlist functionality.
- **Reviews:** Star ratings, detailed rating breakdowns, and restricted to one review per customer.
- **Cart & Checkout:** Colour/size per line item, quantity controls, live stock check, and Cash on Delivery checkout with delivery details.
- **Newsletter:** Subscription option available.

### Customer Account
- **Authentication:** Secure Register / Login using JWT.
- **Profile Dashboard:** View "My Orders" (with cancel option), "Saved Items", and "Account Settings" (change name and password).

### Live Support Chat
- Floating messenger-style chat available on every page (for guests and logged-in users).
- **Instant Bot:** Rule-based automated answers for order status, delivery, returns, payments, and sizes.
- **Human Handoff:** Any complex queries are forwarded to the admin dashboard for a human reply.

### Admin Dashboard (`/admin.html`)
- **Overview:** Revenue, total orders, pending orders, low stock alerts, total customers, subscribers, and unread chats.
- **Products:** Add / edit / delete products, manage colours (with optional photos), sizes, stock, and old prices for Sale tags.
- **Orders:** Filter orders and change statuses (cancelling an order automatically returns the stock).
- **Users:** Grant or remove admin roles, delete users.
- **Inbox:** Reply to customers in a messenger-style inbox.
- **Moderation:** Manage reviews and newsletter subscribers (copy all emails).

---

## Tech Stack

| Part | Technology |
|------|------------|
| **Backend** | Node.js, Express 5, Mongoose |
| **Database** | MongoDB (Atlas) |
| **Auth** | JWT (JSON Web Tokens), bcryptjs |
| **Frontend** | HTML, CSS, Vanilla JavaScript (served by the backend) |

---

## Project Structure

```text
E-commerce-web/
├── backend/
│   ├── server.js            # App entry, serves the frontend
│   ├── seed.js              # One-time setup (admin account, default colors/sizes)
│   ├── middleware/          # Auth (user + admin), rate limiter
│   ├── models/              # User, Product, Order, Chat, Subscriber
│   └── routes/              # Auth, products, orders, chat, admin, misc
└── frontend/
    ├── index.html           # Storefront (plus product, cart, login, profile, etc.)
    ├── admin.html           # Admin dashboard
    ├── css/                 # style.css, admin.css
    └── js/                  # api.js (shared), chat.js, and one file per page
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18 or higher
- A MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/404Kin/VYQENZA.git
   cd your-repo-name/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create `backend/.env`**
   ```env
   MONGO_URI=your-mongodb-connection-string
   JWT_SECRET=a-long-random-secret
   PORT=5000
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=choose-a-strong-password
   ```
   > `ADMIN_EMAIL` and `ADMIN_PASSWORD` are optional. Defaults: `admin@vyqenza.com` / `admin123`.

4. **Run the one-time setup**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```

6. **Open the store** at **http://localhost:5000**

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the server with auto-reload (nodemon) |
| `npm start` | Start the server (production) |
| `npm run seed` | One-time setup (safe to run more than once) |

---

## What `npm run seed` Does

- Adds default colours and sizes to products that have none (existing products are never deleted).
- Adds sample products **only** if the products collection is empty.
- Creates the admin account if it does not exist.

> After seeding, open **Admin → Products** and set the real colours and sizes for each product.

---

## Admin Access

1. Log in with the admin account. You are taken straight to the dashboard (`/admin.html`).
2. The **Admin** link also appears in the menu for admin accounts.
3. To make another person an admin: **Admin → Users → Make admin**.
4. Change the default admin password from **Profile → Account**.

---

## Sale Items

A product appears under **Sale** when its **Old price** is higher than its **Price** (Admin → Products → Edit). A discount tag (e.g. `-20%`) is shown on the product card.

---

## API Overview

| Area | Endpoints |
|------|-----------|
| **Auth** | `POST /api/auth/register`, `POST /api/auth/login`, `GET/PUT /api/auth/me`, `PUT /api/auth/password` |
| **Products** | `GET /api/products`, `GET /api/products/:id`, `PUT /:id/click`, `POST /:id/love`, `POST /:id/review` |
| **Orders** | `POST /api/orders`, `GET /api/orders/myorders`, `PUT /api/orders/:id/cancel` |
| **Chat** | `GET/POST /api/chat/me` |
| **Newsletter** | `POST /api/newsletter` |
| **Admin only** | `POST/PUT/DELETE /api/products`, `GET /api/orders`, `PUT /api/orders/:id/status`, `/api/admin/*`, `/api/chat/admin/*` |

---

## Security

- Passwords are hashed with **bcrypt**; sessions use **JWT** (7 days).
- Admin routes check the database on every request, so removing an admin takes effect immediately.
- Order prices and stock are calculated on the **server**, never trusted from the browser.
- Rate limiting on login, register, newsletter, and chat.
- `.env` is git-ignored. **Never commit it.**

---

## Deployment (Render + MongoDB Atlas)

1. Push the project to GitHub.
2. **MongoDB Atlas** → Network Access → allow `0.0.0.0/0`.
3. **Render** → New → Web Service → select your repository.
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables on Render: `MONGO_URI`, `JWT_SECRET` (optional: `ADMIN_EMAIL`, `ADMIN_PASSWORD`).
5. Run `npm run seed` once from your computer (it uses the same Atlas database).
6. Open your Render URL. The frontend is served by the same service, so nothing else needs deploying.

> The free Render plan sleeps when idle, so the first request after a pause can take about 30 seconds.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `nodemon is not recognized` | Run `npm install` inside the `backend` folder |
| Products do not load / `ERR_CONNECTION_REFUSED` | Start the server (`npm run dev`), then hard refresh (`Ctrl + Shift + R`) |
| Products list is empty | Check `http://localhost:5000/api/products`, then run `npm run seed` |
| `Invalid email or password` for admin | Run `npm run seed` first, then use the email and password from `.env` |
| MongoDB connection error | Check `MONGO_URI` and the Atlas Network Access list |

---

## Notes

- Product images are URLs (no file upload yet).
- Payment is **Cash on Delivery** only.
- The cart is kept in the browser until checkout; orders are saved in the database.
- The support bot is keyword based, not AI.

---

<div align="center">
  Made with using Node.js, Express and MongoDB
</div>