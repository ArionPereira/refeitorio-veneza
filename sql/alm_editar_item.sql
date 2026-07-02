begin;

-- Permite editar um item do almoxarifado já cadastrado (nome, categoria,
-- unidade, estoque mínimo e ativo/inativo). Antes só existia a criação
-- (alm_criar_item) — não dava pra corrigir o estoque mínimo depois.
create or replace function public.alm_atualizar_item(
  p_id uuid, p_nome text, p_categoria_id uuid, p_unidade_id uuid,
  p_estoque_minimo numeric default 0, p_ativo boolean default true
) returns public.alm_itens
language plpgsql security definer set search_path=public as $$
declare v_cat public.alm_categorias; v_un public.alm_unidades; v_item public.alm_itens;
begin
  if nullif(trim(p_nome),'') is null then raise exception 'Informe o nome do item'; end if;
  select * into v_cat from public.alm_categorias where id=p_categoria_id and ativo;
  if not found then raise exception 'Categoria inválida ou inativa'; end if;
  select * into v_un from public.alm_unidades where id=p_unidade_id and ativo;
  if not found then raise exception 'Unidade de medida inválida ou inativa'; end if;
  update public.alm_itens set
    nome           = trim(p_nome),
    categoria_id   = v_cat.id,
    categoria      = v_cat.nome,
    unidade_id     = v_un.id,
    unidade        = v_un.sigla,
    estoque_minimo = greatest(coalesce(p_estoque_minimo,0),0),
    ativo          = coalesce(p_ativo,true)
  where id = p_id
  returning * into v_item;
  if v_item is null then raise exception 'Item não encontrado'; end if;
  return v_item;
end $$;

grant execute on function public.alm_atualizar_item(uuid,text,uuid,uuid,numeric,boolean) to anon,authenticated;

commit;
