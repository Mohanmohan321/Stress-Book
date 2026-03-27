import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function BlogAdmin({ auth }) {
  const [blogs, setBlogs] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("");
  const imageRef = useRef(null);

  const headers = { Authorization: `Bearer ${auth.token}` };

  const fetchBlogs = async () => {
    try {
      const res = await axios.get(`${API}/blogs`, { headers });
      setBlogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMsg("Title and content are required");
      setMsgType("error");
      return;
    }
    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    if (image) formData.append("image", image);
    try {
      await axios.post(`${API}/blogs`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      setMsg("Blog published successfully!");
      setMsgType("success");
      setTitle("");
      setContent("");
      setImage(null);
      if (imageRef.current) imageRef.current.value = "";
      fetchBlogs();
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || "Error publishing blog");
      setMsgType("error");
    }
  };

  const handleDelete = async (blogId) => {
    if (!window.confirm("Delete this blog post?")) return;
    try {
      await axios.delete(`${API}/blogs/${blogId}`, { headers });
      fetchBlogs();
    } catch {
      alert("Error deleting blog");
    }
  };

  return (
    <div>
      <h2 className="adm-section-title">Blog Management</h2>

      <div className="adm-card">
        <h3>Create New Blog Post</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className="blog-input"
            placeholder="Blog Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="blog-textarea"
            placeholder="Write your blog content here..."
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          <div className="blog-image-upload">
            <label>Cover Image (optional):</label>
            <input
              type="file"
              accept="image/*"
              ref={imageRef}
              onChange={(e) => setImage(e.target.files[0])}
            />
          </div>
          <button type="submit" className="admin-btn" style={{ marginTop: 12 }}>
            Publish Blog
          </button>
        </form>
        {msg && (
          <p className={`admin-msg ${msgType === "error" ? "error" : ""}`}>{msg}</p>
        )}
      </div>

      <div className="adm-card">
        <h3>Published Blogs ({blogs.length})</h3>
        {blogs.length === 0 ? (
          <p className="empty-text">No blogs published yet.</p>
        ) : (
          <div className="blog-admin-list">
            {blogs.map((b) => (
              <div className="blog-admin-item" key={b.id}>
                {b.image && (
                  <img
                    src={`${API}${b.image}`}
                    alt={b.title}
                    className="blog-admin-thumb"
                  />
                )}
                <div className="blog-admin-info">
                  <h4>{b.title}</h4>
                  <p className="blog-admin-preview">
                    {b.content.length > 120 ? b.content.substring(0, 120) + "..." : b.content}
                  </p>
                  <span className="blog-admin-date">
                    {b.created_at ? b.created_at.split(" ")[0] : "-"}
                  </span>
                </div>
                <button className="btn-danger-sm" onClick={() => handleDelete(b.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BlogAdmin;
