"use client";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";

export default function AdminPage() {
  const [form, setForm] = useState({ title: "", category: "", image_url: "", project_url: "", video_url: "" });
  const [works, setWorks] = useState([]);

  const fetchWorks = () => {
    fetch("http://localhost/izer-api/works.php")
      .then((res) => res.json())
      .then(setWorks);
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("http://localhost/izer-api/add_project.php", {
      method: "POST",
      body: JSON.stringify(form),
      headers: { "Content-Type": "application/json" },
    });
    alert("Proyek Berhasil Masuk Gudang!");
    setForm({ title: "", category: "", image_url: "", project_url: "", video_url: "" });
    fetchWorks();
  };

  const deleteProject = async (id: number) => {
    if (confirm("Hapus project ini, Zi?")) {
      await fetch("http://localhost/izer-api/delete_project.php", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      fetchWorks();
    }
  };

  return (
    <main style={{ paddingTop: "8rem", position: "relative", zIndex: 10 }}>
      <Navbar />
      <div className="section-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3rem" }}>
        <h1 className="section-title">Admin Center.</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem", width: "100%" }}>
          <div className="glass-card" style={{ padding: "2.5rem" }}>
            <h3 className="elegant-heading-small">Tambah Proyek</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="text" placeholder="Title" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input type="text" placeholder="Category" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input type="text" placeholder="Image URL" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <input type="text" placeholder="Project Link" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} />
              <input type="text" placeholder="Video URL (.mp4)" className="glass-card" style={{ padding: "1rem", color: "white" }} value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
              <button type="submit" className="btn-primary" style={{ cursor: "pointer" }}>
                SEND DATA
              </button>
            </form>
          </div>
          <div className="glass-card" style={{ padding: "2.5rem" }}>
            <h3 className="elegant-heading-small">Manage List</h3>
            <div style={{ maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {works.map((w: any) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "1rem 0", borderBottom: "1px solid var(--glass-border)" }}>
                  <span style={{ fontSize: "0.9rem" }}>{w.title}</span>
                  <button onClick={() => deleteProject(w.id)} style={{ color: "#ff4d4d", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    DELETE
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
