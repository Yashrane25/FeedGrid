# FeedGrid - Full-Stack Food Delivery Platform

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-010101?style=flat-square&logo=socketdotio)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?style=flat-square&logo=stripe)](https://stripe.com/)

**A production-ready food delivery platform built with the MERN stack.**
Real-time order tracking · Stripe payments · Live GPS map · Role-based dashboards

FeedGrid is a full stack food delivery platform built from scratch. It supports three distinct user roles with dedicated dashboards, real time order management via Socket.io, live delivery tracking on a Leaflet.js map and secure Stripe payment processing.

This project was built to demonstrate production level engineering practices including JWT refresh token rotation, server side payment verification, MongoDB aggregation pipelines, WebSocket room based broadcasting and Redis caching with cache invalidation.

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
| ioredis | Redis client with auto-reconnect |
| nodemon | Development auto-restart |

### Database & Services
| Service | Purpose |
|---|---|
| MongoDB Atlas | Primary database (free tier) |
| Redis Cloud | Response caching |
| Stripe Test Mode | Payment processing |
| OpenStreetMap + Nominatim | Free map tiles and geocoding |

---

## System Architecture

┌─────────────────────────────────────────────────────────┐
│                        CLIENT                           │
│              React + Vite (Vercel)                      │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Auth     │ │ Cart     │ │ Socket   │ │ Leaflet  │  │
│  │ Context  │ │ Context  │ │ Context  │ │ Map      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │  HTTPS + WSS
┌────────────────────────▼────────────────────────────────┐
│                       SERVER                            │
│              Node.js + Express (Render)                 │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ REST API │ │ Socket   │ │ Auth     │ │ Rate     │  │
│  │ Routes   │ │ Server   │ │ Middleware│ │ Limiter  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
┌──────▼───┐  ┌───────▼──┐  ┌──────▼───┐
│ MongoDB  │  │  Redis   │  │  Stripe  │
│  Atlas   │  │  Cache   │  │   API    │
└──────────┘  └──────────┘  └──────────┘
