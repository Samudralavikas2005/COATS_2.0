import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LanguageSwitcher, useLanguage } from '../i18n/LanguageContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#637fae", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", yellow: "#f5c842", purple: "#a78bfa",
    shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#434c5c", accent: "#2563eb", green: "#059669",
    red: "#dc2626", yellow: "#d97706", purple: "#7c3aed",
    shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

const STAGE = {
  UI: { labelKey: "underInvestigation",          color: "#f5c842" },
  PT: { labelKey: "pendingTrial",                color: "#a78bfa" },
  HC: { labelKey: "pendingHC",                   color: "#fb923c" },
  SC: { labelKey: "pendingSC",                   color: "#f87171" },
  CC: { labelKey: "closed",                      color: "#34d399" },
};

const ACTION_META = {
  CREATED:  { labelKey: "caseCreated",   icon: "🆕", color: "#34d399" },
  VIEWED:   { labelKey: "caseViewed",    icon: "👁",  color: "#7b8db0" },
  STAGE:    { labelKey: "stageChanged",  icon: "🔄", color: "#f5c842" },
  ACTION:   { labelKey: "actionUpdated", icon: "📝", color: "#a78bfa" },
  ASSIGNED: { labelKey: "caseAssigned",  icon: "👮", color: "#4f8ef7" },
  UPDATED:  { labelKey: "caseUpdated",   icon: "✏️", color: "#fb923c" },
};

function formatDate(ts, lang = 'en') {
  if (!ts) return "—";
  const locale = lang === 'en' ? "en-IN" : (lang === 'hi' ? "hi-IN" : "ta-IN");
  return new Date(ts).toLocaleString(locale, {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// API_BASE is defined at the top

function downloadReport(caseId, format) {
  const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/cases/${caseId}/report/${format}/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => {
      if (!res.ok) throw new Error("Download failed");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Case_Report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(err => alert("Report download failed: " + err.message));
}

function StageBadge({ code, tr }) {
  const s = STAGE[code] || { labelKey: code, color: "#8896b3" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, fontFamily: "'Sora',sans-serif", background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}44` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block", animation: code !== "CC" ? "cPulse 2s infinite" : "none" }} />
      {tr(s.labelKey) || code}
    </span>
  );
}

function Field({ label, value, t, tr }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", color: t.textPrimary, lineHeight: 1.6 }}>
        {value || <span style={{ color: t.textMuted, fontStyle: "italic" }}>—</span>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, t, accent, outline = false, disabled = false, small = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: small ? "0.68rem" : "0.75rem", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", borderRadius: 8, padding: small ? "5px 12px" : "8px 18px", transition: "all .2s", opacity: disabled ? 0.45 : 1, background: outline ? "transparent" : hov ? accent : `${accent}18`, border: `1px solid ${hov && !disabled ? accent : outline ? t.border : `${accent}44`}`, color: outline ? (hov ? t.red : t.textSecond) : (hov ? "#fff" : accent) }}>
      {children}
    </button>
  );
}

// ── Chain of Custody Timeline ─────────────────────────────────────
function CustodyTimeline({ entries, t, tr, lang }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ padding: "2.5rem", textAlign: "center", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>🔗</div>
        {tr("noCustody")}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", padding: "0.5rem 0" }}>
      <div style={{ position: "absolute", left: "2.2rem", top: 0, bottom: 0, width: 2, background: t.border, zIndex: 0 }} />
      {entries.map((entry, i) => {
        const meta   = ACTION_META[entry.action] || { labelKey: entry.action, icon: "📌", color: t.accent };
        const isLast = i === entries.length - 1;
        return (
          <div key={entry.id} style={{ display: "flex", gap: "1.25rem", marginBottom: isLast ? 0 : "1.5rem", position: "relative", zIndex: 1 }}>
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", background: `${meta.color}18`, border: `2px solid ${meta.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", zIndex: 2, overflow: "hidden" }}>
              {entry.officer_photo
                ? <img src={entry.officer_photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : meta.icon}
            </div>
            <div style={{ flex: 1, background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "0.9rem 1.1rem", boxShadow: t.shadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: meta.color }}>{tr(meta.labelKey) || entry.action}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {entry.blockchain_tx && (
                    <a href={entry.blockchain_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "2px 8px", textDecoration: "none" }}>
                      ⛓ {tr("verified")}
                    </a>
                  )}
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textMuted }}>{formatDate(entry.timestamp, lang)}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${t.accent}22`, border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", color: t.accent, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>
                  {(entry.officer_username || "?")[0].toUpperCase()}
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: t.textSecond }}>{entry.officer_username}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textMuted }}>· {entry.officer_role} · {entry.officer_branch}</span>
                {entry.ip_address && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", color: t.textMuted, marginLeft: "auto" }}>IP: {entry.ip_address}</span>}
              </div>
              {entry.reason && (
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textPrimary, background: `${t.accent}08`, border: `1px solid ${t.accent}22`, borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{tr("reason")}: </span>
                  {entry.reason}
                </div>
              )}
              {entry.notes && <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", color: t.textMuted }}>{entry.notes}</div>}
              {entry.old_value && entry.new_value && entry.action !== "VIEWED" && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, background: `${t.red}0d`, border: `1px solid ${t.red}22`, borderRadius: 8, padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.red }}>
                    <div style={{ fontSize: "0.58rem", color: t.textMuted, marginBottom: 2 }}>{tr("before")}</div>{entry.old_value}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", color: t.textMuted, fontSize: "0.8rem" }}>→</div>
                  <div style={{ flex: 1, background: `${t.green}0d`, border: `1px solid ${t.green}22`, borderRadius: 8, padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.green }}>
                    <div style={{ fontSize: "0.58rem", color: t.textMuted, marginBottom: 2 }}>{tr("after")}</div>{entry.new_value}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Tab ──────────────────────────────────────────────────
function ProgressTab({ caseId, role, t, tr, lang }) {
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [form, setForm]         = useState({
    date_of_progress: "", details_of_progress: "",
    further_action_to_be_taken: "", remarks: "", reminder_date: "",
  });

  const fetchProgress = useCallback(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/cases/${caseId}/progress/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [caseId]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const handleAdd = async () => {
    if (!form.date_of_progress || !form.details_of_progress) {
      setError("Date and details are required."); return;
    }
    setSaving(true); setError("");
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}/progress/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add progress entry");
      setForm({ date_of_progress: "", details_of_progress: "", further_action_to_be_taken: "", remarks: "", reminder_date: "" });
      setShowForm(false);
      fetchProgress();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleComplete = async (pk) => {
    const token = localStorage.getItem("access");
    await fetch(`${API_BASE}/api/progress/${pk}/complete/`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProgress();
  };

  const inp = { width: "100%", padding: "0.6rem 0.9rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 9, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted }}>
          📋 {tr("investigationProgress")} — {entries.length} {tr("casesLabel")}
        </div>
        {role === "CASE" && (
          <Btn onClick={() => setShowForm(s => !s)} t={t} accent={t.green} small>
            {showForm ? "✕ " + tr("cancel") : "+ " + tr("addProgress")}
          </Btn>
        )}
      </div>

      {showForm && (
        <div style={{ background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "1rem" }}>{tr("newProgressEntry")}</div>
          {error && <div style={{ color: t.red, fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>⚠️ {error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("date")} *</div>
              <input type="date" value={form.date_of_progress} onChange={e => setForm({ ...form, date_of_progress: e.target.value })} style={inp} />
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("reminderDate")}</div>
              <input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("details")} *</div>
            <textarea value={form.details_of_progress} onChange={e => setForm({ ...form, details_of_progress: e.target.value })} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("furtherAction")}</div>
              <textarea value={form.further_action_to_be_taken} onChange={e => setForm({ ...form, further_action_to_be_taken: e.target.value })} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("remarks")}</div>
              <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            </div>
          </div>
          <Btn onClick={handleAdd} t={t} accent={t.green} disabled={saving}>
            {saving ? tr("loading") : "✓ " + tr("saveProgress")}
          </Btn>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>{tr("loading")}</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>📋</div>
          {tr("noProgress")}
        </div>
      ) : (
        entries.map((entry, i) => (
          <div key={entry.id} style={{ background: t.bgCard, border: `1px solid ${entry.is_completed ? t.green + "44" : t.border}`, borderRadius: 12, padding: "1rem 1.2rem", marginBottom: i === entries.length - 1 ? 0 : "0.75rem", boxShadow: t.shadow }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem", fontWeight: 700, color: entry.is_completed ? t.green : t.accent }}>
                  {entry.is_completed ? "✅" : "🔵"} {entry.date_of_progress}
                </span>
                {entry.is_completed && (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "1px 8px" }}>
                    {tr("completed")}
                  </span>
                )}
                {entry.blockchain_tx && (
                  <a href={entry.blockchain_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "1px 8px", textDecoration: "none" }}>
                    ⛓ {tr("verified")}
                  </a>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {entry.reminder_date && (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.yellow }}>
                    ⏰ {tr("reminderDate")}: {entry.reminder_date}
                  </span>
                )}
                {role === "CASE" && !entry.is_completed && (
                  <Btn onClick={() => handleComplete(entry.id)} t={t} accent={t.green} small>{tr("markDone")}</Btn>
                )}
              </div>
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", color: t.textPrimary, lineHeight: 1.6, marginBottom: entry.further_action_to_be_taken || entry.remarks ? 8 : 0 }}>
              {entry.details_of_progress}
            </div>
            {(entry.further_action_to_be_taken || entry.remarks) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: 8 }}>
                {entry.further_action_to_be_taken && (
                  <div style={{ background: `${t.accent}08`, border: `1px solid ${t.accent}22`, borderRadius: 8, padding: "6px 10px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 3 }}>{tr("furtherAction")}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond }}>{entry.further_action_to_be_taken}</div>
                  </div>
                )}
                {entry.remarks && (
                  <div style={{ background: `${t.purple}08`, border: `1px solid ${t.purple}22`, borderRadius: 8, padding: "6px 10px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 3 }}>{tr("remarks")}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond }}>{entry.remarks}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted, marginTop: 8 }}>
              {tr("addedBy")} {entry.officer} · {formatDate(entry.created_at, lang)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Handover Tab ──────────────────────────────────────────────────
function HandoverTab({ caseId, caseData, t, tr, lang }) {
  const [officers, setOfficers]       = useState([]);
  const [handovers, setHandovers]     = useState([]);
  const [toOfficerId, setToOfficerId] = useState("");
  const [reason, setReason]           = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/officers/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setOfficers).catch(() => {});

    fetch(`${API_BASE}/api/cases/${caseId}/handover/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(setHandovers).catch(() => {});
  }, [caseId]);

  const handleHandover = async () => {
    if (!toOfficerId) { setError("Please select an officer."); return; }
    if (!reason.trim()) { setError("Reason is required."); return; }
    setSaving(true); setError(""); setSuccess("");
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}/handover/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to_officer_id: toOfficerId, reason }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Handover failed");
      }
      const data = await res.json();
      setHandovers(prev => [data, ...prev]);
      setToOfficerId(""); setReason("");
      setSuccess(`Case successfully reassigned to ${data.to_officer_username}`);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const inp = { width: "100%", padding: "0.6rem 0.9rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 9, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", outline: "none" };

  return (
    <div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>
        👮 {tr("handover")}
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1rem 1.2rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${t.accent}22`, border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem", color: t.accent, fontWeight: 700 }}>
          {(caseData.case_holding_officer_username || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textMuted, marginBottom: 2 }}>{tr("currentOfficer")}</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: t.textPrimary }}>{caseData.case_holding_officer_username}</div>
        </div>
      </div>

      <div style={{ background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "1rem" }}>{tr("reassignTo")}</div>
        {error   && <div style={{ color: t.red,   fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>⚠️ {error}</div>}
        {success && <div style={{ color: t.green, fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>✅ {success}</div>}

        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("selectOfficer")} *</div>
          <select value={toOfficerId} onChange={e => setToOfficerId(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            <option value="">— {tr("selectOfficer")} —</option>
            {officers.map(o => (
              <option key={o.id} value={o.id}>{o.username} ({o.branch})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>{tr("reasonForHandover")} *</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        <Btn onClick={handleHandover} t={t} accent={t.purple} disabled={saving}>
          {saving ? tr("loading") : "👮 " + tr("confirmHandover")}
        </Btn>
      </div>

      {handovers.length > 0 && (
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "0.75rem" }}>
            {tr("handoverHistory")} ({handovers.length})
          </div>
          {handovers.map((h, i) => (
            <div key={h.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 10, padding: "0.9rem 1.1rem", marginBottom: i === handovers.length - 1 ? 0 : "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red }}>{h.from_officer_username}</span>
                <span style={{ color: t.textMuted }}>→</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.green }}>{h.to_officer_username}</span>
                {h.blockchain_tx && (
                  <a href={h.blockchain_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "1px 8px", textDecoration: "none", marginLeft: "auto" }}>
                    ⛓ {tr("verified")}
                  </a>
                )}
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond, marginBottom: 4 }}>{h.reason}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted }}>{formatDate(h.timestamp, lang)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function RecommendationsTab({ caseId, t, navigate, tr }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/cases/${caseId}/recommendations/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setRecommendations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [caseId]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: t.textMuted, fontSize: "0.8rem", fontFamily: "'JetBrains Mono',monospace", padding: "2rem" }}>
      <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${t.accent}33`, borderTopColor: t.accent, animation: "cPulse 1s infinite linear" }} />
      {tr("analyzingPatterns")}
    </div>
  );

  if (recommendations.length === 0) {
    return (
      <div style={{ background: `${t.accent}08`, border: `1px dashed ${t.border}`, borderRadius: 16, padding: "3rem 2rem", textAlign: "center", color: t.textMuted, animation: "cFadeIn 0.5s ease-out" }}>
        <div style={{ fontSize: "2rem", marginBottom: 12, opacity: 0.5 }}>🧠</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.95rem", fontWeight: 600, color: t.textPrimary, marginBottom: 4 }}>{tr("noMatchesFound")}</div>
        <div style={{ fontSize: "0.8rem", maxWidth: 300, margin: "0 auto", lineHeight: 1.5 }}>{tr("noMatches")}</div>
      </div>
    );
  }

  return (
    <div style={{ animation: "cFadeIn 0.4s ease-out" }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>🧠 {tr("smartRecommendations")}</span>
        <div style={{ padding: "2px 8px", background: `linear-gradient(45deg, ${t.accent}, ${t.purple})`, color: "#fff", borderRadius: 4, fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.05em" }}>{tr("aiPowered")}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
        {recommendations.map(rec => (
          <div key={rec.id} onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            navigate(`/cases/${rec.id}`);
          }} 
          style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 14, padding: "1.25rem", cursor: "pointer", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", position: "relative", overflow: "hidden" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.boxShadow = `0 10px 25px -5px ${t.accent}20`; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = t.border; e.currentTarget.style.boxShadow = "none"; }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem", fontWeight: 700, color: t.accent }}>{rec.crime_number}</span>
              <StageBadge code={rec.current_stage} tr={tr} />
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.95rem", fontWeight: 700, color: t.textPrimary, marginBottom: 6, lineHeight: 1.3 }}>{rec.section_of_law}</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>
              <span style={{ opacity: 0.6 }}>{tr("accused")}:</span> {rec.accused_details || "N/A"}
            </div>
            <div style={{ marginTop: 15, paddingTop: 12, borderTop: `1px solid ${t.border}44`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.7rem", color: t.textMuted, display: "flex", alignItems: "center", gap: 4 }}>📍 {rec.branch}</span>
              <div style={{ fontSize: "0.65rem", color: t.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{tr("viewIntelligence")} →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Evidence Tab ──────────────────────────────────────────────────
function EvidenceTab({ caseId, role, t, tr, lang }) {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [desc, setDesc]         = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const fileRef                 = useRef();

  const fetchEvidence = useCallback(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/cases/${caseId}/evidence/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { setEvidence(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [caseId]);

  useEffect(() => { fetchEvidence(); }, [fetchEvidence]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", desc || file.name);
    
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}/evidence/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      setDesc("");
      fetchEvidence();
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted }}>
          📂 {tr("evidenceVault")} — {evidence.length} {tr("casesLabel")}
        </div>
        {role === "CASE" && (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="text" placeholder={tr("description")} value={desc} onChange={e => setDesc(e.target.value)}
              style={{ padding: "6px 12px", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 8, fontSize: "0.75rem", color: t.textPrimary, width: 140 }} />
            <input type="file" ref={fileRef} onChange={handleUpload} style={{ display: "none" }} />
            <Btn onClick={() => fileRef.current.click()} t={t} accent={t.accent} small disabled={uploading}>
              {uploading ? tr("uploading") : "+ " + tr("uploadEvidence")}
            </Btn>
          </div>
        )}
      </div>

      <div style={{ background: `${t.accent}0a`, border: `1px solid ${t.accent}22`, borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: "1.3rem" }}>⛓️</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", color: t.textSecond, lineHeight: 1.4 }}>
          {tr("blockchainHint")}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>{tr("loading")}</div>
      ) : evidence.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>📁</div>
          {tr("noCasesFound")}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {evidence.map(item => (
            <div key={item.id} style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1rem", position: "relative", boxShadow: t.shadow }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${t.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                  {(item.file_type || "").includes("image") ? "🖼️" : (item.file_type || "").includes("pdf") ? "📄" : "📁"}
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {(item.file_type || "").includes("image") ? (
                    <button onClick={() => setSelectedImage(item.file)}
                      style={{ background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: t.textPrimary, textDecoration: "underline", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                      {item.description || item.file_name}
                    </button>
                  ) : (
                    <a href={item.file} target="_blank" rel="noopener noreferrer" 
                      style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: t.textPrimary, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.description || item.file_name}
                    </a>
                  )}
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.textMuted }}>{(item.file_size/1024).toFixed(1)} KB · {(item.file_type || "UNKNOWN/UNKNOWN").split("/")[1]?.toUpperCase() || "FILE"}</div>
                </div>
              </div>
              {item.blockchain_tx && (
                <div style={{ background: `${t.green}10`, border: `1px solid ${t.green}33`, borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.green }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.green, fontWeight: 600 }}>{tr("blockchainVerified")}</span>
                  <a href={item.blockchain_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto", fontSize: "0.6rem", color: t.textMuted }}>VIEW TX</a>
                </div>
              )}
              <div style={{ borderTop: `1px solid ${t.border}44`, paddingTop: 8, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: t.border, fontSize: "0.55rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{(item.uploaded_by_username || "?")[0].toUpperCase()}</div>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted }}>{item.uploaded_by_username}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted }}>{formatDate(item.uploaded_at, lang)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Overlay */}
      {selectedImage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Evidence" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setSelectedImage(null)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }} onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.3)"} onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.2)"}>×</button>
        </div>
      )}
    </div>
  );
}

// ── Witness Tab ───────────────────────────────────────────────────
function WitnessTab({ caseId, role, t, tr, lang }) {
  const [witnesses, setWitnesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", age: "", gender: "M", address: "", phone: "",
    relationship: "", statement: "", is_hostile: false, is_section_164: false, protection_status: "NONE"
  });

  const fetchWitnesses = useCallback(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/cases/${caseId}/witnesses/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { setWitnesses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [caseId]);

  useEffect(() => { fetchWitnesses(); }, [fetchWitnesses]);

  const handleAdd = async () => {
    if (!form.name || !form.statement) return setError("Name and Statement are required.");
    setSaving(true); setError("");
    const token = localStorage.getItem("access");

    try {
      const res = await fetch(`${API_BASE}/api/cases/${caseId}/witnesses/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to add witness");
      setForm({ name: "", age: "", gender: "M", address: "", phone: "", relationship: "", statement: "", is_hostile: false, is_section_164: false, protection_status: "NONE" });
      setShowForm(false);
      fetchWitnesses();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const inp = { width: "100%", padding: "0.6rem 0.9rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 9, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", outline: "none" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted }}>
          👥 {tr("witnessManagement")} — {witnesses.length} {tr("casesLabel")}
        </div>
        {role === "CASE" && (
          <Btn onClick={() => setShowForm(s => !s)} t={t} accent={t.yellow} small>
            {showForm ? "✕ " + tr("cancel") : "+ " + tr("addWitness")}
          </Btn>
        )}
      </div>

      {showForm && (
        <div style={{ background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "1rem" }}>{tr("registerWitness")}</div>
          {error && <div style={{ color: t.red, fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>⚠️ {error}</div>}
          
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <input type="text" placeholder={tr("fullName") + " *"} value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inp} />
            <input type="number" placeholder={tr("age")} value={form.age} onChange={e => setForm({...form, age: e.target.value})} style={inp} />
            <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} style={inp}>
              <option value="M">{tr("male")}</option>
              <option value="F">{tr("female")}</option>
              <option value="O">{tr("other")}</option>
            </select>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <input type="text" placeholder={tr("phone")} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={inp} />
            <input type="text" placeholder={tr("relationship")} value={form.relationship} onChange={e => setForm({...form, relationship: e.target.value})} style={inp} />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <textarea placeholder={tr("statement") + " *"} value={form.statement} onChange={e => setForm({...form, statement: e.target.value})} rows={4} style={{...inp, resize: "vertical"}} />
          </div>

          <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.25rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: t.textPrimary }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_section_164} onChange={e => setForm({...form, is_section_164: e.target.checked})} />
              {tr("sec164")}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={form.is_hostile} onChange={e => setForm({...form, is_hostile: e.target.checked})} />
              {tr("hostile")}
            </label>
          </div>

          <Btn onClick={handleAdd} t={t} accent={t.yellow} disabled={saving}>
            {saving ? tr("loading") : "✓ " + tr("saveStatement")}
          </Btn>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>{tr("loading")}</div>
      ) : witnesses.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>👥</div>
          {tr("noCasesFound")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {witnesses.map(w => (
            <div key={w.id} style={{ background: t.bgCard, border: `1px solid ${w.is_hostile ? t.red : t.border}`, borderRadius: 12, padding: "1.2rem", boxShadow: t.shadow }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "1.05rem", fontWeight: 700, color: t.textPrimary }}>{w.name}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textSecondary }}>{w.age ? `${w.age} ${tr("yrs")}` : tr("ageNA")} · {w.gender === 'M' ? tr("male") : w.gender === 'F' ? tr("female") : tr("other")}</span>
                  {w.is_section_164 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", padding: "2px 6px", background: `${t.accent}22`, color: t.accent, borderRadius: 4 }}>{tr("sec164")}</span>}
                  {w.is_hostile && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", padding: "2px 6px", background: `${t.red}22`, color: t.red, borderRadius: 4 }}>{tr("hostile")}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {w.blockchain_tx && (
                    <a href={w.blockchain_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "2px 8px", textDecoration: "none" }}>
                      ⛓ {tr("verified")}
                    </a>
                  )}
                </div>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", color: t.textPrimary, lineHeight: 1.6, background: `${t.bgBase}66`, padding: "10px", borderRadius: 8, borderLeft: `3px solid ${w.is_hostile ? t.red : t.accent}` }}>
                {w.statement}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted, marginTop: 10 }}>
                {tr("recordedBy")} {w.recorded_by_username} · {formatDate(w.recorded_at, lang)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ── Main Component ────────────────────────────────────────────────
function CaseDetail() {
  const getTheme = () => {
    try { return localStorage.getItem("coats-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
    catch { return "dark"; }
  };

  const { id }   = useParams();
  const navigate = useNavigate();
  const role     = localStorage.getItem("role");
  const { lang, tr } = useLanguage();

  const [theme, setTheme]         = useState(getTheme);
  const [caseData, setCaseData]   = useState(null);
  const [custody, setCustody]     = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [form, setForm]           = useState({ current_stage: "", action_to_be_taken: "", reason: "" });
  const [error, setError]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const t      = THEMES[theme];
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
    fetch(`${API_BASE}/api/cases/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => { if (!res.ok) throw new Error("Failed to load case"); return res.json(); })
      .then(data => {
        setCaseData(data);
        setForm({ current_stage: data.current_stage || "", action_to_be_taken: data.action_to_be_taken || "", reason: "" });
      })
      .catch(err => setError(err.message));

    fetch(`${API_BASE}/api/cases/${id}/custody/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setCustody(data))
      .catch(() => {});
  }, [id]);

  const isClosed = caseData?.current_stage === "CC";
  const canEdit  = role === "CASE" && !isClosed;

  const handleUpdate = async () => {
    if (!form.reason.trim()) { setError(tr("reason") + " " + tr("required")); return; }
    const token = localStorage.getItem("access");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/cases/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data === "object" ? Object.values(data).flat().join(", ") : "Update failed");
      }
      setSaved(true);
      setTimeout(() => navigate("/cases"), 1200);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const inputStyle = (editable) => ({
    width: "100%", padding: "0.65rem 1rem",
    background: editable ? t.bgBase : t.bgCardHover,
    border: `1px solid ${t.border}`, borderRadius: 10,
    color: editable ? t.textPrimary : t.textMuted,
    fontFamily: editable ? "'Sora',sans-serif" : "'JetBrains Mono',monospace",
    fontSize: "0.88rem", resize: "vertical", lineHeight: 1.6,
    cursor: editable ? "text" : "not-allowed",
    transition: "border-color .2s", outline: "none",
  });

  const TABS = [
    { key: "details",  label: "📋 " + tr("overview") },
    { key: "evidence", label: "📁 " + tr("evidence") },
    { key: "witnesses",label: "👥 " + tr("witnesses") },
    { key: "progress", label: "📊 " + tr("progress") },
    { key: "custody",  label: `🔗 ${tr("custody")} (${custody.length})` },
    { key: "recommendations", label: "🧠 " + tr("recommendations") },
    ...(role === "SUPERVISOR" ? [{ key: "handover", label: "👮 " + tr("handover") }] : []),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cPulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
        @keyframes cFadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea:focus, select:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: ${isDark ? "invert(1) opacity(0.4)" : "opacity(0.5)"}; cursor: pointer; }
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem", transition: "background .25s, color .2s" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>🚨 COATS · {tr("caseDetail")}</div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
              {caseData ? caseData.crime_number : tr("loading")}
            </h1>
            {caseData && <div style={{ marginTop: 8 }}><StageBadge code={caseData.current_stage} tr={tr} /></div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>{isDark ? "Dark" : "Light"}</span>
              <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer" }}>
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>
            {caseData && (
              <>
                <Btn onClick={() => downloadReport(id, "pdf")} t={t} accent={t.purple} small>⬇ PDF</Btn>
                <Btn onClick={() => downloadReport(id, "csv")} t={t} accent={t.green} small>⬇ CSV</Btn>
              </>
            )}
            <Btn onClick={() => navigate("/cases")} t={t} accent={t.accent} outline>← {tr("back")}</Btn>
          </div>
        </div>

        {/* ── ALERTS ── */}
        {error && (
          <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red }}>⚠️ {error}</div>
        )}
        {saved && (
          <div style={{ background: `${t.green}15`, border: `1px solid ${t.green}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.green }}>✅ {tr("caseUpdated")}</div>
        )}
        {!caseData && !error && (
          <div style={{ textAlign: "center", padding: "4rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 10, opacity: 0.3 }}>⏳</div>{tr("loadingCases")}
          </div>
        )}

        {caseData && (
          <div style={{ animation: "cFadeIn .35s ease" }}>

            {/* ── TABS ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: "1.5rem", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, width: "fit-content" }}>
              {TABS.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "8px 18px", transition: "all .2s", border: "none", background: activeTab === tab.key ? t.accent : "transparent", color: activeTab === tab.key ? "#fff" : t.textSecond }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── DETAILS TAB ── */}
            {activeTab === "details" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>{tr("overview")}</div>
                    <Field label={tr("branch")}               value={caseData.branch}               t={t} tr={tr} />
                    <Field label="PS Limit"             value={caseData.ps_limit}             t={t} tr={tr} />
                    <Field label={tr("crimeNo")}            value={caseData.crime_number}         t={t} tr={tr} />
                    <Field label="IPC Section"          value={caseData.section_of_law}       t={t} tr={tr} />
                    <Field label="Date of Occurrence"   value={caseData.date_of_occurrence}   t={t} tr={tr} />
                    <Field label="Date of Registration" value={caseData.date_of_registration} t={t} tr={tr} />
                    {role === "SUPERVISOR" && <Field label="Case Handler" value={caseData.case_holding_officer_username} t={t} tr={tr} />}
                  </div>
                  <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>Parties & Gist</div>
                    <Field label="Complainant"     value={caseData.complainant_name} t={t} tr={tr} />
                    <Field label="Accused Details" value={caseData.accused_details}  t={t} tr={tr} />
                    <Field label="Gist of Case"    value={caseData.gist_of_case}     t={t} tr={tr} />
                  </div>
                </div>

                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Case Status & Action</span>
                    {isClosed && <span style={{ background: `${t.green}18`, color: t.green, border: `1px solid ${t.green}44`, borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem" }}>🔒 Case Closed</span>}
                    {role === "SUPERVISOR" && !isClosed && <span style={{ background: `${t.yellow}18`, color: t.yellow, border: `1px solid ${t.yellow}44`, borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem" }}>👁 Supervisor View</span>}
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 6 }}>Current Stage</div>
                    <select value={form.current_stage} onChange={e => setForm({ ...form, current_stage: e.target.value })} disabled={!canEdit}
                      style={{ width: "100%", padding: "0.65rem 1rem", background: canEdit ? t.bgBase : t.bgCardHover, border: `1px solid ${t.border}`, borderRadius: 10, color: canEdit ? t.textPrimary : t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem", cursor: canEdit ? "pointer" : "not-allowed" }}
                      onFocus={e => canEdit && (e.target.style.borderColor = t.accent)}
                      onBlur={e => e.target.style.borderColor = t.border}>
                      {Object.entries(STAGE).map(([code, s]) => (
                        <option key={code} value={code}>{tr(s.labelKey)}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 6 }}>Action to be Taken</div>
                    <textarea value={form.action_to_be_taken} onChange={e => setForm({ ...form, action_to_be_taken: e.target.value })} disabled={!canEdit} rows={4} style={inputStyle(canEdit)}
                      onFocus={e => canEdit && (e.target.style.borderColor = t.accent)}
                      onBlur={e => e.target.style.borderColor = t.border} />
                  </div>

                  {canEdit && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.red, marginBottom: 6 }}>
                        {tr("reason")} <span style={{ color: t.red }}>*</span>
                      </div>
                      <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="..." rows={3}
                        style={{ ...inputStyle(true), borderColor: form.reason.trim() ? t.border : `${t.red}66` }}
                        onFocus={e => e.target.style.borderColor = t.accent}
                        onBlur={e => e.target.style.borderColor = form.reason.trim() ? t.border : `${t.red}66`} />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    {canEdit && <Btn onClick={handleUpdate} t={t} accent={t.green} disabled={saving}>{saving ? tr("loading") : "✓ " + tr("editCase")}</Btn>}
                    <Btn onClick={() => navigate("/cases")} t={t} accent={t.accent} outline>← {tr("back")}</Btn>
                  </div>
                </div>
              </>
            )}

            {/* ── EVIDENCE TAB ── */}
            {activeTab === "evidence" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <EvidenceTab caseId={id} role={role} t={t} tr={tr} lang={lang} />
              </div>
            )}

            {/* ── WITNESS TAB ── */}
            {activeTab === "witnesses" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <WitnessTab caseId={id} role={role} t={t} tr={tr} lang={lang} />
              </div>
            )}

            {/* ── PROGRESS TAB ── */}
            {activeTab === "progress" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <ProgressTab caseId={id} role={role} t={t} tr={tr} lang={lang} />
              </div>
            )}

            {/* ── CUSTODY TAB ── */}
            {activeTab === "custody" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>🔗 {tr("custody")} — {caseData.crime_number}</span>
                  <span style={{ color: t.accent }}>{custody.length} {tr("casesLabel")}</span>
                </div>
                <CustodyTimeline entries={custody} t={t} tr={tr} lang={lang} />
              </div>
            )}

            {/* ── HANDOVER TAB ── */}
            {activeTab === "handover" && role === "SUPERVISOR" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <HandoverTab caseId={id} caseData={caseData} t={t} tr={tr} lang={lang} />
              </div>
            )}

            {/* ── RECOMMENDATIONS TAB ── */}
            {activeTab === "recommendations" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "2rem", boxShadow: t.shadow }}>
                <RecommendationsTab caseId={id} t={t} navigate={navigate} tr={tr} />
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}

export default CaseDetail;
