import React, { useState } from "react";
import axios from "axios";

const API = "http://localhost:5000";

function LoginPage({ onLogin }) {
  const [tab, setTab] = useState("user");
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearForm = () => {
    setName("");
    setEmail("");
    setPassword("");
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setIsRegister(false);
    clearForm();
    clearMessages();
  };

  const toggleRegister = () => {
    if (tab !== "user") return;

    setIsRegister((prev) => !prev);
    clearForm();
    clearMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      if (isRegister) {
        const res = await axios.post(`${API}/user/register`, {
          name,
          email,
          password,
        });

        clearForm();
        setIsRegister(false);
        setSuccess(`${res.data.message}. Please log in.`);
        return;
      }

      if (tab === "admin") {
        const res = await axios.post(`${API}/admin/login`, { email, password });
        onLogin(res.data);
        return;
      }

      const res = await axios.post(`${API}/user/login`, { email, password });
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Server unavailable. Please try again in a moment.");
    }
  };

  const title = tab === "admin"
    ? "Admin Login"
    : isRegister
      ? "User Registration"
      : "User Login";

  const switchLabel = isRegister
    ? "Already have an account? Login"
    : "New user? Register here";

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-branding">
          <h1>StressBook</h1>
          <p>
            Share your stress, connect with others,
            <br />
            and get AI-powered wellness support.
          </p>
        </div>
        <div className="login-box">
          <div className="login-tabs">
            <button
              className={`login-tab ${tab === "user" ? "active" : ""}`}
              onClick={() => switchTab("user")}
            >
              User Login
            </button>
            <button
              className={`login-tab ${tab === "admin" ? "active" : ""}`}
              onClick={() => switchTab("admin")}
            >
              Admin
            </button>
          </div>

          <h2>{title}</h2>

          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="login-btn">
              {isRegister ? "Register" : "Login"}
            </button>
          </form>

          {tab === "user" && (
            <div className="login-switch">
              <button onClick={toggleRegister}>{switchLabel}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
