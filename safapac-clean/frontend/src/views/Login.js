// src/views/Login.js

import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Form,
  FormGroup,
  FormInput,
  Alert
} from "shards-react";
import { useAuth } from "../contexts/AuthContext";
import { useAccess } from "../contexts/AccessContext";

const Login = ({ history }) => {
  const { login } = useAuth();
  const { changeAccessLevel } = useAccess();

  // Force light mode on login page
  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');

    // Restore original theme when leaving login page
    return () => {
      if (originalTheme) {
        document.documentElement.setAttribute('data-theme', originalTheme);
      }
    };
  }, []);

  const [activeTab, setActiveTab] = useState("signin");
  const [credentials, setCredentials] = useState({ email: "", password: "" }); // Changed from username to email
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => ({ target }) => {
    const { value = "" } = target || {};
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    console.log("🔐 Login attempt with:", credentials.email);
    
    // Basic validation
    if (!credentials.email || !credentials.password) {
      setError("Please enter both email and password");
      setIsSubmitting(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      setError("Please enter a valid email address");
      setIsSubmitting(false);
      return;
    }

    const result = await login(credentials.email, credentials.password);
    console.log("🔐 Login result:", result);

    if (result.success) {
      console.log("✅ Login SUCCESS - Showing loading transition");
      console.log("👤 User data:", result.user);

      // The backend sends 'accessLevel' (CamelCase) in the user object
      if (result.user.accessLevel) {
        console.log("🔓 Setting Access Level to:", result.user.accessLevel);
        changeAccessLevel(result.user.accessLevel);
      } else {
        // Fallback if backend doesn't send it yet
        console.warn("⚠️ No access level in response, defaulting to CORE");
        changeAccessLevel("CORE");
      }

      // Show brief loading transition before redirect
      setTimeout(() => {
        console.log("→ Redirecting to TEA");
        history.push("/TEA");
      }, 800);
    } else {
      console.log("❌ Login FAILED:", result.message);
      setError(result.message || "Unable to sign in right now.");
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!credentials.email) {
      setError("Please enter your email address.");
      setIsSubmitting(false);
      return;
    }

    // TODO: Replace with actual API call
    // For now, simulate success
    setTimeout(() => {
      setSuccess("If an account exists with this email, a password reset link has been sent.");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div
      style={{
          height: "100vh",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          overflow: "hidden",
        }}
      >
      {/* Background and overlay remain the same */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "url('/images/auth/Airbus.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(8px)",
          zIndex: -2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, rgba(26, 58, 71, 0.85) 0%, rgba(45, 90, 107, 0.75) 50%, rgba(26, 58, 71, 0.85) 100%)",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
      
      {/* Card Container */}
      <div
        style={{
          maxWidth: "1400px",
          width: "95%",
          height: "calc(100vh - 4rem)",
          maxHeight: "900px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          display: "flex",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Left Panel - 40% */}
        <div
          style={{
            width: "40%",
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "3rem 2.5rem",
            minWidth: "480px",
            overflowY: "auto",
          }}
        >
          <div style={{ width: "100%", maxWidth: "400px" }}>
            <div style={{ marginBottom: "2rem" }}>
              {activeTab === "signin" && (
                <>
                  <h2
                    style={{
                      fontSize: "2rem",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      marginBottom: "0.75rem"
                    }}
                  >
                    Welcome Back
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0, lineHeight: "1.4" }}>
                    Sign in to your account to continue
                  </p>
                </>
              )}
              {activeTab === "forgot" && (
                <>
                  <h2
                    style={{
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      marginBottom: "0.5rem"
                    }}
                  >
                    Reset Password
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0, lineHeight: "1.4" }}>
                    Enter your email to receive a password reset link
                  </p>
                </>
              )}
            </div>

            {/* Success/Error Messages */}
            {error && (
              <Alert theme="danger" style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert theme="success" style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
                {success}
              </Alert>
            )}

            {/* Sign In Form */}
            {activeTab === "signin" && (
              <Form onSubmit={handleSignIn}>
                <FormGroup>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                    Email Address
                  </label>
                  <FormInput
                    size="lg"
                    type="email"
                    placeholder="Enter your email"
                    value={credentials.email}
                    onChange={handleChange("email")}
                    style={{
                      fontSize: "0.95rem",
                      backgroundColor: "#ffffff",
                      color: "#212529",
                      border: "1px solid #d1d5db"
                    }}
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                    Password
                  </label>
                  <FormInput
                    size="lg"
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={handleChange("password")}
                    style={{
                      fontSize: "0.95rem",
                      backgroundColor: "#ffffff",
                      color: "#212529",
                      border: "1px solid #d1d5db"
                    }}
                    required
                  />
                </FormGroup>

                <div style={{ textAlign: "right", marginBottom: "1.5rem" }}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("forgot");
                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      fontSize: "0.875rem",
                      color: "#006D7C",
                      textDecoration: "none",
                      fontWeight: 500
                    }}
                  >
                    Forgot Password?
                  </a>
                </div>

                <Button
                  block
                  size="lg"
                  disabled={isSubmitting}
                  style={{
                    fontWeight: 600,
                    backgroundColor: "#006D7C",
                    border: "none",
                    padding: "0.75rem",
                    fontSize: "1rem",
                    marginBottom: "1.5rem"
                  }}
                  type="submit"
                >
                  {isSubmitting ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <div
                        style={{
                          width: "16px",
                          height: "16px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite"
                        }}
                      />
                      <span>Signing in...</span>
                    </div>
                  ) : "Sign In"}
                </Button>
                <style>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </Form>
            )}

            {/* Forgot Password Form */}
            {activeTab === "forgot" && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab("signin");
                      setError("");
                      setSuccess("");
                    }}
                    style={{
                      fontSize: "0.875rem",
                      color: "#006D7C",
                      textDecoration: "none",
                      fontWeight: 500
                    }}
                  >
                    ← Back to Sign In
                  </a>
                </div>
                <Form onSubmit={handleForgotPassword}>
                  <FormGroup>
                    <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                      Email Address
                    </label>
                    <FormInput
                      size="lg"
                      type="email"
                      placeholder="Enter your email"
                      value={credentials.email}
                      onChange={handleChange("email")}
                      style={{
                        fontSize: "0.95rem",
                        backgroundColor: "#ffffff",
                        color: "#212529",
                        border: "1px solid #d1d5db"
                      }}
                      required
                    />
                  </FormGroup>

                  <Button
                    block
                    size="lg"
                    disabled={isSubmitting}
                    style={{
                      fontWeight: 600,
                      backgroundColor: "#006D7C",
                      border: "none",
                      padding: "0.75rem",
                      fontSize: "1rem",
                      marginBottom: "1.5rem"
                    }}
                    type="submit"
                  >
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </Form>
              </>
            )}

            {/* Collaboration Logos */}
            {activeTab === "signin" && (
              <div style={{ marginTop: "auto", paddingTop: "2rem", textAlign: "center" }}>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Collaboration between
                </p>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem" }}>
                  <img
                    src="/images/auth/Airbus_logo_2017.png"
                    alt="Airbus"
                    style={{ height: "32px", objectFit: "contain" }}
                  />
                  <img
                    src="/images/auth/2020-AMIC-LOGO.png"
                    alt="AMIC"
                    style={{ height: "40px", objectFit: "contain" }}
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Panel - 60% */}
        <div
          style={{
            width: "60%",
            backgroundImage: "url('/images/auth/Airbus.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(6, 44, 51, 0.15)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;

Login.propTypes = {
  history: PropTypes.object.isRequired,
};