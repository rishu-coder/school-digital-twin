import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

// ── Colour helpers ────────────────────────────────────────────────
const tempColor = (t) => (t > 26 ? "#ef4444" : t > 23 ? "#f59e0b" : "#22c55e");
const co2Color  = (c) => (c > 1200 ? "#ef4444" : c > 900 ? "#f59e0b" : "#22c55e");
const occColor  = (o, cap) => {
  const r = o / cap;
  return r > 0.85 ? "#ef4444" : r > 0.6 ? "#f59e0b" : "#22c55e";
};

// ── Fake-sensor data engine ───────────────────────────────────────
const ROOMS_INIT = [
  { id: "101", name: "Rm 101 – Physics",    cap: 30, x: -3, z: -3 },
  { id: "102", name: "Rm 102 – Chemistry",  cap: 28, x:  3, z: -3 },
  { id: "103", name: "Rm 103 – Biology",    cap: 32, x: -3, z:  3 },
  { id: "104", name: "Rm 104 – Maths",      cap: 30, x:  3, z:  3 },
  { id: "GYM", name: "Gymnasium",           cap: 80, x:  0, z: -7 },
  { id: "LIB", name: "Library",             cap: 60, x:  0, z:  7 },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rand  = (lo, hi) => lo + Math.random() * (hi - lo);

function makeTwin(r) {
  return {
    ...r,
    temp:      rand(20, 25),
    co2:       rand(500, 800),
    occupancy: Math.round(rand(0, r.cap * 0.7)),
    energy:    rand(0.5, 3.5),
    alert:     false,
  };
}

function stepTwin(t) {
  const temp      = clamp(t.temp + rand(-0.3, 0.3), 16, 32);
  const co2       = clamp(t.co2  + rand(-40, 60),  400, 1600);
  const occupancy = clamp(t.occupancy + Math.round(rand(-3, 3)), 0, t.cap);
  const energy    = clamp(t.energy + rand(-0.1, 0.1), 0.1, 6);
  return { ...t, temp, co2, occupancy, energy, alert: temp > 26 || co2 > 1200 };
}

// ── Tiny icon SVGs ────────────────────────────────────────────────
const Icon = ({ d, size = 14, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  temp:  "M12 2a4 4 0 0 0-4 4v8a6 6 0 1 0 8 0V6a4 4 0 0 0-4-4z",
  co2:   "M2 12h20M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1",
  occ:   "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  energy:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
};

// ── 3-D Campus Viewer ─────────────────────────────────────────────
function CampusViewer({ twins, selected, onSelect, overlay }) {
  const mountRef = useRef(null);
  const stateRef = useRef({ twins, selected, overlay });
  const sceneRef = useRef({});

  useEffect(() => { stateRef.current = { twins, selected, overlay }; }, [twins, selected, overlay]);

  useEffect(() => {
    const el = mountRef.current;
    const w  = el.clientWidth, h = el.clientHeight;

    // Scene
    const scene    = new THREE.Scene();
    scene.background = new THREE.Color("#0a0f1e");
    scene.fog = new THREE.FogExp2("#0a0f1e", 0.04);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 300);
    camera.position.set(0, 14, 18);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight("#334155", 0.8));
    const sun = new THREE.DirectionalLight("#c7d2fe", 1.2);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    scene.add(sun);

    // Grid / ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 50),
      new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.add(new THREE.GridHelper(50, 50, "#1e3a5f", "#1e3a5f"));

    // Build room meshes
    const meshMap = {};
    const labelMap = {};
    ROOMS_INIT.forEach((r) => {
      const isLarge = r.id === "GYM" || r.id === "LIB";
      const geo  = new THREE.BoxGeometry(isLarge ? 6 : 3.5, isLarge ? 2 : 2.5, isLarge ? 3 : 3.5);
      const mat  = new THREE.MeshStandardMaterial({ color: "#1e40af", roughness: 0.4, metalness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(r.x, isLarge ? 1 : 1.25, r.z);
      mesh.castShadow = true;
      mesh.userData = { id: r.id };
      scene.add(mesh);
      meshMap[r.id] = mesh;

      // Roof accent stripe
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(isLarge ? 6.1 : 3.6, 0.08, isLarge ? 3.1 : 3.6),
        new THREE.MeshStandardMaterial({ color: "#60a5fa", emissive: "#3b82f6", emissiveIntensity: 0.4 })
      );
      stripe.position.set(r.x, isLarge ? 2.04 : 2.54, r.z);
      scene.add(stripe);
    });

    sceneRef.current = { meshMap, labelMap };

    // Raycaster / click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e) => {
      const rect = el.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
      mouse.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(Object.values(meshMap));
      if (hits.length) onSelect(hits[0].object.userData.id);
    };
    el.addEventListener("click", onClick);

    // Orbit (manual)
    let isDragging = false, lastX = 0, lastY = 0;
    let theta = 0, phi = Math.PI / 4, radius = 22;
    const updateCam = () => {
      camera.position.set(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(phi),
        radius * Math.cos(theta) * Math.cos(phi)
      );
      camera.lookAt(0, 0, 0);
    };
    el.addEventListener("mousedown", (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
    window.addEventListener("mouseup",   () => { isDragging = false; });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      theta -= (e.clientX - lastX) * 0.01;
      phi    = clamp(phi + (e.clientY - lastY) * 0.005, 0.15, 1.35);
      lastX = e.clientX; lastY = e.clientY;
      updateCam();
    });
    el.addEventListener("wheel", (e) => {
      radius = clamp(radius + e.deltaY * 0.02, 8, 40);
      updateCam();
    });

    // Animation loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const { twins: tw, selected: sel, overlay: ov } = stateRef.current;

      Object.entries(meshMap).forEach(([id, mesh]) => {
        const twin = tw[id];
        if (!twin) return;
        let col = "#1e40af";
        if (ov === "temp")     col = tempColor(twin.temp);
        if (ov === "co2")      col = co2Color(twin.co2);
        if (ov === "occupancy")col = occColor(twin.occupancy, twin.cap);
        if (ov === "energy")   col = twin.energy > 3 ? "#ef4444" : twin.energy > 2 ? "#f59e0b" : "#22c55e";
        mesh.material.color.set(col);
        mesh.material.emissive.set(sel === id ? "#6366f1" : twin.alert ? "#7f1d1d" : "#000000");
        mesh.material.emissiveIntensity = sel === id ? 0.5 : twin.alert ? 0.3 : 0;
        const targetY = sel === id ? 1.5 : 1.25;
        mesh.position.y += (targetY - mesh.position.y) * 0.1;
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w2 = el.clientWidth, h2 = el.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mouseup",   () => {});
      window.removeEventListener("mousemove", () => {});
      el.removeEventListener("click", onClick);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [onSelect]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />;
}

// ── Gauge Bar ─────────────────────────────────────────────────────
function GaugeBar({ value, max, color }) {
  return (
    <div style={{ background: "#0f172a", borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, (value / max) * 100)}%`,
        height: "100%", background: color,
        transition: "width 0.6s ease, background 0.4s",
        borderRadius: 4,
      }} />
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────
function MetricCard({ label, value, unit, color, icon, max }) {
  return (
    <div style={{
      background: "#0f172a", borderRadius: 10, padding: "10px 12px",
      border: `1px solid ${color}33`, flex: 1, minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
        <Icon d={icon} size={12} color={color} />
        <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "monospace", lineHeight: 1 }}>
        {typeof value === "number" ? value.toFixed(1) : value}
        <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b", marginLeft: 3 }}>{unit}</span>
      </div>
      {max && <div style={{ marginTop: 6 }}><GaugeBar value={value} max={max} color={color} /></div>}
    </div>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────
function AlertBanner({ twins }) {
  const alerts = Object.values(twins).filter(t => t.alert);
  if (!alerts.length) return null;
  return (
    <div style={{
      background: "#7f1d1d", borderRadius: 8, padding: "8px 12px",
      display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
      animation: "pulse 2s infinite",
    }}>
      <Icon d={icons.alert} size={14} color="#fca5a5" />
      <span style={{ color: "#fca5a5", fontSize: 12, fontWeight: 600 }}>
        ALERT: {alerts.map(a => a.name.split("–")[0].trim()).join(", ")} — threshold exceeded
      </span>
    </div>
  );
}

// ── Sparkline (last N values) ─────────────────────────────────────
function Sparkline({ data, color }) {
  if (data.length < 2) return null;
  const w = 120, h = 30;
  const lo = Math.min(...data), hi = Math.max(...data) || lo + 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - lo) / (hi - lo)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [twins,    setTwins]    = useState(() => Object.fromEntries(ROOMS_INIT.map(r => [r.id, makeTwin(r)])));
  const [selected, setSelected] = useState("101");
  const [overlay,  setOverlay]  = useState("occupancy");
  const [history,  setHistory]  = useState(() => Object.fromEntries(ROOMS_INIT.map(r => [r.id, []])));
  const [tab,      setTab]      = useState("campus"); // campus | detail | sim
  const [simOcc,   setSimOcc]   = useState(50);
  const [tick,     setTick]     = useState(0);

  // Live data tick
  useEffect(() => {
    const id = setInterval(() => {
      setTwins(prev => {
        const next = {};
        Object.entries(prev).forEach(([k, v]) => { next[k] = stepTwin(v); });
        return next;
      });
      setTick(t => t + 1);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  // History
  useEffect(() => {
    setHistory(prev => {
      const next = {};
      Object.entries(twins).forEach(([k, v]) => {
        const arr = [...(prev[k] || []), v.temp].slice(-20);
        next[k] = arr;
      });
      return next;
    });
  }, [tick]);

  const sel = twins[selected] || {};
  const handleSelect = useCallback((id) => { setSelected(id); setTab("detail"); }, []);

  const overlays = ["occupancy", "temp", "co2", "energy"];
  const tabs = ["campus", "detail", "sim"];

  // Simulated comfort score
  const simComfort = Math.max(0, 100 - Math.abs(simOcc - 40) * 0.8 - 12);

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#060d1a",
      fontFamily: "'Courier New', Courier, monospace",
      color: "#e2e8f0", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-thumb { background:#1e3a5f; border-radius:4px }
        button { cursor:pointer; border:none; font-family:inherit }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        padding: "10px 18px", background: "#0a0f1e",
        borderBottom: "1px solid #1e3a5f",
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900,
          }}>DT</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#c7d2fe", letterSpacing: 2 }}>
              DIGITAL TWIN · SCHOOL
            </div>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 3 }}>LIVE CAMPUS MONITOR</div>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 4, marginLeft: 20 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "5px 14px", borderRadius: 5, fontSize: 10,
              fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase",
              background: tab === t ? "#1e40af" : "transparent",
              color: tab === t ? "#bfdbfe" : "#475569",
              border: `1px solid ${tab === t ? "#3b82f6" : "#1e3a5f"}`,
              transition: "all 0.2s",
            }}>{t}</button>
          ))}
        </div>

        {/* overlay selector */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {overlays.map(o => (
            <button key={o} onClick={() => setOverlay(o)} style={{
              padding: "4px 10px", borderRadius: 4, fontSize: 9,
              fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase",
              background: overlay === o ? "#164e63" : "transparent",
              color: overlay === o ? "#67e8f9" : "#334155",
              border: `1px solid ${overlay === o ? "#0891b2" : "#1e3a5f"}`,
              transition: "all 0.2s",
            }}>{o}</button>
          ))}
        </div>

        {/* live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", background: "#22c55e",
            animation: "blink 1.5s infinite",
          }} />
          <span style={{ fontSize: 9, color: "#22c55e", letterSpacing: 2 }}>LIVE</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── Left sidebar: room list ── */}
        <div style={{
          width: 190, background: "#0a0f1e", borderRight: "1px solid #1e3a5f",
          overflowY: "auto", padding: "10px 8px", display: "flex", flexDirection: "column", gap: 4,
        }}>
          <div style={{ fontSize: 9, color: "#334155", letterSpacing: 3, marginBottom: 4, paddingLeft: 4 }}>ROOMS</div>
          {ROOMS_INIT.map(r => {
            const t = twins[r.id] || {};
            const active = selected === r.id;
            return (
              <button key={r.id} onClick={() => handleSelect(r.id)} style={{
                padding: "8px 10px", borderRadius: 7, textAlign: "left",
                background: active ? "#0f1e3d" : "transparent",
                border: `1px solid ${active ? "#3b82f6" : "transparent"}`,
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: active ? "#93c5fd" : "#94a3b8", marginBottom: 3 }}>
                  {r.name.split("–")[0]}
                </div>
                <div style={{ fontSize: 9, color: "#475569" }}>
                  {r.name.includes("–") ? r.name.split("–")[1].trim() : ""}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                  <span style={{ fontSize: 9, color: tempColor(t.temp) }}>{t.temp?.toFixed(1)}°</span>
                  <span style={{ fontSize: 9, color: occColor(t.occupancy, t.cap) }}>{t.occupancy}/{t.cap}</span>
                  {t.alert && <span style={{ fontSize: 9, color: "#ef4444", animation: "blink 1s infinite" }}>⚠</span>}
                </div>
              </button>
            );
          })}

          {/* mini legend */}
          <div style={{ marginTop: 16, padding: "10px 8px", background: "#0f172a", borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: 2, marginBottom: 6 }}>OVERLAY: {overlay.toUpperCase()}</div>
            {[["OK", "#22c55e"], ["WARN", "#f59e0b"], ["CRIT", "#ef4444"]].map(([l, c]) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                <span style={{ fontSize: 9, color: "#475569" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main panel ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* CAMPUS tab */}
          {tab === "campus" && (
            <div style={{ flex: 1, position: "relative" }}>
              <CampusViewer twins={twins} selected={selected} onSelect={handleSelect} overlay={overlay} />
              {/* Floating overlay cards */}
              <div style={{
                position: "absolute", bottom: 16, left: 16, right: 16,
                display: "flex", gap: 8, pointerEvents: "none",
              }}>
                {Object.values(twins).filter(t => t.alert).map(t => (
                  <div key={t.id} style={{
                    background: "rgba(127,29,29,0.9)", borderRadius: 8,
                    padding: "6px 12px", border: "1px solid #ef4444",
                    fontSize: 11, color: "#fca5a5",
                    animation: "pulse 2s infinite",
                  }}>
                    ⚠ {t.name.split("–")[0]}
                  </div>
                ))}
              </div>
              <div style={{
                position: "absolute", top: 12, right: 12,
                fontSize: 9, color: "#334155", letterSpacing: 2,
              }}>DRAG TO ORBIT · SCROLL TO ZOOM · CLICK ROOM</div>
            </div>
          )}

          {/* DETAIL tab */}
          {tab === "detail" && sel.id && (
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <AlertBanner twins={twins} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#c7d2fe", marginBottom: 4 }}>{sel.name}</div>
              <div style={{ fontSize: 10, color: "#334155", marginBottom: 14 }}>
                Capacity {sel.cap} · Room ID {sel.id} · Twin active
              </div>

              {/* Metrics row */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <MetricCard label="Temperature" value={sel.temp}      unit="°C"  color={tempColor(sel.temp)} icon={icons.temp} max={35} />
                <MetricCard label="CO₂"         value={sel.co2}       unit="ppm" color={co2Color(sel.co2)}   icon={icons.co2}  max={1600} />
                <MetricCard label="Occupancy"   value={sel.occupancy} unit={`/${sel.cap}`} color={occColor(sel.occupancy, sel.cap)} icon={icons.occ} max={sel.cap} />
                <MetricCard label="Energy"      value={sel.energy}    unit="kW"  color={sel.energy > 3 ? "#ef4444" : "#22c55e"} icon={icons.energy} max={6} />
              </div>

              {/* Sparkline */}
              <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 14, marginBottom: 14, border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 8 }}>TEMPERATURE TREND (last 20 readings)</div>
                <Sparkline data={history[selected] || []} color={tempColor(sel.temp)} />
              </div>

              {/* Status grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                {[
                  { label: "Air Quality", value: sel.co2 < 800 ? "Good" : sel.co2 < 1200 ? "Moderate" : "Poor", color: co2Color(sel.co2) },
                  { label: "Comfort Index", value: sel.temp > 18 && sel.temp < 26 ? "Comfortable" : "Uncomfortable", color: tempColor(sel.temp) },
                  { label: "Occupancy Status", value: sel.occupancy / sel.cap < 0.85 ? "Available" : "Full", color: occColor(sel.occupancy, sel.cap) },
                  { label: "Twin State", value: "LIVE", color: "#22c55e" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: "#0a0f1e", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e3a5f" }}>
                    <div style={{ fontSize: 9, color: "#334155", letterSpacing: 2, marginBottom: 4 }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Timetable mock */}
              <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 14, border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: 10, color: "#475569", marginBottom: 10 }}>TODAY'S SCHEDULE</div>
                {[
                  { time: "09:00", event: "Period 1 – Class A",  occ: 28, active: false },
                  { time: "10:45", event: "Period 2 – Class B",  occ: 24, active: true  },
                  { time: "12:30", event: "Lunch Break",          occ: 0,  active: false },
                  { time: "13:30", event: "Period 3 – Class C",  occ: 30, active: false },
                ].map(({ time, event, occ, active }) => (
                  <div key={time} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                    borderBottom: "1px solid #0f172a",
                    opacity: active ? 1 : 0.5,
                  }}>
                    <div style={{ width: 2, height: 28, borderRadius: 2, background: active ? "#3b82f6" : "#1e3a5f" }} />
                    <div style={{ fontSize: 10, color: "#475569", minWidth: 40 }}>{time}</div>
                    <div style={{ flex: 1, fontSize: 11, color: active ? "#c7d2fe" : "#64748b" }}>{event}</div>
                    <div style={{ fontSize: 10, color: occ ? "#94a3b8" : "#334155" }}>{occ ? `${occ} pax` : "—"}</div>
                    {active && <div style={{ fontSize: 9, color: "#22c55e", animation: "blink 1.5s infinite" }}>NOW</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIM tab */}
          {tab === "sim" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#c7d2fe", marginBottom: 4 }}>
                Scenario Simulator — What-If
              </div>
              <div style={{ fontSize: 10, color: "#334155", marginBottom: 16 }}>
                Adjust parameters to predict room comfort and energy impact
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {/* Slider: Occupancy */}
                <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 14, border: "1px solid #1e3a5f" }}>
                  <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 8 }}>SIMULATED OCCUPANCY</div>
                  <input type="range" min={0} max={sel.cap || 30} value={simOcc}
                    onChange={e => setSimOcc(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "#3b82f6" }} />
                  <div style={{ fontSize: 20, color: "#3b82f6", fontWeight: 700, marginTop: 6 }}>
                    {simOcc} <span style={{ fontSize: 11, color: "#475569" }}>/ {sel.cap || 30}</span>
                  </div>
                </div>

                {/* Predicted metrics */}
                <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 14, border: "1px solid #1e3a5f" }}>
                  <div style={{ fontSize: 9, color: "#475569", letterSpacing: 2, marginBottom: 8 }}>PREDICTED IMPACT</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "CO₂ rise", value: `+${(simOcc * 12).toFixed(0)} ppm`, color: simOcc > 25 ? "#ef4444" : "#f59e0b" },
                      { label: "Temp rise", value: `+${(simOcc * 0.08).toFixed(1)} °C`, color: simOcc > 20 ? "#f59e0b" : "#22c55e" },
                      { label: "Comfort score", value: `${simComfort.toFixed(0)}%`, color: simComfort > 70 ? "#22c55e" : simComfort > 40 ? "#f59e0b" : "#ef4444" },
                      { label: "Est. energy", value: `${(1.2 + simOcc * 0.04).toFixed(1)} kW`, color: "#94a3b8" },
                    ].map(({ label, value, color }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                        <span style={{ color: "#475569" }}>{label}</span>
                        <span style={{ fontWeight: 700, color }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Campus-wide summary */}
              <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 14, border: "1px solid #1e3a5f", marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginBottom: 10 }}>CAMPUS LIVE SUMMARY</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { label: "Avg Temp", value: (Object.values(twins).reduce((s, t) => s + t.temp, 0) / ROOMS_INIT.length).toFixed(1) + " °C", color: "#f59e0b" },
                    { label: "Total Occ", value: Object.values(twins).reduce((s, t) => s + t.occupancy, 0), color: "#3b82f6" },
                    { label: "Alerts", value: Object.values(twins).filter(t => t.alert).length, color: "#ef4444" },
                    { label: "Avg Energy", value: (Object.values(twins).reduce((s, t) => s + t.energy, 0) / ROOMS_INIT.length).toFixed(1) + " kW", color: "#22c55e" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ flex: 1, background: "#060d1a", borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#334155", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room comparison table */}
              <div style={{ background: "#0a0f1e", borderRadius: 10, padding: 14, border: "1px solid #1e3a5f" }}>
                <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginBottom: 10 }}>ROOM COMPARISON</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ color: "#334155" }}>
                      {["Room", "Temp", "CO₂", "Occ%", "Energy", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "4px 6px", borderBottom: "1px solid #0f172a", letterSpacing: 1 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(twins).map(t => (
                      <tr key={t.id}
                        onClick={() => { setSelected(t.id); setTab("detail"); }}
                        style={{ cursor: "pointer", background: selected === t.id ? "#0f1e3d" : "transparent" }}>
                        <td style={{ padding: "5px 6px", color: "#94a3b8" }}>{t.id}</td>
                        <td style={{ padding: "5px 6px", color: tempColor(t.temp) }}>{t.temp.toFixed(1)}</td>
                        <td style={{ padding: "5px 6px", color: co2Color(t.co2) }}>{t.co2.toFixed(0)}</td>
                        <td style={{ padding: "5px 6px", color: occColor(t.occupancy, t.cap) }}>{((t.occupancy / t.cap) * 100).toFixed(0)}%</td>
                        <td style={{ padding: "5px 6px", color: t.energy > 3 ? "#ef4444" : "#22c55e" }}>{t.energy.toFixed(1)}</td>
                        <td style={{ padding: "5px 6px", color: t.alert ? "#ef4444" : "#22c55e" }}>{t.alert ? "⚠ ALERT" : "OK"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
