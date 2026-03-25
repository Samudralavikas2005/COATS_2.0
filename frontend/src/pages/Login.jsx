import { useState } from "react";
import { useNavigate } from "react-router-dom";

const THEMES = {
  dark: {
    bgBase: "#0b0e17", bgCard: "#141927", bgCardHover: "#1a2236",
    border: "#222d42", textPrimary: "#e2e8f5", textSecond: "#7b8db0",
    textMuted: "#637fae", accent: "#4f8ef7", green: "#34d399",
    red: "#f87171", shadow: "0 4px 24px rgba(0,0,0,0.4)", toggleBg: "#1a2236",
  },
  light: {
    bgBase: "#eef2fb", bgCard: "#ffffff", bgCardHover: "#f5f8ff",
    border: "#d2ddf0", textPrimary: "#111827", textSecond: "#4b5e80",
    textMuted: "#434c5c", accent: "#2563eb", green: "#059669",
    red: "#dc2626", shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

function Login() {
  const getTheme = () => {
    try {
      return localStorage.getItem("coats-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch { return "dark"; }
  };

  const [theme, setTheme]       = useState(getTheme);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [setupMfaRequired, setSetupMfaRequired] = useState(false);
  const [questions, setQuestions]     = useState([]);
  const [q1, setQ1]                   = useState("");
  const [q2, setQ2]                   = useState("");
  const [answer1, setAnswer1]         = useState("");
  const [answer2, setAnswer2]         = useState("");
  const navigate = useNavigate();

  const t      = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (setupMfaRequired) {
      try {
        const payload = { username, password, question_1: q1, answer_1: answer1, question_2: q2, answer_2: answer2 };
        const res = await fetch("http://localhost:8000/api/setup-mfa/", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "MFA Setup failed");
        
        setSetupMfaRequired(false);
        setQ1(""); setQ2(""); setAnswer1(""); setAnswer2("");
        setPassword("");
        window.alert("Security questions saved securely! Please login again.");
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
      return;
    }

    try {
      const payloadBody = { username, password };
      if (mfaRequired) {
        payloadBody.mfa_answer_1 = answer1;
        payloadBody.mfa_answer_2 = answer2;
      }
      const res = await fetch("http://localhost:8000/api/token/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid credentials");

      if (data.setup_mfa_required) {
        setSetupMfaRequired(true);
        setLoading(false);
        return;
      }

      if (data.mfa_required) {
        setMfaRequired(true);
        setQuestions(data.questions);
        setLoading(false);
        return;
      }

      localStorage.clear();
      localStorage.setItem("access",  data.access);
      localStorage.setItem("refresh", data.refresh);

      const payload = JSON.parse(atob(data.access.split(".")[1]));

      // Always store role as UPPERCASE for consistent comparison everywhere
      const role = (payload.role || "").toUpperCase();

      localStorage.setItem("role",     role);
      localStorage.setItem("branch",   payload.branch);
      localStorage.setItem("username", payload.username);
      localStorage.setItem("coats-theme", theme);

      if (role === "SUPERVISOR") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/cases", { replace: true });
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cShake  { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }
        input::placeholder { color: ${t.textMuted}; font-family: 'Sora',sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
      `}</style>

      <div style={{
        fontFamily: "'Sora',sans-serif",
        background: t.bgBase, color: t.textPrimary,
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "2rem", transition: "background .25s, color .2s",
        position: "relative",
      }}>

        {/* ── THEME TOGGLE ── */}
        <div style={{ position: "absolute", top: 24, right: 24, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textSecond }}>
            {isDark ? "Dark" : "Light"}
          </span>
          <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer", transition: "background .25s" }}>
            <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
              {isDark ? "🌙" : "☀️"}
            </div>
          </div>
        </div>

        {/* ── LOGIN CARD ── */}
        <div style={{
          background: t.bgCard, border: `1px solid ${t.border}`,
          borderRadius: 20, padding: "2.5rem 2.25rem",
          width: "100%", maxWidth: 400,
          boxShadow: t.shadow,
          animation: "cFadeUp .4s ease",
        }}>
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: 10 }}>🪖</div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
              COATS
            </h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.14em", color: t.textMuted }}>
              Cases of Anti-Terrorism Squad
            </div>
          </div>

          <div style={{ height: 1, background: t.border, marginBottom: "1.75rem" }} />

          <form onSubmit={handleLogin}>
            {!mfaRequired && !setupMfaRequired && (
              <>
                {/* Username */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6 }}>
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                    autoComplete="username"
                    style={{ width: "100%", padding: "0.7rem 1rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }}
                    onFocus={e => e.target.style.borderColor = t.accent}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      style={{ width: "100%", padding: "0.7rem 2.8rem 0.7rem 1rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }}
                      onFocus={e => e.target.style.borderColor = t.accent}
                      onBlur={e => e.target.style.borderColor = t.border}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: t.textMuted, padding: 4 }}
                    >
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {setupMfaRequired && (
              <>
                <div style={{ marginBottom: "1rem", color: t.accent, fontSize: "0.8rem", textAlign: "center", lineHeight: 1.5, background: `${t.accent}15`, padding: "10px", borderRadius: "8px" }}>
                  First time login detected. Please define 2 personal security questions. Your answers will be securely hashed.
                </div>
                {/* Q1 Input */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6, lineHeight: 1.4 }}>
                    Custom Question 1
                  </label>
                  <input value={q1} onChange={e => setQ1(e.target.value)} required placeholder="e.g. Favorite color?" style={{ width: "100%", padding: "0.7rem 1rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }} onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border} />
                  <input value={answer1} onChange={e => setAnswer1(e.target.value)} required placeholder="Answer" style={{ width: "100%", padding: "0.7rem 1rem", marginTop: "8px", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }} onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border} />
                </div>
                {/* Q2 Input */}
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6, lineHeight: 1.4 }}>
                    Custom Question 2
                  </label>
                  <input value={q2} onChange={e => setQ2(e.target.value)} required placeholder="e.g. First pet's name?" style={{ width: "100%", padding: "0.7rem 1rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }} onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border} />
                  <input value={answer2} onChange={e => setAnswer2(e.target.value)} required placeholder="Answer" style={{ width: "100%", padding: "0.7rem 1rem", marginTop: "8px", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }} onFocus={e => e.target.style.borderColor = t.accent} onBlur={e => e.target.style.borderColor = t.border} />
                </div>
              </>
            )}

            {mfaRequired && !setupMfaRequired && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6, lineHeight: 1.4 }}>
                    Q1: {questions[0]}
                  </label>
                  <input
                    value={answer1}
                    onChange={e => setAnswer1(e.target.value)}
                    placeholder="Provide your answer"
                    required
                    style={{ width: "100%", padding: "0.7rem 1rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }}
                    onFocus={e => e.target.style.borderColor = t.accent}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                </div>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.1em", color: t.textMuted, display: "block", marginBottom: 6, lineHeight: 1.4 }}>
                    Q2: {questions[1]}
                  </label>
                  <input
                    value={answer2}
                    onChange={e => setAnswer2(e.target.value)}
                    placeholder="Provide your answer"
                    required
                    style={{ width: "100%", padding: "0.7rem 1rem", background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 10, color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", outline: "none", transition: "border-color .2s" }}
                    onFocus={e => e.target.style.borderColor = t.accent}
                    onBlur={e => e.target.style.borderColor = t.border}
                  />
                </div>
              </>
            )}

            {error && (
              <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 8, padding: "8px 12px", marginBottom: "1rem", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: t.red, animation: "cShake .4s ease" }}>
                ⚠️ {error}
              </div>
            )}

            <LoginButton loading={loading} accent={t.accent} />
            
            {(mfaRequired || setupMfaRequired) && (
              <button
                type="button"
                onClick={() => {
                  setMfaRequired(false);
                  setSetupMfaRequired(false);
                  setAnswer1("");
                  setAnswer2("");
                  setQ1("");
                  setQ2("");
                  setError("");
                }}
                style={{
                  marginTop: "0.75rem", width: "100%", padding: "0.8rem",
                  background: "transparent", border: `1px solid ${t.border}`,
                  borderRadius: 10, color: t.textPrimary,
                  fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem",
                  cursor: "pointer", transition: "background .2s"
                }}
                onMouseEnter={e => e.target.style.background = t.bgCardHover}
                onMouseLeave={e => e.target.style.background = "transparent"}
              >
                ← Back
              </button>
            )}
          </form>

          <div style={{ marginTop: "1.5rem", textAlign: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.63rem", color: t.textMuted }}>
            Authorized personnel only · COATS v2.0
          </div>
        </div>
      </div>
    </>
  );
}

function LoginButton({ loading, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="submit"
      disabled={loading}
      onMouseEnter={() => !loading && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", padding: "0.8rem",
        background: loading ? `${accent}88` : hov ? accent : `${accent}cc`,
        border: "none", borderRadius: 10, color: "#fff",
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem",
        fontWeight: 700, letterSpacing: "0.06em",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background .2s, transform .15s",
        transform: hov && !loading ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hov && !loading ? `0 6px 20px ${accent}44` : "none",
      }}
    >
      {loading ? "Authenticating…" : "Login →"}
    </button>
  );
}

export default Login;
