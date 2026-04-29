import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

dotenv.config();

const REQUIRED_ENV = ["SUPABASE_URL","SUPABASE_KEY","CLAUDE_API_KEY"];
REQUIRED_ENV.forEach(key=>{if(!process.env[key]){console.error(`❌ Falta: ${key}`);process.exit(1);}});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const SALT_ROUNDS = 10;

// Límites de consultas por día
const LIMITE_STANDARD = 2;
const LIMITE_PRO = 5;
const LIMITE_DEMO = 3;

app.use(cors());
app.use(express.json());
app.use((req,res,next)=>{ res.setHeader("ngrok-skip-browser-warning","true"); next(); });

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isBcryptHash(str) { return str&&str.startsWith("$2b$"); }

async function verificarPassword(plain, stored, userId) {
  if(isBcryptHash(stored)) return bcrypt.compare(plain,stored);
  if(plain!==stored) return false;
  const hash=await bcrypt.hash(plain,SALT_ROUNDS);
  await supabase.from("users").update({password:hash}).eq("id",userId);
  console.log(`[SEGURIDAD] Password migrada: ${userId}`);
  return true;
}

// ─── HEALTH ───────────────────────────────────────────────────────────────────
app.get("/",(req,res)=>res.json({status:"OK",app:"MG+IA Personal Trainer 24/7",version:"2.0"}));
app.get("/api/test-db",async(req,res)=>{
  const{data,error}=await supabase.from("users").select("id,dni,nombre").limit(3);
  if(error) return res.status(500).json({error:error.message});
  res.json({ok:true,muestra:data});
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
app.post("/api/login",async(req,res)=>{
  try{
    let{dni,password,deviceId}=req.body;
    if(!dni||!password) return res.status(400).json({error:"DNI y contraseña requeridos"});
    if(!deviceId) return res.status(400).json({error:"Dispositivo no identificado"});
    dni=dni.trim(); password=password.trim();
    console.log(`[LOGIN] DNI: ${dni}`);

    const{data:user,error}=await supabase.from("users").select("*").eq("dni",dni).single();
    if(error||!user){console.log("[LOGIN] No encontrado");return res.status(401).json({error:"Credenciales inválidas"});}

    // Verificar si está suspendido
    if(user.suspendido&&user.role!=="admin"){
      console.log("[LOGIN] Usuario suspendido");
      return res.status(403).json({error:"Tu cuenta está suspendida. Contactá al coach para más información."});
    }

    const ok=await verificarPassword(password,user.password,user.id);
    if(!ok){console.log("[LOGIN] Password incorrecto");return res.status(401).json({error:"Credenciales inválidas"});}

    const now=new Date();
    const exp=user.fecha_expiracion?new Date(user.fecha_expiracion):null;
    if(exp&&now>exp) return res.status(403).json({error:"Suscripción vencida. Contactá al coach para renovar."});

    // Lógica dispositivo
    let dispositivoNuevo=false;
    if(user.role!=="admin"&&user.role!=="demo"){
      if(user.device_token){
        if(user.device_token===deviceId){console.log(`[LOGIN] Dispositivo reconocido ✓`);}
        else if(user.device_locked){console.log(`[LOGIN] Bloqueado`);return res.status(403).json({error:"DISPOSITIVO_BLOQUEADO"});}
        else{dispositivoNuevo=true;console.log(`[LOGIN] Nuevo dispositivo`);}
      }
    } else {console.log(`[LOGIN] ${user.role} — sin restricción ✓`);}

    const sessionToken=randomUUID();
    const updatePayload={session_token:sessionToken,session_created_at:now.toISOString()};
    if(user.role!=="admin"&&user.role!=="demo"&&(!user.device_token||dispositivoNuevo)){
      updatePayload.device_token=deviceId;
      updatePayload.device_registered_at=now.toISOString();
      updatePayload.device_locked=dispositivoNuevo;
    }
    await supabase.from("users").update(updatePayload).eq("id",user.id);

    let alertaVencimiento=null;
    if(exp){const horas=(exp-now)/(1000*60*60);if(horas<=72)alertaVencimiento=`⚠️ Tu suscripción vence en ${Math.floor(horas)} horas — Contactá al coach`;}

    const isDemo=user.role==="demo"||user.is_demo;
    let horasDemo=null;
    if(isDemo&&exp) horasDemo=Math.max(0,Math.floor((exp-now)/(1000*60*60)));

    // Determinar límite de consultas
    const isPro=user.role==="pro";
    const limiteConsultas=isDemo?LIMITE_DEMO:isPro?LIMITE_PRO:LIMITE_STANDARD;

    const{password:_,...userSafe}=user;
    console.log(`[LOGIN] OK: ${user.nombre} ${user.apellido} | ${user.role}`);
    res.json({success:true,user:userSafe,sessionToken,alertaVencimiento,dispositivoNuevo,isDemo,horasDemo,limiteConsultas,isPro,necesitaTerminos:!user.terminos_aceptados});
  }catch(err){console.error("[LOGIN]",err);res.status(500).json({error:"Error del servidor"});}
});

// ─── ACEPTAR TÉRMINOS ─────────────────────────────────────────────────────────
app.post("/api/aceptar-terminos",async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    const{error}=await supabase.from("users").update({terminos_aceptados:true,terminos_fecha:new Date().toISOString()}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    console.log(`[TÉRMINOS] Aceptados: userId ${userId}`);
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error del servidor"});}
});

// ─── VERIFY SESSION ───────────────────────────────────────────────────────────
app.post("/api/verify-session",async(req,res)=>{
  try{
    const{userId,sessionToken,deviceId}=req.body;
    if(!userId||!sessionToken||!deviceId) return res.json({valid:false,error:"Datos incompletos"});
    const{data:user,error}=await supabase.from("users").select("id,role,is_demo,session_token,device_token,device_locked,fecha_expiracion,suspendido").eq("id",userId).single();
    if(error||!user) return res.json({valid:false,error:"No encontrado"});
    if(user.suspendido&&user.role!=="admin") return res.json({valid:false,error:"SUSPENDIDO"});
    if(user.session_token!==sessionToken) return res.json({valid:false,error:"SESION_CERRADA"});
    if(user.role!=="admin"&&user.role!=="demo"&&user.device_token!==deviceId) return res.json({valid:false,error:"DISPOSITIVO_NO_AUTORIZADO"});
    if(user.fecha_expiracion&&new Date()>new Date(user.fecha_expiracion)) return res.json({valid:false,error:"SUSCRIPCION_VENCIDA"});
    res.json({valid:true});
  }catch(err){res.status(500).json({valid:false,error:"Error"});}
});

// ─── CAMBIAR PASSWORD ─────────────────────────────────────────────────────────
app.post("/api/cambiar-password",async(req,res)=>{
  try{
    const{userId,passwordActual,passwordNueva}=req.body;
    if(!userId||!passwordActual||!passwordNueva) return res.status(400).json({error:"Faltan datos"});
    if(passwordNueva.length<6) return res.status(400).json({error:"Mínimo 6 caracteres"});
    const{data:user,error}=await supabase.from("users").select("id,password").eq("id",userId).single();
    if(error||!user) return res.status(404).json({error:"Usuario no encontrado"});
    const ok=await verificarPassword(passwordActual,user.password,userId);
    if(!ok) return res.status(401).json({error:"La contraseña actual es incorrecta"});
    const hash=await bcrypt.hash(passwordNueva,SALT_ROUNDS);
    await supabase.from("users").update({password:hash}).eq("id",userId);
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

// ─── CONSULTAS DEL DÍA — verificar límite ────────────────────────────────────
app.get("/api/consultas-hoy/:userId",async(req,res)=>{
  try{
    const{userId}=req.params;
    const hoy=new Date();
    hoy.setHours(0,0,0,0);
    const{data,error}=await supabase.from("sesiones").select("id,created_at,es_registro").eq("user_id",userId).gte("created_at",hoy.toISOString()).order("created_at",{ascending:true});
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,consultas:data?.length||0,sesiones:data||[]});
  }catch(err){res.status(500).json({error:"Error"});}
});

// ─── SESIONES ─────────────────────────────────────────────────────────────────
app.post("/api/sesion",async(req,res)=>{
  try{
    const{userId,sesion,esRegistro}=req.body;
    if(!userId||!sesion) return res.status(400).json({error:"Faltan datos"});
    const now=new Date();
    const consultaId="CID-"+randomUUID().slice(0,8).toUpperCase();
    const{data,error}=await supabase.from("sesiones").insert([{
      user_id:userId,...sesion,
      hora_del_dia:now.getHours(),
      created_at:now.toISOString(),
      es_registro:esRegistro||false,
      consulta_id:consultaId,
    }]).select().single();
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,sesion:data});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.get("/api/sesiones/:userId",async(req,res)=>{
  try{
    const{userId}=req.params;
    const limit=parseInt(req.query.limit)||50;
    const{data,error}=await supabase.from("sesiones").select("id,consulta_id,entrenamiento,peso,descanso,energia,alimentacion,dolor,tiempo,response_text,training_week,is_deload,streak,hora_del_dia,es_registro,created_at").eq("user_id",userId).order("created_at",{ascending:false}).limit(limit);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,sesiones:data});
  }catch(err){res.status(500).json({error:"Error"});}
});

// ─── PESAJES ──────────────────────────────────────────────────────────────────
app.post("/api/pesaje",async(req,res)=>{
  try{
    const{userId,peso,fecha,nota}=req.body;
    if(!userId||!peso) return res.status(400).json({error:"Faltan datos"});
    const{data,error}=await supabase.from("pesajes").insert([{user_id:userId,peso:parseFloat(peso),fecha:fecha||new Date().toISOString().slice(0,10),nota:nota||null,created_at:new Date().toISOString()}]).select().single();
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,pesaje:data});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.get("/api/pesajes/:userId",async(req,res)=>{
  try{
    const{userId}=req.params;
    const{data,error}=await supabase.from("pesajes").select("*").eq("user_id",userId).order("fecha",{ascending:false}).limit(50);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,pesajes:data});
  }catch(err){res.status(500).json({error:"Error"});}
});

// ─── COACH IA ─────────────────────────────────────────────────────────────────
app.post("/api/coach",async(req,res)=>{
  try{
    const{system,userMsg}=req.body;
    if(!system||!userMsg) return res.status(400).json({error:"Faltan datos"});
    const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.CLAUDE_API_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-5",max_tokens:1400,system,messages:[{role:"user",content:userMsg}]})});
    const data=await response.json();
    if(data.error) return res.status(500).json({error:data.error.message});
    const text=data.content?.map(b=>b.text||"").join("\n")||"";
    res.json({success:true,text});
  }catch(err){console.error("[COACH]",err);res.status(500).json({error:"Error del servidor"});}
});

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ══════════════════════════════════════════════════════════════════════════════
app.get("/api/admin/usuarios",async(req,res)=>{
  try{
    const{data,error}=await supabase.from("users").select("id,dni,nombre,apellido,role,is_demo,fecha_inicio,fecha_expiracion,device_token,device_registered_at,device_locked,suspendido,condicion_medica,terminos_aceptados,terminos_fecha").order("apellido",{ascending:true});
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,usuarios:data});
  }catch(err){res.status(500).json({error:"Error"});}
});

// Sesiones de un usuario — para admin (incluye consulta_id)
app.get("/api/admin/sesiones/:userId",async(req,res)=>{
  try{
    const{userId}=req.params;
    const{data,error}=await supabase.from("sesiones").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,sesiones:data});
  }catch(err){res.status(500).json({error:"Error"});}
});

// Editar respuesta de sesión — solo admin
app.post("/api/admin/editar-sesion",async(req,res)=>{
  try{
    const{sesionId,response_text}=req.body;
    if(!sesionId||!response_text) return res.status(400).json({error:"Faltan datos"});
    const{error}=await supabase.from("sesiones").update({response_text}).eq("id",sesionId);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/crear-usuario",async(req,res)=>{
  try{
    let{dni,nombre,apellido,password,role,isDemo,condicion_medica}=req.body;
    if(!dni||!nombre||!apellido||!password) return res.status(400).json({error:"Faltan campos"});
    dni=dni.trim();
    const{data:existing}=await supabase.from("users").select("id").eq("dni",dni).single();
    if(existing) return res.status(409).json({error:"Ya existe un usuario con ese DNI"});
    const ahora=new Date();
    const vence=new Date(ahora);
    if(isDemo) vence.setHours(vence.getHours()+24);
    else vence.setDate(vence.getDate()+30);
    const hash=await bcrypt.hash(password.trim(),SALT_ROUNDS);
    const{data,error}=await supabase.from("users").insert([{
      dni,nombre:nombre.trim(),apellido:apellido.trim(),password:hash,
      role:isDemo?"demo":(role||"usuario"),is_demo:!!isDemo,
      fecha_inicio:ahora.toISOString(),fecha_expiracion:vence.toISOString(),
      condicion_medica:condicion_medica||null,
      terminos_aceptados:false,suspendido:false,
    }]).select("id,dni,nombre,apellido,role,is_demo,fecha_inicio,fecha_expiracion").single();
    if(error) return res.status(500).json({error:error.message});
    console.log(`[ADMIN] Creado: ${data.nombre} ${data.apellido}${isDemo?" (DEMO)":""}`);
    res.json({success:true,usuario:data});
  }catch(err){console.error("[CREAR]",err);res.status(500).json({error:"Error"});}
});

app.post("/api/admin/renovar",async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    const nuevaFecha=new Date();nuevaFecha.setDate(nuevaFecha.getDate()+30);
    const{error}=await supabase.from("users").update({fecha_expiracion:nuevaFecha.toISOString()}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,nuevaFecha:nuevaFecha.toISOString()});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/renovar-demo",async(req,res)=>{
  try{
    const{userId,horas}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    const nuevaFecha=new Date();nuevaFecha.setHours(nuevaFecha.getHours()+(horas||24));
    const{error}=await supabase.from("users").update({fecha_expiracion:nuevaFecha.toISOString()}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true,nuevaFecha:nuevaFecha.toISOString()});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/resetear-dispositivo",async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    const{error}=await supabase.from("users").update({device_token:null,device_registered_at:null,device_locked:false,session_token:null}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/resetear-password",async(req,res)=>{
  try{
    const{userId,nuevaPassword}=req.body;
    if(!userId||!nuevaPassword) return res.status(400).json({error:"Faltan datos"});
    const hash=await bcrypt.hash(nuevaPassword.trim(),SALT_ROUNDS);
    const{error}=await supabase.from("users").update({password:hash}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/suspender-usuario",async(req,res)=>{
  try{
    const{userId,suspendido}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    const{error}=await supabase.from("users").update({suspendido:!!suspendido,session_token:null}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    console.log(`[ADMIN] Usuario ${suspendido?"suspendido":"reactivado"}: ${userId}`);
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/actualizar-condicion",async(req,res)=>{
  try{
    const{userId,condicion_medica}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    const{error}=await supabase.from("users").update({condicion_medica}).eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

app.post("/api/admin/eliminar-usuario",async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    await supabase.from("sesiones").delete().eq("user_id",userId);
    await supabase.from("pesajes").delete().eq("user_id",userId);
    const{error}=await supabase.from("users").delete().eq("id",userId);
    if(error) return res.status(500).json({error:error.message});
    console.log(`[ADMIN] Usuario eliminado: ${userId}`);
    res.json({success:true});
  }catch(err){console.error("[ELIMINAR]",err);res.status(500).json({error:"Error"});}
});

// Habilitar registro adicional del día para un usuario
app.post("/api/admin/habilitar-registro",async(req,res)=>{
  try{
    const{userId}=req.body;
    if(!userId) return res.status(400).json({error:"userId requerido"});
    // Marca la última sesión del día como no-registro para permitir una nueva
    const hoy=new Date();hoy.setHours(0,0,0,0);
    const{error}=await supabase.from("sesiones").update({es_registro:false}).eq("user_id",userId).gte("created_at",hoy.toISOString()).eq("es_registro",true);
    if(error) return res.status(500).json({error:error.message});
    console.log(`[ADMIN] Registro habilitado para: ${userId}`);
    res.json({success:true});
  }catch(err){res.status(500).json({error:"Error"});}
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`✅ MG+IA Personal Trainer 24/7 v2.0 — http://localhost:${PORT}`));
