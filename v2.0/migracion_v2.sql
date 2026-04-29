-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN v2.0 — MG+IA Personal Trainer 24/7
-- Ejecutar en Supabase → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Campos nuevos en users (si no los ejecutaste antes)
alter table users add column if not exists condicion_medica   text;
alter table users add column if not exists terminos_aceptados boolean default false;
alter table users add column if not exists terminos_fecha     timestamptz;
alter table users add column if not exists suspendido         boolean default false;

-- Campos nuevos en sesiones
alter table sesiones add column if not exists consulta_id  text;
alter table sesiones add column if not exists es_registro  boolean default true;

-- Tabla ejercicios_media (para versión 2.5)
create table if not exists ejercicios_media (
  id          uuid default gen_random_uuid() primary key,
  nombre      text not null unique,
  gif_url     text,
  descripcion text,
  validado    boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table ejercicios_media enable row level security;
create policy if not exists "admin_only_ejercicios"
on ejercicios_media for all to public using (true) with check (true);

-- Refrescar schema cache
notify pgrst, 'reload schema';
