export default function Skills() {
  return (
    <section id="skills" className="section-container scroll-reveal">
      <div className="section-header">
        <h2 className="section-title kinetic-reveal">Capabilities.</h2>
      </div>
      <div className="skills-grid">
        {[
          { t: "IT Programming", d: "Membangun sistem dan logika digital." },
          { t: "Graphic Design", d: "Menciptakan identitas visual yang tajam." },
          { t: "Video & Photo", d: "Bercerita melalui komposisi lensa dan editing." },
          { t: "Audio / Music", d: "Gitar, Keys, Bass. Eksplorasi harmoni." },
          { t: "Problem Solver", d: "Manajemen konflik dan solusi strategis organisasi." },
          { t: "Public Speaking", d: "Komunikasi asertif dan presentasi ide." },
        ].map((s, i) => (
          <div key={i} className="glass-card skill-box">
            <span className="skill-number">0{i + 1}</span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
      <div className="skills-icons-wrapper glass-card">
        <p className="icons-title">Tools & Technologies</p>
        <div className="icons-flex">
          <img src="https://img.icons8.com/color/96/javascript--v1.png" alt="JavaScript" className="tech-icon" />
          <img src="https://img.icons8.com/color/96/python--v1.png" alt="Python" className="tech-icon" />
          <img src="https://img.icons8.com/color/96/adobe-premiere-pro--v1.png" alt="Premiere Pro" className="tech-icon" />
          <img src="https://img.icons8.com/color/96/adobe-after-effects--v1.png" alt="After Effects" className="tech-icon" />
          <img src="https://img.icons8.com/color/96/adobe-illustrator--v1.png" alt="Illustrator" className="tech-icon" />
          <img src="https://img.icons8.com/color/96/figma--v1.png" alt="Figma" className="tech-icon" />
        </div>
      </div>
    </section>
  );
}
