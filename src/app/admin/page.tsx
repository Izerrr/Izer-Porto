"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  // State
  const [selectedCategory, setSelectedCategory] = useState("works");
  const [dataList, setDataList] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

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

  // Logout
  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout.php`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      router.push("/login");
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setDataList([]);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=${selectedCategory}`, {
        credentials: "include",
      });
      const responseText = await res.text();
      try {
        const data = JSON.parse(responseText);
        setDataList(Array.isArray(data) ? data : []);
      } catch {
        setDataList([]);
      }
    } catch (err) {
      console.error("API error:", err);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchData();
    setForm({ id: null, title: "", description: "", category: selectedCategory, date_range: "", image_url: "", project_url: "", video_url: "" });
  }, [selectedCategory, fetchData]);

  // Auto detect image/preview from URL
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
        const cleanUrl = url.trim().replace(/^https?:\/\//i, "");
        setForm((prev) => ({
          ...prev,
          image_url: `https://image.thum.io/get/width/1024/crop/800/https://${cleanUrl}`,
        }));
      }
    } catch {
      const cleanUrl = url.trim().replace(/^https?:\/\//i, "");
      setForm((prev) => ({
        ...prev,
        image_url: `https://image.thum.io/get/width/1024/crop/800/https://${cleanUrl}`,
      }));
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = form.id ? "edit_data.php" : "add_data.php";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, category: selectedCategory }),
      });

      const result = await res.json();
      if (result.status === "success") {
        alert(result.message);
        setForm({ id: null, title: "", description: "", category: selectedCategory, date_range: "", image_url: "", project_url: "", video_url: "" });
        fetchData();
      } else {
        alert("Failed: " + result.message);
      }
    } catch {
      alert("Failed to connect to backend!");
    } finally {
      setLoading(false);
    }
  };

  // Delete data
  const deleteData = async (id: number) => {
    if (confirm(`Delete this item?`)) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete_data.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id, category: selectedCategory }),
        });
        const result = await res.json();
        if (result.status === "success") fetchData();
      } catch (error) {
        console.error("Delete failed:", error);
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

  return (
    <main style={{ paddingTop: "8rem", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <Navbar />
      <div className="section-container" style={{ width: "100%", boxSizing: "border-box" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          <h1 className="section-title" style={{ margin: 0 }}>
            Admin Panel
          </h1>
          <button onClick={handleLogout} className="magnetic-target" style={{ color: "#ff4d4d", background: "none", border: "1px solid #ff4d4d", padding: "0.5rem 1.5rem", borderRadius: "4px", cursor: "pointer", fontWeight: "600" }}>
            LOGOUT
          </button>
        </div>

        {/* Category tabs */}
        <div style={{ display: "flex", gap: "0.75rem", rowGap: "0.75rem", justifyContent: "center", margin: "2rem 0", flexWrap: "wrap", width: "100%" }}>
          {["about", "about_images", "skills", "tech_icons", "experience", "education", "works"].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`glass-card magnetic-target ${selectedCategory === cat ? "active" : ""}`}
              style={{
                padding: "0.6rem 1.2rem",
                fontSize: "0.8rem",
                cursor: "pointer",
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

        {/* Main layout */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 290px), 1fr))", gap: "2rem", width: "100%" }}>
          {/* Form section */}
          <div className="glass-card" style={{ padding: "clamp(1.2rem, 4vw, 2.5rem)", width: "100%", boxSizing: "border-box" }}>
            <h3 className="elegant-heading-small">{form.id ? "Edit Item" : "Add New Item"}</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginTop: "1.5rem" }}>
              {selectedCategory !== "about_images" && (
                <input
                  type="text"
                  placeholder={selectedCategory === "skills" ? "Skill Category" : selectedCategory === "tech_icons" ? "Tool/Tech Name" : selectedCategory === "education" ? "School / Institution" : "Title / Position"}
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
                  placeholder={selectedCategory === "education" ? "Major, GPA, Achievements..." : "Content description..."}
                  className="glass-card"
                  style={{ padding: "1rem", color: "inherit", minHeight: "150px", resize: "vertical", width: "100%", boxSizing: "border-box" }}
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              )}
              {["works", "skills", "about_images", "tech_icons"].includes(selectedCategory) && (
                <input
                  type="text"
                  placeholder={selectedCategory === "tech_icons" ? "Icon URL" : "Image URL"}
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
                    placeholder="Project Link (e.g., GitHub, Website)"
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

                  {/* Preview box */}
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
                      <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>Loading preview...</p>
                    ) : form.video_url || form.project_url || form.image_url ? (
                      <div style={{ width: "100%", textAlign: "center" }}>
                        <p style={{ fontSize: "0.75rem", color: "#4ade80", marginBottom: "0.5rem" }}>✓ Live Content Preview</p>

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
                      </div>
                    ) : (
                      <p style={{ fontSize: "0.75rem", opacity: 0.4 }}>Content preview will appear here</p>
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
                  style={{ background: "none", color: "#ff4d4d", border: "none", fontSize: "0.8rem", cursor: "pointer", width: "100%", textAlign: "center" }}
                >
                  CANCEL EDIT
                </button>
              )}
            </form>
          </div>

          {/* Data list section */}
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
                <div style={{ textAlign: "center", padding: "3rem 0", opacity: 0.3, width: "100%" }}>
                  <p>No data found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
