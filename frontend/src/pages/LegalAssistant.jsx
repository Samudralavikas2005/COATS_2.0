import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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

const SUGGESTIONS = [
  "What documents are needed for HC stage?",
  "What is the difference between bailable and non-bailable offence?",
  "What is the procedure for filing a chargesheet?",
  "What is IPC 302 and its punishment?",
  "When should a case move from UI to PT stage?",
  "What is anticipatory bail under CrPC 438?",
];

function LegalAssistant() {
  const getTheme = () => {
    try { return localStorage.getItem("coats-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); }
    catch { return "dark"; }
  };

  const navigate       = useNavigate();
  const role           = localStorage.getItem("role");
  const username       = localStorage.getItem("username");
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);

  const [theme, setTheme]       = useState(getTheme);
  const [messages, setMessages] = useState([]);
  const [history, setHistory]   = useState([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    setError("");

    const userMsg = { role: "user", content: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/api/ai/legal-assistant/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: msg, messages: history }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setHistory(data.messages);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, ts: new Date() }]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const sendFile = async (file, customMessage) => {
    if (!file || loading) return;
    setError("");
    setLoading(true);

    const userMsg = {
      role: "user",
      content: `📎 Uploaded: **${file.name}**\n${customMessage || "Please summarize this document and suggest next steps."}`,
      ts: new Date(),
      isFile: true,
      fileName: file.name,
    };
    setMessages(prev => [...prev, userMsg]);
    setSelectedFile(null);

    const token   = localStorage.getItem("access");
    const formData = new FormData();
    formData.append("file",    file);
    formData.append("message", customMessage || "Please summarize this document and suggest next steps.");

    try {
      const res = await fetch(`${API_BASE}/api/ai/legal-assistant/file/`, {
        method:  "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body:    formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to analyze file");
      }
      const data = await res.json();
      setHistory(prev => [...prev, ...data.messages]);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, ts: new Date() }]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ["application/pdf", "text/plain"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      setError("Only PDF and TXT files are supported.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (selectedFile) sendFile(selectedFile, input);
      else sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setHistory([]);
    setError("");
    setSelectedFile(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        textarea::placeholder { color: ${t.textMuted}; font-family: 'Sora',sans-serif; }
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", display: "flex", flexDirection: "column", transition: "background .25s, color .2s" }}>

        {/* ── HEADER ── */}
        <div style={{ padding: "1.25rem 2rem", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: t.bgCard }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `${t.purple}22`, border: `1px solid ${t.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>⚖️</div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 2 }}>🚔 COATS · AI Legal Assistant</div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Legal Assistant</h1>
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
            {messages.length > 0 && (
              <button onClick={clearChat} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 14px", background: "transparent", border: `1px solid ${t.border}`, color: t.textSecond }}>
                🗑 Clear
              </button>
            )}
            <button onClick={() => navigate(role === "SUPERVISOR" ? "/dashboard" : "/cases")}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 14px", background: "transparent", border: `1px solid ${t.border}`, color: t.textSecond }}>
              ← Back
            </button>
          </div>
        </div>

        {/* ── CHAT AREA ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem", maxWidth: 860, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Welcome */}
          {messages.length === 0 && (
            <div style={{ textAlign: "center", padding: "2rem 1rem", animation: "cFadeUp .4s ease" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚖️</div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>AI Legal Assistant</h2>
              <p style={{ color: t.textMuted, fontSize: "0.88rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
                Ask legal questions or upload a case document (PDF/TXT)<br />for an instant AI summary and recommended next steps.
              </p>

              {/* Upload zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? t.purple : t.border}`, borderRadius: 16, padding: "1.5rem", marginBottom: "1.5rem", cursor: "pointer", transition: "all .2s", background: dragOver ? `${t.purple}08` : "transparent", maxWidth: 500, margin: "0 auto 1.5rem" }}>
                <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📎</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: t.textMuted }}>
                  Drop a PDF or TXT file here, or click to browse
                </div>
                <input ref={fileInputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => handleFileSelect(e.target.files[0])} />
              </div>

              {/* Suggestions */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", maxWidth: 640, margin: "0 auto" }}>
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.82rem", textAlign: "left", padding: "0.85rem 1rem", background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, color: t.textSecond, cursor: "pointer", transition: "all .2s", lineHeight: 1.4 }}
                    onMouseEnter={e => { e.target.style.borderColor = t.purple; e.target.style.color = t.textPrimary; }}
                    onMouseLeave={e => { e.target.style.borderColor = t.border; e.target.style.color = t.textSecond; }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", gap: "0.85rem", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "cFadeUp .3s ease" }}>
              {msg.role === "assistant" && (
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: `${t.purple}22`, border: `1px solid ${t.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", marginTop: 4 }}>⚖️</div>
              )}
              <div style={{ maxWidth: "72%", background: msg.role === "user" ? `${t.accent}18` : t.bgCard, border: `1px solid ${msg.role === "user" ? t.accent + "44" : t.border}`, borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "0.85rem 1.1rem", boxShadow: t.shadow }}>
                {msg.isFile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, padding: "5px 10px", background: `${t.purple}15`, border: `1px solid ${t.purple}33`, borderRadius: 8 }}>
                    <span>📎</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.purple }}>{msg.fileName}</span>
                  </div>
                )}
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.88rem", lineHeight: 1.75, color: t.textPrimary, whiteSpace: "pre-wrap" }}>
                  {msg.isFile ? msg.content.split("\n").slice(1).join("\n") : msg.content}
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.textMuted, marginTop: 6, textAlign: msg.role === "user" ? "right" : "left" }}>
                  {msg.ts?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              {msg.role === "user" && (
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: `${t.accent}22`, border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.8rem", color: t.accent, fontWeight: 700, marginTop: 4 }}>
                  {(username || "U")[0].toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div style={{ display: "flex", gap: "0.85rem", animation: "cFadeUp .3s ease" }}>
              <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: `${t.purple}22`, border: `1px solid ${t.purple}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>⚖️</div>
              <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: "18px 18px 18px 4px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: 6 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: t.purple, animation: `cBounce 1s ease ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: `${t.red}15`, border: `1px solid ${t.red}44`, borderRadius: 10, padding: "10px 16px", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.75rem", color: t.red }}>
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── INPUT AREA ── */}
        <div style={{ padding: "1rem 2rem 1.5rem", borderTop: `1px solid ${t.border}`, background: t.bgCard }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>

            {/* Selected file preview */}
            {selectedFile && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: `${t.purple}15`, border: `1px solid ${t.purple}33`, borderRadius: 8, marginBottom: 8 }}>
                <span>📎</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.purple, flex: 1 }}>{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: t.textMuted, fontSize: "0.8rem" }}>✕</button>
              </div>
            )}

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              {/* File attach button */}
              <button onClick={() => fileInputRef.current?.click()}
                style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 12, background: selectedFile ? `${t.purple}22` : "transparent", border: `1px solid ${selectedFile ? t.purple : t.border}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", transition: "all .2s" }}>
                📎
              </button>
              <input ref={fileInputRef} type="file" accept=".pdf,.txt" style={{ display: "none" }} onChange={e => handleFileSelect(e.target.files[0])} />

              {/* Text input */}
              <div style={{ flex: 1, background: t.bgBase, border: `1px solid ${t.border}`, borderRadius: 14, padding: "0.75rem 1rem", transition: "border-color .2s" }}
                onFocusCapture={e => e.currentTarget.style.borderColor = t.purple}
                onBlurCapture={e => e.currentTarget.style.borderColor = t.border}>
                <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder={selectedFile ? "Add instructions for the file (optional)… or press Enter to analyze" : "Ask a legal question… (Enter to send)"}
                  rows={1} style={{ width: "100%", background: "transparent", border: "none", color: t.textPrimary, fontFamily: "'Sora',sans-serif", fontSize: "0.9rem", resize: "none", lineHeight: 1.6, maxHeight: 120, overflowY: "auto" }} />
              </div>

              {/* Send button */}
              <button onClick={() => selectedFile ? sendFile(selectedFile, input) : sendMessage()}
                disabled={(!input.trim() && !selectedFile) || loading}
                style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 12, background: (input.trim() || selectedFile) && !loading ? t.purple : `${t.purple}44`, border: "none", cursor: (input.trim() || selectedFile) && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", transition: "background .2s" }}>
                {loading ? "⏳" : "➤"}
              </button>
            </div>

            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.6rem", color: t.textMuted, textAlign: "center", marginTop: "0.5rem" }}>
              Supports PDF and TXT files · AI responses are for reference only
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LegalAssistant;
