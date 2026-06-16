# <img src="frontend/public/hero.png" width="48" height="48" alt="Collixa Logo" align="center"> Collixa - Intent-Based Collaboration Marketplace

![Collixa Banner](https://img.shields.io/badge/Status-Active-brightgreen)
![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?logo=next.js)
![Express](https://img.shields.io/badge/Backend-Express.js-gray?logo=express)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue?logo=postgresql)
![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css)
![AI](https://img.shields.io/badge/AI-Gemini%20Flash-orange)

### 📌 Overview
**Collixa** is a premium, full-stack intent-based collaboration platform designed to bridge the gap between vision and execution. Leveraging AI-driven matchmaking and a robust credit-based "Wealth Protocol," it allows users to manifest "Intents" (projects), build "Tribes" (teams), and discover world-class talent.

#### Project Objectives
- **Intent Manifestation:** Precisely define and broadcast project visions and budgets.
- **Intelligent Matching:** Seamlessly connect "Intents" with collaborators via AI.
- **Dynamic Collaboration:** Facilitate rapid formation and management of execution "Tribes".
- **Real-Time Synergy:** Enable high-fidelity communication and presence tracking for teams.
- **Skill Liquidity:** Foster a robust ecosystem for professional skill exchange.
- **Gamified Engagement:** Track progress through XP, achievements, and milestones.

---

### ✨ Key Features

| Module | Capability | Tech Used |
| :--- | :--- | :--- |
| **Intent Marketplace** | Post project visions, budgets, and timelines. | Next.js + Express |
| **Tribe Architecture** | Form high-performance squads based on shared goals. | PostgreSQL + Express |
| **AI Matching Engine** | Intelligent collaborator suggestions using Google Gemini. | Google Gemini Flash AI |
| **Wealth Protocol** | Credit wallet, Voucher vault, and simulated payment workflows. | Internal API + PostgreSQL |
| **Skill Hub** | Discovery and exchange of professional skills. | Lucide + Express |
| **Real-time Hub** | Integrated chat, video meetings (Jitsi), and presence. | Socket.io + React + Jitsi |
| **Admin Control Center**| Granular control over users, credits, and system health. | Next.js + Express |

---

### 🏗️ Architecture & Core Tech Stack
Collixa is logically split into two service layers, with a modern, high-performance stack for resilience and speed.

| Layer | Primary Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Next.js 14 | Component-based UI with App Router for fast, dynamic rendering. |
| **Styling & UI** | Tailwind CSS + Framer Motion | Modern, minimalist design with smooth micro-animations. |
| **Backend** | Node.js + Express | Highly scalable server-side environment for API routing and services. |
| **Database** | Supabase (PostgreSQL) | Serverless relational database for persistent data storage. |
| **Storage** | Supabase Storage / Multer | File storage for project media and user attachments. |
| **AI/ML** | Google Gemini Flash AI | Core LLM for intent analysis, matching, and content suggestions. |
| **Auth** | JWT + Bcryptjs | Secure, session-based authentication and role-based access control. |
| **Communication**| Nodemailer / Socket.io / Jitsi | Email notifications, real-time chat, and integrated virtual meetings. |

---

### 🔐 Authentication & API Flow

#### Registration & Login
1. User submits credentials to `/api/auth/register` or `/api/auth/login`.
2. Password is hashed with bcrypt (10 rounds).
3. User record is created/validated in Supabase PostgreSQL.
4. JWT token is generated containing user ID, email, and role.
5. Token is returned to the frontend and stored for protected routes.

#### Protected Requests
1. Frontend sends JWT in the `Authorization: Bearer <token>` header.
2. Backend middleware validates the token using `JWT_SECRET`.
3. If valid, user context is attached to the request (`req.user`).
4. Route handler processes the request using the attached context.

---

### 🗄️ Database Schema (Core)
The platform uses Supabase PostgreSQL. Key entity structures include:

**Users Table:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'USER' CHECK (role IN ('USER', 'VERIFIED_USER', 'ADMIN')),
  is_verified BOOLEAN DEFAULT false,
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(255),
  reset_otp VARCHAR(6),
  reset_otp_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 🌐 Key API Endpoints

#### Public Routes
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Register a new user |
| `/api/auth/login` | `POST` | Authenticate user and return JWT |
| `/api/auth/forgot-password` | `POST` | Request password reset OTP |
| `/api/intents/search/:keyword` | `GET` | Search public intents |

#### Protected Routes (Requires JWT)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/verify` | `GET` | Verify token validity |
| `/api/auth/profile` | `GET/PUT` | Get or update user profile |
| `/api/intents` | `GET/POST` | Fetch or create an intent |
| `/api/intents/:id/request` | `POST` | Send request to join an intent |
| `/api/skills` | `GET/POST` | Browse or add professional skills |
| `/api/chat` | `GET/POST` | Access real-time chat history / send messages |

---

### ⚙️ Local Setup and Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/AkankshaRaj07/Collixa.git
cd Collixa
```

#### 2. Configure Environment Variables
Create `.env` files in both `frontend/` and `backend/` directories.

**Backend (`backend/.env`):**
| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public API key |
| `JWT_SECRET` | Secure string for token generation |
| `FRONTEND_URL` | Frontend URL (default: `http://localhost:3001`) |
| `GEMINI_API_KEY` | Google AI Studio API Key |
| `SIMULATION_KEY` | Simulated Payment Gateway Key |

**Frontend (`frontend/.env.local`):**
| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000/api` |

#### 3. Run Development Servers

**Backend Setup:**
```bash
cd backend
npm install
npm run dev
```

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

---

### 🎨 Design Philosophy
Collixa features a **premium, modern UI** built for high-end user experiences. The interface emphasizes:
- **Glassmorphism**: Subtle transparency and blurred backgrounds.
- **Micro-interactions**: Fluid transitions using Framer Motion.
- **Responsive Design**: Fully optimized for mobile, tablet, and desktop.
- **Aesthetic Harmony**: A curated color palette balancing professional productivity with flair.

---

### 📄 License & Acknowledgements
Distributed under the **MIT License**.

Built with ❤️ by the Collixa Team.
