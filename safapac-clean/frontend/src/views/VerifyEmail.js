import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Button, Alert } from "shards-react";
import { verifyEmail, resendVerificationEmail } from "../api/projectApi";

const VerifyEmail = ({ history, location }) => {
  // Force light mode on verify email page
  useEffect(() => {
    const originalTheme = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');

    return () => {
      if (originalTheme) {
        document.documentElement.setAttribute('data-theme', originalTheme);
      }
    };
  }, []);

  const [status, setStatus] = useState("verifying"); // verifying, success, error, expired
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      // Get token from URL query params
      const params = new URLSearchParams(location.search);
      const token = params.get("token");

      if (!token) {
        setStatus("error");
        setMessage("No verification token provided.");
        return;
      }

      const result = await verifyEmail(token);

      if (result.success) {
        setStatus("success");
        setMessage(result.data.message || "Email verified successfully!");
      } else {
        if (result.error?.includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
        setMessage(result.error || "Verification failed. Please try again.");
      }
    };

    verifyToken();
  }, [location.search]);

  const handleResendVerification = async () => {
    if (!resendEmail) {
      setResendStatus("Please enter your email address.");
      return;
    }

    setIsResending(true);
    setResendStatus("");

    const result = await resendVerificationEmail(resendEmail);

    if (result.success) {
      setResendStatus(result.data.message || "Verification email sent!");
    } else {
      setResendStatus(result.error || "Failed to resend verification email.");
    }

    setIsResending(false);
  };

  const navigateToLogin = () => {
    history.push("/login");
  };

  const renderContent = () => {
    switch (status) {
      case "verifying":
        return (
          <>
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
              <div style={{
                width: "40px",
                height: "40px",
                border: "4px solid #006D7C",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ color: "#1a1a1a", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Verifying Your Email
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
              Please wait while we verify your email address...
            </p>
          </>
        );

      case "success":
        return (
          <>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ color: "#1a1a1a", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Email Verified!
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              {message}
            </p>
            <Button
              style={{
                backgroundColor: "#006D7C",
                border: "none",
                fontWeight: 600,
                padding: "0.75rem 2rem"
              }}
              onClick={navigateToLogin}
            >
              Sign In
            </Button>
          </>
        );

      case "expired":
        return (
          <>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#fef3c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h3 style={{ color: "#1a1a1a", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Link Expired
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              {message}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <input
                type="email"
                placeholder="Enter your email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.95rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.25rem",
                  marginBottom: "0.75rem"
                }}
              />
              <Button
                block
                disabled={isResending}
                style={{
                  backgroundColor: "#006D7C",
                  border: "none",
                  fontWeight: 600,
                  padding: "0.75rem"
                }}
                onClick={handleResendVerification}
              >
                {isResending ? "Sending..." : "Resend Verification Email"}
              </Button>
            </div>
            {resendStatus && (
              <Alert theme="info" style={{ fontSize: "0.875rem" }}>
                {resendStatus}
              </Alert>
            )}
            <div style={{ marginTop: "1rem" }}>
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
                  fontSize: "0.875rem"
                }}
              >
                Back to Sign In
              </a>
            </div>
          </>
        );

      case "error":
      default:
        return (
          <>
            <div style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              backgroundColor: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem"
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 style={{ color: "#1a1a1a", fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              Verification Failed
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              {message}
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
              Back to Sign In
            </Button>
          </>
        );
    }
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
          maxWidth: "500px",
          width: "95%",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          position: "relative",
          zIndex: 2,
          padding: "3rem 2.5rem",
          textAlign: "center"
        }}
      >
        {/* Logo/Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#006D7C",
            marginBottom: "0.25rem"
          }}>
            SAFAPAC
          </h1>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: 0 }}>
            Techno-Economic Analysis Platform
          </p>
        </div>

        {renderContent()}
      </div>
    </div>
  );
};

export default VerifyEmail;

VerifyEmail.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
};
