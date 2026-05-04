import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";
import BlogAdmin from "./BlogAdmin";

const API = "http://localhost:5000";
const PIE_COLORS = ["#d32f2f", "#f9a825", "#388e3c"];
function AdminNavIcon({ type }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  switch (type) {
    case "dashboard":
      return (
        <svg {...iconProps}>
          <path d="M4 19.5h16" />
          <rect x="5" y="10" width="3" height="7" rx="1" />
          <rect x="10.5" y="6.5" width="3" height="10.5" rx="1" />
          <rect x="16" y="8.5" width="3" height="8.5" rx="1" />
        </svg>
      );
    case "feed":
      return (
        <svg {...iconProps}>
          <rect x="3.5" y="4" width="17" height="16" rx="3" />
          <path d="M9 8h7" />
          <path d="M9 12h7" />
          <path d="M9 16h5" />
          <circle cx="6.5" cy="8" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="16" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case "blogs":
      return (
        <svg {...iconProps}>
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4H19v14.5a1.5 1.5 0 0 0-1.5-1.5H7.5A2.5 2.5 0 0 0 5 19.5z" />
          <path d="M5 6.5v13" />
          <path d="M8 7.5h8" />
          <path d="M8 11h6" />
        </svg>
      );
    case "posts":
      return (
        <svg {...iconProps}>
          <path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5z" />
          <path d="M14 4.5V9h4" />
          <path d="M9 13h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "reports":
      return (
        <svg {...iconProps}>
          <path d="M12 3.5l2.1 4.3 4.8.7-3.5 3.4.8 4.8L12 14.5 7.8 16.7l.8-4.8-3.5-3.4 4.8-.7z" />
          <path d="M12 8v2.5" />
          <path d="M12 13.25h.01" />
        </svg>
      );
    case "users":
      return (
        <svg {...iconProps}>
          <circle cx="9" cy="8.5" r="2.5" />
          <circle cx="16.5" cy="9.5" r="2" />
          <path d="M4.5 18c1.2-2.6 3.1-3.9 5.7-3.9 2.5 0 4.4 1.3 5.6 3.9" />
          <path d="M14.5 17.4c.7-1.7 2-2.7 3.9-3" />
        </svg>
      );
    default:
      return null;
  }
}

function AdminDashboard({ auth, onLogout }) {
  const [page, setPage] = useState("dashboard");

  // Dashboard
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [highRisk, setHighRisk] = useState([]);

  // Users
  const [users, setUsers] = useState([]);
  const [uName, setUName] = useState("");
  const [uEmail, setUEmail] = useState("");
  const [uPassword, setUPassword] = useState("");
  const [userMsg, setUserMsg] = useState("");
  const [userMsgType, setUserMsgType] = useState("");

  // Bulk CSV
  const [csvMsg, setCsvMsg] = useState("");
  const [csvErrors, setCsvErrors] = useState([]);

  // Manage Posts
  const [posts, setPosts] = useState([]);
  const [filterUser, setFilterUser] = useState("");
  const [filterStress, setFilterStress] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Reports
  const [reports, setReports] = useState([]);

  // Post preview modal
  const [selectedPost, setSelectedPost] = useState(null);

  const headers = { Authorization: `Bearer ${auth.token}` };

  // ==================== FETCHERS ====================

  const fetchOverview = async () => {
    try {
      const [ov, tr, hr] = await Promise.all([
        axios.get(`${API}/analytics/overview`, { headers }),
        axios.get(`${API}/analytics/trends`, { headers }),
        axios.get(`${API}/analytics/high-risk-users`, { headers }),
      ]);
      setOverview(ov.data);
      setTrends(tr.data);
      setHighRisk(hr.data);
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/get_users`, { headers });
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPosts = async () => {
    try {
      const params = {};
      if (filterUser) params.user_id = filterUser;
      if (filterStress) params.stress_level = filterStress;
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      const res = await axios.get(`${API}/admin/posts`, { headers, params });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API}/reports`, { headers });
      setReports(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchOverview();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (page === "posts") fetchPosts();
    if (page === "reports") fetchReports();
    if (page === "dashboard") fetchOverview();
    if (page === "users") fetchUsers();
  }, [page]);

  // ==================== HANDLERS ====================

  const handleAddUser = async (e) => {
    e.preventDefault();
    setUserMsg("");
    try {
      const res = await axios.post(`${API}/add_user`,
        { name: uName, email: uEmail, password: uPassword },
        { headers }
      );
      setUserMsg(res.data.message);
      setUserMsgType("success");
      setUName(""); setUEmail(""); setUPassword("");
      fetchUsers();
    } catch (err) {
      setUserMsg(err.response?.data?.error || "Error"); setUserMsgType("error");
    }
  };

  const handleExportUsers = async () => {
    try {
      const res = await axios.get(`${API}/export_users_csv`, { headers, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "users.csv";
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert("Export error"); }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvMsg(""); setCsvErrors([]);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/import_users_csv`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      setCsvMsg(res.data.message);
      setCsvErrors(res.data.errors || []);
      fetchUsers();
    } catch (err) {
      setCsvMsg(err.response?.data?.error || "Import failed");
    }
    e.target.value = "";
  };

  const handleExportPosts = async () => {
    try {
      const res = await axios.get(`${API}/export_posts_csv`, { headers, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "posts_export.csv";
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert("Export error"); }
  };

  const handleExportAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/export_analytics_csv`, { headers, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url; a.download = "analytics_export.csv";
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert("Export error"); }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axios.delete(`${API}/admin/posts/${postId}`, { headers });
      setSelectedPost(null);
      fetchPosts();
    } catch { alert("Delete error"); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/delete_user/${userId}`, { headers });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || "Error deleting user");
    }
  };

  const handleReportAction = async (reportId, status) => {
    try {
      await axios.put(`${API}/reports/${reportId}`, { status }, { headers });
      fetchReports();
      fetchPosts();
    } catch { alert("Error updating report"); }
  };

  // ==================== PIE DATA ====================
  const pieData = overview ? [
    { name: "High", value: overview.high_stress },
    { name: "Medium", value: overview.medium_stress },
    { name: "Low", value: overview.low_stress },
  ] : [];

  // ==================== RENDER ====================
  return (
    <div className="adm">
      {/* Top Navbar */}
      <div className="adm-topbar">
        <h2>StressBook Admin</h2>
        <div className="adm-topbar-right">
          <span>{auth.name}</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="adm-body">
        {/* Sidebar */}
        <div className="adm-sidebar">
          <div className="adm-sidebar-section-label">Admin Panel</div>
          {[
            { key: "dashboard", icon: "dashboard", label: "Dashboard" },
            { key: "blogs", icon: "blogs", label: "Blog Management" },
            { key: "posts", icon: "posts", label: "Manage Posts" },
            { key: "reports", icon: "reports", label: "Reported Posts" },
            { key: "users", icon: "users", label: "Users" },
          ].map((item) => (
            <div
              key={item.key}
              className={`adm-sidebar-item ${page === item.key ? "active" : ""}`}
              onClick={() => setPage(item.key)}
            >
              <span className="adm-sidebar-icon"><AdminNavIcon type={item.icon} /></span>
              <span className="adm-sidebar-text">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="adm-main">

          {/* ==================== BLOG MANAGEMENT ==================== */}
          {page === "blogs" && <BlogAdmin auth={auth} />}

          {/* ==================== DASHBOARD ==================== */}
          {page === "dashboard" && overview && (
            <>
              {/* Metric Cards */}
              <div className="metric-grid">
                <div className="metric-card">
                  <div className="metric-num">{overview.total_users}</div>
                  <div className="metric-lbl">Total Users</div>
                </div>
                <div className="metric-card">
                  <div className="metric-num">{overview.total_posts}</div>
                  <div className="metric-lbl">Total Posts</div>
                </div>
                <div className="metric-card high">
                  <div className="metric-num">{overview.high_stress}</div>
                  <div className="metric-lbl">High Stress</div>
                </div>
                <div className="metric-card medium">
                  <div className="metric-num">{overview.medium_stress}</div>
                  <div className="metric-lbl">Medium Stress</div>
                </div>
                <div className="metric-card low">
                  <div className="metric-num">{overview.low_stress}</div>
                  <div className="metric-lbl">Low Stress</div>
                </div>
                <div className="metric-card warn">
                  <div className="metric-num">{overview.pending_reports}</div>
                  <div className="metric-lbl">Pending Reports</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="chart-row">
                <div className="chart-card">
                  <h3>Stress Distribution</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                           outerRadius={100} label>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h3>Stress Trend Over Time</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="high" stroke="#d32f2f" strokeWidth={2} name="High" />
                      <Line type="monotone" dataKey="medium" stroke="#f9a825" strokeWidth={2} name="Medium" />
                      <Line type="monotone" dataKey="low" stroke="#388e3c" strokeWidth={2} name="Low" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="adm-card" style={{ display: "flex", gap: 10 }}>
                <button className="admin-btn export" onClick={handleExportPosts}>Export Posts CSV</button>
                <button className="admin-btn export" onClick={handleExportAnalytics}>Export Analytics CSV</button>
              </div>

              {/* High Risk Alerts */}
              <div className="adm-card">
                <h3>At-Risk Users (3+ High Stress Posts)</h3>
                {highRisk.length === 0 ? (
                  <p className="empty-text">No at-risk users detected.</p>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>High Posts</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highRisk.map((u) => (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td><strong>{u.high_stress_count}</strong></td>
                          <td><span className="risk-badge">AT RISK</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ==================== MANAGE POSTS ==================== */}
          {page === "posts" && (
            <>
              <div className="adm-card">
                <h3>Filter Posts</h3>
                <div className="filter-row">
                  <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <select value={filterStress} onChange={(e) => setFilterStress(e.target.value)}>
                    <option value="">All Levels</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                  <button className="admin-btn" onClick={fetchPosts}>Apply</button>
                </div>
              </div>

              <div className="adm-card">
                <h3>Posts ({posts.length})</h3>
                <button className="admin-btn export" onClick={handleExportPosts} style={{ marginBottom: 12 }}>
                  Export Posts CSV
                </button>
                {posts.length === 0 ? (
                  <p className="empty-text">No posts found.</p>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Content</th>
                        <th>Stress</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {posts.map((p) => (
                        <tr
                          key={p.id}
                          className="post-row-clickable"
                          onClick={() => setSelectedPost(p)}
                          title="Click to review this post"
                        >
                          <td>{p.id}</td>
                          <td>{p.name}</td>
                          <td className="td-content">
                            <span className="td-content-text">{p.content}</span>
                            {p.image && <span className="td-img-badge">IMG</span>}
                          </td>
                          <td>
                            <span className={`stress-tag ${p.stress_level.toLowerCase()}`}>
                              {p.stress_level}
                            </span>
                          </td>
                          <td>{p.created_at ? p.created_at.split(" ")[0] : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* ==================== REPORTED POSTS ==================== */}
          {page === "reports" && (
            <div className="adm-card">
              <h3>Reported Posts ({reports.filter((r) => r.status === "pending").length} pending)</h3>
              {reports.length === 0 ? (
                <p className="empty-text">No reports.</p>
              ) : (
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Post Content</th>
                      <th>Author</th>
                      <th>Reported By</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r.id} className={r.status !== "pending" ? "row-muted" : ""}>
                        <td className="td-content">{r.post_content}</td>
                        <td>{r.author_name}</td>
                        <td>{r.reporter_name}</td>
                        <td>{r.reason}</td>
                        <td>
                          <span className={`status-badge ${r.status}`}>{r.status}</span>
                        </td>
                        <td>{r.created_at ? r.created_at.split(" ")[0] : "-"}</td>
                        <td>
                          {r.status === "pending" ? (
                            <div className="action-btns">
                              <button className="btn-danger-sm" onClick={() => handleReportAction(r.id, "resolved")}>
                                Delete Post
                              </button>
                              <button className="btn-muted-sm" onClick={() => handleReportAction(r.id, "ignored")}>
                                Ignore
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "#65676b", fontSize: 13 }}>{r.status}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ==================== USERS ==================== */}
          {page === "users" && (
            <>
              <div className="adm-card">
                <h3>Add New User</h3>
                <form onSubmit={handleAddUser}>
                  <div className="form-grid">
                    <input type="text" placeholder="Full Name" value={uName}
                           onChange={(e) => setUName(e.target.value)} required />
                    <input type="email" placeholder="Email" value={uEmail}
                           onChange={(e) => setUEmail(e.target.value)} required />
                    <input type="password" placeholder="Password" value={uPassword}
                           onChange={(e) => setUPassword(e.target.value)} required />
                  </div>
                  <button type="submit" className="admin-btn" style={{ marginTop: 12 }}>Add User</button>
                </form>
                {userMsg && <p className={`admin-msg ${userMsgType === "error" ? "error" : ""}`}>{userMsg}</p>}
              </div>

              {/* Bulk CSV Import */}
              <div className="adm-card">
                <h3>Bulk Import Users (CSV)</h3>
                <p style={{ fontSize: 13, color: "#65676b", marginBottom: 10 }}>
                  CSV must have headers: <strong>Name, Email, Password</strong> (optional: Role, Department)
                </p>
                <label className="admin-btn" style={{ display: "inline-block", cursor: "pointer" }}>
                  Choose CSV File
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={handleBulkImport} />
                </label>
                {csvMsg && <p className="admin-msg" style={{ marginTop: 8 }}>{csvMsg}</p>}
                {csvErrors.length > 0 && (
                  <ul style={{ marginTop: 6, fontSize: 13, color: "#e74c3c", paddingLeft: 18 }}>
                    {csvErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>

              <div className="adm-card">
                <h3>All Users ({users.length})</h3>
                <button className="admin-btn export" onClick={handleExportUsers} style={{ marginBottom: 12 }}>
                  Export Users CSV
                </button>
                {users.length === 0 ? (
                  <p className="empty-text">No users added yet.</p>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Last Active</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.last_active ? u.last_active.split(" ")[0] : "Never"}</td>
                          <td>{u.created_at ? u.created_at.split(" ")[0] : "-"}</td>
                          <td>
                            <button className="btn-danger-sm" onClick={() => handleDeleteUser(u.id, u.name)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================== POST PREVIEW MODAL ==================== */}
      {selectedPost && (
        <div className="modal-overlay post-preview-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-box post-preview-box" onClick={(e) => e.stopPropagation()}>

            <div className="post-preview-header">
              <div className="post-preview-user">
                <div className="post-preview-avatar">
                  {selectedPost.name ? selectedPost.name[0].toUpperCase() : "U"}
                </div>
                <div>
                  <div className="post-preview-name">{selectedPost.name}</div>
                  <div className="post-preview-email">{selectedPost.email}</div>
                </div>
              </div>
              <button className="post-preview-close" onClick={() => setSelectedPost(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="post-preview-meta">
              <span className={`stress-tag ${selectedPost.stress_level.toLowerCase()}`}>
                {selectedPost.stress_level}
              </span>
              {selectedPost.category && (
                <span className="post-preview-category">{selectedPost.category}</span>
              )}
              <span className="post-preview-date">
                {selectedPost.created_at ? selectedPost.created_at.split(" ")[0] : "-"}
              </span>
              <span className="post-preview-id">#{selectedPost.id}</span>
            </div>

            <div className="post-preview-body">
              <p className="post-preview-content">{selectedPost.content}</p>
              {selectedPost.image && (
                <div className="post-preview-img-wrap">
                  <img
                    src={`${API}${selectedPost.image}`}
                    alt="Post attachment"
                    className="post-preview-img"
                  />
                </div>
              )}
            </div>

            <div className="post-preview-footer modal-actions">
              <button className="modal-cancel" onClick={() => setSelectedPost(null)}>
                Close
              </button>
              <button
                className="post-preview-delete-btn"
                onClick={() => handleDeletePost(selectedPost.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
                Delete Post
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;

