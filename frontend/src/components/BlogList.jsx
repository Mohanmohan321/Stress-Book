import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const CATEGORIES = ["All", "Academic", "Work", "Personal", "Financial", "Health", "Other"];

const CAT_ICON = {
  Academic: "🎓",
  Work: "💼",
  Personal: "🏠",
  Financial: "💰",
  Health: "🏥",
  Other: "📌",
};

function BlogList({ auth, onOpenBlog }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API}/blogs`, { headers })
      .then((res) => setBlogs(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    activeCategory === "All"
      ? blogs
      : blogs.filter((b) => (b.category || "Other") === activeCategory);

  if (loading) return <p className="empty-text">Loading blogs...</p>;

  return (
    <div>
      <h2 className="section-title">Blogs</h2>

      {/* Category filter tabs */}
      <div className="blog-category-tabs">
        {CATEGORIES.map((cat) => {
          const count =
            cat === "All"
              ? blogs.length
              : blogs.filter((b) => (b.category || "Other") === cat).length;
          return (
            <button
              key={cat}
              className={`blog-cat-tab${activeCategory === cat ? " active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat !== "All" && <span style={{ marginRight: 4 }}>{CAT_ICON[cat]}</span>}
              {cat}
              <span className="blog-cat-count">{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-text">
          {blogs.length === 0
            ? "No blogs available yet."
            : `No blogs in the "${activeCategory}" category yet.`}
        </p>
      ) : (
        <div className="blog-grid">
          {filtered.map((blog) => (
            <div
              className="blog-card"
              key={blog.id}
              onClick={() => onOpenBlog(blog.id)}
            >
              {blog.image ? (
                <img
                  src={`${API}${blog.image}`}
                  alt={blog.title}
                  className="blog-card-img"
                />
              ) : (
                <div className="blog-card-no-img">
                  <span style={{ fontSize: "2rem" }}>{CAT_ICON[blog.category || "Other"]}</span>
                </div>
              )}
              <div className="blog-card-body">
                <span className="blog-card-category">
                  {CAT_ICON[blog.category || "Other"]} {blog.category || "Other"}
                </span>
                <h3 className="blog-card-title">{blog.title}</h3>
                <p className="blog-card-preview">
                  {blog.content.length > 100
                    ? blog.content.substring(0, 100) + "..."
                    : blog.content}
                </p>
                <span className="blog-card-date">
                  {blog.created_at ? blog.created_at.split(" ")[0] : "-"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BlogList;
