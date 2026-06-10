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

  // Cek Status Login saat halaman pertama kali dibuka
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // --- HANDLER LOGIN ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost/izer-api/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await res.json();
      if (result.status === "success") {
        localStorage.setItem("admin_token", result.token); // Simpan token sakti
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
    setIsLoggedIn(false);
  };

  // --- FETCH DATA (Disertai Pengiriman Token di Header) ---
  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;
    setDataList([]);
    try {
      const res = await fetch(`http://localhost/izer-api/get_data.php?category=${selectedCategory}`);
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
  }, [selectedCategory, isLoggedIn]);

  useEffect(() => {
    fetchData();
    setForm({ id: null, title: "", description: "", category: selectedCategory, date_range: "", image_url: "", project_url: "", video_url: "" });
  }, [selectedCategory, fetchData]);

  // --- SUBMIT LOGIC (Ditambahkan X-Admin-Token) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = form.id ? "edit_data.php" : "add_data.php";

    try {
      const res = await fetch(`http://localhost/izer-api/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": localStorage.getItem("admin_token") || "", // 💡 KIRIM TOKEN KE SATPAM PHP
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

  // --- DELETE LOGIC (Ditambahkan X-Admin-Token) ---
  const deleteData = async (id: number) => {
    if (confirm(`Yakin mau hapus data?`)) {
      try {
        const res = await fetch("http://localhost/izer-api/delete_data.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": localStorage.getItem("admin_token") || "", // 💡 KIRIM TOKEN KE SATPAM PHP
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

  // ==========================================================================
  // RENDER CONDITION 1: FORM LOGIN GLASSMORPHISM (Jika Belum Login)
  // ==========================================================================
  if (!isLoggedIn) {
    return (
      <main style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "var(--bg-main)" }}>
        <div className="glass-card" style={{ padding: "3rem", width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <h2 className="elegant-heading-small" style={{ marginBottom: "2rem" }}>
            Gudang Access.
          </h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <input type="text" placeholder="Username" className="glass-card" style={{ padding: "1rem", color: "white" }} value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="Password" className="glass-card" style={{ padding: "1rem", color: "white" }} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit" className="btn-primary magnetic-target" style={{ marginTop: "1rem" }}>
              ENTER GUDANG
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ==========================================================================
  // RENDER CONDITION 2: DASHBOARD UTAMA (Jika Sudah Login Sempurna)
  // ==========================================================================
  return (
    <main style={{ paddingTop: "8rem", minHeight: "100vh" }}>
      <Navbar />
      <div className="section-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="section-title">Admin Gudang.</h1>
          <button onClick={handleLogout} className="magnetic-target" style={{ color: "#ff4d4d", background: "none", border: "1px solid #ff4d4d", padding: "0.5rem 1.5rem", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>
            LOGOUT
          </button>
        </div>

        {/* --- FILTER TAB --- */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", margin: "2rem 0", flexWrap: "wrap" }}>
          {["about", "about_images", "skills", "tech_icons", "experience", "education", "works"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`glass-card magnetic-target ${selectedCategory === cat ? "active" : ""}`}
              style={{ padding: "0.8rem 2rem", color: "white", border: selectedCategory === cat ? "1px solid #fff" : "1px solid var(--glass-border)", background: selectedCategory === cat ? "rgba(255,255,255,0.1)" : "transparent" }}
            >
              {cat === "experience" ? "CAREERS & VENTURES" : cat.toUpperCase().replace("_", " ")}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem" }}>
          {/* --- LEFT: FORM ENTRY --- */}
          <div className="glass-card" style={{ padding: "2.5rem" }}>
            <h3 className="elegant-heading-small">{form.id ? "Edit Item" : "Add New Item"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginTop: "1.5rem" }}>
              {selectedCategory !== "about_images" && (
                <input
                  type="text"
                  placeholder={selectedCategory === "skills" ? "Nama Kategori Skill" : selectedCategory === "tech_icons" ? "Nama Tool/Tech" : selectedCategory === "education" ? "Nama Sekolah / Instansi" : "Title / Position"}
                  className="glass-card"
                  style={{ padding: "1rem", color: "white" }}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required={selectedCategory !== "about_images"}
                />
              )}
              {["experience", "education"].includes(selectedCategory) && (
                <input type="text" placeholder="Date Range" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.date_range || ""} onChange={(e) => setForm({ ...form, date_range: e.target.value })} />
              )}
              {["about", "skills", "experience", "education"].includes(selectedCategory) && (
                <textarea
                  placeholder={selectedCategory === "education" ? "Isi Jurusan, IPK, Prestasi..." : "Isi konten teks di sini..."}
                  className="glass-card"
                  style={{ padding: "1rem", color: "white", minHeight: "150px", resize: "vertical" }}
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              )}
              {["works", "skills", "about_images", "tech_icons"].includes(selectedCategory) && (
                <input
                  type="text"
                  placeholder={selectedCategory === "tech_icons" ? "Icon URL" : "Image URL"}
                  className="glass-card"
                  style={{ padding: "1rem", color: "white" }}
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  required={["about_images", "tech_icons"].includes(selectedCategory)}
                />
              )}
              {selectedCategory === "works" && (
                <>
                  <input type="text" placeholder="Project Link" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.project_url || ""} onChange={(e) => setForm({ ...form, project_url: e.target.value })} />
                  <input type="text" placeholder="Video URL (.mp4)" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
                </>
              )}
              <button type="submit" className="btn-primary magnetic-target" disabled={loading}>
                {loading ? "SAVING..." : form.id ? "UPDATE DATA" : "PUBLISH DATA"}
              </button>
              {form.id && (
                <button type="button" onClick={() => setForm({ ...form, id: null })} style={{ background: "none", color: "#ff4d4d", border: "none", fontSize: "0.8rem", cursor: "pointer" }}>
                  CANCEL EDIT
                </button>
              )}
            </form>
          </div>

          {/* --- RIGHT: LIST --- */}
          <div className="glass-card" style={{ padding: "2.5rem" }}>
            <h3 className="elegant-heading-small">Manage {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace("_", " ")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem", maxHeight: "600px", overflowY: "auto", paddingRight: "0.5rem" }}>
              {dataList.length > 0 ? (
                dataList.map((item) => (
                  <div key={item.id} className="glass-card" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ overflow: "hidden", marginRight: "1rem", flex: 1 }}>
                      <p style={{ fontSize: "0.9rem", fontWeight: "600", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{selectedCategory === "about_images" ? item.image_url : item.title}</p>
                      <p style={{ fontSize: "0.7rem", opacity: 0.4 }}>ID: {item.id}</p>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", flexShrink: 0 }}>
                      <button onClick={() => handleEdit(item)} className="magnetic-target" style={{ color: "#4da6ff", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700" }}>
                        EDIT
                      </button>
                      <button onClick={() => item.id && deleteData(item.id)} className="magnetic-target" style={{ color: "#ff4d4d", background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: "700" }}>
                        DEL
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: "3rem 0", opacity: 0.3 }}>
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
