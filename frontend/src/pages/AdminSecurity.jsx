import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage, LanguageSwitcher } from '../i18n/LanguageContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const BASE = API_BASE + "/api";

async function apiFetch(path) {
  const token = localStorage.getItem("access");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("401");
  return res.json();
}

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", border: "#222d42", textPrimary: "#e2e8f5", 
    textSecond: "#7b8db0", textMuted: "#637fae", accent: "#4f8ef7", red: "#f87171",
    shadow: "0 4px 24px rgba(0,0,0,0.4)",
  }
};

export default function AdminSecurity() {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const t = THEMES.dark;

  const loadThreats = useCallback(async () => {
    try {
      const data = await apiFetch("/intelligence/insider-threats/");
      setThreats(data || []);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadThreats(); }, [loadThreats]);

  return (
    <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>🔐 HQ Master Security Audit</h1>
          <p style={{ color: t.textMuted, fontSize: "0.8rem", marginTop: 5 }}>Centralized Monitoring of All High-Level Branch Anomalies</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
           <LanguageSwitcher t={t} />
           <button onClick={() => navigate("/dashboard")} style={{ padding: "8px 16px", borderRadius: 8, background: t.bgCard, border: `1px solid ${t.border}`, color: t.textPrimary, cursor: "pointer" }}>Back to Dashboard</button>
        </div>
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
        <h2 style={{ fontSize: "1rem", marginBottom: "1.5rem", color: t.red }}>🚨 Global Supervisor & Personnel Anomalies</h2>
        
        {loading ? <p>Analyzing logs...</p> : threats.length === 0 ? <p>No high-risk threats detected globally.</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "1.5rem" }}>
            {threats.map(th => {
              const isSupervisor = th.role === 'SUPERVISOR';
              return (
                <div key={th.id} style={{ background: isSupervisor ? `${t.red}12` : `${t.accent}12`, border: `1px solid ${isSupervisor ? t.red : t.accent}44`, borderRadius: 12, padding: "1.2rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: isSupervisor ? t.red : t.accent }}>{th.username}</span>
                    <span style={{ fontSize: "0.65rem", background: isSupervisor ? t.red : t.accent, color: "#fff", padding: "2px 6px", borderRadius: 4 }}>
                      {th.role} | SCORE: {th.score}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: t.textSecond, marginBottom: 10 }}>Branch: {th.branch}</div>
                  <ul style={{ paddingLeft: 20, fontSize: "0.75rem", color: isSupervisor ? t.red : t.textPrimary }}>
                    {th.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  {isSupervisor && <div style={{ marginTop: 15, padding: 8, background: `${t.red}22`, borderRadius: 6, fontSize: "0.7rem", color: t.red, fontWeight: 700, textAlign: "center", border: `1px dashed ${t.red}` }}>⚠️ ESCALATED TO HQ AUDIT</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
