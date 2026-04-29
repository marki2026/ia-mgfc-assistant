import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WP_NUMBER = "543571587003";
const APP_VERSION = "2.0";
const TERMS_URL = "https://mgfitnesscenter.com.ar/terminos";

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
  @keyframes pulse-btn { 0%,100%{box-shadow:0 0 20px #f97316aa} 50%{box-shadow:0 0 40px #dc2626cc} }
  @keyframes slide-up { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .slide-up { animation: slide-up 0.4s ease forwards; }
  .pulse-fire { animation: pulse-fire 2.5s ease infinite; }
  .pulse-btn { animation: pulse-btn 2s ease infinite; }
  .fadeIn { animation: fadeIn 0.3s ease forwards; }
  .blink { animation: blink 2s ease infinite; }
  select option { background: #111; color: #fff; }
`;
document.head.appendChild(GLOBAL_STYLE);

const C = {
  bg:"#000",bg2:"#0a0a0a",bg3:"#111",
  blue:"#1a3a8f",blueL:"#2563eb",
  fire:"#f97316",gold:"#fbbf24",red:"#dc2626",
  white:"#fff",gray:"#64748b",grayL:"#94a3b8",
  green:"#22c55e",pink:"#ec4899",
};

// ─── DEVICE & SESSION ─────────────────────────────────────────────────────────
function getDeviceId(){let id=localStorage.getItem("mgfc_device_id");if(!id){id="dev_"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("mgfc_device_id",id);}return id;}
function saveSession(user,token){localStorage.setItem("mgfc_user",JSON.stringify(user));localStorage.setItem("mgfc_token",token);}
function loadSession(){try{const u=JSON.parse(localStorage.getItem("mgfc_user")||"null"),t=localStorage.getItem("mgfc_token");return u&&t?{user:u,token:t}:null;}catch{return null;}}
function clearSession(){localStorage.removeItem("mgfc_user");localStorage.removeItem("mgfc_token");}

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
function formatDateTime(iso){return new Date(iso).toLocaleString("es-AR",{weekday:"short",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function formatDate(iso){return new Date(iso).toLocaleDateString("es-AR");}
function getDaysSince(iso){return Math.floor((Date.now()-new Date(iso))/86400000);}
function dayLabel(iso){const d=getDaysSince(iso);return d===0?"Hoy":d===1?"Ayer":`Hace ${d}d`;}
function getDiasRestantes(fechaExp){if(!fechaExp)return null;return Math.ceil((new Date(fechaExp)-new Date())/86400000);}
function getTrainingWeek(fechaInicio){if(!fechaInicio)return 1;const days=Math.floor((new Date()-new Date(fechaInicio))/86400000);return Math.max(1,Math.floor(days/7)+1);}
function isDeloadWeek(trainingWeek,sesiones){if(trainingWeek%4!==0)return false;if(sesiones.length<3)return false;const avg=sesiones.slice(0,5).reduce((s,x)=>s+(parseInt(x.energia)||5),0)/Math.min(sesiones.length,5);return avg<=5;}
function computeStreak(sesiones){if(!sesiones.length)return 0;const sorted=[...sesiones].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));let streak=0,prev=new Date();prev.setHours(0,0,0,0);for(const s of sorted){const d=new Date(s.created_at);d.setHours(0,0,0,0);if(Math.round((prev-d)/86400000)<=1){streak++;prev=d;}else break;}return streak;}
function getHorarioLabel(hora){if(hora>=5&&hora<12)return"🌅 Mañana";if(hora>=12&&hora<17)return"☀️ Tarde";if(hora>=17&&hora<21)return"🌆 Noche";return"🌙 Madrugada";}
function isHoy(iso){const d=new Date(iso),h=new Date();return d.getDate()===h.getDate()&&d.getMonth()===h.getMonth()&&d.getFullYear()===h.getFullYear();}

// ─── CONSTANTES ───────────────────────────────────────────────────────────────
const DISCIPLINAS=["Ninguna / Solo gym","Fútbol","Básquet","Tenis","Pádel","Natación","Ciclismo","Running","Crossfit","Artes marciales / MMA","Vóley","Rugby","Hockey","Atletismo","Otra"];
const NIVELES=[
  {v:"PRINCIPIANTE",d:"Ejercicios mecánicos simples · Series únicas · Descansos largos · Sin técnicas avanzadas"},
  {v:"BÁSICO",d:"Biseries simples · Ejercicios aislados y compuestos · Musculación + aeróbico básico"},
  {v:"INTERMEDIO",d:"Triseries · Antagonistas · Superseries · Abdominales · Propioceptivos"},
  {v:"AVANZADO",d:"Escalonadas · Superseries complejas · Potencia · Fuerza · Técnicas de intensidad"},
];

const REFERENCIAS=[
  {titulo:"⚡ ENERGÍA (1-10)",items:[{v:"1-2",d:"Agotado/a. Sin fuerzas. Lo mejor es descansar."},{v:"3-4",d:"Muy cansado/a. Entrenamiento muy liviano si decidís hacerlo."},{v:"5-6",d:"Regular. Podés entrenar con intensidad moderada."},{v:"7-8",d:"Bien. Buen día para entrenar con buena intensidad."},{v:"9-10",d:"Excelente. Condiciones óptimas para máxima exigencia."}]},
  {titulo:"🥗 ALIMENTACIÓN",items:[{v:"MUY MALA",d:"Casi no comiste o comida muy poco nutritiva."},{v:"MALA",d:"Alimentación insuficiente o de baja calidad."},{v:"NORMAL",d:"Comida adecuada, sin excesos ni grandes deficiencias."},{v:"BIEN",d:"Buena alimentación, comidas completas y equilibradas."},{v:"MUY BIEN",d:"Alimentación óptima con proteínas e hidratación correctas."}]},
  {titulo:"😴 DESCANSO",items:[{v:"1-3h",d:"Muy insuficiente. Alto riesgo de lesión y bajo rendimiento."},{v:"4-5h",d:"Poco descanso. Rendimiento y recuperación reducidos."},{v:"6-7h",d:"Descanso aceptable a bueno para la mayoría."},{v:"8h+",d:"Descanso óptimo. Recuperación completa."}]},
  {titulo:"🔥 INTENSIDAD",items:[{v:"BAJA",d:"Ejercicio suave: movilidad, elongación, caminata regenerativa."},{v:"MEDIA",d:"Esfuerzo moderado. Podés completar la sesión con control."},{v:"ALTA",d:"Máxima exigencia. Condiciones ideales para rendir al tope."}]},
  {titulo:"🏋️ NIVEL DE RUTINA",items:[{v:"PRINCIPIANTE",d:"Series únicas, ejercicios simples, mucho descanso entre series."},{v:"BÁSICO",d:"Biseries, mezcla de ejercicios aislados y compuestos."},{v:"INTERMEDIO",d:"Triseries, antagonistas, superseries, variedad de métodos."},{v:"AVANZADO",d:"Técnicas avanzadas de intensidad, potencia, fuerza máxima."}]},
];

// ─── PROMPTS ──────────────────────────────────────────────────────────────────
const SECTIONS=[
  {key:"decision",label:"DECISIÓN PRINCIPAL",icon:"⚡"},
  {key:"intensidad",label:"INTENSIDAD RECOMENDADA",icon:"🔥"},
  {key:"descanso",label:"AJUSTE DE DESCANSO",icon:"😴"},
  {key:"alimentacion",label:"AJUSTE DE ALIMENTACIÓN",icon:"🥗"},
  {key:"alerta",label:"ALERTA",icon:"⚠️"},
  {key:"consultar",label:"CONSULTAR A COACH",icon:"👨‍💼"},
  {key:"motivo",label:"MOTIVO",icon:"📋"},
  {key:"rutina",label:"RUTINA DEL DÍA",icon:"🏋️"},
];

function buildSystemPrompt(isDemo,incluirRutina,nivelRutina){
  const nivelInfo=incluirRutina&&nivelRutina?`
NIVEL DE RUTINA SOLICITADO: ${nivelRutina}
- PRINCIPIANTE: series únicas, ejercicios mecánicos simples (sentadilla, press, remo), descansos 90-120s, sin técnicas avanzadas
- BÁSICO: biseries simples, ejercicios aislados + compuestos, descansos 60-90s, musculación básica + aeróbico
- INTERMEDIO: triseries, antagonistas, superseries simples, ejercicios compuestos + aislados + propioceptivos, descansos 45-60s
- AVANZADO: series escalonadas, superseries complejas, ejercicios de potencia y fuerza, técnicas de intensidad (rest-pause, drop-set, etc.), descansos 30-45s`:"";

  if(isDemo) return `Actúa como coach de entrenamiento. Versión DEMO simplificada.
Dá una respuesta básica y breve. Al final de MOTIVO agregá: "Versión demo — la versión completa incluye análisis profundo con tu coach personal."
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
Sin texto extra.`;

  return `Actúa como sistema experto en entrenamiento físico y toma de decisiones.
Rol: "Coach de decisiones" — directo, sin motivación vacía.
Trabaja SOLO con valores predefinidos.

VALORES: DESCANSO:1h-8h+ · ENERGÍA:1-10 · ALIMENTACIÓN:MUY MALA/MALA/NORMAL/BIEN/MUY BIEN · TIEMPO:30min-120min+

REGLAS:
- Una decisión clara y directa
- Analizá historial: sobreentrenamiento, grupos repetidos <48h, rachas sin descanso
- Mismo grupo <48h: ALERTA
- >6 días consecutivos: recuperación
- Semana DESCARGA: intensidad 50-60%, volumen reducido
- Si tiene condición médica: considerarla siempre y priorizarla
- Si practica disciplina deportiva: orientar para complementarla
- Si MUJER EN ETAPA MENSTRUAL: baja-media intensidad, movilidad, sin esfuerzo máximo
- Dolor: considerarlo siempre${nivelInfo}
${incluirRutina?`
AL GENERAR RUTINA:
- Adaptá al nivel indicado, tiempo disponible, dolor y energía
- Formato por ejercicio: Nombre · Series x Reps (o tiempo) · Técnica si aplica · Nota si hay dolor/precaución`:""}

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
${incluirRutina?"---\nRUTINA DEL DÍA:\n(Lista numerada según nivel seleccionado)":""}
Sin texto extra.`;
}

function parseResponse(text){
  const parsed={};
  SECTIONS.forEach((s,i)=>{
    const start=text.indexOf(s.label+":");
    if(start===-1)return;
    const nextLabels=SECTIONS.slice(i+1).map(ns=>ns.label+":");
    let end=text.length;
    nextLabels.forEach(nl=>{const idx=text.indexOf(nl,start);if(idx!==-1&&idx<end)end=idx;});
    parsed[s.key]=text.slice(start+s.label.length+1,end).replace(/^---\s*/gm,"").trim();
  });
  return parsed;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Logo({size=140,pulse=true}){return <img src="/app/logo.png" alt="MG+IA" className={pulse?"pulse-fire":""} style={{width:size,height:"auto",objectFit:"contain",display:"block"}}/>;}
function LogoWatermark(){return <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:0,opacity:0.06}}><img src="/app/logo.png" alt="" style={{width:"500px",height:"auto"}}/></div>;}

function DiasRestantesBadge({fechaExp}){
  const dias=getDiasRestantes(fechaExp);
  if(dias===null)return null;
  const color=dias<0?C.red:dias<=3?C.red:dias<=7?C.fire:dias<=15?C.gold:C.green;
  const label=dias<0?"VENCIDO":dias===0?"VENCE HOY":`${dias} DÍAS`;
  return <div style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 12px",borderRadius:"20px",border:`1px solid ${color}`,background:`${color}18`}}><div style={{width:"6px",height:"6px",borderRadius:"50%",background:color}}/><span style={{fontSize:"11px",fontWeight:"700",color,fontFamily:"Bebas Neue",letterSpacing:"0.1em"}}>{label}</span></div>;
}

function Toggle({value,onChange}){return <div onClick={onChange} style={{width:"48px",height:"26px",borderRadius:"13px",background:value?C.fire:"#222",border:`1px solid ${value?C.fire:"#444"}`,position:"relative",cursor:"pointer",transition:"all .2s",flexShrink:0}}><div style={{position:"absolute",top:"3px",left:value?"24px":"3px",width:"18px",height:"18px",borderRadius:"50%",background:C.white,transition:"left .2s",boxShadow:value?`0 0 8px ${C.fire}`:"none"}}/></div>;}

const inputSt={width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:"8px",color:C.white,padding:"12px 14px",fontSize:"14px",outline:"none",fontFamily:"Barlow, sans-serif"};
const labelSt={display:"block",fontSize:"13px",fontWeight:"700",letterSpacing:"0.15em",color:"#94a3b8",marginBottom:"6px",fontFamily:"Bebas Neue",textTransform:"uppercase"};
const cardSt={background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"12px",padding:"18px",marginBottom:"14px"};

function SectionCard({icon,label,content,isAlert,isRutina,isIntensity,extra,isDemo,isDemoBlocked}){
  const intColor=content?.includes("ALTA")?C.fire:content?.includes("MEDIA")?C.gold:C.green;
  if(isDemoBlocked)return(
    <div className="slide-up" style={{background:"#0a0800",border:"1px solid #92400e",borderRadius:"10px",padding:"16px",marginBottom:"10px"}}>
      <div style={{fontSize:"18px",fontWeight:"900",letterSpacing:"0.2em",color:"#b45309",marginBottom:"8px",fontFamily:"Bebas Neue",borderBottom:"1px solid #92400e",paddingBottom:"8px"}}>{icon} {label}</div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 12px",background:"#1a0f00",borderRadius:"6px",border:"1px solid #92400e"}}>
        <span style={{fontSize:"18px"}}>🔒</span>
        <span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"1px"}}>FUNCIÓN BLOQUEADA EN VERSIÓN DEMO</span>
      </div>
    </div>
  );
  return(
    <div className="slide-up" style={{background:isAlert?"#1a0505":"#0d0d0d",border:`1px solid ${isAlert?C.red:isRutina?C.blue:"#333"}`,borderRadius:"10px",padding:"16px",marginBottom:"10px"}}>
      <div style={{fontSize:"18px",fontWeight:"900",letterSpacing:"0.2em",color:isAlert?C.red:C.fire,marginBottom:"12px",fontFamily:"Bebas Neue",borderBottom:`2px solid ${isAlert?C.red:C.fire}88`,paddingBottom:"10px"}}>{icon} {label}</div>
      {isDemo&&!isAlert&&<div style={{marginBottom:"10px",padding:"6px 10px",background:"#0a0800",border:"1px solid #92400e55",borderRadius:"6px",fontSize:"11px",color:"#b45309",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>⚠️ RESPUESTA SIMPLIFICADA · VERSIÓN DEMO</div>}
      <div style={{fontSize:isIntensity?"40px":"15px",fontWeight:isIntensity?"900":"400",fontFamily:isIntensity?"Bebas Neue":"Barlow, sans-serif",color:isIntensity?intColor:isAlert?"#fca5a5":C.white,lineHeight:"1.6",whiteSpace:"pre-wrap",textShadow:isIntensity?`0 0 30px ${intColor}`:"none"}}>{content}</div>
      {extra}
    </div>
  );
}

// ─── REFERENCIAS MODAL ────────────────────────────────────────────────────────
function Referencias({onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#0d0d0d",border:`2px solid ${C.fire}`,borderRadius:"16px 16px 0 0",padding:"24px 20px",width:"100%",maxWidth:"640px",maxHeight:"85vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()} className="slide-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"22px",color:C.fire,letterSpacing:"2px"}}>📖 GUÍA DE VALORES</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.gray,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>
        <p style={{fontSize:"13px",color:C.gray,fontFamily:"Barlow, sans-serif",marginBottom:"16px",lineHeight:"1.6"}}>Cuanto más precisos sean tus datos, mejor será la decisión de la IA.</p>
        {REFERENCIAS.map(r=>(
          <div key={r.titulo} style={{marginBottom:"20px"}}>
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"15px",color:C.gold,letterSpacing:"2px",marginBottom:"8px",borderBottom:`1px solid #333`,paddingBottom:"6px"}}>{r.titulo}</div>
            {r.items.map(item=>(
              <div key={item.v} style={{display:"flex",gap:"12px",padding:"7px 0",borderBottom:"1px solid #111"}}>
                <span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.fire,minWidth:"80px",flexShrink:0}}>{item.v}</span>
                <span style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.5"}}>{item.d}</span>
              </div>
            ))}
          </div>
        ))}
        <button onClick={onClose} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer",marginTop:"8px"}}>ENTENDIDO</button>
      </div>
    </div>
  );
}

// ─── TÉRMINOS Y CONDICIONES MODAL ─────────────────────────────────────────────
function TerminosModal({user,onAceptar}){
  const [scrolled,setScrolled]=useState(false);
  const [accepting,setAccepting]=useState(false);

  const handleScroll=e=>{
    const el=e.target;
    if(el.scrollHeight-el.scrollTop<=el.clientHeight+50) setScrolled(true);
  };

  const handleAceptar=async()=>{
    setAccepting(true);
    try{
      await fetch(`${API}/api/aceptar-terminos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id})});
      onAceptar();
    }catch{onAceptar();}
    setAccepting(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000000f5",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}}>
      <div style={{background:"#0d0d0d",border:`2px solid ${C.fire}`,borderRadius:"16px",width:"100%",maxWidth:"600px",maxHeight:"90vh",display:"flex",flexDirection:"column"}} className="slide-up">
        <div style={{padding:"20px 20px 12px",borderBottom:`1px solid #222`}}>
          <div style={{textAlign:"center",marginBottom:"8px"}}><Logo size={60} pulse={false}/></div>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",color:C.fire,letterSpacing:"2px",textAlign:"center"}}>TÉRMINOS Y CONDICIONES</div>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"2px",textAlign:"center"}}>MG+IA PERSONAL TRAINER 24/7 · v{APP_VERSION}</div>
        </div>

        <div onScroll={handleScroll} style={{flex:1,overflowY:"auto",padding:"20px",fontFamily:"Barlow, sans-serif",fontSize:"13px",color:C.grayL,lineHeight:"1.8"}}>
          <p style={{marginBottom:"16px",color:C.white,fontFamily:"Bebas Neue, sans-serif",fontSize:"15px"}}>LEÉ ATENTAMENTE ANTES DE CONTINUAR</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>1. SERVICIO:</strong> MG+IA Personal Trainer 24/7 es una herramienta de asistencia para planificación del entrenamiento físico mediante inteligencia artificial. Titular: Marcos Giménez — CUIL 20-31996621-9 — Almafuerte, Córdoba, Argentina.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.red}}>2. LIMITACIÓN MÉDICA (IMPORTANTE):</strong> La app NO es un servicio médico ni de salud. Las recomendaciones son orientativas y NO reemplazan la consulta con médicos, kinesiólogos ni profesionales de la salud habilitados. Ante cualquier dolor o síntoma inusual, detenés el entrenamiento inmediatamente y consultás un profesional.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>3. RESPONSABILIDAD:</strong> El titular no asume responsabilidad por lesiones, daños físicos o consecuencias negativas derivadas del uso de las recomendaciones de la app. El usuario asume responsabilidad por la veracidad de los datos ingresados.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>4. SUSCRIPCIÓN:</strong> 30 días corridos desde la activación. Sin reintegros una vez activada. Precio sujeto a cambios con 15 días de preaviso.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>5. CUENTA Y SEGURIDAD:</strong> Un solo dispositivo autorizado por cuenta. Prohibido compartir credenciales. El incumplimiento puede causar suspensión sin reintegro.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>6. CONSULTAS DIARIAS:</strong> Plan Standard: 2 consultas/día · Plan PRO: 5 consultas/día · Demo: 3 consultas en 24hs. Solo la primera consulta del día se registra en el historial.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>7. DATOS PERSONALES:</strong> Tratamiento conforme a Ley 25.326. Los datos son usados exclusivamente para prestar el servicio. No se comparten con terceros con fines comerciales.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>8. PROPIEDAD INTELECTUAL:</strong> La app, su código, nombre "MG+IA Personal Trainer 24/7", slogan y contenido son propiedad exclusiva de Marcos Giménez protegidos por Ley 11.723.</p>

          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>9. DATOS SENSIBLES:</strong> La información sobre ciclo menstrual es voluntaria, usada solo para adaptar recomendaciones y no compartida con terceros.</p>

          <p style={{marginBottom:"24px"}}><strong style={{color:C.fire}}>10. JURISDICCIÓN:</strong> Tribunales Ordinarios de Córdoba, Argentina. Ley 24.240 de Defensa del Consumidor.</p>

          <p style={{color:C.gold,fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",letterSpacing:"1px",textAlign:"center"}}>AL ACEPTAR, CONFIRMÁS HABER LEÍDO Y COMPRENDIDO ESTOS TÉRMINOS. ESTA ACEPTACIÓN TIENE VALIDEZ DE FIRMA DIGITAL CON FECHA Y HORA REGISTRADA.</p>

          {!scrolled&&<p style={{marginTop:"16px",textAlign:"center",fontSize:"12px",color:C.gray}}>↓ Scrolleá hasta el final para habilitar el botón ↓</p>}
        </div>

        <div style={{padding:"16px 20px",borderTop:`1px solid #222`}}>
          {!scrolled&&(
            <div style={{marginBottom:"10px",padding:"8px 12px",background:"#1a0f00",border:`1px solid ${C.gold}`,borderRadius:"6px",fontSize:"12px",color:C.gold,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",textAlign:"center"}}>
              ↑ DEBÉS LEER HASTA EL FINAL PARA CONTINUAR
            </div>
          )}
          <button onClick={handleAceptar} disabled={!scrolled||accepting} style={{width:"100%",padding:"14px",background:scrolled?`linear-gradient(135deg,${C.red},${C.fire})`:"#222",border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:scrolled?"pointer":"not-allowed",opacity:scrolled?1:0.5}}>
            {accepting?"REGISTRANDO...":"✅ ACEPTO LOS TÉRMINOS Y CONDICIONES"}
          </button>
          <p style={{marginTop:"8px",fontSize:"10px",color:C.gray,textAlign:"center",fontFamily:"Barlow, sans-serif"}}>Aceptación registrada con fecha y hora · {new Date().toLocaleString("es-AR")}</p>
        </div>
      </div>
    </div>
  );
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
function abrirWhatsApp(alerta,motivo,nombre,apellido){
  const texto=encodeURIComponent(`🚨 *CONSULTA COACH - MG+IA PERSONAL TRAINER 24/7*\n\n👤 Usuario: ${nombre} ${apellido}\n\n⚠️ ALERTA: ${alerta||"Sin alerta"}\n\n📋 MOTIVO: ${motivo||"Sin motivo"}\n\n_Generado desde MG+IA Personal Trainer 24/7 v${APP_VERSION}_`);
  window.open(`https://wa.me/${WP_NUMBER}?text=${texto}`,"_blank");
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
function Login({onLogin}){
  const[dni,setDni]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[bloqueado,setBloqueado]=useState(false);
  const[dniGuardado,setDniGuardado]=useState("");

  const handleLogin=async()=>{
    if(!dni||!password){setError("Ingresá tu DNI y contraseña.");return;}
    setLoading(true);setError(null);setBloqueado(false);
    try{
      const res=await fetch(`${API}/api/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dni:dni.trim(),password:password.trim(),deviceId:getDeviceId()})});
      const data=await res.json();
      if(data.success){
        saveSession(data.user,data.sessionToken);
        onLogin(data.user,data.alertaVencimiento,data.sessionToken,data.dispositivoNuevo,data.isDemo,data.horasDemo,data.limiteConsultas,data.isPro,data.necesitaTerminos);
      }else if(data.error==="DISPOSITIVO_BLOQUEADO"){setDniGuardado(dni.trim());setBloqueado(true);}
      else setError(data.error||"Credenciales inválidas");
    }catch{setError("No se puede conectar con el servidor.");}
    setLoading(false);
  };

  if(bloqueado)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <LogoWatermark/>
      <div style={{maxWidth:"400px",width:"100%",textAlign:"center",position:"relative",zIndex:1}} className="slide-up">
        <div style={{fontSize:"64px",marginBottom:"20px"}}>🔒</div>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"28px",color:C.red,letterSpacing:"2px",marginBottom:"16px"}}>ACCESO BLOQUEADO</div>
        <div style={{background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"12px",padding:"24px",marginBottom:"24px"}}>
          <p style={{color:"#fca5a5",fontSize:"15px",lineHeight:"1.8",fontFamily:"Barlow, sans-serif"}}>PARA VOLVER A USAR ESTE DISPOSITIVO DEBÉS SOLICITAR AUTORIZACIÓN AL COACH. GRACIAS.</p>
        </div>
        <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent(`Hola, necesito autorización para habilitar mi dispositivo. DNI: ${dniGuardado}`)}`,"_blank")} style={{padding:"14px 24px",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer",width:"100%",marginBottom:"12px"}}>💬 CONTACTAR AL COACH</button>
        <button onClick={()=>setBloqueado(false)} style={{background:"transparent",border:"none",color:C.gray,fontSize:"13px",cursor:"pointer",fontFamily:"Barlow, sans-serif"}}>← Volver</button>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",position:"relative",overflow:"hidden"}}>
      <LogoWatermark/>
      <div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% 100%, #7c1d0a22 0%, transparent 70%)",pointerEvents:"none"}}/>
      <div style={{width:"100%",maxWidth:"400px",position:"relative",zIndex:1}} className="slide-up">
        <div style={{textAlign:"center",marginBottom:"36px"}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:"16px"}}><Logo size={180} pulse={true}/></div>
          <h1 style={{fontFamily:"Bebas Neue, Impact, sans-serif",fontSize:"clamp(24px,7vw,38px)",letterSpacing:"2px",lineHeight:"1.1",background:"linear-gradient(180deg,#ffffff 0%,#f97316 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MG+IA PERSONAL TRAINER 24/7</h1>
          <div style={{fontFamily:"Barlow Condensed, sans-serif",fontSize:"13px",color:C.gold,fontWeight:"700",letterSpacing:"4px",marginTop:"6px"}}>DECISIONES CON 100% ACTITUD!</div>
        </div>
        <div style={{background:"#0d0d0d",border:"1px solid #222",borderRadius:"12px",padding:"28px"}}>
          <div style={{marginBottom:"16px"}}><label style={labelSt}>DNI</label><input type="text" value={dni} onChange={e=>setDni(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Número de documento" style={inputSt} autoComplete="off"/></div>
          <div style={{marginBottom:"24px"}}><label style={labelSt}>Contraseña</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="••••••••" style={inputSt} autoComplete="off"/></div>
          {error&&<div style={{marginBottom:"16px",padding:"10px 14px",background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"6px",color:"#fca5a5",fontSize:"13px",fontFamily:"Barlow, sans-serif"}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} className={loading?"":"pulse-btn"} style={{width:"100%",padding:"16px",background:loading?"#222":`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"18px",fontWeight:"900",letterSpacing:"3px",cursor:loading?"not-allowed":"pointer",fontFamily:"Bebas Neue, sans-serif"}}>
            {loading?"VERIFICANDO...":"→ INGRESAR"}
          </button>
        </div>
        <div style={{textAlign:"center",marginTop:"16px",fontSize:"11px",color:"#333",fontFamily:"Barlow, sans-serif"}}>Almafuerte · Córdoba · Argentina · v{APP_VERSION}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMBIAR CONTRASEÑA
// ═══════════════════════════════════════════════════════════════════════════════
function CambiarPassword({user,onClose}){
  const[actual,setActual]=useState("");const[nueva,setNueva]=useState("");const[conf,setConf]=useState("");
  const[loading,setLoading]=useState(false);const[msg,setMsg]=useState(null);const[ok,setOk]=useState(false);
  const handleCambiar=async()=>{
    if(!actual||!nueva||!conf){setMsg({e:true,t:"Completá todos los campos"});return;}
    if(nueva!==conf){setMsg({e:true,t:"Las contraseñas nuevas no coinciden"});return;}
    if(nueva.length<6){setMsg({e:true,t:"Mínimo 6 caracteres"});return;}
    setLoading(true);
    try{const res=await fetch(`${API}/api/cambiar-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,passwordActual:actual,passwordNueva:nueva})});const data=await res.json();if(data.success){setOk(true);setMsg({e:false,t:"✅ Contraseña cambiada"});}else setMsg({e:true,t:data.error});}catch{setMsg({e:true,t:"Error de conexión"});}
    setLoading(false);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"#000000dd",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{background:"#0d0d0d",border:`1px solid ${C.fire}`,borderRadius:"16px",padding:"28px",width:"100%",maxWidth:"380px"}} className="slide-up">
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"22px",color:C.fire,letterSpacing:"2px",marginBottom:"20px"}}>🔑 CAMBIAR CONTRASEÑA</div>
        {[{l:"CONTRASEÑA ACTUAL",v:actual,s:setActual},{l:"NUEVA CONTRASEÑA",v:nueva,s:setNueva},{l:"CONFIRMAR NUEVA",v:conf,s:setConf}].map(f=>(
          <div key={f.l} style={{marginBottom:"14px"}}><label style={labelSt}>{f.l}</label><input type="password" value={f.v} onChange={e=>f.s(e.target.value)} style={inputSt} placeholder="••••••••"/></div>
        ))}
        {msg&&<div style={{marginBottom:"14px",padding:"10px",background:msg.e?"#1a0505":"#0d2010",border:`1px solid ${msg.e?C.red:C.green}`,borderRadius:"6px",color:msg.e?"#fca5a5":"#86efac",fontSize:"13px",fontFamily:"Barlow, sans-serif"}}>{msg.t}</div>}
        <div style={{display:"flex",gap:"10px"}}>
          {!ok&&<button onClick={handleCambiar} disabled={loading} style={{flex:1,padding:"12px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:loading?"not-allowed":"pointer"}}>{loading?"GUARDANDO...":"GUARDAR"}</button>}
          <button onClick={onClose} style={{flex:1,padding:"12px",background:"transparent",border:"1px solid #333",borderRadius:"8px",color:C.gray,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{ok?"CERRAR":"CANCELAR"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PESAJE CORPORAL
// ═══════════════════════════════════════════════════════════════════════════════
function PesajeTab({user}){
  const[pesajes,setPesajes]=useState([]);const[loading,setLoading]=useState(true);
  const[peso,setPeso]=useState("");const[fecha,setFecha]=useState(new Date().toISOString().slice(0,10));
  const[nota,setNota]=useState("");const[saving,setSaving]=useState(false);const[msg,setMsg]=useState(null);
  useEffect(()=>{fetch(`${API}/api/pesajes/${user.id}`).then(r=>r.json()).then(d=>{if(d.success)setPesajes(d.pesajes);setLoading(false);}).catch(()=>setLoading(false));},[user.id]);
  const guardar=async()=>{
    if(!peso){setMsg({e:true,t:"Ingresá el peso"});return;}
    setSaving(true);
    const res=await fetch(`${API}/api/pesaje`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,peso:parseFloat(peso),fecha,nota})});
    const data=await res.json();
    if(data.success){setPesajes(p=>[data.pesaje,...p]);setPeso("");setNota("");setMsg({e:false,t:"✅ Pesaje registrado"});setTimeout(()=>setMsg(null),3000);}
    else setMsg({e:true,t:data.error});
    setSaving(false);
  };
  const ultimos=pesajes.slice(0,12).reverse();
  const maxP=Math.max(...ultimos.map(p=>parseFloat(p.peso)||0));
  const minP=Math.min(...ultimos.map(p=>parseFloat(p.peso)||0));
  const rango=maxP-minP||1;
  return(
    <div className="fadeIn">
      <div style={cardSt}>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",color:C.fire,letterSpacing:"2px",marginBottom:"14px"}}>⚖️ REGISTRAR PESAJE</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
          <div><label style={labelSt}>Peso (kg)</label><input type="number" step="0.1" value={peso} onChange={e=>setPeso(e.target.value)} placeholder="76.5" style={inputSt}/></div>
          <div><label style={labelSt}>Fecha</label><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={inputSt}/></div>
          <div style={{gridColumn:"1/-1"}}><label style={labelSt}>Nota (opcional)</label><input type="text" value={nota} onChange={e=>setNota(e.target.value)} placeholder="ej: en ayunas, post entreno..." style={inputSt}/></div>
        </div>
        {msg&&<div style={{marginBottom:"12px",padding:"10px",background:msg.e?"#1a0505":"#0d2010",border:`1px solid ${msg.e?C.red:C.green}`,borderRadius:"6px",color:msg.e?"#fca5a5":"#86efac",fontSize:"13px",fontFamily:"Barlow, sans-serif"}}>{msg.t}</div>}
        <button onClick={guardar} disabled={saving} style={{width:"100%",padding:"14px",background:saving?"#222":`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:saving?"not-allowed":"pointer"}}>{saving?"GUARDANDO...":"→ REGISTRAR PESAJE"}</button>
      </div>
      {ultimos.length>1&&(
        <div style={cardSt}>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.blueL,letterSpacing:"2px",marginBottom:"14px"}}>📈 PROGRESO DE PESO</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:"6px",height:"100px",marginBottom:"8px"}}>
            {ultimos.map((p,i)=>{const h=((parseFloat(p.peso)-minP)/rango)*80+10;const isLast=i===ultimos.length-1;return(<div key={p.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}><div style={{fontSize:"9px",color:isLast?C.fire:C.gray,fontFamily:"Bebas Neue, sans-serif"}}>{p.peso}</div><div style={{width:"100%",height:`${h}%`,background:isLast?`linear-gradient(180deg,${C.fire},${C.red})`:"#1e3a5f",borderRadius:"3px 3px 0 0"}}/></div>);})}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:"10px",color:C.gray}}><span>{formatDate(ultimos[0]?.fecha||ultimos[0]?.created_at)}</span><span>{formatDate(ultimos[ultimos.length-1]?.fecha||ultimos[ultimos.length-1]?.created_at)}</span></div>
        </div>
      )}
      <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.gray,letterSpacing:"2px",marginBottom:"10px"}}>HISTORIAL ({pesajes.length})</div>
      {loading?<div style={{textAlign:"center",padding:"24px",color:C.gray}}>Cargando...</div>:(
        pesajes.length===0?<div style={{textAlign:"center",padding:"24px",color:C.gray,fontSize:"14px"}}>Sin pesajes registrados aún.</div>:(
          pesajes.map(p=>(
            <div key={p.id} style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"8px",padding:"12px 16px",marginBottom:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"22px",color:C.white}}>{p.peso} <span style={{fontSize:"14px",color:C.gray}}>kg</span></div>{p.nota&&<div style={{fontSize:"12px",color:C.gray,marginTop:"2px"}}>{p.nota}</div>}</div>
              <div style={{textAlign:"right"}}><div style={{fontSize:"12px",color:C.grayL}}>{formatDate(p.fecha||p.created_at)}</div><div style={{fontSize:"10px",color:C.gray}}>{dayLabel(p.created_at)}</div></div>
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
function Estadisticas({sesiones}){
  if(sesiones.length<3)return <div style={{textAlign:"center",padding:"40px 24px",color:C.gray,fontSize:"14px",fontFamily:"Barlow, sans-serif"}}>Necesitás al menos 3 sesiones para ver estadísticas.</div>;
  const porSemana=sesiones.reduce((acc,s)=>{const k=`S${s.training_week}`;if(!acc[k])acc[k]={energias:[],count:0};acc[k].energias.push(parseInt(s.energia)||0);acc[k].count++;return acc;},{});
  const semanas=Object.entries(porSemana).slice(-8).map(([sem,d])=>({sem,energia:(d.energias.reduce((a,b)=>a+b,0)/d.energias.length).toFixed(1),count:d.count}));
  const horarios=sesiones.reduce((acc,s)=>{if(s.hora_del_dia!==undefined){const h=getHorarioLabel(s.hora_del_dia);acc[h]=(acc[h]||0)+1;}return acc;},{});
  const horarioFav=Object.entries(horarios).sort((a,b)=>b[1]-a[1])[0];
  const grupos=sesiones.reduce((acc,s)=>{if(s.entrenamiento){const g=s.entrenamiento.split(",")[0].trim().toUpperCase();acc[g]=(acc[g]||0)+1;}return acc;},{});
  const grupoTop=Object.entries(grupos).sort((a,b)=>b[1]-a[1])[0];
  const maxE=Math.max(...semanas.map(s=>parseFloat(s.energia)));
  return(
    <div className="fadeIn">
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"16px"}}>
        {[{l:"SESIONES",v:sesiones.length,i:"📋"},{l:"HORARIO FAV.",v:horarioFav?horarioFav[0]:"—",i:"⏰"},{l:"GRUPO FAV.",v:grupoTop?grupoTop[0].slice(0,12):"—",i:"💪"},{l:"ENERGÍA PROM.",v:sesiones.length?(sesiones.reduce((a,s)=>a+(parseInt(s.energia)||0),0)/sesiones.length).toFixed(1):"—",i:"⚡"}].map(s=>(
          <div key={s.l} style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"10px",padding:"14px"}}><div style={{fontSize:"20px",marginBottom:"4px"}}>{s.i}</div><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",color:C.fire}}>{s.v}</div><div style={{fontSize:"9px",color:C.gray,letterSpacing:"0.1em"}}>{s.l}</div></div>
        ))}
      </div>
      <div style={cardSt}>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.fire,letterSpacing:"2px",marginBottom:"14px"}}>⚡ ENERGÍA POR SEMANA</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:"8px",height:"120px"}}>
          {semanas.map((s,i)=>{const h=maxE>0?(parseFloat(s.energia)/10)*100:0;const color=parseFloat(s.energia)>=7?C.green:parseFloat(s.energia)>=5?C.gold:C.red;return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}><div style={{fontSize:"10px",color,fontFamily:"Bebas Neue, sans-serif"}}>{s.energia}</div><div style={{width:"100%",height:`${h}%`,minHeight:"4px",background:color,borderRadius:"4px 4px 0 0"}}/><div style={{fontSize:"8px",color:C.gray,textAlign:"center"}}>{s.sem}</div></div>);})}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({user,onLogout}){
  const[usuarios,setUsuarios]=useState([]);const[loading,setLoading]=useState(true);
  const[selected,setSelected]=useState(null);const[renewLoading,setRenew]=useState(null);
  const[showCreate,setShowCreate]=useState(false);const[creating,setCreating]=useState(false);
  const[msg,setMsg]=useState(null);const[resetPwdId,setResetPwdId]=useState(null);const[resetPwdVal,setResetPwdVal]=useState("");
  const[editCondId,setEditCondId]=useState(null);const[editCondVal,setEditCondVal]=useState("");
  const[verHistorial,setVerHistorial]=useState(null);const[historialData,setHistorialData]=useState([]);
  const[newUser,setNewUser]=useState({dni:"",nombre:"",apellido:"",password:"",role:"usuario",isDemo:false,condicion_medica:""});

  useEffect(()=>{fetch(`${API}/api/admin/usuarios`).then(r=>r.json()).then(d=>{if(d.success)setUsuarios(d.usuarios);setLoading(false);}).catch(()=>setLoading(false));},[]);

  const showMsg=t=>{setMsg(t);setTimeout(()=>setMsg(null),4000);};
  const renovar=async userId=>{setRenew(userId);const res=await fetch(`${API}/api/admin/renovar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:data.nuevaFecha}:u));showMsg("✅ Suscripción renovada 30 días");}setRenew(null);};
  const renovarDemo=async userId=>{const res=await fetch(`${API}/api/admin/renovar-demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,horas:24})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:data.nuevaFecha}:u));showMsg("✅ Demo extendido 24hs");}};
  const resetDisp=async(userId,nombre,apellido)=>{if(!window.confirm(`¿Resetear dispositivo de ${nombre} ${apellido}?`))return;const res=await fetch(`${API}/api/admin/resetear-dispositivo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,device_token:null,device_locked:false}:u));showMsg("✅ Dispositivo reseteado");}};
  const resetPwd=async userId=>{if(!resetPwdVal||resetPwdVal.length<4){showMsg("❌ Mínimo 4 caracteres");return;}const res=await fetch(`${API}/api/admin/resetear-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,nuevaPassword:resetPwdVal})});const data=await res.json();if(data.success){showMsg("✅ Contraseña reseteada");setResetPwdId(null);setResetPwdVal("");}else showMsg(`❌ ${data.error}`);};
  const suspender=async(userId,suspendido,nombre)=>{if(!window.confirm(`¿${suspendido?"SUSPENDER":"REACTIVAR"} a ${nombre}?`))return;const res=await fetch(`${API}/api/admin/suspender-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,suspendido})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,suspendido}:u));showMsg(`✅ Usuario ${suspendido?"suspendido":"reactivado"}`);}};
  const guardarCondicion=async userId=>{const res=await fetch(`${API}/api/admin/actualizar-condicion`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,condicion_medica:editCondVal})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,condicion_medica:editCondVal}:u));showMsg("✅ Condición médica actualizada");setEditCondId(null);setEditCondVal("");}};
  const eliminar=async(userId,nombre)=>{if(!window.confirm(`¿ELIMINAR a ${nombre}? No se puede deshacer.`))return;const res=await fetch(`${API}/api/admin/eliminar-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.filter(u=>u.id!==userId));showMsg("✅ Usuario eliminado");}};
  const enviarWP=nombre=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent(`Hola ${nombre}, te escribo desde MG+IA Personal Trainer 24/7.`)}`,"_blank");
  const verHistorialUsuario=async userId=>{setVerHistorial(userId);const res=await fetch(`${API}/api/admin/sesiones/${userId}`);const data=await res.json();if(data.success)setHistorialData(data.sesiones);};
  const crearUsuario=async()=>{
    if(!newUser.dni||!newUser.nombre||!newUser.apellido||!newUser.password){showMsg("⚠️ Completá todos los campos");return;}
    setCreating(true);
    const res=await fetch(`${API}/api/admin/crear-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newUser)});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>[data.usuario,...prev]);setNewUser({dni:"",nombre:"",apellido:"",password:"",role:"usuario",isDemo:false,condicion_medica:""});setShowCreate(false);showMsg("✅ Socio creado correctamente");}
    else showMsg(`❌ ${data.error}`);
    setCreating(false);
  };

  // Modal historial admin
  if(verHistorial){
    const u=usuarios.find(x=>x.id===verHistorial);
    return(
      <div style={{position:"fixed",inset:0,background:"#000000f0",zIndex:2000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px",overflowY:"auto"}}>
        <div style={{background:"#0d0d0d",border:`1px solid ${C.fire}`,borderRadius:"16px",width:"100%",maxWidth:"700px",padding:"20px"}} className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",color:C.fire,letterSpacing:"2px"}}>📋 HISTORIAL — {u?.nombre?.toUpperCase()} {u?.apellido?.toUpperCase()}</div>
            <button onClick={()=>{setVerHistorial(null);setHistorialData([]);}} style={{background:"transparent",border:"none",color:C.gray,fontSize:"22px",cursor:"pointer"}}>✕</button>
          </div>
          {historialData.length===0?<div style={{textAlign:"center",padding:"24px",color:C.gray}}>Sin sesiones registradas.</div>:(
            historialData.map(s=>{
              const parsed=parseResponse(s.response_text||"");
              return(
                <div key={s.id} style={{background:"#111",border:"1px solid #222",borderRadius:"8px",padding:"14px",marginBottom:"10px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                    <div>
                      <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"15px",color:C.white}}>{s.entrenamiento}</div>
                      <div style={{fontSize:"11px",color:C.gray,marginTop:"2px"}}>{formatDateTime(s.created_at)} · ID: <span style={{color:C.gold,fontFamily:"monospace"}}>{s.consulta_id||"—"}</span></div>
                    </div>
                    <div style={{display:"flex",gap:"6px"}}>
                      {s.es_registro&&<span style={{fontSize:"10px",color:C.green,border:`1px solid ${C.green}`,borderRadius:"3px",padding:"1px 5px",fontFamily:"Bebas Neue, sans-serif"}}>REG</span>}
                    </div>
                  </div>
                  <div style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.6",whiteSpace:"pre-wrap",background:"#0a0a0a",padding:"10px",borderRadius:"6px"}}>
                    {s.response_text||"Sin respuesta registrada"}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:"Barlow, sans-serif",position:"relative"}}>
      <LogoWatermark/>
      <div style={{background:"#0d0d0d",borderBottom:`2px solid ${C.red}`,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",background:`linear-gradient(90deg,${C.white},${C.fire})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:"2px"}}>PANEL ADMINISTRADOR</div>
          <div style={{fontSize:"11px",color:C.gray}}>MG+IA Personal Trainer 24/7 · {user.nombre} {user.apellido}</div>
        </div>
        <button onClick={onLogout} style={{padding:"8px 16px",background:"transparent",border:`1px solid ${C.gray}`,borderRadius:"6px",color:C.gray,fontSize:"12px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>SALIR</button>
      </div>

      <div style={{maxWidth:"900px",margin:"0 auto",padding:"24px 16px",position:"relative",zIndex:1}}>
        {msg&&<div style={{marginBottom:"16px",padding:"12px 16px",background:msg.startsWith("✅")?"#0d2010":"#1a0505",border:`1px solid ${msg.startsWith("✅")?C.green:C.red}`,borderRadius:"8px",color:msg.startsWith("✅")?"#86efac":"#fca5a5",fontSize:"14px"}}>{msg}</div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px",marginBottom:"20px"}}>
          {[{l:"SOCIOS",v:usuarios.filter(u=>!u.is_demo).length},{l:"DEMOS",v:usuarios.filter(u=>u.is_demo).length},{l:"ACTIVOS",v:usuarios.filter(u=>(getDiasRestantes(u.fecha_expiracion)||0)>0).length},{l:"SUSPENDIDOS",v:usuarios.filter(u=>u.suspendido).length}].map(s=>(
            <div key={s.l} style={{background:"#0d0d0d",border:"1px solid #222",borderRadius:"10px",padding:"14px",textAlign:"center"}}><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"32px",color:C.fire}}>{s.v}</div><div style={{fontSize:"9px",color:C.gray,letterSpacing:"0.1em"}}>{s.l}</div></div>
          ))}
        </div>

        <div style={{marginBottom:"20px"}}>
          <button onClick={()=>setShowCreate(!showCreate)} style={{padding:"12px 24px",background:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>
            {showCreate?"✕ CANCELAR":"+ NUEVO SOCIO / DEMO"}
          </button>
        </div>

        {showCreate&&(
          <div className="slide-up" style={{background:"#0d0d0d",border:`1px solid ${C.blueL}`,borderRadius:"12px",padding:"24px",marginBottom:"20px"}}>
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",color:C.blueL,marginBottom:"16px",letterSpacing:"2px"}}>REGISTRAR NUEVO SOCIO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
              {[{name:"dni",label:"DNI",pl:"Número"},{name:"password",label:"CONTRASEÑA",pl:"Contraseña inicial",type:"password"},{name:"nombre",label:"NOMBRE",pl:"Nombre"},{name:"apellido",label:"APELLIDO",pl:"Apellido"}].map(f=>(
                <div key={f.name}><label style={labelSt}>{f.label}</label><input type={f.type||"text"} value={newUser[f.name]} onChange={e=>setNewUser(p=>({...p,[f.name]:e.target.value}))} placeholder={f.pl} style={inputSt}/></div>
              ))}
              <div style={{gridColumn:"1/-1"}}><label style={labelSt}>Condición médica (opcional)</label><input type="text" value={newUser.condicion_medica} onChange={e=>setNewUser(p=>({...p,condicion_medica:e.target.value}))} placeholder="ej: hipertensión, lesión rodilla..." style={inputSt}/></div>
              <div><label style={labelSt}>ROL</label><select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} style={inputSt}><option value="usuario">Usuario</option><option value="admin">Administrador</option></select></div>
              <div style={{display:"flex",alignItems:"center",gap:"10px",paddingTop:"22px"}}>
                <Toggle value={newUser.isDemo} onChange={()=>setNewUser(p=>({...p,isDemo:!p.isDemo,role:!p.isDemo?"demo":p.role}))}/>
                <div><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.gold}}>MODO DEMO</div><div style={{fontSize:"11px",color:C.gray}}>Acceso 24hs · 3 consultas</div></div>
              </div>
            </div>
            <button onClick={crearUsuario} disabled={creating} style={{marginTop:"16px",padding:"12px 28px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:creating?"not-allowed":"pointer"}}>{creating?"CREANDO...":"CREAR SOCIO"}</button>
          </div>
        )}

        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",color:C.gray,letterSpacing:"2px",marginBottom:"10px"}}>SOCIOS REGISTRADOS</div>

        {loading?<div style={{textAlign:"center",padding:"40px",color:C.gray}}>Cargando...</div>:(
          usuarios.map(u=>{
            const dias=getDiasRestantes(u.fecha_expiracion);
            const isOpen=selected===u.id;
            const isDemo=u.is_demo||u.role==="demo";
            return(
              <div key={u.id} style={{background:"#0d0d0d",border:`1px solid ${u.suspendido?"#7f1d1d":dias!==null&&dias<0?C.red:dias!==null&&dias<=7?C.fire:isDemo?"#92400e":"#222"}`,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}}>
                <div onClick={()=>setSelected(isOpen?null:u.id)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:u.suspendido?"#64748b":C.white,letterSpacing:"1px"}}>
                      {u.apellido?.toUpperCase()}, {u.nombre}
                      {isDemo&&<span style={{marginLeft:"8px",fontSize:"11px",color:C.gold,border:`1px solid ${C.gold}`,borderRadius:"4px",padding:"1px 5px"}}>DEMO</span>}
                      {u.suspendido&&<span style={{marginLeft:"8px",fontSize:"11px",color:C.red,border:`1px solid ${C.red}`,borderRadius:"4px",padding:"1px 5px"}}>SUSPENDIDO</span>}
                      {u.condicion_medica&&<span style={{marginLeft:"8px",fontSize:"11px",color:"#f9a8d4",border:"1px solid #9d174d",borderRadius:"4px",padding:"1px 5px"}}>🩺</span>}
                    </div>
                    <div style={{fontSize:"12px",color:C.gray,marginTop:"2px"}}>DNI: {u.dni} · {u.role}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <DiasRestantesBadge fechaExp={u.fecha_expiracion}/>
                    <span style={{color:C.gray,fontSize:"12px"}}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {isOpen&&(
                  <div style={{padding:"16px",borderTop:"1px solid #1a1a1a"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px"}}>
                      {[{l:"INICIO",v:u.fecha_inicio?new Date(u.fecha_inicio).toLocaleDateString("es-AR"):"—"},{l:"VENCIMIENTO",v:u.fecha_expiracion?new Date(u.fecha_expiracion).toLocaleDateString("es-AR"):"—"},{l:"SEMANA",v:`#${getTrainingWeek(u.fecha_inicio)}`},{l:"T&C",v:u.terminos_aceptados?"✅ Aceptados":"⏳ Pendiente"}].map(s=>(
                        <div key={s.l} style={{background:"#111",borderRadius:"6px",padding:"10px"}}><div style={{fontSize:"9px",color:C.gray,fontFamily:"Bebas Neue, sans-serif"}}>{s.l}</div><div style={{fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",color:C.white,marginTop:"2px"}}>{s.v}</div></div>
                      ))}
                    </div>

                    {u.condicion_medica&&<div style={{marginBottom:"12px",padding:"10px",background:"#1a0a14",border:"1px solid #9d174d",borderRadius:"6px",fontSize:"13px",color:"#f9a8d4",fontFamily:"Barlow, sans-serif"}}>🩺 {u.condicion_medica}</div>}

                    {u.device_token&&<div style={{marginBottom:"12px",padding:"10px",background:"#111",borderRadius:"6px",fontSize:"11px",color:C.gray}}>📱 Dispositivo: {u.device_registered_at?new Date(u.device_registered_at).toLocaleString("es-AR"):"—"}{u.device_locked&&<span style={{color:C.red,marginLeft:"8px"}}>⚠️ BLOQUEADO</span>}</div>}

                    <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginBottom:"10px"}}>
                      {isDemo?(
                        <button onClick={()=>renovarDemo(u.id)} style={{padding:"9px 14px",background:"linear-gradient(135deg,#92400e,#b45309)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>⏱ +24HS</button>
                      ):(
                        <button onClick={()=>renovar(u.id)} disabled={renewLoading===u.id} style={{padding:"9px 14px",background:renewLoading===u.id?"#222":"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{renewLoading===u.id?"...":"🔄 +30 DÍAS"}</button>
                      )}
                      <button onClick={()=>enviarWP(u.nombre)} style={{padding:"9px 14px",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>💬 WP</button>
                      <button onClick={()=>verHistorialUsuario(u.id)} style={{padding:"9px 14px",background:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>📋 HISTORIAL</button>
                      {u.device_token&&<button onClick={()=>resetDisp(u.id,u.nombre,u.apellido)} style={{padding:"9px 14px",background:u.device_locked?`linear-gradient(135deg,${C.red},#b91c1c)`:"#1a1a1a",border:`1px solid ${u.device_locked?C.red:"#333"}`,borderRadius:"6px",color:u.device_locked?C.white:C.gray,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{u.device_locked?"🔒 DESBLOQ.":"📱 RESET DISP."}</button>}
                      <button onClick={()=>{setResetPwdId(resetPwdId===u.id?null:u.id);setResetPwdVal("");}} style={{padding:"9px 14px",background:"#1a1a1a",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>🔑 PWD</button>
                      <button onClick={()=>{setEditCondId(editCondId===u.id?null:u.id);setEditCondVal(u.condicion_medica||"");}} style={{padding:"9px 14px",background:"#1a0a14",border:"1px solid #9d174d",borderRadius:"6px",color:"#f9a8d4",fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>🩺 COND.</button>
                      <button onClick={()=>suspender(u.id,!u.suspendido,`${u.nombre} ${u.apellido}`)} style={{padding:"9px 14px",background:u.suspendido?"linear-gradient(135deg,#16a34a,#15803d)":"linear-gradient(135deg,#92400e,#78350f)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{u.suspendido?"▶ ACTIVAR":"⏸ SUSPENDER"}</button>
                      <button onClick={()=>eliminar(u.id,`${u.nombre} ${u.apellido}`)} style={{padding:"9px 14px",background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"6px",color:C.red,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>🗑 ELIMINAR</button>
                    </div>

                    {resetPwdId===u.id&&<div className="slide-up" style={{marginBottom:"10px",display:"flex",gap:"10px"}}><input type="password" value={resetPwdVal} onChange={e=>setResetPwdVal(e.target.value)} placeholder="Nueva contraseña" style={{...inputSt,flex:1}}/><button onClick={()=>resetPwd(u.id)} style={{padding:"10px 16px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",cursor:"pointer"}}>GUARDAR</button></div>}

                    {editCondId===u.id&&<div className="slide-up" style={{marginBottom:"10px"}}><label style={labelSt}>CONDICIÓN MÉDICA</label><div style={{display:"flex",gap:"10px"}}><input type="text" value={editCondVal} onChange={e=>setEditCondVal(e.target.value)} placeholder="ej: hipertensión, lesión rodilla, diabetes..." style={{...inputSt,flex:1}}/><button onClick={()=>guardarCondicion(u.id)} style={{padding:"10px 16px",background:`linear-gradient(135deg,#be185d,#9d174d)`,border:"none",borderRadius:"6px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",cursor:"pointer"}}>GUARDAR</button></div></div>}
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
function Coach({user,onLogout,isDemo,limiteConsultas,isPro}){
  const[tab,setTab]=useState("form");
  const[sesiones,setSesiones]=useState([]);
  const[expandedId,setExp]=useState(null);
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[showPwd,setShowPwd]=useState(false);
  const[showRef,setShowRef]=useState(false);
  const[consultasHoy,setConsultasHoy]=useState(0);
  const[primerRegistroHecho,setPrimerRegistroHecho]=useState(false);
  const[form,setForm]=useState({
    peso:"",descanso:"7h",energia:"7",entrenamiento:"",dolor:"",
    alimentacion:"NORMAL",tiempo:"60min",quiereRutina:false,
    sexo:"",etapaMenstrual:false,disciplina:"Ninguna / Solo gym",
    nivelRutina:"INTERMEDIO",
  });

  useEffect(()=>{
    if(isDemo)return;
    fetch(`${API}/api/sesiones/${user.id}`).then(r=>r.json()).then(d=>{
      if(d.success){
        setSesiones(d.sesiones);
        const hoy=d.sesiones.filter(s=>isHoy(s.created_at));
        setConsultasHoy(hoy.length);
        setPrimerRegistroHecho(hoy.some(s=>s.es_registro));
      }
    }).catch(()=>{});
  },[user.id,isDemo]);

  const trainingWeek=getTrainingWeek(user.fecha_inicio);
  const deload=isDeloadWeek(trainingWeek,sesiones);
  const streak=computeStreak(sesiones);
  const condicionMedica=user.condicion_medica;
  const handleChange=e=>{const{name,value,type,checked}=e.target;setForm(f=>({...f,[name]:type==="checkbox"?checked:value}));};

  const buildHistoryCtx=()=>{
    if(!sesiones.length)return"Sin historial previo.";
    return sesiones.slice(0,10).map(s=>`• ${dayLabel(s.created_at)} — Sem ${s.training_week}${s.is_deload?"[DESC]":""} — ${s.entrenamiento} | E:${s.energia} D:${s.descanso} A:${s.alimentacion}${s.hora_del_dia!==undefined?` | ${getHorarioLabel(s.hora_del_dia)}`:""}`).join("\n");
  };

  const handleSubmit=async()=>{
    if(!form.peso||!form.entrenamiento){setError("Completá peso y entrenamiento.");return;}
    if(!isDemo&&consultasHoy>=limiteConsultas){
      setError(`⚠️ Límite de ${limiteConsultas} consultas diarias alcanzado.${!isPro?" Pasate al plan PRO para tener 5 consultas/día.":""} Para registrar otra sesión, contactá al coach.`);
      return;
    }
    setError(null);setLoading(true);setResult(null);

    const now=new Date();
    const sexoInfo=form.sexo==="mujer"?`Sexo: Mujer${form.etapaMenstrual?" — EN ETAPA MENSTRUAL ACTIVA":""}`:`Sexo: ${form.sexo==="hombre"?"Hombre":"No especificado"}`;
    const disciplinaInfo=form.disciplina!=="Ninguna / Solo gym"?`Disciplina deportiva: ${form.disciplina} — orientar entrenamiento para complementar esta actividad`:"Sin disciplina adicional";
    const condInfo=condicionMedica?`⚠️ CONDICIÓN MÉDICA DEL USUARIO (PRIORIDAD): ${condicionMedica} — tener en cuenta SIEMPRE al dar recomendaciones`:"";

    const userMsg=`Fecha: ${formatDateTime(now.toISOString())}
Semana de entrenamiento: ${trainingWeek}${deload?" — SEMANA DE DESCARGA":""}
Racha: ${streak}d
${deload?"⚠️ SEMANA DE DESCARGA — reducir intensidad al 50-60%\n":""}${condInfo}

DATOS DE HOY:
Peso: ${form.peso}kg | Descanso: ${form.descanso} | Energía: ${form.energia}
${sexoInfo}
${disciplinaInfo}
Entrenamiento: ${form.entrenamiento}
Dolor: ${form.dolor||"Ninguno"} | Alimentación: ${form.alimentacion}
Tiempo: ${form.tiempo}
Objetivo: Masa muscular, bajo % de grasa.

HISTORIAL:
${buildHistoryCtx()}`;

    const system=buildSystemPrompt(isDemo,form.quiereRutina,form.quiereRutina?form.nivelRutina:null);

    try{
      const res=await fetch(`${API}/api/coach`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,userMsg})});
      const data=await res.json();
      if(!data.success)throw new Error(data.error);
      setResult(data.text);

      if(!isDemo){
        // Primera consulta del día = registro en historial
        const esRegistro=!primerRegistroHecho;
        fetch(`${API}/api/sesion`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,sesion:{entrenamiento:form.entrenamiento,peso:parseFloat(form.peso),descanso:form.descanso,energia:parseInt(form.energia),alimentacion:form.alimentacion,dolor:form.dolor||null,tiempo:form.tiempo,response_text:data.text,training_week:trainingWeek,is_deload:deload,streak},esRegistro})}).then(r=>r.json()).then(d=>{if(d.success){setSesiones(p=>[d.sesion,...p]);setConsultasHoy(c=>c+1);if(esRegistro)setPrimerRegistroHecho(true);}}).catch(()=>{});
      }
    }catch(err){setError(err.message||"Error al conectar.");}
    setLoading(false);
  };

  const parsed=result?parseResponse(result):{};
  const consultarCoach=parsed.consultar?.includes("SÍ");
  const consultasRestantes=isDemo?Math.max(0,3-parseInt(localStorage.getItem("mgfc_demo_consultas")||"0")):Math.max(0,limiteConsultas-consultasHoy);
  const byWeek=sesiones.reduce((acc,s)=>{const k=`Semana ${s.training_week}${s.is_deload?" — DESCARGA":""}`;(acc[k]=acc[k]||[]).push(s);return acc;},{});

  const tabSt=active=>({flex:1,padding:"10px",border:"none",borderRadius:"6px",background:active?`linear-gradient(135deg,${C.red},${C.fire})`:"#111",color:active?C.white:C.gray,fontSize:"12px",fontWeight:"700",letterSpacing:"1px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif"});

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:"Barlow, sans-serif",position:"relative"}}>
      <LogoWatermark/>
      {showRef&&<Referencias onClose={()=>setShowRef(false)}/>}
      {showPwd&&<CambiarPassword user={user} onClose={()=>setShowPwd(false)}/>}

      {/* DEMO BANNER */}
      {isDemo&&(
        <div style={{background:"linear-gradient(90deg,#92400e,#78350f)",padding:"10px 16px",borderBottom:`2px solid ${C.gold}`,position:"sticky",top:0,zIndex:200}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
            <span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"2px"}} className="blink">
              🎯 VERSIÓN DEMO · {consultasRestantes} CONSULTA{consultasRestantes!==1?"S":""} RESTANTE{consultasRestantes!==1?"S":""}
            </span>
            <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent("Hola! Quiero contratar MG+IA Personal Trainer 24/7.")}`,"_blank")} style={{padding:"4px 14px",background:C.gold,border:"none",borderRadius:"4px",color:"#000",fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>CONTRATAR →</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:"#0a0a0a",borderBottom:"2px solid #1a1a1a",padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:isDemo?"44px":0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
          <Logo size={40} pulse={false}/>
          <div>
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",letterSpacing:"2px",background:`linear-gradient(90deg,${C.white},${C.fire})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MG+IA PERSONAL TRAINER 24/7</div>
            <div style={{fontSize:"9px",color:C.gold,fontFamily:"Barlow Condensed, sans-serif",letterSpacing:"3px",fontWeight:"700"}}>DECISIONES CON 100% ACTITUD!</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
          <DiasRestantesBadge fechaExp={user.fecha_expiracion}/>
          {!isDemo&&<button onClick={()=>setShowPwd(true)} style={{padding:"6px 10px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"11px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif"}}>🔑</button>}
          <button onClick={onLogout} style={{padding:"6px 10px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"11px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>SALIR</button>
        </div>
      </div>

      <div style={{maxWidth:"640px",margin:"0 auto",padding:"16px",position:"relative",zIndex:1}}>

        {/* Condición médica aviso */}
        {condicionMedica&&(
          <div style={{marginBottom:"12px",padding:"10px 14px",background:"#1a0a14",border:"1px solid #9d174d",borderRadius:"8px",fontSize:"12px",color:"#f9a8d4",fontFamily:"Barlow, sans-serif"}}>
            🩺 <strong>Condición médica registrada:</strong> {condicionMedica} — la IA la considera en todas las decisiones
          </div>
        )}

        <div style={{marginBottom:"14px"}}>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"26px",color:C.white,letterSpacing:"2px"}}>HOLA, {user.nombre?.toUpperCase()} 💪</div>
          <div style={{fontSize:"12px",color:C.gray}}>{user.apellido} · DNI {user.dni} · {isPro?"⭐ PRO":"Plan Standard"}</div>
        </div>

        {/* Consultas hoy */}
        {!isDemo&&(
          <div style={{marginBottom:"12px",padding:"10px 14px",background:"#0d0d0d",border:`1px solid ${consultasHoy>=limiteConsultas?C.red:C.fire}`,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.grayL,letterSpacing:"1px"}}>
              CONSULTAS HOY: <span style={{color:consultasHoy>=limiteConsultas?C.red:C.fire}}>{consultasHoy}/{limiteConsultas}</span>
              {primerRegistroHecho&&<span style={{marginLeft:"8px",fontSize:"10px",color:C.green}}>✅ 1RA SESIÓN REGISTRADA</span>}
            </div>
            {consultasHoy>0&&!primerRegistroHecho&&<span style={{fontSize:"10px",color:C.gray}}>Solo la 1ra se guarda en historial</span>}
          </div>
        )}

        {deload&&<div className="slide-up" style={{marginBottom:"12px",padding:"12px 16px",background:"#0a1628",border:`1px solid ${C.blueL}`,borderRadius:"8px"}}><span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"15px",color:C.blueL,letterSpacing:"2px"}}>🔄 SEMANA {trainingWeek} — DESCARGA ACTIVA</span></div>}

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"10px",marginBottom:"14px"}}>
          {[{l:"SESIONES",v:sesiones.filter(s=>s.es_registro).length},{l:"RACHA",v:`${streak}d`},{l:"SEMANA",v:`#${trainingWeek}`}].map(s=>(
            <div key={s.l} style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"8px",padding:"12px",textAlign:"center"}}><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"26px",color:C.fire}}>{s.v}</div><div style={{fontSize:"9px",color:C.gray}}>{s.l}</div></div>
          ))}
        </div>

        <div style={{display:"flex",gap:"6px",marginBottom:"14px"}}>
          <button style={tabSt(tab==="form")} onClick={()=>setTab("form")}>📋 HOY</button>
          {!isDemo&&<button style={tabSt(tab==="peso")} onClick={()=>setTab("peso")}>⚖️ PESO</button>}
          {!isDemo&&<button style={tabSt(tab==="stats")} onClick={()=>setTab("stats")}>📊 STATS</button>}
          {!isDemo&&<button style={tabSt(tab==="history")} onClick={()=>setTab("history")}>📅 HIST.</button>}
        </div>

        {tab==="form"&&(
          <>
            <div style={cardSt}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"12px"}}>
                <button onClick={()=>setShowRef(true)} style={{padding:"6px 14px",background:"#111",border:`1px solid ${C.gold}`,borderRadius:"6px",color:C.gold,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>📖 GUÍA DE VALORES</button>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>
                <div><label style={labelSt}>Peso (kg)</label><input name="peso" value={form.peso} onChange={handleChange} placeholder="76.5" style={inputSt}/></div>
                <div><label style={labelSt}>Descanso</label><select name="descanso" value={form.descanso} onChange={handleChange} style={inputSt}>{["1h","2h","3h","4h","5h","6h","7h","8h+"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label style={labelSt}>Energía (1-10)</label><select name="energia" value={form.energia} onChange={handleChange} style={inputSt}>{[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label style={labelSt}>Alimentación</label><select name="alimentacion" value={form.alimentacion} onChange={handleChange} style={inputSt}>{["MUY MALA","MALA","NORMAL","BIEN","MUY BIEN"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div style={{gridColumn:"1/-1"}}><label style={labelSt}>Entrenamiento del día</label><input name="entrenamiento" value={form.entrenamiento} onChange={handleChange} placeholder="ej: musculación, glúteos y femorales" style={inputSt}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={labelSt}>Dolor (opcional)</label><input name="dolor" value={form.dolor} onChange={handleChange} placeholder="ej: hombro derecho leve / ninguno" style={inputSt}/></div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={labelSt}>¿Practicás alguna disciplina deportiva?</label>
                  <select name="disciplina" value={form.disciplina} onChange={handleChange} style={inputSt}>{DISCIPLINAS.map(d=><option key={d}>{d}</option>)}</select>
                </div>

                {/* Sexo */}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={labelSt}>Sexo</label>
                  <div style={{display:"flex",gap:"10px"}}>
                    {["hombre","mujer"].map(s=>(
                      <button key={s} onClick={()=>setForm(f=>({...f,sexo:s,etapaMenstrual:s==="hombre"?false:f.etapaMenstrual}))} style={{flex:1,padding:"12px",background:form.sexo===s?(s==="hombre"?`linear-gradient(135deg,${C.blue},${C.blueL})`:"linear-gradient(135deg,#be185d,#ec4899)"):"#111",border:`1px solid ${form.sexo===s?(s==="hombre"?C.blueL:"#ec4899"):"#333"}`,borderRadius:"8px",color:C.white,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer",transition:"all 0.2s"}}>
                        {s==="hombre"?"♂ HOMBRE":"♀ MUJER"}
                      </button>
                    ))}
                  </div>
                </div>

                {form.sexo==="mujer"&&(
                  <div style={{gridColumn:"1/-1",background:"#1a0a14",border:"1px solid #9d174d",borderRadius:"8px",padding:"14px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
                      <div><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"15px",color:"#f9a8d4",letterSpacing:"1px"}}>🌸 ETAPA MENSTRUAL ACTIVA</div><div style={{fontSize:"12px",color:"#9d174d",marginTop:"2px"}}>La IA adaptará la rutina e intensidad</div></div>
                      <Toggle value={form.etapaMenstrual} onChange={()=>setForm(f=>({...f,etapaMenstrual:!f.etapaMenstrual}))}/>
                    </div>
                    <div style={{fontSize:"11px",color:"#9d174d",fontFamily:"Barlow, sans-serif",lineHeight:"1.5"}}>ℹ️ Recomendaciones orientativas, no constituyen consejo médico. <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" style={{color:"#f9a8d4",textDecoration:"underline"}}>Ver Términos y Condiciones</a></div>
                  </div>
                )}

                <div><label style={labelSt}>Tiempo disponible</label><select name="tiempo" value={form.tiempo} onChange={handleChange} style={inputSt}>{["30min","45min","60min","75min","90min","120min+"].map(v=><option key={v}>{v}</option>)}</select></div>

                {/* Toggle rutina + nivel */}
                <div style={{display:"flex",alignItems:"center",gap:"10px",paddingTop:"22px"}}>
                  {!isDemo&&<><Toggle value={form.quiereRutina} onChange={()=>setForm(f=>({...f,quiereRutina:!f.quiereRutina}))}/><span style={{fontSize:"12px",color:C.grayL,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>INCLUIR RUTINA</span></>}
                </div>
              </div>

              {/* Selector de nivel — aparece solo con rutina activada */}
              {!isDemo&&form.quiereRutina&&(
                <div className="slide-up" style={{marginTop:"14px",padding:"14px",background:"#0a0a0a",border:`1px solid ${C.fire}`,borderRadius:"10px"}}>
                  <label style={{...labelSt,color:C.fire,marginBottom:"10px"}}>NIVEL DE ENTRENAMIENTO</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                    {NIVELES.map(n=>(
                      <button key={n.v} onClick={()=>setForm(f=>({...f,nivelRutina:n.v}))}
                        style={{padding:"10px",background:form.nivelRutina===n.v?`linear-gradient(135deg,${C.red},${C.fire})`:"#111",border:`1px solid ${form.nivelRutina===n.v?C.fire:"#333"}`,borderRadius:"8px",cursor:"pointer",textAlign:"left"}}>
                        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:form.nivelRutina===n.v?C.white:C.grayL,letterSpacing:"1px"}}>{n.v}</div>
                        <div style={{fontSize:"10px",color:form.nivelRutina===n.v?"#fff9":"#475569",fontFamily:"Barlow, sans-serif",marginTop:"3px",lineHeight:"1.4"}}>{n.d}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso consultas adicionales */}
              {!isDemo&&consultasHoy>=1&&consultasHoy<limiteConsultas&&(
                <div style={{marginTop:"12px",padding:"10px 14px",background:"#0a0f00",border:`1px solid #365314`,borderRadius:"6px",fontSize:"12px",color:"#86efac",fontFamily:"Barlow, sans-serif"}}>
                  ℹ️ Esta consulta es orientativa — ya registraste tu sesión del día. Si realizás otro entrenamiento hoy y querés registrarlo, contactá al coach para habilitarlo.
                </div>
              )}

              {!isDemo&&sesiones.length>0&&(
                <div style={{marginTop:"12px",padding:"12px",background:"#0a0a0a",borderRadius:"8px",border:"1px solid #1a1a1a"}}>
                  <div style={{fontSize:"11px",color:C.gray,letterSpacing:"0.15em",marginBottom:"8px",fontFamily:"Bebas Neue, sans-serif"}}>🕐 ÚLTIMAS SESIONES</div>
                  {sesiones.filter(s=>s.es_registro).slice(0,3).map(s=>(
                    <div key={s.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #111"}}>
                      <span style={{fontSize:"12px",color:C.grayL}}>{s.entrenamiento}</span>
                      <span style={{fontSize:"11px",color:C.gray}}>Sem {s.training_week} · {dayLabel(s.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}

              {error&&<div style={{marginTop:"12px",padding:"10px 14px",background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"6px",color:"#fca5a5",fontSize:"13px"}}>{error}</div>}

              {isDemo&&parseInt(localStorage.getItem("mgfc_demo_consultas")||"0")>=3?(
                <div style={{marginTop:"16px",padding:"16px",background:"#1a0f00",border:`2px solid ${C.gold}`,borderRadius:"8px",textAlign:"center"}}>
                  <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.gold,letterSpacing:"2px",marginBottom:"8px"}}>🔒 CONSULTAS DEMO AGOTADAS</div>
                  <p style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",marginBottom:"12px"}}>Suscribite para acceso completo e ilimitado.</p>
                  <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent("Hola! Quiero contratar MG+IA Personal Trainer 24/7.")}`,"_blank")} style={{padding:"12px 24px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>💬 CONTRATAR AHORA</button>
                </div>
              ):(
                <button onClick={handleSubmit} disabled={loading} style={{marginTop:"16px",width:"100%",padding:"16px",background:loading?"#222":`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"20px",fontWeight:"900",letterSpacing:"3px",cursor:loading?"not-allowed":"pointer",fontFamily:"Bebas Neue, sans-serif",boxShadow:loading?"none":`0 4px 24px ${C.red}66`}}>
                  {loading?"ANALIZANDO...":"→ OBTENER DECISIÓN"}
                </button>
              )}
            </div>

            {result&&SECTIONS.map(s=>{
              const content=parsed[s.key];
              if(!content)return null;
              const isDemoBlocked=isDemo&&s.key==="rutina";
              return(
                <SectionCard key={s.key} icon={s.icon} label={s.label} content={content}
                  isAlert={s.key==="alerta"&&content!=="Ninguna"}
                  isRutina={s.key==="rutina"} isIntensity={s.key==="intensidad"}
                  isDemo={isDemo} isDemoBlocked={isDemoBlocked}
                  extra={s.key==="consultar"?(
                    consultarCoach&&!isDemo?(
                      <div style={{marginTop:"14px",display:"flex",gap:"10px",flexWrap:"wrap"}}>
                        <button onClick={()=>abrirWhatsApp(parsed.alerta,parsed.motivo,user.nombre,user.apellido)} style={{padding:"10px 18px",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"14px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>💬 CONTACTAR COACH</button>
                        <button style={{padding:"10px 18px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"14px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>NO POR AHORA</button>
                      </div>
                    ):isDemo&&consultarCoach?(
                      <div style={{marginTop:"14px",padding:"10px 14px",background:"#0a0800",border:"1px solid #92400e",borderRadius:"6px",display:"flex",alignItems:"center",gap:"8px"}}>
                        <span>🔒</span><span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"1px"}}>CONTACTO CON COACH — EXCLUSIVO VERSIÓN COMPLETA</span>
                      </div>
                    ):null
                  ):null}
                />
              );
            })}
          </>
        )}

        {tab==="peso"&&!isDemo&&<PesajeTab user={user}/>}
        {tab==="stats"&&!isDemo&&<Estadisticas sesiones={sesiones.filter(s=>s.es_registro)}/>}

        {tab==="history"&&!isDemo&&(
          <div>
            {sesiones.filter(s=>s.es_registro).length===0?<div style={{textAlign:"center",padding:"48px 24px",color:C.gray}}>Sin sesiones registradas aún.</div>:(
              Object.entries(byWeek).reverse().map(([weekLabel,entries])=>(
                <div key={weekLabel} style={{marginBottom:"24px"}}>
                  <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",letterSpacing:"2px",color:weekLabel.includes("DESCARGA")?C.blueL:C.fire,marginBottom:"10px"}}>📅 {weekLabel} · {entries.filter(s=>s.es_registro).length} sesión{entries.filter(s=>s.es_registro).length!==1?"es":""}</div>
                  {entries.filter(s=>s.es_registro).map(s=>{
                    const hp=parseResponse(s.response_text||"");
                    const isOpen=expandedId===s.id;
                    const hasAlert=hp.alerta&&hp.alerta!=="Ninguna";
                    const intColor=hp.intensidad?.includes("ALTA")?C.fire:hp.intensidad?.includes("MEDIA")?C.gold:C.green;
                    return(
                      <div key={s.id} style={{background:"#0d0d0d",border:`1px solid ${hasAlert?C.red:"#1a1a1a"}`,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}}>
                        <div onClick={()=>setExp(isOpen?null:s.id)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"15px",color:C.white,letterSpacing:"1px"}}>{s.entrenamiento}</div>
                            <div style={{fontSize:"11px",color:C.gray,marginTop:"2px"}}>{formatDateTime(s.created_at)}{s.hora_del_dia!==undefined?` · ${getHorarioLabel(s.hora_del_dia)}`:""}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                            {hp.intensidad&&<span style={{fontSize:"11px",fontFamily:"Bebas Neue, sans-serif",color:intColor,border:`1px solid ${intColor}`,borderRadius:"4px",padding:"2px 7px"}}>{hp.intensidad}</span>}
                            {hasAlert&&<span>⚠️</span>}
                            <span style={{color:C.gray,fontSize:"11px"}}>{isOpen?"▲":"▼"}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",borderTop:"1px solid #1a1a1a"}}>
                          {[{l:"ENERGÍA",v:s.energia},{l:"DESCANSO",v:s.descanso},{l:"ALIMENT.",v:s.alimentacion},{l:"TIEMPO",v:s.tiempo}].map((st,i,arr)=>(
                            <div key={st.l} style={{flex:1,padding:"8px 4px",textAlign:"center",borderRight:i<arr.length-1?"1px solid #1a1a1a":"none"}}><div style={{fontSize:"9px",color:C.gray,fontFamily:"Bebas Neue, sans-serif"}}>{st.l}</div><div style={{fontSize:"13px",color:C.grayL,fontWeight:"700"}}>{st.v}</div></div>
                          ))}
                        </div>
                        {isOpen&&(
                          <div style={{padding:"16px",borderTop:"1px solid #1a1a1a"}}>
                            {/* Solo texto plano para el usuario */}
                            <div style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.7",whiteSpace:"pre-wrap",background:"#0a0a0a",padding:"12px",borderRadius:"6px"}}>
                              {s.response_text||"Sin respuesta registrada"}
                            </div>
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
export default function App(){
  const[user,setUser]=useState(null);
  const[sessionToken,setSessionToken]=useState(null);
  const[alertaVenc,setAlertaVenc]=useState(null);
  const[alertaVisible,setAlertaVisible]=useState(false);
  const[sesionCerrada,setSesionCerrada]=useState(false);
  const[verificando,setVerificando]=useState(true);
  const[isDemo,setIsDemo]=useState(false);
  const[horasDemo,setHorasDemo]=useState(null);
  const[limiteConsultas,setLimiteConsultas]=useState(2);
  const[isPro,setIsPro]=useState(false);
  const[necesitaTerminos,setNecesitaTerminos]=useState(false);

  useEffect(()=>{
    const saved=loadSession();
    if(saved){
      const deviceId=getDeviceId();
      fetch(`${API}/api/verify-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:saved.user.id,sessionToken:saved.token,deviceId})})
        .then(r=>r.json())
        .then(d=>{
          if(d.valid){setUser(saved.user);setSessionToken(saved.token);setIsDemo(saved.user.is_demo||saved.user.role==="demo");}
          else{clearSession();if(d.error==="SESION_CERRADA")setSesionCerrada(true);else if(d.error==="SUSPENDIDO"){clearSession();}}
          setVerificando(false);
        })
        .catch(()=>setVerificando(false));
    }else setVerificando(false);
  },[]);

  const verificarSesion=useCallback(async()=>{
    if(!user||!sessionToken||document.hidden)return;
    try{
      const res=await fetch(`${API}/api/verify-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,sessionToken,deviceId:getDeviceId()})});
      const data=await res.json();
      if(!data.valid){clearSession();setSesionCerrada(true);setUser(null);setSessionToken(null);}
    }catch{}
  },[user,sessionToken]);

  useEffect(()=>{document.addEventListener("visibilitychange",verificarSesion);return()=>document.removeEventListener("visibilitychange",verificarSesion);},[verificarSesion]);

  const handleLogin=(userData,alerta,token,dispositivoNuevo,demo,horas,limite,pro,terminos)=>{
    setUser(userData);setSessionToken(token);setSesionCerrada(false);
    setIsDemo(demo||userData.is_demo||userData.role==="demo");
    setHorasDemo(horas||24);
    setLimiteConsultas(limite||2);
    setIsPro(!!pro);
    setNecesitaTerminos(!!terminos);
    if(alerta){setAlertaVenc(alerta);setAlertaVisible(true);}
    if(dispositivoNuevo)setTimeout(()=>alert("⚠️ Sesión anterior cerrada. Este es tu dispositivo autorizado."),500);
  };

  const handleLogout=()=>{clearSession();setUser(null);setSessionToken(null);setAlertaVenc(null);setAlertaVisible(false);setSesionCerrada(false);setIsDemo(false);setNecesitaTerminos(false);};

  const handleAceptarTerminos=()=>{
    setNecesitaTerminos(false);
    // Actualizar user local
    const saved=loadSession();
    if(saved){saved.user.terminos_aceptados=true;saveSession(saved.user,saved.token);}
  };

  if(verificando)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}><Logo size={100} pulse={true}/><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",color:C.gray,letterSpacing:"3px",marginTop:"16px"}}>CARGANDO...</div></div>
    </div>
  );

  if(sesionCerrada)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{maxWidth:"380px",width:"100%",textAlign:"center"}}>
        <div style={{fontSize:"50px",marginBottom:"16px"}}>📵</div>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"26px",color:C.fire,letterSpacing:"2px",marginBottom:"12px"}}>SESIÓN CERRADA</div>
        <div style={{background:"#1a0a05",border:`1px solid ${C.fire}`,borderRadius:"10px",padding:"20px",marginBottom:"20px"}}><p style={{color:C.grayL,fontSize:"14px",lineHeight:"1.7",fontFamily:"Barlow, sans-serif"}}>Tu sesión fue cerrada porque iniciaste sesión desde otro dispositivo.</p></div>
        <button onClick={()=>setSesionCerrada(false)} style={{padding:"14px 28px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>→ VOLVER A INGRESAR</button>
      </div>
    </div>
  );

  if(!user)return <Login onLogin={handleLogin}/>;

  // Mostrar T&C si es primer inicio
  if(necesitaTerminos&&user.role!=="admin")return <TerminosModal user={user} onAceptar={handleAceptarTerminos}/>;

  return(
    <>
      {alertaVisible&&alertaVenc&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,background:"linear-gradient(90deg,#7c1d0a,#92400e)",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"Bebas Neue, sans-serif",borderBottom:`2px solid ${C.fire}`}}>
          <span style={{fontSize:"16px",color:C.gold,letterSpacing:"2px"}}>⚠️ {alertaVenc}</span>
          <button onClick={()=>setAlertaVisible(false)} style={{background:"transparent",border:"none",color:C.gold,fontSize:"18px",cursor:"pointer"}}>✕</button>
        </div>
      )}
      <div style={{paddingTop:alertaVisible&&alertaVenc?"48px":0}}>
        {user.role==="admin"
          ?<AdminPanel user={user} onLogout={handleLogout}/>
          :<Coach user={user} onLogout={handleLogout} isDemo={isDemo} limiteConsultas={limiteConsultas} isPro={isPro}/>
        }
      </div>
    </>
  );
}
