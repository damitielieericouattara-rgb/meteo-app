import { useState, useEffect, useRef, useCallback } from "react";

const API_KEY = "1927a80134321659990135937a87a1a9";
const URL_METEO      = (v) => `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(v)}&appid=${API_KEY}&units=metric&lang=fr`;
const URL_PREVISIONS = (v) => `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(v)}&appid=${API_KEY}&units=metric&lang=fr`;

const WEATHER_CONFIGS = {
  Clear:        { gradient: ["#FF6B35","#c45e00","#0a0a1a"], particle: "#FFD700" },
  Clouds:       { gradient: ["#485563","#29323c","#0d0d0d"], particle: "#C0C0C0" },
  Rain:         { gradient: ["#1CB5E0","#000851","#05050f"], particle: "#4FC3F7" },
  Drizzle:      { gradient: ["#4facfe","#0070cc","#05050f"], particle: "#87CEEB" },
  Thunderstorm: { gradient: ["#7B2FBE","#1a1a2e","#000000"], particle: "#B388FF" },
  Snow:         { gradient: ["#8fa8c8","#5a7a9a","#1a1a2e"], particle: "#FFFFFF" },
  Mist:         { gradient: ["#6a8093","#2c3e50","#0d0d0d"], particle: "#B0BEC5" },
  Fog:          { gradient: ["#5f7f8e","#2c3e50","#0d0d0d"], particle: "#90A4AE" },
  default:      { gradient: ["#0f0c29","#302b63","#24243e"], particle: "#818cf8" },
};

const getConfig = (main) => WEATHER_CONFIGS[main] || WEATHER_CONFIGS.default;
const JOURS     = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const msToKmh   = (v) => Math.round(v * 3.6);
const dirVent   = (deg) => ["N","NE","E","SE","S","SO","O","NO"][Math.round(deg / 45) % 8];

// ── Globe Canvas 2D ──────────────────────────────────────────
function Globe3D({ config, temperature }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({ rotation: 0, particles: [], mouse: { x: 0, y: 0 }, ripples: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    stateRef.current.particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 2 + 0.4,
      opacity: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    const onMouse = (e) => {
      const r = canvas.getBoundingClientRect();
      stateRef.current.mouse = {
        x: (e.clientX - r.left) / r.width  * 2 - 1,
        y: (e.clientY - r.top)  / r.height * 2 - 1,
      };
    };
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      stateRef.current.ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, radius: 0, opacity: 0.6 });
    };
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("click", onClick);

    const draw = () => {
      const s = stateRef.current;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // Fond
      const grd = ctx.createRadialGradient(w * 0.5 + s.mouse.x * 25, h * 0.4 + s.mouse.y * 15, 0, w * 0.5, h * 0.5, w * 0.9);
      grd.addColorStop(0,   config.gradient[0] + "DD");
      grd.addColorStop(0.5, config.gradient[1] + "99");
      grd.addColorStop(1,   config.gradient[2] + "FF");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // Globe
      const cx = w * 0.5 + s.mouse.x * 12;
      const cy = h * 0.42 + s.mouse.y * 8;
      const R  = Math.min(w, h) * 0.30;

      // Halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 1.7);
      halo.addColorStop(0,   config.particle + "18");
      halo.addColorStop(0.5, config.particle + "06");
      halo.addColorStop(1,   "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.7, 0, Math.PI * 2); ctx.fill();

      // Corps
      const globe = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      globe.addColorStop(0,   config.gradient[0] + "FF");
      globe.addColorStop(0.5, config.gradient[1] + "EE");
      globe.addColorStop(1,   config.gradient[2] + "BB");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = globe; ctx.fill();

      // Grille
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = config.particle + "22"; ctx.lineWidth = 0.7;
      const off = (s.rotation * 0.28) % (Math.PI / 3);
      for (let i = 0; i < 7; i++) {
        const angle = off + (i / 6) * Math.PI;
        const x1 = cx + Math.cos(angle) * R;
        const bend = Math.sin(angle) * R * 0.12;
        ctx.beginPath();
        ctx.moveTo(x1, cy - R);
        ctx.bezierCurveTo(x1 + bend, cy - R / 2, x1 + bend, cy + R / 2, x1, cy + R);
        ctx.stroke();
      }
      for (let i = 1; i < 5; i++) {
        const y = cy - R + (i / 5) * R * 2;
        const rLat = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
        ctx.beginPath(); ctx.ellipse(cx, y, rLat, rLat * 0.14, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();

      // Reflet
      const shimmer = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.38, 0, cx - R * 0.2, cy - R * 0.2, R * 0.65);
      shimmer.addColorStop(0, "rgba(255,255,255,0.20)");
      shimmer.addColorStop(0.5, "rgba(255,255,255,0.03)");
      shimmer.addColorStop(1, "transparent");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = shimmer; ctx.fill();

      // Anneau orbital
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.rotation * 0.13 + s.mouse.x * 0.25);
      ctx.scale(1, 0.22);
      ctx.beginPath(); ctx.arc(0, 0, R * 1.38, 0, Math.PI * 2);
      ctx.strokeStyle = config.particle + "28"; ctx.lineWidth = 2.5; ctx.stroke();
      const ox = Math.cos(s.rotation * 0.45) * R * 1.38;
      const oy = Math.sin(s.rotation * 0.45) * R * 1.38;
      ctx.beginPath(); ctx.arc(ox, oy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = config.particle; ctx.fill();
      ctx.restore();

      // Température
      ctx.save();
      ctx.font = `bold ${Math.round(R * 0.52)}px 'Courier New', monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.shadowColor = config.particle; ctx.shadowBlur = 24;
      ctx.fillText(temperature !== null ? `${Math.round(temperature)}°` : "—", cx, cy);
      ctx.restore();

      // Particules
      s.particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.pulse += 0.018;
        const pulse = Math.sin(p.pulse) * 0.28 + 0.72;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        const dx = cx - p.x, dy = cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > R * 1.4 && dist < R * 3.5) { p.vx += dx / dist * 0.002; p.vy += dy / dist * 0.002; }
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 0.7) { p.vx *= 0.97; p.vy *= 0.97; }
        const alpha = Math.round(p.opacity * pulse * 255).toString(16).padStart(2, "0");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = config.particle + alpha; ctx.fill();
      });

      // Ripples
      s.ripples = s.ripples.filter((r) => {
        r.radius += 2.5; r.opacity -= 0.012;
        if (r.opacity <= 0) return false;
        const a = Math.round(r.opacity * 255).toString(16).padStart(2, "0");
        ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = config.particle + a; ctx.lineWidth = 1.5; ctx.stroke();
        return true;
      });

      s.rotation += 0.007;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("click", onClick);
    };
  }, [config, temperature]);

  return <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", cursor:"crosshair", display:"block" }} />;
}

// ── Particules de fond ────────────────────────────────────────
function BgParticles({ config }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const set = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    set();
    const pts = Array.from({ length: 35 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.2 + 0.2,
      vy: -Math.random() * 0.4 - 0.08,
      opacity: Math.random() * 0.25 + 0.05,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach((p) => {
        p.y += p.vy;
        if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
        const a = Math.round(p.opacity * 255).toString(16).padStart(2, "0");
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = config.particle + a; ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize", set);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", set); };
  }, [config]);

  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }} />;
}

// ── Composant principal ───────────────────────────────────────
export default function WeatherApp() {
  const [ville, setVille]       = useState("Abidjan");
  const [input, setInput]       = useState("");
  const [meteo, setMeteo]       = useState(null);
  const [previsions, setPrev]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [erreur, setErreur]     = useState("");
  const [heure, setHeure]       = useState(new Date());
  const [onglet, setOnglet]     = useState("live");
  const [visible, setVisible]   = useState(false);

  const config = meteo ? getConfig(meteo.weather[0].main) : WEATHER_CONFIGS.default;

  useEffect(() => {
    const t = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { fetchMeteo(ville); }, [ville]);

  const fetchMeteo = useCallback(async (nom) => {
    setLoading(true); setErreur(""); setMeteo(null); setPrev([]); setVisible(false);
    try {
      const [r1, r2] = await Promise.all([fetch(URL_METEO(nom)), fetch(URL_PREVISIONS(nom))]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (d1.cod !== 200) throw new Error(d1.cod === 401 ? "Clé API invalide" : `Ville introuvable : "${nom}"`);
      setMeteo(d1);
      const vus = new Set();
      const filtrées = (d2.list || []).filter((item) => {
        const date = item.dt_txt.slice(0, 10);
        const h    = item.dt_txt.slice(11, 13);
        if (!vus.has(date) && ["11","12","13"].includes(h)) { vus.add(date); return true; }
        return false;
      }).slice(0, 5);
      setPrev(filtrées);
      setTimeout(() => setVisible(true), 200);
    } catch (e) {
      setErreur(e.message); setVisible(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const rechercher = (e) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput(""); setVille(v);
  };

  const villes = ["Abidjan","Paris","Dubai","Tokyo","New York","Lagos","London","Sydney"];

  const bgStyle = {
    background: `linear-gradient(135deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 50%, ${config.gradient[2]} 100%)`,
    transition: "background 1.5s ease",
  };

  const P = config.particle;

  return (
    <div style={{ ...bgStyle, position:"relative", minHeight:"100vh", width:"100%", overflow:"hidden", fontFamily:"'Space Mono','Courier New',monospace" }}>

      <BgParticles config={config} />

      {/* Texture bruit */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0, opacity:0.04,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize:"200px",
      }} />

      {/* Layout principal */}
      <div style={{ position:"relative", zIndex:10, minHeight:"100vh", display:"flex", flexDirection:"column" }}>

        {/* Sur mobile : colonne. Sur desktop : 2 colonnes */}
        <div style={{ display:"flex", flexDirection:"row", minHeight:"100vh", flexWrap:"wrap" }}>

          {/* ── GAUCHE : Globe ── */}
          <div style={{ position:"relative", flex:"1 1 400px", minHeight:"50vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Globe3D config={config} temperature={meteo?.main?.temp ?? null} />

            {/* Horloge */}
            <div style={{ position:"absolute", top:24, left:0, right:0, textAlign:"center", pointerEvents:"none", color: P + "99" }}>
              <div style={{ fontSize:11, letterSpacing:"0.3em", textTransform:"uppercase" }}>
                {heure.toLocaleDateString("fr-FR",{ weekday:"long", day:"numeric", month:"long" })}
              </div>
              <div style={{ fontSize:42, fontWeight:100, letterSpacing:"0.15em", marginTop:4, fontVariantNumeric:"tabular-nums" }}>
                {heure.toLocaleTimeString("fr-FR",{ hour:"2-digit", minute:"2-digit" })}
                <span style={{ fontSize:18, opacity:0.45, marginLeft:4 }}>:{String(heure.getSeconds()).padStart(2,"0")}</span>
              </div>
            </div>

            {/* Ville + description */}
            {meteo && (
              <div style={{
                position:"absolute", bottom:24, left:0, right:0, textAlign:"center", pointerEvents:"none",
                opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)",
                transition:"all 0.8s cubic-bezier(0.34,1.56,0.64,1)",
              }}>
                <div style={{ fontSize:11, letterSpacing:"0.4em", textTransform:"uppercase", color: P + "88", marginBottom:4 }}>{meteo.sys.country}</div>
                <div style={{ fontSize:36, fontWeight:700, letterSpacing:"0.06em", color:"#fff", textShadow:`0 0 40px ${P}88` }}>{meteo.name}</div>
                <div style={{ fontSize:14, marginTop:4, textTransform:"capitalize", color: P + "BB" }}>{meteo.weather[0].description}</div>
              </div>
            )}
          </div>

          {/* ── DROITE : Données ── */}
          <div style={{
            flex:"1 1 340px", maxWidth:480, display:"flex", flexDirection:"column",
            padding:"24px 20px", gap:14, overflowY:"auto", maxHeight:"100vh",
            background:"rgba(0,0,0,0.38)", backdropFilter:"blur(28px)",
            borderLeft:`1px solid ${P}18`,
          }}>

            {/* Recherche */}
            <form onSubmit={rechercher} style={{ display:"flex", gap:8 }}>
              <div style={{ position:"relative", flex:1 }}>
                <svg style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:16, height:16, color: P + "70", pointerEvents:"none" }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Rechercher une ville..."
                  style={{
                    width:"100%", paddingLeft:38, paddingRight:14, paddingTop:11, paddingBottom:11,
                    borderRadius:12, fontSize:13, color:"#fff", background:"rgba(255,255,255,0.07)",
                    border:`1px solid ${P}30`, outline:"none", fontFamily:"inherit",
                  }}
                  onFocus={(e) => e.target.style.borderColor = P + "80"}
                  onBlur={(e)  => e.target.style.borderColor = P + "30"}
                />
              </div>
              <button type="submit" style={{
                padding:"11px 18px", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer",
                background: P + "22", color: P, border:`1px solid ${P}40`, fontFamily:"inherit",
                transition:"transform 0.15s", flexShrink:0,
              }}
                onMouseEnter={(e) => e.currentTarget.style.transform="scale(1.05)"}
                onMouseLeave={(e) => e.currentTarget.style.transform="scale(1)"}
              >↵</button>
            </form>

            {/* Villes rapides */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {villes.map((v) => (
                <button key={v} onClick={() => setVille(v)} style={{
                  fontSize:11, padding:"5px 11px", borderRadius:999, cursor:"pointer", fontFamily:"inherit",
                  background: ville === v ? P + "22" : "rgba(255,255,255,0.05)",
                  color:      ville === v ? P : "rgba(255,255,255,0.4)",
                  border:    `1px solid ${ville === v ? P + "55" : "rgba(255,255,255,0.1)"}`,
                  transition:"all 0.2s",
                }}>{v}</button>
              ))}
            </div>

            {/* Erreur */}
            {erreur && (
              <div style={{ padding:"10px 14px", borderRadius:12, fontSize:13, textAlign:"center",
                background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5" }}>
                ⚠ {erreur}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:"40px 0" }}>
                <div style={{
                  width:44, height:44, borderRadius:"50%",
                  border:`2px solid ${P}18`, borderTopColor: P,
                  animation:"spin 0.9s linear infinite",
                }} />
                <div style={{ fontSize:11, letterSpacing:"0.2em", textTransform:"uppercase", color: P + "77" }}>Chargement...</div>
              </div>
            )}

            {/* Données */}
            {!loading && meteo && (
              <div style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition:"all 0.6s ease", display:"flex", flexDirection:"column", gap:12 }}>

                {/* Onglets */}
                <div style={{ display:"flex", gap:4, padding:4, borderRadius:12, background:"rgba(255,255,255,0.05)", border:`1px solid ${P}14` }}>
                  {[["live","Live"],["prev","5 Jours"],["det","Détails"]].map(([id, label]) => (
                    <button key={id} onClick={() => setOnglet(id)} style={{
                      flex:1, padding:"8px 4px", borderRadius:9, fontSize:11, fontWeight:700,
                      letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer", fontFamily:"inherit",
                      border:"none", background: onglet === id ? P + "22" : "transparent",
                      color: onglet === id ? P : "rgba(255,255,255,0.28)",
                      transition:"all 0.25s",
                    }}>{label}</button>
                  ))}
                </div>

                {/* ── LIVE ── */}
                {onglet === "live" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>

                    {/* Temp */}
                    <div style={{ padding:"18px 20px", borderRadius:18, background:"rgba(255,255,255,0.05)", border:`1px solid ${P}1E` }}>
                      <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between" }}>
                        <div>
                          <div style={{ fontSize:10, letterSpacing:"0.2em", textTransform:"uppercase", color: P + "77", marginBottom:4 }}>Température</div>
                          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                            <span style={{ fontSize:64, fontWeight:100, color: P, lineHeight:1 }}>{Math.round(meteo.main.temp)}</span>
                            <span style={{ fontSize:26, color:"rgba(255,255,255,0.25)" }}>°C</span>
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:4 }}>Ressenti</div>
                          <div style={{ fontSize:24, fontWeight:300, color:"rgba(255,255,255,0.7)" }}>{Math.round(meteo.main.feels_like)}°</div>
                          <div style={{ display:"flex", gap:10, fontSize:11, marginTop:4, justifyContent:"flex-end" }}>
                            <span style={{ color: P + "AA" }}>↑ {Math.round(meteo.main.temp_max)}°</span>
                            <span style={{ color:"rgba(100,160,255,0.6)" }}>↓ {Math.round(meteo.main.temp_min)}°</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Soleil */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      {[
                        { label:"Lever du soleil", ts: meteo.sys.sunrise, sym:"◌" },
                        { label:"Coucher du soleil", ts: meteo.sys.sunset, sym:"●" },
                      ].map((s) => (
                        <div key={s.label} style={{ padding:"14px 12px", borderRadius:16, textAlign:"center", background:"rgba(255,255,255,0.05)", border:`1px solid ${P}14` }}>
                          <div style={{ fontSize:20, color: P, marginBottom:4 }}>{s.sym}</div>
                          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", marginBottom:4 }}>{s.label}</div>
                          <div style={{ fontSize:17, fontWeight:300, color:"#fff" }}>
                            {new Date(s.ts * 1000).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Humidité + Vent */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                      <div style={{ padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,0.05)", border:`1px solid ${P}1E` }}>
                        <div style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color: P + "66", marginBottom:6 }}>Humidité</div>
                        <div style={{ fontSize:22, fontWeight:300, color:"#fff", marginBottom:8 }}>{meteo.main.humidity}%</div>
                        <div style={{ height:2, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${meteo.main.humidity}%`, background: P, opacity:0.7, borderRadius:2, transition:"width 1s" }} />
                        </div>
                      </div>
                      <div style={{ padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,0.05)", border:`1px solid ${P}1E` }}>
                        <div style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color: P + "66", marginBottom:6 }}>Vent · {dirVent(meteo.wind.deg)}</div>
                        <div style={{ fontSize:22, fontWeight:300, color:"#fff" }}>{msToKmh(meteo.wind.speed)} km/h</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 5 JOURS ── */}
                {onglet === "prev" && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {previsions.map((p, i) => {
                      const d = new Date(p.dt * 1000);
                      return (
                        <div key={i} style={{
                          display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:14,
                          background:"rgba(255,255,255,0.04)", border:`1px solid ${P}14`,
                          opacity: visible ? 1 : 0, transform: visible ? "none" : "translateX(-16px)",
                          transition:`all 0.45s ease ${i * 0.07}s`,
                        }}>
                          <span style={{ fontSize:13, fontWeight:700, width:36, color: P }}>{i === 0 ? "Auj." : JOURS[d.getDay()]}</span>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.38)", flex:1, textTransform:"capitalize" }}>{p.weather[0].description}</span>
                          <div style={{ display:"flex", gap:8, fontSize:13, alignItems:"center" }}>
                            <span style={{ color:"rgba(255,255,255,0.28)" }}>{Math.round(p.main.temp_min)}°</span>
                            <div style={{ width:48, height:3, borderRadius:2, background:`linear-gradient(90deg,${P}33,${P})` }} />
                            <span style={{ color: P, fontWeight:700 }}>{Math.round(p.main.temp_max)}°</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ── DÉTAILS ── */}
                {onglet === "det" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {[
                      ["Humidité",   `${meteo.main.humidity} %`],
                      ["Pression",   `${meteo.main.pressure} hPa`],
                      ["Vent",       `${msToKmh(meteo.wind.speed)} km/h`],
                      ["Direction",  dirVent(meteo.wind.deg)],
                      ["Visibilité", meteo.visibility ? `${(meteo.visibility/1000).toFixed(1)} km` : "N/A"],
                      ["Nuages",     `${meteo.clouds.all} %`],
                      ["Temp. min",  `${Math.round(meteo.main.temp_min)} °C`],
                      ["Temp. max",  `${Math.round(meteo.main.temp_max)} °C`],
                    ].map(([label, value], i) => (
                      <div key={label} style={{
                        padding:"14px 16px", borderRadius:16, background:"rgba(255,255,255,0.04)", border:`1px solid ${P}14`,
                        opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(8px)",
                        transition:`all 0.4s ease ${i * 0.045}s`,
                      }}>
                        <div style={{ fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color: P + "60", marginBottom:4 }}>{label}</div>
                        <div style={{ fontSize:19, fontWeight:300, color: P }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* Footer */}
            <div style={{ marginTop:"auto", paddingTop:12, textAlign:"center", fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color: P + "30" }}>
              OpenWeatherMap API • Damiti Dev © 2026
            </div>
          </div>
        </div>
      </div>

      {/* CSS animation spin */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}