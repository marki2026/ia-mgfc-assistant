import { useState, useEffect, useCallback, useRef } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const WP_NUMBER = "543571587003";
const APP_VERSION = "2.0";
const LOGO_URL = "/logo.png";

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
  @keyframes progress-bar { 0%{width:0%} 20%{width:35%} 60%{width:70%} 85%{width:88%} 100%{width:95%} }
  @keyframes progress-done { from{width:95%} to{width:100%} }
  @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:0% center} }
  @keyframes btn-pulse { 0%,100%{box-shadow:0 4px 30px rgba(249,115,22,.65)} 50%{box-shadow:0 6px 55px rgba(249,115,22,.95)} }
  @keyframes glow-logo { 0%,100%{filter:drop-shadow(0 0 24px rgba(249,115,22,.7)) drop-shadow(0 0 48px rgba(220,38,38,.4))} 50%{filter:drop-shadow(0 0 50px rgba(251,191,36,1)) drop-shadow(0 0 80px rgba(249,115,22,.6))} }
  @keyframes arrow { from{transform:translateX(0)} to{transform:translateX(6px)} }
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
const PROVINCIAS_AR=["Buenos Aires","CABA","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán"];
const EQUIPAMIENTO_OPTS=["Gym completo (máquinas + pesas libres + todo disponible)","Gym con lo básico (barras, mancuernas, máquinas básicas)","En casa — con equipamiento (pesas, bandas, TRX, etc.)","En casa — solo peso corporal (sin equipamiento)","Al aire libre / parque de calistenia"];
const LUGAR_OPTS=["Gimnasio","Casa","Aire libre","Mixto (gym + casa/exterior)"];

const NIVELES=[
  {v:"PRINCIPIANTE",d:"Series únicas · ejercicios simples · descansos largos"},
  {v:"BÁSICO",d:"Biseries · aislados + compuestos · musculación básica"},
  {v:"INTERMEDIO",d:"Triseries · antagonistas · superseries · variedad"},
  {v:"AVANZADO",d:"Escalonadas · técnicas de intensidad · potencia · fuerza"},
];

const REFERENCIAS=[
  {titulo:"⚡ ENERGÍA (1-10)",items:[{v:"1-2",d:"Agotado/a. Lo mejor es descansar."},{v:"3-4",d:"Muy cansado/a. Entrenamiento muy liviano."},{v:"5-6",d:"Regular. Intensidad moderada."},{v:"7-8",d:"Bien. Buen día para entrenar."},{v:"9-10",d:"Excelente. Condiciones óptimas."}]},
  {titulo:"🥗 ALIMENTACIÓN",items:[{v:"MUY MALA",d:"Casi no comiste o comida muy poco nutritiva."},{v:"MALA",d:"Insuficiente o de baja calidad."},{v:"NORMAL",d:"Adecuada, sin excesos ni deficiencias."},{v:"BIEN",d:"Buena, comidas completas y equilibradas."},{v:"MUY BIEN",d:"Óptima con proteínas e hidratación correctas."}]},
  {titulo:"😴 DESCANSO",items:[{v:"1-3h",d:"Muy insuficiente. Alto riesgo de lesión."},{v:"4-5h",d:"Poco descanso. Rendimiento reducido."},{v:"6-7h",d:"Descanso aceptable a bueno."},{v:"8h+",d:"Óptimo. Recuperación completa."}]},
  {titulo:"🔥 INTENSIDAD",items:[{v:"BAJA",d:"Movilidad, elongación, caminata regenerativa."},{v:"MEDIA",d:"Esfuerzo moderado con control."},{v:"ALTA",d:"Máxima exigencia. Condiciones ideales."}]},
  {titulo:"🏋️ NIVEL DE RUTINA",items:[{v:"PRINCIPIANTE",d:"Series únicas, ejercicios simples, mucho descanso."},{v:"BÁSICO",d:"Biseries, mezcla de aislados y compuestos."},{v:"INTERMEDIO",d:"Triseries, antagonistas, superseries."},{v:"AVANZADO",d:"Técnicas avanzadas, potencia, fuerza máxima."}]},
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

function buildSystemPrompt(isDemo,incluirRutina,nivelRutina,incluirTablero){
  const nivelInfo=incluirRutina&&nivelRutina?`\nNIVEL DE RUTINA: ${nivelRutina}\n- PRINCIPIANTE: series únicas, ejercicios mecánicos simples, descansos 90-120s\n- BÁSICO: biseries, aislados+compuestos, descansos 60-90s\n- INTERMEDIO: triseries, antagonistas, superseries, descansos 45-60s\n- AVANZADO: escalonadas, superseries complejas, técnicas avanzadas, descansos 30-45s`:"";
  if(isDemo)return`Actúa como coach de entrenamiento. Versión DEMO simplificada. Respuesta básica y breve. Al final de MOTIVO agregá: "Versión demo — análisis completo disponible en versión oficial."\nFORMATO:\nDECISIÓN PRINCIPAL:\nINTENSIDAD RECOMENDADA:\nBAJA / MEDIA / ALTA\nAJUSTE DE DESCANSO:\nAJUSTE DE ALIMENTACIÓN:\nALERTA:\nCONSULTAR A COACH:\nSÍ / NO\nMOTIVO:\nSin texto extra.`;
  return`Actúa como sistema experto en entrenamiento físico. Rol: Coach de decisiones — directo, sin motivación vacía.\n\nVALORES: DESCANSO:1h-8h+ · ENERGÍA:1-10 · ALIMENTACIÓN:MUY MALA/MALA/NORMAL/BIEN/MUY BIEN · TIEMPO:30min-120min+\n\nREGLAS:\n- Una decisión clara y directa\n- Analizá historial: sobreentrenamiento, grupos repetidos <48h, rachas sin descanso\n- Mismo grupo <48h: ALERTA\n- >6 días consecutivos: recuperación\n- Semana DESCARGA: intensidad 50-60%\n- Si tiene condición médica: SIEMPRE priorizarla\n- Si practica disciplina deportiva: orientar para complementarla\n- Si MUJER EN ETAPA MENSTRUAL: baja-media intensidad, movilidad, sin esfuerzo máximo\n- Dolor: considerarlo siempre\n- Si el historial incluye RUTINAS PREVIAS EJECUTADAS: analizalas obligatoriamente. Podés repetir el estímulo muscular pero con ejercicios DISTINTOS. PROHIBIDO dar la misma rutina exacta. Si el entrenamiento es igual a las últimas 2 sesiones, cambiá al menos el 60% de los ejercicios${nivelInfo}\n${incluirRutina?"\nAL GENERAR RUTINA:\n- Adaptá al nivel indicado, tiempo disponible, dolor y energía\n- Formato: Nombre · Series x Reps · Técnica si aplica · Nota si hay dolor":""}\n\nFORMATO (etiquetas exactas):\nDECISIÓN PRINCIPAL:\nINTENSIDAD RECOMENDADA:\nBAJA / MEDIA / ALTA\nAJUSTE DE DESCANSO:\nAJUSTE DE ALIMENTACIÓN:\nALERTA:\n(si aplica, sino: Ninguna)\nCONSULTAR A COACH:\nSÍ / NO\nMOTIVO:\n(máx 2 líneas)\n${incluirRutina?"---\nRUTINA DEL DÍA:\n(Lista numerada según nivel)":""}\n\n${incluirTablero?`TABLERO TÁCTICO OBLIGATORIO: El usuario solicitó explícitamente el tablero táctico. DEBÉS incluirlo siempre al final de tu respuesta, incluso si el ejercicio no es de desplazamiento — adaptá uno de los ejercicios para que tenga componente espacial en cancha.`:`TABLERO TÁCTICO (SOLO si la disciplina es fútbol/hockey/básquet/vóley Y la rutina incluye ejercicio de desplazamiento en cancha con conos, patrones o movimiento espacial):`}\nAgregá al final del response, en una sola línea:\nTABLERO:{"campo":"futbol|hockey|basket|voley","elementos":[{"tipo":"cono|jugador|pelota|zona","x":0.0,"y":0.0,"color":"naranja|amarillo|rojo|azul|blanco"},...],"trayectorias":[{"de":{"x":0.0,"y":0.0},"a":{"x":0.0,"y":0.0},"tipo":"sprint|trote|cambio_ritmo|lateral|retroceso","orden":1},...],"descripcion":"descripción breve del ejercicio"}\nCOORDENADAS: x=0 izquierda, x=1 derecha, y=0 arco/red/aro propio, y=1 fondo campo del jugador. Máximo 6 elementos y 4 trayectorias.\nSin texto extra.`;
}

function parseResponse(text){
  const parsed={};
  // Strip TABLERO block before parsing sections
  const tableroMatch=text.match(/\*{0,2}TABLERO:\*{0,2}\s*(\{[\s\S]*?\})\s*$/m);
  if(tableroMatch){try{parsed.tablero=JSON.parse(tableroMatch[1]);}catch(e){parsed.tablero=null;}}
  const cleanText=tableroMatch?text.slice(0,tableroMatch.index):text;
  SECTIONS.forEach((s,i)=>{
    const start=cleanText.indexOf(s.label+":");
    if(start===-1)return;
    const nextLabels=SECTIONS.slice(i+1).map(ns=>ns.label+":");
    let end=cleanText.length;
    nextLabels.forEach(nl=>{const idx=cleanText.indexOf(nl,start);if(idx!==-1&&idx<end)end=idx;});
    parsed[s.key]=cleanText.slice(start+s.label.length+1,end).replace(/^---\s*/gm,"").trim();
  });
  return parsed;
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Logo({size=140,pulse=true}){return <img src="/logo.png" alt="MG+IA" className={pulse?"pulse-fire":""} style={{width:size,height:"auto",objectFit:"contain",display:"block"}} onError={e=>e.target.style.display="none"}/>;}
function LogoWatermark(){return <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:0,opacity:0.06}}><img src="/logo.png" alt="" style={{width:"500px",height:"auto"}} onError={e=>e.target.style.display="none"}/></div>;}

function DiasRestantesBadge({fechaExp}){
  const dias=getDiasRestantes(fechaExp);
  if(dias===null)return null;
  const color=dias<0?C.red:dias<=3?C.red:dias<=7?C.fire:dias<=15?C.gold:C.green;
  const label=dias<0?"VENCIDO":dias===0?"VENCE HOY":`${dias} DÍAS`;
  return <div style={{display:"inline-flex",alignItems:"center",gap:"6px",padding:"4px 12px",borderRadius:"20px",border:`1px solid ${color}`,background:`${color}18`}}><div style={{width:"6px",height:"6px",borderRadius:"50%",background:color}}/><span style={{fontSize:"11px",fontWeight:"700",color,fontFamily:"Bebas Neue",letterSpacing:"0.1em"}}>{label}</span></div>;
}

function Toggle({value,onChange}){return <div onClick={onChange} style={{width:"48px",height:"26px",borderRadius:"13px",background:value?C.fire:"#222",border:`1px solid ${value?C.fire:"#444"}`,position:"relative",cursor:"pointer",transition:"all .2s",flexShrink:0}}><div style={{position:"absolute",top:"3px",left:value?"24px":"3px",width:"18px",height:"18px",borderRadius:"50%",background:C.white,transition:"left .2s",boxShadow:value?`0 0 8px ${C.fire}`:"none"}}/></div>;}

const inputSt={width:"100%",background:"#111",border:"1px solid #2a2a2a",borderRadius:"8px",color:C.white,padding:"12px 14px",fontSize:"14px",outline:"none",fontFamily:"Barlow, sans-serif"};
const inputDone=(val)=>({...inputSt,border:`1px solid ${val&&String(val).trim()?"#22c55e":"#2a2a2a"}`,boxShadow:val&&String(val).trim()?"0 0 0 1px #22c55e22":""});
const labelSt={display:"block",fontSize:"13px",fontWeight:"700",letterSpacing:"0.15em",color:"#94a3b8",marginBottom:"6px",fontFamily:"Bebas Neue",textTransform:"uppercase"};
const cardSt={background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:"12px",padding:"18px",marginBottom:"14px"};

// ─── LOADING BUTTON ───────────────────────────────────────────────────────────
function LoadingButton({loading,done,onClick,children}){
  return(
    <div style={{position:"relative",overflow:"hidden",borderRadius:"8px",marginTop:"16px"}}>
      <button onClick={onClick} disabled={loading} style={{width:"100%",padding:"16px",background:loading?"#1a1a1a":`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"20px",fontWeight:"900",letterSpacing:"3px",cursor:loading?"not-allowed":"pointer",fontFamily:"Bebas Neue, sans-serif",position:"relative",zIndex:1,boxShadow:loading?"none":`0 4px 24px ${C.red}66`}}>
        {loading?"ANALIZANDO...":children}
      </button>
      {loading&&(
        <div style={{position:"absolute",bottom:0,left:0,height:"4px",background:`linear-gradient(90deg,${C.green},#86efac)`,animation:"progress-bar 12s ease forwards",borderRadius:"0 0 8px 8px",zIndex:2}}/>
      )}
    </div>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({icon,label,content,isAlert,isRutina,isIntensity,extra,isDemo,isDemoBlocked,notaRutina,onNotaChange,onNotaGuardar,notaGuardada,isAdmin}){
  const intColor=content?.includes("ALTA")?C.fire:content?.includes("MEDIA")?C.gold:C.green;
  const[copied,setCopied]=useState(false);
  const[exModal,setExModal]=useState(null);

  const handleCopy=()=>{
    if(content){navigator.clipboard.writeText(content).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}
  };

  if(isDemoBlocked)return(
    <div className="slide-up" style={{background:"#0a0800",border:"1px solid #92400e",borderRadius:"10px",padding:"16px",marginBottom:"10px"}}>
      <div style={{fontSize:"18px",fontWeight:"900",letterSpacing:"0.2em",color:"#b45309",marginBottom:"8px",fontFamily:"Bebas Neue",borderBottom:"1px solid #92400e",paddingBottom:"8px"}}>{icon} {label}</div>
      <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 12px",background:"#1a0f00",borderRadius:"6px",border:"1px solid #92400e"}}>
        <span>🔒</span><span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"1px"}}>FUNCIÓN BLOQUEADA EN VERSIÓN DEMO</span>
      </div>
    </div>
  );

  return(
    <div className="slide-up" style={{background:isAlert?"#1a0505":"#0d0d0d",border:`1px solid ${isAlert?C.red:isRutina?C.blue:"#333"}`,borderRadius:"10px",padding:"16px",marginBottom:"10px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px",borderBottom:`2px solid ${isAlert?C.red:C.fire}88`,paddingBottom:"10px"}}>
        <div style={{fontSize:"18px",fontWeight:"900",letterSpacing:"0.2em",color:isAlert?C.red:C.fire,fontFamily:"Bebas Neue"}}>{icon} {label}</div>
        {isRutina&&content&&!isDemoBlocked&&(
          <button onClick={handleCopy} style={{padding:"5px 12px",background:copied?"#0d2010":"#111",border:`1px solid ${copied?C.green:"#333"}`,borderRadius:"6px",color:copied?C.green:C.gray,fontSize:"11px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer",flexShrink:0}}>
            {copied?"✅ COPIADO":"📋 COPIAR"}
          </button>
        )}
      </div>
      {isDemo&&!isAlert&&<div style={{marginBottom:"10px",padding:"6px 10px",background:"#0a0800",border:"1px solid #92400e55",borderRadius:"6px",fontSize:"11px",color:"#b45309",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>⚠️ RESPUESTA SIMPLIFICADA · VERSIÓN DEMO</div>}
      <div style={{fontSize:isIntensity?"40px":"15px",fontWeight:isIntensity?"900":"400",fontFamily:isIntensity?"Bebas Neue":"Barlow, sans-serif",color:isIntensity?intColor:isAlert?"#fca5a5":C.white,lineHeight:"1.6",whiteSpace:isRutina?"normal":"pre-wrap",textShadow:isIntensity?`0 0 30px ${intColor}`:"none"}}>
        {isRutina&&content?<RutinaContent content={content} onExercise={setExModal}/>:content}
      </div>
      {exModal&&<ExerciseModal nombre={exModal} onClose={()=>setExModal(null)} isAdmin={isAdmin}/>}
      {isRutina&&content&&!isDemoBlocked&&(
        <div style={{marginTop:"14px",borderTop:"1px solid #1a1a1a",paddingTop:"12px"}}>
          <label style={{...labelSt,color:C.gold,marginBottom:"6px"}}>📝 TU NOTA PERSONAL (opcional)</label>
          <textarea
            value={notaRutina||""}
            onChange={e=>onNotaChange&&onNotaChange(e.target.value)}
            placeholder="Ej: aumenté peso en press, dolor leve en hombro, completé todas las series..."
            rows={3}
            style={{...inputSt,resize:"vertical",fontSize:"13px",lineHeight:"1.6"}}
          />
          <button onClick={onNotaGuardar}
            style={{marginTop:"8px",padding:"8px 18px",background:notaGuardada?`linear-gradient(135deg,#16a34a,#15803d)`:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>
            {notaGuardada?"✅ NOTA GUARDADA":"💾 GUARDAR NOTA"}
          </button>
        </div>
      )}
      {extra}
    </div>
  );
}

// ─── EXERCISE MEDIA MODAL ────────────────────────────────────────────────────
function getYouTubeId(url){
  if(!url)return null;
  const m=url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([^&\n?#]{11})/);
  return m?m[1]:null;
}
function ExerciseModal({nombre,onClose,isAdmin}){
  const[media,setMedia]=useState(null);
  const[loading,setLoading]=useState(true);
  const[editUrl,setEditUrl]=useState("");
  const[editDesc,setEditDesc]=useState("");
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState(false);
  useEffect(()=>{
    fetch(`${API}/api/ejercicio-media/${encodeURIComponent(nombre.toLowerCase().trim())}`)
      .then(r=>r.json())
      .then(d=>{setMedia(d.media||null);setEditUrl(d.media?.gif_url||"");setEditDesc(d.media?.descripcion||"");setLoading(false);})
      .catch(()=>setLoading(false));
  },[nombre]);
  const handleSave=async()=>{
    setSaving(true);
    try{
      const r=await fetch(`${API}/api/admin/ejercicio-media`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre:nombre.toLowerCase().trim(),gif_url:editUrl,descripcion:editDesc,validado:true})});
      const d=await r.json();
      if(d.success){setMedia(d.media);setSaved(true);setTimeout(()=>setSaved(false),2500);}
    }catch(e){}
    setSaving(false);
  };
  const videoId=getYouTubeId(media?.gif_url||"");
  return(
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:3000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#0d0d0d",border:`2px solid ${C.blue}`,borderRadius:"16px 16px 0 0",padding:"20px",width:"100%",maxWidth:"640px",maxHeight:"88vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()} className="slide-up">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
          <div style={{fontFamily:"Bebas Neue",fontSize:"17px",color:C.blue,letterSpacing:"2px"}}>▶ {nombre.toUpperCase()}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.gray,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>
        {loading?(
          <div style={{textAlign:"center",padding:"40px",color:C.gray,fontFamily:"Bebas Neue",letterSpacing:"2px"}}>CARGANDO...</div>
        ):videoId?(
          <div>
            <div style={{position:"relative",paddingBottom:"56.25%",height:0,borderRadius:"10px",overflow:"hidden",marginBottom:"12px",background:"#000"}}>
              <iframe src={`https://www.youtube.com/embed/${videoId}`} title={nombre} allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",border:"none"}}/>
            </div>
            {media?.descripcion&&<div style={{fontSize:"14px",color:C.white,fontFamily:"Barlow",lineHeight:"1.7",marginBottom:"12px",padding:"10px",background:"#111",borderRadius:"8px"}}>{media.descripcion}</div>}
          </div>
        ):(
          <div style={{textAlign:"center",padding:"28px",border:"1px solid #222",borderRadius:"10px",marginBottom:"12px"}}>
            <div style={{fontSize:"36px",marginBottom:"8px"}}>🎬</div>
            <div style={{fontFamily:"Bebas Neue",fontSize:"13px",color:C.gray,letterSpacing:"1px",marginBottom:"12px"}}>VIDEO NO ASIGNADO AÚN</div>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(nombre+" ejercicio técnica correcta")}`} target="_blank" rel="noreferrer" style={{display:"inline-block",padding:"10px 20px",background:"linear-gradient(135deg,#dc2626,#ef4444)",borderRadius:"8px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue",letterSpacing:"1px",textDecoration:"none"}}>🔍 BUSCAR EN YOUTUBE</a>
          </div>
        )}
        {isAdmin&&(
          <div style={{borderTop:"1px solid #1a1a1a",paddingTop:"14px",marginTop:"4px"}}>
            <div style={{fontFamily:"Bebas Neue",fontSize:"12px",color:C.gold,letterSpacing:"1px",marginBottom:"8px"}}>⚙️ ADMIN — ASIGNAR VIDEO</div>
            <input value={editUrl} onChange={e=>setEditUrl(e.target.value)} placeholder="URL de YouTube (ej: https://youtu.be/xxxxx)" style={{...inputSt,marginBottom:"8px",fontSize:"12px"}}/>
            <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Descripción técnica del ejercicio (opcional)" rows={2} style={{...inputSt,resize:"vertical",fontSize:"12px",marginBottom:"8px"}}/>
            <button onClick={handleSave} disabled={saving||!editUrl} style={{width:"100%",padding:"10px",background:saved?"#16a34a":`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"14px",fontFamily:"Bebas Neue",letterSpacing:"1px",cursor:saving||!editUrl?"not-allowed":"pointer"}}>
              {saving?"GUARDANDO...":saved?"✅ GUARDADO":"💾 GUARDAR VIDEO"}
            </button>
          </div>
        )}
        <button onClick={onClose} style={{width:"100%",padding:"12px",background:"#111",border:"1px solid #222",borderRadius:"8px",color:C.gray,fontSize:"13px",fontFamily:"Bebas Neue",letterSpacing:"2px",cursor:"pointer",marginTop:"10px"}}>← VOLVER A LA RUTINA</button>
      </div>
    </div>
  );
}

function RutinaContent({content,onExercise}){
  const lines=content.split("\n");
  return(
    <div style={{fontSize:"15px",fontFamily:"Barlow, sans-serif",color:C.white,lineHeight:"1.7"}}>
      {lines.map((line,i)=>{
        const clean=line.replace(/\*\*/g,"").trim();
        if(!clean)return <div key={i} style={{height:"6px"}}/>;
        const isExercicio=/[·×x]\s*\d|(?:series|reps|kg|\d+rm|descanso)/i.test(clean)&&!/^\s*[#\*]{2,}/.test(clean);
        let ejercicio=null;
        if(isExercicio){
          const m=clean.match(/^[-–\*\d\.\)\s]*(.+?)(?:\s*[·:]\s*|\s+\d+\s*[x×]\s*\d|\s+x\s*\d)/i);
          if(m)ejercicio=m[1].replace(/^[-–\*\s]+/,"").trim();
        }
        return(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:"6px",marginBottom:"1px"}}>
            <span style={{flex:1,whiteSpace:"pre-wrap"}}>{line}</span>
            {ejercicio&&<button onClick={()=>onExercise(ejercicio)} title="Ver ejercicio" style={{flexShrink:0,background:"transparent",border:`1px solid ${C.blue}55`,borderRadius:"4px",color:C.blue,fontSize:"12px",padding:"1px 5px",cursor:"pointer",marginTop:"3px",lineHeight:"1.4"}}>👁️</button>}
          </div>
        );
      })}
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
  const[scrolled,setScrolled]=useState(false);
  const[accepting,setAccepting]=useState(false);
  const[showLegal,setShowLegal]=useState(false);
  const handleScroll=e=>{const el=e.target;if(el.scrollHeight-el.scrollTop<=el.clientHeight+50)setScrolled(true);};
  const handleAceptar=async()=>{
    setAccepting(true);
    try{await fetch(`${API}/api/aceptar-terminos`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id})});}catch{}
    onAceptar();
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
          <p style={{marginBottom:"12px"}}><strong style={{color:C.red}}>2. LIMITACIÓN MÉDICA (IMPORTANTE):</strong> La app NO es un servicio médico. Las recomendaciones son orientativas y NO reemplazan la consulta con médicos, kinesiólogos ni profesionales de la salud. Ante cualquier dolor o síntoma inusual, detenés el entrenamiento y consultás un profesional.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>3. RESPONSABILIDAD:</strong> El titular no asume responsabilidad por lesiones o daños derivados del uso de las recomendaciones. El usuario asume responsabilidad por la veracidad de los datos ingresados.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>4. SUSCRIPCIÓN:</strong> 30 días corridos desde la activación. Sin reintegros una vez activada. Precio sujeto a cambios con 15 días de preaviso.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>5. CUENTA Y SEGURIDAD:</strong> Un solo dispositivo autorizado por cuenta. Prohibido compartir credenciales.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>6. CONSULTAS DIARIAS:</strong> Plan Standard: 2/día · Plan PRO: 5/día · Demo: 3 en 24hs. Solo la primera consulta del día se registra en el historial.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>7. DATOS PERSONALES:</strong> Tratamiento conforme a Ley 25.326. Datos usados exclusivamente para prestar el servicio. No se comparten con terceros con fines comerciales.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>8. PROPIEDAD INTELECTUAL:</strong> La app, código, nombre "MG+IA Personal Trainer 24/7" y contenido son propiedad exclusiva de Marcos Giménez — Ley 11.723.</p>
          <p style={{marginBottom:"12px"}}><strong style={{color:C.fire}}>9. DATOS SENSIBLES:</strong> La información sobre ciclo menstrual es voluntaria, solo para adaptar recomendaciones y no compartida con terceros.</p>
          <p style={{marginBottom:"24px"}}><strong style={{color:C.fire}}>10. JURISDICCIÓN:</strong> Tribunales Ordinarios de Córdoba, Argentina. Ley 24.240 de Defensa del Consumidor.</p>
          <p style={{color:C.gold,fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",letterSpacing:"1px",textAlign:"center"}}>AL ACEPTAR CONFIRMÁS HABER LEÍDO ESTOS TÉRMINOS. ACEPTACIÓN VÁLIDA COMO FIRMA DIGITAL CON FECHA Y HORA REGISTRADA.</p>
          {!scrolled&&<p style={{marginTop:"16px",textAlign:"center",fontSize:"12px",color:C.gray}}>↓ Scrolleá hasta el final para habilitar el botón ↓</p>}
        </div>
        <div style={{padding:"16px 20px",borderTop:`1px solid #222`}}>
          {!scrolled&&<div style={{marginBottom:"10px",padding:"8px 12px",background:"#1a0f00",border:`1px solid ${C.gold}`,borderRadius:"6px",fontSize:"12px",color:C.gold,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",textAlign:"center"}}>↑ DEBÉS LEER HASTA EL FINAL PARA CONTINUAR</div>}
          <button onClick={handleAceptar} disabled={!scrolled||accepting} style={{width:"100%",padding:"14px",background:scrolled?`linear-gradient(135deg,${C.red},${C.fire})`:"#222",border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:scrolled?"pointer":"not-allowed",opacity:scrolled?1:0.5}}>
            {accepting?"REGISTRANDO...":"✅ ACEPTO LOS TÉRMINOS Y CONDICIONES"}
          </button>
          <p style={{marginTop:"8px",fontSize:"10px",color:C.gray,textAlign:"center",fontFamily:"Barlow, sans-serif"}}>Aceptación registrada con fecha y hora · {new Date().toLocaleString("es-AR")}</p>
          <div style={{marginTop:"10px",textAlign:"center"}}>
            <button onClick={()=>setShowLegal(true)} style={{background:"transparent",border:"none",color:C.gray,fontSize:"11px",fontFamily:"Barlow, sans-serif",cursor:"pointer",textDecoration:"underline"}}>📄 Ver documentación legal completa</button>
          </div>
        </div>
        {showLegal&&<LegalModal onClose={()=>setShowLegal(false)}/>}
      </div>
    </div>
  );
}

// ─── LEGAL MODAL ──────────────────────────────────────────────────────────────
const LEGAL_NOMBRE="MG+IA PERSONAL TRAINER 24/7";
const LEGAL_DOMINIO="mgfitnesscenter.com.ar";

function LegalSec({titulo,children}){return(<div style={{marginBottom:"24px"}}><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"8px",borderBottom:`1px solid #222`,paddingBottom:"5px"}}>{titulo}</div>{children}</div>);}
function LP({children,col}){return <p style={{marginBottom:"10px",color:col||C.grayL,lineHeight:"1.8",fontSize:"13px"}}>{children}</p>;}
function LB({children}){return <strong style={{color:C.fire}}>{children}</strong>;}

function TcContent(){return(<div>
  <div style={{marginBottom:"16px",textAlign:"center"}}><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.white}}>TÉRMINOS Y CONDICIONES DE USO</div><div style={{fontSize:"11px",color:C.gray,marginTop:"4px"}}>{LEGAL_NOMBRE} · Última actualización: Mayo 2026 · v2.0</div></div>
  <LegalSec titulo="DATOS DEL TITULAR"><LP>Marcos Giménez · DNI: 31.996.621 · CUIL: 20-31996621-9</LP><LP>Categoría: Monotributista B · Actividad: Servicios de acondicionamiento físico / Gimnasio</LP><LP>Domicilio fiscal: 25 de Mayo 458, Almafuerte, Córdoba, CP 5854</LP><LP>Domicilio comercial: Corrientes 565, Almafuerte, Córdoba, CP 5854</LP><LP>WhatsApp: 3571-587003 · App: {LEGAL_DOMINIO}</LP></LegalSec>
  <LegalSec titulo="ART. 1 — ACEPTACIÓN"><LP>El acceso y uso de <LB>{LEGAL_NOMBRE}</LB> (en adelante "la App") implica la aceptación plena, sin reservas, de los presentes Términos y Condiciones. Si el usuario no está de acuerdo, deberá abstenerse de utilizar la App.</LP><LP>El usuario declara ser mayor de 18 años o contar con autorización de su representante legal.</LP></LegalSec>
  <LegalSec titulo="ART. 2 — DESCRIPCIÓN DEL SERVICIO"><LP>La App es una herramienta digital de asistencia para la planificación del entrenamiento físico, que utiliza inteligencia artificial para generar recomendaciones personalizadas. El servicio incluye, según el plan contratado: decisiones diarias asistidas por IA, registro y seguimiento de sesiones, registro de pesaje corporal, estadísticas de progreso, comunicación con el coach y panel de historial.</LP><LP>El servicio se presta en el marco de <LB>MG Fitness Center</LB>, gimnasio ubicado en Corrientes 565, Almafuerte, Córdoba, CP 5854.</LP></LegalSec>
  <LegalSec titulo="ART. 3 — LIMITACIÓN DE RESPONSABILIDAD MÉDICA"><LP col="#fca5a5"><LB>Este artículo es de especial importancia y el usuario declara haberlo leído y comprendido.</LB></LP><LP><LB>3.1.</LB> La App <LB>no es un servicio médico, de salud ni de nutrición clínica</LB>. Las recomendaciones son de carácter orientativo con finalidad deportiva.</LP><LP><LB>3.2.</LB> Las recomendaciones <LB>no reemplazan</LB> la consulta con médicos, kinesiólogos, nutricionistas ni ningún profesional de la salud habilitado.</LP><LP><LB>3.3.</LB> El titular <LB>no asume responsabilidad alguna</LB> por lesiones, daños físicos o cualquier consecuencia negativa derivada del uso de las recomendaciones, incluyendo lesiones musculares, articulares, cardiovasculares o metabólicas.</LP><LP><LB>3.4.</LB> El usuario con <LB>condiciones médicas preexistentes</LB> (enfermedades cardiovasculares, diabetes, hipertensión, embarazo, lesiones crónicas u otras) debe consultar con un médico antes de usar la App.</LP><LP><LB>3.5.</LB> Las recomendaciones sobre el <LB>ciclo menstrual</LB> son de carácter general y orientativo. No constituyen consejo médico ni ginecológico.</LP><LP><LB>3.6.</LB> Ante cualquier dolor, molestia o síntoma inusual, el usuario debe <LB>detener la actividad inmediatamente</LB> y consultar con un profesional de la salud.</LP></LegalSec>
  <LegalSec titulo="ART. 4 — SUSCRIPCIÓN Y PAGOS"><LP><LB>4.1.</LB> El acceso está sujeto al pago de una suscripción mensual cuyo valor se informa al momento de la contratación.</LP><LP><LB>4.2.</LB> La suscripción tiene duración de <LB>30 días corridos</LB> desde la activación. Al vencimiento el acceso se suspende automáticamente.</LP><LP><LB>4.3.</LB> El pago se efectúa por los medios habilitados por el titular (efectivo, transferencia bancaria o plataformas de pago digital). La renovación es manual y debe gestionarse con el titular.</LP><LP><LB>4.4.</LB> <LB>No se realizan reintegros</LB> una vez activada la suscripción, salvo caso fortuito o fuerza mayor debidamente acreditado.</LP><LP><LB>4.5.</LB> El titular puede modificar los precios con un preaviso mínimo de <LB>15 días corridos</LB>.</LP><LP><LB>4.6.</LB> El modo demo de 24 horas es gratuito, de uso único por persona, y no genera derecho a reintegro ni continuación del servicio.</LP></LegalSec>
  <LegalSec titulo="ART. 5 — CUENTA Y SEGURIDAD"><LP><LB>5.1.</LB> El usuario es responsable de mantener la confidencialidad de su DNI y contraseña de acceso.</LP><LP><LB>5.2.</LB> Cada cuenta está asociada a <LB>un único dispositivo autorizado</LB> a la vez. El uso desde un segundo dispositivo cerrará la sesión anterior automáticamente. El reingreso desde un dispositivo bloqueado requiere autorización del administrador.</LP><LP><LB>5.3.</LB> Está expresamente <LB>prohibido compartir las credenciales</LB> con terceros. El incumplimiento puede derivar en suspensión inmediata sin derecho a reintegro.</LP><LP><LB>5.4.</LB> El usuario debe notificar inmediatamente ante cualquier uso no autorizado de su cuenta.</LP><LP><LB>5.5.</LB> El titular no asume responsabilidad por daños derivados del incumplimiento de estas obligaciones por parte del usuario.</LP></LegalSec>
  <LegalSec titulo="ART. 6 — DATOS PERSONALES Y PRIVACIDAD"><LP>El tratamiento de datos personales se rige por la <LB>Ley Nacional N° 25.326 de Protección de Datos Personales</LB> de la República Argentina. El detalle completo se encuentra en la Política de Privacidad (pestaña 🔒 PRIVACIDAD), que forma parte integral de estos T&C.</LP></LegalSec>
  <LegalSec titulo="ART. 7 — PROPIEDAD INTELECTUAL"><LP><LB>7.1.</LB> La App, su código fuente, diseño, logotipos, marca "MG Fitness Center", nombre <LB>"{LEGAL_NOMBRE}"</LB>, slogan "Decisiones con 100% ACTITUD!" y todo el contenido son propiedad exclusiva de Marcos Giménez, protegidos por la <LB>Ley N° 11.723 de Propiedad Intelectual</LB>.</LP><LP><LB>7.2.</LB> Queda expresamente prohibida la reproducción, copia, distribución, modificación, ingeniería inversa o cualquier explotación del software o la marca sin autorización escrita del titular.</LP><LP><LB>7.3.</LB> El usuario no adquiere ningún derecho de propiedad intelectual sobre la App por suscribirse.</LP></LegalSec>
  <LegalSec titulo="ART. 8 — CONDUCTA DEL USUARIO"><LP><LB>8.1.</LB> Proporcionar información veraz en el formulario diario. La IA decide en base a los datos ingresados; la responsabilidad por información falsa recae exclusivamente en el usuario.</LP><LP><LB>8.2.</LB> No utilizar la App con fines distintos al entrenamiento personal.</LP><LP><LB>8.3.</LB> No intentar vulnerar, hackear o interferir con el funcionamiento de la App o sus sistemas.</LP><LP><LB>8.4.</LB> No realizar ingeniería inversa sobre el software.</LP></LegalSec>
  <LegalSec titulo="ART. 9 — MODIFICACIONES Y DISPONIBILIDAD"><LP><LB>9.1.</LB> El titular puede modificar, actualizar o descontinuar funcionalidades sin previo aviso, salvo en condiciones de suscripción.</LP><LP><LB>9.2.</LB> Interrupciones por mantenimiento o causas técnicas no generan derecho a compensación o reintegro.</LP><LP><LB>9.3.</LB> Los T&C pueden ser actualizados. La versión vigente siempre es la publicada en la App. El uso continuado implica aceptación de los nuevos términos.</LP></LegalSec>
  <LegalSec titulo="ART. 10 — JURISDICCIÓN Y LEY APLICABLE"><LP>Ante cualquier controversia, las partes se someten a la jurisdicción de los <LB>Tribunales Ordinarios de la ciudad de Córdoba</LB>, República Argentina, con renuncia a cualquier otro fuero. Rige la <LB>Ley N° 24.240 de Defensa del Consumidor</LB> y sus modificatorias.</LP></LegalSec>
  <LegalSec titulo="ART. 11 — CONTACTO"><LP>Titular: Marcos Giménez · WhatsApp: 3571-587003 · Corrientes 565, Almafuerte, Córdoba, CP 5854 · Horario: Lunes a Viernes 7:00 a 22:00hs</LP></LegalSec>
  <p style={{fontSize:"11px",color:C.gray,textAlign:"center",marginTop:"16px",fontStyle:"italic"}}>Al ingresar a la App el usuario declara haber leído, comprendido y aceptado la totalidad de estos Términos y Condiciones.</p>
</div>);}

function PrivacidadContent(){return(<div>
  <div style={{marginBottom:"16px",textAlign:"center"}}><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.white}}>POLÍTICA DE PRIVACIDAD</div><div style={{fontSize:"11px",color:C.gray,marginTop:"4px"}}>{LEGAL_NOMBRE} · Última actualización: Mayo 2026 · v2.0</div></div>
  <LegalSec titulo="DATOS DEL RESPONSABLE"><LP>Marcos Giménez · DNI: 31.996.621 · CUIL: 20-31996621-9</LP><LP>Domicilio fiscal: 25 de Mayo 458, Almafuerte, Córdoba, CP 5854</LP><LP>Domicilio comercial: Corrientes 565, Almafuerte, Córdoba, CP 5854</LP><LP>WhatsApp: 3571-587003 · App: {LEGAL_DOMINIO}</LP></LegalSec>
  <LegalSec titulo="1. MARCO LEGAL"><LP>Esta Política se elabora en cumplimiento de la <LB>Ley Nacional N° 25.326 de Protección de los Datos Personales</LB> de la República Argentina, su Decreto Reglamentario N° 1558/2001, y las disposiciones de la Dirección Nacional de Protección de Datos Personales (DNPDP).</LP></LegalSec>
  <LegalSec titulo="2. DATOS QUE RECOPILAMOS"><LP><LB>Identificación y acceso:</LB> Número de DNI, nombre y apellido, contraseña (almacenada con hash bcrypt — nunca en texto legible), rol en el sistema.</LP><LP><LB>Suscripción:</LB> Fecha de inicio, fecha de vencimiento, modalidad de acceso (estándar / demo).</LP><LP><LB>Uso y entrenamiento:</LB> Peso corporal, nivel de energía diaria (1-10), horas de descanso, tipo de alimentación, tipo de entrenamiento realizado, dolor o molestias físicas declaradas, disciplina deportiva, sexo declarado, información sobre ciclo menstrual (solo si el usuario la provee voluntariamente), tiempo disponible, hora de consulta.</LP><LP><LB>Técnicos:</LB> Identificador de dispositivo (generado localmente, sin datos de hardware), token de sesión, fecha y hora de inicio de sesión.</LP><LP><LB>Historial:</LB> Registro de sesiones de entrenamiento, historial de pesajes, respuestas generadas por la IA.</LP></LegalSec>
  <LegalSec titulo="3. FINALIDAD DEL TRATAMIENTO"><LP><LB>a) Prestación del servicio:</LB> autenticación, personalización de recomendaciones, seguimiento del progreso del usuario.</LP><LP><LB>b) Mejora del servicio:</LB> análisis interno de patrones para mejorar la calidad de las recomendaciones.</LP><LP><LB>c) Seguridad:</LB> verificación de identidad, control de acceso por dispositivo autorizado, prevención de uso no autorizado.</LP><LP><LB>d) Facturación:</LB> control de vigencia del acceso.</LP><LP><LB>e) Comunicación:</LB> contacto ante vencimiento de suscripción o situaciones que requieran atención del coach.</LP><LP col={C.green}><LB>Los datos NO son utilizados para:</LB> publicidad de terceros · venta o cesión a empresas externas · perfilado comercial ajeno al servicio · ningún fin distinto a los declarados.</LP></LegalSec>
  <LegalSec titulo="4. DATOS SENSIBLES"><LP>La información sobre el <LB>ciclo menstrual</LB> constituye un dato sensible (Art. 2, Ley 25.326). Su recolección es voluntaria y opcional — se puede usar la App sin proveer esta información. Su uso es de finalidad exclusiva — solo para adaptar recomendaciones de entrenamiento. No se comparte con terceros bajo ninguna circunstancia. El titular adopta medidas de seguridad reforzadas para este tipo de datos.</LP></LegalSec>
  <LegalSec titulo="5. ALMACENAMIENTO Y SEGURIDAD"><LP><LB>Dónde:</LB> Los datos se almacenan en <LB>Supabase</LB> (PostgreSQL), servicio en la nube con sede en Estados Unidos (supabase.com/privacy).</LP><LP><LB>Medidas implementadas:</LB> contraseñas hasheadas con bcrypt · comunicaciones cifradas con HTTPS/TLS · tokens de sesión únicos y de duración limitada · control de acceso por dispositivo autorizado · Row Level Security (RLS) en Supabase · variables de entorno para credenciales (nunca expuestas en el código fuente).</LP><LP><LB>Retención:</LB> Los datos se conservan durante la vigencia de la suscripción y por <LB>12 meses</LB> posteriores a la baja, salvo obligación legal de conservación mayor.</LP></LegalSec>
  <LegalSec titulo="6. TRANSFERENCIA A TERCEROS"><LP><LB>Anthropic (IA):</LB> Las consultas son procesadas por Anthropic PBC (EE.UU.). Se envían datos del formulario e historial de sesiones. No se envían datos de identificación personal (DNI, nombre). Política: anthropic.com/privacy.</LP><LP><LB>Supabase:</LB> Base de datos alojada en Supabase Inc. (EE.UU.). Política: supabase.com/privacy.</LP><LP><LB>Vercel:</LB> La interfaz web está alojada en Vercel Inc. (EE.UU.). Política: vercel.com/legal/privacy-policy.</LP><LP col={C.green}><LB>En ningún caso</LB> se ceden datos a terceros con fines publicitarios o comerciales.</LP></LegalSec>
  <LegalSec titulo="7. DERECHOS DEL USUARIO"><LP>En cumplimiento del Art. 14 de la Ley 25.326, el usuario tiene derecho a: <LB>Acceso</LB> (solicitar qué datos están almacenados) · <LB>Rectificación</LB> (corregir datos inexactos o incompletos) · <LB>Supresión</LB> (eliminar datos cuando no sean necesarios para la finalidad declarada) · <LB>Confidencialidad</LB> (sus datos no se comunican a terceros salvo los casos indicados en esta política).</LP><LP>Para ejercer estos derechos: Marcos Giménez · WhatsApp: 3571-587003 · Corrientes 565, Almafuerte, Córdoba. Plazo de respuesta: <LB>10 días hábiles</LB>.</LP></LegalSec>
  <LegalSec titulo="8. AUTORIDAD DE CONTROL"><LP>El usuario puede presentar denuncia ante la <LB>Dirección Nacional de Protección de Datos Personales (DNPDP)</LB>: argentina.gob.ar/aaip/datospersonales · Sarmiento 1118, Ciudad Autónoma de Buenos Aires.</LP></LegalSec>
  <LegalSec titulo="9. COOKIES Y ALMACENAMIENTO LOCAL"><LP>La App utiliza <LB>localStorage</LB> del navegador exclusivamente para mantener la sesión activa entre visitas y almacenar el identificador de dispositivo. No se utilizan cookies de rastreo, publicidad ni analítica de terceros.</LP></LegalSec>
  <LegalSec titulo="10. MODIFICACIONES"><LP>Esta Política puede ser actualizada. La versión vigente siempre estará disponible en la App. Los cambios sustanciales serán notificados al usuario.</LP></LegalSec>
  <p style={{fontSize:"11px",color:C.gray,textAlign:"center",marginTop:"16px",fontStyle:"italic"}}>Titular responsable: Marcos Giménez — CUIL 20-31996621-9 — Almafuerte, Córdoba, Argentina</p>
</div>);}

function PropiedadContent(){return(<div>
  <div style={{marginBottom:"16px",textAlign:"center"}}><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.white}}>PROPIEDAD INTELECTUAL Y COPYRIGHT</div><div style={{fontSize:"11px",color:C.gray,marginTop:"4px"}}>{LEGAL_NOMBRE} · Creación: Abril 2026</div></div>
  <LegalSec titulo="TITULAR"><LP>Marcos Giménez · DNI: 31.996.621 · CUIL: 20-31996621-9</LP><LP>Domicilio fiscal: 25 de Mayo 458, Almafuerte, Córdoba, CP 5854</LP><LP>Domicilio comercial: Corrientes 565, Almafuerte, Córdoba, CP 5854 · WhatsApp: 3571-587003</LP></LegalSec>
  <LegalSec titulo="OBRAS PROTEGIDAS"><LP>Los siguientes elementos están protegidos por la <LB>Ley N° 11.723 de Propiedad Intelectual</LB> de la República Argentina y los tratados internacionales (Convenio de Berna, Convenio de París, Acuerdo TRIPS/ADPIC):</LP><LP><LB>Software:</LB> Código fuente del frontend (React/JavaScript) y backend (Node.js/Express) · Lógica de negocio y algoritmos de detección de sobreentrenamiento y semana de descarga · Prompts de sistema para la IA · Estructura de base de datos y relaciones entre tablas.</LP><LP><LB>Marca y nombre comercial:</LB> Nombre <LB>"{LEGAL_NOMBRE}"</LB> · Slogan "Decisiones con 100% ACTITUD!" · Nombre del gimnasio "MG Fitness Center" · Logo (diseño gráfico circular) · Combinación de colores y tipografía de identidad visual (Bebas Neue + paleta fuego).</LP><LP><LB>Contenido:</LB> Sistema de prompts y formato de respuesta estructurada · Estructura de secciones (DECISIÓN PRINCIPAL, INTENSIDAD RECOMENDADA, etc.) · Metodología de detección de semanas de descarga basada en energía acumulada · Concepto de "coach de decisiones" aplicado al entrenamiento físico personalizado.</LP></LegalSec>
  <LegalSec titulo="DECLARACIÓN DE AUTORÍA"><LP>Marcos Giménez es el autor y titular original de los derechos sobre el software <LB>{LEGAL_NOMBRE}</LB>, desarrollado a partir de abril de 2026, con soporte técnico de herramientas de inteligencia artificial utilizadas como asistente de programación — sin que esto transfiera derechos de autoría a Anthropic PBC ni a ninguna otra entidad.</LP></LegalSec>
  <LegalSec titulo="PROHIBICIONES EXPRESAS"><LP>Queda expresamente prohibido sin autorización escrita de Marcos Giménez: copiar, reproducir o distribuir el código fuente (total o parcialmente) · crear obras derivadas o aplicaciones basadas en este software · usar el nombre "MG Fitness Center", "{LEGAL_NOMBRE}" o el logo con fines comerciales propios · realizar ingeniería inversa del software · sublicenciar o ceder el acceso a terceros · extraer la lógica de negocio para implementarla en otro sistema.</LP></LegalSec>
  <LegalSec titulo="AVISO LEGAL — INTELIGENCIA ARTIFICIAL"><LP>La App utiliza el modelo <LB>Claude</LB> de <LB>Anthropic PBC</LB> (EE.UU.) como motor de IA. La IA no tiene conocimiento de la historia médica completa del usuario; las recomendaciones se basan únicamente en los datos ingresados. El usuario es responsable de evaluar si las recomendaciones son apropiadas para su situación.</LP><LP>Las respuestas generadas por la IA son resultado de un <LB>sistema propietario de prompts</LB> diseñado por Marcos Giménez. El titular se reserva todos los derechos sobre el sistema de prompts y el formato de output. Marcos Giménez es cliente del servicio de API de Anthropic. Anthropic no tiene relación comercial ni legal con los usuarios de la App.</LP></LegalSec>
  <p style={{fontSize:"11px",color:C.gray,textAlign:"center",marginTop:"16px",fontStyle:"italic"}}>Documento orientativo. No reemplaza el asesoramiento de un abogado o contador matriculado.<br/>Titular: Marcos Giménez — CUIL 20-31996621-9 — Almafuerte, Córdoba, Argentina</p>
</div>);}

function LegalModal({onClose}){
  const[tab,setTab]=useState("tc");
  const tabs=[{k:"tc",l:"📋 TÉRMINOS"},{k:"priv",l:"🔒 PRIVACIDAD"},{k:"prop",l:"© PROPIEDAD"}];
  return(
    <div style={{position:"fixed",inset:0,background:"#000000f5",zIndex:4000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div style={{background:"#0d0d0d",border:`1px solid ${C.fire}`,borderRadius:"16px",width:"100%",maxWidth:"640px",maxHeight:"92vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()} className="slide-up">
        <div style={{padding:"14px 20px",borderBottom:`1px solid #222`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.fire,letterSpacing:"2px"}}>📄 DOCUMENTACIÓN LEGAL COMPLETA</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.gray,fontSize:"22px",cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:"10px 16px",borderBottom:`1px solid #222`,display:"flex",gap:"8px",flexWrap:"wrap"}}>
          {tabs.map(t=>(<button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"7px 14px",background:tab===t.k?"#111":"transparent",border:`1px solid ${tab===t.k?C.fire:"#333"}`,borderRadius:"6px",color:tab===t.k?C.fire:C.gray,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{t.l}</button>))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
          {tab==="tc"&&<TcContent/>}
          {tab==="priv"&&<PrivacidadContent/>}
          {tab==="prop"&&<PropiedadContent/>}
        </div>
        <div style={{padding:"12px 16px",borderTop:`1px solid #222`}}>
          <button onClick={onClose} style={{width:"100%",padding:"12px",background:"transparent",border:`1px solid ${C.fire}`,borderRadius:"8px",color:C.fire,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>CERRAR</button>
        </div>
      </div>
    </div>
  );
}

// ─── TACTICAL BOARD ───────────────────────────────────────────────────────────
const VW=100,VH=65;
const fx=x=>x*VW, fy=y=>y*VH;

const COL_TRAY={sprint:"#f97316",trote:"#22c55e",cambio_ritmo:"#fbbf24",lateral:"#60a5fa",retroceso:"#f472b6"};
const COL_CONO={naranja:"#f97316",amarillo:"#fbbf24",rojo:"#dc2626",azul:"#3b82f6",blanco:"#fff",verde:"#22c55e"};

// ── Campos SVG ─────────────────────────────────────────────────────────────────
function CampoFutbol(){return(<g>
  <rect x="0" y="0" width={VW} height={VH} fill="#2d6a4f"/>
  {/* Líneas principales */}
  <rect x=".5" y=".5" width={VW-1} height={VH-1} fill="none" stroke="#fff" strokeWidth=".7"/>
  {/* Línea centro (top) */}
  <line x1="0" y1="0" x2={VW} y2="0" stroke="#fff" strokeWidth=".7"/>
  {/* Arco centro */}
  <path d={`M${VW*.38} 0 A${VW*.14} ${VH*.22} 0 0 1 ${VW*.62} 0`} fill="none" stroke="#fff" strokeWidth=".7"/>
  {/* Área grande */}
  <rect x={VW*.2} y={VH*.65} width={VW*.6} height={VH*.35} fill="rgba(255,255,255,.04)" stroke="#fff" strokeWidth=".7"/>
  {/* Área chica */}
  <rect x={VW*.34} y={VH*.84} width={VW*.32} height={VH*.16} fill="none" stroke="#fff" strokeWidth=".7"/>
  {/* Punto penal */}
  <circle cx={VW*.5} cy={VH*.77} r=".9" fill="#fff"/>
  {/* Arco del área */}
  <path d={`M${VW*.28} ${VH*.65} A${VH*.18} ${VH*.18} 0 0 1 ${VW*.72} ${VH*.65}`} fill="none" stroke="#fff" strokeWidth=".6" strokeDasharray="2 1.5"/>
  {/* Arco (portería) */}
  <rect x={VW*.4} y={VH*.95} width={VW*.2} height={VH*.05} fill="none" stroke="#fff" strokeWidth="1.2"/>
</g>);}

function CampoHockey(){return(<g>
  <rect x="0" y="0" width={VW} height={VH} fill="#1a5e35"/>
  <rect x=".5" y=".5" width={VW-1} height={VH-1} fill="none" stroke="#fff" strokeWidth=".7"/>
  <line x1="0" y1="0" x2={VW} y2="0" stroke="#fff" strokeWidth=".7"/>
  {/* Línea 23m */}
  <line x1="0" y1={VH*.42} x2={VW} y2={VH*.42} stroke="#fff" strokeWidth=".6" strokeDasharray="3 2"/>
  <text x="2" y={VH*.4} fill="#fff" fontSize="3" opacity=".5" fontFamily="monospace">23m</text>
  {/* D (shooting circle) */}
  <path d={`M${VW*.16} ${VH} A${VW*.37} ${VH*.75} 0 0 1 ${VW*.84} ${VH}`} fill="rgba(255,255,255,.05)" stroke="#fff" strokeWidth=".7"/>
  {/* Portería */}
  <rect x={VW*.4} y={VH*.93} width={VW*.2} height={VH*.07} fill="none" stroke="#fff" strokeWidth="1.2"/>
  {/* Punto penal (penalty stroke) */}
  <circle cx={VW*.5} cy={VH*.86} r=".9" fill="#fff"/>
  <line x1={VW*.46} y1={VH*.84} x2={VW*.54} y2={VH*.84} stroke="#fff" strokeWidth=".6"/>
</g>);}

function CampoBasket(){return(<g>
  <rect x="0" y="0" width={VW} height={VH} fill="#7c4a1a"/>
  <rect x=".5" y=".5" width={VW-1} height={VH-1} fill="none" stroke="#fff" strokeWidth=".7"/>
  <line x1="0" y1="0" x2={VW} y2="0" stroke="#fff" strokeWidth=".7"/>
  {/* Pintura */}
  <rect x={VW*.33} y={VH*.62} width={VW*.34} height={VH*.38} fill="rgba(255,255,255,.07)" stroke="#fff" strokeWidth=".7"/>
  {/* Semicírculo tiro libre */}
  <path d={`M${VW*.33} ${VH*.62} A${VW*.17} ${VH*.26} 0 0 1 ${VW*.67} ${VH*.62}`} fill="none" stroke="#fff" strokeWidth=".7"/>
  {/* Línea tiro libre */}
  <line x1={VW*.33} y1={VH*.62} x2={VW*.67} y2={VH*.62} stroke="#fff" strokeWidth=".7"/>
  {/* Arco 3 puntos */}
  <path d={`M${VW*.06} ${VH} A${VW*.46} ${VH*.72} 0 0 1 ${VW*.94} ${VH}`} fill="none" stroke="#fff" strokeWidth=".7"/>
  <line x1={VW*.06} y1={VH*.77} x2={VW*.06} y2={VH} stroke="#fff" strokeWidth=".7"/>
  <line x1={VW*.94} y1={VH*.77} x2={VW*.94} y2={VH} stroke="#fff" strokeWidth=".7"/>
  {/* Zona restringida bajo aro */}
  <path d={`M${VW*.43} ${VH} A${VW*.07} ${VH*.1} 0 0 1 ${VW*.57} ${VH}`} fill="none" stroke="#fff" strokeWidth=".6"/>
  {/* Tablero */}
  <rect x={VW*.43} y={VH*.87} width={VW*.14} height={VH*.025} fill="#fff" opacity=".6"/>
  {/* Aro */}
  <circle cx={VW*.5} cy={VH*.91} r="3" fill="none" stroke="#f97316" strokeWidth="1.4"/>
</g>);}

function CampoVoley(){return(<g>
  <rect x="0" y="0" width={VW} height={VH} fill="#1a3a6a"/>
  <rect x=".5" y=".5" width={VW-1} height={VH-1} fill="none" stroke="#fff" strokeWidth=".7"/>
  {/* Red */}
  <line x1="0" y1="3" x2={VW} y2="3" stroke="#fff" strokeWidth="2.5"/>
  <rect x="0" y="0" width="1.5" height="8" fill="#fff"/>
  <rect x={VW-1.5} y="0" width="1.5" height="8" fill="#fff"/>
  {/* Línea de ataque (3m) */}
  <line x1="0" y1={VH*.48} x2={VW} y2={VH*.48} stroke="#fff" strokeWidth=".7" strokeDasharray="3 2"/>
  <text x="2" y={VH*.46} fill="#fff" fontSize="3.2" opacity=".55" fontFamily="monospace">3m</text>
  {/* Zonas (guías suaves) */}
  <line x1={VW/3} y1="3" x2={VW/3} y2={VH} stroke="#fff" strokeWidth=".3" opacity=".25"/>
  <line x1={VW*2/3} y1="3" x2={VW*2/3} y2={VH} stroke="#fff" strokeWidth=".3" opacity=".25"/>
  <line x1="0" y1={VH*.25} x2={VW} y2={VH*.25} stroke="#fff" strokeWidth=".3" opacity=".25"/>
  {/* Línea servicio */}
  <line x1="0" y1={VH*.9} x2={VW} y2={VH*.9} stroke="#fff" strokeWidth=".5" strokeDasharray="2 2"/>
</g>);}

// Registry extensible — agregar nuevas disciplinas aquí
const CAMPOS={
  futbol: {Campo:CampoFutbol, nombre:"Fútbol",    bg:"#2d6a4f"},
  hockey: {Campo:CampoHockey, nombre:"Hockey",    bg:"#1a5e35"},
  basket: {Campo:CampoBasket, nombre:"Básquet",   bg:"#7c4a1a"},
  voley:  {Campo:CampoVoley,  nombre:"Vóley",     bg:"#1a3a6a"},
  // ↓ Agregar aquí futuras disciplinas:
  // rugby: {Campo:CampoRugby, nombre:"Rugby", bg:"#2d4a1a"},
};

function detectarCampo(disciplina){
  const d=(disciplina||"").toLowerCase();
  if(d.includes("fútbol")||d.includes("futbol")||d.includes("soccer"))return"futbol";
  if(d.includes("hockey"))return"hockey";
  if(d.includes("basket")||d.includes("básquet"))return"basket";
  if(d.includes("voley")||d.includes("vóley")||d.includes("voleibol"))return"voley";
  return null;
}

// ── Elementos SVG ──────────────────────────────────────────────────────────────
function Cono({x,y,color="naranja",size=2.8}){
  const cx=fx(x),cy=fy(y);
  const col=COL_CONO[color]||COL_CONO.naranja;
  return(<g>
    <ellipse cx={cx} cy={cy+size*.7} rx={size*.9} ry={size*.3} fill="rgba(0,0,0,.35)"/>
    <polygon points={`${cx},${cy-size} ${cx-size*.85},${cy+size*.7} ${cx+size*.85},${cy+size*.7}`} fill={col} opacity=".92"/>
    <polygon points={`${cx},${cy-size*.6} ${cx-size*.4},${cy+size*.1} ${cx+size*.4},${cy+size*.1}`} fill="rgba(255,255,255,.2)"/>
  </g>);}

function Jugador({x,y,label,color="#fff",numero=1}){
  const cx=fx(x),cy=fy(y);
  const txt=label||(numero?""+numero:"J");
  return(<g>
    <circle cx={cx} cy={cy} r="4" fill={color} stroke="#111" strokeWidth=".8"/>
    <circle cx={cx} cy={cy} r="4" fill="none" stroke={C.fire} strokeWidth=".4" opacity=".5"/>
    <text x={cx} y={cy+1.4} textAnchor="middle" fontSize="4" fill="#111" fontWeight="bold" fontFamily="Bebas Neue,sans-serif">{txt}</text>
  </g>);}

function Pelota({x,y}){
  const cx=fx(x),cy=fy(y);
  return(<g>
    <circle cx={cx} cy={cy} r="2.2" fill="#fff" stroke="#333" strokeWidth=".5"/>
    <circle cx={cx-.5} cy={cy-.5} r=".8" fill="#ccc" opacity=".4"/>
  </g>);}

function ZonaTrabajo({x,y,w=0.2,h=0.15,color="naranja"}){
  const col=COL_CONO[color]||COL_CONO.naranja;
  return(<rect x={fx(x)} y={fy(y)} width={fx(w)} height={fy(h)}
    fill={col} opacity=".12" stroke={col} strokeWidth=".6" strokeDasharray="2 1.5" rx="1.5"/>);}

// ── Trayectoria animada ────────────────────────────────────────────────────────
function Trayectoria({de,a,tipo="sprint",orden=1,playing,animKey}){
  const x1=fx(de.x),y1=fy(de.y),x2=fx(a.x),y2=fy(a.y);
  const col=COL_TRAY[tipo]||"#fff";
  const dash={sprint:"none",trote:"4 2",cambio_ritmo:"2 2",lateral:"5 3",retroceso:"3 3"}[tipo]||"4 2";
  const delay=(orden-1)*1.1;
  // Curva leve para cambio_ritmo
  const isCurva=tipo==="cambio_ritmo";
  const dx=x2-x1, dy=y2-y1;
  const mx=(x1+x2)/2-dy*.18, my=(y1+y2)/2+dx*.18;
  const d=isCurva?`M${x1},${y1} Q${mx},${my} ${x2},${y2}`:`M${x1},${y1} L${x2},${y2}`;
  const len=Math.hypot(dx,dy)+2;
  // Flecha
  const ang=Math.atan2(y2-y1,x2-x1);
  const ax=x2-Math.cos(ang)*3, ay=y2-Math.sin(ang)*3;
  const lx1=ax+Math.cos(ang-2.4)*2.5, ly1=ay+Math.sin(ang-2.4)*2.5;
  const lx2=ax+Math.cos(ang+2.4)*2.5, ly2=ay+Math.sin(ang+2.4)*2.5;

  const animStyle=playing?{
    strokeDasharray:len,
    strokeDashoffset:0,
    animation:`drawPath 0.9s ${delay}s ease both`
  }:{strokeDasharray:len,strokeDashoffset:len};

  return(<g>
    <path d={d} fill="none" stroke="rgba(0,0,0,.3)" strokeWidth="1.8"/>
    <path d={d} fill="none" stroke={col} strokeWidth="1.5"
      strokeDasharray={animStyle.strokeDasharray}
      strokeDashoffset={animStyle.strokeDashoffset}
      style={playing?{animation:`drawPath 0.9s ${delay}s ease both`}:{}}/>
    <text x={(x1+x2)/2+2} y={(y1+y2)/2-2} textAnchor="middle" fontSize="3.2"
      fill={col} fontWeight="bold" fontFamily="Bebas Neue,sans-serif" opacity=".85">{orden}</text>
    <polygon points={`${x2},${y2} ${lx1},${ly1} ${lx2},${ly2}`} fill={col} opacity=".8"/>
  </g>);}

// ── Componente principal TacticalBoard ─────────────────────────────────────────
function TacticalBoard({data,disciplina}){
  const[playing,setPlaying]=useState(false);
  const[animKey,setAnimKey]=useState(0);

  if(!data)return null;
  const campoKey=data.campo||detectarCampo(disciplina)||null;
  if(!campoKey||!CAMPOS[campoKey])return null;

  const{Campo,nombre}=CAMPOS[campoKey];
  const elementos=data.elementos||[];
  const trayectorias=data.trayectorias||[];

  const tipoLabel={sprint:"⚡ Sprint",trote:"🏃 Trote",cambio_ritmo:"↩️ Cambio ritmo",lateral:"↔️ Lateral",retroceso:"⬇️ Retroceso"};
  const tiposUnicos=[...new Set(trayectorias.map(t=>t.tipo))];

  const handlePlay=()=>{
    if(playing){setPlaying(false);}
    else{setAnimKey(k=>k+1);setTimeout(()=>setPlaying(true),30);}
  };

  return(
    <div style={{marginTop:"16px",background:"#0a0a0a",border:`1px solid ${C.fire}22`,borderRadius:"14px",overflow:"hidden"}}>
      <style>{`@keyframes drawPath{from{stroke-dashoffset:var(--len,120)}to{stroke-dashoffset:0}}`}</style>

      {/* Header */}
      <div style={{padding:"10px 14px",background:"#0d0d0d",borderBottom:"1px solid #1a1a1a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px"}}>
          📋 TABLERO TÁCTICO — {nombre.toUpperCase()}
        </div>
        <div style={{display:"flex",gap:"6px",alignItems:"center"}}>
          <button onClick={handlePlay}
            style={{padding:"6px 16px",background:playing?`linear-gradient(135deg,${C.red},#9b1c1c)`:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"6px",color:"#fff",fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",letterSpacing:"1px",cursor:"pointer",boxShadow:playing?"none":`0 2px 12px ${C.fire}55`}}>
            {playing?"⏸ PAUSA":"▶ REPRODUCIR"}
          </button>
        </div>
      </div>

      {/* Campo SVG */}
      <div style={{padding:"10px",background:"#080808"}}>
        <svg key={animKey} viewBox={`0 0 ${VW} ${VH}`}
          style={{width:"100%",height:"auto",borderRadius:"8px",display:"block",filter:"drop-shadow(0 4px 20px rgba(0,0,0,.5))"}}>

          <Campo/>

          {/* Zonas primero (fondo) */}
          {elementos.filter(e=>e.tipo==="zona").map((e,i)=><ZonaTrabajo key={i} {...e}/>)}

          {/* Trayectorias */}
          {trayectorias.map((t,i)=>(
            <Trayectoria key={i} {...t} orden={t.orden||i+1} playing={playing} animKey={animKey}/>
          ))}

          {/* Conos */}
          {elementos.filter(e=>e.tipo==="cono").map((e,i)=><Cono key={i} {...e}/>)}

          {/* Pelotas */}
          {elementos.filter(e=>e.tipo==="pelota").map((e,i)=><Pelota key={i} {...e}/>)}

          {/* Jugadores (encima de todo) */}
          {elementos.filter(e=>e.tipo==="jugador").map((e,i)=><Jugador key={i} {...e}/>)}
        </svg>
      </div>

      {/* Leyenda */}
      {tiposUnicos.length>0&&(
        <div style={{padding:"8px 14px",borderTop:"1px solid #1a1a1a",display:"flex",flexWrap:"wrap",gap:"10px",alignItems:"center"}}>
          {tiposUnicos.map(tipo=>(
            <div key={tipo} style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <div style={{width:"18px",height:"2.5px",background:COL_TRAY[tipo]||"#fff",borderRadius:"2px"}}/>
              <span style={{fontSize:"10px",color:C.grayL,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>{tipoLabel[tipo]||tipo}</span>
            </div>
          ))}
          <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"10px",height:"10px",background:"transparent",border:"1px solid #f97316",borderRadius:"2px"}}/>
            <span style={{fontSize:"10px",color:C.grayL,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>ZONA</span>
          </div>
        </div>
      )}

      {/* Descripción */}
      {data.descripcion&&(
        <div style={{padding:"10px 14px",borderTop:"1px solid #1a1a1a",fontSize:"12px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.7"}}>
          📌 {data.descripcion}
        </div>
      )}
    </div>
  );
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
function abrirWhatsApp(alerta,motivo,nombre,apellido){
  const texto=encodeURIComponent(`🚨 *CONSULTA COACH - MG+IA PERSONAL TRAINER 24/7*\n\n👤 Usuario: ${nombre} ${apellido}\n\n⚠️ ALERTA: ${alerta||"Sin alerta"}\n\n📋 MOTIVO: ${motivo||"Sin motivo"}\n\n_MG+IA Personal Trainer 24/7 v${APP_VERSION}_`);
  window.open(`https://wa.me/${WP_NUMBER}?text=${texto}`,"_blank");
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// PERFIL INICIAL — aparece una sola vez después de T&C
// ═══════════════════════════════════════════════════════════════════════════════
function PerfilInicial({user, onCompletar}){
  const[form,setForm]=useState({
    telefono:user.telefono||"",
    fechaNac:user.fecha_nacimiento||user.fecha_nac||"",
    altura:"",
    peso:"",
    esSocio:null,
    dias_disponibles:"4",
    lugar:LUGAR_OPTS[0],
    equipamiento:EQUIPAMIENTO_OPTS[0],
    localidad:"",
    provincia:"Córdoba",
    pais:"Argentina",
    tieneCond:!!user.condicion_medica,
    condicion:user.condicion_medica||"",
  });
  const[step,setStep]=useState(1); // 2 pasos
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState(null);
  const set=k=>v=>setForm(f=>({...f,[k]:v}));
  const handleInput=k=>e=>setForm(f=>({...f,[k]:e.target.value}));

  const validarStep1=()=>{
    if(!form.fechaNac){setError("La fecha de nacimiento es obligatoria.");return false;}
    if(!form.altura||isNaN(form.altura)||+form.altura<100||+form.altura>250){setError("Ingresá tu altura en cm (entre 100 y 250).");return false;}
    if(!form.localidad.trim()){setError("Ingresá tu localidad.");return false;}
    setError(null);return true;
  };
  const validarStep2=()=>{
    if(form.esSocio===null){setError("Indicá si sos socio de MG Fitness Center.");return false;}
    if(form.tieneCond&&!form.condicion.trim()){setError("Describí tu condición médica.");return false;}
    setError(null);return true;
  };

  const handleGuardar=async()=>{
    if(!validarStep2())return;
    setSaving(true);
    try{
      const res=await fetch(`${API}/api/completar-perfil`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          userId:user.id,
          telefono:form.telefono,
          fecha_nacimiento:form.fechaNac,
          altura:form.altura?parseFloat(form.altura):null,
          dias_disponibles:parseInt(form.dias_disponibles),
          equipamiento:form.equipamiento,
          lugar_entrenamiento:form.lugar,
          localidad:form.localidad.trim(),
          provincia:form.provincia,
          pais:form.pais||"Argentina",
          condicion_medica:form.tieneCond?form.condicion.trim():"",
          es_socio_mg:form.esSocio,
        })
      });
      const data=await res.json();
      if(data.success){
        const saved=loadSession();
        if(saved){
          Object.assign(saved.user,{perfil_completado:true,es_socio_mg:form.esSocio,telefono:form.telefono,altura:form.altura,condicion_medica:form.tieneCond?form.condicion:"",localidad:form.localidad,provincia:form.provincia});
          saveSession(saved.user,saved.token);
        }
        onCompletar();
      } else setError(data.error||"Error al guardar");
    }catch{setError("Error de conexión");}
    setSaving(false);
  };

  const Req=()=><span style={{color:C.red,marginLeft:"2px"}}>*</span>;
  const Note=({t})=><div style={{fontSize:"11px",color:C.gray,fontFamily:"Barlow, sans-serif",marginTop:"4px"}}>{t}</div>;

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",position:"relative"}}>
      <LogoWatermark/>
      <div style={{width:"100%",maxWidth:"500px",position:"relative",zIndex:1}} className="slide-up">

        <div style={{textAlign:"center",marginBottom:"20px"}}>
          <Logo size={70} pulse={true}/>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"26px",color:C.fire,letterSpacing:"2px",marginTop:"12px"}}>COMPLETÁ TU PERFIL</div>
          <div style={{fontSize:"12px",color:C.gray,fontFamily:"Barlow, sans-serif",marginTop:"4px"}}>Se completa una sola vez. Ayuda a la IA a darte recomendaciones precisas.</div>
          <div style={{display:"flex",justifyContent:"center",gap:"8px",marginTop:"10px"}}>
            {[1,2].map(s=><div key={s} style={{width:step>=s?"40px":"20px",height:"4px",borderRadius:"2px",background:step>=s?C.fire:"#333",transition:"all .3s"}}/>)}
          </div>
          <div style={{fontSize:"11px",color:C.grayL,marginTop:"6px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>PASO {step} DE 2</div>
        </div>

        <div style={cardSt}>

          {step===1&&(
            <>
              {/* DATOS FÍSICOS */}
              <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"14px",borderBottom:`1px solid #222`,paddingBottom:"6px"}}>📏 DATOS FÍSICOS</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}}>
                <div>
                  <label style={labelSt}>Fecha de nacimiento<Req/></label>
                  <input type="date" value={form.fechaNac} onChange={handleInput("fechaNac")} max={new Date().toISOString().slice(0,10)} style={inputDone(form.fechaNac)}/>
                  {form.fechaNac&&<Note t={`Edad: ${Math.floor((new Date()-new Date(form.fechaNac))/31557600000)} años`}/>}
                </div>
                <div>
                  <label style={labelSt}>Altura (cm)<Req/></label>
                  <input type="number" value={form.altura} onChange={handleInput("altura")} placeholder="ej: 175" min="100" max="250" style={inputDone(form.altura)}/>
                  <Note t="Necesaria para las recomendaciones de carga"/>
                </div>
              </div>

              {/* LOCALIZACIÓN */}
              <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"14px",marginTop:"4px",borderBottom:`1px solid #222`,paddingBottom:"6px"}}>📍 LOCALIZACIÓN</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px"}}>
                <div>
                  <label style={labelSt}>Localidad<Req/></label>
                  <input type="text" value={form.localidad} onChange={handleInput("localidad")} placeholder="ej: Almafuerte" style={inputDone(form.localidad)}/>
                </div>
                <div>
                  <label style={labelSt}>Provincia</label>
                  <select value={form.provincia} onChange={handleInput("provincia")} style={inputDone(form.provincia)}>
                    {PROVINCIAS_AR.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{gridColumn:"1/-1"}}>
                  <label style={labelSt}>País</label>
                  <input type="text" value={form.pais} onChange={handleInput("pais")} placeholder="Argentina" style={inputDone(form.pais)}/>
                </div>
              </div>

              {/* ENTRENAMIENTO */}
              <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"14px",borderBottom:`1px solid #222`,paddingBottom:"6px"}}>🏋️ ENTRENAMIENTO</div>
              <div style={{marginBottom:"14px"}}>
                <label style={labelSt}>Días disponibles por semana<Req/></label>
                <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                  {[1,2,3,4,5,6,7].map(d=>(
                    <button key={d} onClick={()=>set("dias_disponibles")(String(d))}
                      style={{width:"40px",height:"40px",border:`1px solid ${form.dias_disponibles===String(d)?C.fire:"#333"}`,borderRadius:"6px",background:form.dias_disponibles===String(d)?`linear-gradient(135deg,${C.red},${C.fire})`:"#111",color:C.white,fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",cursor:"pointer"}}>
                      {d}
                    </button>
                  ))}
                </div>
                <Note t="Días a la semana que podés entrenar"/>
              </div>
              <div style={{marginBottom:"14px"}}>
                <label style={labelSt}>Lugar donde entrenás</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                  {LUGAR_OPTS.map(l=>(
                    <button key={l} onClick={()=>set("lugar")(l)}
                      style={{padding:"10px",border:`1px solid ${form.lugar===l?C.fire:"#333"}`,borderRadius:"6px",background:form.lugar===l?`linear-gradient(135deg,${C.red},${C.fire})`:"#111",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:"4px"}}>
                <label style={labelSt}>Equipamiento disponible<Req/></label>
                <select value={form.equipamiento} onChange={handleInput("equipamiento")} style={inputDone(form.equipamiento)}>
                  {EQUIPAMIENTO_OPTS.map(e=><option key={e}>{e}</option>)}
                </select>
                <Note t="La IA adaptará los ejercicios según lo que tenés disponible"/>
              </div>
            </>
          )}

          {step===2&&(
            <>
              {/* TELÉFONO */}
              <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"14px",borderBottom:`1px solid #222`,paddingBottom:"6px"}}>📞 CONTACTO</div>
              <div style={{marginBottom:"16px"}}>
                <label style={labelSt}>Teléfono (opcional)</label>
                <input type="tel" value={form.telefono} onChange={handleInput("telefono")} placeholder="ej: 3571-587003" style={inputSt}/>
                <Note t="Para que tu coach pueda contactarte si es necesario"/>
              </div>

              {/* SOCIO MG */}
              <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"14px",borderBottom:`1px solid #222`,paddingBottom:"6px"}}>🏅 VÍNCULO CON MG FITNESS CENTER</div>
              <div style={{marginBottom:"16px"}}>
                <label style={labelSt}>¿Sos socio presencial de MG Fitness Center?<Req/></label>
                <Note t="Almafuerte, Córdoba — Corrientes 565"/>
                <div style={{display:"flex",gap:"10px",marginTop:"8px"}}>
                  {[{v:true,l:"🏅 SÍ, SOY SOCIO MG"},{v:false,l:"🌍 ENTRENO EN OTRO LUGAR"}].map(op=>(
                    <button key={String(op.v)} onClick={()=>set("esSocio")(op.v)}
                      style={{flex:1,padding:"12px 8px",background:form.esSocio===op.v?(op.v?`linear-gradient(135deg,${C.blue},${C.blueL})`:`linear-gradient(135deg,${C.red},${C.fire})`):"#111",border:`2px solid ${form.esSocio===op.v?(op.v?C.blueL:C.fire):"#333"}`,borderRadius:"8px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer",lineHeight:"1.4"}}>
                      {op.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* CONDICIÓN MÉDICA */}
              <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"14px",borderBottom:`1px solid #222`,paddingBottom:"6px"}}>🩺 SALUD</div>
              <div style={{marginBottom:"16px"}}>
                <label style={labelSt}>¿Tenés alguna condición médica relevante?</label>
                <div style={{display:"flex",gap:"10px",marginBottom:"10px",marginTop:"6px"}}>
                  {[{v:false,l:"NO"},{v:true,l:"SÍ"}].map(op=>(
                    <button key={String(op.v)} onClick={()=>set("tieneCond")(op.v)}
                      style={{flex:1,padding:"10px",background:form.tieneCond===op.v?(op.v?`linear-gradient(135deg,#9d174d,#be185d)`:`linear-gradient(135deg,#16a34a,#15803d)`):"#111",border:`1px solid ${form.tieneCond===op.v?(op.v?"#ec4899":C.green):"#333"}`,borderRadius:"6px",color:C.white,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>
                      {op.l}
                    </button>
                  ))}
                </div>
                {form.tieneCond&&(
                  <div className="slide-up">
                    <textarea value={form.condicion} onChange={handleInput("condicion")}
                      placeholder="ej: hipertensión controlada, lesión rodilla izquierda, diabetes tipo 2..."
                      style={{...inputSt,minHeight:"80px",resize:"vertical",lineHeight:"1.5"}}/>
                    <Note t="⚠️ La IA priorizará siempre esta información en cada análisis."/>
                  </div>
                )}
              </div>
            </>
          )}

          {error&&<div style={{marginBottom:"14px",padding:"10px",background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"6px",color:"#fca5a5",fontSize:"13px",fontFamily:"Barlow, sans-serif"}}>{error}</div>}

          <div style={{display:"flex",gap:"10px"}}>
            {step===2&&<button onClick={()=>{setStep(1);setError(null);}} style={{padding:"16px 20px",background:"transparent",border:"1px solid #333",borderRadius:"8px",color:C.gray,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>← ATRÁS</button>}
            <button onClick={()=>{
              if(step===1){if(validarStep1())setStep(2);}
              else handleGuardar();
            }} disabled={saving}
              style={{flex:1,padding:"16px",background:saving?"#222":`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"18px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"3px",cursor:saving?"not-allowed":"pointer",boxShadow:saving?"none":`0 4px 24px ${C.red}66`}}>
              {saving?"GUARDANDO...":(step===1?"SIGUIENTE →":"✅ GUARDAR Y CONTINUAR")}
            </button>
          </div>
          <p style={{marginTop:"10px",textAlign:"center",fontSize:"11px",color:C.gray,fontFamily:"Barlow, sans-serif"}}>Los campos con <span style={{color:C.red}}>*</span> son obligatorios</p>
        </div>
      </div>
    </div>
  );
}

function Login({onLogin}){
  const[dni,setDni]=useState("");const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);const[error,setError]=useState(null);
  const[bloqueado,setBloqueado]=useState(false);const[dniGuardado,setDniGuardado]=useState("");
  const handleLogin=async()=>{
    if(!dni||!password){setError("Ingresá tu DNI y contraseña.");return;}
    setLoading(true);setError(null);setBloqueado(false);
    try{
      const res=await fetch(`${API}/api/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dni:dni.trim(),password:password.trim(),deviceId:getDeviceId()})});
      const data=await res.json();
      if(data.success){saveSession(data.user,data.sessionToken);onLogin(data.user,data.alertaVencimiento,data.sessionToken,data.dispositivoNuevo,data.isDemo,data.horasDemo,data.limiteConsultas,data.isPro,data.necesitaTerminos);}
      else if(data.error==="DISPOSITIVO_BLOQUEADO"){setDniGuardado(dni.trim());setBloqueado(true);}
      else setError(data.error||"Credenciales inválidas");
    }catch{setError("No se puede conectar con el servidor.");}
    setLoading(false);
  };
  if(bloqueado)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <LogoWatermark/><div style={{maxWidth:"400px",width:"100%",textAlign:"center",position:"relative",zIndex:1}} className="slide-up">
        <div style={{fontSize:"64px",marginBottom:"20px"}}>🔒</div>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"28px",color:C.red,letterSpacing:"2px",marginBottom:"16px"}}>ACCESO BLOQUEADO</div>
        <div style={{background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"12px",padding:"24px",marginBottom:"24px"}}><p style={{color:"#fca5a5",fontSize:"15px",lineHeight:"1.8",fontFamily:"Barlow, sans-serif"}}>PARA VOLVER A USAR ESTE DISPOSITIVO DEBÉS SOLICITAR AUTORIZACIÓN AL COACH. GRACIAS.</p></div>
        <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent(`Hola, necesito autorización para habilitar mi dispositivo. DNI: ${dniGuardado}`)}`,"_blank")} style={{padding:"14px 24px",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer",width:"100%",marginBottom:"12px"}}>💬 CONTACTAR AL COACH</button>
        <button onClick={()=>setBloqueado(false)} style={{background:"transparent",border:"none",color:C.gray,fontSize:"13px",cursor:"pointer",fontFamily:"Barlow, sans-serif"}}>← Volver</button>
      </div>
    </div>
  );
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",position:"relative",overflow:"hidden"}}>
      <LogoWatermark/><div style={{position:"fixed",inset:0,background:"radial-gradient(ellipse at 50% 100%, #7c1d0a22 0%, transparent 70%)",pointerEvents:"none"}}/>
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
    if(nueva!==conf){setMsg({e:true,t:"Las contraseñas no coinciden"});return;}
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
// ─── ADMIN: GESTIÓN DE MEDIA EJERCICIOS ──────────────────────────────────────
function EjerciciosMediaAdmin(){
  const[ejercicios,setEjercicios]=useState([]);
  const[loading,setLoading]=useState(true);
  const[editId,setEditId]=useState(null);
  const[editUrl,setEditUrl]=useState("");
  const[editDesc,setEditDesc]=useState("");
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState(null);
  const[filter,setFilter]=useState("");

  useEffect(()=>{
    fetch(`${API}/api/admin/ejercicios-media`)
      .then(r=>r.json())
      .then(d=>{if(d.success)setEjercicios(d.ejercicios);setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  const startEdit=(ej)=>{setEditId(ej.id||ej.nombre);setEditUrl(ej.gif_url||"");setEditDesc(ej.descripcion||"");};
  const cancelEdit=()=>{setEditId(null);setEditUrl("");setEditDesc("");};

  const handleSave=async(nombre)=>{
    setSaving(true);
    try{
      const r=await fetch(`${API}/api/admin/ejercicio-media`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nombre,gif_url:editUrl,descripcion:editDesc,validado:true})});
      const d=await r.json();
      if(d.success){
        setEjercicios(prev=>prev.some(e=>e.nombre===nombre)?prev.map(e=>e.nombre===nombre?d.media:e):[...prev,d.media]);
        setSaved(nombre);setTimeout(()=>setSaved(null),2500);
        cancelEdit();
      }
    }catch(e){}
    setSaving(false);
  };

  const filtered=ejercicios.filter(e=>e.nombre.includes(filter.toLowerCase()));
  const sinVideo=ejercicios.filter(e=>!e.gif_url).length;

  return(
    <div className="slide-up" style={{background:"#0d0d0d",border:`1px solid ${C.blue}44`,borderRadius:"12px",padding:"20px",marginBottom:"20px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
        <div>
          <div style={{fontFamily:"Bebas Neue",fontSize:"18px",color:C.blue,letterSpacing:"2px"}}>📺 MEDIA EJERCICIOS</div>
          <div style={{fontSize:"11px",color:C.gray,marginTop:"2px"}}>{ejercicios.length} ejercicios · <span style={{color:sinVideo>0?C.fire:C.green}}>{sinVideo} sin video</span></div>
        </div>
        <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Buscar ejercicio..." style={{...inputSt,width:"200px",fontSize:"12px",padding:"8px 12px"}}/>
      </div>
      {loading?(
        <div style={{textAlign:"center",padding:"30px",color:C.gray,fontFamily:"Bebas Neue",letterSpacing:"1px"}}>CARGANDO...</div>
      ):filtered.length===0?(
        <div style={{textAlign:"center",padding:"24px",color:C.gray,fontSize:"13px"}}>
          {ejercicios.length===0?"Aún no hay ejercicios registrados. Aparecerán automáticamente cuando los usuarios presionen 👁️ en sus rutinas.":"Sin resultados para esa búsqueda."}
        </div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {filtered.map(ej=>{
            const videoId=getYouTubeId(ej.gif_url||"");
            const isEditing=editId===ej.id||editId===ej.nombre;
            return(
              <div key={ej.nombre} style={{background:"#111",border:`1px solid ${ej.gif_url?"#1a3a1a":"#2a1a1a"}`,borderRadius:"8px",padding:"12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",flexWrap:"wrap"}}>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Bebas Neue",fontSize:"14px",color:C.white,letterSpacing:"1px"}}>{ej.nombre}</div>
                    {ej.gif_url&&<div style={{fontSize:"10px",color:C.green,marginTop:"2px",fontFamily:"Barlow"}}>✅ Video asignado{videoId?"":" · URL inválida"}</div>}
                    {!ej.gif_url&&<div style={{fontSize:"10px",color:C.fire,marginTop:"2px",fontFamily:"Barlow"}}>⚠️ Sin video</div>}
                    {ej.descripcion&&<div style={{fontSize:"11px",color:C.gray,marginTop:"3px",fontFamily:"Barlow",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:"280px"}}>{ej.descripcion}</div>}
                  </div>
                  <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                    {videoId&&<a href={`https://youtu.be/${videoId}`} target="_blank" rel="noreferrer" style={{padding:"5px 10px",background:"#1a0000",border:"1px solid #dc2626",borderRadius:"5px",color:"#ef4444",fontSize:"11px",fontFamily:"Bebas Neue",textDecoration:"none",letterSpacing:"1px"}}>▶ VER</a>}
                    <button onClick={()=>isEditing?cancelEdit():startEdit(ej)} style={{padding:"5px 10px",background:isEditing?"#1a1a1a":"transparent",border:`1px solid ${isEditing?"#333":C.blue}`,borderRadius:"5px",color:isEditing?C.gray:C.blue,fontSize:"11px",fontFamily:"Bebas Neue",letterSpacing:"1px",cursor:"pointer"}}>
                      {isEditing?"CANCELAR":"✏️ EDITAR"}
                    </button>
                  </div>
                </div>
                {isEditing&&(
                  <div style={{marginTop:"10px",paddingTop:"10px",borderTop:"1px solid #222"}} className="slide-up">
                    <input value={editUrl} onChange={e=>setEditUrl(e.target.value)} placeholder="URL YouTube (https://youtu.be/xxxxx)" style={{...inputSt,fontSize:"12px",marginBottom:"6px"}}/>
                    <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} placeholder="Descripción técnica (opcional)" rows={2} style={{...inputSt,resize:"vertical",fontSize:"12px",marginBottom:"8px"}}/>
                    <button onClick={()=>handleSave(ej.nombre)} disabled={saving||!editUrl} style={{width:"100%",padding:"9px",background:saved===ej.nombre?"#16a34a":`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue",letterSpacing:"1px",cursor:saving?"not-allowed":"pointer"}}>
                      {saving?"GUARDANDO...":saved===ej.nombre?"✅ GUARDADO":"💾 GUARDAR"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
function AdminPanel({user,onLogout}){
  const[usuarios,setUsuarios]=useState([]);const[loading,setLoading]=useState(true);
  const[selected,setSelected]=useState(null);const[renewLoading,setRenew]=useState(null);
  const[showCreate,setShowCreate]=useState(false);const[creating,setCreating]=useState(false);
  const[msg,setMsg]=useState(null);const[resetPwdId,setResetPwdId]=useState(null);const[resetPwdVal,setResetPwdVal]=useState("");
  const[editCondId,setEditCondId]=useState(null);const[editCondVal,setEditCondVal]=useState("");
  const[editPerfilId,setEditPerfilId]=useState(null);
  const[editFechaId,setEditFechaId]=useState(null);const[editFechaVal,setEditFechaVal]=useState("");
  const[editPerfil,setEditPerfil]=useState({});
  const[verHistorial,setVerHistorial]=useState(null);const[historialData,setHistorialData]=useState([]);
  const[newUser,setNewUser]=useState({dni:"",nombre:"",apellido:"",password:"",role:"usuario",isDemo:false,condicion_medica:""});
  const[sesionesHoy,setSesionesHoy]=useState(new Set());
  const[ultimaActividad,setUltimaActividad]=useState({});
  const[showMedia,setShowMedia]=useState(false);

  useEffect(()=>{
    fetch(`${API}/api/admin/usuarios`).then(r=>r.json()).then(d=>{if(d.success)setUsuarios(d.usuarios);setLoading(false);}).catch(()=>setLoading(false));
    fetch(`${API}/api/admin/consultas-hoy`).then(r=>r.json()).then(d=>{if(d.success)setSesionesHoy(new Set(d.userIds));}).catch(()=>{});
    fetch(`${API}/api/admin/ultima-actividad`).then(r=>r.json()).then(d=>{if(d.success)setUltimaActividad(d.actividad||{});}).catch(()=>{});
  },[]);
  const showMsg=t=>{setMsg(t);setTimeout(()=>setMsg(null),4000);};
  const renovar=async userId=>{setRenew(userId);const res=await fetch(`${API}/api/admin/renovar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:data.nuevaFecha}:u));showMsg("✅ Suscripción renovada 30 días");}setRenew(null);};
  const renovarDemo=async userId=>{const res=await fetch(`${API}/api/admin/renovar-demo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,horas:24})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:data.nuevaFecha}:u));showMsg("✅ Demo extendido 24hs");}};
  const convertirAStandard=async(userId,nombre)=>{
    if(!window.confirm(`¿Convertir a ${nombre} de DEMO a usuario STANDARD?\nSe le asignarán 30 días de suscripción.`))return;
    const res=await fetch(`${API}/api/admin/actualizar-perfil`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,role:"usuario",is_demo:false})});
    const data=await res.json();
    if(!data.success){showMsg(`❌ ${data.error}`);return;}
    // Renovar 30 días
    const res2=await fetch(`${API}/api/admin/renovar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    const data2=await res2.json();
    if(data2.success){
      setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,role:"usuario",is_demo:false,fecha_expiracion:data2.nuevaFecha}:u));
      showMsg("✅ Usuario convertido a STANDARD con 30 días");
    }
  };
  const resetDisp=async(userId,nombre,apellido)=>{if(!window.confirm(`¿Resetear dispositivo de ${nombre} ${apellido}?`))return;const res=await fetch(`${API}/api/admin/resetear-dispositivo`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,device_token:null,device_locked:false}:u));showMsg("✅ Dispositivo reseteado");}};
  const resetPwd=async userId=>{if(!resetPwdVal||resetPwdVal.length<4){showMsg("❌ Mínimo 4 caracteres");return;}const res=await fetch(`${API}/api/admin/resetear-password`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,nuevaPassword:resetPwdVal})});const data=await res.json();if(data.success){showMsg("✅ Contraseña reseteada");setResetPwdId(null);setResetPwdVal("");}else showMsg(`❌ ${data.error}`);};
  const suspender=async(userId,suspendido,nombre)=>{if(!window.confirm(`¿${suspendido?"SUSPENDER":"REACTIVAR"} a ${nombre}?`))return;const res=await fetch(`${API}/api/admin/suspender-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,suspendido})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,suspendido}:u));showMsg(`✅ Usuario ${suspendido?"suspendido":"reactivado"}`);}};
  const guardarFecha=async userId=>{
    if(!editFechaVal){showMsg("❌ Seleccioná una fecha");return;}
    const nuevaFecha=new Date(editFechaVal+"T23:59:59-03:00").toISOString();
    const res=await fetch(`${API}/api/admin/actualizar-perfil`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,fecha_expiracion:nuevaFecha})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,fecha_expiracion:nuevaFecha}:u));showMsg("✅ Vencimiento actualizado");setEditFechaId(null);setEditFechaVal("");}
    else showMsg(`❌ ${data.error}`);
  };
  const guardarCondicion=async userId=>{const res=await fetch(`${API}/api/admin/actualizar-condicion`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,condicion_medica:editCondVal})});const data=await res.json();if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,condicion_medica:editCondVal}:u));showMsg("✅ Condición médica actualizada");setEditCondId(null);setEditCondVal("");}};
  const toggleModoDios=async(userId,actual,nombre)=>{
    const nuevo=!actual;
    if(!window.confirm(`¿${nuevo?"ACTIVAR":"DESACTIVAR"} MODO DIOS para ${nombre}?\n${nuevo?"Consultas ilimitadas, sin dispositivo ni vencimiento.":"Volverá a restricciones normales."}`))return;
    const res=await fetch(`${API}/api/admin/actualizar-perfil`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,modo_dios:nuevo})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,modo_dios:nuevo}:u));showMsg(`✅ Modo Dios ${nuevo?"activado ⚡":"desactivado"} para ${nombre}`);}
    else showMsg(`❌ ${data.error}`);
  };
  const eliminar=async(userId,nombre)=>{
    if(!window.confirm(`¿ELIMINAR a ${nombre}? No se puede deshacer.`))return;
    const res=await fetch(`${API}/api/admin/eliminar-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.filter(u=>u.id!==userId));setSelected(null);showMsg("✅ Usuario eliminado");}
    else showMsg(`❌ Error al eliminar: ${data.error}`);
  };
  const enviarWP=(nombre,telefono)=>{
    const num=telefono?`54${telefono.replace(/\D/g,"")}`:`${WP_NUMBER}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(`Hola ${nombre}, te escribo desde MG+IA Personal Trainer 24/7.`)}`,"_blank");
  };
  const abrirEditPerfil=(u)=>{
    setEditPerfilId(u.id);
    setEditPerfil({nombre:u.nombre||"",apellido:u.apellido||"",dni:u.dni||"",telefono:u.telefono||"",condicion_medica:u.condicion_medica||"",fecha_nac:u.fecha_nac||"",objetivo:u.objetivo||"",nivel_base:u.nivel_base||"",role:u.role||"usuario"});
  };
  const guardarPerfil=async userId=>{
    const res=await fetch(`${API}/api/admin/actualizar-perfil`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,...editPerfil})});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>prev.map(u=>u.id===userId?{...u,...editPerfil}:u));showMsg("✅ Perfil actualizado");setEditPerfilId(null);}
    else showMsg(`❌ ${data.error}`);
  };
  const verHistorialUsuario=async userId=>{setVerHistorial(userId);const res=await fetch(`${API}/api/admin/sesiones/${userId}`);const data=await res.json();if(data.success)setHistorialData(data.sesiones);};
  const crearUsuario=async()=>{
    if(!newUser.dni||!newUser.nombre||!newUser.apellido||!newUser.password){showMsg("⚠️ Completá todos los campos");return;}
    setCreating(true);
    const res=await fetch(`${API}/api/admin/crear-usuario`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(newUser)});
    const data=await res.json();
    if(data.success){setUsuarios(prev=>[data.usuario,...prev]);setNewUser({dni:"",nombre:"",apellido:"",password:"",role:"usuario",isDemo:false,condicion_medica:""});setShowCreate(false);showMsg("✅ Socio creado");}
    else showMsg(`❌ ${data.error}`);
    setCreating(false);
  };

  if(verHistorial){
    const u=usuarios.find(x=>x.id===verHistorial);
    return(
      <div style={{position:"fixed",inset:0,background:"#000000f0",zIndex:2000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"16px",overflowY:"auto"}}>
        <div style={{background:"#0d0d0d",border:`1px solid ${C.fire}`,borderRadius:"16px",width:"100%",maxWidth:"700px",padding:"20px"}} className="slide-up">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"20px",color:C.fire,letterSpacing:"2px"}}>📋 HISTORIAL — {u?.nombre?.toUpperCase()} {u?.apellido?.toUpperCase()}</div>
            <button onClick={()=>{setVerHistorial(null);setHistorialData([]);}} style={{background:"transparent",border:"none",color:C.gray,fontSize:"22px",cursor:"pointer"}}>✕</button>
          </div>
          {historialData.length===0?<div style={{textAlign:"center",padding:"24px",color:C.gray}}>Sin sesiones.</div>:(
            historialData.map(s=>(
              <div key={s.id} style={{background:"#111",border:"1px solid #222",borderRadius:"8px",padding:"14px",marginBottom:"10px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px"}}>
                  <div>
                    <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"15px",color:C.white}}>{s.entrenamiento}</div>
                    <div style={{fontSize:"11px",color:C.gray,marginTop:"2px"}}>{formatDateTime(s.created_at)} · ID: <span style={{color:C.gold,fontFamily:"monospace"}}>{s.consulta_id||"—"}</span></div>
                  </div>
                  {s.es_registro&&<span style={{fontSize:"10px",color:C.green,border:`1px solid ${C.green}`,borderRadius:"3px",padding:"1px 5px",fontFamily:"Bebas Neue, sans-serif"}}>REG</span>}
                </div>
                <div style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.6",whiteSpace:"pre-wrap",background:"#0a0a0a",padding:"10px",borderRadius:"6px"}}>{s.response_text||"Sin respuesta"}</div>
              </div>
            ))
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
        <div style={{marginBottom:"20px",display:"flex",gap:"10px",flexWrap:"wrap"}}>
          <button onClick={()=>setShowCreate(!showCreate)} style={{padding:"12px 24px",background:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>
            {showCreate?"✕ CANCELAR":"+ NUEVO SOCIO / DEMO"}
          </button>
          <button onClick={()=>{setShowMedia(!showMedia);if(showCreate)setShowCreate(false);}} style={{padding:"12px 24px",background:showMedia?`linear-gradient(135deg,${C.fire},${C.red})`:"transparent",border:`1px solid ${showMedia?C.fire:C.gray}`,borderRadius:"8px",color:showMedia?C.white:C.gray,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>
            📺 MEDIA EJERCICIOS
          </button>
        </div>
        {showMedia&&<EjerciciosMediaAdmin/>}
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
                <div><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.gold}}>MODO DEMO</div><div style={{fontSize:"11px",color:C.gray}}>24hs · 3 consultas</div></div>
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
            const consultoHoy=sesionesHoy.has(u.id);
            const esAdmin=u.role==="admin";
            const esDios=!!u.modo_dios;
            const diasSinActividad=ultimaActividad[u.id]?Math.floor((Date.now()-new Date(ultimaActividad[u.id]))/86400000):999;
            const rowBg=u.suspendido?"#1a0505":esAdmin||esDios?"#030814":consultoHoy?"#071207":diasSinActividad<=2?"#1a0f00":"#1a0505";
            const rowBorder=u.suspendido?"#7f1d1d":esAdmin||esDios?"#1a3a8f":consultoHoy?"#22c55e55":diasSinActividad<=2?"#f9731666":"#dc262666";
            return(
              <div key={u.id} style={{background:rowBg,border:`1px solid ${rowBorder}`,borderRadius:"10px",marginBottom:"10px",overflow:"hidden"}}>
                <div onClick={()=>setSelected(isOpen?null:u.id)} style={{padding:"14px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:u.suspendido?"#64748b":esAdmin||esDios?"#60a5fa":C.white,letterSpacing:"1px"}}>
                      {u.apellido?.toUpperCase()}, {u.nombre}
                      {isDemo&&<span style={{marginLeft:"8px",fontSize:"11px",color:C.gold,border:`1px solid ${C.gold}`,borderRadius:"4px",padding:"1px 5px"}}>DEMO</span>}
                      {esDios&&<span style={{marginLeft:"8px",fontSize:"11px",color:"#60a5fa",border:"1px solid #1a3a8f",borderRadius:"4px",padding:"1px 5px",background:"#0a1628"}}>⚡ MODO DIOS</span>}
                      {esAdmin&&<span style={{marginLeft:"8px",fontSize:"11px",color:"#60a5fa",border:"1px solid #1a3a8f",borderRadius:"4px",padding:"1px 5px",background:"#0a1628"}}>👑 ADMIN</span>}
                      {u.es_socio_mg&&!esDios&&!esAdmin&&<span style={{marginLeft:"8px",fontSize:"11px",color:C.blueL,border:`1px solid ${C.blueL}`,borderRadius:"4px",padding:"1px 5px"}}>🏅 SOCIO MG</span>}
                      {u.suspendido&&<span style={{marginLeft:"8px",fontSize:"11px",color:C.red,border:`1px solid ${C.red}`,borderRadius:"4px",padding:"1px 5px"}}>SUSPENDIDO</span>}
                      {u.condicion_medica&&<span style={{marginLeft:"8px",fontSize:"11px",color:"#f9a8d4",border:"1px solid #9d174d",borderRadius:"4px",padding:"1px 5px"}}>🩺</span>}
                      {!consultoHoy&&!esAdmin&&!esDios&&<span style={{marginLeft:"8px",fontSize:"10px",color:diasSinActividad<=2?"#fb923c":"#f87171",border:`1px solid ${diasSinActividad<=2?"#f9731666":"#dc262666"}`,borderRadius:"4px",padding:"1px 5px"}}>{diasSinActividad===999?"SIN ACTIVIDAD":`${diasSinActividad}d sin usar`}</span>}
                    </div>
                    <div style={{fontSize:"12px",color:C.gray,marginTop:"2px"}}>DNI: {u.dni} · {u.role}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}><DiasRestantesBadge fechaExp={u.fecha_expiracion}/><span style={{color:C.gray,fontSize:"12px"}}>{isOpen?"▲":"▼"}</span></div>
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
                      {isDemo?<><button onClick={()=>renovarDemo(u.id)} style={{padding:"9px 14px",background:"linear-gradient(135deg,#92400e,#b45309)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>⏱ +24HS</button><button onClick={()=>convertirAStandard(u.id,`${u.nombre} ${u.apellido}`)} style={{padding:"9px 14px",background:"linear-gradient(135deg,#1d4ed8,#2563eb)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>⬆️ PASAR A STANDARD</button></>:<button onClick={()=>renovar(u.id)} disabled={renewLoading===u.id} style={{padding:"9px 14px",background:renewLoading===u.id?"#222":"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{renewLoading===u.id?"...":"🔄 +30 DÍAS"}</button>}
                      <button onClick={()=>enviarWP(u.nombre,u.telefono)} style={{padding:"9px 14px",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>💬 WP</button>
                      <button onClick={()=>editPerfilId===u.id?setEditPerfilId(null):abrirEditPerfil(u)} style={{padding:"9px 14px",background:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>✏️ EDITAR</button>
                      <button onClick={()=>verHistorialUsuario(u.id)} style={{padding:"9px 14px",background:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>📋 HISTORIAL</button>
                      {!esAdmin&&<button onClick={()=>toggleModoDios(u.id,esDios,`${u.nombre} ${u.apellido}`)} style={{padding:"9px 14px",background:esDios?"linear-gradient(135deg,#1e3a5f,#1a3a8f)":"#0a0a14",border:`1px solid ${esDios?"#60a5fa":"#1a3a8f"}`,borderRadius:"6px",color:esDios?"#60a5fa":"#1a3a8f",fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{esDios?"⚡ DIOS ✓":"⚡ MODO DIOS"}</button>}
                      {u.device_token&&<button onClick={()=>resetDisp(u.id,u.nombre,u.apellido)} style={{padding:"9px 14px",background:u.device_locked?`linear-gradient(135deg,${C.red},#b91c1c)`:"#1a1a1a",border:`1px solid ${u.device_locked?C.red:"#333"}`,borderRadius:"6px",color:u.device_locked?C.white:C.gray,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{u.device_locked?"🔒 DESBLOQ.":"📱 RESET"}</button>}
                      <button onClick={()=>{setResetPwdId(resetPwdId===u.id?null:u.id);setResetPwdVal("");}} style={{padding:"9px 14px",background:"#1a1a1a",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>🔑 PWD</button>
                      <button onClick={()=>{setEditFechaId(editFechaId===u.id?null:u.id);setEditFechaVal(u.fecha_expiracion?new Date(u.fecha_expiracion).toISOString().slice(0,10):"");}} style={{padding:"9px 14px",background:"#111",border:`1px solid ${C.gold}`,borderRadius:"6px",color:C.gold,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>📅 VENCIMIENTO</button>
                      <button onClick={()=>{setEditCondId(editCondId===u.id?null:u.id);setEditCondVal(u.condicion_medica||"");}} style={{padding:"9px 14px",background:"#1a0a14",border:"1px solid #9d174d",borderRadius:"6px",color:"#f9a8d4",fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>🩺 COND.</button>
                      <button onClick={()=>suspender(u.id,!u.suspendido,`${u.nombre} ${u.apellido}`)} style={{padding:"9px 14px",background:u.suspendido?"linear-gradient(135deg,#16a34a,#15803d)":"linear-gradient(135deg,#92400e,#78350f)",border:"none",borderRadius:"6px",color:C.white,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>{u.suspendido?"▶ ACTIVAR":"⏸ SUSPENDER"}</button>
                      <button onClick={()=>eliminar(u.id,`${u.nombre} ${u.apellido}`)} style={{padding:"9px 14px",background:"#1a0505",border:`1px solid ${C.red}`,borderRadius:"6px",color:C.red,fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>🗑 ELIMINAR</button>
                    </div>
                    {resetPwdId===u.id&&<div className="slide-up" style={{marginBottom:"10px",display:"flex",gap:"10px"}}><input type="password" value={resetPwdVal} onChange={e=>setResetPwdVal(e.target.value)} placeholder="Nueva contraseña" style={{...inputSt,flex:1}}/><button onClick={()=>resetPwd(u.id)} style={{padding:"10px 16px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"6px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",cursor:"pointer"}}>GUARDAR</button></div>}

                    {editFechaId===u.id&&(
                      <div className="slide-up" style={{marginBottom:"10px",padding:"12px",background:"#0a0a00",border:`1px solid ${C.gold}44`,borderRadius:"8px"}}>
                        <label style={{...labelSt,color:C.gold,marginBottom:"8px"}}>📅 NUEVO VENCIMIENTO</label>
                        <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                          <input type="date" value={editFechaVal} onChange={e=>setEditFechaVal(e.target.value)} style={{...inputSt,flex:1,colorScheme:"dark"}}/>
                          <button onClick={()=>guardarFecha(u.id)} style={{padding:"10px 16px",background:`linear-gradient(135deg,${C.gold},#d97706)`,border:"none",borderRadius:"6px",color:"#000",fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer",fontWeight:"900"}}>GUARDAR</button>
                          <button onClick={()=>setEditFechaId(null)} style={{padding:"10px 14px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",cursor:"pointer"}}>✕</button>
                        </div>
                        <div style={{marginTop:"6px",fontSize:"11px",color:C.gray,fontFamily:"Barlow, sans-serif"}}>
                          Actual: {u.fecha_expiracion?new Date(u.fecha_expiracion).toLocaleDateString("es-AR"):"Sin fecha"}
                        </div>
                      </div>
                    )}

                    {editPerfilId===u.id&&(
                      <div className="slide-up" style={{marginTop:"12px",background:"#0a0a0a",border:`1px solid ${C.blueL}`,borderRadius:"10px",padding:"16px"}}>
                        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",color:C.blueL,letterSpacing:"2px",marginBottom:"14px"}}>✏️ EDITAR PERFIL</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
                          {[
                            {k:"nombre",      l:"NOMBRE",           pl:"Nombre"},
                            {k:"apellido",    l:"APELLIDO",         pl:"Apellido"},
                            {k:"dni",         l:"DNI",              pl:"Número"},
                            {k:"telefono",    l:"TELÉFONO",         pl:"ej: 3571587003"},
                            {k:"fecha_nac",   l:"FECHA NACIMIENTO", pl:"",type:"date"},
                          ].map(f=>(
                            <div key={f.k}>
                              <label style={labelSt}>{f.l}</label>
                              <input type={f.type||"text"} value={editPerfil[f.k]||""} onChange={e=>setEditPerfil(p=>({...p,[f.k]:e.target.value}))} placeholder={f.pl} style={inputSt}/>
                            </div>
                          ))}
                          <div>
                            <label style={labelSt}>OBJETIVO</label>
                            <select value={editPerfil.objetivo||""} onChange={e=>setEditPerfil(p=>({...p,objetivo:e.target.value}))} style={inputSt}>
                              <option value="">Sin definir</option>
                              {["Masa muscular","Pérdida de grasa","Rendimiento deportivo","Salud general","Rehabilitación","Tonificación"].map(o=><option key={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={labelSt}>NIVEL BASE</label>
                            <select value={editPerfil.nivel_base||""} onChange={e=>setEditPerfil(p=>({...p,nivel_base:e.target.value}))} style={inputSt}>
                              <option value="">Sin definir</option>
                              {["PRINCIPIANTE","BÁSICO","INTERMEDIO","AVANZADO"].map(n=><option key={n}>{n}</option>)}
                            </select>
                          </div>
                          <div style={{gridColumn:"1/-1"}}>
                            <label style={labelSt}>CONDICIÓN MÉDICA</label>
                            <input type="text" value={editPerfil.condicion_medica||""} onChange={e=>setEditPerfil(p=>({...p,condicion_medica:e.target.value}))} placeholder="ej: hipertensión, lesión rodilla, diabetes..." style={inputSt}/>
                          </div>
                          <div>
                            <label style={labelSt}>ROL</label>
                            <select value={editPerfil.role||"usuario"} onChange={e=>setEditPerfil(p=>({...p,role:e.target.value}))} style={inputSt}>
                              <option value="usuario">Usuario</option>
                              <option value="pro">PRO</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                        </div>
                        <div style={{display:"flex",gap:"10px",marginTop:"14px"}}>
                          <button onClick={()=>guardarPerfil(u.id)} style={{flex:1,padding:"12px",background:`linear-gradient(135deg,${C.blue},${C.blueL})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>GUARDAR CAMBIOS</button>
                          <button onClick={()=>setEditPerfilId(null)} style={{padding:"12px 20px",background:"transparent",border:"1px solid #333",borderRadius:"8px",color:C.gray,fontSize:"15px",fontFamily:"Bebas Neue, sans-serif",cursor:"pointer"}}>CANCELAR</button>
                        </div>
                      </div>
                    )}
                    {editCondId===u.id&&<div className="slide-up" style={{marginBottom:"10px"}}><label style={labelSt}>CONDICIÓN MÉDICA</label><div style={{display:"flex",gap:"10px"}}><input type="text" value={editCondVal} onChange={e=>setEditCondVal(e.target.value)} placeholder="ej: hipertensión, lesión rodilla..." style={{...inputSt,flex:1}}/><button onClick={()=>guardarCondicion(u.id)} style={{padding:"10px 16px",background:"linear-gradient(135deg,#be185d,#9d174d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"13px",fontFamily:"Bebas Neue, sans-serif",cursor:"pointer"}}>GUARDAR</button></div></div>}
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
function Coach({user,onLogout,isDemo,limiteConsultas,isPro,modoDios}){
  const[tab,setTab]=useState("form");
  const[sesiones,setSesiones]=useState([]);
  const[expandedId,setExp]=useState(null);
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const[esperandoCoach,setEsperandoCoach]=useState(false);
  const[error,setError]=useState(null);
  const[showPwd,setShowPwd]=useState(false);
  const[showRef,setShowRef]=useState(false);
  const[consultasHoy,setConsultasHoy]=useState(0);
  const[primerRegistroHecho,setPrimerRegistroHecho]=useState(false);
  const[showTerminos,setShowTerminos]=useState(false);
  const[showLegal,setShowLegal]=useState(false);
  const[coachDecision,setCoachDecision]=useState(null);
  const[notaRutina,setNotaRutina]=useState("");
  const[notaGuardada,setNotaGuardada]=useState(false);
  const[sesionIdActual,setSesionIdActual]=useState(null);
  // Cargar form desde localStorage si existe
  const FORM_KEY=`mgfc_form_${user.id}`;
  const savedForm=()=>{try{const s=JSON.parse(localStorage.getItem(FORM_KEY)||"null");return s||null;}catch{return null;}};

  const[form,setForm]=useState(()=>{
    const saved=savedForm();
    return saved||{peso:"",descanso:"7h",energia:"7",entrenamiento:"",dolor:"",alimentacion:"NORMAL",tiempo:"60min",quiereRutina:false,quiereTablero:false,sexo:"",etapaMenstrual:false,disciplina:"Ninguna / Solo gym",nivelRutina:"INTERMEDIO"};
  });

  // Guardar form en localStorage cada vez que cambia
  useEffect(()=>{
    try{localStorage.setItem(FORM_KEY,JSON.stringify(form));}catch{}
  },[form]);

  useEffect(()=>{
    if(isDemo)return;
    fetch(`${API}/api/sesiones/${user.id}`).then(r=>r.json()).then(d=>{
      if(d.success){
        setSesiones(d.sesiones);
        const hoy=d.sesiones.filter(s=>isHoy(s.created_at));
        setConsultasHoy(hoy.length);
        setPrimerRegistroHecho(hoy.some(s=>s.es_registro));
        // Pre-llenar form con última sesión si no hay datos guardados
        if(!savedForm()&&d.sesiones.length>0){
          const last=d.sesiones[0];
          setForm(f=>({...f,
            peso:last.peso?String(last.peso):"",
            descanso:last.descanso||f.descanso,
            entrenamiento:"", // entrenamiento siempre vacío
            dolor:"",
            alimentacion:last.alimentacion||f.alimentacion,
            tiempo:last.tiempo||f.tiempo,
          }));
        }
      }
    }).catch(()=>{});
  },[user.id,isDemo]);

  const trainingWeek=getTrainingWeek(user.fecha_inicio);
  const deload=isDeloadWeek(trainingWeek,sesiones);
  const streak=computeStreak(sesiones);
  const condicionMedica=user.condicion_medica;
  const objetivoUsuario=user.objetivo;
  const nivelBaseUsuario=user.nivel_base;
  const edadUsuario=user.fecha_nacimiento?Math.floor((new Date()-new Date(user.fecha_nacimiento))/31557600000):null;
  const handleChange=e=>{const{name,value,type,checked}=e.target;setForm(f=>({...f,[name]:type==="checkbox"?checked:value}));};

  const buildHistoryCtx=()=>{
    if(!sesiones.length)return"Sin historial previo.";
    const resumen=sesiones.slice(0,10).map(s=>`• ${dayLabel(s.created_at)} — Sem ${s.training_week}${s.is_deload?"[DESC]":""} — ${s.entrenamiento} | E:${s.energia} D:${s.descanso} A:${s.alimentacion}`).join("\n");
    // Extraer rutinas generadas de las últimas 2 sesiones con rutina
    const conRutina=sesiones.filter(s=>s.response_text&&s.response_text.includes("RUTINA DEL DÍA")).slice(0,2);
    if(!conRutina.length)return resumen;
    const rutinasCtx=conRutina.map((s,i)=>{
      const partes=s.response_text.split(/RUTINA DEL DÍA[:\n\s]*/i);
      const texto=partes[1]?partes[1].trim().slice(0,700):"";
      if(!texto)return null;
      return `\n[RUTINA ${i===0?"ÚLTIMA":"PENÚLTIMA"} — ${dayLabel(s.created_at)} — ${s.entrenamiento}]\n${texto}`;
    }).filter(Boolean).join("\n");
    return resumen+(rutinasCtx?`\n\n⚠️ RUTINAS PREVIAS EJECUTADAS — ANALIZÁ PARA NO REPETIR EJERCICIOS IDÉNTICOS:${rutinasCtx}`:"");
  };

  const handleSubmit=async()=>{
    if(!form.peso||!form.entrenamiento){setError("Completá peso y entrenamiento.");return;}
    if(!isDemo&&!modoDios&&consultasHoy>=limiteConsultas){setError(`⚠️ Límite de ${limiteConsultas} consultas diarias alcanzado.${!isPro?" Pasate al plan PRO para 5 consultas/día.":""}`);return;}
    setError(null);setLoading(true);setResult(null);setCoachDecision(null);setNotaRutina("");setNotaGuardada(false);setSesionIdActual(null);
    const now=new Date();
    const sexoInfo=form.sexo==="mujer"?`Sexo: Mujer${form.etapaMenstrual?" — EN ETAPA MENSTRUAL ACTIVA":""}`:`Sexo: ${form.sexo==="hombre"?"Hombre":"No especificado"}`;
    const disciplinaInfo=form.disciplina!=="Ninguna / Solo gym"?`Disciplina: ${form.disciplina} — orientar para complementar`:"Sin disciplina adicional";
    const condInfo=condicionMedica?`⚠️ CONDICIÓN MÉDICA (PRIORIDAD): ${condicionMedica}`:"";
    const perfilInfo=`Objetivo del usuario: ${objetivoUsuario||"Masa muscular"}\nNivel base del usuario: ${nivelBaseUsuario||"no definido"}${nivelBaseUsuario?` — considerar como nivel mínimo de referencia al generar la rutina`:""}`;
    const edadInfo=edadUsuario?`Edad: ${edadUsuario} años`:"Edad: no especificada";
    const alturaInfo=user.altura?`Altura: ${user.altura} cm`:"";
    const equipInfo=user.equipamiento?`Equipamiento: ${user.equipamiento}`:"";
    const diasInfo=user.dias_disponibles?`Días entrenamiento/semana: ${user.dias_disponibles}`:"";
    const localInfo=[user.localidad,user.provincia,user.pais].filter(Boolean).join(", ");
    const ubicacionInfo=localInfo?`Ubicación: ${localInfo}`:"";
    const userMsg=`Fecha: ${formatDateTime(now.toISOString())}\nSemana: ${trainingWeek}${deload?" — DESCARGA":""}\nRacha: ${streak}d\n${condInfo}\n${perfilInfo}\n${edadInfo}${alturaInfo?"\n"+alturaInfo:""}${equipInfo?"\n"+equipInfo:""}${diasInfo?"\n"+diasInfo:""}${ubicacionInfo?"\n"+ubicacionInfo:""}\n\nDatos:\nPeso: ${form.peso}kg | Descanso: ${form.descanso} | Energía: ${form.energia}\n${sexoInfo}\n${disciplinaInfo}\nEntrenamiento: ${form.entrenamiento}\nDolor: ${form.dolor||"Ninguno"} | Alimentación: ${form.alimentacion}\nTiempo: ${form.tiempo}\n\nHistorial:\n${buildHistoryCtx()}`;
    const tableroActivo=form.quiereTablero&&(isPro||modoDios)&&detectarCampo(form.disciplina)!==null;
    const system=buildSystemPrompt(isDemo,form.quiereRutina,form.quiereRutina?form.nivelRutina:null,tableroActivo);
    try{
      const res=await fetch(`${API}/api/coach`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system,userMsg,userName:`${user.nombre} ${user.apellido}`.trim()})});
      const data=await res.json();
      if(!data.success)throw new Error(data.error);
      // Pantalla de espera aleatoria 4-10 segundos
      setLoading(false);
      setEsperandoCoach(true);
      await new Promise(r=>setTimeout(r,(Math.random()*6+4)*1000));
      setEsperandoCoach(false);
      setResult(data.text);
      if(!isDemo){
        const esRegistro=!primerRegistroHecho;
        fetch(`${API}/api/sesion`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,sesion:{entrenamiento:form.entrenamiento,peso:parseFloat(form.peso),descanso:form.descanso,energia:parseInt(form.energia),alimentacion:form.alimentacion,dolor:form.dolor||null,tiempo:form.tiempo,response_text:data.text,training_week:trainingWeek,is_deload:deload,streak},esRegistro})}).then(r=>r.json()).then(d=>{if(d.success){setSesiones(p=>[d.sesion,...p]);setConsultasHoy(c=>c+1);if(esRegistro)setPrimerRegistroHecho(true);setSesionIdActual(d.sesion.id);}}).catch(()=>{});
      }
    }catch(err){setError(err.message||"Error al conectar.");}
    setLoading(false);
    setEsperandoCoach(false);
  };

  const parsed=result?parseResponse(result):{};
  const consultarCoach=parsed.consultar?.includes("SÍ");
  const consultasRestantes=Math.max(0,limiteConsultas-consultasHoy);

  const guardarNota=async()=>{
    if(!sesionIdActual||!notaRutina.trim())return;
    const res=await fetch(`${API}/api/sesion/nota`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sesionId:sesionIdActual,nota:notaRutina.trim()})});
    const data=await res.json();
    if(data.success){setNotaGuardada(true);setSesiones(prev=>prev.map(s=>s.id===sesionIdActual?{...s,nota_usuario:notaRutina.trim()}:s));}
  };

  const byWeek=sesiones.reduce((acc,s)=>{const k=`Semana ${s.training_week}${s.is_deload?" — DESCARGA":""}`;(acc[k]=acc[k]||[]).push(s);return acc;},{});
  const tabSt=active=>({flex:1,padding:"10px",border:"none",borderRadius:"6px",background:active?`linear-gradient(135deg,${C.red},${C.fire})`:"#111",color:active?C.white:C.gray,fontSize:"12px",fontWeight:"700",letterSpacing:"1px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif"});

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.white,fontFamily:"Barlow, sans-serif",position:"relative"}}>
      <LogoWatermark/>
      {showRef&&<Referencias onClose={()=>setShowRef(false)}/>}
      {showPwd&&<CambiarPassword user={user} onClose={()=>setShowPwd(false)}/>}
      {showTerminos&&<TerminosModal user={user} onAceptar={()=>setShowTerminos(false)}/>}
      {showLegal&&<LegalModal onClose={()=>setShowLegal(false)}/>}

      {isDemo&&(
        <div style={{background:"linear-gradient(90deg,#92400e,#78350f)",padding:"10px 16px",borderBottom:`2px solid ${C.gold}`,position:"sticky",top:0,zIndex:200}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"8px"}}>
            <span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"2px"}} className="blink">🎯 VERSIÓN DEMO · {consultasRestantes} CONSULTA{consultasRestantes!==1?"S":""} RESTANTE{consultasRestantes!==1?"S":""}</span>
            <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent("Hola! Quiero contratar MG+IA Personal Trainer 24/7.")}`,"_blank")} style={{padding:"4px 14px",background:C.gold,border:"none",borderRadius:"4px",color:"#000",fontSize:"12px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>CONTRATAR →</button>
          </div>
        </div>
      )}

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
          <button onClick={()=>setShowLegal(true)} style={{padding:"6px 10px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"11px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif"}}>📄</button>
          <button onClick={onLogout} style={{padding:"6px 10px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"11px",cursor:"pointer",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>SALIR</button>
        </div>
      </div>

      <div style={{maxWidth:"640px",margin:"0 auto",padding:"16px",position:"relative",zIndex:1}}>
        {condicionMedica&&<div style={{marginBottom:"12px",padding:"10px 14px",background:"#1a0a14",border:"1px solid #9d174d",borderRadius:"8px",fontSize:"12px",color:"#f9a8d4",fontFamily:"Barlow, sans-serif"}}>🩺 <strong>Condición médica:</strong> {condicionMedica}</div>}
        <div style={{marginBottom:"14px"}}>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"26px",color:C.white,letterSpacing:"2px"}}>HOLA, {user.nombre?.toUpperCase()} 💪</div>
          <div style={{fontSize:"12px",color:C.gray}}>{user.apellido} · DNI {user.dni} · {isPro?"⭐ PRO":"Plan Standard"}</div>
          {(objetivoUsuario||nivelBaseUsuario)&&(
            <div style={{marginTop:"6px",display:"flex",gap:"8px",flexWrap:"wrap"}}>
              {objetivoUsuario&&<span style={{fontSize:"11px",color:C.gold,border:`1px solid ${C.gold}55`,borderRadius:"4px",padding:"2px 8px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>🎯 {objetivoUsuario}</span>}
              {nivelBaseUsuario&&<span style={{fontSize:"11px",color:C.blueL,border:`1px solid ${C.blueL}55`,borderRadius:"4px",padding:"2px 8px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>💪 {nivelBaseUsuario}</span>}
            </div>
          )}
        </div>

        {!isDemo&&<div style={{marginBottom:"12px",padding:"10px 14px",background:"#0d0d0d",border:`1px solid ${consultasHoy>=limiteConsultas&&!modoDios?C.red:C.fire}`,borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.grayL,letterSpacing:"1px"}}>CONSULTAS HOY: <span style={{color:modoDios?"#60a5fa":consultasHoy>=limiteConsultas?C.red:C.fire}}>{consultasHoy}{modoDios?"":"/"+limiteConsultas}</span>{primerRegistroHecho&&<span style={{marginLeft:"8px",fontSize:"10px",color:C.green}}>✅ SESIÓN REGISTRADA</span>}{modoDios&&<span style={{marginLeft:"8px",fontSize:"10px",color:"#60a5fa"}}>⚡ ILIMITADAS</span>}</div>
        </div>}

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
                <div><label style={labelSt}>Peso (kg)</label><input name="peso" value={form.peso} onChange={handleChange} placeholder="76.5" style={inputDone(form.peso)}/></div>
                <div><label style={labelSt}>Descanso</label><select name="descanso" value={form.descanso} onChange={handleChange} style={inputDone(form.descanso)}>{["1h","2h","3h","4h","5h","6h","7h","8h+"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label style={labelSt}>Energía (1-10)</label><select name="energia" value={form.energia} onChange={handleChange} style={inputDone(form.energia)}>{[1,2,3,4,5,6,7,8,9,10].map(v=><option key={v}>{v}</option>)}</select></div>
                <div><label style={labelSt}>Alimentación</label><select name="alimentacion" value={form.alimentacion} onChange={handleChange} style={inputDone(form.alimentacion)}>{["MUY MALA","MALA","NORMAL","BIEN","MUY BIEN"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div style={{gridColumn:"1/-1"}}><label style={labelSt}>Entrenamiento del día</label><input name="entrenamiento" value={form.entrenamiento} onChange={handleChange} placeholder="ej: musculación, glúteos y femorales" style={inputDone(form.entrenamiento)}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={labelSt}>Dolor (opcional)</label><input name="dolor" value={form.dolor} onChange={handleChange} placeholder="ej: hombro derecho leve / ninguno" style={inputDone(form.dolor)}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={labelSt}>¿Practicás alguna disciplina deportiva?</label><select name="disciplina" value={form.disciplina} onChange={handleChange} style={inputDone(form.disciplina)}>{DISCIPLINAS.map(d=><option key={d}>{d}</option>)}</select></div>
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
                    <div style={{fontSize:"11px",color:"#9d174d",fontFamily:"Barlow, sans-serif",lineHeight:"1.5"}}>
                      ℹ️ Recomendaciones orientativas, no constituyen consejo médico.{" "}
                      <button onClick={()=>setShowTerminos(true)} style={{background:"transparent",border:"none",color:"#f9a8d4",textDecoration:"underline",cursor:"pointer",fontSize:"11px",fontFamily:"Barlow, sans-serif",padding:0}}>Ver Términos y Condiciones</button>
                    </div>
                  </div>
                )}
                <div><label style={labelSt}>Tiempo disponible</label><select name="tiempo" value={form.tiempo} onChange={handleChange} style={inputSt}>{["30min","45min","60min","75min","90min","120min+"].map(v=><option key={v}>{v}</option>)}</select></div>
                <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"16px",paddingTop:"22px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                    <Toggle value={form.quiereRutina} onChange={()=>setForm(f=>({...f,quiereRutina:!f.quiereRutina}))}/>
                    <span style={{fontSize:"12px",color:C.grayL,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>INCLUIR RUTINA</span>
                    {isDemo&&<span style={{fontSize:"10px",color:"#b45309",fontFamily:"Barlow, sans-serif"}}>Solo Standard/PRO</span>}
                  </div>
                  {(isPro||modoDios)&&detectarCampo(form.disciplina)!==null&&(
                    <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                      <Toggle value={form.quiereTablero} onChange={()=>setForm(f=>({...f,quiereTablero:!f.quiereTablero}))}/>
                      <span style={{fontSize:"12px",color:form.quiereTablero?"#34d399":C.grayL,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px"}}>📋 TABLERO TÉCNICO</span>
                      <span style={{fontSize:"10px",color:"#60a5fa",fontFamily:"Barlow, sans-serif"}}>⭐ PRO</span>
                    </div>
                  )}
                </div>
                {isDemo&&form.quiereRutina&&(
                  <div style={{marginTop:"8px",padding:"8px 12px",background:"#0a0800",border:"1px solid #92400e",borderRadius:"6px",fontSize:"12px",color:C.gold,fontFamily:"Barlow, sans-serif"}}>
                    🔒 La rutina no se muestra en modo DEMO. Disponible en versión Standard o PRO.
                  </div>
                )}
              </div>

              {!isDemo&&form.quiereRutina&&(
                <div className="slide-up" style={{marginTop:"14px",padding:"14px",background:"#0a0a0a",border:`1px solid ${C.fire}`,borderRadius:"10px"}}>
                  <label style={{...labelSt,color:C.fire,marginBottom:"10px"}}>NIVEL DE ENTRENAMIENTO</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
                    {NIVELES.map(n=>(
                      <button key={n.v} onClick={()=>setForm(f=>({...f,nivelRutina:n.v}))} style={{padding:"10px",background:form.nivelRutina===n.v?`linear-gradient(135deg,${C.red},${C.fire})`:"#111",border:`1px solid ${form.nivelRutina===n.v?C.fire:"#333"}`,borderRadius:"8px",cursor:"pointer",textAlign:"left"}}>
                        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:form.nivelRutina===n.v?C.white:C.grayL,letterSpacing:"1px"}}>{n.v}</div>
                        <div style={{fontSize:"10px",color:form.nivelRutina===n.v?"#fff9":"#475569",fontFamily:"Barlow, sans-serif",marginTop:"3px",lineHeight:"1.4"}}>{n.d}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isDemo&&consultasHoy>=1&&consultasHoy<limiteConsultas&&<div style={{marginTop:"12px",padding:"10px 14px",background:"#0a0f00",border:"1px solid #365314",borderRadius:"6px",fontSize:"12px",color:"#86efac",fontFamily:"Barlow, sans-serif"}}>ℹ️ Esta consulta es orientativa — ya registraste tu sesión del día.</div>}
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
              {isDemo&&consultasHoy>=3?(
                <div style={{marginTop:"16px",padding:"16px",background:"#1a0f00",border:`2px solid ${C.gold}`,borderRadius:"8px",textAlign:"center"}}>
                  <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.gold,letterSpacing:"2px",marginBottom:"8px"}}>🔒 CONSULTAS DEMO AGOTADAS</div>
                  <p style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",marginBottom:"12px"}}>Suscribite para acceso completo.</p>
                  <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent("Hola! Quiero contratar MG+IA Personal Trainer 24/7.")}`,"_blank")} style={{padding:"12px 24px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>💬 CONTRATAR AHORA</button>
                </div>
              ):(
                <LoadingButton loading={loading} onClick={handleSubmit}>→ OBTENER DECISIÓN</LoadingButton>
              )}
            </div>

            {/* PANTALLA ESPERA COACH */}
            {esperandoCoach&&(
              <div className="slide-up" style={{marginTop:"16px",padding:"24px",background:"linear-gradient(135deg,#0a1628,#1e3a5f)",border:`2px solid ${C.blueL}`,borderRadius:"12px",textAlign:"center"}}>
                <div style={{fontSize:"40px",marginBottom:"12px",animation:"pulse-fire 1.5s ease infinite"}}>👨‍💼</div>
                <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"18px",color:C.blueL,letterSpacing:"2px",marginBottom:"8px",animation:"blink 1.2s ease infinite"}}>
                  ESPERANDO APROBACIÓN DEL COACH
                </div>
                <div style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",marginBottom:"16px",lineHeight:"1.6"}}>
                  Aguardá unos segundos mientras el coach<br/>revisa y aprueba tu consulta...
                </div>
                <div style={{display:"flex",justifyContent:"center",gap:"8px"}}>
                  {[0,1,2,3,4].map(i=>(
                    <div key={i} style={{width:"8px",height:"8px",borderRadius:"50%",background:C.blueL,animation:"dot-bounce 1.2s ease infinite",animationDelay:`${i*0.2}s`}}/>
                  ))}
                </div>
                <style>{`@keyframes dot-bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-10px);opacity:1}}`}</style>
              </div>
            )}

            {result&&(
              <div className="slide-up" style={{marginBottom:"12px",padding:"12px 16px",background:"#0a1628",border:`1px solid ${C.blueL}`,borderRadius:"8px",display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{fontSize:"20px"}}>✅</span>
                <div>
                  <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:C.blueL,letterSpacing:"1px"}}>ANÁLISIS ENVIADO AL COACH</div>
                  <div style={{fontSize:"11px",color:C.gray,fontFamily:"Barlow, sans-serif"}}>Tu coach revisará este análisis para darte seguimiento personalizado</div>
                </div>
              </div>
            )}
            {result&&SECTIONS.map(s=>{
              const content=parsed[s.key];
              if(!content)return null;
              const isDemoBlocked=isDemo&&s.key==="rutina";
              return(
                <SectionCard key={s.key} icon={s.icon} label={s.label} content={content}
                  isAlert={s.key==="alerta"&&content!=="Ninguna"}
                  isRutina={s.key==="rutina"} isIntensity={s.key==="intensidad"}
                  notaRutina={s.key==="rutina"?notaRutina:undefined}
                  onNotaChange={s.key==="rutina"?setNotaRutina:undefined}
                  onNotaGuardar={s.key==="rutina"?guardarNota:undefined}
                  notaGuardada={s.key==="rutina"?notaGuardada:undefined}
                  isDemo={isDemo} isDemoBlocked={isDemoBlocked}
                  isAdmin={user?.role==="admin"||modoDios}
                  extra={s.key==="consultar"?(
                    consultarCoach&&!isDemo?(
                      <div style={{marginTop:"14px"}}>
                        {coachDecision===null&&(
                          <div style={{display:"flex",gap:"10px",justifyContent:"center",flexWrap:"wrap"}}>
                            <button onClick={()=>{setCoachDecision("si");abrirWhatsApp(parsed.alerta,parsed.motivo,user.nombre,user.apellido);}} style={{padding:"10px 18px",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:"6px",color:C.white,fontSize:"14px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>💬 CONTACTAR COACH</button>
                            <button onClick={()=>setCoachDecision("no")} style={{padding:"10px 18px",background:"transparent",border:"1px solid #333",borderRadius:"6px",color:C.gray,fontSize:"14px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer"}}>NO POR AHORA</button>
                          </div>
                        )}
                        {coachDecision==="no"&&(
                          <div style={{padding:"12px 16px",background:"#0d1a0d",border:`1px solid ${C.green}44`,borderRadius:"8px",textAlign:"center"}} className="slide-up">
                            <div style={{fontSize:"16px",marginBottom:"4px"}}>✅</div>
                            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.green,letterSpacing:"1px"}}>DE ACUERDO</div>
                            <div style={{fontSize:"12px",color:C.gray,fontFamily:"Barlow, sans-serif",marginTop:"4px"}}>Esta consulta no será notificada al coach, pero tu historial se mantiene actualizado.</div>
                          </div>
                        )}
                        {coachDecision==="si"&&(
                          <div style={{padding:"12px 16px",background:"#0d1a0d",border:`1px solid ${C.green}44`,borderRadius:"8px",textAlign:"center"}} className="slide-up">
                            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.green,letterSpacing:"1px"}}>✅ MENSAJE ENVIADO AL COACH</div>
                          </div>
                        )}
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
            {/* TABLERO TÁCTICO — solo usuarios PRO y Modo Dios */}
            {parsed.tablero&&(isPro||modoDios)&&(
              <TacticalBoard data={parsed.tablero} disciplina={form.disciplina}/>
            )}
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
                            <div style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.7",whiteSpace:"pre-wrap",background:"#0a0a0a",padding:"12px",borderRadius:"6px"}}>{s.response_text||"Sin respuesta registrada"}</div>
                            {s.nota_usuario&&(
                              <div style={{marginTop:"10px",padding:"10px 12px",background:"#0a0f1a",border:`1px solid ${C.blueL}44`,borderRadius:"8px"}}>
                                <div style={{fontSize:"10px",color:C.blueL,fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",marginBottom:"4px"}}>📝 TU NOTA</div>
                                <div style={{fontSize:"13px",color:C.grayL,fontFamily:"Barlow, sans-serif",lineHeight:"1.6"}}>{s.nota_usuario}</div>
                              </div>
                            )}
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
      {/* Barra sticky demo en la parte inferior */}
      {isDemo&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,background:"linear-gradient(90deg,#1a0a00,#0a0500)",borderTop:`2px solid ${C.gold}`,padding:"8px 16px",display:"flex",justifyContent:"center",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"16px"}}>🔒</span>
          <span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:C.gold,letterSpacing:"2px"}} className="blink">
            VERSIÓN DEMO · OPCIONES LIMITADAS Y BLOQUEADAS
          </span>
          <button onClick={()=>window.open(`https://wa.me/${WP_NUMBER}?text=${encodeURIComponent("Hola! Quiero contratar MG+IA Personal Trainer 24/7.")}`,"_blank")}
            style={{padding:"4px 12px",background:C.gold,border:"none",borderRadius:"4px",color:"#000",fontSize:"11px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"1px",cursor:"pointer",flexShrink:0}}>
            CONTRATAR
          </button>
        </div>
      )}
    </div>
  );
}

// ─── DISCIPLINAS FAN CAROUSEL ─────────────────────────────────────────────────
const DISCIPLINAS_CARDS = [
  { img:"/disc/disc1.jpg", emoji:"🏋️", nombre:"MUSCULACIÓN",      desc:"Fuerza · Hipertrofia · Técnica",            color:"#f97316" },
  { img:"/disc/disc2.jpg", emoji:"🏃", nombre:"RUNNING",          desc:"Resistencia · Velocidad · Técnica de carrera", color:"#22c55e" },
  { img:"/disc/disc3.jpg", emoji:"⚽", nombre:"FÚTBOL",           desc:"Potencia · Explosividad · Prevención",       color:"#3b82f6" },
  { img:"/disc/disc4.jpg", emoji:"🚴", nombre:"CICLISMO",         desc:"Resistencia · Potencia aeróbica",            color:"#a855f7" },
  { img:"/disc/disc5.jpg", emoji:"🏊", nombre:"NATACIÓN",         desc:"Fuerza funcional · Movilidad · Core",        color:"#06b6d4" },
  { img:"/disc/disc6.jpg", emoji:"🥊", nombre:"ARTES MARCIALES",  desc:"Potencia · Core · Agilidad",                color:"#ef4444" },
  { img:"/disc/disc7.jpg", emoji:"🎾", nombre:"TENIS / PÁDEL",    desc:"Explosividad · Movilidad · Fuerza",          color:"#eab308" },
  { img:"/disc/disc8.jpg", emoji:"🏐", nombre:"VÓLEY / BÁSQUET",  desc:"Salto · Velocidad · Resistencia",            color:"#f97316" },
  { img:"/disc/disc9.jpg", emoji:"🤸", nombre:"CROSSFIT",         desc:"Fuerza · Cardio · Funcional",                color:"#ec4899" },
  { img:"/disc/disc10.jpg",emoji:"🧘", nombre:"MOVILIDAD",        desc:"Flexibilidad · Propiocepción · Elongación",  color:"#10b981" },
];

// Solo muestra las cartas cuya imagen existe
function DisciplinasFan(){
  const[active,setActive]=useState(0);
  const[fullscreen,setFullscreen]=useState(null);
  const[loaded,setLoaded]=useState({}); // {index: true/false}

  // Detecta qué imágenes existen al montar
  useEffect(()=>{
    DISCIPLINAS_CARDS.forEach((d,i)=>{
      const img=new Image();
      img.onload=()=>setLoaded(prev=>({...prev,[i]:true}));
      img.onerror=()=>setLoaded(prev=>({...prev,[i]:false}));
      img.src=d.img;
    });
  },[]);

  // Solo cartas con imagen cargada o sin resultado aún (muestra emoji mientras carga)
  const visibles=DISCIPLINAS_CARDS.map((d,i)=>({...d,i,hasImg:loaded[i]===true}))
    .filter((_,i)=>loaded[i]!==false); // excluye las que fallaron

  const total=visibles.length;
  const[idx,setIdx]=useState(0);
  const prev=()=>setIdx(a=>(a-1+total)%total);
  const next=()=>setIdx(a=>(a+1)%total);

  const[tx,setTx]=useState(0);
  const onTS=e=>setTx(e.touches[0].clientX);
  const onTE=e=>{const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>40){dx<0?next():prev();}};

  if(total===0) return null; // nada que mostrar aún

  const getStyle=(pos)=>{
    const diff=((pos-idx+total)%total);
    const rel=diff>total/2?diff-total:diff;
    const abs=Math.abs(rel);
    if(abs>2) return null;
    return{
      rot:rel*14, scale:abs===0?1:abs===1?0.58:0.42,
      z:abs===0?10:abs===1?5:1, tx:rel*144,
      blur:abs===0?0:abs===1?2:4,
      opacity:abs===0?1:abs===1?0.55:0.35, rel,
    };
  };

  const cur=visibles[idx];

  return(
    <>
      {fullscreen!==null&&(
        <div onClick={()=>setFullscreen(null)}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.93)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}
          className="fadeIn">
          <div style={{maxWidth:"380px",width:"100%",textAlign:"center"}} className="slide-up">
            {visibles[fullscreen]?.hasImg?(
              <img src={visibles[fullscreen].img} alt={visibles[fullscreen].nombre}
                style={{width:"100%",aspectRatio:"9/16",objectFit:"cover",borderRadius:"16px",marginBottom:"16px",border:`2px solid ${visibles[fullscreen].color}`,maxHeight:"70vh"}}/>
            ):(
              <div style={{fontSize:"80px",marginBottom:"16px"}}>{visibles[fullscreen]?.emoji}</div>
            )}
            <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"34px",color:visibles[fullscreen]?.color,letterSpacing:"3px",marginBottom:"8px",textShadow:`0 0 30px ${visibles[fullscreen]?.color}`}}>
              {visibles[fullscreen]?.nombre}
            </div>
            <div style={{fontSize:"14px",color:"rgba(255,255,255,.7)",fontFamily:"Barlow, sans-serif",lineHeight:"1.7",marginBottom:"16px"}}>
              {visibles[fullscreen]?.desc}<br/>
              <span style={{fontSize:"12px",color:"rgba(255,255,255,.4)"}}>MG+IA adapta tu rutina específicamente para esta disciplina.</span>
            </div>
            <div style={{padding:"10px 16px",background:`${visibles[fullscreen]?.color}22`,border:`1px solid ${visibles[fullscreen]?.color}44`,borderRadius:"10px",fontSize:"12px",color:"rgba(255,255,255,.55)",fontFamily:"Barlow, sans-serif"}}>
              📋 La IA considera tu disciplina en cada sesión para orientar el entrenamiento correctamente.
            </div>
            <div style={{marginTop:"16px",fontSize:"11px",color:"rgba(255,255,255,.25)",fontFamily:"Barlow, sans-serif"}}>Tap para cerrar</div>
          </div>
        </div>
      )}

      <div style={{width:"100%",maxWidth:"440px",marginTop:"24px"}}>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:"rgba(255,255,255,.4)",letterSpacing:"3px",textAlign:"center",marginBottom:"16px"}}>
          🎯 DISCIPLINAS DISPONIBLES
        </div>
        <div style={{position:"relative",height:"380px",display:"flex",alignItems:"center",justifyContent:"center"}}
          onTouchStart={onTS} onTouchEnd={onTE}>
          {visibles.map((d,pos)=>{
            const s=getStyle(pos);
            if(!s) return null;
            return(
              <div key={d.i}
                onClick={()=>s.rel===0?setFullscreen(pos):setIdx(pos)}
                style={{
                  position:"absolute",width:"200px",height:"340px",borderRadius:"20px",overflow:"hidden",
                  background:d.hasImg?"#000":`linear-gradient(160deg,rgba(0,0,0,.8),${d.color}33)`,
                  border:`2px solid ${s.rel===0?d.color:"rgba(255,255,255,.15)"}`,
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"6px",
                  cursor:"pointer",transition:"all .4s cubic-bezier(.34,1.56,.64,1)",
                  transform:`translateX(${s.tx}px) scale(${s.scale}) rotate(${s.rot}deg)`,
                  zIndex:s.z,filter:`blur(${s.blur}px)`,opacity:s.opacity,
                  boxShadow:s.rel===0?`0 8px 32px ${d.color}66`:"none",
                }}>
                {d.hasImg?(
                  <>
                    <img src={d.img} alt={d.nombre} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top"}}/>
                    {s.rel===0&&<div style={{position:"absolute",inset:0,background:"linear-gradient(0deg,rgba(0,0,0,.4) 0%,transparent 40%)"}}/>}
                  </>
                ):(
                  <div style={{fontSize:s.rel===0?"80px":"56px"}}>{d.emoji}</div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"16px",marginTop:"12px"}}>
          <button onClick={prev} style={{width:"34px",height:"34px",borderRadius:"50%",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",color:"#fff",fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{display:"flex",gap:"5px"}}>
            {visibles.map((_,i)=>(
              <div key={i} onClick={()=>setIdx(i)} style={{width:idx===i?"18px":"6px",height:"6px",borderRadius:"3px",background:idx===i?cur.color:"rgba(255,255,255,.2)",cursor:"pointer",transition:"all .3s"}}/>
            ))}
          </div>
          <button onClick={next} style={{width:"34px",height:"34px",borderRadius:"50%",background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",color:"#fff",fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
      </div>
    </>
  );
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
// ─── COUNTDOWN HOOK ───────────────────────────────────────────────────────────
function useCountdown(){
  const TARGET = new Date('2026-05-04T12:00:00-03:00').getTime();
  const calc=()=>{
    const diff=TARGET-Date.now();
    if(diff<=0) return null;
    return{
      d:Math.floor(diff/86400000),
      h:Math.floor((diff%86400000)/3600000),
      m:Math.floor((diff%3600000)/60000),
      s:Math.floor((diff%60000)/1000),
    };
  };
  const[time,setTime]=useState(calc);
  useEffect(()=>{const t=setInterval(()=>setTime(calc()),1000);return()=>clearInterval(t);},[]);
  return time;
}

function LaunchBadge(){
  const time=useCountdown();
  const[tilt,setTilt]=useState(false);
  useEffect(()=>{const t=setInterval(()=>setTilt(v=>!v),800);return()=>clearInterval(t);},[]);

  if(!time) return(
    // Cuenta llegó a cero — cartel verde neón
    <div style={{
      margin:"0 auto",maxWidth:"420px",width:"100%",
      padding:"18px 24px",borderRadius:"14px",
      background:"rgba(0,30,0,.85)",
      border:"2px solid #22c55e",
      boxShadow:"0 0 20px #22c55e,0 0 40px #22c55e88,0 0 80px #22c55e44",
      textAlign:"center",
      animation:"neon-green 1.2s ease infinite",
    }}>
      <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"clamp(22px,6vw,34px)",color:"#22c55e",letterSpacing:"3px",textShadow:"0 0 20px #22c55e,0 0 40px #22c55e",animation:"neon-text 1.2s ease infinite"}}>
        ✅ YA PODÉS ADQUIRIR TU MEMBRESÍA!
      </div>
      <div style={{marginTop:"8px",fontSize:"14px",color:"rgba(255,255,255,.7)",fontFamily:"Barlow, sans-serif"}}>
        MG+IA Personal Trainer 24/7 — Ya está disponible
      </div>
      <a href={`https://wa.me/543571587003?text=${encodeURIComponent("Hola! Quiero adquirir mi membresía de MG+IA Personal Trainer 24/7")}`}
         target="_blank" rel="noopener noreferrer"
         style={{display:"inline-flex",alignItems:"center",gap:"8px",marginTop:"12px",padding:"12px 24px",background:"linear-gradient(135deg,#16a34a,#15803d)",borderRadius:"10px",color:"#fff",textDecoration:"none",fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",letterSpacing:"2px"}}>
        💬 QUIERO MI MEMBRESÍA →
      </a>
      <style>{`@keyframes neon-green{0%,100%{box-shadow:0 0 20px #22c55e,0 0 40px #22c55e88}50%{box-shadow:0 0 40px #22c55e,0 0 80px #22c55e,0 0 120px #22c55e66}}@keyframes neon-text{0%,100%{text-shadow:0 0 20px #22c55e,0 0 40px #22c55e}50%{text-shadow:0 0 40px #22c55e,0 0 80px #4ade80}}`}</style>
    </div>
  );

  const pad=n=>String(n).padStart(2,'0');

  return(
    <div style={{margin:"0 auto",maxWidth:"440px",width:"100%",position:"relative"}}>
      {/* Badge principal */}
      <div style={{
        background:"linear-gradient(135deg,#7f1d1d,#dc2626,#991b1b)",
        border:"3px solid #fbbf24",
        borderRadius:"16px",
        padding:"16px 20px",
        textAlign:"center",
        boxShadow:"0 0 24px rgba(220,38,38,.8),0 0 48px rgba(220,38,38,.4),inset 0 1px 0 rgba(255,255,255,.2)",
        animation:"badge-tilt 0.8s ease infinite",
        transform:tilt?"rotate(-1.5deg) scale(1.02)":"rotate(1deg) scale(1)",
        transition:"transform 0.4s ease",
      }}>
        {/* Estrella destellante */}
        <div style={{position:"absolute",top:"-14px",right:"16px",fontSize:"28px",animation:"star-spin 2s linear infinite"}}>⭐</div>
        <div style={{position:"absolute",top:"-14px",left:"16px",fontSize:"22px",animation:"star-spin 2s linear infinite reverse"}}>✨</div>

        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"13px",color:"#fbbf24",letterSpacing:"4px",marginBottom:"2px"}}>
          🚀 LANZAMIENTO OFICIAL
        </div>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"clamp(26px,7vw,38px)",color:"#fff",letterSpacing:"2px",lineHeight:"1",textShadow:"0 2px 8px rgba(0,0,0,.5)"}}>
          LUNES 4 DE MAYO
        </div>
        <div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"14px",color:"#fca5a5",letterSpacing:"2px",marginTop:"2px"}}>
          12:00 HS · mgfitnesscenter.com.ar
        </div>

        {/* Countdown */}
        <div style={{marginTop:"12px",display:"flex",justifyContent:"center",gap:"8px"}}>
          {[{v:time.d,l:"DÍAS"},{v:time.h,l:"HS"},{v:time.m,l:"MIN"},{v:time.s,l:"SEG"}].map(({v,l},i)=>(
            <div key={l} style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{
                background:"rgba(0,0,0,.5)",border:"1px solid rgba(251,191,36,.5)",borderRadius:"8px",
                padding:"6px 10px",minWidth:"52px",
                fontFamily:"Bebas Neue, sans-serif",fontSize:"clamp(22px,6vw,32px)",color:"#fbbf24",
                textShadow:"0 0 12px #fbbf24",lineHeight:"1",
                animation:l==="SEG"?"sec-pulse 1s ease infinite":"none",
              }}>
                {pad(v)}
              </div>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,.6)",letterSpacing:"1px",marginTop:"3px",fontFamily:"Bebas Neue, sans-serif"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes badge-tilt{0%,100%{box-shadow:0 0 24px rgba(220,38,38,.8),0 0 48px rgba(220,38,38,.4)}50%{box-shadow:0 0 40px rgba(251,191,36,.9),0 0 80px rgba(220,38,38,.6)}}
        @keyframes star-spin{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(1.3)}100%{transform:rotate(360deg) scale(1)}}
        @keyframes sec-pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>
    </div>
  );
}

function Landing({onIngresar}){
  const[slide,setSlide]=useState(0);
  const[visitas,setVisitas]=useState(null);
  const slides=["/promo1.webp","/promo2.webp","/promo3.webp"];
  useEffect(()=>{const t=setInterval(()=>setSlide(s=>(s+1)%slides.length),5000);return()=>clearInterval(t);},[]);

  // Swipe táctil
  const touchStart=useRef(null);
  const handleTouchStart=e=>touchStart.current=e.touches[0].clientX;
  const handleTouchEnd=e=>{
    if(touchStart.current===null)return;
    const diff=touchStart.current-e.changedTouches[0].clientX;
    if(Math.abs(diff)>40)setSlide(s=>(s+(diff>0?1:-1)+slides.length)%slides.length);
    touchStart.current=null;
  };

  useEffect(()=>{
    fetch(`${API}/api/visitas`,{method:"POST",headers:{"Content-Type":"application/json"}})
      .then(r=>r.json()).then(d=>{if(d.visitas)setVisitas(d.visitas);}).catch(()=>{});
  },[]);

  return(
    <div style={{minHeight:"100vh",background:"#000",position:"relative",overflow:"hidden"}}
      onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

      {/* Fondo slideshow */}
      {slides.map((src,i)=>(
        <div key={i} style={{position:"fixed",inset:0,backgroundImage:`url(${src})`,backgroundSize:"cover",backgroundPosition:"center top",opacity:slide===i?1:0,transition:"opacity 1.4s ease-in-out",zIndex:0}}/>
      ))}
      <div style={{position:"fixed",inset:0,background:"linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.2) 35%,rgba(0,0,0,.92) 100%)",zIndex:1}}/>

      {/* Contenido centrado */}
      <div style={{position:"relative",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:"20px 20px 130px"}}>

        {/* Logo con efecto fuego */}
        <div style={{filter:"drop-shadow(0 0 40px rgba(249,115,22,.9)) drop-shadow(0 0 80px rgba(220,38,38,.6))",animation:"glow-logo 3s ease infinite"}}>
          <img src="/logo-main.png" alt="MG+IA Personal Trainer 24/7" style={{width:"min(300px,78vw)",height:"auto",display:"block"}}/>
        </div>

        {/* Dots slideshow */}
        <div style={{marginTop:"32px",display:"flex",gap:"10px"}}>
          {slides.map((_,i)=>(
            <div key={i} onClick={()=>setSlide(i)} style={{height:"3px",width:slide===i?"48px":"24px",borderRadius:"2px",background:slide===i?"#f97316":"rgba(255,255,255,.2)",cursor:"pointer",transition:"all .4s"}}/>
          ))}
        </div>
      </div>

      {/* Contador de visitas */}
      {visitas&&(
        <div style={{position:"fixed",bottom:"100px",right:"12px",zIndex:50,display:"flex",alignItems:"center",gap:"5px",padding:"4px 10px",background:"rgba(0,0,0,.4)",borderRadius:"20px",backdropFilter:"blur(4px)"}}>
          <div style={{width:"5px",height:"5px",borderRadius:"50%",background:C.green,animation:"blink 2s ease infinite"}}/>
          <span style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"11px",color:"rgba(255,255,255,.3)",letterSpacing:"1px"}}>👁️ {visitas.toLocaleString("es-AR")}</span>
        </div>
      )}

      {/* Botón INGRESAR fijo */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,padding:"12px 16px 24px",background:"linear-gradient(0deg,rgba(0,0,0,.99) 60%,transparent)"}}>
        <button onClick={onIngresar}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"14px",width:"100%",maxWidth:"500px",margin:"0 auto",padding:"18px 24px",background:"linear-gradient(135deg,#dc2626 0%,#f97316 50%,#fbbf24 100%)",backgroundSize:"200%",border:"none",borderRadius:"14px",color:"#fff",fontFamily:"Bebas Neue, sans-serif",fontSize:"21px",letterSpacing:"3px",cursor:"pointer",boxShadow:"0 4px 30px rgba(249,115,22,.65)",animation:"btn-pulse 2.5s ease infinite,shimmer 4s linear infinite"}}>
          <span style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
            🔥 INGRESAR A LA APP
            <span style={{fontSize:"10px",opacity:.75,fontFamily:"Barlow Condensed, sans-serif",letterSpacing:"2px"}}>ACCESO DIRECTO · DECISIONES CON 100% ACTITUD</span>
          </span>
          <span style={{fontSize:"22px",animation:"arrow .8s ease infinite alternate"}}>→</span>
        </button>
      </div>
    </div>
  );
}

// ─── LANDING OR LOGIN ─────────────────────────────────────────────────────────

function LandingOrLogin({onLogin}){
  const[showLogin,setShowLogin]=useState(false);
  if(showLogin) return <Login onLogin={onLogin}/>;
  return <Landing onIngresar={()=>setShowLogin(true)}/>;
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const[user,setUser]=useState(null);const[sessionToken,setSessionToken]=useState(null);
  const[alertaVenc,setAlertaVenc]=useState(null);const[alertaVisible,setAlertaVisible]=useState(false);
  const[sesionCerrada,setSesionCerrada]=useState(false);const[verificando,setVerificando]=useState(true);
  const[isDemo,setIsDemo]=useState(false);const[horasDemo,setHorasDemo]=useState(null);
  const[limiteConsultas,setLimiteConsultas]=useState(2);const[isPro,setIsPro]=useState(false);
  const[modoDios,setModoDios]=useState(false);
  const[necesitaTerminos,setNecesitaTerminos]=useState(false);
  const[necesitaPerfil,setNecesitaPerfil]=useState(false);

  useEffect(()=>{
    const saved=loadSession();
    if(saved){
      fetch(`${API}/api/verify-session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:saved.user.id,sessionToken:saved.token,deviceId:getDeviceId()})})
        .then(r=>r.json()).then(d=>{
          if(d.valid){setUser(saved.user);setSessionToken(saved.token);setIsDemo(saved.user.is_demo||saved.user.role==="demo");}
          else{clearSession();if(d.error==="SESION_CERRADA")setSesionCerrada(true);}
          setVerificando(false);
        }).catch(()=>setVerificando(false));
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
    setHorasDemo(horas||24);setLimiteConsultas(limite||2);setIsPro(!!pro);setModoDios(!!userData.modo_dios);
    const needTerminos=!!terminos&&userData.role!=="admin";
    setNecesitaTerminos(needTerminos);
    const needPerfil=!userData.perfil_completado&&userData.role!=="admin"&&!needTerminos;
    setNecesitaPerfil(needPerfil);
    if(alerta){setAlertaVenc(alerta);setAlertaVisible(true);}
    if(dispositivoNuevo)setTimeout(()=>alert("⚠️ Sesión anterior cerrada. Este es tu dispositivo autorizado."),500);
  };

  const handleLogout=()=>{clearSession();setUser(null);setSessionToken(null);setAlertaVenc(null);setAlertaVisible(false);setSesionCerrada(false);setIsDemo(false);setNecesitaTerminos(false);setNecesitaPerfil(false);};
  const handleAceptarTerminos=()=>{
    setNecesitaTerminos(false);
    const saved=loadSession();
    if(saved){saved.user.terminos_aceptados=true;saveSession(saved.user,saved.token);}
    if(saved?.user&&!saved.user.perfil_completado&&saved.user.role!=="admin") setNecesitaPerfil(true);
  };
  const handleCompletarPerfil=()=>{
    setNecesitaPerfil(false);
    const saved=loadSession();
    if(saved){saved.user.perfil_completado=true;saveSession(saved.user,saved.token);}
  };

  if(verificando)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{textAlign:"center"}}><Logo size={100} pulse={true}/><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"16px",color:C.gray,letterSpacing:"3px",marginTop:"16px"}}>CARGANDO...</div></div></div>);

  if(sesionCerrada)return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}><div style={{maxWidth:"380px",width:"100%",textAlign:"center"}}><div style={{fontSize:"50px",marginBottom:"16px"}}>📵</div><div style={{fontFamily:"Bebas Neue, sans-serif",fontSize:"26px",color:C.fire,letterSpacing:"2px",marginBottom:"12px"}}>SESIÓN CERRADA</div><div style={{background:"#1a0a05",border:`1px solid ${C.fire}`,borderRadius:"10px",padding:"20px",marginBottom:"20px"}}><p style={{color:C.grayL,fontSize:"14px",lineHeight:"1.7",fontFamily:"Barlow, sans-serif"}}>Tu sesión fue cerrada porque iniciaste sesión desde otro dispositivo.</p></div><button onClick={()=>setSesionCerrada(false)} style={{padding:"14px 28px",background:`linear-gradient(135deg,${C.red},${C.fire})`,border:"none",borderRadius:"8px",color:C.white,fontSize:"16px",fontFamily:"Bebas Neue, sans-serif",letterSpacing:"2px",cursor:"pointer"}}>→ VOLVER A INGRESAR</button></div></div>);

  if(!user) return <LandingOrLogin onLogin={handleLogin}/>;
  if(necesitaTerminos) return <TerminosModal user={user} onAceptar={handleAceptarTerminos}/>;
  if(necesitaPerfil) return <PerfilInicial user={user} onCompletar={handleCompletarPerfil}/>;

  return(
    <>
      {alertaVisible&&alertaVenc&&(
        <div style={{position:"fixed",top:0,left:0,right:0,zIndex:9999,background:"linear-gradient(90deg,#7c1d0a,#92400e)",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"Bebas Neue, sans-serif",borderBottom:`2px solid ${C.fire}`}}>
          <span style={{fontSize:"16px",color:C.gold,letterSpacing:"2px"}}>⚠️ {alertaVenc}</span>
          <button onClick={()=>setAlertaVisible(false)} style={{background:"transparent",border:"none",color:C.gold,fontSize:"18px",cursor:"pointer"}}>✕</button>
        </div>
      )}
      <div style={{paddingTop:alertaVisible&&alertaVenc?"48px":0}}>
        {user.role==="admin"?<AdminPanel user={user} onLogout={handleLogout}/>:<Coach user={user} onLogout={handleLogout} isDemo={isDemo} limiteConsultas={limiteConsultas} isPro={isPro} modoDios={modoDios}/>}
      </div>
    </>
  );
}