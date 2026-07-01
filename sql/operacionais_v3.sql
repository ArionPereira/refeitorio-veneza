begin;

-- 1) Libera a constraint de "origem" das movimentações do almoxarifado para
--    aceitar exatamente os valores gravados pela função alm_registrar_movimentacao
--    ('manual') e pelo fechamento de inventário ('inventario'). É a causa do erro:
--    "new row for relation alm_movimentacoes violates check constraint alm_movimentacoes_origem_check"
do $$
declare r record;
begin
  for r in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'alm_movimentacoes' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%origem%'
  loop
    execute format('alter table public.alm_movimentacoes drop constraint %I', r.conname);
  end loop;
  alter table public.alm_movimentacoes
    add constraint alm_movimentacoes_origem_check check (origem in ('manual','inventario'));
end $$;

-- 2) Item sem localização é permitido (o campo saiu do cadastro de itens)
alter table public.alm_itens alter column localizacao drop not null;

-- 3) Adiciona "gás" (empilhadeiras) como combustível válido onde houver
--    check constraint restringindo os valores, e evita duplicidade de trigger.
do $$
declare r record; t text;
begin
  foreach t in array array['comb_veiculos','comb_tanques','comb_abastecimentos'] loop
    for r in
      select con.conname, pg_get_constraintdef(con.oid) as def
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      where rel.relname = t and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%combustivel%'
    loop
      if r.def not ilike '%gas%' then
        execute format('alter table public.%I drop constraint %I', t, r.conname);
        execute format(
          'alter table public.%I add constraint %I check (combustivel in (''diesel'',''gasolina'',''etanol'',''gas''))',
          t, t || '_combustivel_check'
        );
      end if;
    end loop;
  end loop;
end $$;

-- 4) Tanques/abastecimentos de gás usam m3 ou kg em vez de litros — já suportado
--    pela coluna "unidade" (L/m3/kg) adicionada em operacionais_v2.sql; só garante
--    que a constraint de unidade cobre os três valores.
do $$
declare r record; t text;
begin
  foreach t in array array['comb_tanques','comb_abastecimentos'] loop
    for r in
      select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      where rel.relname = t and con.contype = 'c'
        and pg_get_constraintdef(con.oid) ilike '%unidade%'
    loop
      execute format('alter table public.%I drop constraint %I', t, r.conname);
    end loop;
    execute format(
      'alter table public.%I add constraint %I check (unidade in (''L'',''m3'',''kg''))',
      t, t || '_unidade_check'
    );
  end loop;
end $$;

-- 5) Garante as permissões usadas pelo front (idempotente, caso alguma tenha
--    ficado de fora numa aplicação parcial da migração anterior).
grant select,insert,update,delete on public.alm_categorias,public.alm_unidades,public.comb_entradas to anon,authenticated;
grant execute on function public.alm_criar_item(text,uuid,uuid,numeric) to anon,authenticated;
grant execute on function public.alm_registrar_movimentacao(uuid,date,text,numeric,text,text,text) to anon,authenticated;
grant execute on function public.alm_abrir_inventario(date,text,text) to anon,authenticated;
grant execute on function public.alm_atualizar_contagem(uuid,numeric) to anon,authenticated;
grant execute on function public.alm_concluir_inventario(uuid,text) to anon,authenticated;
grant execute on function public.comb_registrar_abastecimento(uuid,uuid,date,numeric,numeric,text) to anon,authenticated;
grant execute on function public.comb_registrar_entrada(uuid,date,numeric,text,text,text,text) to anon,authenticated;

commit;
