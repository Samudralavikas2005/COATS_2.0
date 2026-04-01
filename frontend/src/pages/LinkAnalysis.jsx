import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

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

function KpiMini({ label, value, color, t }) {
  return (
    <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 12, padding: "1rem 1.2rem", textAlign: "center", minWidth: 120 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "1.8rem", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.62rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function LinkAnalysis() {
  const getTheme = () => { try { return localStorage.getItem("coats-theme") || "dark"; } catch { return "dark"; } };
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const [theme, setTheme] = useState(getTheme);
  const [data, setData] = useState({ nodes: [], edges: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState({});
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dragNode, setDragNode] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const t = THEMES[theme];
  const isDark = theme === "dark";
  const toggleTheme = () => setTheme(prev => { const n = prev === "dark" ? "light" : "dark"; try { localStorage.setItem("coats-theme", n); } catch {} return n; });

  useEffect(() => {
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/api/intelligence/link-analysis/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setData(d);
        // Initialize positions in a circular layout
        const pos = {};
        const caseNodes = d.nodes.filter(n => n.type === "case");
        const accusedNodes = d.nodes.filter(n => n.type === "accused");
        const cx = 500, cy = 350;

        caseNodes.forEach((n, i) => {
          const angle = (2 * Math.PI * i) / Math.max(caseNodes.length, 1);
          pos[n.id] = { x: cx + Math.cos(angle) * 250, y: cy + Math.sin(angle) * 200 };
        });
        accusedNodes.forEach((n, i) => {
          const angle = (2 * Math.PI * i) / Math.max(accusedNodes.length, 1) + 0.3;
          pos[n.id] = { x: cx + Math.cos(angle) * 120, y: cy + Math.sin(angle) * 100 };
        });
        setPositions(pos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Force-directed simulation
  useEffect(() => {
    if (data.nodes.length === 0) return;
    let running = true;
    let iter = 0;
    const maxIter = 200;

    const simulate = () => {
      if (!running || iter > maxIter) return;
      iter++;

      setPositions(prev => {
        const next = { ...prev };
        const nodes = data.nodes;
        const edges = data.edges;

        // Repulsion between all nodes
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = next[nodes[i].id], b = next[nodes[j].id];
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const force = 3000 / (dist * dist);
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            if (dragNode !== nodes[i].id) { next[nodes[i].id] = { x: a.x - fx, y: a.y - fy }; }
            if (dragNode !== nodes[j].id) { next[nodes[j].id] = { x: b.x + fx, y: b.y + fy }; }
          }
        }

        // Attraction along edges
        for (const edge of edges) {
          const a = next[edge.from], b = next[edge.to];
          if (!a || !b) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const force = (dist - 150) * 0.01;
          const fx = (dx / Math.max(dist, 1)) * force, fy = (dy / Math.max(dist, 1)) * force;
          if (dragNode !== edge.from) next[edge.from] = { x: a.x + fx, y: a.y + fy };
          if (dragNode !== edge.to) next[edge.to] = { x: b.x - fx, y: b.y - fy };
        }

        // Center gravity
        for (const node of nodes) {
          const p = next[node.id];
          if (!p || dragNode === node.id) continue;
          next[node.id] = { x: p.x + (500 - p.x) * 0.003, y: p.y + (350 - p.y) * 0.003 };
        }

        return next;
      });

      animRef.current = requestAnimationFrame(simulate);
    };

    animRef.current = requestAnimationFrame(simulate);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [data, dragNode]);

  // Canvas rendering
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Draw edges
    for (const edge of data.edges) {
      const from = positions[edge.from], to = positions[edge.to];
      if (!from || !to) continue;
      const isHighlighted = hoveredNode && (edge.from === hoveredNode || edge.to === hoveredNode);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = isHighlighted ? (isDark ? "#4f8ef799" : "#2563eb99") : (isDark ? "#222d4266" : "#d2ddf088");
      ctx.lineWidth = isHighlighted ? 2 : 0.8;
      ctx.stroke();
    }

    // Draw nodes
    for (const node of data.nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const isCase = node.type === "case";
      const isHovered = hoveredNode === node.id;
      const radius = isCase ? 22 : (node.case_count > 1 ? 18 : 14);

      // Glow
      if (isHovered || (node.case_count > 1 && !isCase)) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = isCase ? (isDark ? "#4f8ef722" : "#2563eb18") : (isDark ? "#f8717133" : "#dc262622");
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isCase
        ? (isDark ? "#1a2236" : "#ffffff")
        : (node.case_count > 1 ? (isDark ? "#f87171" : "#dc2626") : (isDark ? "#a78bfa" : "#7c3aed"));
      ctx.strokeStyle = isCase ? (isDark ? "#4f8ef7" : "#2563eb") : (isDark ? "#f8717188" : "#dc262688");
      ctx.lineWidth = isHovered ? 3 : 1.5;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.fillStyle = isCase ? (isDark ? "#e2e8f5" : "#111827") : "#ffffff";
      ctx.font = `${isCase ? "bold " : ""}${isCase ? "9" : "8"}px 'JetBrains Mono', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const label = node.label.length > 12 ? node.label.slice(0, 11) + "…" : node.label;
      ctx.fillText(label, pos.x, pos.y);

      // Icon
      if (isCase) {
        ctx.font = "10px sans-serif";
        ctx.fillText("📋", pos.x, pos.y - radius - 8);
      } else if (node.case_count > 1) {
        ctx.font = "bold 8px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#fff";
        ctx.fillText(`×${node.case_count}`, pos.x, pos.y + radius + 10);
      }
    }
  }, [data, positions, hoveredNode, isDark]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse interactions
  const getNodeAt = (mx, my) => {
    for (const node of data.nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const dx = mx - pos.x, dy = my - pos.y;
      if (dx * dx + dy * dy < 600) return node;
    }
    return null;
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    if (dragNode) {
      setPositions(prev => ({ ...prev, [dragNode]: { x: mx - offset.x, y: my - offset.y } }));
      return;
    }
    const node = getNodeAt(mx, my);
    setHoveredNode(node ? node.id : null);
    canvasRef.current.style.cursor = node ? "grab" : "default";
  };

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const node = getNodeAt(mx, my);
    if (node) {
      const pos = positions[node.id];
      setDragNode(node.id);
      setOffset({ x: mx - pos.x, y: my - pos.y });
      canvasRef.current.style.cursor = "grabbing";
    }
  };

  const handleMouseUp = () => { setDragNode(null); };

  const handleDblClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const node = getNodeAt(mx, my);
    if (node && node.type === "case") navigate(`/cases/${node.id}`);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Sora:wght@300;400;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      `}</style>

      <div style={{ fontFamily: "'Sora',sans-serif", background: t.bgBase, color: t.textPrimary, minHeight: "100vh", padding: "2rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.67rem", color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.13em", marginBottom: 6 }}>🚔 COATS · Intelligence Unit</div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 700, letterSpacing: "-0.025em" }}>🕸️ Accused Link Analysis</h1>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", color: t.textMuted, marginTop: 4 }}>
              Drag nodes · Double-click cases to view · Red = multi-case accused
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div onClick={toggleTheme} style={{ background: t.toggleBg, border: `1px solid ${t.border}`, borderRadius: 50, width: 62, height: 30, position: "relative", cursor: "pointer" }}>
              <div style={{ position: "absolute", width: 22, height: 22, borderRadius: "50%", background: t.accent, top: "50%", transform: `translateY(-50%) translateX(${isDark ? 4 : 36}px)`, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .3s" }}>
                {isDark ? "🌙" : "☀️"}
              </div>
            </div>
            <button onClick={() => navigate(role === "SUPERVISOR" ? "/dashboard" : "/cases")}
              style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", borderRadius: 8, padding: "6px 14px", background: "transparent", border: `1px solid ${t.border}`, color: t.textSecond }}>
              ← Back
            </button>
          </div>
        </div>

        {/* Stats */}
        {!loading && data.stats && (
          <div style={{ display: "flex", gap: 12, marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <KpiMini label="Cases" value={data.stats.total_cases || 0} color={t.accent} t={t} />
            <KpiMini label="Accused" value={data.stats.total_accused || 0} color={t.purple} t={t} />
            <KpiMini label="Links" value={data.stats.total_links || 0} color={t.yellow} t={t} />
            <KpiMini label="Multi-Case" value={data.stats.multi_case_accused || 0} color={t.red} t={t} />
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginLeft: "auto", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.65rem", color: t.textMuted }}>
              <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", border: `2px solid ${t.accent}`, marginRight: 4, verticalAlign: "middle" }} /> Case</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: t.purple, marginRight: 4, verticalAlign: "middle" }} /> Accused</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: t.red, marginRight: 4, verticalAlign: "middle" }} /> Multi-Case</span>
            </div>
          </div>
        )}

        {/* Canvas */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: t.textMuted }}>Analyzing accused network…</div>
        ) : (
          <div style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: 16, overflow: "hidden", boxShadow: t.shadow }}>
            <canvas
              ref={canvasRef}
              width={1000}
              height={700}
              style={{ width: "100%", height: "70vh", cursor: "default" }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={handleDblClick}
            />
          </div>
        )}
      </div>
    </>
  );
}
