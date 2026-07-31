# 🏛️ CivicPulse

**Community-driven civic complaint prioritization and smart city issue mapping platform.**

CivicPulse empowers citizens to report, upvote, and track local issues — from potholes to broken streetlights — in real-time. Administrators can review, approve, and manage reported issues through a dedicated dashboard. The platform features live maps, real-time data feeds, duplicate detection, and role-based access control.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Supabase Setup](#1-supabase-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Backend Setup](#3-backend-setup)
- [User Roles](#-user-roles)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)

---

## ✨ Features

### For Citizens (Civic Users)
- 📝 **Report Issues** — Submit civic complaints with title, description, category, zone, map pin location, and photo evidence
- 🗺️ **Interactive Map** — Browse all reported issues on a live, searchable Leaflet map with Voyager tiles
- 🔼 **Upvote Issues** — Prioritize the most critical problems through community voting
- 📊 **Dashboard** — View trending issues sorted by upvote count with real-time updates
- 📋 **My Reports** — Track the status of your own submitted reports with a visual timeline

### For Administrators
- ✅ **Approvals Dashboard** — Dedicated table view to review, filter, and manage all reported issues
- 🔄 **Status Management** — Update issue status (Reported → Verified → In Progress → Resolved) in one click
- 🛡️ **Row Level Security** — Only admins can modify report statuses via Supabase RLS policies

### Platform-Wide
- 🔐 **Authentication** — Full login/signup flow powered by Supabase Auth
- 🔍 **Duplicate Detection** — Backend intelligence API checks for nearby duplicate reports using Haversine distance
- 📡 **Real-Time Updates** — Supabase Realtime broadcasts new reports and status changes to all connected clients instantly
- 📰 **News Scanner** — Backend service scrapes RSS feeds for potential civic issues

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (App Router) | React-based SSR/CSR framework |
| **UI Library** | React 19 | Component-based UI |
| **Styling** | Tailwind CSS v4 | Utility-first CSS with custom design tokens |
| **Maps** | Leaflet + react-leaflet | Interactive maps with CartoDB Voyager tiles |
| **Charts** | Recharts | Data visualization (installed, extensible) |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with Auth, Storage, Realtime |
| **Auth** | Supabase Auth | Email/password authentication with RBAC |
| **Realtime** | Supabase Realtime | WebSocket-based live data subscriptions |
| **Backend** | Spring Boot 3 (Java) | REST API for intelligence services |
| **Web Scraping** | Jsoup | HTML/RSS parsing for news scanning |
| **Fonts** | Inter + Plus Jakarta Sans | Google Fonts for premium typography |

---

## 🏗️ System Architecture

![System Architecture](diagram(3).svg)

---

## 📁 Project Structure

```
civic_pulse/
├── frontend/                          # Next.js 16 Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # Root layout (AuthProvider, NavBars)
│   │   │   ├── page.tsx               # Dashboard (Hero + Map + Feed)
│   │   │   ├── globals.css            # Design tokens & theme
│   │   │   ├── map/page.tsx           # Full-screen interactive map
│   │   │   ├── my-reports/page.tsx    # User's own reports (civic only)
│   │   │   ├── approvals/page.tsx     # Admin approvals table
│   │   │   └── auth/
│   │   │       ├── login/page.tsx     # Login page
│   │   │       └── register/page.tsx  # Registration page (with role picker)
│   │   ├── components/
│   │   │   ├── AuthProvider.tsx       # Global auth context (user, role)
│   │   │   ├── TopNavBar.tsx          # Desktop nav (role-aware)
│   │   │   ├── BottomNavBar.tsx       # Mobile nav (role-aware)
│   │   │   ├── MapComponent.tsx       # Leaflet map wrapper
│   │   │   ├── GlobalModalProvider.tsx# Event-driven modal system
│   │   │   ├── NewReportModal.tsx     # Report submission form
│   │   │   ├── TrendingComplaintCard.tsx # Feed card with upvotes
│   │   │   ├── MyReportCard.tsx       # Report card with timeline
│   │   │   └── StatusBadge.tsx        # Status pill component
│   │   └── lib/
│   │       └── supabaseClient.ts      # Supabase JS client singleton
│   ├── .env.local                     # Supabase credentials
│   └── package.json
│
├── backend/                           # Spring Boot Application
│   └── src/main/
│       ├── java/com/civicpulse/
│       │   ├── CivicPulseApplication.java      # Main entry point
│       │   ├── config/
│       │   │   └── CorsConfig.java              # CORS for localhost:3000
│       │   ├── controller/
│       │   │   ├── IntelligenceController.java  # /api/v1/intelligence/*
│       │   │   └── DispatchController.java      # /api/v1/dispatch/*
│       │   └── service/
│       │       ├── SupabaseClientService.java   # REST client for Supabase
│       │       └── NewsScannerService.java      # RSS feed scraper
│       └── resources/
│           └── application.yml                  # Server config (port 8082)
│
└── supabase/
    └── schema.sql                     # Full database schema + RLS policies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ and **npm**
- **Java** 17+ and **Maven** (or use the included Maven wrapper)
- A **Supabase** account ([supabase.com](https://supabase.com))

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste the entire contents of `supabase/schema.sql`, then click **Run**
3. Go to **Authentication → Providers → Email** and **disable** "Confirm email" (for development)
4. Copy your **Project URL** and **Anon Key** from **Settings → API**

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
# Edit .env.local and add your Supabase credentials:
#   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Start the development server
npm run dev
```

The frontend will be available at **http://localhost:3000**

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Run using Maven wrapper (no Maven installation needed)
# On Windows:
.\mvnw.cmd spring-boot:run

# On macOS/Linux:
./mvnw spring-boot:run
```

The backend API will be available at **http://localhost:8082**

> **Note:** The backend is optional for core functionality. The frontend works independently with Supabase for CRUD operations. The backend provides supplementary intelligence features (duplicate detection, news scanning).

---

## 👥 User Roles

| Feature | Civic (Citizen) | Admin |
|---------|:-:|:-:|
| View Dashboard & Map | ✅ | ✅ |
| Submit New Reports | ✅ | ❌ |
| Upvote Issues | ✅ | ✅ |
| View "My Reports" | ✅ | ❌ |
| View "Approvals" Tab | ❌ | ✅ |
| Change Report Status | ❌ | ✅ |
| See Admin Badge | ❌ | ✅ |

Roles are assigned during registration and stored in the `profiles` table. Row Level Security (RLS) policies enforce these permissions at the database level.

---

## 🔌 API Endpoints

### Spring Boot Backend (`localhost:8082`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/intelligence/cluster-duplicates` | Check if a new report is a duplicate (Haversine distance < 500m) |
| `GET` | `/api/v1/intelligence/audit-fairness` | Audit report distribution across zones |
| `GET` | `/api/v1/intelligence/scan-news` | Scrape RSS feeds for potential civic issues |
| `POST` | `/api/v1/dispatch/assign` | Assign an issue to a department |

### Supabase (Direct Client Access)

| Table | Operations | Auth Required |
|-------|-----------|:---:|
| `reports` | SELECT | ❌ (public) |
| `reports` | INSERT | ✅ (any authenticated user) |
| `reports` | UPDATE | ✅ (admin only) |
| `upvotes` | SELECT | ❌ (public) |
| `upvotes` | INSERT | ✅ (any authenticated user) |
| `profiles` | SELECT (own) | ✅ (own profile only) |

---

## 🗄️ Database Schema

### `profiles`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK, FK → auth.users) | User's auth ID |
| `role` | TEXT | `'civic'` or `'admin'` |
| `created_at` | TIMESTAMPTZ | Auto-set on creation |

### `reports`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `title` | TEXT | Issue title |
| `description` | TEXT | Detailed description |
| `category` | TEXT | Infrastructure, Sanitation, Utilities, Public Safety |
| `status` | TEXT | Reported → Verified → In Progress → Resolved |
| `zone` | TEXT | Geographic zone (Zone 1–5) |
| `lat` / `lng` | DOUBLE PRECISION | GPS coordinates |
| `user_id` | UUID (FK → auth.users) | Submitter |
| `upvotes_count` | INTEGER | Cached upvote total |
| `image_url` | TEXT | Photo evidence URL (Supabase Storage) |
| `created_at` | TIMESTAMPTZ | Submission timestamp |

### `upvotes`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `report_id` | UUID (FK → reports) | Associated report |
| `user_id` | UUID (FK → auth.users) | Voter |
| `created_at` | TIMESTAMPTZ | Vote timestamp |

> Unique constraint on `(report_id, user_id)` prevents double-voting.

---

## 📜 License

This project is for educational and demonstration purposes.

// The java backend's main work:

Smart Duplicate Detection (/cluster-duplicates): When a user tries to submit a new report on the map, the frontend sends the coordinates to the backend. The backend uses the Haversine formula to calculate the exact distance between the new report and all existing reports. If it finds a similar issue within 500 meters, it flags it as a potential duplicate to prevent spam!