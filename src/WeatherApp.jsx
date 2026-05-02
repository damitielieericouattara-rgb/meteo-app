// ============================================================
//  WEATHER APP — Design Premium Pleine Page
//  React + Tailwind CSS + OpenWeatherMap API
// ============================================================

import { useState, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════
//  🔑 METS TA CLÉ API ICI
//  Inscris-toi sur openweathermap.org → API Keys → Copie ta clé
// ══════════════════════════════════════════════════════════
const API_KEY = "1927a80134321659990135937a87a1a9";

// Les URLs de l'API OpenWeatherMap
// units=metric → températures en Celsius
// lang=fr → descriptions en français
const URL_METEO = (ville) =>
  `https://api.openweathermap.org/data/2.5/weather?q=${ville}&appid=${API_KEY}&units=metric&lang=fr`;

const URL_PREVISIONS = (ville) =>
  `https://api.openweathermap.org/data/2.5/forecast?q=${ville}&appid=${API_KEY}&units=metric&lang=fr`;

// ── Icônes selon le code météo de l'API ──
const iconeMeteo = (code) => {
  if (!code) return "🌡️";
  const map = {
    "01": "☀️", "02": "⛅", "03": "☁️", "04": "☁️",
    "09": "🌧️", "10": "🌦️", "11": "⛈️", "13": "❄️", "50": "🌫️",
  };
  return map[code.slice(0, 2)] || "🌡️";
};

// ── Jours de la semaine ──
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

// ── Thèmes visuels selon la météo ──
// Chaque code météo a son propre thème de couleurs
const THEMES = {
  "01d": { bg: "from-orange-950 via-amber-900 to-blue-950", accent: "#fb923c", card: "rgba(251,146,60,0.08)" },
  "01n": { bg: "from-indigo-950 via-blue-950 to-slate-950", accent: "#818cf8", card: "rgba(129,140,248,0.08)" },
  "02d": { bg: "from-blue-900 via-slate-800 to-blue-950", accent: "#60a5fa", card: "rgba(96,165,250,0.08)" },
  "02n": { bg: "from-slate-900 via-blue-950 to-indigo-950", accent: "#6366f1", card: "rgba(99,102,241,0.08)" },
  "03d": { bg: "from-slate-800 via-gray-900 to-blue-950", accent: "#94a3b8", card: "rgba(148,163,184,0.08)" },
  "04d": { bg: "from-gray-800 via-slate-900 to-gray-950", accent: "#9ca3af", card: "rgba(156,163,175,0.08)" },
  "09d": { bg: "from-blue-950 via-indigo-950 to-slate-900", accent: "#38bdf8", card: "rgba(56,189,248,0.08)" },
  "10d": { bg: "from-blue-900 via-cyan-950 to-slate-950", accent: "#22d3ee", card: "rgba(34,211,238,0.08)" },
  "10n": { bg: "from-blue-950 via-slate-950 to-indigo-950", accent: "#6366f1", card: "rgba(99,102,241,0.08)" },
  "11d": { bg: "from-purple-950 via-slate-900 to-gray-950", accent: "#c084fc", card: "rgba(192,132,252,0.08)" },
  "13d": { bg: "from-slate-600 via-blue-900 to-slate-800", accent: "#e2e8f0", card: "rgba(226,232,240,0.1)" },
  "50d": { bg: "from-gray-700 via-slate-800 to-gray-900", accent: "#cbd5e1", card: "rgba(203,213,225,0.08)" },
  default: { bg: "from-slate-950 via-blue-950 to-indigo-950", accent: "#60a5fa", card: "rgba(96,165,250,0.08)" },
};

const getTheme = (code) => THEMES[code] || THEMES[code?.slice(0,3)+"d"] || THEMES.default;

// ── Convertit la vitesse du vent (m/s → km/h) ──
const msToKmh = (v) => Math.round(v * 3.6);

// ── Direction du vent en texte ──
const directionVent = (deg) => {
  const dirs = ["N","NE","E","SE","S","SO","O","NO"];
  return dirs[Math.round(deg / 45) % 8];
};

// ============================================================
//  COMPOSANT PRINCIPAL
// ============================================================
export default function WeatherApp() {

  // ── États React ──
  const [ville, setVille]           = useState("Abidjan");
  const [input, setInput]           = useState("");
  const [meteo, setMeteo]           = useState(null);
  const [previsions, setPrevisions] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [erreur, setErreur]         = useState("");
  const [heure, setHeure]           = useState(new Date());
  const [onglet, setOnglet]         = useState("maintenant");
  // onglet = "maintenant" | "previsions" | "details"

  // ── Horloge temps réel ──
  useEffect(() => {
    const t = setInterval(() => setHeure(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Charger la météo quand la ville change ──
  useEffect(() => {
    fetchMeteo(ville);
  }, [ville]);

  // ── Fonction principale : appel API ──
  const fetchMeteo = useCallback(async (nom) => {
    setLoading(true);
    setErreur("");
    setMeteo(null);
    setPrevisions([]);

    try {
      // ── Requête 1 : météo actuelle ──
      const res = await fetch(URL_METEO(nom));
      const data = await res.json();

      if (data.cod !== 200) {
        throw new Error(
          data.cod === 401
            ? " Clé API invalide. Vérifie ta clé sur openweathermap.org"
            : "Ville introuvable. Essaie une autre orthographe."
        );
      }

      setMeteo(data);

      // ── Requête 2 : prévisions 5 jours ──
      const resPrev = await fetch(URL_PREVISIONS(nom));
      const dataPrev = await resPrev.json();

      // Filtrer : une entrée par jour à midi
      const vus = new Set();
      const filtrées = dataPrev.list.filter((item) => {
        const date = item.dt_txt.slice(0, 10);
        const h = item.dt_txt.slice(11, 13);
        if (!vus.has(date) && (h === "12" || h === "11" || h === "13")) {
          vus.add(date);
          return true;
        }
        return false;
      }).slice(0, 5);

      setPrevisions(filtrées);

    } catch (err) {
      setErreur(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Soumettre la recherche ──
  const rechercher = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setVille(input.trim());
    setInput("");
  };

  // ── Données du thème visuel ──
  const code = meteo?.weather?.[0]?.icon;
  const theme = getTheme(code);

  const villesRapides = ["Abidjan", "Paris", "Dubai", "Tokyo", "New York", "London", "Lagos"];

  // ════════════════════════════════════════════════════════
  //  RENDU JSX
  // ════════════════════════════════════════════════════════
  return (
    <div
      className={`
        min-h-screen w-full
        bg-gradient-to-br ${theme.bg}
        text-white
        transition-all duration-[1500ms] ease-in-out
        flex flex-col
        font-sans
        overflow-x-hidden
      `}
    >

      {/* ── Orbes lumineux décoratifs ── */}
      <div
        className="fixed top-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 blur-[120px] transition-all duration-[2000ms]"
        style={{ background: `${theme.accent}15` }}
      />
      <div
        className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2 blur-[100px] transition-all duration-[2000ms]"
        style={{ background: `${theme.accent}10` }}
      />

      {/* ══ LAYOUT PRINCIPAL ══ */}
      <div className="relative z-10 flex flex-col w-full max-w-lg min-h-screen gap-6 px-5 py-8 mx-auto">

        {/* ── EN-TÊTE : Date + Heure ── */}
        <header className="space-y-1 text-center">
          <p
            className="text-xs tracking-[0.25em] uppercase font-medium"
            style={{ color: `${theme.accent}99` }}
          >
            {heure.toLocaleDateString("fr-FR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </p>
          <p className="text-4xl font-thin tracking-wider tabular-nums"
             style={{ color: `${theme.accent}CC` }}>
            {heure.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </header>

        {/* ── BARRE DE RECHERCHE ── */}
        <form onSubmit={rechercher} className="flex gap-2">
          <div className="relative flex-1">
            {/* Icône loupe */}
            <svg
              className="absolute w-4 h-4 -translate-y-1/2 left-4 top-1/2"
              style={{ color: `${theme.accent}66` }}
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
              className="
                w-full rounded-2xl py-3.5 pl-11 pr-4
                bg-white/8 border border-white/10
                text-white text-sm placeholder-white/30
                focus:outline-none focus:border-white/25 focus:bg-white/12
                transition-all duration-300
              "
            />
          </div>
          <button
            type="submit"
            className="
              px-5 py-3.5 rounded-2xl font-semibold text-sm
              border border-white/10
              transition-all duration-300
              hover:scale-105 active:scale-95
            "
            style={{ background: `${theme.accent}22`, color: theme.accent }}
          >
            Go
          </button>
        </form>

        {/* ── Erreur API ── */}
        {erreur && (
          <div className="px-4 py-3 text-sm text-center text-red-300 border bg-red-500/10 border-red-400/30 rounded-2xl">
            {erreur}
          </div>
        )}

        {/* ── Villes rapides ── */}
        <div className="flex flex-wrap gap-2">
          {villesRapides.map((v) => (
            <button
              key={v}
              onClick={() => setVille(v)}
              className={`
                text-xs px-3 py-1.5 rounded-full border
                transition-all duration-200 hover:scale-105 active:scale-95
                ${ville === v
                  ? "bg-white/15 border-white/30 text-white font-semibold"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10"
                }
              `}
            >
              {v}
            </button>
          ))}
        </div>

        {/* ── SPINNER de chargement ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-20">
            <div
              className="border-2 rounded-full w-14 h-14 border-white/10 animate-spin"
              style={{ borderTopColor: theme.accent }}
            />
            <p className="text-sm tracking-wide text-white/40">Chargement...</p>
          </div>
        )}

        {/* ── DONNÉES MÉTÉO ── */}
        {!loading && meteo && (
          <>

            {/* ── ONGLETS DE NAVIGATION ── */}
            <div
              className="flex gap-1 p-1 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {[
                { id: "maintenant", label: "Maintenant" },
                { id: "previsions", label: "5 Jours" },
                { id: "details",    label: "Détails" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setOnglet(tab.id)}
                  className={`
                    flex-1 py-2 rounded-xl text-xs font-semibold
                    transition-all duration-300
                    ${onglet === tab.id
                      ? "text-white"
                      : "text-white/40 hover:text-white/60"
                    }
                  `}
                  style={onglet === tab.id
                    ? { background: `${theme.accent}25`, color: theme.accent }
                    : {}
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ════ ONGLET 1 : MAINTENANT ════ */}
            {onglet === "maintenant" && (
              <div className="flex flex-col gap-4">

                {/* Carte principale */}
                <div
                  className="p-6 space-y-3 text-center border rounded-3xl border-white/8"
                  style={{ background: theme.card, backdropFilter: "blur(20px)" }}
                >
                  {/* Ville + Pays */}
                  <div>
                    <h1 className="text-2xl font-light tracking-wide">{meteo.name}</h1>
                    <p className="text-white/40 text-sm mt-0.5">{meteo.sys.country}</p>
                  </div>

                  {/* Icône météo */}
                  <div className="py-2 leading-none text-8xl">{iconeMeteo(code)}</div>

                  {/* Température */}
                  <div>
                    <span className="font-thin text-8xl" style={{ color: theme.accent }}>
                      {Math.round(meteo.main.temp)}
                    </span>
                    <span className="text-4xl font-thin text-white/50">°C</span>
                  </div>

                  {/* Description */}
                  <p className="text-lg capitalize text-white/70">
                    {meteo.weather[0].description}
                  </p>

                  {/* Ressenti + Min/Max */}
                  <div className="flex justify-center gap-6 pt-1 text-sm text-white/40">
                    <span>Ressenti {Math.round(meteo.main.feels_like)}°</span>
                    <span style={{ color: `${theme.accent}99` }}>↑ {Math.round(meteo.main.temp_max)}°</span>
                    <span style={{ color: "#60a5fa99" }}>↓ {Math.round(meteo.main.temp_min)}°</span>
                  </div>
                </div>

                {/* Lever/Coucher soleil */}
                <div
                  className="flex justify-around p-4 border rounded-2xl border-white/8"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {[
                    { emoji:"", label:"Lever", ts: meteo.sys.sunrise },
                    { emoji:"", label:"Coucher", ts: meteo.sys.sunset },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1 text-center">
                      <p className="text-2xl">{s.emoji}</p>
                      <p className="text-white/35 text-[10px] uppercase tracking-widest">{s.label}</p>
                      <p className="text-base font-light">
                        {new Date(s.ts * 1000).toLocaleTimeString("fr-FR", {
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Stats rapides : Humidité + Vent */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Humidité",
                      value: `${meteo.main.humidity}%`,
                      emoji: "",
                      bar: meteo.main.humidity,
                    },
                    {
                      label: "Vent",
                      value: `${msToKmh(meteo.wind.speed)} km/h`,
                      emoji: "",
                      sub: directionVent(meteo.wind.deg),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-4 space-y-2 border rounded-2xl border-white/8"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      <p className="text-white/35 text-[10px] uppercase tracking-widest">
                        {item.emoji} {item.label}
                      </p>
                      <p className="text-2xl font-light">{item.value}</p>
                      {item.sub && <p className="text-xs text-white/30">{item.sub}</p>}
                      {item.bar !== undefined && (
                        <div className="h-1 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full transition-all duration-700 rounded-full"
                            style={{
                              width: `${item.bar}%`,
                              background: theme.accent,
                              opacity: 0.6,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* ════ ONGLET 2 : PRÉVISIONS 5 JOURS ════ */}
            {onglet === "previsions" && (
              <div className="flex flex-col gap-3">
                <p
                  className="text-center text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: `${theme.accent}88` }}
                >
                  Prévisions sur 5 jours
                </p>
                {previsions.map((p, i) => {
                  const date = new Date(p.dt * 1000);
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between px-5 py-4 border rounded-2xl border-white/8"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    >
                      {/* Jour */}
                      <span className="text-sm font-medium w-14 text-white/70">
                        {i === 0 ? "Auj." : JOURS[date.getDay()]}
                      </span>

                      {/* Icône */}
                      <span className="text-2xl">{iconeMeteo(p.weather[0].icon)}</span>

                      {/* Description */}
                      <span className="flex-1 px-2 text-xs text-center capitalize text-white/40">
                        {p.weather[0].description}
                      </span>

                      {/* Températures */}
                      <div className="flex gap-3 text-sm">
                        <span className="text-white/35">{Math.round(p.main.temp_min)}°</span>
                        <span className="font-semibold" style={{ color: theme.accent }}>
                          {Math.round(p.main.temp_max)}°
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ════ ONGLET 3 : DÉTAILS ════ */}
            {onglet === "details" && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Humidité",     value:`${meteo.main.humidity} %`,          emoji:"💧" },
                  { label:"Pression",     value:`${meteo.main.pressure} hPa`,         emoji:"📊" },
                  { label:"Vent",         value:`${msToKmh(meteo.wind.speed)} km/h`,  emoji:"💨" },
                  { label:"Direction",    value:directionVent(meteo.wind.deg),         emoji:"🧭" },
                  {
                    label:"Visibilité",
                    value: meteo.visibility
                      ? `${(meteo.visibility/1000).toFixed(1)} km`
                      : "N/A",
                    emoji:""
                  },
                  { label:"Nuages",       value:`${meteo.clouds.all} %`,              emoji:"☁️" },
                  { label:"Temp. min",    value:`${Math.round(meteo.main.temp_min)} °C`, emoji:"❄️" },
                  { label:"Temp. max",    value:`${Math.round(meteo.main.temp_max)} °C`, emoji:"🔆" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-4 space-y-2 border rounded-2xl border-white/8"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <p className="text-white/35 text-[10px] uppercase tracking-widest">
                      {item.emoji} {item.label}
                    </p>
                    <p className="text-2xl font-light" style={{ color: theme.accent }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

          </>
        )}

        {/* ── Page vide si pas de données ── */}
        {!loading && !meteo && !erreur && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 py-16 text-white/20">
            <p className="text-6xl"></p>
            <p className="text-sm tracking-wide">Cherche une ville pour commencer</p>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="pb-4 text-center" style={{ color: `${theme.accent}33` }}>
          <p className="text-[10px] tracking-widest uppercase">
            OpenWeatherMap API • Damiti Dev © 2026
          </p>
        </footer>

      </div>
    </div>
  );
}