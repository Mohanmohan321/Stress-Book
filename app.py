from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import sqlite3
import jwt
import datetime
import requests
import os
import csv
import io
from functools import wraps
from dotenv import load_dotenv

load_dotenv()

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__, static_folder="uploads", static_url_path="/uploads")
CORS(app)
app.config["SECRET_KEY"] = "stressbook_secret_key_2024"
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

DEFAULT_ADMIN_NAME = "Admin"
DEFAULT_ADMIN_EMAIL = "admin@gmail.com"
DEFAULT_ADMIN_PASSWORD = "ADMIN@123"

# ==================== DATABASE ====================

def get_db():
    conn = sqlite3.connect("stress.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            profile_pic TEXT DEFAULT '',
            admin_id INTEGER,
            last_active TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admins(id)
        );
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            stress_level TEXT NOT NULL DEFAULT 'Low',
            category TEXT NOT NULL DEFAULT 'Other',
            is_deleted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            reported_by INTEGER NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (reported_by) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id),
            FOREIGN KEY (receiver_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            notif_type TEXT DEFAULT NULL,
            related_id INTEGER DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS follow_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            requester_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(requester_id, target_id),
            FOREIGN KEY (requester_id) REFERENCES users(id),
            FOREIGN KEY (target_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS blogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'Other',
            image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES admins(id)
        );
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(post_id, user_id),
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    conn.commit()
    conn.close()

init_db()

def migrate_db():
    conn = get_db()
    try:
        conn.execute("ALTER TABLE posts ADD COLUMN image TEXT")
        conn.commit()
    except Exception:
        pass  # Column already exists
    try:
        conn.execute("ALTER TABLE blogs ADD COLUMN category TEXT DEFAULT 'Other'")
        conn.commit()
    except Exception:
        pass
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id),
                FOREIGN KEY (post_id) REFERENCES posts(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE users ADD COLUMN is_private INTEGER DEFAULT 0")
        conn.commit()
    except Exception:
        pass
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS follows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                follower_id INTEGER NOT NULL,
                following_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(follower_id, following_id),
                FOREIGN KEY (follower_id) REFERENCES users(id),
                FOREIGN KEY (following_id) REFERENCES users(id)
            );
        """)
        conn.commit()
    except Exception:
        pass
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS follow_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                requester_id INTEGER NOT NULL,
                target_id INTEGER NOT NULL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(requester_id, target_id),
                FOREIGN KEY (requester_id) REFERENCES users(id),
                FOREIGN KEY (target_id) REFERENCES users(id)
            );
        """)
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE notifications ADD COLUMN notif_type TEXT DEFAULT NULL")
        conn.commit()
    except Exception:
        pass
    try:
        conn.execute("ALTER TABLE notifications ADD COLUMN related_id INTEGER DEFAULT NULL")
        conn.commit()
    except Exception:
        pass
    conn.close()

migrate_db()

def ensure_default_admin():
    conn = get_db()
    existing_admin = conn.execute(
        "SELECT id FROM admins WHERE email = ?",
        (DEFAULT_ADMIN_EMAIL,)
    ).fetchone()

    if existing_admin:
        conn.execute(
            "UPDATE admins SET name = ?, password = ? WHERE email = ?",
            (DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_PASSWORD, DEFAULT_ADMIN_EMAIL)
        )
    else:
        conn.execute(
            "INSERT INTO admins (name, email, password) VALUES (?, ?, ?)",
            (DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD)
        )

    conn.commit()
    conn.close()

ensure_default_admin()

# ==================== HELPERS ====================

def update_last_active(conn, user_id):
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("UPDATE users SET last_active = ? WHERE id = ?", (now, user_id))

HIGH_STRESS_KEYWORDS = [
    "overwhelmed", "can't take it", "breaking down", "crying", "panic",
    "anxiety", "depressed", "hopeless", "exhausted", "burnout", "suicide",
    "hate my life", "want to quit", "stressed out", "too much pressure",
    "can't sleep", "nightmare", "angry", "furious", "terrible"
]

MEDIUM_STRESS_KEYWORDS = [
    "worried", "nervous", "frustrated", "confused", "tired",
    "struggling", "difficult", "tough day", "not great", "upset",
    "annoyed", "bothered", "uneasy", "tense", "pressure"
]

def create_notification(conn, user_id, message, notif_type=None, related_id=None):
    conn.execute(
        "INSERT INTO notifications (user_id, message, notif_type, related_id) VALUES (?, ?, ?, ?)",
        (user_id, message, notif_type, related_id)
    )

CATEGORY_KEYWORDS = {
    "Academic": ["exam", "study", "assignment", "class", "professor", "grade", "college", "university", "homework", "lecture", "semester", "gpa", "thesis", "school", "student"],
    "Work": ["manager", "deadline", "meeting", "project", "office", "boss", "client", "promotion", "salary", "workload", "coworker", "team", "overtime", "target", "appraisal"],
    "Personal": ["family", "relationship", "friend", "breakup", "marriage", "parent", "divorce", "loneliness", "partner", "love", "fight", "argument", "home"],
    "Financial": ["money", "debt", "loan", "rent", "bill", "expense", "salary", "broke", "savings", "emi", "credit", "payment", "afford"],
    "Health": ["sick", "hospital", "doctor", "pain", "sleep", "headache", "medicine", "health", "weight", "diet", "injury", "fever", "disease", "mental"],
}

def detect_category(text):
    lower = text.lower()
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        scores[cat] = sum(1 for kw in keywords if kw in lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Other"

def detect_stress_level(text):
    lower = text.lower()
    for kw in HIGH_STRESS_KEYWORDS:
        if kw in lower:
            return "High"
    for kw in MEDIUM_STRESS_KEYWORDS:
        if kw in lower:
            return "Medium"
    return "Low"

# ==================== AUTH MIDDLEWARE ====================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        try:
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            request.token_data = data
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if request.token_data.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return f(*args, **kwargs)
    return decorated

def generate_token(payload):
    payload["exp"] = datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

# ==================== ADMIN ROUTES ====================

@app.route("/admin/register", methods=["POST"])
def admin_register():
    return jsonify({
        "error": "Admin registration is disabled. Use the default admin account."
    }), 403
@app.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.json or {}
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if email != DEFAULT_ADMIN_EMAIL or password != DEFAULT_ADMIN_PASSWORD:
        return jsonify({
            "error": "Invalid admin credentials. Use the default admin account."
        }), 401

    ensure_default_admin()

    conn = get_db()
    admin = conn.execute(
        "SELECT * FROM admins WHERE email = ? AND password = ?",
        (DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD)
    ).fetchone()
    conn.close()

    if not admin:
        return jsonify({"error": "Default admin account is unavailable"}), 500

    token = generate_token({"id": admin["id"], "email": admin["email"], "role": "admin"})
    return jsonify({
        "token": token,
        "role": "admin",
        "name": admin["name"],
        "email": admin["email"]
    })
# ==================== USER MANAGEMENT (ADMIN) ====================

@app.route("/add_user", methods=["POST"])
@admin_required
def add_user():
    data = request.json
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()
    admin_id = request.token_data.get("id")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password, admin_id) VALUES (?, ?, ?, ?)",
            (name, email, password, admin_id)
        )
        conn.commit()
        return jsonify({"message": "User added successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 409
    finally:
        conn.close()

@app.route("/get_users", methods=["GET"])
@admin_required
def get_users():
    conn = get_db()
    users = conn.execute("SELECT id, name, email, last_active, created_at FROM users").fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route("/delete_user/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    conn = get_db()
    user = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404
    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "User deleted successfully"})

@app.route("/export_users_csv", methods=["GET"])
@admin_required
def export_users_csv():
    conn = get_db()
    users = conn.execute("SELECT id, name, email, password, last_active, created_at FROM users").fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Email", "Password", "Last Active", "Joined Date"])
    for u in users:
        writer.writerow([u["id"], u["name"], u["email"], u["password"], u["last_active"], u["created_at"]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=users.csv"}
    )

# ==================== PROFILE PIC UPLOAD ====================

@app.route("/upload_profile_pic", methods=["POST"])
@token_required
def upload_profile_pic():
    user_id = request.token_data.get("id")
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        return jsonify({"error": "Only image files allowed (jpg, png, gif, webp)"}), 400

    filename = f"user_{user_id}.{ext}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    pic_url = f"/uploads/{filename}"
    conn = get_db()
    conn.execute("UPDATE users SET profile_pic = ? WHERE id = ?", (pic_url, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Profile picture updated", "profile_pic": pic_url})

# ==================== BULK CSV IMPORT ====================

@app.route("/import_users_csv", methods=["POST"])
@admin_required
def import_users_csv():
    if "file" not in request.files:
        return jsonify({"error": "No CSV file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    admin_id = request.token_data.get("id")
    content = file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    conn = get_db()
    added = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        name = (row.get("Name") or row.get("name") or "").strip()
        email = (row.get("Email") or row.get("email") or "").strip()
        password = (row.get("Password") or row.get("password") or "").strip()

        if not name or not email or not password:
            errors.append(f"Row {i}: missing required fields")
            skipped += 1
            continue

        try:
            conn.execute(
                "INSERT INTO users (name, email, password, admin_id) VALUES (?, ?, ?, ?)",
                (name, email, password, admin_id)
            )
            added += 1
        except sqlite3.IntegrityError:
            errors.append(f"Row {i}: {email} already exists")
            skipped += 1

    conn.commit()
    conn.close()
    return jsonify({"message": f"{added} users added, {skipped} skipped", "errors": errors})

# ==================== USER AUTH ====================

@app.route("/user/register", methods=["POST"])
def user_register():
    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400

    conn = get_db()
    try:
        conn.execute(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            (name, email, password)
        )
        conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 409
    finally:
        conn.close()
# ==================== USER LOGIN ====================

@app.route("/user/login", methods=["POST"])
def user_login():
    data = request.json
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ? AND password = ?",
                         (email, password)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "Invalid credentials"}), 401

    # Update last_active on login
    update_last_active(conn, user["id"])
    conn.commit()

    admin = None
    if user["admin_id"]:
        admin = conn.execute("SELECT name, email FROM admins WHERE id = ?",
                              (user["admin_id"],)).fetchone()
    conn.close()

    token = generate_token({"id": user["id"], "email": user["email"], "role": "user"})
    return jsonify({
        "token": token,
        "role": "user",
        "user_id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "created_at": user["created_at"],
        "admin": dict(admin) if admin else None
    })

# ==================== PROFILE ====================

@app.route("/profile", methods=["GET"])
@token_required
def get_profile():
    user_id = request.token_data.get("id")
    conn = get_db()

    user = conn.execute("SELECT id, name, email, profile_pic, admin_id, last_active, created_at, is_private FROM users WHERE id = ?",
                         (user_id,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    admin = None
    if user["admin_id"]:
        admin = conn.execute("SELECT name, email FROM admins WHERE id = ?",
                              (user["admin_id"],)).fetchone()

    total_posts = conn.execute("SELECT COUNT(*) as count FROM posts WHERE user_id = ? AND is_deleted = 0",
                                (user_id,)).fetchone()["count"]

    last_post = conn.execute("SELECT created_at FROM posts WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 1",
                              (user_id,)).fetchone()

    posts = conn.execute(
        "SELECT id, content, stress_level, category, image, created_at FROM posts WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()

    followers_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (user_id,)).fetchone()["c"]
    following_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?", (user_id,)).fetchone()["c"]

    conn.close()

    return jsonify({
        "user": dict(user),
        "admin": dict(admin) if admin else None,
        "stats": {
            "total_posts": total_posts,
            "last_active": user["last_active"] or (last_post["created_at"] if last_post else None)
        },
        "posts": [dict(p) for p in posts],
        "followers_count": followers_count,
        "following_count": following_count
    })

# ==================== FOLLOW / PRIVACY ====================

@app.route("/follow/<int:target_id>", methods=["POST"])
@token_required
def follow_toggle(target_id):
    follower_id = request.token_data.get("id")
    if follower_id == target_id:
        return jsonify({"error": "You cannot follow yourself"}), 400
    conn = get_db()
    target = conn.execute("SELECT id, is_private FROM users WHERE id = ?", (target_id,)).fetchone()
    if not target:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    existing_follow = conn.execute(
        "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
        (follower_id, target_id)
    ).fetchone()

    if existing_follow:
        # Unfollow
        conn.execute("DELETE FROM follows WHERE follower_id = ? AND following_id = ?", (follower_id, target_id))
        conn.commit()
        followers_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (target_id,)).fetchone()["c"]
        conn.close()
        return jsonify({"is_following": False, "has_pending_request": False, "followers_count": followers_count})

    if target["is_private"]:
        existing_req = conn.execute(
            "SELECT id FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending'",
            (follower_id, target_id)
        ).fetchone()
        if existing_req:
            # Cancel the pending request
            conn.execute(
                "DELETE FROM notifications WHERE user_id = ? AND notif_type = 'follow_request' AND related_id = ?",
                (target_id, existing_req["id"])
            )
            conn.execute(
                "DELETE FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending'",
                (follower_id, target_id)
            )
            conn.commit()
            followers_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (target_id,)).fetchone()["c"]
            conn.close()
            return jsonify({"is_following": False, "has_pending_request": False, "followers_count": followers_count})
        else:
            # Send a follow request
            conn.execute(
                "INSERT OR IGNORE INTO follow_requests (requester_id, target_id) VALUES (?, ?)",
                (follower_id, target_id)
            )
            conn.commit()
            req_row = conn.execute(
                "SELECT id FROM follow_requests WHERE requester_id = ? AND target_id = ?",
                (follower_id, target_id)
            ).fetchone()
            requester = conn.execute("SELECT name FROM users WHERE id = ?", (follower_id,)).fetchone()
            create_notification(conn, target_id, f"{requester['name']} wants to follow you",
                                notif_type="follow_request", related_id=req_row["id"])
            conn.commit()
            followers_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (target_id,)).fetchone()["c"]
            conn.close()
            return jsonify({"is_following": False, "has_pending_request": True, "followers_count": followers_count})
    else:
        # Public account: follow immediately
        conn.execute("INSERT INTO follows (follower_id, following_id) VALUES (?, ?)", (follower_id, target_id))
        follower = conn.execute("SELECT name FROM users WHERE id = ?", (follower_id,)).fetchone()
        create_notification(conn, target_id, f"{follower['name']} started following you")
        conn.commit()
        followers_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (target_id,)).fetchone()["c"]
        conn.close()
        return jsonify({"is_following": True, "has_pending_request": False, "followers_count": followers_count})

@app.route("/follow-request/<int:request_id>/accept", methods=["POST"])
@token_required
def accept_follow_request(request_id):
    user_id = request.token_data.get("id")
    conn = get_db()
    req = conn.execute(
        "SELECT * FROM follow_requests WHERE id = ? AND target_id = ? AND status = 'pending'",
        (request_id, user_id)
    ).fetchone()
    if not req:
        conn.close()
        return jsonify({"error": "Follow request not found"}), 404
    conn.execute("INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)",
                 (req["requester_id"], user_id))
    conn.execute("UPDATE follow_requests SET status = 'accepted' WHERE id = ?", (request_id,))
    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND notif_type = 'follow_request' AND related_id = ?",
        (user_id, request_id)
    )
    target_name = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
    create_notification(conn, req["requester_id"], f"{target_name['name']} accepted your follow request")
    conn.commit()
    conn.close()
    return jsonify({"message": "Follow request accepted"})

@app.route("/follow-request/<int:request_id>/decline", methods=["POST"])
@token_required
def decline_follow_request(request_id):
    user_id = request.token_data.get("id")
    conn = get_db()
    req = conn.execute(
        "SELECT * FROM follow_requests WHERE id = ? AND target_id = ? AND status = 'pending'",
        (request_id, user_id)
    ).fetchone()
    if not req:
        conn.close()
        return jsonify({"error": "Follow request not found"}), 404
    conn.execute("UPDATE follow_requests SET status = 'declined' WHERE id = ?", (request_id,))
    conn.execute(
        "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND notif_type = 'follow_request' AND related_id = ?",
        (user_id, request_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Follow request declined"})

@app.route("/profile/privacy", methods=["PUT"])
@token_required
def update_privacy():
    user_id = request.token_data.get("id")
    data = request.json or {}
    is_private = 1 if data.get("is_private") else 0
    conn = get_db()
    conn.execute("UPDATE users SET is_private = ? WHERE id = ?", (is_private, user_id))
    conn.commit()
    conn.close()
    return jsonify({"is_private": bool(is_private), "message": "Privacy updated"})

# ==================== POSTS ====================

@app.route("/post", methods=["POST"])
@token_required
def create_post():
    user_id = request.token_data.get("id")

    # Handle both JSON and multipart/form-data
    if request.content_type and 'multipart/form-data' in request.content_type:
        content = request.form.get("content", "").strip()
        stress_level = request.form.get("stress_level", "").strip()
        category = request.form.get("category", "").strip()
        auto_detect = request.form.get("auto_detect", "false").lower() == "true"
    else:
        data = request.json or {}
        content = data.get("content", "").strip()
        stress_level = data.get("stress_level", "").strip()
        category = data.get("category", "").strip()
        auto_detect = data.get("auto_detect", False)

    if not content:
        return jsonify({"error": "Content is required"}), 400

    # AI Stress Detection
    if auto_detect or stress_level not in ["Low", "Medium", "High"]:
        stress_level = detect_stress_level(content)

    # AI Category Detection
    valid_categories = ["Academic", "Work", "Personal", "Financial", "Health", "Other"]
    if category not in valid_categories:
        category = detect_category(content)

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO posts (user_id, content, stress_level, category) VALUES (?, ?, ?, ?)",
        (user_id, content, stress_level, category)
    )
    post_id = cursor.lastrowid

    # Handle optional image upload
    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename:
            ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
            if ext in ["jpg", "jpeg", "png", "gif", "webp"]:
                filename = f"post_{post_id}.{ext}"
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(filepath)
                image_url = f"/uploads/{filename}"
                conn.execute("UPDATE posts SET image = ? WHERE id = ?", (image_url, post_id))

    update_last_active(conn, user_id)
    conn.commit()

    # Check if user now has 3+ HIGH stress posts (notification trigger)
    high_count = conn.execute(
        "SELECT COUNT(*) as c FROM posts WHERE user_id = ? AND stress_level = 'High' AND is_deleted = 0",
        (user_id,)
    ).fetchone()["c"]

    # Notify admins if threshold reached
    if high_count == 3:
        user_name = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()["name"]
        admins = conn.execute("SELECT id FROM admins").fetchall()
        for a in admins:
            create_notification(conn, None, f"ALERT: {user_name} has reached {high_count} high-stress posts")
        conn.commit()

    conn.close()

    resp = {"message": "Post created", "detected_stress": stress_level, "detected_category": category}
    if high_count >= 3:
        resp["alert"] = "You have multiple high-stress posts. Please consider reaching out for support."
    return jsonify(resp), 201

@app.route("/posts", methods=["GET"])
@token_required
def get_posts():
    conn = get_db()
    current_user_id = request.token_data.get("id")

    query = """
        SELECT posts.id, posts.content, posts.stress_level, posts.category, posts.created_at,
               posts.user_id, posts.image, users.name, users.email, users.profile_pic
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.is_deleted = 0
        AND (
            users.is_private = 0
            OR posts.user_id = ?
            OR EXISTS (SELECT 1 FROM follows WHERE follower_id = ? AND following_id = posts.user_id)
        )
    """
    params = [current_user_id, current_user_id]

    # Optional filters
    filter_category = request.args.get("category")
    filter_stress = request.args.get("stress_level")
    sort_by = request.args.get("sort_by", "")

    if filter_category and filter_category in ["Academic", "Work", "Personal", "Financial", "Health", "Other"]:
        query += " AND posts.category = ?"
        params.append(filter_category)
    if filter_stress and filter_stress in ["Low", "Medium", "High"]:
        query += " AND posts.stress_level = ?"
        params.append(filter_stress)

    query += " ORDER BY posts.created_at DESC"

    posts = conn.execute(query, params).fetchall()

    result = []
    for p in posts:
        comments = conn.execute("""
            SELECT comments.id, comments.comment, comments.created_at,
                   comments.user_id, users.name, users.email
            FROM comments
            JOIN users ON comments.user_id = users.id
            WHERE comments.post_id = ?
            ORDER BY comments.created_at ASC
        """, (p["id"],)).fetchall()

        like_count = conn.execute("SELECT COUNT(*) as c FROM likes WHERE post_id = ?", (p["id"],)).fetchone()["c"]
        liked_by_me = conn.execute("SELECT id FROM likes WHERE post_id = ? AND user_id = ?", (p["id"], current_user_id)).fetchone() is not None

        result.append({
            "id": p["id"],
            "content": p["content"],
            "stress_level": p["stress_level"],
            "category": p["category"],
            "created_at": p["created_at"],
            "user_id": p["user_id"],
            "image": p["image"],
            "name": p["name"],
            "email": p["email"],
            "profile_pic": p["profile_pic"],
            "comments": [dict(c) for c in comments],
            "like_count": like_count,
            "liked_by_me": liked_by_me
        })

    if sort_by == "most_likes":
        result.sort(key=lambda x: x["like_count"], reverse=True)
    elif sort_by == "most_comments":
        result.sort(key=lambda x: len(x["comments"]), reverse=True)

    conn.close()
    return jsonify(result)

@app.route("/posts/<int:post_id>/like", methods=["POST"])
@token_required
def toggle_like(post_id):
    user_id = request.token_data.get("id")
    conn = get_db()
    post = conn.execute("""
        SELECT posts.id, posts.user_id, users.is_private
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.id = ? AND posts.is_deleted = 0
    """, (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({"error": "Post not found"}), 404
    if post["is_private"] and post["user_id"] != user_id:
        is_following = conn.execute(
            "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
            (user_id, post["user_id"])
        ).fetchone() is not None
        if not is_following:
            conn.close()
            return jsonify({"error": "This user's profile is private"}), 403
    existing = conn.execute("SELECT id FROM likes WHERE post_id = ? AND user_id = ?", (post_id, user_id)).fetchone()
    if existing:
        conn.execute("DELETE FROM likes WHERE post_id = ? AND user_id = ?", (post_id, user_id))
        liked = False
    else:
        conn.execute("INSERT INTO likes (post_id, user_id) VALUES (?, ?)", (post_id, user_id))
        liked = True
    conn.commit()
    like_count = conn.execute("SELECT COUNT(*) as c FROM likes WHERE post_id = ?", (post_id,)).fetchone()["c"]
    conn.close()
    return jsonify({"liked": liked, "like_count": like_count})

@app.route("/posts/<int:post_id>", methods=["DELETE"])
@token_required
def delete_own_post(post_id):
    user_id = request.token_data.get("id")
    conn = get_db()
    post = conn.execute(
        "SELECT id, user_id FROM posts WHERE id = ? AND is_deleted = 0",
        (post_id,)
    ).fetchone()

    if not post:
        conn.close()
        return jsonify({"error": "Post not found"}), 404

    if post["user_id"] != user_id:
        conn.close()
        return jsonify({"error": "You can only delete your own posts"}), 403

    conn.execute("UPDATE posts SET is_deleted = 1 WHERE id = ?", (post_id,))
    conn.execute(
        "UPDATE reports SET status = 'resolved' WHERE post_id = ? AND status = 'pending'",
        (post_id,)
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "Post deleted"})
# ==================== COMMENTS ====================

@app.route("/comment", methods=["POST"])
@token_required
def add_comment():
    user_id = request.token_data.get("id")
    data = request.json
    post_id = data.get("post_id")
    comment = data.get("comment", "").strip()

    if not post_id or not comment:
        return jsonify({"error": "Post ID and comment are required"}), 400

    conn = get_db()
    post = conn.execute("""
        SELECT posts.user_id, users.is_private
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.id = ? AND posts.is_deleted = 0
    """, (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({"error": "Post not found"}), 404
    if post["is_private"] and post["user_id"] != user_id:
        is_following = conn.execute(
            "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
            (user_id, post["user_id"])
        ).fetchone() is not None
        if not is_following:
            conn.close()
            return jsonify({"error": "This user's profile is private"}), 403

    conn.execute("INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)",
                  (post_id, user_id, comment))
    update_last_active(conn, user_id)

    if post["user_id"] != user_id:
        commenter = conn.execute("SELECT name FROM users WHERE id = ?", (user_id,)).fetchone()
        create_notification(conn, post["user_id"], f"{commenter['name']} commented on your post")

    conn.commit()
    conn.close()
    return jsonify({"message": "Comment added"}), 201

# ==================== REPORTS ====================

@app.route("/reports", methods=["POST"])
@token_required
def create_report():
    user_id = request.token_data.get("id")
    data = request.json
    post_id = data.get("post_id")
    reason = data.get("reason", "").strip()

    if not post_id or not reason:
        return jsonify({"error": "Post ID and reason are required"}), 400

    conn = get_db()
    # Check if already reported by this user
    existing = conn.execute("SELECT id FROM reports WHERE post_id = ? AND reported_by = ? AND status = 'pending'",
                             (post_id, user_id)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "You already reported this post"}), 409

    conn.execute("INSERT INTO reports (post_id, reported_by, reason) VALUES (?, ?, ?)",
                  (post_id, user_id, reason))
    conn.commit()
    conn.close()
    return jsonify({"message": "Report submitted"}), 201

@app.route("/reports", methods=["GET"])
@admin_required
def get_reports():
    conn = get_db()
    reports = conn.execute("""
        SELECT reports.id, reports.reason, reports.status, reports.created_at,
               reports.post_id, posts.content as post_content, posts.stress_level, posts.is_deleted,
               reporter.name as reporter_name, reporter.email as reporter_email,
               author.name as author_name, author.email as author_email
        FROM reports
        JOIN posts ON reports.post_id = posts.id
        JOIN users as reporter ON reports.reported_by = reporter.id
        JOIN users as author ON posts.user_id = author.id
        ORDER BY reports.created_at DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in reports])

@app.route("/reports/<int:report_id>", methods=["PUT"])
@admin_required
def update_report(report_id):
    data = request.json
    status = data.get("status", "").strip()
    if status not in ["resolved", "ignored"]:
        return jsonify({"error": "Status must be resolved or ignored"}), 400

    conn = get_db()
    report = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    if not report:
        conn.close()
        return jsonify({"error": "Report not found"}), 404

    conn.execute("UPDATE reports SET status = ? WHERE id = ?", (status, report_id))

    # If resolved, soft-delete the post
    if status == "resolved":
        conn.execute("UPDATE posts SET is_deleted = 1 WHERE id = ?", (report["post_id"],))
        # Also resolve all other pending reports for this post
        conn.execute("UPDATE reports SET status = 'resolved' WHERE post_id = ? AND status = 'pending'",
                      (report["post_id"],))

    conn.commit()
    conn.close()
    return jsonify({"message": f"Report {status}"})

# ==================== ADMIN ANALYTICS ====================

@app.route("/analytics/overview", methods=["GET"])
@admin_required
def analytics_overview():
    conn = get_db()
    total_users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    total_posts = conn.execute("SELECT COUNT(*) as c FROM posts WHERE is_deleted = 0").fetchone()["c"]
    high = conn.execute("SELECT COUNT(*) as c FROM posts WHERE stress_level = 'High' AND is_deleted = 0").fetchone()["c"]
    medium = conn.execute("SELECT COUNT(*) as c FROM posts WHERE stress_level = 'Medium' AND is_deleted = 0").fetchone()["c"]
    low = conn.execute("SELECT COUNT(*) as c FROM posts WHERE stress_level = 'Low' AND is_deleted = 0").fetchone()["c"]
    pending_reports = conn.execute("SELECT COUNT(*) as c FROM reports WHERE status = 'pending'").fetchone()["c"]
    conn.close()

    return jsonify({
        "total_users": total_users,
        "total_posts": total_posts,
        "high_stress": high,
        "medium_stress": medium,
        "low_stress": low,
        "pending_reports": pending_reports
    })

@app.route("/analytics/high-risk-users", methods=["GET"])
@admin_required
def high_risk_users():
    conn = get_db()
    users = conn.execute("""
        SELECT users.id, users.name, users.email, users.last_active,
               COUNT(posts.id) as high_stress_count
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.stress_level = 'High' AND posts.is_deleted = 0
        GROUP BY users.id
        HAVING high_stress_count >= 3
        ORDER BY high_stress_count DESC
    """).fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route("/analytics/trends", methods=["GET"])
@admin_required
def analytics_trends():
    conn = get_db()
    trends = conn.execute("""
        SELECT DATE(created_at) as date,
               SUM(CASE WHEN stress_level = 'High' THEN 1 ELSE 0 END) as high,
               SUM(CASE WHEN stress_level = 'Medium' THEN 1 ELSE 0 END) as medium,
               SUM(CASE WHEN stress_level = 'Low' THEN 1 ELSE 0 END) as low,
               COUNT(*) as total
        FROM posts
        WHERE is_deleted = 0
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(t) for t in trends])

# ==================== ADMIN POST MANAGEMENT ====================

@app.route("/admin/posts", methods=["GET"])
@admin_required
def admin_get_posts():
    conn = get_db()

    query = """
        SELECT posts.id, posts.content, posts.stress_level, posts.category, posts.created_at, posts.is_deleted,
               posts.image, users.id as user_id, users.name, users.email
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE 1=1
    """
    params = []

    # Filters
    user_id = request.args.get("user_id")
    stress_level = request.args.get("stress_level")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    show_deleted = request.args.get("show_deleted", "false")

    if show_deleted != "true":
        query += " AND posts.is_deleted = 0"

    if user_id:
        query += " AND posts.user_id = ?"
        params.append(user_id)
    if stress_level and stress_level in ["Low", "Medium", "High"]:
        query += " AND posts.stress_level = ?"
        params.append(stress_level)
    if date_from:
        query += " AND DATE(posts.created_at) >= ?"
        params.append(date_from)
    if date_to:
        query += " AND DATE(posts.created_at) <= ?"
        params.append(date_to)

    query += " ORDER BY posts.created_at DESC"

    posts = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify([dict(p) for p in posts])

@app.route("/admin/posts/<int:post_id>", methods=["DELETE"])
@admin_required
def admin_delete_post(post_id):
    conn = get_db()
    post = conn.execute("SELECT id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        conn.close()
        return jsonify({"error": "Post not found"}), 404

    # Soft delete
    conn.execute("UPDATE posts SET is_deleted = 1 WHERE id = ?", (post_id,))
    # Resolve any pending reports
    conn.execute("UPDATE reports SET status = 'resolved' WHERE post_id = ? AND status = 'pending'", (post_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Post deleted"})

# ==================== EXPORT DATA ====================

@app.route("/export_posts_csv", methods=["GET"])
@admin_required
def export_posts_csv():
    conn = get_db()
    posts = conn.execute("""
        SELECT posts.id, users.name, users.email, posts.content,
               posts.stress_level, posts.created_at
        FROM posts
        JOIN users ON posts.user_id = users.id
        WHERE posts.is_deleted = 0
        ORDER BY posts.created_at DESC
    """).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Post ID", "User Name", "Email", "Content", "Stress Level", "Date"])
    for p in posts:
        writer.writerow([p["id"], p["name"], p["email"], p["content"], p["stress_level"], p["created_at"]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=posts_export.csv"}
    )

@app.route("/export_analytics_csv", methods=["GET"])
@admin_required
def export_analytics_csv():
    conn = get_db()
    trends = conn.execute("""
        SELECT DATE(created_at) as date,
               SUM(CASE WHEN stress_level = 'High' THEN 1 ELSE 0 END) as high,
               SUM(CASE WHEN stress_level = 'Medium' THEN 1 ELSE 0 END) as medium,
               SUM(CASE WHEN stress_level = 'Low' THEN 1 ELSE 0 END) as low,
               COUNT(*) as total
        FROM posts WHERE is_deleted = 0
        GROUP BY DATE(created_at) ORDER BY date ASC
    """).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "High", "Medium", "Low", "Total"])
    for t in trends:
        writer.writerow([t["date"], t["high"], t["medium"], t["low"], t["total"]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=analytics_export.csv"}
    )

# ==================== CHATBOT WITH RAG ====================

BLOG_CATEGORY_KEYWORDS = {
    "Academic": ["exam", "study", "assignment", "class", "professor", "grade", "college", "university",
                 "homework", "semester", "gpa", "thesis", "school", "student", "lecture", "test", "academic"],
    "Work": ["manager", "deadline", "meeting", "project", "office", "boss", "client", "promotion",
             "salary", "workload", "coworker", "team", "overtime", "job", "career", "work", "burnout"],
    "Personal": ["family", "relationship", "friend", "breakup", "marriage", "parent", "divorce",
                 "loneliness", "partner", "love", "fight", "argument", "personal", "home", "lonely"],
    "Financial": ["money", "debt", "loan", "rent", "bill", "expense", "broke", "savings",
                  "credit", "payment", "financial", "afford", "emi", "budget"],
    "Health": ["sick", "hospital", "doctor", "pain", "sleep", "headache", "medicine", "health",
               "weight", "diet", "anxiety", "depression", "mental", "therapy", "tired", "fatigue"],
    "Other": ["stress", "overwhelmed", "struggling", "difficult", "help", "support", "advice", "worried"],
}

def suggest_blogs_for_message(user_message, blogs):
    """Return up to 3 most relevant blogs based on keyword overlap with the user's message."""
    if not blogs:
        return []
    lower_msg = user_message.lower()
    scored = []
    for blog in blogs:
        score = 0
        cat = blog.get("category", "Other")
        cat_kws = BLOG_CATEGORY_KEYWORDS.get(cat, [])
        score += sum(2 for kw in cat_kws if kw in lower_msg)
        title_words = [w for w in blog["title"].lower().split() if len(w) > 3]
        score += sum(3 for w in title_words if w in lower_msg)
        if score > 0:
            scored.append((score, blog))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [{"id": b["id"], "title": b["title"], "category": b.get("category", "Other")}
            for _, b in scored[:3]]

SYSTEM_PROMPT = """
You are a calm, kind, and emotionally supportive AI companion.

Your role:
- Talk like a gentle, understanding human
- Act like a supportive friend first, therapist second
- Make the user feel safe and heard

IMPORTANT BEHAVIOR RULES:

1. Be Polite & Gentle
- NEVER use words like: "ugh", "man", "bro"
- Use soft, calm language
Examples:
- "I'm sorry to hear that…"
- "That sounds really difficult…"
- "I understand…"

2. Do NOT Ask Too Many Questions
- Avoid asking a question in every message
- Follow this pattern:
  → Empathy first
  → Reflection (optional)
  → THEN (sometimes) one gentle question

- Sometimes respond WITHOUT a question

3. Emotional Flow
- First: acknowledge feeling
- Then: reflect situation
- Then: (optional) ask ONE simple question

4. Memory Usage (RAG)
- When user mentions repeated stress:
  → gently refer to patterns
  → do NOT sound intense or analytical

Example:
"Seems like this has been coming up again, especially with exams…"

5. Advice Style
- When user asks "what should I do":
  → DO NOT ask another question immediately
  → give 1–2 simple, gentle suggestions

6. Tone
- Calm
- Soft
- Supportive
- Not overly dramatic
- Not robotic

7. Keep Responses Short
- 2–4 lines
- Simple and clear

---

Examples:

User: today was bad
Good:
"I'm sorry to hear that… some days can feel really heavy."

User: i feel stressed
Good:
"That sounds really tough… especially if it's been building up for a while."

User: what should i do
Good:
"Maybe you can start with something small, like studying for just 20 minutes and taking a short break. You don't have to do everything at once."
"""

@app.route("/chat", methods=["POST"])
@token_required
def chat():
    user_id = request.token_data.get("id")
    data = request.json
    user_input = data.get("message", "").strip()
    history = data.get("history", [])

    if not user_input:
        return jsonify({"error": "Message is required"}), 400

    conn = get_db()
    posts = conn.execute(
        "SELECT content, stress_level, created_at FROM posts WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 10",
        (user_id,)
    ).fetchall()
    blogs_rows = conn.execute(
        "SELECT id, title, content, category FROM blogs ORDER BY created_at DESC"
    ).fetchall()
    blogs_list = [dict(b) for b in blogs_rows]
    update_last_active(conn, user_id)
    conn.commit()
    conn.close()

    if posts:
        stress_entries = [f"- [{p['stress_level']}] {p['content']}" for p in posts]
        stress_history = "\n".join(stress_entries)
    else:
        stress_history = "No previous stress posts."

    # Build blog context for the AI
    if blogs_list:
        blog_context_lines = [
            f"- [{b.get('category', 'Other')}] \"{b['title']}\""
            for b in blogs_list[:15]
        ]
        blog_context = "\n".join(blog_context_lines)
    else:
        blog_context = "No resource blogs available yet."

    # Compute blog suggestions based on keyword relevance
    suggested_blogs = suggest_blogs_for_message(user_input, blogs_list)

    combined_prompt = f"""{SYSTEM_PROMPT}

USER PAST CONTEXT (IMPORTANT - USE THIS):
{stress_history}

AVAILABLE RESOURCE BLOGS (if relevant, briefly mention one by its exact title):
{blog_context}

CURRENT MESSAGE:
{user_input}

Respond naturally. Use past context when relevant. If a blog above directly matches the user's concern, mention it by exact title in your reply:
"""

    messages = [{"role": "system", "content": combined_prompt}]
    for msg in history[-10:]:
        role = "user" if msg.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": msg.get("content", "")})
    messages.append({"role": "user", "content": user_input})

    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return jsonify({"error": "Mistral API key not configured"}), 500

    url = "https://api.mistral.ai/v1/chat/completions"
    req_headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    body = {
        "model": "mistral-small",
        "messages": messages
    }

    try:
        response = requests.post(url, headers=req_headers, json=body)
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": reply, "suggested_blogs": suggested_blogs})
    except requests.exceptions.HTTPError as e:
        return jsonify({"error": f"API Error: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Error: {str(e)}"}), 500

# ==================== SEARCH ====================

@app.route("/search", methods=["GET"])
@token_required
def search_users():
    query = request.args.get("query", "").strip()
    if not query or len(query) < 1:
        return jsonify([])

    conn = get_db()
    users = conn.execute(
        "SELECT id, name, email, profile_pic FROM users WHERE name LIKE ?",
        (f"%{query}%",)
    ).fetchall()

    result = []
    for u in users:
        posts = conn.execute(
            "SELECT id, content, created_at FROM posts WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT 3",
            (u["id"],)
        ).fetchall()
        result.append({**dict(u), "recent_posts": [dict(p) for p in posts]})

    conn.close()
    return jsonify(result)

# ==================== USER PROFILE BY ID ====================

@app.route("/profile/<int:user_id>", methods=["GET"])
@token_required
def get_user_profile(user_id):
    current_user_id = request.token_data.get("id")
    conn = get_db()
    user = conn.execute(
        "SELECT id, name, email, profile_pic, created_at, is_private FROM users WHERE id = ?",
        (user_id,)
    ).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found"}), 404

    is_private = bool(user["is_private"])
    is_following = conn.execute(
        "SELECT id FROM follows WHERE follower_id = ? AND following_id = ?",
        (current_user_id, user_id)
    ).fetchone() is not None
    has_pending_request = conn.execute(
        "SELECT id FROM follow_requests WHERE requester_id = ? AND target_id = ? AND status = 'pending'",
        (current_user_id, user_id)
    ).fetchone() is not None
    followers_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (user_id,)).fetchone()["c"]
    following_count = conn.execute("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?", (user_id,)).fetchone()["c"]

    # Private account: hide posts unless viewer is a follower or it's own profile
    if is_private and not is_following and current_user_id != user_id:
        conn.close()
        return jsonify({
            "user": dict(user),
            "stats": {"total_posts": 0},
            "posts": [],
            "is_private": True,
            "is_following": False,
            "has_pending_request": has_pending_request,
            "followers_count": followers_count,
            "following_count": following_count,
            "is_locked": True
        })

    posts = conn.execute(
        "SELECT id, content, created_at FROM posts WHERE user_id = ? AND is_deleted = 0 ORDER BY created_at DESC",
        (user_id,)
    ).fetchall()
    total_posts = len(posts)
    conn.close()

    return jsonify({
        "user": dict(user),
        "stats": {"total_posts": total_posts},
        "posts": [dict(p) for p in posts],
        "is_private": is_private,
        "is_following": is_following,
        "has_pending_request": has_pending_request,
        "followers_count": followers_count,
        "following_count": following_count,
        "is_locked": False
    })

# ==================== MESSAGES ====================

@app.route("/messages", methods=["POST"])
@token_required
def send_message():
    sender_id = request.token_data.get("id")
    data = request.json
    receiver_id = data.get("receiver_id")
    message = data.get("message", "").strip()

    if not receiver_id or not message:
        return jsonify({"error": "Receiver and message are required"}), 400

    conn = get_db()
    conn.execute("INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
                  (sender_id, receiver_id, message))

    # Notify receiver
    sender = conn.execute("SELECT name FROM users WHERE id = ?", (sender_id,)).fetchone()
    create_notification(conn, receiver_id, f"New message from {sender['name']}")

    update_last_active(conn, sender_id)
    conn.commit()
    conn.close()
    return jsonify({"message": "Sent"}), 201

@app.route("/messages/conversations", methods=["GET"])
@token_required
def get_conversations():
    user_id = request.token_data.get("id")
    conn = get_db()

    # Get unique conversation partners
    partners = conn.execute("""
        SELECT DISTINCT
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
    """, (user_id, user_id, user_id)).fetchall()

    result = []
    for p in partners:
        pid = p["partner_id"]
        user = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (pid,)).fetchone()
        last_msg = conn.execute("""
            SELECT message, created_at FROM messages
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at DESC LIMIT 1
        """, (user_id, pid, pid, user_id)).fetchone()

        unread = conn.execute("""
            SELECT COUNT(*) as c FROM messages
            WHERE sender_id = ? AND receiver_id = ?
            AND id NOT IN (SELECT id FROM messages WHERE sender_id = ? AND receiver_id = ?)
        """, (pid, user_id, user_id, pid)).fetchone()

        if user:
            result.append({
                "user": dict(user),
                "last_message": last_msg["message"] if last_msg else "",
                "last_time": last_msg["created_at"] if last_msg else ""
            })

    # Sort by last message time
    result.sort(key=lambda x: x["last_time"], reverse=True)
    conn.close()
    return jsonify(result)

@app.route("/messages/<int:partner_id>", methods=["GET"])
@token_required
def get_chat(partner_id):
    user_id = request.token_data.get("id")
    conn = get_db()
    msgs = conn.execute("""
        SELECT id, sender_id, receiver_id, message, created_at FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC
    """, (user_id, partner_id, partner_id, user_id)).fetchall()
    conn.close()
    return jsonify([dict(m) for m in msgs])

@app.route("/messages/users", methods=["GET"])
@token_required
def get_all_users_for_messaging():
    user_id = request.token_data.get("id")
    conn = get_db()
    users = conn.execute("SELECT id, name, email FROM users WHERE id != ?", (user_id,)).fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

# ==================== NOTIFICATIONS ====================

@app.route("/notifications", methods=["GET"])
@token_required
def get_notifications():
    user_id = request.token_data.get("id")
    conn = get_db()
    notifs = conn.execute(
        """SELECT n.id, n.message, n.is_read, n.created_at, n.notif_type, n.related_id,
                  fr.status as request_status
           FROM notifications n
           LEFT JOIN follow_requests fr ON n.notif_type = 'follow_request' AND fr.id = n.related_id
           WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 30""",
        (user_id,)
    ).fetchall()
    unread = conn.execute(
        "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
        (user_id,)
    ).fetchone()["c"]
    conn.close()
    return jsonify({"notifications": [dict(n) for n in notifs], "unread_count": unread})

@app.route("/notifications/<int:notif_id>", methods=["PUT"])
@token_required
def mark_notification_read(notif_id):
    user_id = request.token_data.get("id")
    conn = get_db()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", (notif_id, user_id))
    conn.commit()
    conn.close()
    return jsonify({"message": "Marked as read"})

@app.route("/notifications/read-all", methods=["PUT"])
@token_required
def mark_all_notifications_read():
    user_id = request.token_data.get("id")
    conn = get_db()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "All marked as read"})

# ==================== BLOG ROUTES ====================

@app.route("/blogs", methods=["POST"])
@admin_required
def create_blog():
    admin_id = request.token_data.get("id")
    title = request.form.get("title", "").strip()
    content = request.form.get("content", "").strip()
    category = request.form.get("category", "Other").strip()
    valid_blog_cats = ["Academic", "Work", "Personal", "Financial", "Health", "Other"]
    if category not in valid_blog_cats:
        category = "Other"

    if not title or not content:
        return jsonify({"error": "Title and content are required"}), 400

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO blogs (admin_id, title, content, category) VALUES (?, ?, ?, ?)",
        (admin_id, title, content, category)
    )
    blog_id = cursor.lastrowid

    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename:
            ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
            if ext in ["jpg", "jpeg", "png", "gif", "webp"]:
                filename = f"blog_{blog_id}.{ext}"
                filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(filepath)
                image_url = f"/uploads/{filename}"
                conn.execute("UPDATE blogs SET image = ? WHERE id = ?", (image_url, blog_id))

    conn.commit()
    conn.close()
    return jsonify({"message": "Blog created", "id": blog_id}), 201

@app.route("/blogs", methods=["GET"])
@token_required
def get_blogs():
    conn = get_db()
    blogs = conn.execute(
        "SELECT id, admin_id, title, content, category, image, created_at FROM blogs ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(b) for b in blogs])

@app.route("/blogs/<int:blog_id>", methods=["GET"])
@token_required
def get_blog(blog_id):
    conn = get_db()
    blog = conn.execute(
        "SELECT id, admin_id, title, content, category, image, created_at FROM blogs WHERE id = ?",
        (blog_id,)
    ).fetchone()
    conn.close()
    if not blog:
        return jsonify({"error": "Blog not found"}), 404
    return jsonify(dict(blog))

@app.route("/blogs/<int:blog_id>", methods=["DELETE"])
@admin_required
def delete_blog(blog_id):
    conn = get_db()
    blog = conn.execute("SELECT id FROM blogs WHERE id = ?", (blog_id,)).fetchone()
    if not blog:
        conn.close()
        return jsonify({"error": "Blog not found"}), 404
    conn.execute("DELETE FROM blogs WHERE id = ?", (blog_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "Blog deleted"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)




