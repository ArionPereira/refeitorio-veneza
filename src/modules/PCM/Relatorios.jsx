import React from "react";
const { useState } = React;
import { C, SH, SERIF } from "../../constants.js";
import { STATUS, TIPOS, PRIORIDADES, CRITICIDADE, statusLabel, tipoLabel, prioLabel, fmtDataHora, fmtDataBR, fmtDuracao, difMs } from "./pcmconst.js";

// CSV pt-BR (Excel): separador ';' + BOM UTF-8
function baixarCSV(nome, linhas) {
  const esc = (v)=>{ const s=String(v==null?"":v); return /[";\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
  const csv = "﻿" + linhas.map(l=>l.map(esc).join(";")).join("\r\n");
  const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download=nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

const inp  = { border:"1px solid "+C.line, borderRadius:8, padding:"7px 9px", fontSize:13, background:C.paper, color:C.ink };
const cell = { padding:"6px 9px", borderBottom:"1px solid "+C.line, fontSize:12.5, whiteSpace:"nowrap" };
const th   = { ...cell, textAlign:"left", fontWeight:700, background:C.sage, position:"sticky", top:0 };
const nomeU = (id, usuarios) => { const u=(usuarios||[]).find(x=>x.id===id); return u?u.nome:""; };
const dia   = (iso) => iso ? String(iso).slice(0,10) : "";
const btnCSV= { background:C.brand, color:"#fff", border:"none", borderRadius:8, padding:"9px 15px", fontSize:13.5, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:7, whiteSpace:"nowrap" };
const Lab = ({t,children}) => <label style={{display:"flex",flexDirection:"column",gap:3,fontSize:11.5,color:C.muted}}>{t}{children}</label>;

// ---------------------------------------------------------------------------
// Relatório: OS por período
// ---------------------------------------------------------------------------
function RelOSPeriodo({ ordens, equipamentos, setores, usuarios }) {
  const [de,setDe]=useState(""), [ate,setAte]=useState("");
  const [fSt,setFSt]=useState(""), [fTp,setFTp]=useState(""), [fPr,setFPr]=useState("");
  const [fEq,setFEq]=useState(""), [fSe,setFSe]=useState(""), [fAb,setFAb]=useState(""), [fEx,setFEx]=useState("");
  const equipMap={}; equipamentos.forEach(e=>equipMap[e.id]=e);

  const lista = ordens.filter(o=>{
    const d = dia(o.aberta_em);
    if (de && d<de) return false;
    if (ate && d>ate) return false;
    if (fSt && o.status!==fSt) return false;
    if (fTp && o.tipo!==fTp) return false;
    if (fPr && (o.prioridade||"media")!==fPr) return false;
    if (fEq && o.equipamento_id!==fEq) return false;
    if (fSe){ const e=equipMap[o.equipamento_id]; if(!e||e.setor_id!==fSe) return false; }
    if (fAb && o.aberta_por_id!==fAb) return false;
    if (fEx && o.executante_id!==fEx) return false;
    return true;
  }).sort((a,b)=> (a.aberta_em<b.aberta_em?1:-1));

  const COLS = ["Nº","Equipamento","Tipo","Prioridade","Status","Aberta","Início","Conclusão","Lead time","Em execução","Máquina parada (min)","Aberta por","Executante"];
  const linha = (o)=>{ const e=equipMap[o.equipamento_id]; return [
    o.numero, e?(e.tag+" - "+e.nome):"", tipoLabel(o.tipo), prioLabel(o.prioridade||"media"), statusLabel(o.status),
    fmtDataHora(o.aberta_em), fmtDataHora(o.iniciada_em), fmtDataHora(o.concluida_em),
    fmtDuracao(difMs(o.aberta_em,o.concluida_em)), fmtDuracao(difMs(o.iniciada_em,o.concluida_em)),
    o.tempo_parada_min!=null?o.tempo_parada_min:"", nomeU(o.aberta_por_id,usuarios)||o.solicitante||"", nomeU(o.executante_id,usuarios)||"" ]; };

  return (<>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginTop:14}}>
      <Lab t="Abertura de"><input type="date" value={de} onChange={e=>setDe(e.target.value)} style={inp}/></Lab>
      <Lab t="até"><input type="date" value={ate} onChange={e=>setAte(e.target.value)} style={inp}/></Lab>
      <Lab t="Status"><select value={fSt} onChange={e=>setFSt(e.target.value)} style={inp}><option value="">todos</option>{STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></Lab>
      <Lab t="Tipo"><select value={fTp} onChange={e=>setFTp(e.target.value)} style={inp}><option value="">todos</option>{TIPOS.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Lab>
      <Lab t="Prioridade"><select value={fPr} onChange={e=>setFPr(e.target.value)} style={inp}><option value="">todas</option>{PRIORIDADES.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></Lab>
      <Lab t="Setor"><select value={fSe} onChange={e=>setFSe(e.target.value)} style={inp}><option value="">todos</option>{setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></Lab>
      <Lab t="Equipamento"><select value={fEq} onChange={e=>setFEq(e.target.value)} style={inp}><option value="">todos</option>{equipamentos.map(e=><option key={e.id} value={e.id}>{e.tag}</option>)}</select></Lab>
      <Lab t="Aberta por"><select value={fAb} onChange={e=>setFAb(e.target.value)} style={inp}><option value="">todos</option>{usuarios.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></Lab>
      <Lab t="Executante"><select value={fEx} onChange={e=>setFEx(e.target.value)} style={inp}><option value="">todos</option>{usuarios.map(u=><option key={u.id} value={u.id}>{u.nome}</option>)}</select></Lab>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",margin:"14px 0 10px"}}>
      <span style={{fontSize:13,color:C.muted}}><b style={{color:C.ink}}>{lista.length}</b> OS no filtro</span>
      <button onClick={()=>baixarCSV("os-por-periodo.csv",[COLS,...lista.map(linha)])} disabled={!lista.length} style={{...btnCSV,marginLeft:"auto",background:lista.length?C.brand:C.line}}><span aria-hidden>⬇</span> Baixar CSV</button>
    </div>
    <div style={{border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,overflow:"auto",maxHeight:520}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
        <thead><tr>{COLS.map(c=><th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>
          {lista.length===0 && <tr><td style={cell} colSpan={COLS.length}><span style={{color:C.muted}}>Nenhuma OS no filtro.</span></td></tr>}
          {lista.map(o=>(<tr key={o.id}>{linha(o).map((v,k)=><td key={k} style={cell}>{v}</td>)}</tr>))}
        </tbody>
      </table>
    </div>
  </>);
}

// ---------------------------------------------------------------------------
// Relatório por equipamento
// ---------------------------------------------------------------------------
function RelEquipamento({ ordens, equipamentos, setores }) {
  const [de,setDe]=useState(""), [ate,setAte]=useState(""), [fSe,setFSe]=useState(""), [fCr,setFCr]=useState("");
  const setorMap={}; setores.forEach(s=>setorMap[s.id]=s);
  const noPeriodo = (o)=>{ const d=dia(o.aberta_em); if(de&&d<de)return false; if(ate&&d>ate)return false; return true; };
  const equipF = equipamentos.filter(e=>{ if(fSe&&e.setor_id!==fSe)return false; if(fCr&&e.criticidade!==fCr)return false; return true; });

  const dados = equipF.map(e=>{
    const os = ordens.filter(o=>o.equipamento_id===e.id && noPeriodo(o));
    const porTipo={}, porStatus={};
    os.forEach(o=>{ porTipo[o.tipo]=(porTipo[o.tipo]||0)+1; porStatus[o.status]=(porStatus[o.status]||0)+1; });
    const ultima = os.slice().sort((a,b)=> a.aberta_em<b.aberta_em?1:-1)[0];
    const parada = os.reduce((s,o)=> s+(Number(o.tempo_parada_min)||0), 0);
    return { e, os, porTipo, porStatus, ultima, parada };
  });
  const resumo = (m)=> Object.keys(m).map(k=>k).filter(k=>m[k]).length;
  const compactTipo   = (m)=> TIPOS.filter(t=>m[t.id]).map(t=>t.label+" "+m[t.id]).join(" · ")||"—";
  const compactStatus = (m)=> STATUS.filter(s=>m[s.id]).map(s=>s.label+" "+m[s.id]).join(" · ")||"—";

  const exportar = () => {
    const COLS = ["Equipamento","TAG","Setor","Criticidade","Total OS", ...TIPOS.map(t=>t.label), ...STATUS.map(s=>s.label), "Última OS","Última (data)","Máquina parada total (min)"];
    const linhas = dados.map(({e,os,porTipo,porStatus,ultima,parada})=>[
      e.nome, e.tag, (setorMap[e.setor_id]?setorMap[e.setor_id].nome:""), e.criticidade, os.length,
      ...TIPOS.map(t=>porTipo[t.id]||0), ...STATUS.map(s=>porStatus[s.id]||0),
      ultima?ultima.numero:"", ultima?fmtDataBR(ultima.aberta_em):"", parada ]);
    baixarCSV("relatorio-por-equipamento.csv",[COLS,...linhas]);
  };

  const COLS = ["Equipamento","Setor","Crit.","Total","Por tipo","Por status","Última OS","Parada total"];
  return (<>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end",marginTop:14}}>
      <Lab t="Abertura de"><input type="date" value={de} onChange={e=>setDe(e.target.value)} style={inp}/></Lab>
      <Lab t="até"><input type="date" value={ate} onChange={e=>setAte(e.target.value)} style={inp}/></Lab>
      <Lab t="Setor"><select value={fSe} onChange={e=>setFSe(e.target.value)} style={inp}><option value="">todos</option>{setores.map(s=><option key={s.id} value={s.id}>{s.nome}</option>)}</select></Lab>
      <Lab t="Criticidade"><select value={fCr} onChange={e=>setFCr(e.target.value)} style={inp}><option value="">todas</option>{CRITICIDADE.map(c=><option key={c.id} value={c.id}>{c.id}</option>)}</select></Lab>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",margin:"14px 0 10px"}}>
      <span style={{fontSize:13,color:C.muted}}><b style={{color:C.ink}}>{dados.length}</b> equipamentos</span>
      <button onClick={exportar} disabled={!dados.length} style={{...btnCSV,marginLeft:"auto",background:dados.length?C.brand:C.line}}><span aria-hidden>⬇</span> Baixar CSV</button>
    </div>
    <div style={{border:"1px solid "+C.line,borderRadius:12,boxShadow:SH,overflow:"auto",maxHeight:520}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:760}}>
        <thead><tr>{COLS.map(c=><th key={c} style={th}>{c}</th>)}</tr></thead>
        <tbody>
          {dados.length===0 && <tr><td style={cell} colSpan={COLS.length}><span style={{color:C.muted}}>Nenhum equipamento.</span></td></tr>}
          {dados.map(({e,os,porTipo,porStatus,ultima,parada})=>(
            <tr key={e.id}>
              <td style={cell}><b>{e.tag}</b> · {e.nome}</td>
              <td style={cell}>{setorMap[e.setor_id]?setorMap[e.setor_id].nome:"—"}</td>
              <td style={cell}>{e.criticidade}</td>
              <td style={cell}>{os.length}</td>
              <td style={{...cell,whiteSpace:"normal"}}>{compactTipo(porTipo)}</td>
              <td style={{...cell,whiteSpace:"normal"}}>{compactStatus(porStatus)}</td>
              <td style={cell}>{ultima?ultima.numero+" ("+fmtDataBR(ultima.aberta_em)+")":"—"}</td>
              <td style={cell}>{parada} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>);
}

// ---------------------------------------------------------------------------
// Relatorios (exportado)
// ---------------------------------------------------------------------------
export function Relatorios({ ordens, equipamentos, setores, usuarios }) {
  const [aba,setAba]=useState("periodo");
  const tab = (id,label)=>(
    <button key={id} onClick={()=>setAba(id)}
      style={{border:"1px solid "+C.line,cursor:"pointer",fontSize:13,fontWeight:aba===id?700:500,padding:"8px 14px",borderRadius:8,background:aba===id?C.card:"transparent",color:aba===id?C.brand:C.muted}}>{label}</button>
  );
  return (<>
    <div style={{display:"flex",gap:6,marginTop:14}}>{tab("periodo","OS por período")}{tab("equip","Por equipamento")}</div>
    {aba==="periodo"
      ? <RelOSPeriodo ordens={ordens} equipamentos={equipamentos} setores={setores} usuarios={usuarios}/>
      : <RelEquipamento ordens={ordens} equipamentos={equipamentos} setores={setores}/>}
  </>);
}
