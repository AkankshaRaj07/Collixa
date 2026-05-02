# <img src="frontend/public/hero.png" width="48" height="48" alt="Collixa Logo" align="center"> Collixa - Intent-Based Skill & Collaboration Marketplace

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.22-lightgrey?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)

**Collixa** is a premium, high-performance platform designed to manifest ideas through intent-based collaboration. It bridges the gap between vision and execution by allowing users to post "Intents," build "Tribes," and discover world-class talent through an AI-enhanced matching engine.

---

## ✨ Key Features

- 🎯 **Intent Manifestation**: Post your vision, define budget, and set timelines to attract the right collaborators.
- 🤝 **Tribe Collaboration**: Create and manage groups for specialized project execution.
- 🧠 **AI-Powered Matching**: Leverages Google Gemini AI to analyze intents and suggest the best skill matches.
- 💬 **Real-time Hub**: Integrated messaging and notification system for seamless team communication.
- 🏆 **Gamification & Progress**: Track XP, achievements, and project milestones in a modern dashboard.
- 💳 **Secure Transactions**: Integrated Stripe payments for milestone-based project funding.
- 🎨 **Modern Sage Aesthetics**: A beautiful, minimalist UI designed for focus and productivity.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Framer Motion (Animations)
- **Icons**: Lucide React
- **State Management**: React Hooks & Context API

### Backend
- **Server**: Express.js (Node.js)
- **Authentication**: JWT & Bcryptjs
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: Google Generative AI (Gemini)
- **Communications**: SendGrid & Nodemailer
- **Payments**: Stripe

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Supabase Account**: For database and authentication
- **Google AI Key**: For intent analysis features

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/collixa.git
   cd collixa
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env # Update with your credentials
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

---

## 📂 Project Structure

```text
collixa/
├── frontend/           # Next.js Application
│   ├── app/            # App Router (Pages & Layouts)
│   ├── components/     # UI Design System
│   └── lib/            # Utilities & Services
├── backend/            # Express.js Server
│   ├── src/
│   │   ├── controllers/ # Logic Handlers
│   │   ├── routes/      # API Endpoints
│   │   └── models/      # Database Schemas
└── render.yaml         # Deployment configuration
```

---

## 🗺️ Roadmap

- [x] Core Authentication & Profile Management
- [x] Intent Posting & Search
- [x] Tribe Creation & Collaboration Requests
- [ ] Advanced AI-Driven Skill Gap Analysis
- [ ] Mobile Application (React Native)
- [ ] Decentralized Identity Integration

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the Collixa Team.
