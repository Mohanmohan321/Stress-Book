import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const CAT_ICON = {
  Academic: "🎓",
  Work: "💼",
  Personal: "🏠",
  Financial: "💰",
  Health: "🏥",
  Other: "📌",
};

function BlogDetail({ auth, blogId, onBack }) {
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API}/blogs/${blogId}`, { headers })
      .then((res) => setBlog(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [blogId]);

  if (loading) return <p className="empty-text">Loading...</p>;
  if (!blog) return <p className="empty-text">Blog not found.</p>;

  const cat = blog.category || "Other";

  return (
    <div className="blog-detail">
      <button className="back-btn" onClick={onBack}>
        ← Back to Blogs
      </button>
      {blog.image && (
        <img
          src={`${API}${blog.image}`}
          alt={blog.title}
          className="blog-detail-img"
        />
      )}
      <div className="blog-detail-meta">
        <span className="blog-card-category">
          {CAT_ICON[cat]} {cat}
        </span>
        <span className="blog-detail-date">
          {blog.created_at ? blog.created_at.split(" ")[0] : "-"}
        </span>
      </div>
      <h1 className="blog-detail-title">{blog.title}</h1>
      <div className="blog-detail-content">{blog.content}</div>
    </div>
  );
}

export default BlogDetail;
