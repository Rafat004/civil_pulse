# 🏛️ CivicPulse

**Community-driven civic issue reporting, tracking, and smart city mapping platform.**

CivicPulse empowers citizens to report, discover, discuss, follow, and track local issues, from potholes to broken streetlights, in real time. Administrators can verify, assign, manage, and resolve reports through a dedicated operations workspace.

The platform includes a social-style civic feed, interactive maps, persistent civic reactions, comments, following, notifications, status history, duplicate detection, smart suggestions, resolution evidence, and role-based access control.

---

## 🎥 Presentation Video

[Watch the CivicPulse Final Project Presentation](YOUR_PRESENTATION_VIDEO_LINK)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [User Roles](#-user-roles)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Team Members & Contributions](#-team-members--contributions)

---

## ✨ Features

### For Citizens

- 📝 **Report Issues** — Submit civic problems with title, description, category, map location, and photo evidence
- 📰 **Civic Social Feed** — Discover community issues through Latest, Most Affected, and Recently Updated views
- 🗺️ **Interactive Map** — Browse and filter reported issues geographically
- 🤝 **Civic Reactions** — Mark issues as `Affected` or `Confirmed`
- 💬 **Community Discussion** — Comment on reported issues and view official responses
- 🔔 **Following & Notifications** — Follow issues and receive important updates
- 📋 **My Reports** — Track personal reports and their lifecycle progress
- 📸 **Resolution Evidence** — View before-and-after evidence for resolved issues

### For Administrators

- 🛠️ **Admin Operations Workspace** — Review, search, filter, and manage civic issues
- 🔄 **Lifecycle Management** — Move reports through:

```text
Reported → Verified → Assigned → In Progress → Resolved
```

Special states include:

```text
Rejected · Duplicate · Reopened
```

- 🏢 **Department Assignment** — Assign issues to responsible departments
- ✅ **Issue Verification** — Verify legitimate civic reports
- 📢 **Official Responses** — Participate in issue discussions as an official administrator
- 📸 **Resolution Workflow** — Add resolution notes and after-photo evidence
- 🔁 **Reopening** — Reopen resolved issues when further work is required

### Smart Features

- 🔍 **Duplicate Detection** — Finds likely existing reports using location, category, title, and description similarity
- 🧠 **Category Suggestion** — Suggests a category from the Citizen's report text
- 🏢 **Department Recommendation** — Suggests an appropriate department for Administrator review

Smart features are advisory. Citizens and Administrators remain responsible for final decisions.

### Platform-Wide

- 🔐 **Authentication** — Login/signup through Supabase Auth
- 🛡️ **Role-Based Access Control** — Citizen/Admin permissions enforced with Supabase RLS
- 📡 **Realtime Updates** — Live updates for reports, reactions, comments, notifications, and workflow changes
- 🕒 **Status History** — Persistent lifecycle history for every report
- 📰 **News Scanner** — Optional backend RSS/news scanning utility

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 16.2 | Application framework and App Router |
| **UI** | React 19 + TypeScript | Component-based frontend development |
| **Styling** | Tailwind CSS v4 | Responsive UI and custom design system |
| **UI Utilities** | Lucide React + shadcn/ui tooling | Icons and UI foundations |
| **Maps** | Leaflet 1.9 + React Leaflet 5 | Interactive maps and location selection |
| **Map Tiles** | Google raster tiles | Base map display |
| **Location Search** | OpenStreetMap Nominatim | Place/location search |
| **Database** | Supabase PostgreSQL | Persistent application data |
| **Authentication** | Supabase Auth | Citizen/Admin authentication |
| **Storage** | Supabase Storage | Report and resolution images |
| **Realtime** | Supabase Realtime | Live application updates |
| **Backend** | Spring Boot 3.2.5 + Java 17 | Intelligence REST API |
| **Web Scraping** | Jsoup 1.17 | RSS/news parsing |
| **Fonts** | Inter + Plus Jakarta Sans | Application typography |

---

## 🏗️ System Architecture

CivicPulse separates responsibilities between three main layers:

```text
Next.js     → presentation and user interaction
Supabase    → database, authentication, storage, realtime, and authorization
Spring Boot → advisory intelligence and analysis
```

![System Architecture](diagram%20%282%29.svg)

Core CRUD operations are handled through Supabase, while Spring Boot provides supplementary smart features.

---

## 📁 Project Structure

```text
civic_pulse/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Social-style civic feed
│   │   │   ├── issues/[id]/page.tsx   # Issue Detail
│   │   │   ├── map/page.tsx           # Interactive public map
│   │   │   ├── my-reports/page.tsx    # Citizen's reports
│   │   │   ├── notifications/page.tsx # Notifications
│   │   │   ├── approvals/page.tsx     # Admin Operations workspace
│   │   │   └── auth/
│   │   │       ├── login/page.tsx
│   │   │       └── register/page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── TopNavBar.tsx
│   │   │   ├── BottomNavBar.tsx
│   │   │   ├── MapComponent.tsx
│   │   │   ├── NewReportModal.tsx
│   │   │   ├── TrendingComplaintCard.tsx
│   │   │   ├── MyReportCard.tsx
│   │   │   └── SmartSuggestion.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── feed.ts
│   │   │   ├── issues.ts
│   │   │   ├── reactions.ts
│   │   │   ├── comments.ts
│   │   │   ├── following.ts
│   │   │   ├── notifications.ts
│   │   │   ├── admin.ts
│   │   │   └── intelligence.ts
│   │   │
│   │   └── lib/
│   │       ├── constants.ts
│   │       ├── config.ts
│   │       ├── mapUtils.ts
│   │       ├── supabaseClient.ts
│   │       └── types.ts
│   │
│   └── package.json
│
├── backend/
│   └── src/main/
│       ├── java/com/civicpulse/
│       │   ├── controller/
│       │   │   ├── IntelligenceController.java
│       │   │   └── SmartController.java
│       │   └── service/
│       │       ├── IntelligenceDataSource.java
│       │       ├── SmartService.java
│       │       ├── SupabaseClientService.java
│       │       └── NewsScannerService.java
│       └── resources/
│           └── application.yml
│
├── supabase/
│   ├── migrations/
│   ├── schema.sql
│   └── demo_seed.sql
│
└── docs/
    ├── PRODUCT_SPEC.md
    ├── ARCHITECTURE.md
    ├── DATABASE.md
    ├── ROADMAP.md
    └── DEMO_RUNBOOK.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Java** 17+
- Maven or the included Maven Wrapper
- A **Supabase** project

### 1. Supabase Setup

For a fresh project, run:

```text
supabase/schema.sql
```

through the Supabase SQL Editor.

Enable Email/Password authentication and obtain the project URL and public anon key from Supabase.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8082
```

Then run:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

### 3. Backend Setup

Configure:

```env
SUPABASE_URL=https://your-project.supabase.co/rest/v1/
SUPABASE_KEY=your-public-anon-key
DUPLICATE_RADIUS_METERS=500
```

Then run:

```bash
cd backend
./mvnw spring-boot:run
```

On Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Backend:

```text
http://localhost:8082
```

> The Spring Boot backend provides supplementary intelligence features. Core CivicPulse functionality remains Supabase-backed.

### 4. Demo Setup

See:

[`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md)

for the reproducible Citizen/Admin demonstration setup and demo seed data.

---

## 👥 User Roles

| Feature | Citizen | Admin |
|---------|:------:|:-----:|
| View Feed & Map | ✅ | ✅ |
| Submit Reports | ✅ | ❌ |
| Edit Own `Reported` Report | ✅ | ❌ |
| Mark Affected / Confirmed | ✅ | ✅ |
| Comment on Issues | ✅ | ✅ |
| Follow Issues | ✅ | ✅ |
| Receive Notifications | ✅ | ✅ |
| View My Reports | ✅ | ❌ |
| Access Admin Operations | ❌ | ✅ |
| Verify Issues | ❌ | ✅ |
| Assign Departments | ❌ | ✅ |
| Change Lifecycle Status | ❌ | ✅ |
| Mark Duplicate / Rejected | ❌ | ✅ |
| Resolve / Reopen Issues | ❌ | ✅ |

Normal registration always creates a `civic` profile. Administrator access is provisioned separately through a trusted setup process.

---

## 🔌 API Endpoints

### Spring Boot Intelligence API

Base URL:

```text
http://localhost:8082/api/v1/intelligence
```

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/cluster-duplicates` | Return likely duplicate reports |
| `POST` | `/suggest-category` | Suggest a civic report category |
| `POST` | `/recommend-department` | Recommend a department for Admin review |
| `GET` | `/audit-fairness` | Summarize report distribution by zone |
| `GET` | `/scan-news` | Scan an RSS/news source |

---

## 🗄️ Database Schema

### `profiles`

Stores user identity and role information.

Main fields:

```text
id
role
full_name
created_at
```

### `reports`

Stores civic reports and lifecycle information.

Main fields:

```text
id
title
description
category
status
zone
lat
lng
user_id
image_url
department_id
duplicate_of
resolution_note
resolution_image_url
resolved_at
created_at
updated_at
```

### `report_reactions`

Stores persistent:

```text
affected
confirmed
```

reactions.

### Additional Main Tables

- `comments`
- `report_followers`
- `notifications`
- `report_status_history`
- `departments`

Supabase Row Level Security and trusted database functions protect Citizen/Admin permissions and lifecycle changes.

---

## 👥 Team Members & Contributions

| Member | Student ID | Contribution |
|--------|------------|--------------|
| **Rafatul Islam** | **230041228** | Developed the foundational implementation of CivicPulse, establishing the initial project structure and core functionality. |
| **Abdullah Ibn Yousuf** | **230041246** | Added and improved major project features, strengthened existing functionality, improved the user experience, and integrated later parts of the system. |
| **Rakin Al Shahriar** | **230041208** | Contributed to project planning and design decisions, including system architecture, technology-stack selection, feature planning, and overall development direction. |

---

## 📜 License

This project was developed as a university course project for educational and demonstration purposes.