import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Form,
  FormGroup,
  FormInput,
  Nav,
  NavItem,
  NavLink,
  Alert
} from "shards-react";
import { useAuth } from "../contexts/AuthContext";

const Login = ({ history }) => {
  const { login } = useAuth();

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

  const [activeTab, setActiveTab] = useState("signin"); // signin, signup, forgot
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [forgotEmail, setForgotEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // new
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (field) => ({ target }) => {
    const { value = "" } = target || {};
    setCredentials((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignupChange = (field) => ({ target }) => {
    const { value = "" } = target || {};
    setSignupData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    console.log("🔐 Login attempt with:", credentials.username);
    const result = await login(credentials.username, credentials.password);
    console.log("🔐 Login result:", result);

    if (result.success) {
      console.log("✅ Login SUCCESS - Showing loading transition");
      console.log("👤 User data:", result.user);

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

  const handleSignUp = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    // Validation
    if (!signupData.username || !signupData.email || !signupData.password) {
      setError("Please fill in all fields.");
      setIsSubmitting(false);
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }

    if (signupData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsSubmitting(false);
      return;
    }

    // TODO: Replace with actual API call
    // For now, simulate success
    setTimeout(() => {
      setSuccess("Account created successfully! Please sign in.");
      setActiveTab("signin");
      setSignupData({ username: "", email: "", password: "", confirmPassword: "" });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleForgotPassword = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    if (!forgotEmail) {
      setError("Please enter your email address.");
      setIsSubmitting(false);
      return;
    }

    // TODO: Replace with actual API call
    // For now, simulate success
    setTimeout(() => {
      setSuccess("If an account exists with this email, a password reset link has been sent.");
      setForgotEmail("");
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
      {/* Blurred Background Image */}
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
      {/* Gradient Overlay */}
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
                </>
              )}
              {activeTab === "signup" && (
                <>
                  <h2
                    style={{
                      fontSize: "1.875rem",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      marginBottom: "0.5rem"
                    }}
                  >
                    Create Account
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0, lineHeight: "1.4" }}>
                    <strong>Sign up to get started with the platform</strong>
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

            {/* Tabs - Sign Up removed as per requirements */}

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

            {/* hydar's change */}
            {/* Sign In Form */}
            {activeTab === "signin" && (
              <Form onSubmit={handleSignIn}>
                <FormGroup>
                  {/* CHANGED: Label from Username to Email */}
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                    Email Address
                  </label>
                  <FormInput
                    size="lg"
                    type="email"  // CHANGED: Force email keyboard/validation
                    placeholder="name@example.com" // CHANGED: Email placeholder
                    value={credentials.username} // We keep variable name 'username' to avoid breaking logic, but it holds email
                    onChange={handleChange("username")}
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
                  <div style={{ position: "relative" }}>
                    <FormInput
                      size="lg"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={credentials.password}
                      onChange={handleChange("password")}
                      style={{
                        fontSize: "0.95rem",
                        backgroundColor: "#ffffff",
                        color: "#212529",
                        border: "1px solid #d1d5db",
                        paddingRight: "2.5rem"
                      }}
                      required
                    />
                    {/* newly added show/hide password button */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        color: "#6b7280"
                      }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
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

                {/* newly added */}
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                    Don't have an account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("signup");
                        setError("");
                        setSuccess("");
                      }}
                      style={{
                        color: "#006D7C",
                        textDecoration: "none",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Sign Up
                    </a>
                  </p>
                </div>
              </Form>
            )}

            {/* Sign Up Form */}
            {activeTab === "signup" && (
              <Form onSubmit={handleSignUp}>
                <FormGroup>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                    Username
                  </label>
                  <FormInput
                    size="lg"
                    placeholder="Choose a username"
                    value={signupData.username}
                    onChange={handleSignupChange("username")}
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
                    Email
                  </label>
                  <FormInput
                    size="lg"
                    type="email"
                    placeholder="Enter your email"
                    value={signupData.email}
                    onChange={handleSignupChange("email")}
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
                  <div style={{ position: "relative" }}>
                    <FormInput
                      size="lg"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a password (min 8 characters)"
                      value={signupData.password}
                      onChange={handleSignupChange("password")}
                      style={{
                        fontSize: "0.95rem",
                        backgroundColor: "#ffffff",
                        color: "#212529",
                        border: "1px solid #d1d5db",
                        paddingRight: "2.5rem"
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        color: "#6b7280"
                      }}
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </FormGroup>

                <FormGroup>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                    Confirm Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <FormInput
                      size="lg"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange("confirmPassword")}
                      style={{
                        fontSize: "0.95rem",
                        backgroundColor: "#ffffff",
                        color: "#212529",
                        border: "1px solid #d1d5db",
                        paddingRight: "2.5rem"
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0.25rem",
                        display: "flex",
                        alignItems: "center",
                        color: "#6b7280"
                      }}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
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
                  {isSubmitting ? "Creating account..." : "Sign Up"}
                </Button>

                {/* newly added */}
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                    Already have an account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab("signin");
                        setError("");
                        setSuccess("");
                      }}
                      style={{
                        color: "#006D7C",
                        textDecoration: "none",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Sign In
                    </a>
                  </p>
                </div>
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
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
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

            {/* Collaboration Logos - Only for Sign In */}
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
          {/* Optional overlay for better contrast */}
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
