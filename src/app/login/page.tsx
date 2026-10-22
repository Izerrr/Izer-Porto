"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  // Redirect to /admin if already logged in
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth_check.php`, { credentials: "include" })
      .then((res) => {
        if (res.ok) router.replace("/admin");
      })
      .catch(() => {});
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();

      if (res.ok && result.status === "success") {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_token_expiry");
        router.push("/admin");
      } else {
        setErrorMessage(result.message || "Invalid credentials! Please check your username and password.");
      }
    } catch {
      setErrorMessage("Failed to connect to backend server. Please verify network or API status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "var(--bg-midnight)",
        padding: "1.5rem",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Background Grid */}
      <div className="tech-grid" style={{ opacity: 0.6 }} />

      {/* Back to Portfolio Link */}
      <div style={{ position: "absolute", top: "2rem", left: "2rem", zIndex: 10 }}>
        <Link
          href="/"
          className="magnetic-target"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-dim)",
            textDecoration: "none",
            fontSize: "0.85rem",
            fontWeight: "500",
            padding: "0.5rem 1rem",
            borderRadius: "30px",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            backdropFilter: "blur(10px)",
            transition: "all 0.3s ease",
          }}
        >
          <span>←</span>
          <span>Back to Portfolio</span>
        </Link>
      </div>

      <div
        className="glass-card"
        style={{
          padding: "clamp(2rem, 5vw, 3.5rem)",
          width: "100%",
          maxWidth: "420px",
          textAlign: "center",
          boxSizing: "border-box",
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Logo / Header */}
        <div style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <img src="/Resources/Logo/logo-dark.svg" alt="IZR Logo" className="logo-dark" style={{ height: "36px", objectFit: "contain" }} />
          <img src="/Resources/Logo/logo-light.svg" alt="IZR Logo" className="logo-light" style={{ height: "36px", objectFit: "contain" }} />
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: "700", margin: 0, letterSpacing: "-0.03em" }}>Admin Portal</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>Manage portfolio content & inventory</p>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#f87171",
              fontSize: "0.82rem",
              textAlign: "left",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>⚠</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.2rem", textAlign: "left" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Username
            </label>
            <input
              type="text"
              placeholder="Enter username"
              className="glass-card"
              style={{
                padding: "0.9rem 1.1rem",
                color: "inherit",
                width: "100%",
                boxSizing: "border-box",
                borderRadius: "12px",
                border: "1px solid var(--glass-border)",
                background: "rgba(255, 255, 255, 0.03)",
                fontSize: "0.95rem",
                outline: "none",
              }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Password
            </label>
            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                className="glass-card"
                style={{
                  padding: "0.9rem 3rem 0.9rem 1.1rem",
                  color: "inherit",
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  border: "1px solid var(--glass-border)",
                  background: "rgba(255, 255, 255, 0.03)",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
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
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  padding: "0.3rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.8rem",
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary magnetic-target"
            disabled={loading}
            style={{
              marginTop: "0.8rem",
              width: "100%",
              padding: "0.95rem",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "0.5rem",
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid currentColor", borderRightColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span>VERIFYING...</span>
              </>
            ) : (
              <span>ENTER PANEL</span>
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
