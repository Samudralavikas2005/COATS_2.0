import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#637fae", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", yellow: "#f5c842",
    shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#434c5c", accent: "#2563eb", green: "#059669",
    red: "#dc2626", yellow: "#d97706",
    shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={{ display: "block", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#f87171", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function CreateCase() {
  const getTheme = () => {
    try {
      return localStorage.getItem("coats-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch { return "dark"; }
  };

  const navigate = useNavigate();
  const branch   = localStorage.getItem("branch");
  const { lang, tr } = useLanguage();

  const [theme, setTheme]         = useState(getTheme);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm]           = useState({
    ps_limit: "", crime_number: "", section_of_law: "",
    date_of_occurrence: "", date_of_registration: "",
    complainant_name: "", accused_details: "",
    gist_of_case: "", action_to_be_taken: "",
  });

  const t      = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const token = localStorage.getItem("access");
    if (!token) { setError(tr("notLoggedIn")); setSubmitting(false); return; }

    try {
      const res = await fetch(`${API_BASE}/api/cases/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, current_stage: "UI" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data === "object"
            ? Object.values(data).flat().join(", ")
            : tr("caseCreateFail")
        );
      }
      navigate("/cases");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "0.68rem 1rem",
    background: t.bgBase, border: `1px solid ${t.border}`,
    borderRadius: 10, color: t.textPrimary,
    fontFamily: "'Sora',sans-serif", fontSize: "0.88rem",
    outline: "none", transition: "border-color .2s",
  };
  const focusIn  = e => e.target.style.borderColor = t.accent;
  const focusOut = e => e.target.style.borderColor = t.border;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cShake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-5px)} 40%,80%{transform:translateX(5px)} }
        input::placeholder, textarea::placeholder { color: ${t.textMuted}; font-family: 'Sora',sans-serif; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: ${isDark ? "invert(1) opacity(0.4)" : "opacity(0.5)"}; cursor: pointer; }
        textarea { resize: vertical; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem", transition: "background .25s, color .2s" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>
              🚔 COATS · {tr("newCase")}
            </div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
              {tr("fileNewCase")}
            </h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: t.textMuted, marginTop: 5 }}>
              {tr("branch")}: <span style={{ color: t.accent }}>{branch}</span>
              {" · "}{tr("stageLocked")} {" "}
              <span style={{ color: t.yellow }}>{tr("underInvestigation")}</span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Theme toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>
                {isDark ? tr("dark") : tr("light")}
              </span>
              <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer", transition: "background .25s" }}>
                <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>
            {/* ✅ Single Back button — only in header */}
            <BackBtn onClick={() => navigate("/cases")} t={t} tr={tr} />
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", marginBottom: "1.5rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.red, animation: "cShake .4s ease" }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── FORM ── */}
        <form onSubmit={handleSubmit} style={{ animation: "cFadeUp .35s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

            {/* LEFT — Case Identifiers */}
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>
                {tr("caseIdentifiers")}
              </div>

              <Field label={tr("psLimit")} required>
                <input name="ps_limit" placeholder="e.g. Coimbatore North" onChange={handleChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </Field>

              <Field label={tr("crimeNo")} required>
                <input name="crime_number" placeholder="e.g. CR/001/2025" onChange={handleChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </Field>

              <Field label={tr("sectionLaw")} required>
                <input name="section_of_law" placeholder="e.g. IPC 302, IPC 376" onChange={handleChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <Field label={tr("dateOccur")} required>
                  <input type="date" name="date_of_occurrence" onChange={handleChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                </Field>
                <Field label={tr("dateReg")} required>
                  <input type="date" name="date_of_registration" onChange={handleChange} required style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
                </Field>
              </div>

              <Field label={tr("currentStage")}>
                <div style={{ ...inputStyle, background: t.bgCardHover, color: t.yellow, border: `1px solid ${t.yellow}33`, display: "flex", alignItems: "center", gap: 8, cursor: "not-allowed" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.yellow, display: "inline-block" }} />
                  {tr("underInvestigation")}
                  <span style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textMuted }}>locked</span>
                </div>
              </Field>
            </div>

            {/* RIGHT — Parties & Details */}
            <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, padding: "1.5rem", boxShadow: t.shadow }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", textTransform: "uppercase", letterSpacing: "0.12em", color: t.textMuted, marginBottom: "1.25rem" }}>
                {tr("partiesDetails")}
              </div>

              <Field label={tr("complainantName")}>
                <input name="complainant_name" placeholder="Full name of complainant" onChange={handleChange} style={inputStyle} onFocus={focusIn} onBlur={focusOut} />
              </Field>

              <Field label={tr("accusedDetails")}>
                <textarea name="accused_details" placeholder="Name, age, address of accused…" onChange={handleChange} rows={3} style={{ ...inputStyle, lineHeight: 1.6 }} onFocus={focusIn} onBlur={focusOut} />
              </Field>

              <Field label={tr("gistOfCase")}>
                <textarea name="gist_of_case" placeholder="Brief summary of the incident…" onChange={handleChange} rows={3} style={{ ...inputStyle, lineHeight: 1.6 }} onFocus={focusIn} onBlur={focusOut} />
              </Field>

              <Field label={tr("actionToBeTaken")}>
                <textarea name="action_to_be_taken" placeholder="Immediate actions planned…" onChange={handleChange} rows={3} style={{ ...inputStyle, lineHeight: 1.6 }} onFocus={focusIn} onBlur={focusOut} />
              </Field>
            </div>
          </div>

          {/* ── SUBMIT ROW — only Submit button, Back is in header ── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <SubmitBtn submitting={submitting} accent={t.green} tr={tr} />
          </div>
        </form>

      </div>
    </>
  );
}

function BackBtn({ onClick, t }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 14px", transition: "all .2s", background: "transparent", border: `1px solid ${t.border}`, color: hov ? t.textPrimary : t.textSecond }}>
      ← {tr("backToCases")}
    </button>
  );
}

function SubmitBtn({ submitting, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <button type="submit" disabled={submitting}
      onMouseEnter={() => !submitting && setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", borderRadius: 8, padding: "10px 28px", transition: "all .2s", opacity: submitting ? 0.6 : 1, background: hov && !submitting ? accent : `${accent}cc`, border: "none", color: "#fff", boxShadow: hov && !submitting ? `0 6px 20px ${accent}44` : "none", transform: hov && !submitting ? "translateY(-1px)" : "translateY(0)" }}>
      {submitting ? tr("filing") : "✓ " + tr("fileCase")}
    </button>
  );
}

export default CreateCase;
