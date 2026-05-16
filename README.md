# ✦ Boomly — AI Operating System for Ambitious People

> **Explode Your Productivity.** A futuristic, AI-native workspace combining a 3-panel OS layout, animated glassmorphism UI, and Claude AI.

---

## 🚀 Quick Start

```bash
git clone https://github.com/your-org/boomly.git
cd boomly
npm install
cp .env.example .env.local   # fill in your keys
npm run dev
# → http://localhost:3000
```

---

## 🔑 Environment Variables (.env.local)

```env
ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

---

## 🔥 Firebase Setup

1. Create project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password + Google
3. Enable **Firestore** (production mode)
4. Deploy security rules:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

---

## 🏗 Layout Architecture

```
Landing (/)
├── Auth → /auth/login | /auth/signup

App Shell (3-panel OS layout)
├── [LEFT]  Sidebar      — collapsible, glowing nav, 9 sections
├── [MID]   Main Content — page-specific content
└── [RIGHT] Jarvis Panel — AI suggestions, focus score, memory, pomodoro

Pages:
├── /dashboard  — stats, chart, activity feed, AI insight
├── /planner    — AI day planner (Claude generates schedule)
├── /tasks      — Kanban board + AI task breakdown
├── /notes      — Rich editor + AI assistant
├── /focus      — Pomodoro timer + streak
├── /teams      — Collaboration
├── /calendar   — Monthly calendar
├── /analytics  — Charts, heatmaps
└── /settings   — Profile, AI, notifications
```

---

## 🤖 AI Features (Claude)

| Route | Description |
|---|---|
| `POST /api/ai/plan` | Generates optimized daily schedule |
| `POST /api/ai/breakdown` | Breaks any task into subtasks |
| `POST /api/ai/notes` | AI assistant for note content |
| `POST /api/ai/insight` | Daily personalized AI insight |

---

## 🎨 Design System

| Token | Value |
|---|---|
| Background | `#020209` → `#07071a` → `#0b0b22` |
| Brand Violet | `#6366f1` / `#818cf8` |
| Brand Cyan | `#06b6d4` / `#22d3ee` |
| Glass | `rgba(255,255,255,0.03)` + `backdrop-filter:blur(24px)` |
| Glow | `0 0 20px rgba(99,102,241,.35)` |
| Font | Syne (headings) · DM Sans (body) · JetBrains Mono |

---

## 🚀 Deploy to Vercel

```bash
npx vercel
# Add all env vars in Vercel dashboard → Settings → Environment Variables
```

---

## 🛠 Tech Stack

Next.js 15 · TypeScript · Tailwind CSS · Framer Motion · Firebase · Zustand · Recharts · Anthropic Claude · Vercel

---

© 2025 Boomly. Built for the most ambitious version of you.

---

## 🔑 Fix: auth/invalid-credential or 400 on accounts:lookup

If login/signup succeeds but you get bounced back or see a 400 on
`identitytoolkit.googleapis.com/v1/accounts:lookup`, do this:

### 1. Authorize localhost in Firebase Console
Firebase Auth blocks requests from unlisted domains.
Go to: **Firebase Console → Authentication → Settings → Authorized domains**
Click **Add domain** → type `localhost` → Save.

For production, also add your Vercel domain (e.g. `boomly.vercel.app`).

### 2. Enable Email/Password sign-in
**Firebase Console → Authentication → Sign-in method → Email/Password → Enable**

### 3. Enable Google sign-in (optional)
**Firebase Console → Authentication → Sign-in method → Google → Enable**
Set your support email and save.

---

## 🏗 Architecture & Stability

### Will the backend crash under load?

**No backend server to crash.** Boomly is serverless by design:

| Layer | Technology | Scales to |
|---|---|---|
| Auth | Firebase Auth | Millions of users |
| Database | Firestore | Auto-scales, pay per read/write |
| AI routes | Next.js API Routes on Vercel | Auto-scales, cold starts in ~200ms |
| Static assets | Vercel Edge Network | CDN, 99.99% uptime SLA |
| Real-time | Firestore `onSnapshot` listeners | Handled by Firebase infrastructure |

### How does collaboration work?

All shared data (tasks, notes, goals) is stored in Firestore with real-time listeners via `onSnapshot`. When User A updates a task, User B's UI updates in <500ms automatically — no polling, no WebSockets to manage.

### Offline support

Firestore's `persistentLocalCache` (IndexedDB) means:
- Reads work offline from cache
- Writes are queued and synced when back online
- No data loss during network interruptions

### AI routes stability

Each `/api/ai/*` route is a stateless Next.js Edge function:
- Calls Anthropic API and returns
- No state = no memory leaks
- Vercel auto-retries failed deployments
- Rate limit: add `export const maxDuration = 30` for longer AI calls

### Invite code security

- Codes are 6-char alphanumeric, ~2.2 billion combinations
- Stored in Firestore with 7-day TTL
- Firestore rules: only authenticated users can validate codes
- Owner can revoke/regenerate anytime

### What doesn't scale yet (to fix for production)

1. **Real-time collaboration** on the same task — currently last-write-wins. Add Firestore transactions for concurrent edits.
2. **Team size** — currently capped at 4 by the UI; Firestore can handle unlimited.
3. **AI memory** — currently a UI placeholder; production needs a vector DB (Pinecone/Weaviate) for semantic search over user context.
4. **File attachments in notes** — Firebase Storage integration is set up but not connected to the editor yet.
