"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PortfolioItem {
  id: number | null;
  title: string;
  description: string;
  category: string;
  project_category?: string;
  date_range?: string;
  image_url?: string;
  project_url?: string;
  video_url?: string;
}

const CATEGORIES = [
  { id: "works", label: "Selected Works", icon: "💼" },
  { id: "tech_icons", label: "Tech Icons", icon: "⚡" },
  { id: "skills", label: "Capabilities", icon: "🎯" },
  { id: "experience", label: "Careers & Ventures", icon: "🚀" },
  { id: "education", label: "Education", icon: "🎓" },
  { id: "about", label: "About Text", icon: "📝" },
  { id: "about_images", label: "About Photos", icon: "🖼" },
];

export default function AdminPage() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState("works");
  const [dataList, setDataList] = useState<PortfolioItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [reordering, setReordering] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Toast / Feedback state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form State
  const [form, setForm] = useState<PortfolioItem>({
    id: null,
    title: "",
    description: "",
    category: "works",
    project_category: "Web Development",
    date_range: "",
    image_url: "",
    project_url: "",
    video_url: "",
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

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

  // Verify Authentication on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth_check.php`, {
          credentials: "include",
        });
        if (res.status === 401 || res.status === 403) {
          router.replace("/login");
        }
      } catch {
        // Fallback or dev mode
      }
    };
    verifyAuth();
  }, [router]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_data.php?category=${selectedCategory}`, {
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        router.replace("/login");
        return;
      }
      const responseText = await res.text();
      try {
        const data = JSON.parse(responseText);
        setDataList(Array.isArray(data) ? data : []);
      } catch {
        setDataList([]);
      }
    } catch (err) {
      console.error("API error:", err);
      showToast("Failed to fetch database records.", "error");
    }
  }, [selectedCategory, router]);

  useEffect(() => {
    fetchData();
    resetForm();
    setSearchQuery("");
    setConfirmDeleteId(null);
  }, [selectedCategory, fetchData]);

  const resetForm = () => {
    setForm({
      id: null,
      title: "",
      description: "",
      category: selectedCategory,
      project_category: "Web Development",
      date_range: "",
      image_url: "",
      project_url: "",
      video_url: "",
    });
  };

  // Filtered list by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return dataList;
    const q = searchQuery.toLowerCase();
    return dataList.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.image_url?.toLowerCase().includes(q) ||
        item.project_url?.toLowerCase().includes(q),
    );
  }, [dataList, searchQuery]);

  // Generate Instant WebP Cover from Website URL without manual screenshot
  const handleGenerateInstantCover = async (targetUrl?: string, forceRefresh = false) => {
    const url = (targetUrl ?? form.project_url ?? "").trim();
    if (!url) {
      showToast("Masukkan Project Link (URL) terlebih dahulu!", "error");
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
      showToast("YouTube HD Cover applied! ✓");
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await fetch("/api/capture-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, forceRefresh }),
      });
      const json = await res.json();

      if (res.ok && json.status === "success" && json.image_url) {
        setForm((prev) => ({ ...prev, image_url: json.image_url }));
        showToast(json.message || "Instant WebP Cover generated! ✓");
      } else {
        // Fallback to local proxy URL
        setForm((prev) => ({
          ...prev,
          image_url: `/api/capture-cover?url=${encodeURIComponent(url)}`,
        }));
        showToast("Cover linked via instant proxy! ✓");
      }
    } catch {
      setForm((prev) => ({
        ...prev,
        image_url: `/api/capture-cover?url=${encodeURIComponent(url)}`,
      }));
    } finally {
      setLoadingPreview(false);
    }
  };

  // Submit data (Add or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const endpoint = form.id ? "edit_data.php" : "add_data.php";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          category: selectedCategory,
          project_category: form.project_category || "Web Development",
        }),
      });

      if (res.status === 401 || res.status === 403) {
        showToast("Session expired. Please log in again.", "error");
        setTimeout(() => router.replace("/login"), 1200);
        return;
      }

      const result = await res.json();
      if (result.status === "success") {
        showToast(form.id ? "Item updated successfully! ✓" : "New item created! ✓");
        resetForm();
        fetchData();
      } else {
        showToast("Operation failed: " + (result.message || "Unknown error"), "error");
      }
    } catch {
      showToast("Failed to connect to backend server!", "error");
    } finally {
      setLoading(false);
    }
  };

  // Delete data execution
  const executeDelete = async (id: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete_data.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, category: selectedCategory }),
      });
      if (res.status === 401 || res.status === 403) {
        showToast("Session expired. Please log in again.", "error");
        setTimeout(() => router.replace("/login"), 1200);
        return;
      }

      const result = await res.json();
      if (result.status === "success") {
        showToast("Item deleted successfully! ✓");
        if (form.id === id) resetForm();
        setConfirmDeleteId(null);
        fetchData();
      } else {
        showToast("Delete failed: " + (result.message || "Unknown error"), "error");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Error connecting to server for deletion", "error");
    }
  };

  // Populate form for editing
  const handleEdit = (item: any) => {
    setForm({
      id: item.id || null,
      title: item.title || "",
      description: item.description || item.content || "",
      category: selectedCategory,
      project_category: item.category && item.category !== "works" ? item.category : "Web Development",
      date_range: item.date_range || "",
      image_url: item.image_url || "",
      project_url: item.project_url || "",
      video_url: item.video_url || "",
    });

    const formEl = document.getElementById("admin-form-panel");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Clone / Duplicate item into form
  const handleDuplicate = (item: PortfolioItem) => {
    setForm({
      id: null,
      title: item.title ? `[Copy] ${item.title}` : "",
      description: item.description || "",
      category: selectedCategory,
      project_category: item.category && item.category !== "works" ? item.category : "Web Development",
      date_range: item.date_range || "",
      image_url: item.image_url || "",
      project_url: item.project_url || "",
      video_url: item.video_url || "",
    });

    showToast("Item cloned to form as new record! ✓");
    const formEl = document.getElementById("admin-form-panel");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Reorder items by splicing and moving fromId -> toId, then saving order_index sequence
  const applyReorderById = async (fromId: number, toId: number) => {
    if (fromId === toId || reordering) return;

    const fromIdx = dataList.findIndex((item) => Number(item.id) === Number(fromId));
    const toIdx = dataList.findIndex((item) => Number(item.id) === Number(toId));

    if (fromIdx < 0 || toIdx < 0 || fromIdx >= dataList.length || toIdx >= dataList.length) return;

    setReordering(true);

    // 1. Optimistic UI update: Splice & shift
    const updatedList = Array.from(dataList);
    const [moved] = updatedList.splice(fromIdx, 1);
    updatedList.splice(toIdx, 0, moved);
    setDataList(updatedList);

    // 2. Persist to backend with numeric IDs
    const idOrder = updatedList
      .map((item) => Number(item.id))
      .filter((id) => !isNaN(id) && id > 0);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/reorder_data.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          category: selectedCategory,
          order: idOrder,
        }),
      });

      const result = await res.json();
      if (result.status === "success") {
        showToast("Order updated successfully! ✓");
      } else {
        showToast("Reorder failed: " + (result.message || "Unknown error"), "error");
        fetchData();
      }
    } catch {
      showToast("Failed to save reorder changes to server", "error");
      fetchData();
    } finally {
      setReordering(false);
      setDraggedId(null);
      setDragOverId(null);
    }
  };

  // HTML5 Drag & Drop handlers using item ID
  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(id));
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    applyReorderById(draggedId, targetId);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <main
      style={{
        paddingTop: "6rem",
        minHeight: "100vh",
        width: "100%",
        background: "var(--bg-midnight)",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            zIndex: 99999,
            padding: "0.85rem 1.4rem",
            borderRadius: "12px",
            background: toast.type === "success" ? "rgba(34, 197, 94, 0.95)" : "rgba(239, 68, 68, 0.95)",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "0.85rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            animation: "slideInToast 0.3s ease-out",
          }}
        >
          <span>{toast.message}</span>
        </div>
      )}

      <div className="section-container" style={{ width: "100%", maxWidth: "1200px", margin: "0 auto", padding: "0 1.5rem 5rem 1.5rem", boxSizing: "border-box" }}>
        {/* Top Navigation Bar */}
        <div
          className="glass-card"
          style={{
            padding: "1rem 1.5rem",
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            borderRadius: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.2rem" }}>
            <Link
              href="/"
              className="magnetic-target"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-dim)",
                textDecoration: "none",
                padding: "0.4rem 0.8rem",
                borderRadius: "20px",
                border: "1px solid var(--glass-border)",
                background: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <span>←</span>
              <span>Live Site</span>
            </Link>

            <div>
              <h1 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0, letterSpacing: "-0.02em" }}>IZER Admin Panel</h1>
              <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>Content Management Engine</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              type="button"
              onClick={resetForm}
              className="magnetic-target"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "var(--text-main)",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid var(--glass-border)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              + New Item
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="magnetic-target"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#ff4d4d",
                background: "rgba(255, 77, 77, 0.08)",
                border: "1px solid rgba(255, 77, 77, 0.3)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0.6rem",
            overflowX: "auto",
            paddingBottom: "0.5rem",
            marginBottom: "2rem",
            scrollbarWidth: "none",
          }}
        >
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className="magnetic-target"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 1.1rem",
                  borderRadius: "14px",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  color: isActive ? "var(--text-main)" : "var(--text-dim)",
                  background: isActive ? "var(--glass-bg)" : "transparent",
                  border: isActive ? "1px solid var(--text-main)" : "1px solid var(--glass-border)",
                  transition: "all 0.25s ease",
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                {isActive && dataList.length > 0 && (
                  <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "10px", background: "rgba(255, 255, 255, 0.12)" }}>
                    {dataList.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Grid: Form Left, List Right */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            gap: "2rem",
            alignItems: "start",
          }}
        >
          {/* Form Panel */}
          <div id="admin-form-panel" className="glass-card" style={{ padding: "clamp(1.5rem, 4vw, 2.5rem)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: form.id ? "#38bdf8" : "var(--text-dim)", fontWeight: "600" }}>
                  {form.id ? `EDITING ITEM #${form.id}` : "NEW RECORD"}
                </span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "700", margin: "0.2rem 0 0 0" }}>
                  {form.id ? "Update Content" : `Add to ${CATEGORIES.find((c) => c.id === selectedCategory)?.label}`}
                </h2>
              </div>

              {form.id && (
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "6px",
                    color: "var(--text-dim)",
                    fontSize: "0.75rem",
                    padding: "0.4rem 0.75rem",
                    cursor: "pointer",
                  }}
                >
                  ✕ Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
              {selectedCategory !== "about_images" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                    {selectedCategory === "skills" ? "CAPABILITY TITLE" : selectedCategory === "tech_icons" ? "TOOL / TECH NAME" : selectedCategory === "education" ? "INSTITUTION NAME" : "ITEM TITLE / POSITION"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Modern Web Architecture"
                    className="glass-card"
                    style={{ padding: "0.9rem", color: "inherit", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem" }}
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required={selectedCategory !== "about_images"}
                  />
                </div>
              )}

              {selectedCategory === "works" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                    PROJECT CATEGORY / DOMAIN TAG
                  </label>
                  <input
                    type="text"
                    list="work-categories"
                    placeholder="e.g. Web Development, Video Production"
                    className="glass-card"
                    style={{ padding: "0.9rem", color: "inherit", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem" }}
                    value={form.project_category || ""}
                    onChange={(e) => setForm({ ...form, project_category: e.target.value })}
                    required
                  />
                  <datalist id="work-categories">
                    <option value="Web Development" />
                    <option value="Creative & Branding" />
                    <option value="Video Production" />
                    <option value="Graphic Design" />
                  </datalist>
                </div>
              )}

              {["experience", "education"].includes(selectedCategory) && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                    DATE RANGE / DURATION
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 — Present, or Aug 2023 - Dec 2024"
                    className="glass-card"
                    style={{ padding: "0.9rem", color: "inherit", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem" }}
                    value={form.date_range || ""}
                    onChange={(e) => setForm({ ...form, date_range: e.target.value })}
                  />
                </div>
              )}

              {["about", "skills", "experience", "education"].includes(selectedCategory) && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)" }}>DESCRIPTION / CONTENT</label>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{form.description?.length || 0} characters</span>
                  </div>
                  <textarea
                    placeholder={selectedCategory === "education" ? "Major, achievements, GPA, and highlights..." : "Detailed paragraph description..."}
                    className="glass-card"
                    style={{ padding: "0.9rem", color: "inherit", minHeight: "140px", resize: "vertical", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem", lineHeight: "1.6" }}
                    value={form.description || ""}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              )}

              {["works", "skills", "about_images", "tech_icons"].includes(selectedCategory) && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)" }}>
                      {selectedCategory === "tech_icons" ? "ICON URL (.svg / .png)" : "COVER IMAGE / THUMBNAIL URL"}
                    </label>
                    {selectedCategory === "works" && form.image_url?.startsWith("/Resources/works_covers/") && (
                      <span style={{ fontSize: "0.68rem", color: "#4ade80", fontWeight: "600" }}>
                        ✓ Local WebP Cached
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="https://... or /Resources/works_covers/..."
                    className="glass-card"
                    style={{ padding: "0.9rem", color: "inherit", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem" }}
                    value={form.image_url || ""}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    required={["about_images", "tech_icons"].includes(selectedCategory)}
                  />
                </div>
              )}

              {selectedCategory === "works" && (
                <>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", gap: "0.5rem", flexWrap: "wrap" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)" }}>
                        PROJECT LINK (URL)
                      </label>
                      <button
                        type="button"
                        disabled={loadingPreview || !form.project_url}
                        onClick={() => handleGenerateInstantCover(form.project_url, true)}
                        style={{
                          background: "rgba(56, 189, 248, 0.14)",
                          border: "1px solid rgba(56, 189, 248, 0.4)",
                          color: "#38bdf8",
                          borderRadius: "8px",
                          padding: "0.28rem 0.7rem",
                          fontSize: "0.72rem",
                          fontWeight: "600",
                          cursor: loadingPreview || !form.project_url ? "not-allowed" : "pointer",
                          opacity: loadingPreview || !form.project_url ? 0.5 : 1,
                          transition: "all 0.2s ease",
                        }}
                      >
                        {loadingPreview ? "⏳ Capturing WebP..." : "⚡ Generate Instant Cover"}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="https://..."
                      className="glass-card"
                      style={{ padding: "0.9rem", color: "inherit", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem" }}
                      value={form.project_url || ""}
                      onChange={(e) => setForm({ ...form, project_url: e.target.value })}
                      onBlur={(e) => {
                        if (e.target.value && !form.image_url) {
                          handleGenerateInstantCover(e.target.value, false);
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dim)", marginBottom: "0.35rem" }}>
                      VIDEO URL (.mp4 / Direct Stream)
                    </label>
                    <input
                      type="text"
                      placeholder="Optional video stream URL"
                      className="glass-card"
                      style={{ padding: "0.9rem", color: "inherit", width: "100%", boxSizing: "border-box", borderRadius: "10px", outline: "none", fontSize: "0.9rem" }}
                      value={form.video_url || ""}
                      onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                    />
                  </div>

                  {/* Media Live Preview Box */}
                  <div
                    style={{
                      marginTop: "0.5rem",
                      borderRadius: "12px",
                      background: "rgba(0, 0, 0, 0.4)",
                      border: "1px solid var(--glass-border)",
                      padding: "1rem",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Cover & Media Preview
                    </span>

                    {loadingPreview ? (
                      <p style={{ fontSize: "0.82rem", color: "#38bdf8", margin: "2rem 0" }}>⏳ Generating optimized WebP cover from website...</p>
                    ) : form.video_url || form.image_url || form.project_url ? (
                      <div style={{ width: "100%", height: "180px", borderRadius: "8px", overflow: "hidden", background: "#050811" }}>
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
                        ) : form.image_url ? (
                          <img src={form.image_url} alt="Generated Cover Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <img src={`/api/capture-cover?url=${encodeURIComponent(form.project_url || "")}`} alt="Instant Website Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: "0.78rem", opacity: 0.35, margin: "1rem 0" }}>Paste a Project URL and click "⚡ Generate Instant Cover"</p>
                    )}
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <button
                type="submit"
                className="btn-primary magnetic-target"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.95rem",
                  borderRadius: "12px",
                  fontWeight: "600",
                  cursor: loading ? "wait" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  marginTop: "0.5rem",
                }}
              >
                {loading ? "SAVING CHANGES..." : form.id ? "UPDATE RECORD" : "PUBLISH RECORD"}
              </button>
            </form>
          </div>

          {/* List Panel (with Reordering & Search) */}
          <div className="glass-card" style={{ padding: "clamp(1.5rem, 4vw, 2.5rem)", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", margin: 0 }}>
                  Manage {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  {filteredList.length} total entries • Drag handle (⋮⋮) or use arrows to reorder
                </span>
              </div>
            </div>

            {/* Search Filter Input */}
            <div style={{ marginBottom: "1.2rem" }}>
              <input
                type="text"
                placeholder="🔍 Search items by title, category, or URL..."
                className="glass-card"
                style={{
                  padding: "0.75rem 1rem",
                  color: "inherit",
                  width: "100%",
                  boxSizing: "border-box",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Reorderable Items Container */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                maxHeight: "680px",
                overflowY: "auto",
                paddingRight: "0.4rem",
              }}
            >
              {filteredList.length > 0 ? (
                filteredList.map((item, idx) => {
                  const itemId = Number(item.id);
                  const masterIdx = dataList.findIndex((d) => Number(d.id) === itemId);
                  const prevItem = masterIdx > 0 ? dataList[masterIdx - 1] : null;
                  const nextItem = masterIdx >= 0 && masterIdx < dataList.length - 1 ? dataList[masterIdx + 1] : null;
                  const isCurrentEditing = Number(form.id) === itemId;
                  const isConfirmingDelete = Number(confirmDeleteId) === itemId;

                  return (
                    <div
                      key={item.id}
                      className="glass-card"
                      onDragOver={(e) => handleDragOver(e, itemId)}
                      onDrop={(e) => handleDrop(e, itemId)}
                      style={{
                        padding: "0.85rem 1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        borderRadius: "14px",
                        border: isCurrentEditing
                          ? "1px solid #38bdf8"
                          : dragOverId === itemId
                          ? "1px solid #a855f7"
                          : "1px solid var(--glass-border)",
                        background: isCurrentEditing
                          ? "rgba(56, 189, 248, 0.05)"
                          : dragOverId === itemId
                          ? "rgba(168, 85, 247, 0.08)"
                          : "var(--glass-bg)",
                        opacity: draggedId === itemId ? 0.35 : 1,
                        transition: "all 0.15s ease",
                        boxShadow: dragOverId === itemId ? "0 0 16px rgba(168, 85, 247, 0.25)" : "none",
                      }}
                    >
                      {/* Drag Handle & Reorder Up/Down Controls */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                        <div
                          draggable={!reordering && !searchQuery}
                          onDragStart={(e) => handleDragStart(e, itemId)}
                          onDragEnd={handleDragEnd}
                          title={searchQuery ? "Clear search to reorder" : "Drag handle to reorder"}
                          style={{
                            fontSize: "1.1rem",
                            lineHeight: 1,
                            color: draggedId === itemId ? "#38bdf8" : "var(--text-dim)",
                            cursor: searchQuery || reordering ? "not-allowed" : "grab",
                            padding: "4px 3px",
                            userSelect: "none",
                            borderRadius: "4px",
                          }}
                        >
                          ⋮⋮
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                          <button
                            type="button"
                            onClick={() => prevItem && prevItem.id && applyReorderById(itemId, Number(prevItem.id))}
                            disabled={!prevItem || reordering}
                            title="Move Up"
                            style={{
                              background: "none",
                              border: "none",
                              color: !prevItem ? "rgba(255, 255, 255, 0.15)" : "var(--text-main)",
                              cursor: !prevItem ? "default" : "pointer",
                              fontSize: "0.7rem",
                              lineHeight: 1,
                              padding: "2px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            ▲
                          </button>
                          <span style={{ fontSize: "0.62rem", color: "var(--text-dim)", textAlign: "center", fontWeight: "700" }}>
                            #{masterIdx >= 0 ? masterIdx + 1 : idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => nextItem && nextItem.id && applyReorderById(itemId, Number(nextItem.id))}
                            disabled={!nextItem || reordering}
                            title="Move Down"
                            style={{
                              background: "none",
                              border: "none",
                              color: !nextItem ? "rgba(255, 255, 255, 0.15)" : "var(--text-main)",
                              cursor: !nextItem ? "default" : "pointer",
                              fontSize: "0.7rem",
                              lineHeight: 1,
                              padding: "2px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Visual Thumbnail for media / tech icons */}
                      {(item.image_url || selectedCategory === "tech_icons") && (
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "8px",
                            background: "rgba(0, 0, 0, 0.3)",
                            flexShrink: 0,
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <img
                            src={item.image_url || "/placeholder.jpg"}
                            alt={item.title || "Icon"}
                            style={{ width: "100%", height: "100%", objectFit: "contain", padding: "2px" }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      {/* Item Details */}
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <p style={{ fontSize: "0.85rem", fontWeight: "600", margin: 0, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {selectedCategory === "about_images" ? item.image_url : item.title}
                          </p>

                          {item.category && item.category !== "works" && (
                            <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", borderRadius: "8px", background: "rgba(255, 255, 255, 0.08)", color: "var(--text-dim)" }}>
                              {item.category}
                            </span>
                          )}
                        </div>

                        {item.date_range && (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-dim)", display: "block", marginTop: "2px" }}>
                            {item.date_range}
                          </span>
                        )}

                        {item.project_url && (
                          <a
                            href={item.project_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.7rem", color: "#38bdf8", textDecoration: "none", display: "inline-block", marginTop: "2px" }}
                          >
                            Open Link ↗
                          </a>
                        )}
                      </div>

                      {/* Action Buttons: Edit, Duplicate, Delete */}
                      <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="magnetic-target"
                          title="Edit this item"
                          style={{
                            color: "#38bdf8",
                            background: "rgba(56, 189, 248, 0.08)",
                            border: "1px solid rgba(56, 189, 248, 0.2)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            padding: "0.32rem 0.6rem",
                          }}
                        >
                          EDIT
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(item)}
                          className="magnetic-target"
                          title="Clone as new record"
                          style={{
                            color: "#a855f7",
                            background: "rgba(168, 85, 247, 0.08)",
                            border: "1px solid rgba(168, 85, 247, 0.2)",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            padding: "0.32rem 0.55rem",
                          }}
                        >
                          CLONE
                        </button>

                        {isConfirmingDelete ? (
                          <div style={{ display: "flex", gap: "3px" }}>
                            <button
                              type="button"
                              onClick={() => item.id && executeDelete(item.id)}
                              style={{
                                color: "#ffffff",
                                background: "#ef4444",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.7rem",
                                fontWeight: "700",
                                padding: "0.32rem 0.6rem",
                              }}
                            >
                              YES
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                color: "var(--text-dim)",
                                background: "rgba(255, 255, 255, 0.08)",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "0.7rem",
                                padding: "0.32rem 0.5rem",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => item.id && setConfirmDeleteId(item.id)}
                            className="magnetic-target"
                            title="Delete this item"
                            style={{
                              color: "#ff4d4d",
                              background: "rgba(255, 77, 77, 0.08)",
                              border: "1px solid rgba(255, 77, 77, 0.2)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.72rem",
                              fontWeight: "700",
                              padding: "0.32rem 0.6rem",
                            }}
                          >
                            DEL
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "3.5rem 0", opacity: 0.35 }}>
                  <p style={{ margin: 0 }}>No records found in this category.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInToast {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
