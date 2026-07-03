"use client";
import { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";

interface PortfolioItem {
  id: number | null;
  title: string;
  description: string;
  category: string;
  date_range?: string;
  image_url?: string;
  project_url?: string;
  video_url?: string;
}

export default function AdminPage() {
  // --- STATE AUTHENTICATION ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // --- STATE UTAMA ---
  const [selectedCategory, setSelectedCategory] = useState("works");
  const [dataList, setDataList] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<PortfolioItem>({
    id: null,
    title: "",
    description: "",
    category: "works",
    date_range: "",
    image_url: "",
    project_url: "",
    video_url: "",
  });

  // State loading khusus penerawang link
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  // Cek Status Login saat halaman pertama kali di-refresh
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    const expiry = localStorage.getItem("admin_token_expiry");

    if (token && expiry) {
      if (Date.now() < parseInt(expiry)) {
        setIsLoggedIn(true);
        const newExpiry = Date.now() + 5 * 60 * 1000;
        localStorage.setItem("admin_token_expiry", newExpiry.toString());
      } else {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_token_expiry");
      }
    }
    setAuthLoading(false);
  }, []);

  // VALIDASI SESSION 5 MENIT
  const checkSessionValidity = useCallback(() => {
    const token = localStorage.getItem("admin_token");
    const expiry = localStorage.getItem("admin_token_expiry");

    if (!token || !expiry) {
      handleLogout();
      return false;
    }

    if (Date.now() > parseInt(expiry)) {
      alert("Session habis! Silakan login kembali, Zi.");
      handleLogout();
      return false;
    }

    const newExpiry = Date.now() + 5 * 60 * 1000;
    localStorage.setItem("admin_token_expiry", newExpiry.toString());
    return true;
  }, []);

  // --- HANDLER LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await res.json();
      if (result.status === "success") {
        const expiryTime = Date.now() + 5 * 60 * 1000;
        localStorage.setItem("admin_token", result.token);
        localStorage.setItem("admin_token_expiry", expiryTime.toString());
        setIsLoggedIn(true);
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("Gagal koneksi ke server login, Zi!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_token_expiry");
    setIsLoggedIn(false);
  };

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;
    if (!checkSessionValidity()) return;

    setDataList([]);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=${selectedCategory}`);
      const responseText = await res.text();
      try {
        const data = JSON.parse(responseText);
        setDataList(Array.isArray(data) ? data : []);
      } catch {
        setDataList([]);
      }
    } catch (err) {
      console.error("Koneksi XAMPP mati:", err);
    }
  }, [selectedCategory, isLoggedIn, checkSessionValidity]);

  useEffect(() => {
    fetchData();
    setForm({ id: null, title: "", description: "", category: selectedCategory, date_range: "", image_url: "", project_url: "", video_url: "" });
  }, [selectedCategory, fetchData]);

  // --- FUNGSI DETEKTIF LINK OTOMATIS ---
  const handleProjectUrlChange = async (url: string) => {
    setForm((prev) => ({ ...prev, project_url: url }));

    if (!url) {
      setForm((prev) => ({ ...prev, image_url: "" }));
      return;
    }

    const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const ytMatch = url.match(ytRegExp);

    if (ytMatch && ytMatch[2].length === 11) {
      const videoId = ytMatch[2];
      setForm((prev) => ({
        ...prev,
        image_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      }));
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
      const json = await res.json();

      if (json.status === "success" && json.data.image?.url) {
        setForm((prev) => ({ ...prev, image_url: json.data.image.url }));
      } else {
        setForm((prev) => ({
          ...prev,
          image_url: `https://api.microlink.io?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`,
        }));
      }
    } catch (error) {
      console.error("Gagal memuat preview website:", error);
    } finally {
      setLoadingPreview(false);
    }
  };

  // --- SUBMIT LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkSessionValidity()) return;

    setLoading(true);
    const endpoint = form.id ? "edit_data.php" : "add_data.php";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": localStorage.getItem("admin_token") || "",
        },
        body: JSON.stringify({ ...form, category: selectedCategory }),
      });

      const result = await res.json();
      if (result.status === "success") {
        alert(result.message);
        setForm({ id: null, title: "", description: "", category: selectedCategory, date_range: "", image_url: "", project_url: "", video_url: "" });
        fetchData();
      } else {
        alert("Gagal: " + result.message);
      }
    } catch {
      alert("Koneksi ke PHP bermasalah, Zi!");
    } finally {
      setLoading(false);
    }
  };

  // --- DELETE LOGIC ---
  const deleteData = async (id: number) => {
    if (!checkSessionValidity()) return;

    if (confirm(`Yakin mau hapus data?`)) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete_data.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": localStorage.getItem("admin_token") || "",
          },
          body: JSON.stringify({ id, category: selectedCategory }),
        });
        const result = await res.json();
        if (result.status === "success") fetchData();
      } catch (error) {
        console.error("Hapus gagal:", error);
      }
    }
  };

  const handleEdit = (item: any) => {
    if (!checkSessionValidity()) return;
    setForm({
      id: item.id || null,
      title: item.title || "",
      description: item.description || item.content || "",
      category: selectedCategory,
      date_range: item.date_range || "",
      image_url: item.image_url || "",
      project_url: item.project_url || "",
      video_url: item.video_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (authLoading) {
    return (
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-main)" }}>
        <p style={{ opacity: 0.5, letterSpacing: "2px", fontSize: "0.9rem" }}>VERIFYING CREDENTIALS...</p>
      </main>
    );
  }

  // RENDER CONFIGURATION 1: LOGIN PAGE RESPONSIVE
  if (!isLoggedIn) {
    return (
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-main)", padding: "1.5rem", boxSizing: "border-box" }}>
        <div className="glass-card" style={{ padding: "clamp(1.5rem, 5vw, 3rem)", width: "100%", maxWidth: "400px", textAlign: "center", boxSizing: "border-box" }}>
          <h2 className="elegant-heading-small" style={{ marginBottom: "2rem" }}>
            Admin Panel
          </h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <input type="text" placeholder="Username" className="glass-card" style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }} value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input
              type="password"
              placeholder="Password"
              className="glass-card"
              style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary magnetic-target" style={{ marginTop: "1rem", width: "100%" }}>
              ENTER PANEL
            </button>
          </form>
        </div>
      </main>
    );
  }

  // RENDER CONFIGURATION 2: MAIN DASHBOARD RESPONSIVE 100%
  return (
    <main style={{ paddingTop: "8rem", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <Navbar />
      <div className="section-container" style={{ width: "100%", boxSizing: "border-box" }}>
        {/* --- HEADER PANEL --- */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <h1 className="section-title" style={{ margin: 0 }}>
            Admin Panel
          </h1>
          <button onClick={handleLogout} className="magnetic-target" style={{ color: "#ff4d4d", background: "none", border: "1px solid #ff4d4d", padding: "0.5rem 1.5rem", borderRadius: "4px", cursor: "hidden", fontWeight: "600" }}>
            LOGOUT
          </button>
        </div>

        {/* --- FILTER TAB --- */}
        <div style={{ display: "flex", gap: "0.75rem", rowGap: "0.75rem", justifyContent: "center", margin: "2rem 0", flexWrap: "wrap", width: "100%" }}>
          {["about", "about_images", "skills", "tech_icons", "experience", "education", "works"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`glass-card magnetic-target ${selectedCategory === cat ? "active" : ""}`}
              style={{
                padding: "0.6rem 1.2rem",
                fontSize: "0.8rem",
                cursor: "hidden",
                color: "inherit",
                opacity: selectedCategory === cat ? 1 : 0.4,
                border: selectedCategory === cat ? "1px solid currentColor" : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                background: selectedCategory === cat ? "rgba(150,150,150,0.1)" : "transparent",
                transition: "all 0.3s ease",
              }}
            >
              {cat === "experience" ? "CAREERS & VENTURES" : cat.toUpperCase().replace("_", " ")}
            </button>
          ))}
        </div>

        {/* --- GRID UTAMA AUTOFIT MOBILE-FRIENDLY --- */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))", gap: "2rem", width: "100%" }}>
          {/* --- LEFT: FORM ENTRY RESPONSIVE --- */}
          <div className="glass-card" style={{ padding: "clamp(1.2rem, 4vw, 2.5rem)", width: "100%", boxSizing: "border-box" }}>
            <h3 className="elegant-heading-small">{form.id ? "Edit Item" : "Add New Item"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginTop: "1.5rem" }}>
              {selectedCategory !== "about_images" && (
                <input
                  type="text"
                  placeholder={selectedCategory === "skills" ? "Nama Kategori Skill" : selectedCategory === "tech_icons" ? "Nama Tool/Tech" : selectedCategory === "education" ? "Nama Sekolah / Instansi" : "Title / Position"}
                  className="glass-card"
                  style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required={selectedCategory !== "about_images"}
                />
              )}
              {["experience", "education"].includes(selectedCategory) && (
                <input
                  type="text"
                  placeholder="Date Range"
                  className="glass-card"
                  style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }}
                  value={form.date_range || ""}
                  onChange={(e) => setForm({ ...form, date_range: e.target.value })}
                />
              )}
              {["about", "skills", "experience", "education"].includes(selectedCategory) && (
                <textarea
                  placeholder={selectedCategory === "education" ? "Isi Jurusan, IPK, Prestasi..." : "Isi konten teks di sini..."}
                  className="glass-card"
                  style={{ padding: "1rem", color: "inherit", minHeight: "150px", resize: "vertical", width: "100%", boxSizing: "border-box" }}
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              )}
              {["works", "skills", "about_images", "tech_icons"].includes(selectedCategory) && (
                <input
                  type="text"
                  placeholder={selectedCategory === "tech_icons" ? "Icon URL" : "Image URL (Auto-filled by Project Link)"}
                  className="glass-card"
                  style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }}
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  required={["about_images", "tech_icons"].includes(selectedCategory)}
                />
              )}
              {selectedCategory === "works" && (
                <>
                  <input
                    type="text"
                    placeholder="Project Link (e.g., GitHub, Website, Behance)"
                    className="glass-card"
                    style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }}
                    value={form.project_url || ""}
                    onChange={(e) => handleProjectUrlChange(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Video URL (.mp4)"
                    className="glass-card"
                    style={{ padding: "1rem", color: "inherit", width: "100%", boxSizing: "border-box" }}
                    value={form.video_url || ""}
                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  />

                  {/* KOTAK PREVIEW INTERAKTIF */}
                  <div
                    className="glass-card"
                    style={{
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "220px",
                      marginTop: "0.5rem",
                      width: "100%",
                      background: "#000",
                      overflow: "hidden",
                      borderRadius: "8px",
                      boxSizing: "border-box",
                    }}
                  >
                    {loadingPreview ? (
                      <p style={{ fontSize: "0.85rem", opacity: 0.7 }} className="animate-pulse">
                        🕵️‍♂️ Menerawang isi link...
                      </p>
                    ) : form.video_url || form.project_url || form.image_url ? (
                      <div style={{ width: "100%", textAlign: "center" }}>
                        <p style={{ fontSize: "0.75rem", color: "#4ade80", marginBottom: "0.5rem" }}>✓ Live Preview Konten ({form.id ? "Mode Edit" : "Mode Baru"})</p>

                        <div style={{ width: "100%", height: "160px", borderRadius: "6px", overflow: "hidden", background: "#111" }}>
                          {form.video_url ? (
                            form.video_url.includes("youtube.com") || form.video_url.includes("youtu.be") ? (
                              <iframe
                                src={`https://www.youtube.com/embed/${form.video_url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/)?.[2]}`}
                                style={{ width: "100%", height: "100%", border: "none" }}
                                allowFullScreen
                              />
                            ) : (
                              <video src={form.video_url} controls style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                            )
                          ) : form.project_url && !(form.project_url.includes("github.com") || form.project_url.includes("behance.net") || form.project_url.includes("google.com")) ? (
                            <iframe src={form.project_url} style={{ width: "100%", height: "100%", border: "none", background: "#fff" }} sandbox="allow-scripts allow-same-origin" />
                          ) : (
                            <img src={form.image_url || "/placeholder.jpg"} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          )}
                        </div>

                        {(form.project_url?.includes("github.com") || form.project_url?.includes("behance.net")) && (
                          <p style={{ fontSize: "0.7rem", color: "#ff9999", marginTop: "0.5rem", lineHeight: "1.3" }}>
                            ⚠️ Website ini (GitHub/Behance) memblokir fitur embed iframe luar. Preview otomatis dialihkan menggunakan Thumbnail Statis di atas.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: "0.75rem", opacity: 0.4 }}>Preview interaktif (Video/Iframe) akan muncul di sini</p>
                    )}
                  </div>
                </>
              )}

              <button type="submit" className="btn-primary magnetic-target" disabled={loading} style={{ width: "100%" }}>
                {loading ? "SAVING..." : form.id ? "UPDATE DATA" : "PUBLISH DATA"}
              </button>

              {form.id && (
                <button
                  type="button"
                  onClick={() => setForm({ id: null, title: "", description: "", category: selectedCategory, date_range: "", image_url: "", project_url: "", video_url: "" })}
                  style={{ background: "none", color: "#ff4d4d", border: "none", fontSize: "0.8rem", cursor: "hidden", width: "100%", textAlign: "center" }}
                >
                  CANCEL EDIT
                </button>
              )}
            </form>
          </div>

          {/* --- RIGHT: LIST RESPONSIVE --- */}
          <div className="glass-card" style={{ padding: "clamp(1.2rem, 4vw, 2.5rem)", width: "100%", boxSizing: "border-box" }}>
            <h3 className="elegant-heading-small">Manage {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace("_", " ")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem", maxHeight: "600px", overflowY: "auto", paddingRight: "0.5rem", width: "100%" }}>
              {dataList.length > 0 ? (
                dataList.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card"
                    style={{ padding: "1rem 1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--glass-border, rgba(255,255,255,0.05))", width: "100%", boxSizing: "border-box" }}
                  >
                    <div style={{ overflow: "hidden", marginRight: "0.75rem", flex: 1 }}>
                      <p style={{ fontSize: "0.85rem", fontWeight: "600", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{selectedCategory === "about_images" ? item.image_url : item.title}</p>
                      <p style={{ fontSize: "0.7rem", opacity: 0.4 }}>ID: {item.id}</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexShrink: 0 }}>
                      <button onClick={() => handleEdit(item)} className="magnetic-target" style={{ color: "#4da6ff", background: "none", border: "none", cursor: "hidden", fontSize: "0.8rem", fontWeight: "700" }}>
                        EDIT
                      </button>
                      <button onClick={() => item.id && deleteData(item.id)} className="magnetic-target" style={{ color: "#ff4d4d", background: "none", border: "none", cursor: "hidden", fontSize: "0.8rem", fontWeight: "700" }}>
                        DEL
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 0", opacity: 0.3, width: "100%" }}>
                  <p>Gak ada data di kategori ini.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
