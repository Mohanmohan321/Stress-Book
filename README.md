# StressBook — Workplace Mental Wellness Platform

A full-stack web application for employee stress monitoring, AI-powered wellness support, and admin-level mental health analytics. Employees share how they feel, the system automatically classifies stress levels and categories, and admins get real-time dashboards to identify and support at-risk team members.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [User Flow](#user-flow)
7. [Admin Flow](#admin-flow)
8. [AI & Stress Detection](#ai--stress-detection)
9. [Installation & Setup](#installation--setup)
10. [Configuration](#configuration)
11. [Security Notes](#security-notes)
12. [Sample CSV](#sample-csv)

---

## Overview

| What | Detail |
|------|--------|
| **Purpose** | Workplace mental wellness monitoring for HR and team leads |
| **Users** | Employees (User role) and HR/Managers (Admin role) |
| **Key Differentiator** | Hidden, automatic stress detection — users simply share feelings, the system classifies them |
| **AI Feature** | RAG-powered chatbot using each user's own post history via Mistral API |
| **Analytics** | Admin dashboards with pie charts, trend lines, and at-risk user alerts |

---

## Tech Stack

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| Python | 3.x | Runtime |
| Flask | latest | REST API framework |
| Flask-CORS | latest | Cross-origin support |
| SQLite 3 | built-in | Database (file: `stress.db`) |
| PyJWT | latest | JWT authentication (24-hour tokens) |
| requests | latest | HTTP client for Mistral API |
| python-dotenv | latest | Environment variable management |

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| React.js | 19.2.4 | UI library (Create React App) |
| Axios | 1.13.6 | HTTP client |
| Recharts | 3.8.1 | Charts (PieChart, LineChart) |
| react-scripts | 5.0.1 | Build tooling |

### External Services

| Service | Model / Plan | Role |
|---------|-------------|------|
| Mistral AI | `mistral-small` | AI chatbot responses |
| Google Fonts | Roboto | Typography |

### Design System

Material You (MD3) with a purple seed color (`#6750A4`). Dark/light mode toggle stored in `localStorage`.

---

## Project Structure

```
Stress-Book/
│
├── app.py                          # Flask backend — all 28+ API routes (~1725 lines)
├── .env                            # MISTRAL_API_KEY (never commit this)
├── requirements.txt                # Python dependencies
├── stress.db                       # SQLite database (auto-created on first run)
├── run_backend_no_reload.py        # Alternative backend runner (no hot-reload)
├── sample_users.csv                # 10 sample users for bulk CSV import
│
├── uploads/                        # Uploaded images (profile pics, post images)
│   └── ...
│
└── frontend/
    ├── package.json                # npm dependencies & scripts
    ├── public/
    │   ├── index.html              # HTML entry point
    │   └── manifest.json           # PWA metadata
    └── src/
        ├── index.js                # React DOM render
        ├── index.css               # Base reset styles
        ├── App.js                  # Root component: auth routing (Login → User/Admin)
        ├── App.css                 # All styles (~800 lines, Material You tokens)
        └── components/
            ├── LoginPage.js        # User & Admin login + user registration
            ├── UserHome.js         # Full user interface (~975 lines)
            ├── AdminDashboard.js   # Admin navigation hub + all admin sections (~619 lines)
            ├── AdminFeed.jsx       # Admin read-only post feed with filters
            ├── BlogList.jsx        # Blog article listing with category tabs
            ├── BlogDetail.jsx      # Full blog article reader
            └── BlogAdmin.jsx       # Admin blog creation and management
```

---

## Database Schema

10 tables auto-created by `init_db()` on first backend start.

### `admins`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
name        TEXT
email       TEXT UNIQUE
password    TEXT
```

### `users`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
name        TEXT
email       TEXT UNIQUE
password    TEXT
profile_pic TEXT              -- URL path to uploaded image
admin_id    INTEGER           -- FK → admins.id (who created this user)
last_active TIMESTAMP         -- Updated on login, post, comment, chat
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
is_private  INTEGER DEFAULT 0 -- 0 = public, 1 = private account
```

### `posts`
```sql
id           INTEGER PRIMARY KEY AUTOINCREMENT
user_id      INTEGER           -- FK → users.id
content      TEXT
stress_level TEXT              -- "Low" | "Medium" | "High" (auto-detected)
category     TEXT              -- "Academic" | "Work" | "Personal" | "Financial" | "Health" | "Other"
image        TEXT              -- Optional post image URL
is_deleted   INTEGER DEFAULT 0 -- Soft delete flag (1 = hidden)
created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### `comments`
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
post_id    INTEGER  -- FK → posts.id
user_id    INTEGER  -- FK → users.id
comment    TEXT
created_at TIMESTAMP
```

### `likes`
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
post_id    INTEGER  -- FK → posts.id
user_id    INTEGER  -- FK → users.id
created_at TIMESTAMP
UNIQUE(post_id, user_id)  -- one like per user per post
```

### `reports`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
post_id     INTEGER  -- FK → posts.id
reported_by INTEGER  -- FK → users.id
reason      TEXT
status      TEXT     -- "pending" | "resolved" | "ignored"
created_at  TIMESTAMP
```

### `follows`
```sql
id           INTEGER PRIMARY KEY AUTOINCREMENT
follower_id  INTEGER  -- FK → users.id
following_id INTEGER  -- FK → users.id
created_at   TIMESTAMP
UNIQUE(follower_id, following_id)
```

### `follow_requests`
```sql
id           INTEGER PRIMARY KEY AUTOINCREMENT
requester_id INTEGER  -- FK → users.id
target_id    INTEGER  -- FK → users.id
status       TEXT     -- "pending" | "accepted" | "declined"
created_at   TIMESTAMP
UNIQUE(requester_id, target_id)
```

### `notifications`
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
user_id    INTEGER          -- FK → users.id (recipient)
message    TEXT
is_read    INTEGER DEFAULT 0
notif_type TEXT             -- "follow_request" | NULL
related_id INTEGER          -- FK to follow_requests.id or posts.id
created_at TIMESTAMP
```

### `blogs`
```sql
id         INTEGER PRIMARY KEY AUTOINCREMENT
admin_id   INTEGER  -- FK → admins.id
title      TEXT
content    TEXT
category   TEXT     -- Same values as posts.category
image      TEXT     -- Optional cover image URL
created_at TIMESTAMP
```

### `messages` (for future DM feature)
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
sender_id   INTEGER  -- FK → users.id
receiver_id INTEGER  -- FK → users.id
message     TEXT
created_at  TIMESTAMP
```

---

## API Reference

All protected routes require `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/login` | None | Admin login → returns `{token, role, name, email}` |
| POST | `/user/register` | None | User self-registration |
| POST | `/user/login` | None | User login → returns `{token, role, user_id, name, email, admin}` |

> **Default admin:** `admin@gmail.com` / `ADMIN@123` (auto-seeded on first run). Admin registration endpoint is intentionally disabled.

---

### User Management (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/add_user` | Admin | Create a single user manually |
| GET | `/get_users` | Admin | List all users with metadata |
| DELETE | `/delete_user/<id>` | Admin | Hard-delete a user account |
| POST | `/import_users_csv` | Admin | Bulk create users from uploaded CSV |
| GET | `/export_users_csv` | Admin | Download all users as CSV |

---

### Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | User | Own profile: info + all posts + follower/following counts |
| GET | `/profile/<user_id>` | User | Another user's profile (returns locked=true if private and not followed) |
| POST | `/upload_profile_pic` | User | Upload/replace profile picture (multipart/form-data) |
| PUT | `/profile/privacy` | User | Toggle `is_private` flag (public ↔ private) |

---

### Posts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/post` | User | Create post; backend auto-detects stress level and category |
| GET | `/posts` | User | Feed posts. Query params: `?category=&stress_level=&sort_by=` |
| DELETE | `/posts/<id>` | User | Soft-delete own post |
| GET | `/admin/posts` | Admin | All posts with filters: `user_id`, `stress_level`, `date_from`, `date_to` |
| DELETE | `/admin/posts/<id>` | Admin | Admin soft-deletes any post |

---

### Comments & Likes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/comment` | User | Add comment to a post; creates notification for post owner |
| POST | `/posts/<id>/like` | User | Toggle like on a post (like / unlike) |

---

### Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reports` | User | Report a post with a reason |
| GET | `/reports` | Admin | View all reports with post and user details |
| PUT | `/reports/<id>` | Admin | Resolve (soft-deletes the post) or ignore the report |

---

### Follow System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/follow/<user_id>` | User | Toggle follow: direct follow for public accounts, sends follow request for private ones |
| POST | `/follow-request/<req_id>/accept` | User | Accept a pending follow request |
| POST | `/follow-request/<req_id>/decline` | User | Decline a pending follow request |

---

### Search

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/search?query=` | User | Live search users by name; returns name, profile pic, email |

---

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | User | Get all notifications + `unread_count` |
| PUT | `/notifications/<id>` | User | Mark one notification as read |
| PUT | `/notifications/read-all` | User | Mark all notifications as read |

---

### AI Chatbot

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/chat` | User | RAG chatbot: uses current user's last 10 posts + relevant blogs as context |

---

### Blogs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/blogs` | Admin | Create a new blog post (title, content, category, optional image) |
| GET | `/blogs` | User | List all blogs; supports `?category=` filter |
| GET | `/blogs/<id>` | User | View full blog article |
| DELETE | `/blogs/<id>` | Admin | Delete a blog post |

---

### Analytics (Admin only)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/overview` | Admin | Summary: total users, total posts, stress distribution, pending reports count |
| GET | `/analytics/high-risk-users` | Admin | Users with 3 or more high-stress posts |
| GET | `/analytics/trends` | Admin | Daily counts of high / medium / low stress posts |
| GET | `/export_posts_csv` | Admin | Download all posts as CSV |
| GET | `/export_analytics_csv` | Admin | Download daily analytics as CSV |

---

## User Flow

### New User Journey

```
Login Page (User tab)
    │
    ├─ [New User] → Register form → back to Login
    │
    └─ [Login] → User Home
                    │
                    ├─ Profile tab
                    │     ├─ View own stats (posts, last active, follower counts)
                    │     ├─ Upload profile picture
                    │     ├─ Toggle account privacy (Public / Private)
                    │     └─ View all personal posts
                    │
                    ├─ Add Post tab
                    │     ├─ Type feelings in text area
                    │     ├─ Optionally upload an image
                    │     ├─ Choose category or leave as "Auto-Detect"
                    │     ├─ Click "Post"
                    │     └─ System returns: detected stress level + category
                    │
                    ├─ Feed tab
                    │     ├─ Browse posts from all users (newest first)
                    │     ├─ Filter by category and/or stress level
                    │     ├─ Like posts (toggle)
                    │     ├─ Comment on posts (sends notification to owner)
                    │     ├─ Report a post (opens reason modal)
                    │     └─ Click username → view their profile
                    │
                    ├─ Blogs tab
                    │     ├─ Browse admin-published articles
                    │     ├─ Filter by category
                    │     └─ Click article → full blog detail view
                    │
                    ├─ Search (navbar)
                    │     ├─ Type a name → live dropdown
                    │     └─ Click user → view profile + follow/unfollow
                    │
                    ├─ Notifications (bell icon)
                    │     ├─ Follow requests, comment alerts
                    │     ├─ Unread count badge (auto-refreshes every 15s)
                    │     └─ Mark one or all as read
                    │
                    ├─ AI Chatbot (right sidebar panel)
                    │     ├─ Type a message
                    │     ├─ Backend fetches user's last 10 posts as RAG context
                    │     ├─ Calls Mistral API with context + message
                    │     └─ Returns personalized support + suggested blog links
                    │
                    └─ Logout → Login Page
```

### Follow System Detail

```
User A visits User B's profile
    │
    ├─ B is PUBLIC  → "Follow" button → immediate follow, no request needed
    │
    └─ B is PRIVATE → "Follow" button → sends follow_request (status=pending)
                          │
                          └─ B receives notification
                                │
                                ├─ B accepts → A is now following B, A can see B's posts
                                └─ B declines → request closed
```

### Post Lifecycle

```
User writes content
    │
    └─ POST /post
          │
          ├─ Backend: detect_stress_level(content)   → "High" | "Medium" | "Low"
          ├─ Backend: detect_category(content)        → "Work" | "Academic" | etc.
          ├─ INSERT INTO posts (content, stress_level, category, ...)
          │
          ├─ [If user now has ≥ 3 High-stress posts]
          │     └─ Create admin-facing at-risk alert
          │
          └─ Return: {stress_level, category, alert?}
```

### Chatbot RAG Flow

```
User sends message: "I'm overwhelmed with my workload"
    │
    └─ POST /chat
          │
          ├─ Query: SELECT last 10 posts by this user (stress context)
          ├─ Query: SELECT all blogs (resource library)
          ├─ Score blog relevance by keyword overlap with message
          │
          ├─ Build prompt:
          │     SYSTEM: You are a wellness assistant...
          │     USER HISTORY: [High] Can't sleep, too many deadlines...
          │                   [Medium] Feeling tired today...
          │     RELEVANT BLOGS: [title, snippet]
          │     CURRENT MESSAGE: "I'm overwhelmed with my workload"
          │
          ├─ POST to Mistral API (mistral-small)
          │
          └─ Return: {reply: "...", suggested_blogs: [{id, title}]}
```

---

## Admin Flow

```
Login Page (Admin tab)
    │
    └─ [Login] admin@gmail.com / ADMIN@123 → Admin Dashboard
                    │
                    ├─ Dashboard
                    │     ├─ Metric cards: Users, Posts, High/Med/Low stress, Pending reports
                    │     ├─ Pie chart: Stress distribution
                    │     ├─ Line chart: Daily stress trends
                    │     ├─ At-risk users list (3+ high-stress posts → flagged "AT RISK")
                    │     └─ Export buttons: Posts CSV, Analytics CSV
                    │
                    ├─ Feed (AdminFeed)
                    │     ├─ Read-only grid of all user posts
                    │     └─ Filter by category, stress level
                    │
                    ├─ Blog Management (BlogAdmin)
                    │     ├─ Create blog: title, content, category, image
                    │     └─ List & delete published blogs
                    │
                    ├─ Manage Posts
                    │     ├─ Table of all posts with user, content, stress, date
                    │     ├─ Filter: user, stress level, date range
                    │     └─ Delete button → soft-delete (is_deleted=1)
                    │
                    ├─ Reported Posts
                    │     ├─ Table: post content, author, reporter, reason, status
                    │     ├─ "Delete Post" → soft-delete post + resolve all reports for it
                    │     └─ "Ignore" → mark report as ignored
                    │
                    ├─ Users
                    │     ├─ Add user manually: name, email, password
                    │     ├─ Bulk import: upload CSV file
                    │     ├─ List all users with last-active timestamp
                    │     └─ Delete user + Export users CSV
                    │
                    └─ Logout → Login Page
```

---

## AI & Stress Detection

### Automatic Stress Level Classification

Runs on every post. First `High` keyword match wins; falls back to `Medium`, then defaults to `Low`.

| Level | Keywords |
|-------|----------|
| **High** | overwhelmed, can't take it, breaking down, crying, panic, anxiety, depressed, hopeless, exhausted, burnout, suicide, hate my life, want to quit, stressed out, too much pressure, can't sleep, nightmare, angry, furious, terrible |
| **Medium** | worried, nervous, frustrated, confused, tired, struggling, difficult, tough day, not great, upset, annoyed, bothered, uneasy, tense, pressure |
| **Low** | Everything else (default) |

### Automatic Category Classification

Counts keyword matches per category, picks the highest-scoring one. Ties broken by order.

| Category | Keywords |
|----------|----------|
| **Academic** | exam, study, assignment, class, professor, grade, college, university, homework, lecture, semester, gpa, thesis, school, student |
| **Work** | manager, deadline, meeting, project, office, boss, client, promotion, salary, workload, coworker, team, overtime, target, appraisal |
| **Personal** | family, relationship, friend, breakup, marriage, parent, divorce, loneliness, partner, love, fight, argument, home |
| **Financial** | money, debt, loan, rent, bill, expense, salary, broke, savings, emi, credit, payment, afford |
| **Health** | sick, hospital, doctor, pain, sleep, headache, medicine, health, weight, diet, injury, fever, disease, mental |
| **Other** | Default when no category scores above 0 |

### RAG Chatbot (Retrieval-Augmented Generation)

- **Model:** Mistral `mistral-small`
- **Context:** Each user's own last 10 posts (isolated — never mixed with other users)
- **Blog retrieval:** Top 3 most relevant blog articles scored by keyword overlap
- **Persona:** Wellness counsellor with empathetic, supportive tone
- **Output:** Text reply + list of suggested blog article IDs

---

## Installation & Setup

### Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- A [Mistral AI](https://mistral.ai) API key (free tier available)

### 1. Backend Setup

```bash
# Navigate to project root
cd Stress-Book

# Install Python dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

Create or edit `.env` in the project root:

```
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Run the Application

**Terminal 1 — Backend (Flask on port 5000):**

```bash
python app.py
```

> On first run, `stress.db` is auto-created and seeded with the default admin account.

**Terminal 2 — Frontend (React on port 3000):**

```bash
cd frontend
npm start
```

Open **http://localhost:3000** in your browser.

### 5. Production Build

```bash
cd frontend
npm run build
# Outputs optimized static bundle to frontend/build/
```

---

## Configuration

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@gmail.com` |
| Password | `ADMIN@123` |

> Change this in `app.py` in the `init_db()` function before deploying.

### JWT Configuration

| Setting | Value |
|---------|-------|
| Algorithm | HS256 |
| Expiry | 24 hours |
| Secret key | Set via `app.config["SECRET_KEY"]` in `app.py` |

### File Uploads

Uploaded files (profile pictures, post images, blog images) are stored in the `uploads/` directory and served via `/uploads/<filename>`. Supported formats: JPG, PNG, GIF, WEBP.

---

## Security Notes

> This project is built for development / demo use. The following issues must be addressed before any production deployment.

| Issue | Risk | Fix |
|-------|------|-----|
| Plain-text passwords | Critical | Use `bcrypt` or `argon2` for hashing |
| Hardcoded admin seed | High | Read credentials from environment variables |
| No HTTPS | High | Add TLS certificate (nginx + certbot) |
| No rate limiting | Medium | Add `Flask-Limiter` |
| No CSRF tokens | Medium | Add `Flask-WTF` CSRF protection |
| `SECRET_KEY` in source | Medium | Move to `.env` |
| No input sanitization | Medium | Validate all user-submitted fields |
| CSV export includes passwords | High | Remove password column from exports |

---

## Sample CSV

File `sample_users.csv` is included for testing bulk import.

```csv
Name,Email,Password
Mohan Raj,mohan@company.com,mohan123
Priya Kumar,priya@company.com,priya123
Arjun Singh,arjun@company.com,arjun123
Divya Sharma,divya@company.com,divya123
Karthik Rajan,karthik@company.com,karthik123
Sneha Patel,sneha@company.com,sneha123
Rahul Verma,rahul@company.com,rahul123
Anitha Nair,anitha@company.com,anitha123
Vikram Das,vikram@company.com,vikram123
Lakshmi Iyer,lakshmi@company.com,lakshmi123
```

**Upload steps:**
1. Admin Dashboard → Users section
2. "Bulk Import Users (CSV)" → Choose file → Upload
3. System reports: `X users added, Y skipped (duplicate emails)`

---

## Feature Summary

| Feature | Notes |
|---------|-------|
| JWT Authentication | Dual roles: User and Admin. 24-hour token expiry. |
| Hidden stress detection | Users share freely; system silently classifies stress level |
| Auto-category detection | Keyword scoring assigns one of 6 categories to each post |
| Social feed | Posts, comments, emoji reactions, likes, user profiles |
| Follow system | Public accounts: direct follow. Private accounts: follow request → approve/decline |
| Privacy controls | Per-user public/private toggle |
| Post reporting | Users flag posts; admins resolve or ignore |
| Soft delete | Posts are hidden (`is_deleted=1`), not permanently removed |
| Live user search | Navbar search with real-time dropdown |
| Notifications | Comment alerts, follow requests; unread badge; auto-refresh every 15s |
| Admin analytics | Pie chart (stress distribution), line chart (daily trends), at-risk user alerts |
| Blog management | Admin publishes wellness articles; users browse by category |
| RAG AI chatbot | Mistral-powered chatbot with each user's private post history as context |
| Data export | CSV export for users, posts, and daily analytics |
| Bulk user import | Admin uploads CSV to create multiple accounts at once |
| Activity tracking | `last_active` timestamp updated on login, post, comment, and chat |
| Dark / Light mode | Toggle in navbar; persisted to `localStorage` |
| Profile pictures | Optional upload; shown on posts, search, and profiles |
| Post images | Optional image attachment on posts |
