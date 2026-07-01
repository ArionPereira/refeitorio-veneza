begin;

-- =====================================================================
-- Controle de acesso do Hub Veneza: usuários com senha (hash bcrypt via
-- pgcrypto), papel master/comum e lista de módulos permitidos.
-- A tabela NÃO recebe grants para anon/authenticated: todo acesso passa
-- pelas funções SECURITY DEFINER abaixo, então o hash de senha nunca é
-- exposto ao cliente.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.app_usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  nome text not null,
  senha_hash text not null,
  role text not null default 'comum' check (role in ('master','comum')),
  modulos text[] not null default '{}',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint app_usuarios_usuario_chk check (length(trim(usuario)) >= 3),
  constraint app_usuarios_nome_chk check (length(trim(nome)) > 0)
);

-- master inicial (TROQUE A SENHA no primeiro acesso, pela tela de Usuários)
insert into public.app_usuarios(usuario,nome,senha_hash,role,modulos,ativo)
values('arion','Arion (master)', crypt('veneza@2026', gen_salt('bf')), 'master', '{}', true)
on conflict (usuario) do nothing;

-- ---------- Login: valida usuário/senha e devolve os dados da sessão ----
create or replace function public.app_login(p_usuario text, p_senha text)
returns table(id uuid, usuario text, nome text, role text, modulos text[])
language sql security definer set search_path = public, extensions as $$
  select u.id, u.usuario, u.nome, u.role, u.modulos
  from public.app_usuarios u
  where u.usuario = lower(trim(p_usuario))
    and u.ativo
    and u.senha_hash = crypt(p_senha, u.senha_hash);
$$;

-- ---------- Listagem para o master gerenciar (sem o hash) ---------------
create or replace function public.app_listar_usuarios(p_master_id uuid)
returns table(id uuid, usuario text, nome text, role text, modulos text[], ativo boolean, criado_em timestamptz)
language sql security definer set search_path = public as $$
  select u.id, u.usuario, u.nome, u.role, u.modulos, u.ativo, u.criado_em
  from public.app_usuarios u
  where exists (select 1 from public.app_usuarios m where m.id = p_master_id and m.role = 'master' and m.ativo)
  order by u.role desc, u.nome;
$$;

-- ---------- Criar/editar usuário (só master) ----------------------------
create or replace function public.app_salvar_usuario(
  p_master_id uuid, p_id uuid, p_usuario text, p_nome text, p_senha text,
  p_role text, p_modulos text[], p_ativo boolean
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_hash text;
begin
  if not exists (select 1 from public.app_usuarios m where m.id = p_master_id and m.role = 'master' and m.ativo) then
    raise exception 'Apenas um usuário master pode gerenciar acessos';
  end if;
  if p_role not in ('master','comum') then raise exception 'Papel inválido'; end if;
  if length(trim(coalesce(p_usuario,''))) < 3 then raise exception 'O login deve ter ao menos 3 caracteres'; end if;
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome'; end if;

  if p_id is null then
    if nullif(trim(p_senha),'') is null then raise exception 'Defina uma senha para o novo usuário'; end if;
    insert into public.app_usuarios(usuario,nome,senha_hash,role,modulos,ativo)
    values(lower(trim(p_usuario)),trim(p_nome),crypt(p_senha,gen_salt('bf')),p_role,coalesce(p_modulos,'{}'),coalesce(p_ativo,true))
    returning id into v_id;
  else
    if nullif(trim(p_senha),'') is not null then v_hash := crypt(p_senha,gen_salt('bf')); end if;
    update public.app_usuarios set
      usuario = lower(trim(p_usuario)),
      nome    = trim(p_nome),
      role    = p_role,
      modulos = coalesce(p_modulos,'{}'),
      ativo   = coalesce(p_ativo,true),
      senha_hash = coalesce(v_hash, senha_hash)
    where id = p_id
    returning id into v_id;
    if v_id is null then raise exception 'Usuário não encontrado'; end if;
  end if;

  if not exists (select 1 from public.app_usuarios where role='master' and ativo) then
    raise exception 'Deve existir pelo menos um usuário master ativo';
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'Já existe um usuário com esse login';
end $$;

revoke all on function public.app_login(text,text) from public;
grant execute on function public.app_login(text,text) to anon, authenticated;
grant execute on function public.app_listar_usuarios(uuid) to anon, authenticated;
grant execute on function public.app_salvar_usuario(uuid,uuid,text,text,text,text,text[],boolean) to anon, authenticated;

commit;
