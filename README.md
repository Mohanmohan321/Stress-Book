# StressBook - Workplace Stress Monitoring Platform

A full-stack web application for employee mental wellness monitoring with AI-powered stress detection, admin analytics, and a RAG-based chatbot.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js, Recharts |
| Backend | Python Flask |
| Database | SQLite |
| AI | Mistral API (mistral-small) |
| Auth | JWT (PyJWT) |

---

## Project Structure

```
stress/
├── app.py                    # Flask backend (all APIs)
├── .env                      # MISTRAL_API_KEY
├── requirements.txt          # Python dependencies
├── stress.db                 # SQLite database (auto-created)
├── sample_users.csv          # 10 sample user accounts for bulk import
├── uploads/                  # User profile pictures
└── frontend/
    ├── package.json
    └── src/
        ├── App.js            # Auth routing (Login → Admin or User)
        ├── App.css           # All styles
        └── components/
            ├── LoginPage.js       # User/Admin login + Admin registration
            ├── AdminDashboard.js  # Full admin panel (4 pages)
            └── UserHome.js        # User interface (4 tabs + chatbot)
```

---

## Installation & Setup

### 1. Clone / Navigate to Project

```bash
cd C:\Users\UserName\Desktop\stress
```

### 2. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

Dependencies: `flask`, `flask-cors`, `requests`, `python-dotenv`, `pyjwt`

### 3. Configure API Key

Edit `.env` file:

```
MISTRAL_API_KEY=your_actual_mistral_api_key
```

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 5. Start the Application

**Terminal 1 - Backend (port 5000):**

```bash
python app.py
```

**Terminal 2 - Frontend (port 3000):**

```bash
cd frontend
npm start
```

Open `http://localhost:3000` in your browser.

---

## End-to-End Workflow

### Step 1: Admin Registration

1. Open the app → Login page appears
2. Click **Admin** tab → Click **"New admin? Register here"**
3. Fill in: Name, Email, Password, Designation (Manager/Faculty/Principal/Team Lead/HR)
4. Click **Register**
5. Login with the registered admin credentials

### Step 2: Admin Creates Users

**Option A - Manual (One by One):**

1. In Admin Dashboard → Click **Users** in sidebar
2. Fill in: Name, Email, Password, Role, Department
3. Click **Add User**

**Option B - Bulk Import (CSV):**

1. In Admin Dashboard → Click **Users** in sidebar
2. Scroll to **"Bulk Import Users (CSV)"** section
3. Click **Choose CSV File** → select `sample_users.csv` (or your own CSV)
4. CSV format required:
   ```
   Name,Email,Password,Role,Department
   John,john@email.com,pass123,Developer,Engineering
   ```
5. System shows: "X users added, Y skipped" with error details

### Step 3: Admin Reviews Dashboard

1. Click **Dashboard** in sidebar
2. View:
   - **Metric Cards**: Total Users, Total Posts, High/Medium/Low Stress counts, Pending Reports
   - **Pie Chart**: Stress distribution
   - **Line Chart**: Stress trends over time
   - **At-Risk Users**: Users with 3+ high-stress posts flagged as "AT RISK"
3. Click **Export Posts CSV** or **Export Analytics CSV** to download data

### Step 4: Admin Manages Posts

1. Click **Manage Posts** in sidebar
2. Filter by: User, Stress Level, Date Range
3. Click **Apply** to filter
4. Click **Delete** on any post (soft-delete, not permanent)

### Step 5: Admin Handles Reports

1. Click **Reported Posts** in sidebar
2. View: Post content, author, reporter, reason, status
3. Actions:
   - **Delete Post** → soft-deletes the post + marks report as resolved
   - **Ignore** → marks report as ignored

### Step 6: Admin Exports Data

- **Export Users CSV** → downloads all users with passwords
- **Export Posts CSV** → downloads all posts with stress levels
- **Export Analytics CSV** → downloads daily stress trend data

### Step 7: Admin Logs Out

Click **Logout** → returns to login page.

---

### Step 8: User Logs In

1. On the login page, **User Login** tab is selected by default
2. Enter email and password (created by admin)
3. Click **Login** → enters the User Home

### Step 9: User Views Profile

1. Click **Profile** in sidebar
2. View:
   - Profile card with name, role, email, department, join date
   - Admin info (who created this account)
   - Stats: total posts, last active
   - All personal posts (newest first)
3. **Upload Profile Picture**: Click the avatar circle → select an image file
   - Supports: JPG, PNG, GIF, WEBP
   - Picture shows across the app (feed, search, profile)

### Step 10: User Creates a Post

1. Click **Add Post** in sidebar
2. Type your feelings in the text area
3. Optionally select a **Category** from the dropdown:
   - Academic, Work, Personal, Financial, Health, Other
   - If left as **"Auto-Detect"**, the system uses keyword analysis to assign one automatically:
     - "exam", "study", "assignment" → **Academic**
     - "manager", "deadline", "office" → **Work**
     - "family", "relationship", "breakup" → **Personal**
     - "money", "debt", "loan" → **Financial**
     - "sick", "hospital", "sleep" → **Health**
     - Other text → **Other**
4. Click **Post**
5. Stress level is **automatically detected** by the backend using keyword analysis:
   - Words like "overwhelmed", "burnout", "panic" → **High**
   - Words like "worried", "frustrated", "tired" → **Medium**
   - Other text → **Low**
6. After posting, a confirmation shows the detected category (e.g. "Posted successfully! (Academic)")
7. If user has 3+ high-stress posts, a warning alert is shown

### Step 11: User Browses the Feed

1. Click **Feed** in sidebar (or the Home icon in navbar)
2. All posts from all users are displayed, **newest first**
3. **Filter posts** using the dropdowns at the top of the feed:
   - **Category filter**: All Categories / Academic / Work / Personal / Financial / Health / Other
   - **Stress Level filter**: All Stress Levels / High / Medium / Low
   - Click **"Clear Filters"** to reset
   - Example: Select "Academic" + "High" → shows only high-stress academic posts
4. Each post shows:
   - User avatar (profile pic or initial), name, role
   - Post content
   - **Category badge** (e.g. "Academic", "Work") in blue
   - Subtle colored left border (red = high, yellow = medium, green = low)
   - Timestamp
5. Click on a user's name or avatar → view their profile

### Step 12: User Comments on Posts

1. On any post in the Feed, click emoji buttons to insert reactions
2. Type a comment in the input field
3. Press **Enter** or click **Reply**
4. The post owner receives a notification

### Step 13: User Reports a Post

1. Click the **Report** flag icon on any post
2. A modal appears → type the reason
3. Click **Submit Report**
4. Admin sees this in **Reported Posts** section

### Step 14: User Searches for Other Users

1. Type a name in the **search bar** (top navbar)
2. Matching users appear in a dropdown (with profile pic, role, department)
3. Shows "No users found" if no match
4. Click a user → navigates to their **profile page** showing:
   - Their info (name, role, department, email, join date)
   - All their posts
5. Click **"Back to Feed"** to return

### Step 15: User Checks Notifications

1. Click the **bell icon** in navbar
2. Dropdown shows recent notifications:
   - "X commented on your post"
   - Other system alerts
3. Unread count badge shows on the bell icon
4. Click **"Mark all read"** to clear the badge
5. Notifications auto-refresh every 15 seconds

### Step 16: User Chats with AI Chatbot

1. The **AI Wellness Chatbot** panel is on the right side
2. Type a message → click **Send** (or press Enter)
3. The chatbot uses **RAG (Retrieval-Augmented Generation)**:
   - Retrieves ONLY the current user's past stress posts
   - Sends them as context to Mistral API
   - Returns personalized advice, suggestions, and emotional support
4. User 1's data is never mixed with User 2's data

### Step 17: User Logs Out

Click **Logout** → returns to login page.

---

## Database Schema

```sql
admins (id, name, email, password, designation)

users (id, name, email, password, role, department, profile_pic, admin_id, last_active, created_at)

posts (id, user_id, content, stress_level, category, is_deleted, created_at)

comments (id, post_id, user_id, comment, created_at)

reports (id, post_id, reported_by, reason, status, created_at)

messages (id, sender_id, receiver_id, message, created_at)

notifications (id, user_id, message, is_read, created_at)
```

---

## API Endpoints (28 Routes)

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/admin/register` | Public | Register admin |
| POST | `/admin/login` | Public | Admin login |
| POST | `/user/login` | Public | User login |

### User Management (Admin)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/add_user` | Admin | Create single user |
| POST | `/import_users_csv` | Admin | Bulk create users from CSV |
| GET | `/get_users` | Admin | List all users |
| GET | `/export_users_csv` | Admin | Download users CSV |

### Profile
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/profile` | User | Own profile + posts |
| GET | `/profile/:id` | User | View another user's profile |
| POST | `/upload_profile_pic` | User | Upload profile picture |

### Posts
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/post` | User | Create post (auto stress + category detect) |
| GET | `/posts` | User | Get posts (newest first, filter by ?category=&stress_level=) |
| GET | `/admin/posts` | Admin | Get posts with filters |
| DELETE | `/admin/posts/:id` | Admin | Soft-delete post |

### Comments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/comment` | User | Add comment (notifies post owner) |

### Reports
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/reports` | User | Report a post |
| GET | `/reports` | Admin | View all reports |
| PUT | `/reports/:id` | Admin | Resolve or ignore report |

### Search
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/search?query=` | User | Search users by name |

### Analytics (Admin)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/analytics/overview` | Admin | Metrics summary |
| GET | `/analytics/high-risk-users` | Admin | Users with 3+ high stress |
| GET | `/analytics/trends` | Admin | Daily stress breakdown |
| GET | `/export_posts_csv` | Admin | Export posts data |
| GET | `/export_analytics_csv` | Admin | Export analytics data |

### Notifications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/notifications` | User | Get notifications + unread count |
| PUT | `/notifications/:id` | User | Mark one as read |
| PUT | `/notifications/read-all` | User | Mark all as read |

### AI Chatbot
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/chat` | User | RAG chatbot (user-specific context) |

---

## Key Features Summary

| Feature | Description |
|---------|-------------|
| Dual Login | Admin and User roles with JWT auth |
| Hidden Stress Detection | Backend auto-detects stress level, user never sees it |
| Stress Categories | Academic, Work, Personal, Financial, Health, Other (auto-detect or manual) |
| Search by Stress Type | Filter feed by category and/or stress level |
| Profile Pictures | Optional image upload, shown across the app |
| Bulk CSV Import | Admin uploads CSV to create multiple users at once |
| Social Feed | Facebook-style posts with comments and emoji reactions |
| Post Reporting | Users report posts, admin moderates |
| Soft Delete | Posts are flagged, not permanently deleted |
| Search | Live search users by name, view their profile |
| Notifications | Bell icon with unread badge, auto-refresh |
| Admin Dashboard | Charts (pie + line), metrics, at-risk alerts |
| Data Export | CSV export for users, posts, and analytics |
| RAG Chatbot | AI chatbot using only the current user's history |
| Activity Tracking | `last_active` updated on login, post, comment, chat |

---

## Sample CSV for Bulk Import

File: `sample_users.csv` (included in project root)

```csv
Name,Email,Password,Role,Department
Mohan Raj,mohan@company.com,mohan123,Developer,Engineering
Priya Kumar,priya@company.com,priya123,Designer,Design
Arjun Singh,arjun@company.com,arjun123,Employee,HR
Divya Sharma,divya@company.com,divya123,Manager,Marketing
Karthik Rajan,karthik@company.com,karthik123,Developer,Engineering
Sneha Patel,sneha@company.com,sneha123,Intern,Finance
Rahul Verma,rahul@company.com,rahul123,Employee,Engineering
Anitha Nair,anitha@company.com,anitha123,Designer,Design
Vikram Das,vikram@company.com,vikram123,Manager,HR
Lakshmi Iyer,lakshmi@company.com,lakshmi123,Employee,Marketing
```

---

## AI Auto-Detection Details

### Stress Level Detection (Keyword-Based)

| Level | Trigger Keywords |
|-------|-----------------|
| **High** | overwhelmed, can't take it, breaking down, crying, panic, anxiety, depressed, hopeless, exhausted, burnout, suicide, hate my life, want to quit, stressed out, too much pressure, can't sleep, nightmare, angry, furious, terrible |
| **Medium** | worried, nervous, frustrated, confused, tired, struggling, difficult, tough day, not great, upset, annoyed, bothered, uneasy, tense, pressure |
| **Low** | Everything else (default) |

### Category Detection (Keyword-Based)

| Category | Trigger Keywords |
|----------|-----------------|
| **Academic** | exam, study, assignment, class, professor, grade, college, university, homework, lecture, semester, gpa, thesis, school, student |
| **Work** | manager, deadline, meeting, project, office, boss, client, promotion, salary, workload, coworker, team, overtime, target, appraisal |
| **Personal** | family, relationship, friend, breakup, marriage, parent, divorce, loneliness, partner, love, fight, argument, home |
| **Financial** | money, debt, loan, rent, bill, expense, salary, broke, savings, emi, credit, payment, afford |
| **Health** | sick, hospital, doctor, pain, sleep, headache, medicine, health, weight, diet, injury, fever, disease, mental |
| **Other** | Everything else (default) |

Detection logic: counts keyword matches per category, picks the highest-scoring one. If no keywords match, defaults to "Other".
