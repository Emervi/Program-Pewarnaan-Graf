import { useState, useEffect, useRef, useCallback } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

const COLORS = [
  "#00FFB2", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A78BFA",
  "#F97316", "#38BDF8", "#FB7185", "#34D399", "#FACC15",
];
const COLOR_NAMES = [
  "Mint", "Coral", "Teal", "Canary", "Violet",
  "Amber", "Sky", "Rose", "Emerald", "Gold",
];

// ── Algorithms (unchanged logic) ──────────────────────────────────────────────
function greedyColor(vertices, edges) {
  const colorMap = {};
  for (const v of vertices) {
    const neighborColors = new Set(
      edges
        .filter((e) => e[0] === v || e[1] === v)
        .map((e) => {
          const nb = e[0] === v ? e[1] : e[0];
          return colorMap[nb] !== undefined ? colorMap[nb] : -1;
        })
    );
    let c = 0;
    while (neighborColors.has(c)) c++;
    colorMap[v] = c;
  }
  return colorMap;
}

function backtrackColor(vertices, edges) {
  const adj = {};
  vertices.forEach((v) => (adj[v] = []));
  edges.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });

  let best = null;
  let bestK = vertices.length + 1;

  function bt(idx, colorMap, maxColor) {
    if (maxColor >= bestK) return;
    if (idx === vertices.length) {
      if (maxColor < bestK) {
        bestK = maxColor;
        best = { ...colorMap };
      }
      return;
    }
    const v = vertices[idx];
    const usedByNeighbors = new Set(
      adj[v].filter((nb) => colorMap[nb] !== undefined).map((nb) => colorMap[nb])
    );
    for (let c = 0; c < maxColor + 1 && c < bestK; c++) {
      if (!usedByNeighbors.has(c)) {
        colorMap[v] = c;
        bt(idx + 1, colorMap, Math.max(maxColor, c + 1));
        delete colorMap[v];
      }
    }
  }

  bt(0, {}, 0);
  return best || greedyColor(vertices, edges);
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [vertices, setVertices] = useState([]);
  const [edges, setEdges] = useState([]);
  const [algo, setAlgo] = useState("greedy");
  const [colorMap, setColorMap] = useState(null);
  const [vInput, setVInput] = useState("");
  const [e1, setE1] = useState("");
  const [e2, setE2] = useState("");
  const [running, setRunning] = useState(false);
  const networkRef = useRef(null);
  const networkInstanceRef = useRef(null);

  // ── Graph rendering ──────────────────────────────────────────────────────
  const renderGraph = useCallback((verts, edgs, cmap) => {
    const container = networkRef.current;
    if (!container || typeof vis === "undefined") return;

    container.innerHTML = "";
    if (verts.length === 0) return;

    const nodes = new DataSet(
      verts.map((v) => ({
        id: v,
        label: v,
        color: {
          background: cmap ? COLORS[cmap[v]] : "#1e2433",
          border: cmap ? COLORS[cmap[v]] : "#3a4560",
          highlight: { background: cmap ? COLORS[cmap[v]] : "#2a3248", border: "#00FFB2" },
        },
        font: {
          color: "#ffffff",
          size: 14,
          face: "monospace",
          bold: true,
        },
        size: 26,
        borderWidth: cmap ? 0 : 1.5,
        shadow: cmap ? { enabled: true, color: COLORS[cmap[v]] + "88", size: 12 } : false,
      }))
    );

    const edgeData = new DataSet(
      edgs.map((e, i) => ({
        id: i,
        from: e[0],
        to: e[1],
        color: { color: "#2a3a5c", highlight: "#00FFB2" },
        width: 1.5,
        smooth: { type: "continuous" },
      }))
    );

    const opts = {
      physics: { enabled: true, stabilization: { iterations: 100 } },
      interaction: { hover: true, tooltipDelay: 200 },
      nodes: { shape: "dot" },
      edges: { smooth: { type: "continuous" } },
    };

    networkInstanceRef.current = new Network(container, { nodes, edges: edgeData }, opts);
  }, []);

  useEffect(() => {
    renderGraph(vertices, edges, colorMap);
  }, [vertices, edges, colorMap, renderGraph]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const addVertex = () => {
    const v = vInput.trim();
    if (!v || vertices.includes(v)) { setVInput(""); return; }
    setVertices((prev) => [...prev, v]);
    setVInput("");
    setColorMap(null);
  };

  const removeVertex = (v) => {
    setVertices((prev) => prev.filter((x) => x !== v));
    setEdges((prev) => prev.filter((e) => e[0] !== v && e[1] !== v));
    setColorMap(null);
  };

  const addEdge = () => {
    const a = e1.trim(), b = e2.trim();
    setE1(""); setE2("");
    if (!a || !b || a === b) return;
    const key = [a, b].sort().join("--");
    if (edges.some((e) => [e[0], e[1]].sort().join("--") === key)) return;
    setVertices((prev) => {
      const next = [...prev];
      if (!next.includes(a)) next.push(a);
      if (!next.includes(b)) next.push(b);
      return next;
    });
    setEdges((prev) => [...prev, [a, b]]);
    setColorMap(null);
  };

  const removeEdge = (i) => {
    setEdges((prev) => prev.filter((_, idx) => idx !== i));
    setColorMap(null);
  };

  const runColoring = () => {
    if (vertices.length === 0) return;
    setRunning(true);
    setTimeout(() => {
      const result = algo === "backtrack"
        ? backtrackColor(vertices, edges)
        : greedyColor(vertices, edges);
      setColorMap(result);
      setRunning(false);
    }, 50);
  };

  const loadExample = () => {
    const v = ["A", "B", "C", "D", "E", "F"];
    const e = [["A","B"],["A","C"],["B","C"],["B","D"],["C","E"],["D","E"],["D","F"],["E","F"]];
    setVertices(v);
    setEdges(e);
    setColorMap(null);
    setTimeout(() => {
      const result = algo === "backtrack" ? backtrackColor(v, e) : greedyColor(v, e);
      setColorMap(result);
    }, 80);
  };

  const clearAll = () => {
    setVertices([]);
    setEdges([]);
    setColorMap(null);
    setVInput(""); setE1(""); setE2("");
    if (networkRef.current) networkRef.current.innerHTML = "";
  };

  const numColors = colorMap ? new Set(Object.values(colorMap)).size : 0;
  const usedColorIndices = colorMap ? [...new Set(Object.values(colorMap))].sort() : [];

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #080d1a;
          color: #c8d6f0;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1628; }
        ::-webkit-scrollbar-thumb { background: #2a3a5c; border-radius: 4px; }

        .glow-text { color: #00FFB2; text-shadow: 0 0 20px #00FFB280; }
        .mono { font-family: 'Space Mono', monospace; }

        .grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(0,255,178,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,178,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .inp {
          background: #0f1628;
          border: 1px solid #1e2d4a;
          color: #c8d6f0;
          border-radius: 8px;
          padding: 7px 12px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          outline: none;
          transition: border-color 0.2s;
          width: 100%;
        }
        .inp:focus { border-color: #00FFB260; }
        .inp::placeholder { color: #3a4d6a; }

        .btn-base {
          padding: 7px 14px;
          border-radius: 8px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
          white-space: nowrap;
          letter-spacing: 0.04em;
        }
        .btn-ghost {
          background: transparent;
          border: 1px solid #1e2d4a;
          color: #7a96c4;
        }
        .btn-ghost:hover { border-color: #00FFB260; color: #00FFB2; background: #00FFB208; }
        .btn-accent {
          background: #00FFB2;
          border: none;
          color: #060c18;
          font-weight: 700;
        }
        .btn-accent:hover { background: #00e8a0; box-shadow: 0 0 20px #00FFB240; }
        .btn-accent:disabled { background: #1a3a2a; color: #2a5a3a; cursor: not-allowed; box-shadow: none; }
        .btn-danger {
          background: transparent;
          border: 1px solid #FF6B6B40;
          color: #FF6B6B80;
        }
        .btn-danger:hover { border-color: #FF6B6B; color: #FF6B6B; background: #FF6B6B10; }

        .tag {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 10px;
          border-radius: 100px;
          border: 1px solid #1e2d4a;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: #7a96c4;
          cursor: pointer;
          transition: all 0.15s;
          background: #0f1628;
        }
        .tag:hover { border-color: #FF6B6B80; color: #FF6B6B; background: #FF6B6B08; }
        .tag-del { color: #3a4d6a; font-size: 13px; }
        .tag:hover .tag-del { color: #FF6B6B; }

        .tab-btn {
          padding: 6px 16px;
          border-radius: 100px;
          font-family: 'Syne', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s;
          border: 1px solid #1e2d4a;
          background: transparent;
          color: #4a6080;
          letter-spacing: 0.05em;
        }
        .tab-btn.active {
          background: #00FFB215;
          border-color: #00FFB260;
          color: #00FFB2;
        }
        .tab-btn:not(.active):hover { color: #7a96c4; border-color: #2a3a5c; }

        .card {
          background: #0c1322;
          border: 1px solid #141e34;
          border-radius: 16px;
          padding: 20px;
        }
        .section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #3a5080;
          margin-bottom: 10px;
        }

        .stat-card {
          background: #0f1628;
          border: 1px solid #141e34;
          border-radius: 12px;
          padding: 14px 10px;
          text-align: center;
          flex: 1;
        }
        .stat-val {
          font-family: 'Space Mono', monospace;
          font-size: 26px;
          font-weight: 700;
          color: #00FFB2;
          text-shadow: 0 0 16px #00FFB260;
          line-height: 1;
        }
        .stat-lbl {
          font-size: 10px;
          color: #3a5080;
          margin-top: 4px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .vertex-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 10px;
          border-radius: 8px;
          background: #0f1628;
          border: 1px solid #141e34;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
        }
        .color-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px currentColor;
        }

        .running-pulse {
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* network canvas bg */
        #vis-container canvas {
          border-radius: 12px;
        }
      `}</style>

      <div className="grid-bg" />

      <div style={{ position: "relative", zIndex: 1, padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: "flex", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
            <span className="glow-text">GRAPH</span>{" "}
            <span style={{ color: "#4a6a9a" }}>COLORING</span>
          </h1>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#2a4060", letterSpacing: "0.1em" }}>
            GREEDY · BACKTRACKING
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
          {/* ── Left Panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Vertex */}
            <div className="card">
              <div className="section-label">Vertex</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="inp"
                  value={vInput}
                  onChange={(e) => setVInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVertex()}
                  placeholder="A, B, 1…"
                  maxLength={8}
                  style={{ flex: 1 }}
                />
                <button className="btn-base btn-ghost" onClick={addVertex}>+</button>
              </div>
              {vertices.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                  {vertices.map((v) => (
                    <span key={v} className="tag" onClick={() => removeVertex(v)}>
                      {v} <span className="tag-del">×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Edge */}
            <div className="card">
              <div className="section-label">Edge</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  className="inp"
                  value={e1}
                  onChange={(e) => setE1(e.target.value)}
                  placeholder="Dari"
                  maxLength={8}
                  style={{ width: 72 }}
                />
                <span style={{ color: "#2a4060", alignSelf: "center", fontFamily: "monospace" }}>→</span>
                <input
                  className="inp"
                  value={e2}
                  onChange={(e) => setE2(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addEdge()}
                  placeholder="Ke"
                  maxLength={8}
                  style={{ width: 72 }}
                />
                <button className="btn-base btn-ghost" onClick={addEdge}>+</button>
              </div>
              {edges.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
                  {edges.map((e, i) => (
                    <span key={i} className="tag" onClick={() => removeEdge(i)}>
                      {e[0]}–{e[1]} <span className="tag-del">×</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Algorithm */}
            <div className="card">
              <div className="section-label">Algoritma</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className={`tab-btn ${algo === "greedy" ? "active" : ""}`}
                  onClick={() => setAlgo("greedy")}
                >
                  Greedy
                </button>
                <button
                  className={`tab-btn ${algo === "backtrack" ? "active" : ""}`}
                  onClick={() => setAlgo("backtrack")}
                >
                  Backtrack
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#2a4060", marginTop: 8, lineHeight: 1.5, fontFamily: "'Space Mono', monospace" }}>
                {algo === "greedy"
                  ? "Assign warna terkecil yang tersedia secara berurutan."
                  : "Cari jumlah warna minimum secara exhaustive."}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "auto" }}>
              <button
                className="btn-base btn-accent"
                onClick={runColoring}
                disabled={vertices.length === 0 || running}
                style={{ width: "100%", padding: "10px 14px", fontSize: 13 }}
              >
                {running ? <span className="running-pulse">Processing…</span> : "▶  Jalankan Pewarnaan"}
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-base btn-ghost" onClick={loadExample} style={{ flex: 1, fontSize: 11 }}>
                  Contoh Graf
                </button>
                <button className="btn-base btn-danger" onClick={clearAll} style={{ flex: 1, fontSize: 11 }}>
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Canvas */}
            <div
              style={{
                background: "#080d1a",
                border: "1px solid #141e34",
                borderRadius: 16,
                flex: 1,
                minHeight: 360,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* corner accents */}
              <div style={{ position: "absolute", top: 0, left: 0, width: 40, height: 40, borderTop: "1px solid #00FFB260", borderLeft: "1px solid #00FFB260", borderRadius: "16px 0 0 0", pointerEvents: "none", zIndex: 2 }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 40, borderBottom: "1px solid #00FFB230", borderRight: "1px solid #00FFB230", borderRadius: "0 0 16px 0", pointerEvents: "none", zIndex: 2 }} />

              {vertices.length === 0 && (
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#1e2d4a", pointerEvents: "none" }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="12" cy="24" r="6" stroke="#1e3050" strokeWidth="1.5"/>
                    <circle cx="36" cy="12" r="6" stroke="#1e3050" strokeWidth="1.5"/>
                    <circle cx="36" cy="36" r="6" stroke="#1e3050" strokeWidth="1.5"/>
                    <line x1="18" y1="24" x2="30" y2="14" stroke="#1e3050" strokeWidth="1"/>
                    <line x1="18" y1="24" x2="30" y2="34" stroke="#1e3050" strokeWidth="1"/>
                  </svg>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#1e3050" }}>
                    Tambah vertex & edge
                  </span>
                </div>
              )}

              <div
                id="vis-container"
                ref={networkRef}
                style={{ width: "100%", height: "100%", minHeight: 360 }}
              />
            </div>

            {/* Result */}
            {colorMap && (
              <div className="card" style={{ animation: "fadeIn 0.3s ease" }}>
                <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

                {/* Stats */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  <div className="stat-card">
                    <div className="stat-val">{numColors}</div>
                    <div className="stat-lbl">Chromatic Number</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-val" style={{ color: "#7a96c4", textShadow: "none" }}>{vertices.length}</div>
                    <div className="stat-lbl">Vertex</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-val" style={{ color: "#7a96c4", textShadow: "none" }}>{edges.length}</div>
                    <div className="stat-lbl">Edge</div>
                  </div>
                </div>

                {/* Vertex color list */}
                <div className="section-label">Warna per Vertex</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {vertices.map((v) => (
                    <div key={v} className="vertex-row" style={{ minWidth: 80 }}>
                      <span style={{ color: "#7a96c4" }}>{v}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          className="color-dot"
                          style={{ background: COLORS[colorMap[v]], color: COLORS[colorMap[v]] }}
                        />
                        <span style={{ fontSize: 10, color: "#3a5080" }}>{COLOR_NAMES[colorMap[v]]}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {usedColorIndices.map((c) => (
                    <div key={c} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        className="color-dot"
                        style={{ background: COLORS[c], color: COLORS[c], width: 8, height: 8 }}
                      />
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#4a6a8a" }}>
                        {COLOR_NAMES[c]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
