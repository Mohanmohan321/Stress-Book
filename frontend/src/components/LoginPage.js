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

  const resetFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (tab === "admin" && isRegister) {
        const res = await axios.post(`${API}/admin/register`, {
          name,
          email,
          password,
        });
        setSuccess(res.data.message);
        setIsRegister(false);
        resetFields();
      } else if (tab === "admin") {
        const res = await axios.post(`${API}/admin/login`, { email, password });
        onLogin(res.data);
      } else {
        const res = await axios.post(`${API}/user/login`, { email, password });
        onLogin(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

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
              onClick={() => { setTab("user"); setIsRegister(false); resetFields(); }}
            >
              User Login
            </button>
            <button
              className={`login-tab ${tab === "admin" ? "active" : ""}`}
              onClick={() => { setTab("admin"); resetFields(); }}
            >
              Admin
            </button>
          </div>

          <h2>
            {tab === "admin"
              ? isRegister
                ? "Admin Registration"
                : "Admin Login"
              : "User Login"}
          </h2>

          {error && <p className="login-error">{error}</p>}
          {success && <p className="login-success">{success}</p>}

          <form onSubmit={handleSubmit}>
            {tab === "admin" && isRegister && (
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
              {tab === "admin" && isRegister ? "Register" : "Login"}
            </button>
          </form>

          {tab === "admin" && (
            <div className="login-switch">
              <button onClick={() => { setIsRegister(!isRegister); setError(""); setSuccess(""); }}>
                {isRegister
                  ? "Already have an account? Login"
                  : "New admin? Register here"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
