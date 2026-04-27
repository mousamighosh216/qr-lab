// src/App.tsx
import { useState } from "react";
import Playground  from "./pages/Playground";
import Simulation  from "./pages/Simulation";
import Analysis    from "./pages/Analysis";

type Page = "playground" | "simulation" | "analysis";

interface NavItem { id: Page; label: string; }

const NAV_ITEMS: NavItem[] = [
  { id: "playground",  label: "Playground"  },
  { id: "simulation",  label: "Simulation"  },
  { id: "analysis",    label: "Analysis"    },
];

export default function App(): React.ReactElement {
  const [page, setPage] = useState<Page>("playground");

  return (
    <div style={styles.root}>
      {/* Top navigation bar */}
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <span style={styles.brandIcon}>🔘</span>
          <span style={styles.brandName}>QRLab</span>
          <span style={styles.brandTagline}>Fault-Tolerant Encoding Simulator</span>
        </div>

        <div style={styles.navLinks}>
          {NAV_ITEMS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              style={{
                ...styles.navLink,
                ...(page === id ? styles.navLinkActive : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main style={styles.main}>
        {page === "playground"  && <Playground />}
        {page === "simulation"  && <Simulation />}
        {page === "analysis"    && <Analysis   />}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>QRLab — Built on Reed–Solomon + GF(256)</span>
        <span style={styles.footerDivider}>·</span>
        <span>Phase 5 complete</span>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root:          { minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', system-ui, sans-serif", background: "#fafafa", color: "#1a1a1a" },
  nav:           { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: "56px", background: "#1a1a2e", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  navBrand:      { display: "flex", alignItems: "center", gap: "10px" },
  brandIcon:     { fontSize: "18px" },
  brandName:     { fontSize: "16px", fontWeight: "600", color: "#fff", letterSpacing: "-0.3px" },
  brandTagline:  { fontSize: "11px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.3px" },
  navLinks:      { display: "flex", gap: "4px" },
  navLink:       { padding: "6px 14px", fontSize: "13px", cursor: "pointer", border: "none", borderRadius: "6px", background: "transparent", color: "rgba(255,255,255,0.6)", transition: "all 0.15s" },
  navLinkActive: { background: "rgba(255,255,255,0.12)", color: "#fff" },
  main:          { flex: 1 },
  footer:        { padding: "12px 24px", borderTop: "1px solid #e5e5e5", fontSize: "11px", color: "#aaa", display: "flex", gap: "8px", background: "#fff" },
  footerDivider: { color: "#ddd" },
};