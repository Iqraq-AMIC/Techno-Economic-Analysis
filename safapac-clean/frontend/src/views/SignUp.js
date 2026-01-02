import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Form,
  FormGroup,
  FormInput,
  Alert
} from "shards-react";
import { signUp } from "../api/projectApi";

const SignUp = ({ history }) => {
  // Force light mode on signup page
  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');

    // Restore original theme when leaving signup page
    return () => {
      if (originalTheme) {
        document.documentElement.setAttribute('data-theme', originalTheme);
      }
    };
  }, []);

  const [signupData, setSignupData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: ""
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSignupChange = (field) => ({ target }) => {
    const { value = "" } = target || {};
    setSignupData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSignUp = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    // Validation
    if (!signupData.username || !signupData.email || !signupData.role || !signupData.password) {
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

    // Call signup API
    const result = await signUp(
      signupData.username,
      signupData.email,
      signupData.password,
      signupData.role
    );

    if (result.success) {
      setRegisteredEmail(signupData.email);
      setShowVerificationMessage(true);
      setSuccess("Account created successfully! Please check your email to verify your account.");
      setSignupData({ username: "", email: "", role: "", password: "", confirmPassword: "" });
      setIsSubmitting(false);
    } else {
      setError(result.error || "Failed to create account. Please try again.");
      setIsSubmitting(false);
    }
  };

  const navigateToLogin = () => {
    history.push("/login");
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
              {/* <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0, lineHeight: "1.4" }}>
                <strong>Sign up to get started with the platform</strong>
              </p> */}
            </div>

            {/* Success/Error Messages */}
            {error && (
              <Alert theme="danger" style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
                {error}
              </Alert>
            )}

            {/* Email Verification Message */}
            {showVerificationMessage ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <div style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "#e6f7f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.5rem"
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#006D7C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 style={{ color: "#1a1a1a", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                  Check Your Email
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1rem", lineHeight: "1.5" }}>
                  We've sent a verification link to<br />
                  <strong style={{ color: "#006D7C" }}>{registeredEmail}</strong>
                </p>
                <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
                  Click the link in the email to verify your account.
                  <br />The link will expire in 24 hours.
                </p>
                <Button
                  outline
                  style={{
                    color: "#006D7C",
                    borderColor: "#006D7C",
                    fontWeight: 600,
                    padding: "0.5rem 1.5rem"
                  }}
                  onClick={navigateToLogin}
                >
                  Go to Sign In
                </Button>
              </div>
            ) : (
              <>
                {success && (
                  <Alert theme="success" style={{ marginBottom: "1rem", fontSize: "0.875rem" }}>
                    {success}
                  </Alert>
                )}

                {/* Sign Up Form */}
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

              <FormGroup>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem", display: "block" }}>
                  Role
                </label>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => handleSignupChange("role")({ target: { value: "student" } })}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      border: signupData.role === "student" ? "2px solid #006D7C" : "1px solid #d1d5db",
                      backgroundColor: signupData.role === "student" ? "#e6f7f9" : "#ffffff",
                      color: signupData.role === "student" ? "#006D7C" : "#374151",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSignupChange("role")({ target: { value: "researcher" } })}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      border: signupData.role === "researcher" ? "2px solid #006D7C" : "1px solid #d1d5db",
                      backgroundColor: signupData.role === "researcher" ? "#e6f7f9" : "#ffffff",
                      color: signupData.role === "researcher" ? "#006D7C" : "#374151",
                      borderRadius: "0.25rem",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Researcher
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

              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
                  Already have an account?{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToLogin();
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
              </>
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

export default SignUp;

SignUp.propTypes = {
  history: PropTypes.object.isRequired,
};