import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", border: "#222d42",
    textPrimary: "#e2e8f5", textSecond: "#7b8db0", textMuted: "#637fae",
    accent: "#4f8ef7", green: "#34d399", red: "#f87171", yellow: "#f5c842",
    purple: "#a78bfa", shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", border: "#d2ddf0",
    textPrimary: "#111827", textSecond: "#4b5e80", textMuted: "#434c5c",
    accent: "#2563eb", green: "#059669", red: "#dc2626", yellow: "#d97706",
    purple: "#7c3aed", shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

const STAGE_COLORS = {
  UI: "#f5c842", PT: "#a78bfa", HC: "#fb923c", SC: "#f87171", CC: "#34d399",
};
const STAGE_LABELS = {
  UI: "Under Investigation", PT: "Pending Trial", HC: "High Court",
  SC: "Supreme Court", CC: "Case Closed",
};

export default function CrimeMap() {
  const getTheme = () => {
    try { return localStorage.getItem("coats-theme") || "dark"; } catch { return "dark"; }
  };
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const [theme, setTheme] = useState(getTheme);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ branch: "", stage: "" });

  const t = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/intelligence/crime-map/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setCases(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = cases.filter(c => {
    if (filter.branch && c.branch !== filter.branch) return false;
    if (filter.stage && c.current_stage !== filter.stage) return false;
    return true;
  });

  const branches = [...new Set(cases.map(c => c.branch))].sort();
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .leaflet-container { background: ${t.bgBase} !important; border-radius: 16px; }
        .leaflet-popup-content-wrapper { background: ${t.bgCard} !important; color: ${t.textPrimary} !important; border: 1px solid ${t.border} !important; border-radius: 12px !important; box-shadow: ${t.shadow} !important; }
        .leaflet-popup-tip { background: ${t.bgCard} !important; }
        .leaflet-popup-close-button { color: ${t.textMuted} !important; }
        .leaflet-control-zoom a { background: ${t.bgCard} !important; color: ${t.textPrimary} !important; border-color: ${t.border} !important; }
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem", transition: "background .25s" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>🚔 COATS · Crime Intelligence</div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em" }}>🗺️ Crime Hotspot Map</h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textMuted, marginTop: 4 }}>
              {filtered.length} cases plotted across Tamil Nadu
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>{isDark ? "Dark" : "Light"}</span>
              <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>
            <button onClick={() => navigate(role === "SUPERVISOR" ? "/dashboard" : "/cases")}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 14px", background: "transparent", border: `1px solid ${t.border}`, color: t.textSecond }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: "1rem", flexWrap: "wrap" }}>
          <select value={filter.branch} onChange={e => setFilter(f => ({ ...f, branch: e.target.value }))}
            style={{ padding: "6px 12px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", cursor: "pointer" }}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filter.stage} onChange={e => setFilter(f => ({ ...f, stage: e.target.value }))}
            style={{ padding: "6px 12px", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 8, color: t.textPrimary, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", cursor: "pointer" }}>
            <option value="">All Stages</option>
            {Object.entries(STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: "auto" }}>
            {Object.entries(STAGE_COLORS).map(([k, color]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textMuted }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }} />
                {k}
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: t.textMuted }}>Loading map data…</div>
        ) : (
          <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${t.border}`, boxShadow: t.shadow }}>
            <MapContainer center={[11.1271, 78.6569]} zoom={7} style={{ height: "70vh", width: "100%" }} scrollWheelZoom={true}>
              <TileLayer url={tileUrl} attribution='&copy; OpenStreetMap' />
              {filtered.map(c => (
                <CircleMarker
                  key={c.id}
                  center={[c.lat, c.lng]}
                  radius={8}
                  fillColor={STAGE_COLORS[c.current_stage] || "#8896b3"}
                  color={STAGE_COLORS[c.current_stage] || "#8896b3"}
                  weight={2}
                  opacity={0.9}
                  fillOpacity={0.6}
                >
                  <Popup>
                    <div style={{ fontFamily: "'Sora',sans-serif", minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4, color: "#111" }}>{c.crime_number}</div>
                      <div style={{ fontSize: "0.8rem", color: "#555", marginBottom: 3 }}>{c.section_of_law}</div>
                      <div style={{ fontSize: "0.75rem", color: "#777", marginBottom: 2 }}>📍 {c.ps_limit} · {c.branch}</div>
                      <div style={{ fontSize: "0.75rem", color: "#777", marginBottom: 2 }}>📅 {c.date_of_occurrence}</div>
                      {c.accused_details && <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: 4 }}>👤 {c.accused_details}</div>}
                      <div style={{ display: "inline-block", padding: "2px 8px", borderRadius: 12, fontSize: "0.68rem", fontWeight: 600, background: `${STAGE_COLORS[c.current_stage]}22`, color: STAGE_COLORS[c.current_stage], border: `1px solid ${STAGE_COLORS[c.current_stage]}44` }}>
                        {STAGE_LABELS[c.current_stage] || c.current_stage}
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <button onClick={() => navigate(`/cases/${c.id}`)}
                          style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: 6, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>
                          View Case →
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </>
  );
}
