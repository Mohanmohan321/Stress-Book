import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function AdminFeed({ auth }) {
  const [posts, setPosts] = useState([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStress, setFilterStress] = useState("");
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${auth.token}` };

  const stressColor = (level) => {
    if (level === "High") return "#d32f2f";
    if (level === "Medium") return "#f9a825";
    return "#388e3c";
  };

  const fetchPosts = async (cat, stress) => {
    setLoading(true);
    try {
      const params = {};
      const c = cat !== undefined ? cat : filterCategory;
      const s = stress !== undefined ? stress : filterStress;
      if (c) params.category = c;
      if (s) params.stress_level = s;
      const res = await axios.get(`${API}/posts`, { headers, params });
      setPosts(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div>
      <h2 className="adm-section-title">User Feed</h2>

      <div className="adm-card">
        <div className="filter-row">
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); fetchPosts(e.target.value, undefined); }}
          >
            <option value="">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Work">Work</option>
            <option value="Personal">Personal</option>
            <option value="Financial">Financial</option>
            <option value="Health">Health</option>
            <option value="Other">Other</option>
          </select>
          <select
            value={filterStress}
            onChange={(e) => { setFilterStress(e.target.value); fetchPosts(undefined, e.target.value); }}
          >
            <option value="">All Stress Levels</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          {(filterCategory || filterStress) && (
            <button className="admin-btn" onClick={() => { setFilterCategory(""); setFilterStress(""); fetchPosts("", ""); }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {loading && <p className="empty-text">Loading posts...</p>}
      {!loading && posts.length === 0 && <p className="empty-text">No posts found.</p>}

      <div className="admin-feed-grid">
        {posts.map((post) => (
          <div
            className="admin-feed-card"
            key={post.id}
            style={{ borderLeft: `4px solid ${stressColor(post.stress_level)}` }}
          >
            <div className="admin-feed-header">
              <div className="admin-feed-avatar">
                {post.profile_pic ? (
                  <img src={`${API}${post.profile_pic}`} alt={post.name} className="avatar-img md" />
                ) : (
                  <span>{post.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="admin-feed-meta">
                <div className="admin-feed-name">{post.name}</div>
                <div className="admin-feed-role">User</div>
                <div className="admin-feed-time">
                  {post.created_at ? post.created_at.split(" ")[0] : "-"}
                </div>
              </div>
              {post.category && (
                <span className="category-badge" style={{ marginLeft: "auto" }}>
                  {post.category}
                </span>
              )}
            </div>

            {post.image && (
              <img src={`${API}${post.image}`} alt="post" className="post-image" />
            )}

            <p className="admin-feed-content">{post.content}</p>

            <div className="admin-feed-footer">
              <span
                className="stress-tag"
                style={{ background: stressColor(post.stress_level), color: "#fff" }}
              >
                {post.stress_level} Stress
              </span>
              <span className="admin-feed-comments">
                {post.comments ? post.comments.length : 0} comments
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminFeed;
