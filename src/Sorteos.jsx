import { useState, useEffect, useCallback } from "react";

// ─── SORTEOS SEMANALES ────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const IG = "mgfitnesscenter";
const C = { fire:"#f97316", gold:"#fbbf24", red:"#dc2626", green:"#22c55e", white:"#fff", gray:"#64748b", grayL:"#94a3b8", blueL:"#2563eb", pink:"#ec4899" };
const BEBAS = "Bebas Neue, sans-serif", BARLOW = "Barlow, sans-serif";
const cardSt = { background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:"12px", padding:"18px", marginBottom:"14px" };
const inputSt = { width:"100%", background:"#111", border:"1px solid #2a2a2a", borderRadius:"8px", color:C.white, padding:"12px 14px", fontSize:"14px", outline:"none", fontFamily:BARLOW };
const labelSt = { fontFamily:BEBAS, fontSize:"12px", color:C.grayL, letterSpacing:"2px", marginBottom:"6px", display:"block" };
const btnSt = (bg, full=true) => ({ width:full?"100%":"auto", padding:"14px 18px", background:bg, border:"none", borderRadius:"8px", color:C.white, fontSize:"16px", fontFamily:BEBAS, letterSpacing:"2px", cursor:"pointer" });

const SORTEO_STYLE = document.createElement("style");
SORTEO_STYLE.textContent = `
  @keyframes sorteo-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes sorteo-glow { 0%,100%{box-shadow:0 6px 24px rgba(236,72,153,.55),0 0 0 0 rgba(251,191,36,.6)} 50%{box-shadow:0 8px 36px rgba(249,115,22,.85),0 0 0 10px rgba(251,191,36,0)} }
`;
document.head.appendChild(SORTEO_STYLE);

function authHeaders(){
  try{
    const u = JSON.parse(localStorage.getItem("mgfc_user")||"null");
    const t = localStorage.getItem("mgfc_token");
    return { "Content-Type":"application/json", "x-user-id":u?.id||"", "x-session-token":t||"" };
  }catch{ return { "Content-Type":"application/json" }; }
}
async function api(path, opts={}){
  const r = await fetch(`${API}${path}`, { ...opts, headers:{ ...authHeaders(), ...(opts.headers||{}) } });
  const d = await r.json().catch(()=>({}));
  if(!r.ok || d.error) throw new Error(d.error || `Error ${r.status}`);
  return d;
}

// Reduce la foto a ≤1280px JPEG para que suba rápido desde el celu
function comprimirImagen(file, maxW=1280, q=0.82){
  return new Promise((resolve, reject)=>{
    if(!file || !file.type.startsWith("image/")) return reject(new Error("Elegí una imagen"));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const esc = Math.min(1, maxW / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width*esc); cv.height = Math.round(img.height*esc);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      resolve(cv.toDataURL("image/jpeg", q));
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

const fechaLarga = f => new Date(`${f}T12:00:00-03:00`).toLocaleDateString("es-AR",{weekday:"long",day:"2-digit",month:"2-digit"}).toUpperCase();

// ── Hook: sorteo vigente para el socio ──
export function useSorteoActual(activo){
  const[info,setInfo]=useState(null);
  const recargar=useCallback(()=>{
    if(!activo) return;
    api("/api/sorteo/actual").then(setInfo).catch(()=>setInfo({sorteo:null,ultimoGanador:null}));
  },[activo]);
  useEffect(()=>{ recargar(); },[recargar]);
  return [info, recargar];
}

// ── Llamado de atención flotante ──
export function SorteoFlotante({ info, onAbrir }){
  const key = info?.sorteo ? `sorteo_cerrado_${info.sorteo.id}` : null;
  const[oculto,setOculto]=useState(()=>{ try{ return key ? sessionStorage.getItem(key)==="1" : false; }catch{ return false; } });
  if(!info?.sorteo || oculto || info.sorteo.estado!=="activo") return null;
  const participando = info.participacion && info.participacion.estado!=="rechazada";
  const cerrar = e => { e.stopPropagation(); setOculto(true); try{ sessionStorage.setItem(key,"1"); }catch{} };
  return(
    <div onClick={onAbrir} style={{position:"fixed",right:"14px",bottom:"18px",zIndex:900,cursor:"pointer",animation:"sorteo-bounce 2.4s ease-in-out infinite"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 14px 10px 12px",borderRadius:"40px",background:`linear-gradient(135deg,${C.pink},${C.fire} 60%,${C.gold})`,animation:"sorteo-glow 2s ease-in-out infinite",maxWidth:"min(78vw,300px)"}}>
        <span style={{fontSize:"26px",lineHeight:1}}>🎁</span>
        <div style={{lineHeight:1.05,minWidth:0}}>
          <div style={{fontFamily:BEBAS,fontSize:"16px",color:"#fff",letterSpacing:"1.5px"}}>{participando?"✅ YA PARTICIPÁS":"SORTEO DEL VIERNES"}</div>
          <div style={{fontFamily:BARLOW,fontSize:"11px",color:"#fff",opacity:.92,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{info.sorteo.premio}</div>
        </div>
        <button onClick={cerrar} aria-label="Cerrar" style={{marginLeft:"2px",width:"22px",height:"22px",flexShrink:0,borderRadius:"50%",border:"none",background:"rgba(0,0,0,.35)",color:"#fff",fontSize:"12px",cursor:"pointer"}}>✕</button>
      </div>
    </div>
  );
}

function SubirFoto({ label, ayuda, valor, onChange, texto="📷 TOCÁ PARA SUBIR CAPTURA" }){
  const[err,setErr]=useState("");
  const elegir = async e => {
    setErr("");
    try{ onChange(await comprimirImagen(e.target.files?.[0])); }catch(x){ setErr(x.message); }
  };
  return(
    <div style={{marginBottom:"14px"}}>
      <span style={labelSt}>{label}</span>
      {ayuda&&<div style={{fontSize:"12px",color:C.gray,fontFamily:BARLOW,marginBottom:"8px"}}>{ayuda}</div>}
      <label style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"10px",minHeight:"90px",border:`2px dashed ${valor?C.green:"#333"}`,borderRadius:"10px",cursor:"pointer",background:"#0a0a0a",overflow:"hidden"}}>
        {valor
          ? <img src={valor} alt="" style={{maxHeight:"180px",maxWidth:"100%",objectFit:"contain"}}/>
          : <span style={{fontFamily:BEBAS,fontSize:"15px",color:C.grayL,letterSpacing:"1.5px"}}>{texto}</span>}
        <input type="file" accept="image/*" onChange={elegir} style={{display:"none"}}/>
      </label>
      {valor&&<div style={{fontSize:"11px",color:C.green,fontFamily:BARLOW,marginTop:"4px"}}>✓ Lista · tocá la imagen para cambiarla</div>}
      {err&&<div style={{fontSize:"12px",color:C.red,marginTop:"4px"}}>{err}</div>}
    </div>
  );
}

function Check({ ok, children }){
  return(
    <div style={{display:"flex",gap:"10px",alignItems:"flex-start",padding:"10px 0",borderBottom:"1px solid #1a1a1a"}}>
      <span style={{fontSize:"18px",lineHeight:1.2}}>{ok?"✅":"⬜"}</span>
      <div style={{fontFamily:BARLOW,fontSize:"14px",color:ok?C.white:C.grayL,lineHeight:1.5}}>{children}</div>
    </div>
  );
}

// ── Sección del socio ──
export function SorteoTab({ info, recargar, irAConsulta }){
  const[historia,setHistoria]=useState(null);
  const[requisito,setRequisito]=useState(null);
  const[enviando,setEnviando]=useState(false);
  const[error,setError]=useState("");
  const[verBases,setVerBases]=useState(false);

  if(!info) return <div style={{textAlign:"center",padding:"40px",color:C.gray,fontFamily:BARLOW}}>Cargando sorteo…</div>;
  const { sorteo:s, consultasSemana, participacion:p, ultimoGanador } = info;

  const bannerGanador = ultimoGanador && (
    <div style={{...cardSt,border:`2px solid ${C.gold}`,background:"linear-gradient(135deg,#1a1405,#0d0d0d)",textAlign:"center"}}>
      <div style={{fontFamily:BEBAS,fontSize:"13px",color:C.gold,letterSpacing:"3px"}}>🏆 GANADOR {ultimoGanador.fecha_sorteo?`· ${fechaLarga(ultimoGanador.fecha_sorteo)}`:""}</div>
      <div style={{fontFamily:BEBAS,fontSize:"30px",color:C.white,letterSpacing:"2px",margin:"4px 0"}}>{ultimoGanador.ganador_nombre}</div>
      <div style={{fontFamily:BARLOW,fontSize:"13px",color:C.grayL}}>se llevó: <strong style={{color:C.fire}}>{ultimoGanador.premio}</strong></div>
    </div>
  );

  if(!s) return(
    <div style={{paddingBottom:"30px"}}>
      {bannerGanador}
      <div style={{...cardSt,textAlign:"center",color:C.gray,fontFamily:BARLOW}}>Todavía no hay sorteo nuevo esta semana. ¡Atento al lunes! 🎁</div>
    </div>
  );

  const participando = p && p.estado!=="rechazada";
  const rechazada = p?.estado==="rechazada";
  const abierto = s.estado==="activo" && new Date() <= new Date(s.hasta);
  const okConsulta = consultasSemana>0;
  const puede = abierto && okConsulta && historia && (!s.requisito_extra || requisito) && !participando;

  const participar = async ()=>{
    setError(""); setEnviando(true);
    try{
      await api("/api/sorteo/participar",{method:"POST",body:JSON.stringify({sorteoId:s.id,historiaImg:historia,requisitoImg:requisito})});
      setHistoria(null); setRequisito(null); recargar();
    }catch(x){ setError(x.message); }
    setEnviando(false);
  };

  return(
    <div style={{paddingBottom:"90px",textAlign:"left"}}>
      <div style={{...cardSt,padding:0,overflow:"hidden",border:`2px solid ${C.fire}`}}>
        {s.imagen_url&&<img src={s.imagen_url} alt={s.premio} style={{width:"100%",maxHeight:"340px",objectFit:"cover",display:"block"}}/>}
        <div style={{padding:"16px 18px"}}>
          <div style={{fontFamily:BEBAS,fontSize:"13px",color:C.pink,letterSpacing:"3px"}}>🎁 SORTEO SEMANAL · {fechaLarga(s.fecha_sorteo)}</div>
          <div style={{fontFamily:BEBAS,fontSize:"30px",color:C.white,letterSpacing:"1.5px",lineHeight:1.05,margin:"6px 0"}}>{s.premio}</div>
          {s.descripcion&&<div style={{fontFamily:BARLOW,fontSize:"14px",color:C.grayL,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{s.descripcion}</div>}
        </div>
      </div>

      {s.estado==="sorteado"&&<div style={{...cardSt,textAlign:"center",border:`1px solid ${C.gold}`,fontFamily:BEBAS,color:C.gold,letterSpacing:"2px",fontSize:"16px"}}>🎲 YA SE SORTEÓ · EN BREVE SE PUBLICA EL GANADOR</div>}

      <div style={cardSt}>
        <div style={{fontFamily:BEBAS,fontSize:"14px",color:C.fire,letterSpacing:"2px",marginBottom:"4px"}}>CÓMO PARTICIPAR</div>
        <Check ok={okConsulta}>
          <strong>Hacé al menos 1 consulta esta semana</strong> en la app.{" "}
          {okConsulta
            ? <span style={{color:C.green}}>Llevás {consultasSemana} 💪</span>
            : abierto&&<button onClick={irAConsulta} style={{marginLeft:"4px",background:"transparent",border:`1px solid ${C.fire}`,borderRadius:"6px",color:C.fire,fontFamily:BEBAS,letterSpacing:"1px",padding:"2px 10px",cursor:"pointer"}}>HACER CONSULTA →</button>}
        </Check>
        <Check ok={participando||!!historia}>
          <strong>Subí una historia en Instagram etiquetando a <a href={`https://instagram.com/${IG}`} target="_blank" rel="noreferrer" style={{color:C.pink}}>@{IG}</a></strong> y mandanos la captura acá abajo.
        </Check>
        {s.requisito_extra&&<Check ok={participando||!!requisito}><strong>Requisito extra:</strong> {s.requisito_extra}</Check>}
      </div>

      {participando ? (
        <div style={{...cardSt,border:`2px solid ${C.green}`,textAlign:"center"}}>
          <div style={{fontFamily:BEBAS,fontSize:"24px",color:C.green,letterSpacing:"2px"}}>✅ ESTÁS PARTICIPANDO</div>
          <div style={{fontFamily:BARLOW,fontSize:"13px",color:C.grayL,marginTop:"4px"}}>{p.estado==="aprobada"?"Tu participación fue verificada.":"Estamos revisando tu captura."} El sorteo es el {fechaLarga(s.fecha_sorteo).toLowerCase()}. ¡Suerte!</div>
        </div>
      ) : abierto ? (
        <div style={cardSt}>
          {rechazada&&<div style={{marginBottom:"12px",padding:"10px",border:`1px solid ${C.red}`,borderRadius:"8px",color:"#fca5a5",fontSize:"13px",fontFamily:BARLOW}}>Tu captura anterior no fue válida. Subí una nueva donde se vea la etiqueta a @{IG}.</div>}
          <SubirFoto label="CAPTURA DE TU HISTORIA" ayuda={`Que se vea la etiqueta @${IG}.`} valor={historia} onChange={setHistoria}/>
          {s.requisito_extra&&<SubirFoto label="COMPROBANTE DEL REQUISITO" ayuda={s.requisito_extra} valor={requisito} onChange={setRequisito}/>}
          {error&&<div style={{color:C.red,fontSize:"13px",marginBottom:"10px",fontFamily:BARLOW}}>❌ {error}</div>}
          <button onClick={participar} disabled={!puede||enviando} style={{...btnSt(puede?`linear-gradient(135deg,${C.pink},${C.fire})`:"#252525"),opacity:puede?1:.6,cursor:puede?"pointer":"not-allowed"}}>
            {enviando?"⏳ ENVIANDO...":!okConsulta?"PRIMERO HACÉ TU CONSULTA SEMANAL":"🎁 QUIERO PARTICIPAR"}
          </button>
        </div>
      ) : (
        <div style={{...cardSt,textAlign:"center",color:C.gray,fontFamily:BARLOW}}>La inscripción de esta semana ya cerró.</div>
      )}

      {bannerGanador}

      {s.bases&&<div style={{textAlign:"center"}}>
        <button onClick={()=>setVerBases(!verBases)} style={{background:"transparent",border:"none",color:C.gray,fontSize:"12px",textDecoration:"underline",cursor:"pointer",fontFamily:BARLOW}}>{verBases?"Ocultar":"Ver"} bases y condiciones</button>
        {verBases&&<div style={{...cardSt,marginTop:"8px",textAlign:"left",fontSize:"12px",color:C.grayL,fontFamily:BARLOW,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{s.bases}</div>}
      </div>}
    </div>
  );
}

// ── Panel admin ──
const proximoViernes = () => {
  const ar = new Date(Date.now()-3*3600000);
  const add = (5 - ar.getUTCDay() + 7) % 7;
  return new Date(ar.getTime()+add*86400000).toISOString().slice(0,10);
};
const BASES_DEFAULT = `• Organiza: MG Fitness Center, Almafuerte, Córdoba.
• Participan socios de MG+IA con al menos 1 consulta en la app durante la semana del sorteo (lunes a viernes) que suban captura de una historia de Instagram etiquetando a @${IG}.
• Sorteo al azar entre participantes válidos, el día indicado. El ganador se publica en la app y en Instagram.
• El premio no es canjeable por dinero. Tiene 7 días para retirarlo; si no, se vuelve a sortear.
• Esta promoción no está patrocinada, avalada ni administrada por Instagram.`;

export function SorteosAdmin(){
  const[sorteos,setSorteos]=useState([]);
  const[cargando,setCargando]=useState(true);
  const[form,setForm]=useState(null);       // null = cerrado
  const[guardando,setGuardando]=useState(false);
  const[sel,setSel]=useState(null);         // sorteo abierto (participantes)
  const[parts,setParts]=useState([]);
  const[msg,setMsg]=useState("");
  const[ganador,setGanador]=useState(null);
  const[zoom,setZoom]=useState(null);

  const aviso = t => { setMsg(t); setTimeout(()=>setMsg(""),4500); };
  const cargar = useCallback(()=>{
    setCargando(true);
    api("/api/admin/sorteos").then(d=>setSorteos(d.sorteos)).catch(e=>aviso("❌ "+e.message)).finally(()=>setCargando(false));
  },[]);
  useEffect(()=>{ cargar(); },[cargar]);

  const abrir = async s => {
    setSel(s); setGanador(null);
    try{ const d=await api(`/api/admin/sorteo/${s.id}/participantes`); setParts(d.participantes); setSel(d.sorteo); }
    catch(e){ aviso("❌ "+e.message); }
  };
  const nuevo = () => setForm({ premio:"", descripcion:"", requisito_extra:"", bases:BASES_DEFAULT, fecha_sorteo:proximoViernes(), imagen:null, preview:null });
  const editar = s => setForm({ id:s.id, premio:s.premio, descripcion:s.descripcion||"", requisito_extra:s.requisito_extra||"", bases:s.bases||"", fecha_sorteo:s.fecha_sorteo, imagen:null, preview:s.imagen_url });

  const guardar = async ()=>{
    if(!form.premio.trim()) return aviso("❌ Poné el premio");
    setGuardando(true);
    try{
      const { preview, ...body } = form;
      await api("/api/admin/sorteo",{method:"POST",body:JSON.stringify(body)});
      aviso("✅ Sorteo guardado"); setForm(null); cargar();
    }catch(e){ aviso("❌ "+e.message); }
    setGuardando(false);
  };
  const cambiarEstado = async (id, estado) => {
    try{ await api("/api/admin/sorteo/participacion-estado",{method:"POST",body:JSON.stringify({id,estado})}); setParts(ps=>ps.map(p=>p.id===id?{...p,estado,elegible:estado!=="rechazada"&&p.consultas>0}:p)); }
    catch(e){ aviso("❌ "+e.message); }
  };
  const sortear = async ()=>{
    const n = parts.filter(p=>p.elegible).length;
    if(!window.confirm(`¿Sortear ahora entre ${n} participante(s) elegible(s)?`)) return;
    try{ const d=await api(`/api/admin/sorteo/${sel.id}/sortear`,{method:"POST"}); setSel(d.sorteo); setGanador(d.ganadorCompleto); cargar(); }
    catch(e){ aviso("❌ "+e.message); }
  };
  const publicar = async ()=>{
    if(!window.confirm(`¿Publicar a ${sel.ganador_nombre} como ganador? Lo van a ver todos los socios.`)) return;
    try{ const d=await api(`/api/admin/sorteo/${sel.id}/publicar`,{method:"POST"}); setSel(d.sorteo); aviso("🏆 Ganador publicado"); cargar(); }
    catch(e){ aviso("❌ "+e.message); }
  };

  const estadoColor = { activo:C.green, sorteado:C.gold, publicado:C.blueL, cancelado:C.gray };

  return(
    <div style={{...cardSt,border:`1px solid ${C.pink}`,textAlign:"left"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"10px",flexWrap:"wrap",marginBottom:"14px"}}>
        <div style={{fontFamily:BEBAS,fontSize:"22px",color:C.pink,letterSpacing:"2px"}}>🎁 SORTEOS SEMANALES</div>
        {!form&&<button onClick={nuevo} style={btnSt(`linear-gradient(135deg,${C.pink},${C.fire})`,false)}>+ NUEVO SORTEO</button>}
      </div>
      {msg&&<div style={{marginBottom:"12px",padding:"10px",background:"#111",borderRadius:"8px",color:C.white,fontFamily:BARLOW,fontSize:"13px"}}>{msg}</div>}

      {form&&(
        <div style={{...cardSt,border:"1px solid #333"}}>
          <span style={labelSt}>PREMIO *</span>
          <input style={{...inputSt,marginBottom:"12px"}} value={form.premio} onChange={e=>setForm({...form,premio:e.target.value})} placeholder="Ej: Proteína whey 1kg + shaker"/>
          <span style={labelSt}>DESCRIPCIÓN</span>
          <textarea style={{...inputSt,minHeight:"70px",marginBottom:"12px",resize:"vertical"}} value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} placeholder="Detalle del premio, sponsor, etc."/>
          <span style={labelSt}>FECHA DEL SORTEO (VIERNES)</span>
          <input type="date" style={{...inputSt,marginBottom:"4px"}} value={form.fecha_sorteo} onChange={e=>setForm({...form,fecha_sorteo:e.target.value})}/>
          <div style={{fontSize:"11px",color:C.gray,fontFamily:BARLOW,marginBottom:"12px"}}>Cuentan las consultas desde el lunes de esa semana hasta ese día a las 23:59.</div>
          <span style={labelSt}>REQUISITO EXTRA (OPCIONAL)</span>
          <input style={{...inputSt,marginBottom:"4px"}} value={form.requisito_extra} onChange={e=>setForm({...form,requisito_extra:e.target.value})} placeholder="Ej: Seguir a @marca_sponsor"/>
          <div style={{fontSize:"11px",color:C.gray,fontFamily:BARLOW,marginBottom:"12px"}}>Si lo completás, el socio tiene que subir una captura que lo compruebe.</div>
          <SubirFoto label="IMAGEN DEL SORTEO" texto="🖼️ TOCÁ PARA SUBIR IMAGEN" valor={form.imagen||form.preview} onChange={v=>setForm({...form,imagen:v})}/>
          <span style={labelSt}>BASES Y CONDICIONES</span>
          <textarea style={{...inputSt,minHeight:"120px",marginBottom:"14px",resize:"vertical",fontSize:"12px"}} value={form.bases} onChange={e=>setForm({...form,bases:e.target.value})}/>
          <div style={{display:"flex",gap:"10px"}}>
            <button onClick={guardar} disabled={guardando} style={btnSt(`linear-gradient(135deg,${C.green},#16a34a)`)}>{guardando?"⏳ GUARDANDO...":"💾 GUARDAR"}</button>
            <button onClick={()=>setForm(null)} style={{...btnSt("transparent"),border:"1px solid #444",color:C.grayL}}>CANCELAR</button>
          </div>
        </div>
      )}

      {cargando?<div style={{color:C.gray,fontFamily:BARLOW}}>Cargando…</div>:sorteos.length===0&&!form?(
        <div style={{color:C.gray,fontFamily:BARLOW,fontSize:"13px"}}>No hay sorteos. Creá el primero con “+ NUEVO SORTEO”.</div>
      ):sorteos.map(s=>(
        <div key={s.id} style={{display:"flex",gap:"12px",alignItems:"center",padding:"10px",border:`1px solid ${sel?.id===s.id?C.pink:"#222"}`,borderRadius:"10px",marginBottom:"8px",background:"#0a0a0a"}}>
          {s.imagen_url?<img src={s.imagen_url} alt="" style={{width:"52px",height:"52px",objectFit:"cover",borderRadius:"8px"}}/>:<div style={{width:"52px",height:"52px",borderRadius:"8px",background:"#1a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>🎁</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:BEBAS,fontSize:"17px",color:C.white,letterSpacing:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.premio}</div>
            <div style={{fontSize:"11px",color:C.gray,fontFamily:BARLOW}}>{fechaLarga(s.fecha_sorteo)} · <span style={{color:estadoColor[s.estado]||C.gray}}>{s.estado.toUpperCase()}</span>{s.ganador_nombre?` · 🏆 ${s.ganador_nombre}`:""}</div>
          </div>
          <button onClick={()=>abrir(s)} style={{...btnSt("#1f1f1f",false),padding:"8px 12px",fontSize:"13px"}}>👥 VER</button>
          {s.estado==="activo"&&<button onClick={()=>editar(s)} style={{...btnSt("#1f1f1f",false),padding:"8px 12px",fontSize:"13px"}}>✏️</button>}
        </div>
      ))}

      {sel&&(
        <div style={{...cardSt,marginTop:"14px",border:"1px solid #333"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",gap:"8px"}}>
            <div style={{fontFamily:BEBAS,fontSize:"18px",color:C.white,letterSpacing:"1px"}}>👥 {parts.length} PARTICIPANTE(S) · {parts.filter(p=>p.elegible).length} ELEGIBLE(S)</div>
            <button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:C.gray,fontSize:"18px",cursor:"pointer"}}>✕</button>
          </div>
          {parts.map(p=>(
            <div key={p.id} style={{display:"flex",gap:"10px",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #1a1a1a",opacity:p.estado==="rechazada"?.45:1}}>
              {[p.historia_url,p.requisito_url].filter(Boolean).map((u,i)=>(
                <img key={i} src={u} alt="" onClick={()=>setZoom(u)} style={{width:"46px",height:"70px",objectFit:"cover",borderRadius:"6px",cursor:"zoom-in",border:"1px solid #333"}}/>
              ))}
              <div style={{flex:1,minWidth:0,fontFamily:BARLOW}}>
                <div style={{color:C.white,fontSize:"14px",fontWeight:600}}>{p.nombre} {p.apellido}</div>
                <div style={{fontSize:"11px",color:p.consultas>0?C.green:C.red}}>{p.consultas} consulta(s) en la semana {p.consultas>0?"✓":"✗ NO ELEGIBLE"}</div>
                <div style={{fontSize:"11px",color:p.estado==="aprobada"?C.green:p.estado==="rechazada"?C.red:C.gold}}>{p.estado.toUpperCase()}</div>
              </div>
              {sel.estado==="activo"&&<div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                {p.estado!=="aprobada"&&<button onClick={()=>cambiarEstado(p.id,"aprobada")} style={{...btnSt(C.green,false),padding:"6px 10px",fontSize:"12px"}}>✓ OK</button>}
                {p.estado!=="rechazada"&&<button onClick={()=>cambiarEstado(p.id,"rechazada")} style={{...btnSt("#3a1010",false),padding:"6px 10px",fontSize:"12px"}}>✗ NO</button>}
              </div>}
            </div>
          ))}
          {parts.length===0&&<div style={{color:C.gray,fontFamily:BARLOW,fontSize:"13px",padding:"8px 0"}}>Todavía nadie se anotó.</div>}

          {sel.estado!=="publicado"&&(
            <div style={{marginTop:"14px"}}>
              {sel.ganador_nombre&&<div style={{textAlign:"center",padding:"14px",border:`2px solid ${C.gold}`,borderRadius:"10px",marginBottom:"10px"}}>
                <div style={{fontFamily:BEBAS,fontSize:"13px",color:C.gold,letterSpacing:"2px"}}>🎲 SALIÓ SORTEADO</div>
                <div style={{fontFamily:BEBAS,fontSize:"28px",color:C.white,letterSpacing:"2px"}}>{ganador||sel.ganador_nombre}</div>
                <div style={{fontSize:"11px",color:C.gray,fontFamily:BARLOW}}>Los socios van a ver: {sel.ganador_nombre}</div>
              </div>}
              <div style={{display:"flex",gap:"10px"}}>
                <button onClick={sortear} style={btnSt(`linear-gradient(135deg,${C.fire},${C.red})`)}>{sel.ganador_nombre?"🎲 VOLVER A SORTEAR":"🎲 SORTEAR"}</button>
                {sel.ganador_nombre&&<button onClick={publicar} style={btnSt(`linear-gradient(135deg,${C.gold},${C.fire})`)}>🏆 PUBLICAR GANADOR</button>}
              </div>
            </div>
          )}
          {sel.estado==="publicado"&&<div style={{textAlign:"center",fontFamily:BEBAS,color:C.blueL,letterSpacing:"2px",marginTop:"12px"}}>🏆 PUBLICADO: {sel.ganador_nombre}</div>}
        </div>
      )}

      {zoom&&<div onClick={()=>setZoom(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",cursor:"zoom-out"}}><img src={zoom} alt="" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/></div>}
    </div>
  );
}
