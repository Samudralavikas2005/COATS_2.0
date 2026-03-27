import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
  UI: { label: "Under Investigation",          color: "#f5c842" },
  PT: { label: "Pending Trial",                color: "#a78bfa" },
  HC: { label: "Pending before High Court",    color: "#fb923c" },
  SC: { label: "Pending before Supreme Court", color: "#f87171" },
  CC: { label: "Case Closed",                  color: "#34d399" },
};

const ACTION_META = {
  CREATED:  { label: "Case Created",   icon: "🆕", color: "#34d399" },
  VIEWED:   { label: "Case Viewed",    icon: "👁",  color: "#7b8db0" },
  STAGE:    { label: "Stage Changed",  icon: "🔄", color: "#f5c842" },
  ACTION:   { label: "Action Updated", icon: "📝", color: "#a78bfa" },
  ASSIGNED: { label: "Case Assigned",  icon: "👮", color: "#4f8ef7" },
  UPDATED:  { label: "Case Updated",   icon: "✏️", color: "#fb923c" },
};

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${API_BASE}";

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

function StageBadge({ code }) {
  const s = STAGE[code] || { label: code, color: "#8896b3" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, fontFamily: "'Sora',sans-serif", background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}44` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, display: "inline-block", animation: code !== "CC" ? "cPulse 2s infinite" : "none" }} />
      {s.label}
    </span>
  );
}

function Field({ label, value, t }) {
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
function CustodyTimeline({ entries, t }) {
  if (!entries || entries.length === 0) {
    return (
      <div style={{ padding: "2.5rem", textAlign: "center", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
        <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>🔗</div>
        No custody entries yet.
      </div>
    );
  }
  return (
    <div style={{ position: "relative", padding: "0.5rem 0" }}>
      <div style={{ position: "absolute", left: "2.2rem", top: 0, bottom: 0, width: 2, background: t.border, zIndex: 0 }} />
      {entries.map((entry, i) => {
        const meta   = ACTION_META[entry.action] || { label: entry.action, icon: "📌", color: t.accent };
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
                <span style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.85rem", fontWeight: 600, color: meta.color }}>{meta.label}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {entry.blockchain_tx && (
                    <a href={entry.blockchain_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "2px 8px", textDecoration: "none" }}>
                      ⛓ Verified
                    </a>
                  )}
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textMuted }}>{formatDate(entry.timestamp)}</span>
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
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Reason: </span>
                  {entry.reason}
                </div>
              )}
              {entry.notes && <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.78rem", color: t.textMuted }}>{entry.notes}</div>}
              {entry.old_value && entry.new_value && entry.action !== "VIEWED" && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, background: `${t.red}0d`, border: `1px solid ${t.red}22`, borderRadius: 8, padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.red }}>
                    <div style={{ fontSize: "0.58rem", color: t.textMuted, marginBottom: 2 }}>BEFORE</div>{entry.old_value}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", color: t.textMuted, fontSize: "0.8rem" }}>→</div>
                  <div style={{ flex: 1, background: `${t.green}0d`, border: `1px solid ${t.green}22`, borderRadius: 8, padding: "5px 10px", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.green }}>
                    <div style={{ fontSize: "0.58rem", color: t.textMuted, marginBottom: 2 }}>AFTER</div>{entry.new_value}
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
function ProgressTab({ caseId, role, t }) {
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
          📋 Investigation Progress — {entries.length} entries
        </div>
        {role === "CASE" && (
          <Btn onClick={() => setShowForm(s => !s)} t={t} accent={t.green} small>
            {showForm ? "✕ Cancel" : "+ Add Progress"}
          </Btn>
        )}
      </div>

      {showForm && (
        <div style={{ background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "1rem" }}>New Progress Entry</div>
          {error && <div style={{ color: t.red, fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>⚠️ {error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Date *</div>
              <input type="date" value={form.date_of_progress} onChange={e => setForm({ ...form, date_of_progress: e.target.value })} style={inp} />
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Reminder Date</div>
              <input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Details *</div>
            <textarea value={form.details_of_progress} onChange={e => setForm({ ...form, details_of_progress: e.target.value })} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Further Action</div>
              <textarea value={form.further_action_to_be_taken} onChange={e => setForm({ ...form, further_action_to_be_taken: e.target.value })} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Remarks</div>
              <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
            </div>
          </div>
          <Btn onClick={handleAdd} t={t} accent={t.green} disabled={saving}>
            {saving ? "Saving…" : "✓ Save Progress Entry"}
          </Btn>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2.5rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>📋</div>
          No progress entries yet.
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
                    Completed
                  </span>
                )}
                {entry.blockchain_tx && (
                  <a href={entry.blockchain_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.green, background: `${t.green}15`, border: `1px solid ${t.green}33`, borderRadius: 20, padding: "1px 8px", textDecoration: "none" }}>
                    ⛓ Verified
                  </a>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {entry.reminder_date && (
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.yellow }}>
                    ⏰ Remind: {entry.reminder_date}
                  </span>
                )}
                {role === "CASE" && !entry.is_completed && (
                  <Btn onClick={() => handleComplete(entry.id)} t={t} accent={t.green} small>Mark Done</Btn>
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
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 3 }}>Further Action</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond }}>{entry.further_action_to_be_taken}</div>
                  </div>
                )}
                {entry.remarks && (
                  <div style={{ background: `${t.purple}08`, border: `1px solid ${t.purple}22`, borderRadius: 8, padding: "6px 10px" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.58rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 3 }}>Remarks</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond }}>{entry.remarks}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted, marginTop: 8 }}>
              Added by {entry.officer} · {formatDate(entry.created_at)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Handover Tab ──────────────────────────────────────────────────
function HandoverTab({ caseId, caseData, t }) {
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
        👮 Case Handover — Reassign to Another Officer
      </div>

      <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1rem 1.2rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${t.accent}22`, border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.85rem", color: t.accent, fontWeight: 700 }}>
          {(caseData.case_holding_officer_username || "?")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textMuted, marginBottom: 2 }}>Current Officer</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", fontWeight: 600, color: t.textPrimary }}>{caseData.case_holding_officer_username}</div>
        </div>
      </div>

      <div style={{ background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "1rem" }}>Reassign To</div>
        {error   && <div style={{ color: t.red,   fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>⚠️ {error}</div>}
        {success && <div style={{ color: t.green, fontSize: "0.75rem", fontFamily: "'JetBrains Mono',monospace", marginBottom: 10 }}>✅ {success}</div>}

        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Select Officer *</div>
          <select value={toOfficerId} onChange={e => setToOfficerId(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
            <option value="">— Select an officer —</option>
            {officers.map(o => (
              <option key={o.id} value={o.id}>{o.username} ({o.branch})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", textTransform: "uppercase", color: t.textMuted, marginBottom: 4 }}>Reason for Handover *</div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Why is this case being reassigned?" style={{ ...inp, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        <Btn onClick={handleHandover} t={t} accent={t.purple} disabled={saving}>
          {saving ? "Processing…" : "👮 Confirm Handover"}
        </Btn>
      </div>

      {handovers.length > 0 && (
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", color: t.textMuted, marginBottom: "0.75rem" }}>
            Handover History ({handovers.length})
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
                    ⛓ Verified
                  </a>
                )}
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.8rem", color: t.textSecond, marginBottom: 4 }}>{h.reason}</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted }}>{formatDate(h.timestamp)}</div>
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
    if (!form.reason.trim()) { setError("A reason is mandatory when updating a case."); return; }
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
    { key: "details",  label: "📋 Case Details" },
    { key: "progress", label: "📊 Progress" },
    { key: "custody",  label: `🔗 Custody (${custody.length})` },
    ...(role === "SUPERVISOR" ? [{ key: "handover", label: "👮 Handover" }] : []),
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
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>🚔 COATS · Case Detail</div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.2 }}>
              {caseData ? caseData.crime_number : "Loading…"}
            </h1>
            {caseData && <div style={{ marginTop: 8 }}><StageBadge code={caseData.current_stage} /></div>}
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
            <Btn onClick={() => navigate("/cases")} t={t} accent={t.accent} outline>← Back</Btn>
          </div>
        </div>

        {/* ── ALERTS ── */}
        {error && (
          <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red }}>⚠️ {error}</div>
        )}
        {saved && (
          <div style={{ background: `${t.green}15`, border: `1px solid ${t.green}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.green }}>✅ Case updated successfully. Redirecting…</div>
        )}
        {!caseData && !error && (
          <div style={{ textAlign: "center", padding: "4rem", color: t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 10, opacity: 0.3 }}>⏳</div>Loading case details…
          </div>
        )}

        {caseData && (
          <div style={{ animation: "cFadeIn .35s ease" }}>

            {/* ── TABS ── */}
            <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: 4, width: "fit-content" }}>
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
                  <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>Case Information</div>
                    <Field label="Branch"               value={caseData.branch}               t={t} />
                    <Field label="PS Limit"             value={caseData.ps_limit}             t={t} />
                    <Field label="Crime No."            value={caseData.crime_number}         t={t} />
                    <Field label="IPC Section"          value={caseData.section_of_law}       t={t} />
                    <Field label="Date of Occurrence"   value={caseData.date_of_occurrence}   t={t} />
                    <Field label="Date of Registration" value={caseData.date_of_registration} t={t} />
                    {role === "SUPERVISOR" && <Field label="Case Handler" value={caseData.case_holding_officer_username} t={t} />}
                  </div>
                  <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>Parties & Gist</div>
                    <Field label="Complainant"     value={caseData.complainant_name} t={t} />
                    <Field label="Accused Details" value={caseData.accused_details}  t={t} />
                    <Field label="Gist of Case"    value={caseData.gist_of_case}     t={t} />
                  </div>
                </div>

                <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Case Status & Action</span>
                    {isClosed && <span style={{ background: `${t.green}18`, color: t.green, border: `1px solid ${t.green}44`, borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem" }}>🔒 Case Closed — Read Only</span>}
                    {role === "SUPERVISOR" && !isClosed && <span style={{ background: `${t.yellow}18`, color: t.yellow, border: `1px solid ${t.yellow}44`, borderRadius: 20, padding: "2px 10px", fontSize: "0.68rem" }}>👁 Supervisor View — Read Only</span>}
                  </div>

                  <div style={{ marginBottom: "1.25rem" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, marginBottom: 6 }}>Current Stage</div>
                    <select value={form.current_stage} onChange={e => setForm({ ...form, current_stage: e.target.value })} disabled={!canEdit}
                      style={{ width: "100%", padding: "0.65rem 1rem", background: canEdit ? t.bgBase : t.bgCardHover, border: `1px solid ${t.border}`, borderRadius: 10, color: canEdit ? t.textPrimary : t.textMuted, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem", cursor: canEdit ? "pointer" : "not-allowed" }}
                      onFocus={e => canEdit && (e.target.style.borderColor = t.accent)}
                      onBlur={e => e.target.style.borderColor = t.border}>
                      {Object.entries(STAGE).map(([code, s]) => (
                        <option key={code} value={code}>{s.label}</option>
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
                        Reason for Update <span style={{ color: t.red }}>*</span>
                      </div>
                      <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Mandatory — explain why you are making this update…" rows={3}
                        style={{ ...inputStyle(true), borderColor: form.reason.trim() ? t.border : `${t.red}66` }}
                        onFocus={e => e.target.style.borderColor = t.accent}
                        onBlur={e => e.target.style.borderColor = form.reason.trim() ? t.border : `${t.red}66`} />
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    {canEdit && <Btn onClick={handleUpdate} t={t} accent={t.green} disabled={saving}>{saving ? "Saving…" : "✓ Update Case"}</Btn>}
                    <Btn onClick={() => navigate("/cases")} t={t} accent={t.accent} outline>← Back to Cases</Btn>
                  </div>
                </div>
              </>
            )}

            {/* ── PROGRESS TAB ── */}
            {activeTab === "progress" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <ProgressTab caseId={id} role={role} t={t} />
              </div>
            )}

            {/* ── CUSTODY TAB ── */}
            {activeTab === "custody" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>🔗 Chain of Custody — {caseData.crime_number}</span>
                  <span style={{ color: t.accent }}>{custody.length} entries</span>
                </div>
                <CustodyTimeline entries={custody} t={t} />
              </div>
            )}

            {/* ── HANDOVER TAB ── */}
            {activeTab === "handover" && role === "SUPERVISOR" && (
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
                <HandoverTab caseId={id} caseData={caseData} t={t} />
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}

export default CaseDetail;
