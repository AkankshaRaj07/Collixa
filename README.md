# <img src="frontend/public/hero.png" width="48" height="48" alt="Collixa Logo" align="center"> Collixa - Intent-Based Collaboration Marketplace

### 📌 Overview
**Collixa** is a premium, full-stack collaboration platform designed to bridge the gap between vision and execution. It allows users to manifest "Intents" (projects), build "Tribes" (teams), and discover world-class talent through an AI-enhanced matching engine.

#### Project Objectives
- **Intent Manifestation:** Precisely define and broadcast project visions and budgets.
- **Intelligent Matching:** Seamlessly connect "Intents" with collaborators via AI.
- **Dynamic Collaboration:** Facilitate rapid formation and management of execution "Tribes".
- **Real-Time Synergy:** Enable high-fidelity communication and presence tracking for teams.
- **Skill Liquidity:** Foster a robust ecosystem for professional skill exchange.
- **Gamified Engagement:** Track progress through XP, achievements, and milestones.

---

### 🏗️ Architecture & Core Tech Stack
Collixa is logically split into two service layers, with a modern, high-performance stack for resilience and speed.

| Layer | Primary Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React + Next.js 14 | Component-based UI with App Router for fast, dynamic rendering. |
| **Styling & UI** | Tailwind CSS + Framer Motion + Shadcn/UI | Modern, minimalist design with smooth micro-animations. |
| **Icons** | Lucide-React | Clean, consistent SVG icons. |
| **Backend** | Node.js + Express | Highly scalable server-side environment for API routing and services. |
| **Database** | Supabase (PostgreSQL) | Serverless relational database for persistent data storage. |
| **Storage** | Supabase Storage | File storage for project media and user attachments. |
| **AI/ML** | Google Gemini | Core LLM for intent analysis, matching, and content suggestions. |
| **Auth** | JWT + Bcryptjs | Secure, session-based authentication and role-based access control. |
| **Communication**| Nodemailer / Socket.io / Jitsi Meet | Email notifications, real-time chat, and integrated virtual meetings. |

---

### ✨ Platform Features
Collixa provides specialized modules for every stage of project collaboration:

| Module | Capability | Tech Used |
| :--- | :--- | :--- |
| **Intent Marketplace** | Post project visions, budgets, and timelines. | Next.js + Express |
| **Tribe Collaboration** | Form and manage specialized teams for project execution. | PostgreSQL + Express |
| **AI Matching Engine** | Intelligent collaborator suggestions based on intent goals. | Google Gemini |
| **Skill Hub** | Discovery and exchange of professional skills. | Lucide + Express |
| **Real-time Hub** | Integrated chat, video meetings (Jitsi), and presence indicators. | Socket.io + React + Jitsi |
| **Gamification** | Track XP, achievements, and project milestones. | PostgreSQL |

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

#### Password Reset Flow
1. User requests OTP via `/api/auth/forgot-password`.
2. 6-digit OTP is generated and stored in the database with a 5-minute expiry.
3. User submits the OTP and a new password to `/api/auth/reset-password`.
4. OTP is validated; password is hashed and updated; OTP is cleared.

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
| `/api/auth/reset-password` | `POST` | Reset password using OTP |
| `/api/intents/search/:keyword` | `GET` | Search public intents |
| `/api/stats` | `GET` | Get platform statistics |

#### Protected Routes (Requires JWT)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/auth/verify` | `GET` | Verify token validity |
| `/api/auth/profile` | `GET/PUT` | Get or update user profile |
| `/api/auth/change-password` | `POST` | Change user password |
| `/api/intents` | `GET/POST` | Fetch or create an intent |
| `/api/intents/:id/request` | `POST` | Send request to join an intent |
| `/api/skills` | `GET/POST` | Browse or add professional skills |
| `/api/chat` | `GET/POST` | Access real-time chat history / send messages |

---

### ⚙️ Local Setup and Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/AkankshaRaj07/Collixa.git
cd collixa
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
*Server will start on `http://localhost:5000`*

**Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```
*The application will be available at `http://localhost:3001`*

---

### 📄 License & Acknowledgements
This project is licensed under the MIT License.

**Powered by:**
⚡ **Next.js** | 🚀 **Express** | 🧠 **Google Gemini** | 💾 **Supabase** | 🎨 **Tailwind CSS** | 🎥 **Jitsi** | 💳 **Stripe**
