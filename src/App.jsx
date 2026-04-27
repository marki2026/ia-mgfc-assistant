import { useState, useEffect } from "react";

const API = "http://localhost:3000";
const WP_NUMBER = "543571587003";

// ─── FONTS ────────────────────────────────────────────────────────────────────
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap";
document.head.appendChild(FONT_LINK);

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_STYLE = document.createElement("style");
GLOBAL_STYLE.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0a0a0a; }
  ::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 2px; }
  @keyframes flicker { 0%,100%{opacity:1} 50%{opacity:.85} }
  @keyframes pulse-fire { 0%,100%{box-shadow:0 0 20px #f97316aa} 50%{box-shadow:0 0 40px #dc2626cc,0 0 80px #f9731644} }
  @keyframes slide-up { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes glow-text { 0%,100%{text-shadow:0 0 20px #f97316,0 0 40px #dc2626} 50%{text-shadow:0 0 40px #fbbf24,0 0 80px #f97316} }
  @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  .slide-up { animation: slide-up 0.4s ease forwards; }
  .glow { animation: glow-text 2s ease infinite; }
  .pulse { animation: pulse-fire 2s ease infinite; }
`;
document.head.appendChild(GLOBAL_STYLE);

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg:       "#000000",
  bg2:      "#0a0a0a",
  bg3:      "#111111",
  blue:     "#1a3a8f",
  blueL:    "#2563eb",
  fire:     "#f97316",
  gold:     "#fbbf24",
  red:      "#dc2626",
  white:    "#ffffff",
  gray:     "#64748b",
  grayL:    "#94a3b8",
  border:   "#1e1e1e",
};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function formatDateTime(iso) {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "short", day: "2-digit", month: "2-digit",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function getDaysSince(iso) {
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}
function dayLabel(iso) {
  const d = getDaysSince(iso);
  if (d === 0) return "Hoy";
  if (d === 1) return "Ayer";
  return `Hace ${d}d`;
}
function getDiasRestantes(fechaExp) {
  if (!fechaExp) return null;
  const diff = Math.ceil((new Date(fechaExp) - new Date()) / 86400000);
  return diff;
}
function getTrainingWeek(fechaInicio) {
  if (!fechaInicio) return 1;
  const days = Math.floor((new Date() - new Date(fechaInicio)) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}
function isDeloadWeek(trainingWeek, sesiones) {
  if (trainingWeek % 4 !== 0) return false;
  if (sesiones.length < 3) return false;
  const avg = sesiones.slice(0, 5).reduce((s, x) => s + (parseInt(x.energia) || 5), 0) / Math.min(sesiones.length, 5);
  return avg <= 5;
}
function computeStreak(sesiones) {
  if (!sesiones.length) return 0;
  const sorted = [...sesiones].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  let streak = 0, prev = new Date(); prev.setHours(0,0,0,0);
  for (const s of sorted) {
    const d = new Date(s.created_at); d.setHours(0,0,0,0);
    if (Math.round((prev-d)/86400000) <= 1) { streak++; prev=d; } else break;
  }
  return streak;
}

// ─── WHATSAPP ────────────────────────────────────────────────────────────────
function abrirWhatsApp(alerta, motivo, nombre, apellido) {
  const texto = encodeURIComponent(
    `🚨 *CONSULTA COACH - MG FITNESS CENTER*\n\n` +
    `👤 Socio: ${nombre} ${apellido}\n\n` +
    `⚠️ ALERTA: ${alerta || "Sin alerta"}\n\n` +
    `📋 MOTIVO: ${motivo || "Sin motivo"}\n\n` +
    `_Generado desde AI MG Fitness Center Assistant_`
  );
  window.open(`https://wa.me/${WP_NUMBER}?text=${texto}`, "_blank");
}

// ─── LOGO WATERMARK SVG ───────────────────────────────────────────────────────
function LogoWatermark() {
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none", zIndex: 0, opacity: 0.04,
      width: "600px", height: "600px",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg viewBox="0 0 300 300" width="600" height="600">
        <circle cx="150" cy="150" r="145" fill="none" stroke="#2563eb" strokeWidth="8"/>
        <circle cx="150" cy="150" r="130" fill="#1a3a8f"/>
        {/* Dumbbell */}
        <rect x="80" y="110" width="140" height="18" rx="9" fill="#888"/>
        <rect x="68" y="95" width="28" height="48" rx="6" fill="#aaa"/>
        <rect x="204" y="95" width="28" height="48" rx="6" fill="#aaa"/>
        <rect x="60" y="100" width="16" height="38" rx="4" fill="#999"/>
        <rect x="224" y="100" width="16" height="38" rx="4" fill="#999"/>
        {/* Text */}
        <text x="150" y="185" textAnchor="middle" fill="white" fontSize="32" fontWeight="900" fontFamily="Bebas Neue, sans-serif" letterSpacing="2">MG FITNESS</text>
        <rect x="95" y="192" width="110" height="26" rx="4" fill="#dc2626"/>
        <text x="150" y="210" textAnchor="middle" fill="white" fontSize="18" fontWeight="700" fontFamily="Bebas Neue, sans-serif" letterSpacing="3">CENTER</text>
        <text x="150" y="235" textAnchor="middle" fill="#fbbf24" fontSize="13" fontFamily="Barlow Condensed, sans-serif" fontWeight="600" letterSpacing="2">100% ACTITUD</text>
      </svg>
    </div>
  );
}

// ─── DÍAS RESTANTES BADGE ─────────────────────────────────────────────────────
function DiasRestantesBadge({ fechaExp }) {
  const dias = getDiasRestantes(fechaExp);
  if (dias === null) return null;
  const color = dias <= 3 ? C.red : dias <= 7 ? C.fire : dias <= 15 ? C.gold : "#22c55e";
  const label = dias < 0 ? "VENCIDO" : dias === 0 ? "VENCE HOY" : `${dias} DÍAS`;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 12px", borderRadius: "20px",
      border: `1px solid ${color}`, background: `${color}18`,
    }}>
      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: color, animation: dias <= 7 ? "pulse-fire 1.5s infinite" : "none" }} />
      <span style={{ fontSize: "11px", fontWeight: "700", color, fontFamily: "Bebas Neue", letterSpacing: "0.1em" }}>
        {label}
      </span>
    </div>
  );
}

// ─── INPUT STYLE ─────────────────────────────────────────────────────────────
const inputSt = {
  width: "100%", background: "#111", border: "1px solid #333",
  borderRadius: "6px", color: C.white, padding: "12px 14px",
  fontSize: "15px", outline: "none", fontFamily: "Barlow, sans-serif",
  transition: "border-color 0.2s",
};
const labelSt = {
  display: "block", fontSize: "11px", fontWeight: "700",
  letterSpacing: "0.15em", color: C.gray, marginBottom: "6px",
  fontFamily: "Bebas Neue", textTransform: "uppercase",
};

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: "48px", height: "26px", borderRadius: "13px",
      background: value ? C.fire : "#222",
      border: `1px solid ${value ? C.fire : "#444"}`,
      position: "relative", cursor: "pointer", transition: "all .2s", flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: "3px", left: value ? "24px" : "3px",
        width: "18px", height: "18px", borderRadius: "50%",
        background: C.white, transition: "left .2s",
        boxShadow: value ? `0 0 8px ${C.fire}` : "none",
      }} />
    </div>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ icon, label, content, isAlert, isRutina, isIntensity, extra }) {
  const borderColor = isAlert ? C.red : isRutina ? C.blue : "#222";
  const bgColor = isAlert ? "#1a0505" : "#0d0d0d";
  return (
    <div className="slide-up" style={{
      background: bgColor, border: `1px solid ${borderColor}`,
      borderRadius: "10px", padding: "16px", marginBottom: "10px",
    }}>
      <div style={{
        fontSize: "16px", fontWeight: "700", letterSpacing: "0.2em",
        color: isAlert ? C.red : C.fire, marginBottom: "10px",
        fontFamily: "Bebas Neue", borderBottom: `1px solid ${isAlert ? C.red : "#2a2a2a"}`,
        paddingBottom: "8px",
      }}>
        {icon} {label}
      </div>
      <div style={{
        fontSize: isIntensity ? "36px" : "15px",
        fontWeight: isIntensity ? "900" : "400",
        fontFamily: isIntensity ? "Bebas Neue" : "Barlow, sans-serif",
        color: isIntensity
          ? (content?.includes("ALTA") ? C.fire : content?.includes("MEDIA") ? C.gold : "#22c55e")
          : isAlert ? "#fca5a5" : C.grayL,
        lineHeight: "1.5", whiteSpace: "pre-wrap",
        textShadow: isIntensity ? `0 0 30px currentColor` : "none",
      }}>
        {content}
      </div>
      {extra}
    </div>
  );
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────
const SECTIONS = [
  { key: "decision",     label: "DECISIÓN PRINCIPAL",    icon: "⚡" },
  { key: "intensidad",   label: "INTENSIDAD RECOMENDADA", icon: "🔥" },
  { key: "descanso",     label: "AJUSTE DE DESCANSO",     icon: "😴" },
  { key: "alimentacion", label: "AJUSTE DE ALIMENTACIÓN", icon: "🥗" },
  { key: "alerta",       label: "ALERTA",                 icon: "⚠️" },
  { key: "consultar",    label: "CONSULTAR A COACH",      icon: "👨‍💼" },
  { key: "motivo",       label: "MOTIVO",                 icon: "📋" },
  { key: "rutina",       label: "RUTINA DEL DÍA",         icon: "🏋️" },
];

const SYSTEM_PROMPT = `Actúa como un sistema experto en entrenamiento físico y toma de decisiones.
Tu rol es ser un "AI Coach de decisiones", no motivador.
IMPORTANTE: Trabaja SOLO con los valores predefinidos.

VALORES PERMITIDOS:
DESCANSO: 1h, 2h, 3h, 4h, 5h, 6h, 7h, 8h+
ENERGÍA: 1 a 10
ALIMENTACIÓN: MUY MALA, MALA, NORMAL, BIEN, MUY BIEN
TIEMPO DISPONIBLE: 30min, 45min, 60min, 75min, 90min, 120min+

REGLAS:
- Da UNA decisión clara y sé directo
- Analizá el historial para detectar sobreentrenamiento, fatiga acumulada, grupos repetidos en menos de 48h
- Si mismo grupo muscular trabajado hace menos de 48h: emitir ALERTA
- Si más de 6 días consecutivos: recomendar recuperación
- Si el usuario es MUJER EN ETAPA MENSTRUAL: priorizar ejercicios de baja-media intensidad, movilidad, core suave, evitar esfuerzo máximo y ejercicios de alto impacto. Mencionarlo en el MOTIVO.
- Si el usuario es MUJER (sin etapa menstrual): considerar variaciones hormonales normales al recomendar intensidad
- Si hay dolor, considerarlo siempre

FORMATO (respetar etiquetas exactas):

DECISIÓN PRINCIPAL:
(acción concreta)

INTENSIDAD RECOMENDADA:
BAJA / MEDIA / ALTA

AJUSTE DE DESCANSO:
(1h a 8h+)

AJUSTE DE ALIMENTACIÓN:
(MUY MALA a MUY BIEN)

ALERTA:
(si aplica, sino: Ninguna)

CONSULTAR A COACH:
SÍ / NO

MOTIVO:
(máximo 2 líneas)

{{rutina_placeholder}}

Sin texto extra.`;

const RUTINA_PROMPT = `
Luego del MOTIVO agregar:
---
RUTINA DEL DÍA:
(Lista numerada. Nombre · Series x Reps · Nota si aplica.)`;

function parseResponse(text) {
  const parsed = {};
  SECTIONS.forEach((s, i) => {
    const start = text.indexOf(s.label + ":");
    if (start === -1) return;
    const nextLabels = SECTIONS.slice(i+1).map(ns => ns.label + ":");
    let end = text.length;
    nextLabels.forEach(nl => { const idx = text.indexOf(nl, start); if (idx !== -1 && idx < end) end = idx; });
    parsed[s.key] = text.slice(start + s.label.length + 1, end).replace(/^---\s*/gm, "").trim();
  });
  return parsed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [dni, setDni]           = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleLogin = async () => {
    if (!dni || !password) { setError("Ingresá tu DNI y contraseña."); return; }
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dni.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (data.success) { onLogin(data.user, data.alertaVencimiento); }
      else { setError(data.error || "Credenciales inválidas"); }
    } catch { setError("No se puede conectar con el servidor."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      <LogoWatermark />

      {/* Fire gradient bg */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 100%, #7c1d0a22 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }} className="slide-up">

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ display: "inline-block", position: "relative" }}>
            <svg viewBox="0 0 200 200" width="120" height="120" className="pulse">
              <circle cx="100" cy="100" r="95" fill="none" stroke="#2563eb" strokeWidth="5"/>
              <circle cx="100" cy="100" r="85" fill="#1a3a8f"/>
              <rect x="48" y="72" width="104" height="14" rx="7" fill="#888"/>
              <rect x="40" y="60" width="20" height="36" rx="5" fill="#aaa"/>
              <rect x="140" y="60" width="20" height="36" rx="5" fill="#aaa"/>
              <rect x="34" y="65" width="12" height="26" rx="3" fill="#999"/>
              <rect x="154" y="65" width="12" height="26" rx="3" fill="#999"/>
              <text x="100" y="128" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="Bebas Neue, Impact, sans-serif" letterSpacing="1">MG FITNESS</text>
              <rect x="60" y="132" width="80" height="20" rx="3" fill="#dc2626"/>
              <text x="100" y="147" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="Bebas Neue, sans-serif" letterSpacing="2">CENTER</text>
              <text x="100" y="168" textAnchor="middle" fill="#fbbf24" fontSize="9" fontFamily="Barlow Condensed, sans-serif" fontWeight="600" letterSpacing="2">100% ACTITUD</text>
            </svg>
          </div>

          <div style={{ marginTop: "16px" }}>
            <h1 style={{
              fontFamily: "Bebas Neue, Impact, sans-serif",
              fontSize: "42px", letterSpacing: "3px", lineHeight: "1",
              background: "linear-gradient(180deg, #ffffff 0%, #f97316 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              textShadow: "none",
            }}>
              AI ASSISTANT
            </h1>
            <div style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "14px", color: C.gold, fontWeight: "700", letterSpacing: "4px", marginTop: "4px" }}>
              DECISIONES CON 100% ACTITUD!
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: "12px", padding: "28px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelSt}>DNI</label>
            <input type="text" value={dni} onChange={e => setDni(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Número de documento" style={inputSt} autoComplete="off" />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={labelSt}>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="••••••••" style={inputSt} autoComplete="off" />
          </div>

          {error && (
            <div style={{ marginBottom: "16px", padding: "10px 14px", background: "#1a0505", border: `1px solid ${C.red}`, borderRadius: "6px", color: "#fca5a5", fontSize: "13px", fontFamily: "Barlow, sans-serif" }}>
              {error}
            </div>
          )}

          <button onClick={handleLogin} disabled={loading} className={loading ? "" : "pulse"} style={{
            width: "100%", padding: "16px",
            background: loading ? "#222" : `linear-gradient(135deg, ${C.red} 0%, ${C.fire} 100%)`,
            border: "none", borderRadius: "8px", color: C.white,
            fontSize: "18px", fontWeight: "900", letterSpacing: "3px",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "Bebas Neue, sans-serif",
          }}>
            {loading ? "VERIFICANDO..." : "→ INGRESAR"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "11px", color: "#333", fontFamily: "Barlow, sans-serif" }}>
          Almafuerte · Córdoba · 3571 58 7003
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({ user, onLogout }) {
  const [usuarios, setUsuarios]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [renewLoading, setRenew]  = useState(false);
  const [newUser, setNewUser]     = useState({ dni: "", nombre: "", apellido: "", password: "", role: "usuario" });
  const [creating, setCreating]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg]             = useState(null);

  useEffect(() => {
    fetch(`${API}/api/admin/usuarios`)
      .then(r => r.json())
      .then(d => { if (d.success) setUsuarios(d.usuarios); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const renovar = async (userId) => {
    setRenew(userId);
    try {
      const res  = await fetch(`${API}/api/admin/renovar`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, fecha_expiracion: data.nuevaFecha } : u));
        setMsg("✅ Suscripción renovada por 30 días");
        setTimeout(() => setMsg(null), 3000);
      }
    } catch {}
    setRenew(null);
  };

  const crearUsuario = async () => {
    if (!newUser.dni || !newUser.nombre || !newUser.apellido || !newUser.password) {
      setMsg("⚠️ Completá todos los campos"); setTimeout(() => setMsg(null), 3000); return;
    }
    setCreating(true);
    try {
      const res  = await fetch(`${API}/api/admin/crear-usuario`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        setUsuarios(prev => [data.usuario, ...prev]);
        setNewUser({ dni: "", nombre: "", apellido: "", password: "", role: "usuario" });
        setShowCreate(false);
        setMsg("✅ Usuario creado correctamente");
        setTimeout(() => setMsg(null), 3000);
      } else { setMsg(`❌ ${data.error}`); setTimeout(() => setMsg(null), 3000); }
    } catch {}
    setCreating(false);
  };

  const hdr = { fontFamily: "Bebas Neue, sans-serif", letterSpacing: "2px" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "Barlow, sans-serif", position: "relative" }}>
      <LogoWatermark />

      {/* Header */}
      <div style={{ background: "#0d0d0d", borderBottom: "2px solid #dc2626", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ ...hdr, fontSize: "24px", background: `linear-gradient(90deg, ${C.white}, ${C.fire})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PANEL ADMINISTRADOR
          </div>
          <div style={{ fontSize: "11px", color: C.gray }}>MG Fitness Center · {user.nombre} {user.apellido}</div>
        </div>
        <button onClick={onLogout} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.gray}`, borderRadius: "6px", color: C.gray, fontSize: "12px", cursor: "pointer", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "1px" }}>SALIR</button>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px 16px", position: "relative", zIndex: 1 }}>

        {msg && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "#0d2010", border: "1px solid #22c55e", borderRadius: "8px", color: "#86efac", fontSize: "14px" }}>
            {msg}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
          {[
            { l: "SOCIOS TOTALES",  v: usuarios.length },
            { l: "ACTIVOS",         v: usuarios.filter(u => getDiasRestantes(u.fecha_expiracion) > 0).length },
            { l: "POR VENCER (7d)", v: usuarios.filter(u => { const d = getDiasRestantes(u.fecha_expiracion); return d !== null && d >= 0 && d <= 7; }).length },
          ].map(s => (
            <div key={s.l} style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "36px", color: C.fire }}>{s.v}</div>
              <div style={{ fontSize: "10px", color: C.gray, letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Crear usuario */}
        <div style={{ marginBottom: "20px" }}>
          <button onClick={() => setShowCreate(!showCreate)} style={{
            padding: "12px 24px", background: `linear-gradient(135deg, ${C.blue}, ${C.blueL})`,
            border: "none", borderRadius: "8px", color: C.white,
            fontSize: "16px", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "2px",
            cursor: "pointer",
          }}>
            {showCreate ? "✕ CANCELAR" : "+ NUEVO SOCIO"}
          </button>
        </div>

        {showCreate && (
          <div className="slide-up" style={{ background: "#0d0d0d", border: `1px solid ${C.blueL}`, borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "20px", color: C.blueL, marginBottom: "16px", letterSpacing: "2px" }}>REGISTRAR NUEVO SOCIO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              {[
                { name: "dni",      label: "DNI",       placeholder: "Número de documento" },
                { name: "password", label: "CONTRASEÑA", placeholder: "Contraseña inicial", type: "password" },
                { name: "nombre",   label: "NOMBRE",    placeholder: "Nombre" },
                { name: "apellido", label: "APELLIDO",  placeholder: "Apellido" },
              ].map(f => (
                <div key={f.name}>
                  <label style={labelSt}>{f.label}</label>
                  <input type={f.type || "text"} value={newUser[f.name]}
                    onChange={e => setNewUser(p => ({ ...p, [f.name]: e.target.value }))}
                    placeholder={f.placeholder} style={inputSt} />
                </div>
              ))}
              <div>
                <label style={labelSt}>ROL</label>
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))} style={{ ...inputSt }}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>
            <button onClick={crearUsuario} disabled={creating} style={{
              marginTop: "16px", padding: "12px 28px",
              background: `linear-gradient(135deg, ${C.red}, ${C.fire})`,
              border: "none", borderRadius: "8px", color: C.white,
              fontSize: "16px", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "2px",
              cursor: creating ? "not-allowed" : "pointer",
            }}>
              {creating ? "CREANDO..." : "CREAR SOCIO"}
            </button>
          </div>
        )}

        {/* Lista usuarios */}
        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "18px", color: C.gray, letterSpacing: "2px", marginBottom: "12px" }}>
          SOCIOS REGISTRADOS
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: C.gray }}>Cargando...</div>
        ) : (
          usuarios.map(u => {
            const dias    = getDiasRestantes(u.fecha_expiracion);
            const vencido = dias !== null && dias < 0;
            const urgente = dias !== null && dias >= 0 && dias <= 7;
            const isOpen  = selected === u.id;

            return (
              <div key={u.id} style={{
                background: "#0d0d0d",
                border: `1px solid ${vencido ? C.red : urgente ? C.fire : "#222"}`,
                borderRadius: "10px", marginBottom: "10px", overflow: "hidden",
              }}>
                <div onClick={() => setSelected(isOpen ? null : u.id)}
                  style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "18px", color: C.white, letterSpacing: "1px" }}>
                      {u.apellido?.toUpperCase()}, {u.nombre}
                    </div>
                    <div style={{ fontSize: "12px", color: C.gray, marginTop: "2px" }}>
                      DNI: {u.dni} · {u.role === "admin" ? "👑 Admin" : "👤 Socio"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <DiasRestantesBadge fechaExp={u.fecha_expiracion} />
                    <span style={{ color: C.gray, fontSize: "12px" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ padding: "16px", borderTop: "1px solid #1a1a1a" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                      {[
                        { l: "INICIO",      v: u.fecha_inicio ? new Date(u.fecha_inicio).toLocaleDateString("es-AR") : "—" },
                        { l: "VENCIMIENTO", v: u.fecha_expiracion ? new Date(u.fecha_expiracion).toLocaleDateString("es-AR") : "—" },
                        { l: "SEMANA",      v: `#${getTrainingWeek(u.fecha_inicio)}` },
                        { l: "DÍAS REST.",  v: dias !== null ? (dias < 0 ? "VENCIDO" : `${dias}d`) : "—" },
                      ].map(s => (
                        <div key={s.l} style={{ background: "#111", borderRadius: "6px", padding: "10px" }}>
                          <div style={{ fontSize: "9px", color: C.gray, letterSpacing: "0.1em", fontFamily: "Bebas Neue, sans-serif" }}>{s.l}</div>
                          <div style={{ fontSize: "16px", fontFamily: "Bebas Neue, sans-serif", color: C.white, marginTop: "2px" }}>{s.v}</div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => renovar(u.id)}
                      disabled={renewLoading === u.id}
                      style={{
                        padding: "10px 20px",
                        background: renewLoading === u.id ? "#222" : `linear-gradient(135deg, #16a34a, #15803d)`,
                        border: "none", borderRadius: "6px", color: C.white,
                        fontSize: "14px", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "2px",
                        cursor: renewLoading === u.id ? "not-allowed" : "pointer",
                      }}>
                      {renewLoading === u.id ? "RENOVANDO..." : "🔄 RENOVAR 30 DÍAS"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COACH
// ═══════════════════════════════════════════════════════════════════════════════
function Coach({ user, onLogout }) {
  const [tab, setTab]           = useState("form");
  const [sesiones, setSesiones] = useState([]);
  const [expandedId, setExp]    = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [form, setForm] = useState({
    peso: "", descanso: "7h", energia: "7",
    entrenamiento: "", dolor: "", alimentacion: "NORMAL",
    tiempo: "60min", quiereRutina: false,
    sexo: "", etapaMenstrual: false,
  });

  useEffect(() => {
    fetch(`${API}/api/sesiones/${user.id}`)
      .then(r => r.json())
      .then(d => { if (d.success) setSesiones(d.sesiones); })
      .catch(() => {});
  }, [user.id]);

  const trainingWeek = getTrainingWeek(user.fecha_inicio);
  const deload       = isDeloadWeek(trainingWeek, sesiones);
  const streak       = computeStreak(sesiones);
  const diasRestantes = getDiasRestantes(user.fecha_expiracion);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const buildHistoryCtx = () => {
    if (!sesiones.length) return "Sin historial previo.";
    return sesiones.slice(0, 10).map(s =>
      `• ${dayLabel(s.created_at)} — Sem ${s.training_week}${s.is_deload ? "[DESCARGA]" : ""} — ${s.entrenamiento} | E:${s.energia} D:${s.descanso} A:${s.alimentacion}`
    ).join("\n");
  };

  const handleSubmit = async () => {
    if (!form.peso || !form.entrenamiento) { setError("Completá peso y entrenamiento."); return; }
    setError(null); setLoading(true); setResult(null);

    const now = new Date();
    const sexoInfo = form.sexo === "mujer"
      ? `Sexo: Mujer${form.etapaMenstrual ? " — EN ETAPA MENSTRUAL ACTIVA (considerar reducción de intensidad, evitar esfuerzo máximo, priorizar movilidad y ejercicios de bajo impacto si corresponde)" : ""}`
      : `Sexo: ${form.sexo === "hombre" ? "Hombre" : "No especificado"}`;

    const userMsg = `
Fecha: ${formatDateTime(now.toISOString())}
Semana de entrenamiento: ${trainingWeek}${deload ? " — SEMANA DE DESCARGA" : ""}
Días consecutivos: ${streak}
${deload ? "⚠️ SEMANA DE DESCARGA ACTIVA — reducir intensidad al 50-60%" : ""}

DATOS DE HOY:
Peso: ${form.peso}kg | Descanso: ${form.descanso} | Energía: ${form.energia}
${sexoInfo}
Entrenamiento: ${form.entrenamiento}
Dolor: ${form.dolor || "Ninguno"} | Alimentación: ${form.alimentacion}
Tiempo: ${form.tiempo}
Objetivo: Ganar masa muscular, bajo % de grasa.

HISTORIAL:
${buildHistoryCtx()}
`.trim();

    const system = SYSTEM_PROMPT.replace("{{rutina_placeholder}}", form.quiereRutina ? RUTINA_PROMPT : "");

    try {
      const res  = await fetch(`${API}/api/coach`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system, userMsg }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.text);

      fetch(`${API}/api/sesion`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, sesion: {
          entrenamiento: form.entrenamiento, peso: parseFloat(form.peso),
          descanso: form.descanso, energia: parseInt(form.energia),
          alimentacion: form.alimentacion, dolor: form.dolor || null,
          tiempo: form.tiempo, response_text: data.text,
          training_week: trainingWeek, is_deload: deload, streak,
        }}),
      }).then(r => r.json()).then(d => { if (d.success) setSesiones(p => [d.sesion, ...p]); }).catch(()=>{});
    } catch (err) { setError(err.message || "Error al conectar."); }
    setLoading(false);
  };

  const parsed = result ? parseResponse(result) : {};
  const consultarCoach = parsed.consultar?.includes("SÍ");

  const byWeek = sesiones.reduce((acc, s) => {
    const k = `Semana ${s.training_week}${s.is_deload ? " — DESCARGA" : ""}`;
    (acc[k] = acc[k] || []).push(s); return acc;
  }, {});

  const tabSt = (active) => ({
    flex: 1, padding: "11px", border: "none", borderRadius: "6px",
    background: active ? `linear-gradient(135deg, ${C.red}, ${C.fire})` : "#111",
    color: active ? C.white : C.gray, fontSize: "14px", fontWeight: "700",
    letterSpacing: "2px", cursor: "pointer", fontFamily: "Bebas Neue, sans-serif",
    transition: "all 0.2s",
  });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "Barlow, sans-serif", position: "relative" }}>
      <LogoWatermark />
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at 50% 100%, #7c1d0a15 0%, transparent 60%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ background: "#0a0a0a", borderBottom: "2px solid #1a1a1a", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "22px", letterSpacing: "2px", background: `linear-gradient(90deg, ${C.white}, ${C.fire})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            MG FITNESS CENTER
          </div>
          <div style={{ fontSize: "11px", color: C.gold, fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "3px", fontWeight: "700" }}>
            AI ASSISTANT · 100% ACTITUD
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <DiasRestantesBadge fechaExp={user.fecha_expiracion} />
          <button onClick={onLogout} style={{ padding: "7px 14px", background: "transparent", border: "1px solid #333", borderRadius: "6px", color: C.gray, fontSize: "12px", cursor: "pointer", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "1px" }}>SALIR</button>
        </div>
      </div>

      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "20px 16px", position: "relative", zIndex: 1 }}>

        {/* Welcome */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "28px", color: C.white, letterSpacing: "2px" }}>
            HOLA, {user.nombre?.toUpperCase()} 💪
          </div>
          <div style={{ fontSize: "13px", color: C.gray }}>
            {user.apellido} · DNI {user.dni}
          </div>
        </div>

        {/* Deload banner */}
        {deload && (
          <div className="slide-up" style={{ marginBottom: "16px", padding: "12px 16px", background: "#0a1628", border: `1px solid ${C.blueL}`, borderRadius: "8px" }}>
            <span style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "16px", color: C.blueL, letterSpacing: "2px" }}>
              🔄 SEMANA {trainingWeek} — DESCARGA ACTIVA · Bajá intensidad y priorizá recuperación
            </span>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "18px" }}>
          {[
            { l: "SESIONES", v: sesiones.length },
            { l: "RACHA",    v: `${streak}d` },
            { l: "SEM.",     v: `#${trainingWeek}` },
          ].map(s => (
            <div key={s.l} style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "28px", color: C.fire }}>{s.v}</div>
              <div style={{ fontSize: "9px", color: C.gray, letterSpacing: "0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button style={tabSt(tab === "form")}    onClick={() => setTab("form")}>📋 HOY</button>
          <button style={tabSt(tab === "history")} onClick={() => setTab("history")}>
            📅 HISTORIAL {sesiones.length > 0 && `(${sesiones.length})`}
          </button>
        </div>

        {/* ══ FORM ══ */}
        {tab === "form" && (
          <>
            <div style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

                <div>
                  <label style={labelSt}>Peso (kg)</label>
                  <input name="peso" value={form.peso} onChange={handleChange} placeholder="76.5" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Descanso</label>
                  <select name="descanso" value={form.descanso} onChange={handleChange} style={inputSt}>
                    {["1h","2h","3h","4h","5h","6h","7h","8h+"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Energía (1-10)</label>
                  <select name="energia" value={form.energia} onChange={handleChange} style={inputSt}>
                    {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelSt}>Alimentación</label>
                  <select name="alimentacion" value={form.alimentacion} onChange={handleChange} style={inputSt}>
                    {["MUY MALA","MALA","NORMAL","BIEN","MUY BIEN"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelSt}>Entrenamiento del día</label>
                  <input name="entrenamiento" value={form.entrenamiento} onChange={handleChange}
                    placeholder="ej: musculación, glúteos y femorales" style={inputSt} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelSt}>Dolor (opcional)</label>
                  <input name="dolor" value={form.dolor} onChange={handleChange}
                    placeholder="ej: hombro derecho leve / ninguno" style={inputSt} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={labelSt}>Sexo</label>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {["hombre", "mujer"].map(s => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, sexo: s, etapaMenstrual: s === "hombre" ? false : f.etapaMenstrual }))}
                        style={{
                          flex: 1, padding: "12px",
                          background: form.sexo === s ? (s === "hombre" ? `linear-gradient(135deg,${C.blue},${C.blueL})` : "linear-gradient(135deg,#be185d,#ec4899)") : "#111",
                          border: `1px solid ${form.sexo === s ? (s === "hombre" ? C.blueL : "#ec4899") : "#333"}`,
                          borderRadius: "8px", color: C.white,
                          fontSize: "15px", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "2px",
                          cursor: "pointer", transition: "all 0.2s",
                        }}>
                        {s === "hombre" ? "♂ HOMBRE" : "♀ MUJER"}
                      </button>
                    ))}
                  </div>
                </div>

                {form.sexo === "mujer" && (
                  <div style={{ gridColumn: "1/-1", background: "#1a0a14", border: "1px solid #9d174d", borderRadius: "8px", padding: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "15px", color: "#f9a8d4", letterSpacing: "1px" }}>
                          🌸 ETAPA MENSTRUAL ACTIVA
                        </div>
                        <div style={{ fontSize: "12px", color: "#9d174d", marginTop: "2px" }}>
                          La IA adaptará la rutina e intensidad
                        </div>
                      </div>
                      <Toggle value={form.etapaMenstrual} onChange={() => setForm(f => ({ ...f, etapaMenstrual: !f.etapaMenstrual }))} />
                    </div>
                  </div>
                )}

                <div>
                  <label style={labelSt}>Tiempo disponible</label>
                  <select name="tiempo" value={form.tiempo} onChange={handleChange} style={inputSt}>
                    {["30min","45min","60min","75min","90min","120min+"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "22px" }}>
                  <Toggle value={form.quiereRutina} onChange={() => setForm(f => ({ ...f, quiereRutina: !f.quiereRutina }))} />
                  <span style={{ fontSize: "12px", color: C.grayL, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "1px" }}>INCLUIR RUTINA</span>
                </div>

              </div>

              {sesiones.length > 0 && (
                <div style={{ marginTop: "16px", padding: "12px", background: "#0a0a0a", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
                  <div style={{ fontSize: "10px", color: C.gray, letterSpacing: "0.15em", marginBottom: "8px", fontFamily: "Bebas Neue, sans-serif" }}>
                    🕐 ÚLTIMAS SESIONES
                  </div>
                  {sesiones.slice(0, 3).map(s => (
                    <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #111" }}>
                      <span style={{ fontSize: "12px", color: C.grayL }}>{s.entrenamiento}</span>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {s.is_deload && <span style={{ fontSize: "9px", color: C.blueL, border: `1px solid ${C.blueL}`, borderRadius: "3px", padding: "1px 4px" }}>DESC</span>}
                        <span style={{ fontSize: "11px", color: C.gray }}>Sem {s.training_week} · {dayLabel(s.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div style={{ marginTop: "14px", padding: "10px 14px", background: "#1a0505", border: `1px solid ${C.red}`, borderRadius: "6px", color: "#fca5a5", fontSize: "13px" }}>
                  {error}
                </div>
              )}

              <button onClick={handleSubmit} disabled={loading} style={{
                marginTop: "18px", width: "100%", padding: "16px",
                background: loading ? "#222" : `linear-gradient(135deg, ${C.red} 0%, ${C.fire} 100%)`,
                border: "none", borderRadius: "8px", color: C.white,
                fontSize: "20px", fontWeight: "900", letterSpacing: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "Bebas Neue, sans-serif",
                boxShadow: loading ? "none" : `0 4px 24px ${C.red}66`,
              }}>
                {loading ? "ANALIZANDO..." : "→ OBTENER DECISIÓN"}
              </button>
            </div>

            {/* Results */}
            {result && SECTIONS.map(s => {
              const content = parsed[s.key];
              if (!content) return null;
              const isAlert    = s.key === "alerta" && content !== "Ninguna";
              const isConsultar = s.key === "consultar";

              return (
                <SectionCard key={s.key}
                  icon={s.icon} label={s.label} content={content}
                  isAlert={isAlert} isRutina={s.key === "rutina"}
                  isIntensity={s.key === "intensidad"}
                  extra={isConsultar && consultarCoach ? (
                    <div style={{ marginTop: "14px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button onClick={() => abrirWhatsApp(parsed.alerta, parsed.motivo, user.nombre, user.apellido)} style={{
                        padding: "10px 18px", background: "linear-gradient(135deg,#16a34a,#15803d)",
                        border: "none", borderRadius: "6px", color: C.white,
                        fontSize: "14px", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "2px",
                        cursor: "pointer",
                      }}>
                        💬 CONTACTAR COACH
                      </button>
                      <button style={{ padding: "10px 18px", background: "transparent", border: "1px solid #333", borderRadius: "6px", color: C.gray, fontSize: "14px", fontFamily: "Bebas Neue, sans-serif", letterSpacing: "1px", cursor: "pointer" }}>
                        NO POR AHORA
                      </button>
                    </div>
                  ) : null}
                />
              );
            })}
          </>
        )}

        {/* ══ HISTORIAL ══ */}
        {tab === "history" && (
          <div>
            {sesiones.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 24px", color: C.gray }}>Sin sesiones registradas aún.</div>
            ) : (
              Object.entries(byWeek).reverse().map(([weekLabel, entries]) => (
                <div key={weekLabel} style={{ marginBottom: "24px" }}>
                  <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "14px", letterSpacing: "2px", color: weekLabel.includes("DESCARGA") ? C.blueL : C.fire, marginBottom: "10px" }}>
                    📅 {weekLabel} · {entries.length} sesión{entries.length !== 1 ? "es" : ""}
                  </div>

                  {entries.map(s => {
                    const hp      = parseResponse(s.response_text || "");
                    const isOpen  = expandedId === s.id;
                    const hasAlert = hp.alerta && hp.alerta !== "Ninguna";
                    const intColor = hp.intensidad?.includes("ALTA") ? C.fire : hp.intensidad?.includes("MEDIA") ? C.gold : "#22c55e";

                    return (
                      <div key={s.id} style={{ background: "#0d0d0d", border: `1px solid ${hasAlert ? C.red : "#1a1a1a"}`, borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
                        <div onClick={() => setExp(isOpen ? null : s.id)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: "16px", color: C.white, letterSpacing: "1px" }}>{s.entrenamiento}</div>
                            <div style={{ fontSize: "11px", color: C.gray, marginTop: "2px" }}>
                              {formatDateTime(s.created_at)} · Sem {s.training_week}{s.is_deload ? " [DESC]" : ""} · Racha {s.streak}d
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {hp.intensidad && <span style={{ fontSize: "12px", fontFamily: "Bebas Neue, sans-serif", color: intColor, border: `1px solid ${intColor}`, borderRadius: "4px", padding: "2px 8px" }}>{hp.intensidad}</span>}
                            {hasAlert && <span>⚠️</span>}
                            <span style={{ color: C.gray, fontSize: "11px" }}>{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", borderTop: "1px solid #1a1a1a" }}>
                          {[{l:"ENERGÍA",v:s.energia},{l:"DESCANSO",v:s.descanso},{l:"ALIMENT.",v:s.alimentacion},{l:"TIEMPO",v:s.tiempo}]
                            .map((st, i, arr) => (
                              <div key={st.l} style={{ flex: 1, padding: "8px 4px", textAlign: "center", borderRight: i < arr.length-1 ? "1px solid #1a1a1a" : "none" }}>
                                <div style={{ fontSize: "9px", color: C.gray, fontFamily: "Bebas Neue, sans-serif" }}>{st.l}</div>
                                <div style={{ fontSize: "13px", color: C.grayL, fontWeight: "700" }}>{st.v}</div>
                              </div>
                            ))}
                        </div>

                        {isOpen && (
                          <div style={{ padding: "16px", borderTop: "1px solid #1a1a1a" }}>
                            {SECTIONS.map(sec => {
                              const content = hp[sec.key];
                              if (!content) return null;
                              return (
                                <div key={sec.key} style={{ marginBottom: "12px" }}>
                                  <div style={{ fontSize: "10px", color: C.gray, fontFamily: "Bebas Neue, sans-serif", letterSpacing: "0.1em", marginBottom: "4px" }}>{sec.icon} {sec.label}</div>
                                  <div style={{ fontSize: "13px", color: C.grayL, lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{content}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser]                   = useState(null);
  const [alertaVenc, setAlertaVenc]       = useState(null);
  const [alertaVisible, setAlertaVisible] = useState(false);

  const handleLogin = (userData, alerta) => {
    setUser(userData);
    if (alerta) { setAlertaVenc(alerta); setAlertaVisible(true); }
  };
  const handleLogout = () => { setUser(null); setAlertaVenc(null); setAlertaVisible(false); };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <>
      {alertaVisible && alertaVenc && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: `linear-gradient(90deg, #7c1d0a, #92400e)`,
          padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "Bebas Neue, sans-serif", borderBottom: `2px solid ${C.fire}`,
        }}>
          <span style={{ fontSize: "16px", color: C.gold, letterSpacing: "2px" }}>⚠️ {alertaVenc}</span>
          <button onClick={() => setAlertaVisible(false)} style={{ background: "transparent", border: "none", color: C.gold, fontSize: "18px", cursor: "pointer" }}>✕</button>
        </div>
      )}
      <div style={{ paddingTop: alertaVisible && alertaVenc ? "48px" : 0 }}>
        {user.role === "admin"
          ? <AdminPanel user={user} onLogout={handleLogout} />
          : <Coach user={user} onLogout={handleLogout} />
        }
      </div>
    </>
  );
}