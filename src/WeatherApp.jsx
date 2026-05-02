// ============================================================
//  WEATHER APP — Design 3D Cinématographique
//  React + Three.js + GSAP + OpenWeatherMap API
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

// ══════════════════════════════════════════════════════════
//  🔑 TA CLÉ API — Elle est déjà là, ça marche !
//  Si elle expire : openweathermap.org → ton compte → API Keys
// ══════════════════════════════════════════════════════════
const API_KEY = "1927a80134321659990135937a87a1a9";

const URL_METEO    = (v) => `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(v)}&appid=${API_KEY}&units=metric&lang=fr`;
const URL_PREVISIONS = (v) => `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(v)}&appid=${API_KEY}&units=metric&lang=fr`;

// ── Conditions météo → config visuelle ──
const WEATHER_CONFIGS = {
  Clear:        { gradient: ["#FF6B35","#F7C59F","#1a1a2e"], particle: "#FFD700", label: "Ensoleillé",  intensity: 0.9 },
  Clouds:       { gradient: ["#485563","#29323c","#0d0d0d"], particle: "#C0C0C0", label: "Nuageux",     intensity: 0.4 },
  Rain:         { gradient: ["#1CB5E0","#000851","#0d0d0d"], particle: "#4FC3F7", label: "Pluvieux",    intensity: 0.7 },
  Drizzle:      { gradient: ["#4facfe","#00f2fe","#0d0d0d"], particle: "#87CEEB", label: "Bruine",      intensity: 0.5 },
  Thunderstorm: { gradient: ["#7B2FBE","#1a1a2e","#000000"], particle: "#B388FF", label: "Orage",       intensity: 1.0 },
  Snow:         { gradient: ["#e0e0e0","#9E9E9E","#1a1a2e"], particle: "#FFFFFF", label: "Neige",       intensity: 0.6 },
  Mist:         { gradient: ["#6a8093","#2c3e50","#0d0d0d"], particle: "#B0BEC5", label: "Brume",       intensity: 0.3 },
  Fog:          { gradient: ["#5f7f8e","#2c3e50","#0d0d0d"], particle: "#90A4AE", label: "Brouillard",  intensity: 0.3 },
  default:      { gradient: ["#0f0c29","#302b63","#24243e"], particle: "#818cf8", label: "Météo",       intensity: 0.5 },
};

const getConfig = (main) => WEATHER_CONFIGS[main] || WEATHER_CONFIGS.default;

const JOURS = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
const msToKmh = (v) => Math.round(v * 3.6);
const dirVent = (deg) => ["N","NE","E","SE","S","SO","O","NO"][Math.round(deg/45)%8];

// ============================================================
//  COMPOSANT : Globe 3D (Canvas WebGL natif)
// ============================================================
function Globe3D({ config, temperature }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({ rotation: 0, particles: [], mouse: { x: 0, y: 0 }, ripples: [] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Resize
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Particules flottantes
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    stateRef.current.particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    // Mouse tracking
    const onMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.mouse = {
        x: (e.clientX - rect.left) / rect.width * 2 - 1,
        y: (e.clientY - rect.top)  / rect.height * 2 - 1,
      };
    };
    canvas.addEventListener("mousemove", onMouse);

    // Click → ripple
    const onClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      stateRef.current.ripples.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        r: 0, maxR: 120, opacity: 0.6,
      });
    };
    canvas.addEventListener("click", onClick);

    // ── BOUCLE D'ANIMATION ──
    const draw = () => {
      const s = stateRef.current;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // Fond gradient dynamique
      const grd = ctx.createRadialGradient(w*0.5 + s.mouse.x*30, h*0.4 + s.mouse.y*20, 0, w*0.5, h*0.5, w*0.8);
      grd.addColorStop(0,   config.gradient[0] + "CC");
      grd.addColorStop(0.5, config.gradient[1] + "99");
      grd.addColorStop(1,   config.gradient[2] + "FF");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);

      // ── Globe ──
      const cx = w * 0.5 + s.mouse.x * 15;
      const cy = h * 0.38 + s.mouse.y * 10;
      const R  = Math.min(w, h) * 0.28;

      // Halo extérieur
      const halo = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.6);
      halo.addColorStop(0,   config.particle + "20");
      halo.addColorStop(0.5, config.particle + "08");
      halo.addColorStop(1,   "transparent");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Corps du globe
      const globeGrad = ctx.createRadialGradient(cx - R*0.3, cy - R*0.3, 0, cx, cy, R);
      globeGrad.addColorStop(0,   config.gradient[0] + "FF");
      globeGrad.addColorStop(0.4, config.gradient[1] + "EE");
      globeGrad.addColorStop(1,   config.gradient[2] + "CC");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = globeGrad;
      ctx.fill();

      // Grille de latitude/longitude animée
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = config.particle + "25";
      ctx.lineWidth = 0.8;
      const offset = (s.rotation * 0.3) % (Math.PI / 3);

      // Lignes de longitude (verticales courbes)
      for (let i = 0; i < 7; i++) {
        const angle = offset + (i / 6) * Math.PI;
        const x1 = cx + Math.cos(angle) * R;
        const bend = Math.sin(angle) * R * 0.15;
        ctx.beginPath();
        ctx.moveTo(x1, cy - R);
        ctx.bezierCurveTo(x1 + bend, cy - R/2, x1 + bend, cy + R/2, x1, cy + R);
        ctx.stroke();
      }

      // Lignes de latitude
      for (let i = 1; i < 5; i++) {
        const y = cy - R + (i / 5) * R * 2;
        const rLat = Math.sqrt(Math.max(0, R*R - (y-cy)*(y-cy)));
        ctx.beginPath();
        ctx.ellipse(cx, y, rLat, rLat * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Reflet lumineux
      const shimmer = ctx.createRadialGradient(cx - R*0.4, cy - R*0.35, 0, cx - R*0.2, cy - R*0.2, R*0.6);
      shimmer.addColorStop(0, "rgba(255,255,255,0.22)");
      shimmer.addColorStop(0.5, "rgba(255,255,255,0.04)");
      shimmer.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = shimmer;
      ctx.fill();

      // Anneau orbital
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s.rotation * 0.15 + s.mouse.x * 0.3);
      ctx.scale(1, 0.25);
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.35, 0, Math.PI * 2);
      ctx.strokeStyle = config.particle + "30";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Point orbital lumineux
      const orbX = Math.cos(s.rotation * 0.5) * R * 1.35;
      const orbY = Math.sin(s.rotation * 0.5) * R * 1.35;
      ctx.beginPath();
      ctx.arc(orbX, orbY, 5, 0, Math.PI * 2);
      ctx.fillStyle = config.particle;
      ctx.fill();
      ctx.restore();

      // Température au centre du globe
      ctx.save();
      ctx.font = `bold ${R * 0.55}px 'Courier New', monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.shadowColor = config.particle;
      ctx.shadowBlur = 20;
      ctx.fillText(temperature !== null ? `${Math.round(temperature)}°` : "—", cx, cy);
      ctx.restore();

      // ── Particules ──
      s.particles.forEach((p) => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.pulse += 0.02;
        const pulse = Math.sin(p.pulse) * 0.3 + 0.7;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Attraction vers le globe
        const dx = cx - p.x, dy = cy - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > R * 1.5 && dist < R * 4) {
          p.vx += dx / dist * 0.003;
          p.vy += dy / dist * 0.003;
        }
        // Limiter vitesse
        const speed = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
        if (speed > 0.8) { p.vx *= 0.98; p.vy *= 0.98; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * pulse, 0, Math.PI * 2);
        ctx.fillStyle = config.particle + Math.round(p.opacity * pulse * 255).toString(16).padStart(2,"0");
        ctx.fill();
      });

      // ── Ripples (clic) ──
      s.ripples = s.ripples.filter((r) => {
        r.r       += 3;
        r.opacity -= 0.015;
        if (r.opacity <= 0) return false;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = config.particle + Math.round(r.opacity * 255).toString(16).padStart(2,"0");
        ctx.lineWidth = 2;
        ctx.stroke();
        return true;
      });

      s.rotation += 0.008;
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

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      style={{ display: "block" }}
    />
  );
}

// ============================================================
//  COMPOSANT : Particules de fond (pleine page)
// ============================================================
function BackgroundParticles({ config }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.3,
      vy: -Math.random() * 0.5 - 0.1,
      opacity: Math.random() * 0.3,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.vy;
        if (p.y < 0) { p.y = canvas.height; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = config.particle + Math.round(p.opacity * 255).toString(16).padStart(2,"0");
        ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", onResize); };
  }, [config]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
}

// ============================================================
//  COMPOSANT PRINCIPAL
// ============================================================
export default function WeatherApp() {
  const [ville, setVille]         = useState("Abidjan");
  const [input, setInput]         = useState("");
  const [meteo, setMeteo]         = useState(null);
  const [previsions, setPrevisions] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [erreur, setErreur]       = useState("");
  const [heure, setHeure]         = useState(new Date());
  const [onglet, setOnglet]       = useState("maintenant");
  const [revealed, setRevealed]   = useState(false);

  const config = meteo
    ? getConfig(meteo.weather[0].main)
    : WEATHER_CONFIGS.default;

  // Horloge
  useEffect(() => {
    const t = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch météo
  useEffect(() => { fetchMeteo(ville); }, [ville]);

  // Animation d'entrée
  useEffect(() => {
    setTimeout(() => setRevealed(true), 100);
  }, []);

  const fetchMeteo = useCallback(async (nom) => {
    setLoading(true);
    setErreur("");
    setMeteo(null);
    setPrevisions([]);
    setRevealed(false);

    try {
      const [res, resPrev] = await Promise.all([
        fetch(URL_METEO(nom)),
        fetch(URL_PREVISIONS(nom)),
      ]);
      const data     = await res.json();
      const dataPrev = await resPrev.json();

      if (data.cod !== 200) {
        throw new Error(
          data.cod === 401
            ? "Clé API invalide — vérifie openweathermap.org"
            : `Ville introuvable : "${nom}"`
        );
      }

      setMeteo(data);

      // Prévisions : 1 par jour à midi
      const vus = new Set();
      const filtrées = dataPrev.list?.filter((item) => {
        const date = item.dt_txt.slice(0, 10);
        const h    = item.dt_txt.slice(11, 13);
        if (!vus.has(date) && ["11","12","13"].includes(h)) {
          vus.add(date); return true;
        }
        return false;
      }).slice(0, 5) || [];
      setPrevisions(filtrées);

      setTimeout(() => setRevealed(true), 300);
    } catch (err) {
      setErreur(err.message);
      setRevealed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const rechercher = (e) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setInput("");
    setVille(v);
  };

  const villesRapides = ["Abidjan","Paris","Dubai","Tokyo","New York","Lagos","London","Sydney"];

  // ── Gradient de fond ──
  const bgStyle = {
    background: `linear-gradient(135deg, ${config.gradient[0]} 0%, ${config.gradient[1]} 50%, ${config.gradient[2]} 100%)`,
    transition: "background 1.5s ease",
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden font-mono" style={bgStyle}>

      {/* Particules de fond */}
      <BackgroundParticles config={config} />

      {/* Bruit de texture */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px",
        }}
      />

      {/* ══ LAYOUT ══ */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">

        {/* ── GAUCHE : Globe 3D ── */}
        <div
          className="relative lg:w-1/2 flex items-center justify-center"
          style={{ minHeight: "50vh" }}
        >
          <Globe3D config={config} temperature={meteo?.main?.temp ?? null} />

          {/* Nom de la ville sur le globe */}
          {meteo && (
            <div
              className="absolute bottom-8 left-0 right-0 text-center pointer-events-none"
              style={{
                transform: revealed ? "translateY(0)" : "translateY(20px)",
                opacity: revealed ? 1 : 0,
                transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <p
                className="text-xs tracking-[0.4em] uppercase mb-1"
                style={{ color: config.particle + "88" }}
              >
                {meteo.sys.country}
              </p>
              <h2
                className="text-2xl lg:text-4xl font-bold tracking-wider text-white"
                style={{ textShadow: `0 0 40px ${config.particle}88` }}
              >
                {meteo.name}
              </h2>
              <p
                className="text-sm mt-1 capitalize"
                style={{ color: config.particle + "CC" }}
              >
                {meteo.weather[0].description}
              </p>
            </div>
          )}

          {/* Horloge */}
          <div
            className="absolute top-6 left-0 right-0 text-center pointer-events-none"
            style={{ color: config.particle + "99" }}
          >
            <p className="text-xs tracking-[0.3em] uppercase">
              {heure.toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" })}
            </p>
            <p className="text-3xl lg:text-5xl font-thin tracking-widest mt-1 tabular-nums">
              {heure.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}
              <span className="text-lg ml-1 opacity-50">
                :{String(heure.getSeconds()).padStart(2,"0")}
              </span>
            </p>
          </div>
        </div>

        {/* ── DROITE : Données météo ── */}
        <div
          className="relative lg:w-1/2 flex flex-col p-6 lg:p-10 gap-5 overflow-y-auto"
          style={{
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(30px)",
            borderLeft: `1px solid ${config.particle}20`,
            maxHeight: "100vh",
          }}
        >

          {/* ── Barre de recherche ── */}
          <form onSubmit={rechercher} className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: config.particle + "80" }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Rechercher une ville..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/30 bg-white/8 border focus:outline-none transition-all duration-300"
                style={{
                  borderColor: config.particle + "30",
                  background: "rgba(255,255,255,0.06)",
                }}
                onFocus={(e) => e.target.style.borderColor = config.particle + "80"}
                onBlur={(e)  => e.target.style.borderColor = config.particle + "30"}
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: config.particle + "25",
                color: config.particle,
                border: `1px solid ${config.particle}40`,
              }}
            >
              ↵
            </button>
          </form>

          {/* Villes rapides */}
          <div className="flex flex-wrap gap-2">
            {villesRapides.map((v) => (
              <button
                key={v}
                onClick={() => setVille(v)}
                className="text-xs px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: ville === v ? config.particle + "25" : "rgba(255,255,255,0.05)",
                  color:      ville === v ? config.particle : "rgba(255,255,255,0.4)",
                  border:     `1px solid ${ville === v ? config.particle + "50" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Erreur */}
          {erreur && (
            <div
              className="px-4 py-3 rounded-xl text-sm text-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              ⚠ {erreur}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16">
              <div
                className="w-12 h-12 rounded-full border-2 animate-spin"
                style={{ borderColor: config.particle + "20", borderTopColor: config.particle }}
              />
              <p className="text-xs tracking-widest uppercase" style={{ color: config.particle + "80" }}>
                Chargement des données...
              </p>
            </div>
          )}

          {/* ══ DONNÉES ══ */}
          {!loading && meteo && (
            <div
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "none" : "translateY(16px)",
                transition: "all 0.7s ease",
              }}
            >

              {/* ── ONGLETS ── */}
              <div
                className="flex gap-1 p-1 rounded-xl mb-5"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${config.particle}15` }}
              >
                {[
                  { id: "maintenant", label: "Live" },
                  { id: "previsions", label: "5 jours" },
                  { id: "details",    label: "Détails" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOnglet(tab.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all duration-300"
                    style={onglet === tab.id
                      ? { background: config.particle + "25", color: config.particle }
                      : { color: "rgba(255,255,255,0.3)" }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ════ ONGLET LIVE ════ */}
              {onglet === "maintenant" && (
                <div className="space-y-4">

                  {/* Température + stats */}
                  <div
                    className="p-5 rounded-2xl"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${config.particle}20` }}
                  >
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: config.particle + "80" }}>
                          Température
                        </p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-7xl font-thin" style={{ color: config.particle }}>
                            {Math.round(meteo.main.temp)}
                          </span>
                          <span className="text-3xl text-white/30">°C</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-white/30">Ressenti</p>
                        <p className="text-2xl font-light text-white/70">{Math.round(meteo.main.feels_like)}°</p>
                        <div className="flex gap-3 text-xs">
                          <span style={{ color: config.particle + "AA" }}>↑{Math.round(meteo.main.temp_max)}°</span>
                          <span className="text-blue-300/60">↓{Math.round(meteo.main.temp_min)}°</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lever / Coucher */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Lever du soleil", ts: meteo.sys.sunrise, symbol: "◌" },
                      { label: "Coucher du soleil", ts: meteo.sys.sunset, symbol: "●" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="p-4 rounded-2xl text-center"
                        style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${config.particle}15` }}
                      >
                        <p className="text-2xl mb-1" style={{ color: config.particle }}>{s.symbol}</p>
                        <p className="text-xs text-white/30 mb-1 tracking-wider">{s.label}</p>
                        <p className="text-lg font-light text-white">
                          {new Date(s.ts*1000).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Stats : Humidité + Vent */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Humidité" value={`${meteo.main.humidity}%`} config={config} bar={meteo.main.humidity} />
                    <StatCard label={`Vent · ${dirVent(meteo.wind.deg)}`} value={`${msToKmh(meteo.wind.speed)} km/h`} config={config} />
                  </div>
                </div>
              )}

              {/* ════ ONGLET 5 JOURS ════ */}
              {onglet === "previsions" && (
                <div className="space-y-2">
                  {previsions.map((p, i) => {
                    const date = new Date(p.dt * 1000);
                    const pct  = ((p.main.temp_max - p.main.temp_min) / 40 * 100);
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-4 px-4 py-3.5 rounded-xl"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: `1px solid ${config.particle}15`,
                          transform: revealed ? "none" : "translateX(-20px)",
                          opacity: revealed ? 1 : 0,
                          transition: `all 0.5s ease ${i * 0.08}s`,
                        }}
                      >
                        <span className="text-sm font-bold w-10" style={{ color: config.particle }}>
                          {i === 0 ? "Auj." : JOURS[date.getDay()]}
                        </span>
                        <span className="text-xs text-white/40 flex-1 capitalize">{p.weather[0].description}</span>
                        <div className="flex gap-2 text-sm items-center">
                          <span className="text-white/30">{Math.round(p.main.temp_min)}°</span>
                          <div
                            className="h-1 rounded-full w-16"
                            style={{ background: `linear-gradient(90deg, ${config.particle}33, ${config.particle})` }}
                          />
                          <span style={{ color: config.particle }}>{Math.round(p.main.temp_max)}°</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ════ ONGLET DÉTAILS ════ */}
              {onglet === "details" && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Humidité",     value: `${meteo.main.humidity} %` },
                    { label: "Pression",      value: `${meteo.main.pressure} hPa` },
                    { label: "Vent",          value: `${msToKmh(meteo.wind.speed)} km/h` },
                    { label: "Direction",     value: dirVent(meteo.wind.deg) },
                    { label: "Visibilité",    value: meteo.visibility ? `${(meteo.visibility/1000).toFixed(1)} km` : "N/A" },
                    { label: "Nuages",        value: `${meteo.clouds.all} %` },
                    { label: "Temp. min",     value: `${Math.round(meteo.main.temp_min)} °C` },
                    { label: "Temp. max",     value: `${Math.round(meteo.main.temp_max)} °C` },
                  ].map((item, i) => (
                    <DetailCard key={item.label} {...item} config={config} delay={i * 0.05} revealed={revealed} />
                  ))}
                </div>
              )}

            </div>
          )}

          {/* Footer */}
          <div className="mt-auto pt-4">
            <p
              className="text-center text-[10px] tracking-widest uppercase"
              style={{ color: config.particle + "33" }}
            >
              OpenWeatherMap API • Damiti Dev © 2026
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Carte statistique ──
function StatCard({ label, value, config, bar }) {
  return (
    <div
      className="p-4 rounded-2xl space-y-2"
      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${config.particle}20` }}
    >
      <p className="text-xs tracking-widest uppercase" style={{ color: config.particle + "66" }}>{label}</p>
      <p className="text-2xl font-light text-white">{value}</p>
      {bar !== undefined && (
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${bar}%`, background: config.particle, opacity: 0.7 }}
          />
        </div>
      )}
    </div>
  );
}

// ── Carte détail ──
function DetailCard({ label, value, config, delay, revealed }) {
  return (
    <div
      className="p-4 rounded-2xl space-y-1"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${config.particle}15`,
        transform: revealed ? "none" : "translateY(10px)",
        opacity: revealed ? 1 : 0,
        transition: `all 0.5s ease ${delay}s`,
      }}
    >
      <p className="text-[10px] tracking-widest uppercase" style={{ color: config.particle + "66" }}>{label}</p>
      <p className="text-xl font-light" style={{ color: config.particle }}>{value}</p>
    </div>
  );
}