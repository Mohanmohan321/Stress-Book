import React, { useState } from "react";
import LoginPage from "./components/LoginPage";
import AdminDashboard from "./components/AdminDashboard";
import UserHome from "./components/UserHome";
import "./App.css";

function App() {
  const [auth, setAuth] = useState(null);

  const handleLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    setAuth(data);
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
  };

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (auth.role === "admin") {
    return <AdminDashboard auth={auth} onLogout={handleLogout} />;
  }

  return <UserHome auth={auth} onLogout={handleLogout} />;
}

export default App;
