# FeedGrid - Full-Stack Food Delivery Platform

<div align="center">

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)](https://stripe.com/)

**A production-ready food delivery platform built with the MERN stack.**

Real time order tracking · Stripe payments · Live GPS map · Role-based dashboards

</div>

---

FeedGrid is a full stack food delivery platform built from scratch. It supports three distinct user roles with dedicated dashboards, real time order management via Socket.io, live delivery tracking on a Leaflet.js map and secure Stripe payment processing.

This project was built to demonstrate production level engineering practices including JWT refresh token rotation, server side payment verification, MongoDB aggregation pipelines, WebSocket room based broadcasting.

---

## Features

### Customer
- Register, login, browse and search restaurants
- Filter by cuisine type, city, rating, delivery time
- Add items to cart with same restaurant enforcement
- Checkout with Stripe (test mode)
- Real-time order status updates (Socket.io)
- Live delivery agent tracking on interactive map
- Order history with status timeline
- Rate and review delivered orders
- Reorder previous orders in one click

### Restaurant Owner
- Register and manage multiple restaurants
- Create, edit and manage menu items with categories
- Toggle restaurant open/closed status
- Receive instant order notifications (Socket.io)
- Manage incoming orders through 6 stage workflow
- View order history and customer details

### Delivery Agent
- Browse orders ready for pickup
- Accept deliveries and share live GPS location
- Real-time location broadcasting every 5 seconds
- Mark orders as delivered

### Admin
- Approve or reject restaurant listings
- Activate/deactivate users and restaurants
- Manage user roles
- Analytics dashboard with revenue charts
- Revenue trends, order breakdowns, top restaurants

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 + Vite | UI framework and build tool |
| React Router DOM | Client-side routing |
| Axios | HTTP client with interceptors |
| Context API | Global state (Auth, Cart, Socket) |
| Socket.io Client | Real-time WebSocket connection |
| Leaflet.js + React Leaflet | Interactive maps |
| Recharts | Analytics charts |
| @stripe/stripe-js | Stripe payment form |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express.js | REST API server |
| Socket.io | WebSocket server with rooms |
| Mongoose | MongoDB ODM |
| JSON Web Token | Access token (15 min) |
| bcryptjs | Password hashing |
| cookie-parser | HttpOnly refresh token cookies |
| Stripe SDK | Payment intent creation |
| Helmet.js | Security HTTP headers |
| express-rate-limit | Request rate limiting |
| express-mongo-sanitize | NoSQL injection prevention |
| nodemon | Development auto-restart |

### Database & Services
| Service | Purpose |
|---|---|
| MongoDB Atlas | Primary database (free tier) |
| Stripe Test Mode | Payment processing |
| OpenStreetMap + Nominatim | Free map tiles and geocoding |

---

## System Architecture

<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/a0fb6d24-43b1-4a97-8ff2-ac2ebbdf16e3" />


---

## API Documentation

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login and get tokens |
| POST | `/api/auth/logout` | Private | Logout and clear cookie |
| POST | `/api/auth/refresh-token` | Public | Get new access token |
| GET | `/api/auth/me` | Private | Get current user |

### Restaurants
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/restaurants` | Public | Browse with filters and pagination |
| POST | `/api/restaurants` | Owner | Create restaurant |
| GET | `/api/restaurants/my` | Owner | Get own restaurants |
| GET | `/api/restaurants/:id` | Public | Get restaurant + menu |
| PUT | `/api/restaurants/:id` | Owner | Update restaurant |
| DELETE | `/api/restaurants/:id` | Owner | Delete restaurant |
| PATCH | `/api/restaurants/:id/approve` | Admin | Approve/unapprove |
| PATCH | `/api/restaurants/:id/toggle` | Owner | Toggle open/closed |
| GET | `/api/restaurants/:id/reviews` | Public | Get reviews |

### Menu Items
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/restaurants/:id/menu` | Public | Get all menu items |
| POST | `/api/restaurants/:id/menu` | Owner | Add menu item |
| PUT | `/api/restaurants/:id/menu/:itemId` | Owner | Update item |
| DELETE | `/api/restaurants/:id/menu/:itemId` | Owner | Delete item |
| PATCH | `/api/restaurants/:id/menu/:itemId/toggle` | Owner | Toggle availability |

### Orders
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/orders` | Customer | Create order after payment |
| GET | `/api/orders/my` | Customer | Get order history |
| GET | `/api/orders/:id` | Auth | Get single order |
| PATCH | `/api/orders/:id/status` | Owner/Agent | Update status |
| POST | `/api/orders/:id/rate` | Customer | Submit rating |
| GET | `/api/orders/available` | Agent | Available pickups |
| PATCH | `/api/orders/:id/assign-agent` | Agent | Accept delivery |
| PATCH | `/api/orders/:id/location` | Agent | Update GPS location |

### Payments & Admin
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/payments/create-intent` | Customer | Create Stripe PaymentIntent |
| GET | `/api/admin/stats` | Admin | Platform statistics |
| GET | `/api/admin/analytics` | Admin | Chart data |
| GET | `/api/admin/restaurants` | Admin | All restaurants |
| GET | `/api/admin/users` | Admin | All users |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |

---

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** v20 or higher - [Download](https://nodejs.org/)
- **npm** v10 or higher (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)

You will also need free accounts on:
- [MongoDB Atlas](https://www.mongodb.com/atlas) - free M0 cluster
- [Stripe](https://stripe.com/) - test mode keys

---

## Environment Variables

### Backend (`backend/.env`)

Create a file named `.env` inside the `backend` folder with these values:

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Atlas
# Get this from Atlas → Connect → Drivers → Node.js
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/fooddelivery?retryWrites=true&w=majority

# JWT Secrets — use long random strings (minimum 32 characters each)
JWT_ACCESS_SECRET=your_very_long_random_access_secret_key_here_minimum_32_chars
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_key_here_different_from_above
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Stripe — get from dashboard.stripe.com → Developers → API Keys
# Make sure you are in TEST MODE
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_placeholder

```

### Frontend (`frontend/.env`)

Create a file named `.env` inside the `frontend` folder:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api

# Stripe — get from dashboard.stripe.com → Developers → API Keys
# This is the PUBLISHABLE key (starts with pk_test_)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```
---

## Running Locally

### Step 1 - Clone the repository

```bash
git clone https://github.com/Yashrane25/feedgrid.git
cd feedgrid
```

### Step 2 - Install backend dependencies

```bash
cd backend
npm install
```

### Step 3 - Install frontend dependencies

```bash
cd ../frontend
npm install
```

### Step 4 - Set up MongoDB Atlas

Create a free MongoDB Atlas cluster, configure a database user and network access, then copy your connection string and add it as the `MONGO_URI` in `backend/.env`.

### Step 5 - Set up Stripe

Create a Stripe account in **Test Mode**, copy your **Secret Key** to `backend/.env` and **Publishable Key** to `frontend/.env`.

### Step 6 - Create an Admin Account

Register a new user, then update its `role` to `admin` in the MongoDB `users` collection. Log in again to access the admin dashboard.

### Step 7 - Start the Development Servers

Run the backend and frontend in separate terminal windows:

**Backend**
```bash
cd backend
npm run dev
```

**Frontend**
```bash
cd frontend
npm run dev
```
---

## Contact

**Yash Rane**
- LinkedIn: [linkedin.com/in/yourprofile](https://www.linkedin.com/in/yashrane25/)
- GitHub: [@yourusername](https://github.com/Yashrane25)
- Email: yashrane332@gmail.com

---

<div align="center">

⭐ Star this repository if you found it helpful

</div>
