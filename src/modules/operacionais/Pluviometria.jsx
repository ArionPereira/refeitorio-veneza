import React from "react";
const { useState } = React;
import { C } from "../../constants.js";
import { Stat } from "../../ui.jsx";
import { S, hoje, num, inserir, csv, Campo, Tabela, Form, Erro, Titulo, useDados, Shell } from "./Common.jsx";

const TABELAS=["pluv_pontos","pluv_leituras"];

export function Pluviometria({onSair,nome}) {
  const [tab,setTab]=useState("leituras");
  const {dados,loading,erro,recarregar,setErro}=useDados(TABELAS,"pluv");
  const pontos=dados.pluv_pontos||[], leituras=dados.pluv_leituras||[];
  const pontoPorId=Object.fromEntries(pontos.map(x=>[x.id,x]));

  const salvarPonto=async(f,el)=>{try{
    await inserir("pluv_pontos",{nome:f.get("nome").trim(),codigo:f.get("codigo").trim()||null,localizacao:f.get("localizacao").trim()||null,latitude:f.get("latitude")||null,longitude:f.get("longitude")||null,ativo:true});
    el.reset(); await recarregar();
  }catch(e){setErro(e.message)}};
  const salvarLeitura=async(f,el)=>{try{
    await inserir("pluv_leituras",{ponto_id:f.get("ponto_id"),data:f.get("data"),hora:f.get("hora")||"07:00",precipitacao_mm:Number(f.get("precipitacao_mm")),responsavel:nome||null,observacao:f.get("observacao").trim()||null});
    el.reset(); await recarregar();
  }catch(e){setErro(e.message)}};

  const total=leituras.reduce((s,x)=>s+Number(x.precipitacao_mm||0),0);
  const maior=leituras.reduce((m,x)=>Math.max(m,Number(x.precipitacao_mm||0)),0);
  const porPonto=pontos.map(p=>({id:p.id,nome:p.nome,total:leituras.filter(l=>l.ponto_id===p.id).reduce((s,l)=>s+Number(l.precipitacao_mm||0),0),medicoes:leituras.filter(l=>l.ponto_id===p.id).length}));

  return <Shell titulo="Pluviometria" eyebrow="Sementes Veneza · Medição pluviométrica"
    tabs={[["leituras","Medições"],["pontos","Pontos"],["relatorios","Relatórios"]]} tab={tab} setTab={setTab} onSair={onSair} loading={loading}>
    <Erro msg={erro}/>
    {tab==="leituras"&&<><Titulo>Nova medição</Titulo>
      <Form onSubmit={salvarLeitura}>
        <Campo label="Ponto"><select name="ponto_id" required style={S.input}><option value="">Selecione</option>{pontos.filter(x=>x.ativo).map(x=><option key={x.id} value={x.id}>{x.codigo?x.codigo+" · ":""}{x.nome}</option>)}</select></Campo>
        <Campo label="Data"><input name="data" type="date" required defaultValue={hoje()} style={S.input}/></Campo>
        <Campo label="Hora"><input name="hora" type="time" required defaultValue="07:00" style={S.input}/></Campo>
        <Campo label="Precipitação (mm)"><input name="precipitacao_mm" type="number" min="0" step=".01" required style={S.input}/></Campo>
        <Campo label="Observação" wide><input name="observacao" style={S.input}/></Campo>
      </Form>
      <Titulo>Histórico de medições</Titulo>
      <Tabela rows={leituras} cols={[["data","Data"],["hora","Hora",x=>(x.hora||"").slice(0,5)],["ponto","Ponto",x=>pontoPorId[x.ponto_id]?.nome||"—"],["precipitacao_mm","Chuva",x=><b>{num(x.precipitacao_mm)} mm</b>],["responsavel","Responsável"],["observacao","Observação"]]}/>
    </>}
    {tab==="pontos"&&<><Titulo>Novo ponto pluviométrico</Titulo>
      <Form onSubmit={salvarPonto}>
        <Campo label="Código"><input name="codigo" placeholder="Ex.: P01" style={S.input}/></Campo>
        <Campo label="Nome"><input name="nome" required style={S.input}/></Campo>
        <Campo label="Localização" wide><input name="localizacao" style={S.input}/></Campo>
        <Campo label="Latitude"><input name="latitude" type="number" min="-90" max="90" step="any" style={S.input}/></Campo>
        <Campo label="Longitude"><input name="longitude" type="number" min="-180" max="180" step="any" style={S.input}/></Campo>
      </Form>
      <Titulo>Pontos cadastrados</Titulo>
      <Tabela rows={pontos} cols={[["codigo","Código"],["nome","Nome"],["localizacao","Localização"],["latitude","Latitude"],["longitude","Longitude"],["ativo","Status",x=>x.ativo?"Ativo":"Inativo"]]}/>
    </>}
    {tab==="relatorios"&&<><div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
      <Stat rotulo="Chuva acumulada" valor={num(total)+" mm"}/><Stat rotulo="Maior medição" valor={num(maior)+" mm"}/><Stat rotulo="Medições" valor={leituras.length}/><Stat rotulo="Pontos ativos" valor={pontos.filter(x=>x.ativo).length}/>
      </div>
      <Titulo>Acumulado por ponto</Titulo>
      <Tabela rows={porPonto} cols={[["nome","Ponto"],["medicoes","Medições"],["total","Acumulado",x=>num(x.total)+" mm"]]}/>
      <Titulo>Exportação</Titulo>
      <button style={S.btn} onClick={()=>csv("pluviometria.csv",[["Data","Hora","Ponto","Precipitação (mm)","Responsável","Observação"],...leituras.map(x=>[x.data,x.hora,pontoPorId[x.ponto_id]?.nome,x.precipitacao_mm,x.responsavel,x.observacao])])}>Baixar CSV</button>
    </>}
  </Shell>;
}
