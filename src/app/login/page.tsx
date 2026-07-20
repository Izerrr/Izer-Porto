"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Allow HttpOnly cookie
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();

      if (res.ok && result.status === "success") {
        // Clear old local storage
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_token_expiry");

        // Redirect to admin
        router.push("/admin");
      } else {
        alert(result.message || "Invalid credentials!");
      }
    } catch (err) {
      alert("Failed to connect to server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-main)", padding: "1.5rem", boxSizing: "border-box" }}>
      <div className="glass-card" style={{ padding: "clamp(1.5rem, 5vw, 3rem)", width: "100%", maxWidth: "400px", textAlign: "center", boxSizing: "border-box" }}>
        <h2 className="elegant-heading-small" style={{ marginBottom: "2rem" }}>
          Admin Panel
        </h2>
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <input type="text" placeholder="Username" className="glass-card" style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }} value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input type="password" placeholder="Password" className="glass-card" style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" className="btn-primary magnetic-target" disabled={loading} style={{ marginTop: "1rem", width: "100%" }}>
            {loading ? "VERIFYING..." : "ENTER PANEL"}
          </button>
        </form>
      </div>
    </main>
  );
}
