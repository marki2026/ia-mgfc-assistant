import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WP_NUMBER = "543571587003";

// ─── FONTS & STYLES ───────────────────────────────────────────────────────────
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700;900&family=Barlow:wght@400;500;600&display=swap";
document.head.appendChild(FONT_LINK);

const GLOBAL_STYLE = document.createElement("style");
GLOBAL_STYLE.textContent = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #0a0a0a; }
  ::-webkit-scrollbar-thumb { background: #dc2626; border-radius: 2px; }
  @keyframes pulse-fire { 0%,100%{filter:drop-shadow(0 0 12px #f97316) drop-shadow(0 0 24px #dc262688)} 50%{filter:drop-shadow(0 0 24px #fbbf24) drop-shadow(0 0 48px #f9731666)} }
  @keyframes pulse-btn { 0%,100%{box-shadow:0 0 20px #f97316aa} 50%{box-shadow:0 0 40px #dc2626cc,0 0 80px #f9731644} }
  @keyframes slide-up { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes glow-ring { 0%,100%{box-shadow:0 0 20px #f97316,0 0 40px #dc262644} 50%{box-shadow:0 0 40px #fbbf24,0 0 80px #f9731644} }
  .slide-up { animation: slide-up 0.4s ease forwards; }
  .pulse-fire { animation: pulse-fire 2.5s ease infinite; }
  .pulse-btn { animation: pulse-btn 2s ease infinite; }
  .fadeIn { animation: fadeIn 0.3s ease forwards; }
  .glow-ring { animation: glow-ring 2s ease infinite; }
  select option { background: #111; color: #fff; }
`;
document.head.appendChild(GLOBAL_STYLE);

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#000", bg2: "#0a0a0a", bg3: "#111",
  blue: "#1a3a8f", blueL: "#2563eb",
  fire: "#f97316", gold: "#fbbf24", red: "#dc2626",
  white: "#fff", gray: "#64748b", grayL: "#94a3b8",
  green: "#22c55e", pink: "#ec4899",
};

// ─── DEVICE & SESSION ────────────────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem("mgfc_device_id");
  if (!id) { id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("mgfc_device_id", id); }
  return id;
}
function saveSession(user, token) { localStorage.setItem("mgfc_user", JSON.stringify(user)); localStorage.setItem("mgfc_token", token); }
function loadSession() { try { const u = JSON.parse(localStorage.getItem("mgfc_user")||"null"), t = localStorage.getItem("mgfc_token"); return u && t ? {user:u,token:t} : null; } catch { return null; } }
function clearSession() { localStorage.removeItem("mgfc_user"); localStorage.removeItem("mgfc_token"); }

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function formatDateTime(iso) { return new Date(iso).toLocaleString("es-AR",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
function formatDate(iso) { return new Date(iso).toLocaleDateString("es-AR"); }
function getDaysSince(iso) { return Math.floor((Date.now()-new Date(iso))/86400000); }
function dayLabel(iso) { const d=getDaysSince(iso); return d===0?"Hoy":d===1?"Ayer":`Hace ${d}d`; }
function getDiasRestantes(fechaExp) { if(!fechaExp) return null; return Math.ceil((new Date(fechaExp)-new Date())/86400000); }
function getTrainingWeek(fechaInicio) { if(!fechaInicio) return 1; const days=Math.floor((new Date()-new Date(fechaInicio))/86400000); return Math.max(1,Math.floor(days/7)+1); }
function isDeloadWeek(trainingWeek,sesiones) { if(trainingWeek%4!==0) return false; if(sesiones.length<3) return false; const avg=sesiones.slice(0,5).reduce((s,x)=>s+(parseInt(x.energia)||5),0)/Math.min(sesiones.length,5); return avg<=5; }
function computeStreak(sesiones) { if(!sesiones.length) return 0; const sorted=[...sesiones].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); let streak=0,prev=new Date(); prev.setHours(0,0,0,0); for(const s of sorted){const d=new Date(s.created_at);d.setHours(0,0,0,0);if(Math.round((prev-d)/86400000)<=1){streak++;prev=d;}else break;} return streak; }
function getHorarioLabel(hora) { if(hora>=5&&hora<12) return "🌅 Mañana"; if(hora>=12&&hora<17) return "☀️ Tarde"; if(hora>=17&&hora<21) return "🌆 Noche"; return "🌙 Madrugada"; }

// ─── DISCIPLINAS ──────────────────────────────────────────────────────────────
const DISCIPLINAS = [
  "Ninguna / Solo gym","Fútbol","Básquet","Tenis","Pádel",
  "Natación","Ciclismo","Running","Crossfit","Artes marciales / MMA",
  "Vóley","Rugby","Hockey","Atletismo","Otra"
];

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
function abrirWhatsApp(alerta, motivo, nombre, apellido) {
  const texto = encodeURIComponent(`🚨 *CONSULTA COACH - MG FITNESS CENTER*\n\n👤 Socio: ${nombre} ${apellido}\n\n⚠️ ALERTA: ${alerta||"Sin alerta"}\n\n📋 MOTIVO: ${motivo||"Sin motivo"}\n\n_Generado desde AI MG Fitness Center Assistant_`);
  window.open(`https://wa.me/${WP_NUMBER}?text=${texto}`,"_blank");
}

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size=140, pulse=true }) {
  return (
    <img src="/logo.png" alt="MG Fitness Center"
      className={pulse ? "pulse-fire" : ""}
      style={{ width: size, height: "auto", objectFit: "contain", display: "block" }}
    />
  );
}

function LogoWatermark() {
  return (
    <div style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", pointerEvents:"none", zIndex:0, opacity:0.06 }}>
      <img src="/logo.png" alt="" style={{ width:"500px", height:"auto" }} />
    </div>
  );
}

// ─── DÍAS RESTANTES BADGE ─────────────────────────────────────────────────────
function DiasRestantesBadge({ fechaExp }) {
  const dias = getDiasRestantes(fechaExp);
  if (dias === null) return null;
  const color = dias<0?C.red:dias<=3?C.red:dias<=7?C.fire:dias<=15?C.gold:C.green;
  const label = dias<0?"VENCIDO":dias===0?"VENCE HOY":`${dias} DÍAS`;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", padding:"4px 12px", borderRadius:"20px", border:`1px solid ${color}`, background:`${color}18` }}>
      <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:color }} />
      <span style={{ fontSize:"11px", fontWeight:"700", color, fontFamily:"Bebas Neue", letterSpacing:"0.1em" }}>{label}</span>
    </div>
  );
}

// ─── TOGGLE ───────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div onClick={onChange} style={{ width:"48px", height:"26px", borderRadius:"13px", background:value?C.fire:"#222", border:`1px solid ${value?C.fire:"#444"}`, position:"relative", cursor:"pointer", transition:"all .2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"3px", left:value?"24px":"3px", width:"18px", height:"18px", borderRadius:"50%", background:C.white, transition:"left .2s", boxShadow:value?`0 0 8px ${C.fire}`:"none" }} />
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const inputSt = { width:"100%", background:"#111", border:"1px solid #2a2a2a", borderRadius:"8px", color:C.white, padding:"12px 14px", fontSize:"14px", outline:"none", fontFamily:"Barlow, sans-serif", transition:"border-color 0.2s" };
const labelSt = { display:"block", fontSize:"12px", fontWeight:"700", letterSpacing:"0.15em", color:C.gray, marginBottom:"6px", fontFamily:"Bebas Neue", textTransform:"uppercase" };
const cardSt  = { background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"18px", marginBottom:"14px" };

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ icon, label, content, isAlert, isRutina, isIntensity, extra }) {
  const intColor = content?.includes("ALTA")?C.fire:content?.includes("MEDIA")?C.gold:C.green;
  return (
    <div className="slide-up" style={{ background:isAlert?"#1a0505":"#0d0d0d", border:`1px solid ${isAlert?C.red:isRutina?C.blue:"#222"}`, borderRadius:"10px", padding:"16px", marginBottom:"10px" }}>
      <div style={{ fontSize:"15px", fontWeight:"700", letterSpacing:"0.15em", color:isAlert?C.red:C.fire, marginBottom:"10px", fontFamily:"Bebas Neue", borderBottom:`1px solid ${isAlert?C.red:"#2a2a2a"}`, paddingBottom:"8px" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize:isIntensity?"40px":"15px", fontWeight:isIntensity?"900":"400", fontFamily:isIntensity?"Bebas Neue":"Barlow, sans-serif", color:isIntensity?intColor:isAlert?"#fca5a5":C.grayL, lineHeight:"1.5", whiteSpace:"pre-wrap", textShadow:isIntensity?`0 0 30px ${intColor}`:"none" }}>
        {content}
      </div>
      {extra}
    </div>
  );
}

// ─── PROMPTS ──────────────────────────────────────────────────────────────────
const SECTIONS = [
  { key:"decision",     label:"DECISIÓN PRINCIPAL",    icon:"⚡" },
  { key:"intensidad",   label:"INTENSIDAD RECOMENDADA", icon:"🔥" },
  { key:"descanso",     label:"AJUSTE DE DESCANSO",     icon:"😴" },
  { key:"alimentacion", label:"AJUSTE DE ALIMENTACIÓN", icon:"🥗" },
  { key:"alerta",       label:"ALERTA",                 icon:"⚠️" },
  { key:"consultar",    label:"CONSULTAR A COACH",      icon:"👨‍💼" },
  { key:"motivo",       label:"MOTIVO",                 icon:"📋" },
  { key:"rutina",       label:"RUTINA DEL DÍA",         icon:"🏋️" },
];

const SYSTEM_PROMPT = `Actúa como un sistema experto en entrenamiento físico y toma de decisiones.
Tu rol es ser un "AI Coach de decisiones", no motivador.
IMPORTANTE: Trabaja SOLO con los valores predefinidos.

VALORES PERMITIDOS:
DESCANSO: 1h,2h,3h,4h,5h,6h,7h,8h+
ENERGÍA: 1-10
ALIMENTACIÓN: MUY MALA,MALA,NORMAL,BIEN,MUY BIEN
TIEMPO: 30min,45min,60min,75min,90min,120min+

REGLAS:
- Una decisión clara, directo
- Analizá historial: sobreentrenamiento, fatiga, grupos repetidos <48h, rachas sin descanso
- Mismo grupo <48h: ALERTA
- >6 días consecutivos: recuperación
- Semana DESCARGA: intensidad 50-60%
- Si practica disciplina deportiva: orientar el entrenamiento para complementar esa actividad (potencia, explosividad, movilidad según corresponda). Evitar sobrecargar grupos musculares clave para esa disciplina el día previo a competencia o práctica intensa
- Si MUJER EN ETAPA MENSTRUAL: baja-media intensidad, movilidad, evitar esfuerzo máximo
- Dolor: siempre considerarlo

FORMATO (etiquetas exactas):

DECISIÓN PRINCIPAL:
INTENSIDAD RECOMENDADA:
BAJA / MEDIA / ALTA
AJUSTE DE DESCANSO:
AJUSTE DE ALIMENTACIÓN:
ALERTA:
(si aplica, sino: Ninguna)
CONSULTAR A COACH:
SÍ / NO
MOTIVO:
(máx 2 líneas)
{{rutina_placeholder}}
Sin texto extra.`;

const RUTINA_PROMPT = `\nLuego del MOTIVO:\n---\nRUTINA DEL DÍA:\n(Lista numerada. Nombre · Series x Reps · Nota)`;

function parseResponse(text) {
  const parsed = {};
  SECTIONS.forEach((s,i) => {
    const start = text.indexOf(s.label+":");
    if(start===-1) return;
    const nextLabels = SECTIONS.slice(i+1).map(ns=>ns.label+":");
    let end = text.length;
    nextLabels.forEach(nl=>{const idx=text.indexOf(nl,start);if(idx!==-1&&idx<end)end=idx;});
    parsed[s.key] = text.slice(start+s.label.length+1,end).replace(/^---\s*/gm,"").trim();
  });
  return parsed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function Login({ onLogin }) {
  const [dni, setDni]             = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [dniGuardado, setDniGuardado] = useState("");

  const handleLogin = async () => {
    if (!dni||!password) { setError("Ingresá tu DNI y contraseña."); return; }
    setLoading(true); setError(null); setBloqueado(false);
    try {
      const res  = await fetch(`${API}/api/login`,{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({dni:dni.trim(),password:password.trim(),deviceId:getDeviceId()}) });
      const data = await res.json();
      if (data.success) {
        saveSession(data.user, data.sessionToken);
        onLogin(data.user, data.alertaVencimiento, data.sessionToken, data.dispositivoNuevo, data.isDemo, data.horasDemo);
      } else if (data.error==="DISPOSITIVO_BLOQUEADO") {
        setDniGuardado(dni.trim()); setBloqueado(true);
      } else { setError(data.error||"Credenciales inválidas"); }
    } catch { setError("No se puede conectar con el servidor."); }
    setLoading(false);
  };

  if (bloqueado) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <LogoWatermark />
      <div style={{ maxWidth:"400px", width:"100%", textAlign:"center", position:"relative", zIndex:1 }} className="slide-up">
        <div style={{ fontSize:"64px", marginBottom:"20px" }}>🔒</div>
        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"28px", color:C.red, letterSpacing:"2px", marginBottom:"16px" }}>ACCESO BLOQUEADO</div>
        <div style={{ background:"#1a0505", border:`1px solid ${C.red}`, borderRadius:"12px", padding:"24px", marginBottom:"24px" }}>
          <p style={{ color:"#fca5a5", fontSize:"15px", lineHeight:"1.8", fontFamily:"Barlow, sans-serif" }}>
            PARA VOLVER A USAR ESTE DISPOSITIVO DEBÉS SOLICITAR AUTORIZACIÓN A UN ADMINISTRADOR. GRACIAS.
          </p>
        </div>
        <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent(`Hola, necesito autorización para habilitar mi dispositivo. DNI: ${dniGuardado}`)}`,"_blank")}
          style={{ padding:"14px 24px", background:"linear-gradient(135deg,#16a34a,#15803d)", border:"none", borderRadius:"8px", color:C.white, fontSize:"16px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:"pointer", width:"100%", marginBottom:"12px" }}>
          💬 CONTACTAR ADMINISTRADOR
        </button>
        <button onClick={()=>setBloqueado(false)} style={{ background:"transparent", border:"none", color:C.gray, fontSize:"13px", cursor:"pointer", fontFamily:"Barlow, sans-serif" }}>← Volver</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px", position:"relative", overflow:"hidden" }}>
      <LogoWatermark />
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at 50% 100%, #7c1d0a22 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ width:"100%", maxWidth:"400px", position:"relative", zIndex:1 }} className="slide-up">

        <div style={{ textAlign:"center", marginBottom:"36px" }}>
          <div style={{ display:"flex", justifyContent:"center", marginBottom:"16px" }}>
            <Logo size={180} pulse={true} />
          </div>
          <h1 style={{ fontFamily:"Bebas Neue, Impact, sans-serif", fontSize:"38px", letterSpacing:"3px", lineHeight:"1", background:"linear-gradient(180deg,#ffffff 0%,#f97316 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            AI ASSISTANT
          </h1>
          <div style={{ fontFamily:"Barlow Condensed, sans-serif", fontSize:"13px", color:C.gold, fontWeight:"700", letterSpacing:"4px", marginTop:"6px" }}>
            DECISIONES CON 100% ACTITUD!
          </div>
        </div>

        <div style={{ background:"#0d0d0d", border:"1px solid #222", borderRadius:"12px", padding:"28px" }}>
          <div style={{ marginBottom:"16px" }}>
            <label style={labelSt}>DNI</label>
            <input type="text" value={dni} onChange={e=>setDni(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Número de documento" style={inputSt} autoComplete="off" />
          </div>
          <div style={{ marginBottom:"24px" }}>
            <label style={labelSt}>Contraseña</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••••" style={inputSt} autoComplete="off" />
          </div>
          {error && <div style={{ marginBottom:"16px", padding:"10px 14px", background:"#1a0505", border:`1px solid ${C.red}`, borderRadius:"6px", color:"#fca5a5", fontSize:"13px", fontFamily:"Barlow, sans-serif" }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} className={loading?"":"pulse-btn"} style={{ width:"100%", padding:"16px", background:loading?"#222":`linear-gradient(135deg,${C.red},${C.fire})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"18px", fontWeight:"900", letterSpacing:"3px", cursor:loading?"not-allowed":"pointer", fontFamily:"Bebas Neue, sans-serif" }}>
            {loading?"VERIFICANDO...":"→ INGRESAR"}
          </button>
        </div>
        <div style={{ textAlign:"center", marginTop:"16px", fontSize:"11px", color:"#333", fontFamily:"Barlow, sans-serif" }}>Almafuerte · Córdoba · 3571 58 7003</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMBIAR CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════
function CambiarPassword({ user, onClose }) {
  const [actual, setActual]   = useState("");
  const [nueva, setNueva]     = useState("");
  const [conf, setConf]       = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [ok, setOk]           = useState(false);

  const handleCambiar = async () => {
    if(!actual||!nueva||!conf){setMsg({e:true,t:"Completá todos los campos"});return;}
    if(nueva!==conf){setMsg({e:true,t:"Las contraseñas nuevas no coinciden"});return;}
    if(nueva.length<6){setMsg({e:true,t:"Mínimo 6 caracteres"});return;}
    setLoading(true);
    try {
      const res=await fetch(`${API}/api/cambiar-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,passwordActual:actual,passwordNueva:nueva})});
      const data=await res.json();
      if(data.success){setOk(true);setMsg({e:false,t:"✅ Contraseña cambiada correctamente"});}
      else setMsg({e:true,t:data.error});
    } catch{setMsg({e:true,t:"Error de conexión"});}
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000dd", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ background:"#0d0d0d", border:`1px solid ${C.fire}`, borderRadius:"16px", padding:"28px", width:"100%", maxWidth:"380px" }} className="slide-up">
        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"22px", color:C.fire, letterSpacing:"2px", marginBottom:"20px" }}>🔑 CAMBIAR CONTRASEÑA</div>
        {[{l:"CONTRASEÑA ACTUAL",v:actual,s:setActual},{l:"NUEVA CONTRASEÑA",v:nueva,s:setNueva},{l:"CONFIRMAR NUEVA",v:conf,s:setConf}].map(f=>(
          <div key={f.l} style={{ marginBottom:"14px" }}>
            <label style={labelSt}>{f.l}</label>
            <input type="password" value={f.v} onChange={e=>f.s(e.target.value)} style={inputSt} placeholder="••••••••" />
          </div>
        ))}
        {msg && <div style={{ marginBottom:"14px", padding:"10px", background:msg.e?"#1a0505":"#0d2010", border:`1px solid ${msg.e?C.red:C.green}`, borderRadius:"6px", color:msg.e?"#fca5a5":"#86efac", fontSize:"13px", fontFamily:"Barlow, sans-serif" }}>{msg.t}</div>}
        <div style={{ display:"flex", gap:"10px" }}>
          {!ok && <button onClick={handleCambiar} disabled={loading} style={{ flex:1, padding:"12px", background:`linear-gradient(135deg,${C.red},${C.fire})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"15px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:loading?"not-allowed":"pointer" }}>{loading?"GUARDANDO...":"GUARDAR"}</button>}
          <button onClick={onClose} style={{ flex:1, padding:"12px", background:"transparent", border:"1px solid #333", borderRadius:"8px", color:C.gray, fontSize:"15px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>{ok?"CERRAR":"CANCELAR"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PESAJE CORPORAL
// ═══════════════════════════════════════════════════════════════════════════════
function PesajeTab({ user, isDemo }) {
  const [pesajes, setPesajes]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [peso, setPeso]         = useState("");
  const [fecha, setFecha]       = useState(new Date().toISOString().slice(0,10));
  const [nota, setNota]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  useEffect(()=>{
    fetch(`${API}/api/pesajes/${user.id}`).then(r=>r.json()).then(d=>{if(d.success)setPesajes(d.pesajes);setLoading(false);}).catch(()=>setLoading(false));
  },[user.id]);

  const guardar = async () => {
    if(!peso){setMsg({e:true,t:"Ingresá el peso"});return;}
    if(isDemo){setMsg({e:true,t:"⚠️ MODO DEMO — Registro deshabilitado"});return;}
    setSaving(true);
    const res=await fetch(`${API}/api/pesaje`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,peso:parseFloat(peso),fecha,nota})});
    const data=await res.json();
    if(data.success){setPesajes(p=>[data.pesaje,...p]);setPeso("");setNota("");setMsg({e:false,t:"✅ Pesaje registrado"});setTimeout(()=>setMsg(null),3000);}
    else setMsg({e:true,t:data.error});
    setSaving(false);
  };

  // Mini gráfico de progreso
  const ultimos = pesajes.slice(0,12).reverse();
  const maxP = Math.max(...ultimos.map(p=>parseFloat(p.peso)||0));
  const minP = Math.min(...ultimos.map(p=>parseFloat(p.peso)||0));
  const rango = maxP - minP || 1;

  return (
    <div className="fadeIn">
      {/* Formulario */}
      <div style={cardSt}>
        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"18px", color:C.fire, letterSpacing:"2px", marginBottom:"14px" }}>⚖️ REGISTRAR PESAJE</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
          <div>
            <label style={labelSt}>Peso (kg)</label>
            <input type="number" step="0.1" value={peso} onChange={e=>setPeso(e.target.value)} placeholder="76.5" style={inputSt} />
          </div>
          <div>
            <label style={labelSt}>Fecha</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inputSt} />
          </div>
          <div style={{ gridColumn:"1/-1" }}>
            <label style={labelSt}>Nota (opcional)</label>
            <input type="text" value={nota} onChange={e=>setNota(e.target.value)} placeholder="ej: en ayunas, post entreno..." style={inputSt} />
          </div>
        </div>
        {msg && <div style={{ marginBottom:"12px", padding:"10px", background:msg.e?"#1a0505":"#0d2010", border:`1px solid ${msg.e?C.red:C.green}`, borderRadius:"6px", color:msg.e?"#fca5a5":"#86efac", fontSize:"13px", fontFamily:"Barlow, sans-serif" }}>{msg.t}</div>}
        <button onClick={guardar} disabled={saving} style={{ width:"100%", padding:"14px", background:saving?"#222":`linear-gradient(135deg,${C.blue},${C.blueL})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"16px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:saving?"not-allowed":"pointer" }}>
          {saving?"GUARDANDO...":"→ REGISTRAR PESAJE"}
        </button>
      </div>

      {/* Gráfico */}
      {ultimos.length > 1 && (
        <div style={cardSt}>
          <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"16px", color:C.blueL, letterSpacing:"2px", marginBottom:"14px" }}>📈 PROGRESO DE PESO</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:"6px", height:"100px", marginBottom:"8px" }}>
            {ultimos.map((p,i)=>{
              const h = ((parseFloat(p.peso)-minP)/rango)*80+10;
              const isLast = i===ultimos.length-1;
              return (
                <div key={p.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"2px" }}>
                  <div style={{ fontSize:"9px", color:isLast?C.fire:C.gray, fontFamily:"Bebas Neue, sans-serif" }}>{p.peso}</div>
                  <div style={{ width:"100%", height:`${h}%`, background:isLast?`linear-gradient(180deg,${C.fire},${C.red})`:"#1e3a5f", borderRadius:"3px 3px 0 0", transition:"height 0.5s" }} />
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:"10px", color:C.gray }}>
            <span>{formatDate(ultimos[0]?.fecha||ultimos[0]?.created_at)}</span>
            <span>{formatDate(ultimos[ultimos.length-1]?.fecha||ultimos[ultimos.length-1]?.created_at)}</span>
          </div>
        </div>
      )}

      {/* Historial */}
      <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"14px", color:C.gray, letterSpacing:"2px", marginBottom:"10px" }}>
        HISTORIAL DE PESAJES ({pesajes.length})
      </div>
      {loading ? <div style={{ textAlign:"center", padding:"24px", color:C.gray }}>Cargando...</div> : (
        pesajes.length===0 ? <div style={{ textAlign:"center", padding:"24px", color:C.gray, fontSize:"14px" }}>Sin pesajes registrados aún.</div> : (
          pesajes.map(p=>(
            <div key={p.id} style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"8px", padding:"12px 16px", marginBottom:"8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"22px", color:C.white }}>{p.peso} <span style={{ fontSize:"14px", color:C.gray }}>kg</span></div>
                {p.nota && <div style={{ fontSize:"12px", color:C.gray, marginTop:"2px" }}>{p.nota}</div>}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:"12px", color:C.grayL }}>{formatDate(p.fecha||p.created_at)}</div>
                <div style={{ fontSize:"10px", color:C.gray }}>{dayLabel(p.created_at)}</div>
              </div>
            </div>
          ))
        )
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADÍSTICAS
// ═══════════════════════════════════════════════════════════════════════════════
function Estadisticas({ sesiones }) {
  if(sesiones.length<3) return <div style={{ textAlign:"center", padding:"40px 24px", color:C.gray, fontSize:"14px", fontFamily:"Barlow, sans-serif" }}>Necesitás al menos 3 sesiones para ver estadísticas.</div>;

  const porSemana = sesiones.reduce((acc,s)=>{
    const k=`S${s.training_week}`;
    if(!acc[k]) acc[k]={energias:[],count:0};
    acc[k].energias.push(parseInt(s.energia)||0);
    acc[k].count++;
    return acc;
  },{});

  const semanas = Object.entries(porSemana).slice(-8).map(([sem,d])=>({
    sem, energia:(d.energias.reduce((a,b)=>a+b,0)/d.energias.length).toFixed(1), count:d.count
  }));

  const horarios = sesiones.reduce((acc,s)=>{ if(s.hora_del_dia!==undefined){const h=getHorarioLabel(s.hora_del_dia);acc[h]=(acc[h]||0)+1;} return acc; },{});
  const horarioFav = Object.entries(horarios).sort((a,b)=>b[1]-a[1])[0];
  const grupos = sesiones.reduce((acc,s)=>{ if(s.entrenamiento){const g=s.entrenamiento.split(",")[0].trim().toUpperCase();acc[g]=(acc[g]||0)+1;} return acc; },{});
  const grupoTop = Object.entries(grupos).sort((a,b)=>b[1]-a[1])[0];
  const maxE = Math.max(...semanas.map(s=>parseFloat(s.energia)));

  return (
    <div className="fadeIn">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"16px" }}>
        {[
          {l:"SESIONES",v:sesiones.length,icon:"📋"},
          {l:"HORARIO FAV.",v:horarioFav?horarioFav[0]:"—",icon:"⏰"},
          {l:"GRUPO FAV.",v:grupoTop?grupoTop[0].slice(0,12):"—",icon:"💪"},
          {l:"ENERGÍA PROM.",v:sesiones.length?(sesiones.reduce((a,s)=>a+(parseInt(s.energia)||0),0)/sesiones.length).toFixed(1):"—",icon:"⚡"},
        ].map(s=>(
          <div key={s.l} style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"10px", padding:"14px" }}>
            <div style={{ fontSize:"20px", marginBottom:"4px" }}>{s.icon}</div>
            <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"20px", color:C.fire }}>{s.v}</div>
            <div style={{ fontSize:"9px", color:C.gray, letterSpacing:"0.1em" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={cardSt}>
        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"16px", color:C.fire, letterSpacing:"2px", marginBottom:"14px" }}>⚡ ENERGÍA PROMEDIO POR SEMANA</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:"8px", height:"120px" }}>
          {semanas.map((s,i)=>{
            const h=maxE>0?(parseFloat(s.energia)/10)*100:0;
            const color=parseFloat(s.energia)>=7?C.green:parseFloat(s.energia)>=5?C.gold:C.red;
            return(
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                <div style={{ fontSize:"10px", color, fontFamily:"Bebas Neue, sans-serif" }}>{s.energia}</div>
                <div style={{ width:"100%", height:`${h}%`, minHeight:"4px", background:color, borderRadius:"4px 4px 0 0", transition:"height 0.5s" }} />
                <div style={{ fontSize:"8px", color:C.gray, textAlign:"center" }}>{s.sem}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({ user, onLogout }) {
  const [usuarios, setUsuarios]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [renewLoading, setRenew]    = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [msg, setMsg]               = useState(null);
  const [resetPwdId, setResetPwdId] = useState(null);
  const [resetPwdVal, setResetPwdVal] = useState("");
  const [newUser, setNewUser] = useState({dni:"",nombre:"",apellido:"",password:"",role:"usuario",isDemo:false});

  useEffect(()=>{ fetch(`${API}/api/admin/usuarios`).then(r=>r.json()).then(d=>{if(d.success)setUsuarios(d.usuarios);setLoading(false);}).catch(()=>setLoading(false)); },[]);

  const showMsg = t => { setMsg(t); setTimeout(()=>setMsg(null),4000); };

  const renovar = async userId => {
    setRenew(userId);
    const res=await fetch(`${API}/api/admin/renovar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:data.nuevaFecha}:u));showMsg("✅ Suscripción renovada 30 días");}
    setRenew(null);
  };

  const renovarDemo = async userId => {
    const nuevaFecha = new Date(); nuevaFecha.setHours(nuevaFecha.getHours()+24);
    const res=await fetch(`${API}/api/admin/renovar-demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,horas:24})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:data.nuevaFecha}:u));showMsg("✅ Demo extendido 24hs");}
  };

  const resetDisp = async (userId,nombre,apellido) => {
    if(!window.confirm(`¿Resetear dispositivo de ${nombre} ${apellido}?`)) return;
    const res=await fetch(`${API}/api/admin/resetear-dispositivo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,device_token:null,device_locked:false}:u));showMsg("✅ Dispositivo reseteado");}
  };

  const resetPwd = async userId => {
    if(!resetPwdVal||resetPwdVal.length<4){showMsg("❌ Mínimo 4 caracteres");return;}
    const res=await fetch(`${API}/api/admin/resetear-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,nuevaPassword:resetPwdVal})});
    const data=await res.json();
    if(data.success){showMsg("✅ Contraseña reseteada");setResetPwdId(null);setResetPwdVal("");}
    else showMsg(`❌ ${data.error}`);
  };

  const crearUsuario = async () => {
    if(!newUser.dni||!newUser.nombre||!newUser.apellido||!newUser.password){showMsg("⚠️ Completá todos los campos");return;}
    setCreating(true);
    const res=await fetch(`${API}/api/admin/crear-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newUser)});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>[data.usuario,...prev]);setNewUser({dni:"",nombre:"",apellido:"",password:"",role:"usuario",isDemo:false});setShowCreate(false);showMsg("✅ Socio creado correctamente");}
    else showMsg(`❌ ${data.error}`);
    setCreating(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, fontFamily:"Barlow, sans-serif", position:"relative" }}>
      <LogoWatermark />
      <div style={{ background:"#0d0d0d", borderBottom:`2px solid ${C.red}`, padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:100 }}>
        <div>
          <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"22px", background:`linear-gradient(90deg,${C.white},${C.fire})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", letterSpacing:"2px" }}>PANEL ADMINISTRADOR</div>
          <div style={{ fontSize:"11px", color:C.gray }}>MG Fitness Center · {user.nombre} {user.apellido}</div>
        </div>
        <button onClick={onLogout} style={{ padding:"8px 16px", background:"transparent", border:`1px solid ${C.gray}`, borderRadius:"6px", color:C.gray, fontSize:"12px", cursor:"pointer", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px" }}>SALIR</button>
      </div>

      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"24px 16px", position:"relative", zIndex:1 }}>
        {msg && <div style={{ marginBottom:"16px", padding:"12px 16px", background:msg.startsWith("✅")?"#0d2010":"#1a0505", border:`1px solid ${msg.startsWith("✅")?C.green:C.red}`, borderRadius:"8px", color:msg.startsWith("✅")?"#86efac":"#fca5a5", fontSize:"14px" }}>{msg}</div>}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"20px" }}>
          {[
            {l:"SOCIOS",v:usuarios.filter(u=>!u.is_demo).length},
            {l:"DEMOS",v:usuarios.filter(u=>u.is_demo).length},
            {l:"ACTIVOS",v:usuarios.filter(u=>(getDiasRestantes(u.fecha_expiracion)||0)>0).length},
            {l:"POR VENCER",v:usuarios.filter(u=>{const d=getDiasRestantes(u.fecha_expiracion);return d!==null&&d>=0&&d<=7;}).length},
          ].map(s=>(
            <div key={s.l} style={{ background:"#0d0d0d", border:"1px solid #222", borderRadius:"10px", padding:"14px", textAlign:"center" }}>
              <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"32px", color:C.fire }}>{s.v}</div>
              <div style={{ fontSize:"9px", color:C.gray, letterSpacing:"0.1em" }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom:"20px" }}>
          <button onClick={()=>setShowCreate(!showCreate)} style={{ padding:"12px 24px", background:`linear-gradient(135deg,${C.blue},${C.blueL})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"16px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:"pointer" }}>
            {showCreate?"✕ CANCELAR":"+ NUEVO SOCIO / DEMO"}
          </button>
        </div>

        {showCreate && (
          <div className="slide-up" style={{ background:"#0d0d0d", border:`1px solid ${C.blueL}`, borderRadius:"12px", padding:"24px", marginBottom:"20px" }}>
            <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"20px", color:C.blueL, marginBottom:"16px", letterSpacing:"2px" }}>REGISTRAR NUEVO SOCIO</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
              {[{name:"dni",label:"DNI",pl:"Número"},{name:"password",label:"CONTRASEÑA",pl:"Contraseña inicial",type:"password"},{name:"nombre",label:"NOMBRE",pl:"Nombre"},{name:"apellido",label:"APELLIDO",pl:"Apellido"}].map(f=>(
                <div key={f.name}><label style={labelSt}>{f.label}</label><input type={f.type||"text"} value={newUser[f.name]} onChange={e=>setNewUser(p=>({...p,[f.name]:e.target.value}))} placeholder={f.pl} style={inputSt} /></div>
              ))}
              <div>
                <label style={labelSt}>ROL</label>
                <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} style={inputSt}>
                  <option value="usuario">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", paddingTop:"22px" }}>
                <Toggle value={newUser.isDemo} onChange={()=>setNewUser(p=>({...p,isDemo:!p.isDemo,role:!p.isDemo?"demo":p.role}))} />
                <div>
                  <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"14px", color:C.gold }}>MODO DEMO</div>
                  <div style={{ fontSize:"11px", color:C.gray }}>Acceso 24hs de prueba</div>
                </div>
              </div>
            </div>
            <button onClick={crearUsuario} disabled={creating} style={{ marginTop:"16px", padding:"12px 28px", background:`linear-gradient(135deg,${C.red},${C.fire})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"16px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:creating?"not-allowed":"pointer" }}>
              {creating?"CREANDO...":"CREAR SOCIO"}
            </button>
          </div>
        )}

        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"16px", color:C.gray, letterSpacing:"2px", marginBottom:"10px" }}>SOCIOS REGISTRADOS</div>

        {loading?<div style={{ textAlign:"center", padding:"40px", color:C.gray }}>Cargando...</div>:(
          usuarios.map(u=>{
            const dias=getDiasRestantes(u.fecha_expiracion);
            const isOpen=selected===u.id;
            const isDemo=u.is_demo||u.role==="demo";
            return(
              <div key={u.id} style={{ background:"#0d0d0d", border:`1px solid ${dias!==null&&dias<0?C.red:dias!==null&&dias<=7?C.fire:isDemo?"#92400e":"#222"}`, borderRadius:"10px", marginBottom:"10px", overflow:"hidden" }}>
                <div onClick={()=>setSelected(isOpen?null:u.id)} style={{ padding:"14px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"18px", color:C.white, letterSpacing:"1px" }}>
                      {u.apellido?.toUpperCase()}, {u.nombre}
                      {isDemo&&<span style={{ marginLeft:"10px", fontSize:"11px", color:C.gold, border:`1px solid ${C.gold}`, borderRadius:"4px", padding:"1px 6px" }}>DEMO</span>}
                    </div>
                    <div style={{ fontSize:"12px", color:C.gray, marginTop:"2px" }}>DNI: {u.dni} · {u.role}{u.device_locked?" · 🔒 Bloqueado":""}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <DiasRestantesBadge fechaExp={u.fecha_expiracion} />
                    <span style={{ color:C.gray, fontSize:"12px" }}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {isOpen&&(
                  <div style={{ padding:"16px", borderTop:"1px solid #1a1a1a" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"14px" }}>
                      {[
                        {l:"INICIO",v:u.fecha_inicio?new Date(u.fecha_inicio).toLocaleDateString("es-AR"):"—"},
                        {l:"VENCIMIENTO",v:u.fecha_expiracion?new Date(u.fecha_expiracion).toLocaleDateString("es-AR"):"—"},
                        {l:"SEMANA",v:`#${getTrainingWeek(u.fecha_inicio)}`},
                        {l:"DÍAS REST.",v:dias!==null?(dias<0?"VENCIDO":`${dias}d`):"—"},
                      ].map(s=>(
                        <div key={s.l} style={{ background:"#111", borderRadius:"6px", padding:"10px" }}>
                          <div style={{ fontSize:"9px", color:C.gray, fontFamily:"Bebas Neue, sans-serif" }}>{s.l}</div>
                          <div style={{ fontSize:"16px", fontFamily:"Bebas Neue, sans-serif", color:C.white, marginTop:"2px" }}>{s.v}</div>
                        </div>
                      ))}
                    </div>

                    {u.device_token&&<div style={{ marginBottom:"12px", padding:"10px", background:"#111", borderRadius:"6px", fontSize:"11px", color:C.gray }}>📱 Dispositivo: {u.device_registered_at?new Date(u.device_registered_at).toLocaleString("es-AR"):"—"}{u.device_locked&&<span style={{ color:C.red, marginLeft:"8px" }}>⚠️ BLOQUEADO</span>}</div>}

                    <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                      {isDemo?(
                        <button onClick={()=>renovarDemo(u.id)} style={{ padding:"10px 16px", background:"linear-gradient(135deg,#92400e,#b45309)", border:"none", borderRadius:"6px", color:C.white, fontSize:"13px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>
                          ⏱ EXTENDER 24HS
                        </button>
                      ):(
                        <button onClick={()=>renovar(u.id)} disabled={renewLoading===u.id} style={{ padding:"10px 16px", background:renewLoading===u.id?"#222":"linear-gradient(135deg,#16a34a,#15803d)", border:"none", borderRadius:"6px", color:C.white, fontSize:"13px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>
                          {renewLoading===u.id?"...":"🔄 RENOVAR 30 DÍAS"}
                        </button>
                      )}
                      {u.device_token&&<button onClick={()=>resetDisp(u.id,u.nombre,u.apellido)} style={{ padding:"10px 16px", background:u.device_locked?`linear-gradient(135deg,${C.red},#b91c1c)`:"#1a1a1a", border:`1px solid ${u.device_locked?C.red:"#333"}`, borderRadius:"6px", color:u.device_locked?C.white:C.gray, fontSize:"13px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>
                        {u.device_locked?"🔒 DESBLOQUEAR":"📱 RESET DISP."}
                      </button>}
                      <button onClick={()=>{setResetPwdId(resetPwdId===u.id?null:u.id);setResetPwdVal("");}} style={{ padding:"10px 16px", background:"#1a1a1a", border:"1px solid #333", borderRadius:"6px", color:C.gray, fontSize:"13px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>
                        🔑 RESET PWD
                      </button>
                    </div>

                    {resetPwdId===u.id&&(
                      <div className="slide-up" style={{ marginTop:"10px", display:"flex", gap:"10px" }}>
                        <input type="password" value={resetPwdVal} onChange={e=>setResetPwdVal(e.target.value)} placeholder="Nueva contraseña" style={{...inputSt,flex:1}} />
                        <button onClick={()=>resetPwd(u.id)} style={{ padding:"10px 16px", background:`linear-gradient(135deg,${C.red},${C.fire})`, border:"none", borderRadius:"6px", color:C.white, fontSize:"13px", fontFamily:"Bebas Neue, sans-serif", cursor:"pointer" }}>GUARDAR</button>
                      </div>
                    )}
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
function Coach({ user, onLogout, isDemo, horasDemo }) {
  const [tab, setTab]           = useState("form");
  const [sesiones, setSesiones] = useState([]);
  const [expandedId, setExp]    = useState(null);
  const [result, setResult]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [showPwd, setShowPwd]   = useState(false);
  const [form, setForm] = useState({
    peso:"", descanso:"7h", energia:"7",
    entrenamiento:"", dolor:"", alimentacion:"NORMAL",
    tiempo:"60min", quiereRutina:false,
    sexo:"", etapaMenstrual:false,
    disciplina:"Ninguna / Solo gym",
  });

  useEffect(()=>{
    if(isDemo) return; // Demo no carga historial real
    fetch(`${API}/api/sesiones/${user.id}`).then(r=>r.json()).then(d=>{if(d.success)setSesiones(d.sesiones);}).catch(()=>{});
  },[user.id, isDemo]);

  const trainingWeek = getTrainingWeek(user.fecha_inicio);
  const deload       = isDeloadWeek(trainingWeek,sesiones);
  const streak       = computeStreak(sesiones);

  const handleChange = e => { const{name,value,type,checked}=e.target; setForm(f=>({...f,[name]:type==="checkbox"?checked:value})); };

  const buildHistoryCtx = () => {
    if(!sesiones.length) return "Sin historial previo.";
    return sesiones.slice(0,10).map(s=>`• ${dayLabel(s.created_at)} — Sem ${s.training_week}${s.is_deload?"[DESC]":""} — ${s.entrenamiento} | E:${s.energia} D:${s.descanso} A:${s.alimentacion}${s.hora_del_dia!==undefined?` | ${getHorarioLabel(s.hora_del_dia)}`:""}`).join("\n");
  };

  const handleSubmit = async () => {
    if(!form.peso||!form.entrenamiento){setError("Completá peso y entrenamiento.");return;}
    setError(null);setLoading(true);setResult(null);
    const now=new Date();
    const sexoInfo=form.sexo==="mujer"?`Sexo: Mujer${form.etapaMenstrual?" — EN ETAPA MENSTRUAL ACTIVA":""}`:`Sexo: ${form.sexo==="hombre"?"Hombre":"No especificado"}`;
    const disciplinaInfo=form.disciplina!=="Ninguna / Solo gym"?`Disciplina deportiva: ${form.disciplina} — orientar entrenamiento para complementar y potenciar esta actividad`:"Sin disciplina deportiva adicional";
    const userMsg=`Fecha: ${formatDateTime(now.toISOString())}\nSemana: ${trainingWeek}${deload?" — DESCARGA":""}\nRacha: ${streak}d\n${deload?"⚠️ SEMANA DE DESCARGA\n":""}\nDatos:\nPeso: ${form.peso}kg | Descanso: ${form.descanso} | Energía: ${form.energia}\n${sexoInfo}\n${disciplinaInfo}\nEntrenamiento: ${form.entrenamiento}\nDolor: ${form.dolor||"Ninguno"} | Alimentación: ${form.alimentacion}\nTiempo: ${form.tiempo}\nObjetivo: Masa muscular, bajo % grasa.\n\nHistorial:\n${buildHistoryCtx()}`;
    const system=SYSTEM_PROMPT.replace("{{rutina_placeholder}}",form.quiereRutina?RUTINA_PROMPT:"");
    try{
      const res=await fetch(`${API}/api/coach`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,userMsg})});
      const data=await res.json();
      if(!data.success) throw new Error(data.error);
      setResult(data.text);
      if(!isDemo){
        fetch(`${API}/api/sesion`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,sesion:{entrenamiento:form.entrenamiento,peso:parseFloat(form.peso),descanso:form.descanso,energia:parseInt(form.energia),alimentacion:form.alimentacion,dolor:form.dolor||null,tiempo:form.tiempo,response_text:data.text,training_week:trainingWeek,is_deload:deload,streak}})}).then(r=>r.json()).then(d=>{if(d.success)setSesiones(p=>[d.sesion,...p]);}).catch(()=>{});
      }
    }catch(err){setError(err.message||"Error al conectar.");}
    setLoading(false);
  };

  const parsed=result?parseResponse(result):{};
  const consultarCoach=parsed.consultar?.includes("SÍ");

  const byWeek=sesiones.reduce((acc,s)=>{ const k=`Semana ${s.training_week}${s.is_deload?" — DESCARGA":""}`; (acc[k]=acc[k]||[]).push(s); return acc; },{});

  const tabSt=active=>({ flex:1, padding:"10px", border:"none", borderRadius:"6px", background:active?`linear-gradient(135deg,${C.red},${C.fire})`:"#111", color:active?C.white:C.gray, fontSize:"12px", fontWeight:"700", letterSpacing:"2px", cursor:"pointer", fontFamily:"Bebas Neue, sans-serif" });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.white, fontFamily:"Barlow, sans-serif", position:"relative" }}>
      <LogoWatermark />
      <div style={{ position:"fixed", inset:0, background:"radial-gradient(ellipse at 50% 100%, #7c1d0a15 0%, transparent 60%)", pointerEvents:"none" }} />

      {showPwd&&<CambiarPassword user={user} onClose={()=>setShowPwd(false)} />}

      {/* DEMO BANNER */}
      {isDemo&&(
        <div style={{ background:"linear-gradient(90deg,#92400e,#78350f)", padding:"10px 20px", textAlign:"center", borderBottom:`2px solid ${C.gold}`, position:"sticky", top:0, zIndex:200 }}>
          <span style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"15px", color:C.gold, letterSpacing:"2px" }}>
            🎯 MODO DEMO — {horasDemo||24}HS DE PRUEBA · El historial no se guarda · 
          </span>
          <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent("Hola! Quiero contratar la suscripción de MG Fitness Center AI Assistant.")}`,"_blank")} style={{ marginLeft:"10px", padding:"4px 12px", background:C.gold, border:"none", borderRadius:"4px", color:"#000", fontSize:"12px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>
            CONTRATAR →
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"#0a0a0a", borderBottom:"2px solid #1a1a1a", padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:isDemo?"44px":0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <Logo size={44} pulse={false} />
          <div>
            <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"18px", letterSpacing:"2px", background:`linear-gradient(90deg,${C.white},${C.fire})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>MG FITNESS CENTER</div>
            <div style={{ fontSize:"10px", color:C.gold, fontFamily:"Barlow Condensed, sans-serif", letterSpacing:"3px", fontWeight:"700" }}>AI ASSISTANT · 100% ACTITUD</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <DiasRestantesBadge fechaExp={user.fecha_expiracion} />
          <button onClick={()=>setShowPwd(true)} title="Cambiar contraseña" style={{ padding:"7px 12px", background:"transparent", border:"1px solid #333", borderRadius:"6px", color:C.gray, fontSize:"12px", cursor:"pointer", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px" }}>🔑 CLAVE</button>
          <button onClick={onLogout} style={{ padding:"7px 12px", background:"transparent", border:"1px solid #333", borderRadius:"6px", color:C.gray, fontSize:"11px", cursor:"pointer", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px" }}>SALIR</button>
        </div>
      </div>

      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"16px", position:"relative", zIndex:1 }}>

        <div style={{ marginBottom:"14px" }}>
          <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"26px", color:C.white, letterSpacing:"2px" }}>HOLA, {user.nombre?.toUpperCase()} 💪</div>
          <div style={{ fontSize:"12px", color:C.gray }}>{user.apellido} · DNI {user.dni}</div>
        </div>

        {deload&&<div className="slide-up" style={{ marginBottom:"12px", padding:"12px 16px", background:"#0a1628", border:`1px solid ${C.blueL}`, borderRadius:"8px" }}><span style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"15px", color:C.blueL, letterSpacing:"2px" }}>🔄 SEMANA {trainingWeek} — DESCARGA ACTIVA</span></div>}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"14px" }}>
          {[{l:"SESIONES",v:sesiones.length},{l:"RACHA",v:`${streak}d`},{l:"SEMANA",v:`#${trainingWeek}`}].map(s=>(
            <div key={s.l} style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"8px", padding:"12px", textAlign:"center" }}>
              <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"26px", color:C.fire }}>{s.v}</div>
              <div style={{ fontSize:"9px", color:C.gray }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"6px", marginBottom:"14px" }}>
          <button style={tabSt(tab==="form")}    onClick={()=>setTab("form")}>📋 HOY</button>
          {!isDemo&&<button style={tabSt(tab==="peso")}    onClick={()=>setTab("peso")}>⚖️ PESO</button>}
          {!isDemo&&<button style={tabSt(tab==="stats")}   onClick={()=>setTab("stats")}>📊 STATS</button>}
          {!isDemo&&<button style={tabSt(tab==="history")} onClick={()=>setTab("history")}>📅 HIST.</button>}
        </div>

        {/* ══ FORM ══ */}
        {tab==="form"&&(
          <>
            <div style={cardSt}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <div><label style={labelSt}>Peso (kg)</label><input name="peso" value={form.peso} onChange={handleChange} placeholder="76.5" style={inputSt} /></div>
                <div><label style={labelSt}>Descanso</label><select name="descanso" value={form.descanso} onChange={handleChange} style={inputSt}>{["1h","2h","3h","4h","5h","6h","7h","8h+"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label style={labelSt}>Energía (1-10)</label><select name="energia" value={form.energia} onChange={handleChange} style={inputSt}>{[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label style={labelSt}>Alimentación</label><select name="alimentacion" value={form.alimentacion} onChange={handleChange} style={inputSt}>{["MUY MALA","MALA","NORMAL","BIEN","MUY BIEN"].map(v=><option key={v}>{v}</option>)}</select></div>

                <div style={{ gridColumn:"1/-1" }}><label style={labelSt}>Entrenamiento del día</label><input name="entrenamiento" value={form.entrenamiento} onChange={handleChange} placeholder="ej: musculación, glúteos y femorales" style={inputSt} /></div>
                <div style={{ gridColumn:"1/-1" }}><label style={labelSt}>Dolor (opcional)</label><input name="dolor" value={form.dolor} onChange={handleChange} placeholder="ej: hombro derecho leve / ninguno" style={inputSt} /></div>

                {/* Disciplina */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelSt}>¿Practicás alguna disciplina deportiva?</label>
                  <select name="disciplina" value={form.disciplina} onChange={handleChange} style={inputSt}>
                    {DISCIPLINAS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>

                {/* Sexo */}
                <div style={{ gridColumn:"1/-1" }}>
                  <label style={labelSt}>Sexo</label>
                  <div style={{ display:"flex", gap:"10px" }}>
                    {["hombre","mujer"].map(s=>(
                      <button key={s} onClick={()=>setForm(f=>({...f,sexo:s,etapaMenstrual:s==="hombre"?false:f.etapaMenstrual}))}
                        style={{ flex:1, padding:"12px", background:form.sexo===s?(s==="hombre"?`linear-gradient(135deg,${C.blue},${C.blueL})`:"linear-gradient(135deg,#be185d,#ec4899)"):"#111", border:`1px solid ${form.sexo===s?(s==="hombre"?C.blueL:"#ec4899"):"#333"}`, borderRadius:"8px", color:C.white, fontSize:"15px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:"pointer", transition:"all 0.2s" }}>
                        {s==="hombre"?"♂ HOMBRE":"♀ MUJER"}
                      </button>
                    ))}
                  </div>
                </div>

                {form.sexo==="mujer"&&(
                  <div style={{ gridColumn:"1/-1", background:"#1a0a14", border:"1px solid #9d174d", borderRadius:"8px", padding:"14px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"15px", color:"#f9a8d4", letterSpacing:"1px" }}>🌸 ETAPA MENSTRUAL ACTIVA</div>
                        <div style={{ fontSize:"12px", color:"#9d174d", marginTop:"2px" }}>La IA adaptará la rutina e intensidad</div>
                      </div>
                      <Toggle value={form.etapaMenstrual} onChange={()=>setForm(f=>({...f,etapaMenstrual:!f.etapaMenstrual}))} />
                    </div>
                  </div>
                )}

                <div><label style={labelSt}>Tiempo disponible</label><select name="tiempo" value={form.tiempo} onChange={handleChange} style={inputSt}>{["30min","45min","60min","75min","90min","120min+"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", paddingTop:"22px" }}>
                  <Toggle value={form.quiereRutina} onChange={()=>setForm(f=>({...f,quiereRutina:!f.quiereRutina}))} />
                  <span style={{ fontSize:"12px", color:C.grayL, fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px" }}>INCLUIR RUTINA</span>
                </div>
              </div>

              {!isDemo&&sesiones.length>0&&(
                <div style={{ marginTop:"12px", padding:"12px", background:"#0a0a0a", borderRadius:"8px", border:"1px solid #1a1a1a" }}>
                  <div style={{ fontSize:"10px", color:C.gray, letterSpacing:"0.15em", marginBottom:"8px", fontFamily:"Bebas Neue, sans-serif" }}>🕐 ÚLTIMAS SESIONES</div>
                  {sesiones.slice(0,3).map(s=>(
                    <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid #111" }}>
                      <span style={{ fontSize:"12px", color:C.grayL }}>{s.entrenamiento}</span>
                      <span style={{ fontSize:"11px", color:C.gray }}>Sem {s.training_week} · {dayLabel(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}

              {error&&<div style={{ marginTop:"12px", padding:"10px 14px", background:"#1a0505", border:`1px solid ${C.red}`, borderRadius:"6px", color:"#fca5a5", fontSize:"13px" }}>{error}</div>}

              <button onClick={handleSubmit} disabled={loading} style={{ marginTop:"16px", width:"100%", padding:"16px", background:loading?"#222":`linear-gradient(135deg,${C.red},${C.fire})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"20px", fontWeight:"900", letterSpacing:"3px", cursor:loading?"not-allowed":"pointer", fontFamily:"Bebas Neue, sans-serif", boxShadow:loading?"none":`0 4px 24px ${C.red}66` }}>
                {loading?"ANALIZANDO...":"→ OBTENER DECISIÓN"}
              </button>
            </div>

            {result&&SECTIONS.map(s=>{
              const content=parsed[s.key];
              if(!content) return null;
              return(
                <SectionCard key={s.key} icon={s.icon} label={s.label} content={content}
                  isAlert={s.key==="alerta"&&content!=="Ninguna"}
                  isRutina={s.key==="rutina"} isIntensity={s.key==="intensidad"}
                  extra={s.key==="consultar"&&consultarCoach?(
                    <div style={{ marginTop:"14px", display:"flex", gap:"10px", flexWrap:"wrap" }}>
                      <button onClick={()=>abrirWhatsApp(parsed.alerta,parsed.motivo,user.nombre,user.apellido)} style={{ padding:"10px 18px", background:"linear-gradient(135deg,#16a34a,#15803d)", border:"none", borderRadius:"6px", color:C.white, fontSize:"14px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:"pointer" }}>💬 CONTACTAR COACH</button>
                      <button style={{ padding:"10px 18px", background:"transparent", border:"1px solid #333", borderRadius:"6px", color:C.gray, fontSize:"14px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"1px", cursor:"pointer" }}>NO POR AHORA</button>
                    </div>
                  ):null}
                />
              );
            })}
          </>
        )}

        {tab==="peso"&&!isDemo&&<PesajeTab user={user} isDemo={isDemo} />}
        {tab==="stats"&&!isDemo&&<Estadisticas sesiones={sesiones} />}

        {tab==="history"&&!isDemo&&(
          <div>
            {sesiones.length===0?<div style={{ textAlign:"center", padding:"48px 24px", color:C.gray }}>Sin sesiones registradas aún.</div>:(
              Object.entries(byWeek).reverse().map(([weekLabel,entries])=>(
                <div key={weekLabel} style={{ marginBottom:"24px" }}>
                  <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"13px", letterSpacing:"2px", color:weekLabel.includes("DESCARGA")?C.blueL:C.fire, marginBottom:"10px" }}>
                    📅 {weekLabel} · {entries.length} sesión{entries.length!==1?"es":""}
                  </div>
                  {entries.map(s=>{
                    const hp=parseResponse(s.response_text||"");
                    const isOpen=expandedId===s.id;
                    const hasAlert=hp.alerta&&hp.alerta!=="Ninguna";
                    const intColor=hp.intensidad?.includes("ALTA")?C.fire:hp.intensidad?.includes("MEDIA")?C.gold:C.green;
                    return(
                      <div key={s.id} style={{ background:"#0d0d0d", border:`1px solid ${hasAlert?C.red:"#1a1a1a"}`, borderRadius:"10px", marginBottom:"10px", overflow:"hidden" }}>
                        <div onClick={()=>setExp(isOpen?null:s.id)} style={{ padding:"14px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"15px", color:C.white, letterSpacing:"1px" }}>{s.entrenamiento}</div>
                            <div style={{ fontSize:"11px", color:C.gray, marginTop:"2px" }}>{formatDateTime(s.created_at)}{s.hora_del_dia!==undefined?` · ${getHorarioLabel(s.hora_del_dia)}`:""} · Racha {s.streak}d</div>
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                            {hp.intensidad&&<span style={{ fontSize:"11px", fontFamily:"Bebas Neue, sans-serif", color:intColor, border:`1px solid ${intColor}`, borderRadius:"4px", padding:"2px 7px" }}>{hp.intensidad}</span>}
                            {hasAlert&&<span>⚠️</span>}
                            <span style={{ color:C.gray, fontSize:"11px" }}>{isOpen?"▲":"▼"}</span>
                          </div>
                        </div>
                        <div style={{ display:"flex", borderTop:"1px solid #1a1a1a" }}>
                          {[{l:"ENERGÍA",v:s.energia},{l:"DESCANSO",v:s.descanso},{l:"ALIMENT.",v:s.alimentacion},{l:"TIEMPO",v:s.tiempo}].map((st,i,arr)=>(
                            <div key={st.l} style={{ flex:1, padding:"8px 4px", textAlign:"center", borderRight:i<arr.length-1?"1px solid #1a1a1a":"none" }}>
                              <div style={{ fontSize:"9px", color:C.gray, fontFamily:"Bebas Neue, sans-serif" }}>{st.l}</div>
                              <div style={{ fontSize:"13px", color:C.grayL, fontWeight:"700" }}>{st.v}</div>
                            </div>
                          ))}
                        </div>
                        {isOpen&&(
                          <div style={{ padding:"16px", borderTop:"1px solid #1a1a1a" }}>
                            {SECTIONS.map(sec=>{const content=hp[sec.key];if(!content)return null;return(<div key={sec.key} style={{ marginBottom:"12px" }}><div style={{ fontSize:"10px", color:C.gray, fontFamily:"Bebas Neue, sans-serif", letterSpacing:"0.1em", marginBottom:"4px" }}>{sec.icon} {sec.label}</div><div style={{ fontSize:"13px", color:C.grayL, lineHeight:"1.6", whiteSpace:"pre-wrap" }}>{content}</div></div>);})}
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
  const [sessionToken, setSessionToken]   = useState(null);
  const [alertaVenc, setAlertaVenc]       = useState(null);
  const [alertaVisible, setAlertaVisible] = useState(false);
  const [sesionCerrada, setSesionCerrada] = useState(false);
  const [verificando, setVerificando]     = useState(true);
  const [isDemo, setIsDemo]               = useState(false);
  const [horasDemo, setHorasDemo]         = useState(null);

  useEffect(()=>{
    const saved=loadSession();
    if(saved){
      const deviceId=getDeviceId();
      fetch(`${API}/api/verify-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:saved.user.id,sessionToken:saved.token,deviceId})})
        .then(r=>r.json())
        .then(d=>{
          if(d.valid){setUser(saved.user);setSessionToken(saved.token);setIsDemo(saved.user.is_demo||saved.user.role==="demo");}
          else{clearSession();if(d.error==="SESION_CERRADA")setSesionCerrada(true);}
          setVerificando(false);
        })
        .catch(()=>setVerificando(false));
    } else setVerificando(false);
  },[]);

  const verificarSesion = useCallback(async()=>{
    if(!user||!sessionToken||document.hidden) return;
    try{
      const res=await fetch(`${API}/api/verify-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,sessionToken,deviceId:getDeviceId()})});
      const data=await res.json();
      if(!data.valid){clearSession();setSesionCerrada(true);setUser(null);setSessionToken(null);}
    }catch{}
  },[user,sessionToken]);

  useEffect(()=>{ document.addEventListener("visibilitychange",verificarSesion); return()=>document.removeEventListener("visibilitychange",verificarSesion); },[verificarSesion]);

  const handleLogin=(userData,alerta,token,dispositivoNuevo,demo,horas)=>{
    setUser(userData);setSessionToken(token);setSesionCerrada(false);
    setIsDemo(demo||userData.is_demo||userData.role==="demo");
    setHorasDemo(horas||24);
    if(alerta){setAlertaVenc(alerta);setAlertaVisible(true);}
    if(dispositivoNuevo) setTimeout(()=>alert("⚠️ Sesión anterior cerrada. Este es tu dispositivo autorizado."),500);
  };

  const handleLogout=()=>{ clearSession();setUser(null);setSessionToken(null);setAlertaVenc(null);setAlertaVisible(false);setSesionCerrada(false);setIsDemo(false); };

  if(verificando) return(
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <Logo size={100} pulse={true} />
        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"16px", color:C.gray, letterSpacing:"3px", marginTop:"16px" }}>CARGANDO...</div>
      </div>
    </div>
  );

  if(sesionCerrada) return(
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ maxWidth:"380px", width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:"50px", marginBottom:"16px" }}>📵</div>
        <div style={{ fontFamily:"Bebas Neue, sans-serif", fontSize:"26px", color:C.fire, letterSpacing:"2px", marginBottom:"12px" }}>SESIÓN CERRADA</div>
        <div style={{ background:"#1a0a05", border:`1px solid ${C.fire}`, borderRadius:"10px", padding:"20px", marginBottom:"20px" }}>
          <p style={{ color:C.grayL, fontSize:"14px", lineHeight:"1.7", fontFamily:"Barlow, sans-serif" }}>Tu sesión fue cerrada porque iniciaste sesión desde otro dispositivo.</p>
        </div>
        <button onClick={()=>setSesionCerrada(false)} style={{ padding:"14px 28px", background:`linear-gradient(135deg,${C.red},${C.fire})`, border:"none", borderRadius:"8px", color:C.white, fontSize:"16px", fontFamily:"Bebas Neue, sans-serif", letterSpacing:"2px", cursor:"pointer" }}>→ VOLVER A INGRESAR</button>
      </div>
    </div>
  );

  if(!user) return <Login onLogin={handleLogin} />;

  return(
    <>
      {alertaVisible&&alertaVenc&&(
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:9999, background:"linear-gradient(90deg,#7c1d0a,#92400e)", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"Bebas Neue, sans-serif", borderBottom:`2px solid ${C.fire}` }}>
          <span style={{ fontSize:"16px", color:C.gold, letterSpacing:"2px" }}>⚠️ {alertaVenc}</span>
          <button onClick={()=>setAlertaVisible(false)} style={{ background:"transparent", border:"none", color:C.gold, fontSize:"18px", cursor:"pointer" }}>✕</button>
        </div>
      )}
      <div style={{ paddingTop:alertaVisible&&alertaVenc?"48px":0 }}>
        {user.role==="admin"
          ?<AdminPanel user={user} onLogout={handleLogout}/>
          :<Coach user={user} onLogout={handleLogout} isDemo={isDemo} horasDemo={horasDemo}/>
        }
      </div>
    </>
  );
}