import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";

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
    textMuted: "#434c5c",
    accent: "#2563eb", green: "#059669",
    red: "#dc2626", yellow: "#d97706", purple: "#7c3aed",
    shadow: "0 4px 20px rgba(20,40,100,0.10)", toggleBg: "#e2e8f7",
  },
};

const STAGE = {
  UI: { labelKey: "underInvestigation", color: "#f5c842" },
  PT: { labelKey: "pendingTrial", color: "#a78bfa" },
  HC: { labelKey: "pendingHC", color: "#fb923c" },
  SC: { labelKey: "pendingSC", color: "#f87171" },
  CC: { labelKey: "closed", color: "#34d399" },
};

const FIELD_META = {
  current_stage: { labelKey: "stageChanged", icon: "🔄" },
  action_to_be_taken: { labelKey: "actionUpdated", icon: "📝" },
  section_of_law: { labelKey: "sectionLaw", icon: "⚖️" },
  complainant_name: { labelKey: "complainantName", icon: "👤" },
  accused_details: { labelKey: "accusedDetails", icon: "🔎" },
  gist_of_case: { labelKey: "gistOfCase", icon: "📄" },
  ps_limit: { labelKey: "psLimit", icon: "📍" },
};

function StageBadge({ code, tr }) {
  const s = STAGE[code] || { labelKey: code, color: "#8896b3" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 10px", borderRadius: 20,
      fontSize: "0.71rem", fontWeight: 600, fontFamily: "'Sora',sans-serif",
      background: `${s.color}1a`, color: s.color, border: `1px solid ${s.color}44`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: s.color,
        display: "inline-block",
      }} />
      {tr(s.labelKey) || code}
    </span>
  );
}

// ── Blockchain Badge ──────────────────────────────────────────────
function BlockchainBadge({ tx, url, tr }) {
  if (tx) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 8px", borderRadius: 20,
          fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem",
          fontWeight: 600, textDecoration: "none",
          background: "#34d39915", color: "#34d399",
          border: "1px solid #34d39944",
        }}
        title={`TX: ${tx}`}
      >
        ⛓ {tr("verified")}
      </a>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20,
      fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem",
      fontWeight: 600,
      background: "#7b8db015", color: "#7b8db0",
      border: "1px solid #7b8db033",
    }}>
      ⏳ {tr("pending")}
    </span>
  );
}

function HeaderBtn({ children, onClick, t, accent, outline = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem",
        fontWeight: 600, cursor: "pointer", borderRadius: 8,
        padding: "6px 14px", transition: "all .2s",
        background: outline ? "transparent" : hov ? accent : `${accent}18`,
        border: `1px solid ${hov ? accent : outline ? t.border : `${accent}44`}`,
        color: outline ? (hov ? t.red : t.textSecond) : (hov ? "#fff" : accent),
      }}
    >
      {children}
    </button>
  );
}

function LogRow({ log, t, last, navigate, index }) {
  const [expanded, setExpanded] = useState(false);
  const [hov, setHov] = useState(false);
  const meta = FIELD_META[log.field_changed] || { labelKey: log.field_changed, icon: "✏️" };
  const isStage = log.field_changed === "current_stage";
  const timeAgo = getTimeAgo(log.timestamp);
  const { tr }  = useLanguage();

  return (
    <div style={{
      borderBottom: last ? "none" : `1px solid ${t.border}`,
      animation: "cFadeUp .3s ease both",
      animationDelay: `${index * 35}ms`
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "2.5rem 2fr 2fr 1.5fr 1.5fr 1fr 8rem 1.5rem",
          alignItems: "center",
          padding: "0.85rem 1.2rem",
          background: hov ? t.bgCardHover : "transparent",
          cursor: "pointer",
          transition: "background .15s",
          gap: "0.5rem"
        }}
      >
        <div style={{ fontSize: "1rem", textAlign: "center" }}>{meta.icon}</div>
        <div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.82rem", fontWeight: 600, color: t.textPrimary }}>
            {tr(meta.labelKey) || meta.labelKey}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: t.textMuted, marginTop: 2 }}>
            {log.crime_number}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: `${t.accent}22`, border: `1px solid ${t.accent}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.7rem", color: t.accent, fontWeight: 700,
            fontFamily: "'JetBrains Mono',monospace", flexShrink: 0
          }}>
            {(log.updated_by || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.78rem", color: t.textSecond }}>
              {log.updated_by}
            </div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: "0.65rem", color: t.textMuted }}>
              {tr("caseOfficer")}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem" }}>
          {isStage ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <StageBadge code={log.old_value} tr={tr} />
              <span style={{ color: t.textMuted, fontSize: "0.65rem", paddingLeft: 4 }}>↓</span>
              <StageBadge code={log.new_value} tr={tr} />
            </div>
          ) : (
            <div style={{ color: t.textMuted }}>
              <span style={{ color: t.red, textDecoration: "line-through", marginRight: 5 }}>
                {truncate(log.old_value, 18)}
              </span>
              →
              <span style={{ color: t.green, marginLeft: 5 }}>
                {truncate(log.new_value, 18)}
              </span>
            </div>
          )}
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", color: t.textSecond }}>
            {timeAgo}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted, marginTop: 1 }}>
            {formatDate(log.timestamp)}
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.68rem", color: t.textMuted }}>
          {log.branch || "—"}
        </div>
        {/* Blockchain Badge */}
        <div>
          <BlockchainBadge tx={log.blockchain_tx} url={log.blockchain_url} tr={tr} />
        </div>
        <div style={{
          color: t.textMuted, fontSize: "0.75rem",
          transition: "transform .2s",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          textAlign: "right"
        }}>
          ›
        </div>
      </div>

      {expanded && (
        <div style={{
          background: `${t.accent}07`,
          borderTop: `1px solid ${t.border}`,
          padding: "1rem 1.2rem 1rem 4.5rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem"
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: t.textMuted,
              marginBottom: 6
            }}>
              {tr("prevValue")}
            </div>
            <div style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: "0.83rem",
              color: t.red,
              background: `${t.red}0d`,
              border: `1px solid ${t.red}22`,
              borderRadius: 8,
              padding: "8px 12px",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6
            }}>
              {log.old_value || "—"}
            </div>
          </div>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.6rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: t.textMuted,
              marginBottom: 6
            }}>
              {tr("newValue")}
            </div>
            <div style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: "0.83rem",
              color: t.green,
              background: `${t.green}0d`,
              border: `1px solid ${t.green}22`,
              borderRadius: 8,
              padding: "8px 12px",
              whiteSpace: "pre-wrap",
              lineHeight: 1.6
            }}>
              {log.new_value || "—"}
            </div>
          </div>

          <div style={{
            gridColumn: "1 / -1",
            display: "flex",
            gap: "2rem",
            marginTop: 4,
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            {[
              ["Crime No.", log.crime_number],
              ["Updated by", log.updated_by],
              ["Timestamp", formatDate(log.timestamp)],
              ["Branch", log.branch],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "0.6rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                  color: t.textMuted,
                  marginBottom: 2
                }}>
                  {tr(label === "Crime No." ? "crimeNo" : label === "Updated by" ? "recordedBy" : label === "Timestamp" ? "time" : "branch")}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "0.75rem",
                  color: t.textSecond
                }}>
                  {val || "—"}
                </div>
              </div>
            ))}

            {/* Blockchain detail in expanded row */}
            <div>
              <div style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: t.textMuted,
                marginBottom: 2
              }}>
                Blockchain
              </div>
              {log.blockchain_tx ? (
                <div>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "0.68rem",
                    color: "#34d399",
                    marginBottom: 2
                  }}>
                    ⛓ {tr("anchoredOn")}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: "0.62rem",
                    color: t.textMuted,
                    marginBottom: 4
                  }}>
                    {tr("block")}: #{log.blockchain_block || "—"}
                  </div>
                  <a
                    href={log.blockchain_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: "0.62rem",
                      color: "#34d399",
                      textDecoration: "none",
                      background: "#34d39915",
                      border: "1px solid #34d39933",
                      borderRadius: 6,
                      padding: "2px 8px"
                    }}
                  >
                    {tr("viewOnEtherscan")} →
                  </a>
                </div>
              ) : (
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "0.68rem",
                  color: t.textMuted
                }}>
                  ⏳ {tr("anchoringPending")}
                </div>
              )}
            </div>

            <div style={{ marginLeft: "auto" }}>
              <HeaderBtn
                onClick={() => navigate(`/cases/${log.case_id}`)}
                t={t}
                accent="#4f8ef7"
              >
                {tr("viewCase")} →
              </HeaderBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaseLogs() {
  const getTheme = () => {
    try {
      return localStorage.getItem("coats-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch {
      return "dark";
    }
  };

  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");
  const branch = localStorage.getItem("branch");

  const [theme, setTheme] = useState(getTheme);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterField, setFilterField] = useState("ALL");
  const [filterOfficer, setFilterOfficer] = useState("ALL");
  const [lastSync, setLastSync] = useState(null);
  const { lang, tr } = useLanguage();

  const t = THEMES[theme];
  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("coats-theme", next); } catch {}
      return next;
    });
  };

  const fetchLogs = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    fetch(`${API_BASE}/api/case-logs/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.clear();
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) throw new Error("Failed to load logs");
        return res.json();
      })
      .then(data => {
        if (data) {
          setLogs(data);
          setError("");
          setLastSync(new Date());
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [navigate]);

  useEffect(() => {
    fetchLogs();
    const id = setInterval(fetchLogs, 10000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const officers = [...new Set(logs.map(l => l.updated_by).filter(Boolean))];

  const filtered = logs.filter(l => {
    const matchField = filterField === "ALL" || l.field_changed === filterField;
    const matchOfficer = filterOfficer === "ALL" || l.updated_by === filterOfficer;
    const q = search.toLowerCase();
    const matchSearch = !q
      || l.crime_number?.toLowerCase().includes(q)
      || l.updated_by?.toLowerCase().includes(q)
      || l.new_value?.toLowerCase().includes(q)
      || l.old_value?.toLowerCase().includes(q);
    return matchField && matchOfficer && matchSearch;
  });

  const todayLogs = logs.filter(l => isToday(l.timestamp)).length;
  const stageLogs = logs.filter(l => l.field_changed === "current_stage").length;
  const actionLogs = logs.filter(l => l.field_changed === "action_to_be_taken").length;
  const verifiedLogs = logs.filter(l => l.blockchain_tx).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes cFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        input::placeholder { color: ${t.textMuted}; }
        select option { background: ${t.bgCard}; color: ${t.textPrimary}; }
      `}</style>

      <div style={{
        fontFamily: "'Sora',sans-serif",
        background: t.bgBase,
        color: t.textPrimary,
        minHeight: "100vh",
        padding: "2rem",
        transition: "background .25s, color .2s"
      }}>
        {/* HEADER */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "2rem"
        }}>
          <div>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.67rem",
              color: t.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.13em",
              marginBottom: 6
            }}>
              🚔 COATS · {tr("activityLogs")}
            </div>
            <h1 style={{
              fontSize: "1.65rem",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.2
            }}>
              {tr("caseLogsHeader") || "Case Update Logs"}
            </h1>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.68rem",
              color: t.textMuted,
              marginTop: 5
            }}>
              <span style={{ color: t.accent }}>{username}</span>
              {" · "}{role === "SUPERVISOR" ? tr("supervisor") : tr("caseOfficer")}
              {" · "}{branch}
              {lastSync && <span style={{ marginLeft: 8 }}>· {tr("synced")} {lastSync.toLocaleTimeString(lang === 'en' ? "en-IN" : (lang === 'hi' ? "hi-IN" : "ta-IN"))}</span>}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 2 }}>
              <span style={{ fontFamily: "'JetBrains Mono’,monospace", fontSize: "0.7rem", color: t.textSecond }}>
                {isDark ? tr("dark") : tr("light")}
              </span>
              <div
                onClick={toggleTheme}
                style={{
                  background: t.toggleBg,
                  border: `1px solid ${t.border}`,
                  borderRadius: 50,
                  width: 62,
                  height: 30,
                  position: "relative",
                  cursor: "pointer",
                  transition: "background .25s"
                }}
              >
                <div style={{
                  position: "absolute",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: t.accent,
                  top: "50%",
                  transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  transition: "transform .3s cubic-bezier(.34,1.56,.64,1)"
                }}>
                  {isDark ? "🌙" : "☀️"}
                </div>
              </div>
            </div>

            {role === "SUPERVISOR" && (
              <HeaderBtn onClick={() => navigate("/dashboard")} t={t} accent={t.purple}>
                📊 {tr("dashboard")}
              </HeaderBtn>
            )}

            <HeaderBtn onClick={() => navigate("/cases")} t={t} accent={t.accent}>
              📋 {tr("cases")}
            </HeaderBtn>

            <HeaderBtn
              onClick={() => { localStorage.clear(); navigate("/login", { replace: true }); }}
              t={t}
              accent={t.red}
              outline
            >
              {tr("logout")}
            </HeaderBtn>
          </div>
        </div>

        {/* STATS STRIP */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "0.75rem",
          marginBottom: "1.5rem"
        }}>
          {[
            { label: tr("logEntries"), value: logs.length, color: t.accent, icon: "📋" },
            { label: tr("updatesToday"), value: todayLogs, color: t.green, icon: "📅" },
            { label: tr("stageChanges"), value: stageLogs, color: t.yellow, icon: "🔄" },
            { label: tr("actionUpdates"), value: actionLogs, color: t.purple, icon: "📝" },
            { label: tr("blockchainVerified"), value: verifiedLogs, color: "#34d399", icon: "⛓" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: "0.9rem 1.1rem",
              boxShadow: t.shadow,
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                position: "absolute",
                top: 0, left: 0, right: 0,
                height: 3,
                background: color,
                borderRadius: "12px 12px 0 0"
              }} />
              <div style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.62rem",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: t.textMuted,
                marginBottom: 4
              }}>
                {label}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color
                }}>
                  {value}
                </div>
                <div style={{ fontSize: "1.2rem", opacity: 0.3 }}>
                  {icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.85rem",
              opacity: 0.4
            }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tr("searchLogs")}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem 0.6rem 2.1rem",
                background: t.bgCard,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                color: t.textPrimary,
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.8rem",
                outline: "none",
                transition: "border-color .2s"
              }}
              onFocus={e => e.target.style.borderColor = t.accent}
              onBlur={e => e.target.style.borderColor = t.border}
            />
          </div>

          <select
            value={filterField}
            onChange={e => setFilterField(e.target.value)}
            style={{
              padding: "0.6rem 1rem",
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              color: t.textSecond,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.78rem",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="ALL">{tr("allChangeTypes")}</option>
            {Object.entries(FIELD_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {tr(v.labelKey)}</option>
            ))}
          </select>

          <select
            value={filterOfficer}
            onChange={e => setFilterOfficer(e.target.value)}
            style={{
              padding: "0.6rem 1rem",
              background: t.bgCard,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              color: t.textSecond,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.78rem",
              outline: "none",
              cursor: "pointer"
            }}
          >
            <option value="ALL">{tr("allOfficers")}</option>
            {officers.map(o => <option key={o} value={o}>{o}</option>)}
          </select>

          <div style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "0.72rem",
            color: t.textMuted,
            whiteSpace: "nowrap"
          }}>
            {filtered.length} {tr("of")} {logs.length} {tr("entries")}
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{
            background: `${t.red}15`,
            border: `1px solid ${t.red}44`,
            borderRadius: 10,
            padding: "10px 16px",
            marginBottom: "1rem",
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: "0.78rem",
            color: t.red
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* LOG TABLE */}
        <div style={{
          background: t.bgCard,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          boxShadow: t.shadow,
          overflow: "hidden"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "2.5rem 2fr 2fr 1.5fr 1.5fr 1fr 8rem 1.5rem",
            padding: "0.6rem 1.2rem",
            borderBottom: `1px solid ${t.border}`,
            gap: "0.5rem"
          }}>
            {["", "Change", "Officer", "Before → After", "When", "Branch", "Blockchain", ""].map((h, i) => (
              <div key={i} style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: "0.63rem",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: t.textMuted
              }}>
                {h}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{
              padding: "3rem",
              textAlign: "center",
              color: t.textMuted,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.8rem"
            }}>
              <div style={{ fontSize: "1.5rem", marginBottom: 10, opacity: 0.3 }}>⏳</div>
              {tr("loadingLogs")}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: "3rem",
              textAlign: "center",
              color: t.textMuted,
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: "0.8rem"
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 10, opacity: 0.3 }}>📭</div>
              {logs.length === 0 ? "No case updates recorded yet." : "No logs match your filters."}
            </div>
          ) : (
            filtered.map((log, i) => (
              <LogRow
                key={log.id}
                log={log}
                t={t}
                last={i === filtered.length - 1}
                navigate={navigate}
                index={i}
              />
            ))
          )}
        </div>

        <div style={{
          marginTop: "1.25rem",
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: "0.65rem",
          color: t.textMuted,
          textAlign: "center"
        }}>
          Logs auto-refresh every 10 seconds · Click any row to expand full details · ⛓ = anchored on Sepolia blockchain
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function truncate(str, n) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function isToday(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  const n = new Date();
  return d.getDate() === n.getDate() &&
         d.getMonth() === n.getMonth() &&
         d.getFullYear() === n.getFullYear();
}

function getTimeAgo(ts) {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default CaseLogs;
