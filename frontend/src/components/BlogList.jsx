import React, { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function BlogList({ auth, onOpenBlog }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = { Authorization: `Bearer ${auth.token}` };

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API}/blogs`, { headers })
      .then((res) => setBlogs(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="empty-text">Loading blogs...</p>;
  if (blogs.length === 0)
    return <p className="empty-text">No blogs available yet.</p>;

  return (
    <div>
      <h2 className="section-title">Blog</h2>
      <div className="blog-grid">
        {blogs.map((blog) => (
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
              <div className="blog-card-no-img">No Image</div>
            )}
            <div className="blog-card-body">
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
    </div>
  );
}

export default BlogList;
