# HANDOFF — MG+IA PERSONAL TRAINER 24/7 v2.0
# Pegá este archivo + el último App.jsx + el último server.js en el nuevo chat.

## CONTEXTO
Estamos desarrollando una app web de personal trainer con IA para Marcos Giménez (CUIL 20-31996621-9, Almafuerte, Córdoba, Argentina). La app está en producción y en uso real con socios reales.

---

## STACK
- Frontend: React + Vite → Vercel → mgfitnesscenter.com.ar
- Backend: Node.js + Express → Railway → ai-mgfc-backend-production.up.railway.app
- DB: Supabase → nywoghxhovocaiuwxcoz.supabase.co
- IA: Anthropic claude-sonnet-4-5
- Repo frontend: github.com/marki2026/ia-mgfc-assistant
- Repo backend: ai-coach-backend (en GitHub del mismo usuario)

## ESTRUCTURA DE ARCHIVOS
```
ai-coach-frontend/
├── index.html          ← Vite entry (NO tocar)
├── vite.config.js      ← base: '/'
├── vercel.json         ← rewrites /* → /index.html
├── src/App.jsx         ← TODO el frontend en un solo archivo
└── public/
    ├── logo.png        ← logo app
    ├── logo-main.png   ← logo fuego (landing)
    ├── logo-badge.png  ← badge circular
    ├── manifest.json
    ├── promo1-4.jpg    ← slideshow landing
    └── disc/           ← imágenes disciplinas (disc1.jpg ... disc10.jpg)
        └── (pendiente agregar por el usuario)

ai-coach-backend/
└── server.js           ← TODO el backend en un solo archivo
```

---

## VARIABLES DE ENTORNO
Railway: SUPABASE_URL, SUPABASE_KEY, CLAUDE_API_KEY
Vercel: VITE_API_URL = https://ai-mgfc-backend-production.up.railway.app

---

## BASE DE DATOS — TABLAS SUPABASE

### users
id, dni, nombre, apellido, password(bcrypt), role(usuario/pro/demo/admin),
is_demo, fecha_inicio, fecha_expiracion, device_token, device_locked,
session_token, condicion_medica, terminos_aceptados, terminos_fecha,
suspendido, telefono, fecha_nac, objetivo, nivel_base

### sesiones
id, user_id, consulta_id, entrenamiento, peso, descanso, energia,
alimentacion, dolor, tiempo, response_text, training_week, is_deload,
streak, hora_del_dia, es_registro, nota_usuario, created_at

### pesajes
id, user_id, peso, fecha, nota, created_at

### visitas
id(1), total (contador landing page)

### ejercicios_media (v2.5 — creada, sin uso aún)
id, nombre, gif_url, descripcion, validado, created_at

RLS: todas las tablas con policy "allow_all" para public.

---

## ROLES Y LÓGICA

### ADMIN
- Sin restricción de dispositivo ni límite de consultas
- Panel completo: crear, editar, suspender, eliminar usuarios
- Botones: +30 días, +24hs demo, ⬆️ PASAR A STANDARD, 📅 VENCIMIENTO, ✏️ EDITAR, 💬 WP, 📋 HISTORIAL, 🔑 PWD, ⏸ SUSPENDER, 🗑 ELIMINAR
- Fondo verde en usuarios que consultaron hoy
- Ver historial completo con consulta_id

### USUARIO STANDARD
- 2 consultas/día (solo la 1ra se registra en historial)
- Pestañas: HOY, PESO, STATS, HISTORIAL
- Formulario pre-llenado desde sesión anterior (localStorage)
- Campos con borde verde al completar
- Notas personales en rutina
- Objetivo y nivel_base pasados automáticamente a la IA
- T&C con scroll obligatorio en primer uso

### DEMO
- 3 consultas en 24hs
- Sin rutina, sin historial, sin pesaje, sin stats
- Banner parpadeante + barra sticky "VERSIÓN DEMO"
- Toggle rutina visible pero bloqueado con aviso
- Al agotar consultas → pantalla de contratación

---

## LANDING PAGE (integrada en React)
- Componente LandingOrLogin → Landing → Login (al presionar INGRESAR)
- Slideshow: promo1-4.jpg cada 6 segundos + swipe táctil
- Badge "EN CONSTRUCCIÓN" parpadeante
- Logo con efecto fuego (logo-main.png, fondo transparente)
- DisciplinasFan: carrusel tipo abanico con 10 disciplinas
  - Lee imágenes de /disc/disc1.jpg...disc10.jpg
  - Si no existe la imagen → muestra emoji
  - Carta central más grande, laterales reducidas y rotadas
  - Tap central → fullscreen 9:16
  - Sin labels en las cartas
- Badge lanzamiento + countdown al 4 de mayo 2026 12:00hs (AR)
  - Al llegar a 0 → cartel verde neón "YA PODÉS ADQUIRIR TU MEMBRESÍA"
- Botones WP: verde "QUIERO PROBAR DEMO" + azul "QUIERO INFO"
- Botón fijo "INGRESAR A LA APP" con shimmer izq→der
- Contador visitas discreto esquina inferior derecha (solo icono + número)
- Foto: visitas se guardan en tabla `visitas` vía POST /api/visitas

---

## COACH IA
- buildSystemPrompt(isDemo, incluirRutina, nivelRutina)
- Secciones parseadas: DECISIÓN PRINCIPAL, INTENSIDAD, DESCANSO, ALIMENTACIÓN, ALERTA, CONSULTAR, MOTIVO, RUTINA DEL DÍA
- Contexto incluye: historial 10 sesiones, condición médica, objetivo, nivel_base, sexo, etapa menstrual, disciplina deportiva, semana de descarga
- Pantalla "ESPERANDO APROBACIÓN DEL COACH" 4-10 segundos aleatorios después de recibir respuesta
- Botón COPIAR RUTINA
- Campo NOTA PERSONAL guardado en sesiones.nota_usuario
- Botones CONTACTAR COACH / NO POR AHORA con feedback visual (centrados, se anulan mutuamente)

---

## SEGURIDAD
- bcrypt passwords, migración automática desde plaintext
- device_token único por usuario (admin y demo sin restricción)
- session_token UUID, invalida sesión anterior
- Verificación visibilitychange (al volver a la app)
- Suspensión con cierre de sesión inmediato

---

## DEPLOY
```
# Frontend
cd C:\Users\Administrator\ai-coach-frontend
git add .
git commit -m "descripcion"
git push origin main

# Backend  
cd C:\Users\Administrator\ai-coach-backend
git add .
git commit -m "descripcion"
git push origin main
```
PowerShell NO acepta &&. Ejecutar los 3 comandos por separado.

---

## ESTADO ACTUAL — LO QUE FALTA / ROADMAP
- T&C: verificación correcta al restaurar sesión (fix pendiente menor)
- Notificaciones push (Bloque 5)
- MercadoPago + renovación automática (Bloque 6)
- Versión PRO: plan alimenticio, videos (Bloque 7)
- Tienda online (Bloque 8)
- Visor ejercicios con GIF — tabla ejercicios_media ya creada (Bloque 2.5)
- Imágenes disc/ pendientes de crear y subir por el usuario
- Vinculación futura con sistema de ingreso físico del gimnasio

---

## NOTAS IMPORTANTES
- App.jsx es UN SOLO ARCHIVO con todo el frontend (~1700 líneas)
- server.js es UN SOLO ARCHIVO con todo el backend
- Al editar, SIEMPRE pedir str_replace específico, nunca reescribir todo
- PowerShell: comandos uno por uno, sin &&
- Vercel redeploya automático al hacer push
- Railway redeploya automático al hacer push
- El usuario sube los archivos descargados manualmente a las carpetas locales antes del push
- Las imágenes de disciplinas van en public/disc/ con nombres disc1.jpg a disc10.jpg
