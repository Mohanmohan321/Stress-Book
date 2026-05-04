import React, { useState } from "react";
import LoginPage from "./components/LoginPage";
import AdminDashboard from "./components/AdminDashboard";
import UserHome from "./components/UserHome";
import TermsModal from "./components/TermsModal";
import "./App.css";

function App() {
  const [auth, setAuth] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    setAuth(data);
    setTermsAccepted(false);
  };

  const handleLogout = () => {
    localStorage.clear();
    setAuth(null);
    setTermsAccepted(false);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
  };

  const handleDeclineTerms = () => {
    localStorage.clear();
    setAuth(null);
    setTermsAccepted(false);
  };

  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!termsAccepted) {
    return (
      <TermsModal
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />
    );
  }

  if (auth.role === "admin") {
    return <AdminDashboard auth={auth} onLogout={handleLogout} />;
  }

  return <UserHome auth={auth} onLogout={handleLogout} />;
}

export default App;
