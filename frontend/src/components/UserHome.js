import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import BlogList from "./BlogList";
import BlogDetail from "./BlogDetail";

const API = "http://localhost:5000";
const EMOJIS = ["\ud83d\ude0a", "\ud83d\ude22", "\ud83d\ude21", "\ud83d\udc4d"];
function SidebarNavIcon({ type }) {
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
    case "profile":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5 19c1.7-3 4.1-4.5 7-4.5S17.3 16 19 19" />
        </svg>
      );
    case "addpost":
      return (
        <svg {...iconProps}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
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
    default:
      return null;
  }
}

function UserHome({ auth, onLogout }) {
  const [activeTab, setActiveTab] = useState("feed");

  // Profile
  const [profile, setProfile] = useState(null);

  // View other user profile
  const [viewProfile, setViewProfile] = useState(null);

  // Add Post
  const [postContent, setPostContent] = useState("");
  const [postCategory, setPostCategory] = useState("");
  const [postMsg, setPostMsg] = useState("");

  // Feed Filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStress, setFilterStress] = useState("");
  const [sortBy, setSortBy] = useState("");

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("stressbook_theme") === "dark";
  });

  // Report modal
  const [reportModal, setReportModal] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportMsg, setReportMsg] = useState("");

  // Feed
  const [posts, setPosts] = useState([]);
  const [commentInputs, setCommentInputs] = useState({});

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Chatbot
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Profile pic upload
  const fileInputRef = useRef(null);

  // Image post upload
  const [postImage, setPostImage] = useState(null);
  const postImageRef = useRef(null);

  // Blogs
  const [blogTab, setBlogTab] = useState("list");
  const [currentBlogId, setCurrentBlogId] = useState(null);

  // Follow / Privacy
  const [followLoading, setFollowLoading] = useState(false);

  const headers = { Authorization: `Bearer ${auth.token}` };

  // ==================== FETCHERS ====================

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/profile`, { headers });
      setProfile(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchPosts = async (catOverride, stressOverride, sortOverride) => {
    try {
      const params = {};
      const cat = catOverride !== undefined ? catOverride : filterCategory;
      const stress = stressOverride !== undefined ? stressOverride : filterStress;
      const sort = sortOverride !== undefined ? sortOverride : sortBy;
      if (cat) params.category = cat;
      if (stress) params.stress_level = stress;
      if (sort) params.sort_by = sort;
      const res = await axios.get(`${API}/posts`, { headers, params });
      setPosts(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications`, { headers });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch (err) { console.error(err); }
  };

  const fetchUserProfile = async (userId) => {
    try {
      const res = await axios.get(`${API}/profile/${userId}`, { headers });
      setViewProfile(res.data);
      setActiveTab("viewprofile");
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchProfile();
    fetchPosts();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark");
      localStorage.setItem("stressbook_theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("stressbook_theme", "light");
    }
  }, [darkMode]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ==================== SEARCH ====================

  useEffect(() => {
    if (searchQuery.trim().length === 0) { setSearchResults([]); setShowSearch(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/search`, { headers, params: { query: searchQuery } });
        setSearchResults(res.data);
        setShowSearch(true);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchClick = (userId) => {
    setShowSearch(false);
    setSearchQuery("");
    fetchUserProfile(userId);
  };

  // ==================== PROFILE PIC ====================

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post(`${API}/upload_profile_pic`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      fetchProfile();
    } catch (err) { console.error(err); }
  };

  // ==================== ADD POST ====================

  const handlePost = async () => {
    if (!postContent.trim()) return;
    try {
      const formData = new FormData();
      formData.append("content", postContent);
      formData.append("category", postCategory || "");
      if (postImage) formData.append("image", postImage);

      const res = await axios.post(`${API}/post`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      setPostContent("");
      setPostCategory("");
      setPostImage(null);
      if (postImageRef.current) postImageRef.current.value = "";
      const detected = res.data.detected_category ? ` (${res.data.detected_category})` : "";
      setPostMsg(res.data.alert || `Posted successfully!${detected}`);
      fetchPosts();
      fetchProfile();
      setTimeout(() => setPostMsg(""), 4000);
    } catch (err) { setPostMsg("Error posting"); }
  };

  const handleDeleteOwnPost = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await axios.delete(`${API}/posts/${postId}`, { headers });
      fetchPosts();
      fetchProfile();
      setPostMsg("Post deleted successfully.");
      setTimeout(() => setPostMsg(""), 3000);
    } catch (err) {
      const message = err.response?.data?.error || "Error deleting post";
      setPostMsg(message);
      setTimeout(() => setPostMsg(""), 3000);
    }
  };
  // ==================== LIKES ====================

  const handleLike = async (postId) => {
    try {
      const res = await axios.post(`${API}/posts/${postId}/like`, {}, { headers });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, like_count: res.data.like_count, liked_by_me: res.data.liked }
            : p
        )
      );
    } catch (err) { console.error(err); }
  };

  // ==================== REPORT ====================

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await axios.post(`${API}/reports`, { post_id: reportModal, reason: reportReason }, { headers });
      setReportMsg("Report submitted!");
      setReportReason("");
      setTimeout(() => { setReportModal(null); setReportMsg(""); }, 1500);
    } catch (err) { setReportMsg(err.response?.data?.error || "Error reporting"); }
  };

  // ==================== COMMENTS ====================

  const handleCommentChange = (postId, value) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: value }));
  };

  const handleEmojiClick = (postId, emoji) => {
    setCommentInputs((prev) => ({ ...prev, [postId]: (prev[postId] || "") + emoji }));
  };

  const handleCommentSubmit = async (postId) => {
    const comment = (commentInputs[postId] || "").trim();
    if (!comment) return;
    try {
      await axios.post(`${API}/comment`, { post_id: postId, comment }, { headers });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  // ==================== NOTIFICATIONS ====================

  const handleToggleNotifs = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { headers });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  // ==================== CHATBOT ====================

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await axios.post(`${API}/chat`, { message: userMsg, history: chatMessages }, { headers });
      setChatMessages((prev) => [...prev, {
        role: "bot",
        content: res.data.reply,
        suggested_blogs: res.data.suggested_blogs || []
      }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "bot", content: err.response?.data?.error || "Error" }]);
    } finally { setChatLoading(false); }
  };

  const handleOpenBlogFromChat = (blogId) => {
    setCurrentBlogId(blogId);
    setBlogTab("detail");
    setActiveTab("blogs");
  };

  const handleChatKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); }
  };

  // ==================== FOLLOW / PRIVACY ====================

  const handleFollowToggle = async (targetUserId) => {
    setFollowLoading(true);
    try {
      await axios.post(`${API}/follow/${targetUserId}`, {}, { headers });
      const res = await axios.get(`${API}/profile/${targetUserId}`, { headers });
      setViewProfile(res.data);
      fetchPosts();
    } catch (err) { console.error(err); }
    finally { setFollowLoading(false); }
  };

  const handleFollowRequestAction = async (requestId, action) => {
    try {
      await axios.post(`${API}/follow-request/${requestId}/${action}`, {}, { headers });
      fetchNotifications();
    } catch (err) { console.error(err); }
  };

  const handlePrivacyToggle = async () => {
    const newVal = !profile.user.is_private;
    try {
      await axios.put(`${API}/profile/privacy`, { is_private: newVal }, { headers });
      fetchProfile();
    } catch (err) { console.error(err); }
  };

  // ==================== HELPERS ====================

  const stressColor = (level) => {
    if (level === "High") return "#d32f2f";
    if (level === "Medium") return "#f9a825";
    return "#388e3c";
  };

  const avatarImg = (pic, name, size) => {
    if (pic) {
      return <img src={`${API}${pic}`} alt={name} className={`avatar-img ${size || ""}`} />;
    }
    return <span>{(name || "U").charAt(0).toUpperCase()}</span>;
  };

  // ==================== RENDER ====================

  return (
    <div className="user-page">
      {/* ==================== NAVBAR ==================== */}
      <div className="navbar">
        <div className="navbar-left">
          <h2>StressBook</h2>
        </div>

        {/* Search */}
        <div className="navbar-center" ref={searchRef}>
          <input
            className="navbar-search"
            placeholder="Search users by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
          />
          {showSearch && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map((u) => (
                <div className="search-item" key={u.id} onClick={() => handleSearchClick(u.id)}>
                  <div className="search-avatar">
                    {u.profile_pic ? (
                      <img src={`${API}${u.profile_pic}`} alt={u.name} className="avatar-img sm" />
                    ) : (
                      u.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="search-name">{u.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSearch && searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <div className="search-dropdown">
              <div className="search-empty">No users found</div>
            </div>
          )}
        </div>

        <div className="navbar-right">
          {/* Home */}
          <div className="navbar-icon" title="Home"
               onClick={() => { setActiveTab("feed"); fetchPosts(); }}>
            {"\ud83c\udfe0"}
          </div>

          {/* Notifications */}
          <div className="navbar-icon-wrap" ref={notifRef}>
            <div className="navbar-icon" title="Notifications" onClick={handleToggleNotifs}>
              {"\ud83d\udd14"}
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </div>
            {showNotifs && (
              <div className="notif-dropdown">
                <div className="notif-header">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button className="notif-mark-all" onClick={handleMarkAllRead}>Mark all read</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="notif-empty">No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`notif-item ${n.is_read ? "" : "unread"}`}>
                      <p>{n.message}</p>
                      {n.notif_type === "follow_request" && n.request_status === "pending" && (
                        <div className="follow-request-actions">
                          <button
                            className="follow-req-btn accept"
                            onClick={() => handleFollowRequestAction(n.related_id, "accept")}
                          >
                            Accept
                          </button>
                          <button
                            className="follow-req-btn decline"
                            onClick={() => handleFollowRequestAction(n.related_id, "decline")}
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      <span className="notif-time">{n.created_at}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button className="theme-toggle-btn" onClick={() => setDarkMode((d) => !d)} title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {darkMode ? "🌙 Dark" : "☀️ Light"}
          </button>
          <span className="navbar-email">{auth.name || auth.email}</span>
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="user-body">
        {/* ==================== SIDEBAR ==================== */}
        <div className="sidebar">
          <div className="sidebar-section-label">Workspace</div>
          <div className={`sidebar-item ${activeTab === "profile" ? "active" : ""}`}
               onClick={() => { setActiveTab("profile"); fetchProfile(); }}>
            <span className="sidebar-icon"><SidebarNavIcon type="profile" /></span>
            <span className="sidebar-text">Profile</span>
          </div>
          <div className={`sidebar-item ${activeTab === "addpost" ? "active" : ""}`}
               onClick={() => setActiveTab("addpost")}>
            <span className="sidebar-icon"><SidebarNavIcon type="addpost" /></span>
            <span className="sidebar-text">Add Post</span>
          </div>
          <div className={`sidebar-item ${activeTab === "feed" ? "active" : ""}`}
               onClick={() => { setActiveTab("feed"); fetchPosts(); }}>
            <span className="sidebar-icon"><SidebarNavIcon type="feed" /></span>
            <span className="sidebar-text">Feed</span>
          </div>
          <div className={`sidebar-item ${activeTab === "blogs" ? "active" : ""}`}
               onClick={() => { setActiveTab("blogs"); setBlogTab("list"); }}>
            <span className="sidebar-icon"><SidebarNavIcon type="blogs" /></span>
            <span className="sidebar-text">Blogs</span>
          </div>
        </div>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="feed">

          {/* ==================== PROFILE TAB ==================== */}
          {activeTab === "profile" && profile && (
            <>
              <div className="profile-card">
                <div className="profile-avatar-large" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
                  {profile.user.profile_pic ? (
                    <img src={`${API}${profile.user.profile_pic}`} alt={profile.user.name} className="avatar-img lg" />
                  ) : (
                    (profile.user.name || "U").charAt(0).toUpperCase()
                  )}
                  <div className="avatar-overlay">Change</div>
                </div>
                <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }}
                       onChange={handleProfilePicChange} />
                <div className="profile-info">
                  <h2>{profile.user.name}</h2>
                  <div className="profile-details">
                    <div className="profile-detail-item">
                      <span className="profile-label">Email</span>
                      <span>{profile.user.email}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-label">Joined</span>
                      <span>{profile.user.created_at ? profile.user.created_at.split(" ")[0] : "-"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {profile.admin && (
                <div className="info-card">
                  <h3>{"\ud83d\udee1\ufe0f"} Admin Info</h3>
                  <div className="info-row"><span className="info-label">Admin Name</span><span>{profile.admin.name}</span></div>
                  <div className="info-row"><span className="info-label">Admin Email</span><span>{profile.admin.email}</span></div>
                </div>
              )}

              <div className="info-card">
                <h3>{"\ud83d\udcca"} Stats</h3>
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-number">{profile.stats.total_posts}</div>
                    <div className="stat-label">Posts</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{profile.followers_count || 0}</div>
                    <div className="stat-label">Followers</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{profile.following_count || 0}</div>
                    <div className="stat-label">Following</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{profile.stats.last_active ? profile.stats.last_active.split(" ")[0] : "N/A"}</div>
                    <div className="stat-label">Last Active</div>
                  </div>
                </div>
              </div>

              <div className="info-card privacy-card">
                <h3>{"\ud83d\udd12"} Privacy Settings</h3>
                <div className="privacy-row">
                  <div className="privacy-status">
                    <span className={`privacy-badge ${profile.user.is_private ? "private" : "public"}`}>
                      {profile.user.is_private ? "\ud83d\udd12 Private" : "\ud83c\udf10 Public"}
                    </span>
                    <p className="privacy-hint">
                      {profile.user.is_private
                        ? "Only your followers can see your posts and interact with them."
                        : "Everyone can see your posts and interact with them."}
                    </p>
                  </div>
                  <button
                    className={`privacy-toggle-btn ${profile.user.is_private ? "make-public" : "make-private"}`}
                    onClick={handlePrivacyToggle}
                  >
                    {profile.user.is_private ? "Make Public" : "Make Private"}
                  </button>
                </div>
              </div>

              <div className="info-card">
                <h3>{"\ud83d\udcdd"} My Posts</h3>
                {profile.posts.length === 0 ? (
                  <p className="empty-text">No posts yet.</p>
                ) : (
                  profile.posts.map((p) => (
                    <div className="my-post-item" key={p.id}>
                      <div className="post-color-bar" style={{ background: stressColor(p.stress_level) }} />
                      <p className="my-post-content">{p.content}</p>
                      <div className="my-post-meta">
                        {p.category && <span className="category-badge sm">{p.category}</span>}
                        <span className="my-post-date">{p.created_at}</span>
                        <button className="btn-danger-sm my-post-delete-btn" onClick={() => handleDeleteOwnPost(p.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ==================== VIEW OTHER USER PROFILE ==================== */}
          {activeTab === "viewprofile" && viewProfile && (
            <>
              <button className="back-btn" onClick={() => setActiveTab("feed")}>{"\u2190"} Back to Feed</button>
              <div className="profile-card">
                <div className="profile-avatar-large">
                  {viewProfile.user.profile_pic ? (
                    <img src={`${API}${viewProfile.user.profile_pic}`} alt={viewProfile.user.name} className="avatar-img lg" />
                  ) : (
                    (viewProfile.user.name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="profile-info">
                  <h2>
                    {viewProfile.user.name}
                    {viewProfile.is_private && (
                      <span className="privacy-badge private" style={{ marginLeft: 8, fontSize: "0.85rem" }}>{"\ud83d\udd12"} Private</span>
                    )}
                  </h2>
                  <div className="profile-details">
                    <div className="profile-detail-item">
                      <span className="profile-label">Email</span>
                      <span>{viewProfile.user.email}</span>
                    </div>
                    <div className="profile-detail-item">
                      <span className="profile-label">Joined</span>
                      <span>{viewProfile.user.created_at ? viewProfile.user.created_at.split(" ")[0] : "-"}</span>
                    </div>
                  </div>
                  <button
                    className={`follow-btn ${viewProfile.is_following ? "following" : viewProfile.has_pending_request ? "requested" : ""}`}
                    onClick={() => handleFollowToggle(viewProfile.user.id)}
                    disabled={followLoading}
                  >
                    {followLoading ? "..." : viewProfile.is_following ? "\u2713 Following" : viewProfile.has_pending_request ? "Requested" : "+ Follow"}
                  </button>
                </div>
              </div>

              <div className="info-card">
                <div className="stats-grid">
                  <div className="stat-box">
                    <div className="stat-number">{viewProfile.followers_count || 0}</div>
                    <div className="stat-label">Followers</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{viewProfile.following_count || 0}</div>
                    <div className="stat-label">Following</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-number">{viewProfile.stats.total_posts}</div>
                    <div className="stat-label">Posts</div>
                  </div>
                </div>
              </div>

              {viewProfile.is_locked ? (
                <div className="info-card private-locked-card">
                  <div className="private-locked-body">
                    <div className="private-lock-icon">{"\ud83d\udd12"}</div>
                    <h3>This Account is Private</h3>
                    <p>Follow {viewProfile.user.name} to see their posts.</p>
                    <button
                      className={`follow-btn ${viewProfile.has_pending_request ? "requested" : ""}`}
                      onClick={() => handleFollowToggle(viewProfile.user.id)}
                      disabled={followLoading}
                    >
                      {followLoading ? "..." : viewProfile.has_pending_request ? "Requested" : "+ Follow"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="info-card">
                  <h3>{"\ud83d\udcdd"} Posts ({viewProfile.stats.total_posts})</h3>
                  {viewProfile.posts.length === 0 ? (
                    <p className="empty-text">No posts.</p>
                  ) : (
                    viewProfile.posts.map((p) => (
                      <div className="my-post-item" key={p.id}>
                        <p className="my-post-content">{p.content}</p>
                        <span className="my-post-date">{p.created_at}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          {/* ==================== ADD POST TAB ==================== */}
          {activeTab === "addpost" && (
            <div className="addpost-card">
              <h3>{"\ud83d\udcdd"} What's on your mind?</h3>
              <textarea
                className="addpost-textarea"
                placeholder="Share how you're feeling..."
                rows={5}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
              <div className="addpost-image-row">
                <label className="addpost-image-label">
                  {"\ud83d\uddbc\ufe0f"} Add Image (optional):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={postImageRef}
                  className="addpost-image-input"
                  onChange={(e) => setPostImage(e.target.files[0])}
                />
                {postImage && (
                  <img
                    src={URL.createObjectURL(postImage)}
                    alt="preview"
                    className="addpost-image-preview"
                  />
                )}
              </div>
              <div className="addpost-bottom">
                <div className="addpost-level">
                  <label>Category:</label>
                  <select value={postCategory} onChange={(e) => setPostCategory(e.target.value)}>
                    <option value="">Auto-Detect</option>
                    <option value="Academic">Academic</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Financial">Financial</option>
                    <option value="Health">Health</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <button className="addpost-btn" onClick={handlePost}>Post</button>
              </div>
              <span className="addpost-hint">Stress level & category are auto-detected if not selected</span>
              {postMsg && <p className="addpost-msg">{postMsg}</p>}
            </div>
          )}

          {/* ==================== BLOGS TAB ==================== */}
          {activeTab === "blogs" && (
            <>
              {blogTab === "list" && (
                <BlogList
                  auth={auth}
                  onOpenBlog={(id) => { setCurrentBlogId(id); setBlogTab("detail"); }}
                />
              )}
              {blogTab === "detail" && currentBlogId && (
                <BlogDetail
                  auth={auth}
                  blogId={currentBlogId}
                  onBack={() => setBlogTab("list")}
                />
              )}
            </>
          )}

          {/* ==================== FEED TAB ==================== */}
          {activeTab === "feed" && (
            <>
              {/* Filter Bar */}
              <div className="feed-filters">
                <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); fetchPosts(e.target.value, undefined, undefined); }}>
                  <option value="">All Categories</option>
                  <option value="Academic">Academic</option>
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Financial">Financial</option>
                  <option value="Health">Health</option>
                  <option value="Other">Other</option>
                </select>
                <select value={filterStress} onChange={(e) => { setFilterStress(e.target.value); fetchPosts(undefined, e.target.value, undefined); }}>
                  <option value="">All Stress Levels</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); fetchPosts(undefined, undefined, e.target.value); }}>
                  <option value="">Sort: Latest</option>
                  <option value="most_likes">Most Likes</option>
                  <option value="most_comments">Most Comments</option>
                </select>
                {(filterCategory || filterStress || sortBy) && (
                  <button className="filter-clear-btn" onClick={() => { setFilterCategory(""); setFilterStress(""); setSortBy(""); fetchPosts("", "", ""); }}>
                    Clear Filters
                  </button>
                )}
              </div>

              {posts.length === 0 && <p className="empty-text">No posts found for this filter.</p>}
              {posts.map((post) => (
                <div className="post-card" key={post.id} style={{ borderLeft: `4px solid ${stressColor(post.stress_level)}` }}>
                  <div className="post-header">
                    <div className="post-avatar" onClick={() => handleSearchClick(post.user_id)} style={{ cursor: "pointer" }}>
                      {post.profile_pic ? (
                        <img src={`${API}${post.profile_pic}`} alt={post.name} className="avatar-img md" />
                      ) : (
                        post.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="post-name" onClick={() => handleSearchClick(post.user_id)} style={{ cursor: "pointer" }}>
                        {post.name}
                      </div>
                      <div className="post-time">{post.created_at}</div>
                    </div>
                    {post.category && <span className="category-badge">{post.category}</span>}
                    {post.user_id === auth.user_id ? (
                      <button className="btn-danger-sm post-action-btn" onClick={() => handleDeleteOwnPost(post.id)}>
                        Delete
                      </button>
                    ) : (
                      <button className="report-btn post-action-btn"
                              onClick={() => { setReportModal(post.id); setReportReason(""); setReportMsg(""); }}>
                        Report
                      </button>
                    )}
                  </div>
                  {post.image && (
                    <img src={`${API}${post.image}`} alt="post" className="post-image" />
                  )}
                  <p className="post-content">{post.content}</p>

                  {/* Like Button */}
                  <div className="post-actions-row">
                    <button
                      className={`like-btn${post.liked_by_me ? " liked" : ""}`}
                      onClick={() => handleLike(post.id)}
                    >
                      <span className="heart-icon">{post.liked_by_me ? "❤️" : "🤍"}</span>
                      <span>{post.like_count || 0}</span>
                    </button>
                  </div>

                  {/* Comments */}
                  <div className="comments-section">
                    {post.comments.map((c) => (
                      <div className="comment-item" key={c.id}>
                        <div className="comment-avatar">{c.name.charAt(0).toUpperCase()}</div>
                        <div className="comment-bubble">
                          <div className="comment-name">{c.name}</div>
                          <div className="comment-text">{c.comment}</div>
                        </div>
                      </div>
                    ))}
                    <div className="emoji-bar">
                      {EMOJIS.map((emoji) => (
                        <button className="emoji-btn" key={emoji}
                                onClick={() => handleEmojiClick(post.id, emoji)}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="comment-input-row">
                      <input className="comment-input" placeholder="Write a comment..."
                             value={commentInputs[post.id] || ""}
                             onChange={(e) => handleCommentChange(post.id, e.target.value)}
                             onKeyDown={(e) => { if (e.key === "Enter") handleCommentSubmit(post.id); }} />
                      <button className="comment-send-btn" onClick={() => handleCommentSubmit(post.id)}>Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ==================== CHATBOT PANEL ==================== */}
        <div className="chatbot">
          <div className="chatbot-header">
            <h3>AI Wellness Chatbot</h3>
            <p>Powered by your history (RAG)</p>
          </div>
          <div className="chatbot-messages">
            {chatMessages.length === 0 && (
              <p className="chatbot-placeholder">Tell me how you're feeling...<br />I'll use your past posts for context.</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`chatbot-msg ${msg.role === "user" ? "chatbot-msg-user" : "chatbot-msg-bot"}`}>
                {msg.content}
                {msg.role === "bot" && msg.suggested_blogs && msg.suggested_blogs.length > 0 && (
                  <div className="chatbot-blog-suggestions">
                    <div className="chatbot-blog-suggestions-label">📚 Related Articles</div>
                    {msg.suggested_blogs.map((blog) => (
                      <div
                        key={blog.id}
                        className="chatbot-blog-card"
                        onClick={() => handleOpenBlogFromChat(blog.id)}
                      >
                        <span className="chatbot-blog-category">{blog.category || "Other"}</span>
                        <span className="chatbot-blog-title">{blog.title}</span>
                        <span className="chatbot-blog-arrow">→</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chatLoading && <div className="chatbot-msg chatbot-msg-bot">Thinking...</div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chatbot-input-area">
            <textarea className="chatbot-input" placeholder="Type your message..." rows={2}
                      value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatKey} />
            <button className="chatbot-send-btn" onClick={handleChatSend} disabled={chatLoading}>Send</button>
          </div>
        </div>
      </div>

      {/* ==================== REPORT MODAL ==================== */}
      {reportModal && (
        <div className="modal-overlay" onClick={() => setReportModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>{"\ud83d\udea9"} Report Post</h3>
            <textarea className="modal-textarea" placeholder="Why are you reporting this post?" rows={3}
                      value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setReportModal(null)}>Cancel</button>
              <button className="modal-submit" onClick={handleReport}>Submit Report</button>
            </div>
            {reportMsg && <p className="modal-msg">{reportMsg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserHome;


