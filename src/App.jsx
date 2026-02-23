import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const FONT_URL = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap";
const LOCAL_SK = "cashflow_sim_v2";
const MX = 15;
const money = x => `$${Math.round(Math.abs(x)).toLocaleString("en-US")}`;
const signedMoney = x => x < 0 ? `-${money(x)}` : money(x);
const pF = x => `${x.toFixed(2)}%`;
const uid = () => Math.random().toString(36).slice(2, 9);
const sm = arr => (arr||[]).reduce((s,i) => s + (i.amount||0), 0);
function fPI(loan,r,y){if(loan<=0)return 0;const n=y*12,rt=r/100/12;if(rt===0)return loan/n;return loan*(rt*Math.pow(1+rt,n))/(Math.pow(1+rt,n)-1);}
function ioP(loan,r){if(loan<=0)return 0;return loan*(r/100/12);}
const CATS=[{key:"kids",label:"Kids",icon:"👶"},{key:"living",label:"Living",icon:"🏠"},{key:"insurance",label:"Insurance",icon:"🛡️"},{key:"transport",label:"Transport",icon:"🚗"},{key:"subscriptions",label:"Subscriptions",icon:"📱"},{key:"debt",label:"Debt Payments",icon:"💳"},{key:"savings",label:"Savings & Investments",icon:"📈"},{key:"pets",label:"Pets",icon:"🐾"},{key:"other",label:"Other",icon:"📋"}];
const eE=()=>Object.fromEntries(CATS.map(c=>[c.key,[]]));
function gD(){return{homePrice:0,downPayment:0,mortgageType:"30fixed",rate:0,hoa:0,pmi:0,taxMode:"dollar",annualTax:0,taxRatePct:0,annualInsurance:0,addons:[],oldMortgage:0,stateTaxSavings:0,ficaMode:"dollar",ficaDollar:0,ficaPct:6.2,ficaBaseSalary:0,carPayoffs:[],otherOffsets:[],monthlyIncome:0,expenses:eE()};}
function cFS(s){
  const loan=Math.max(0,(s.homePrice||0)-(s.downPayment||0));
  const eT=s.taxMode==="dollar"?(s.annualTax||0):(s.homePrice||0)*((s.taxRatePct||0)/100);
  const mT=eT/12,mI=(s.annualInsurance||0)/12,aT=sm(s.addons);
  const pi=s.mortgageType==="30fixed"?fPI(loan,s.rate||0,30):ioP(loan,s.rate||0);
  const pIO=s.mortgageType!=="30fixed"?fPI(loan,s.rate||0,23):null;
  const nH=pi+mT+mI+(s.hoa||0)+(s.pmi||0)+aT;
  const fO=s.ficaMode==="dollar"?(s.ficaDollar||0):((s.ficaPct||0)/100)*(s.ficaBaseSalary||0)/12;
  const cO=sm(s.carPayoffs),oO=sm(s.otherOffsets);
  const tO=(s.oldMortgage||0)+(s.stateTaxSavings||0)+fO+cO+oO;
  const d=nH-tO;
  const eBC=CATS.map(c=>({...c,total:sm((s.expenses||{})[c.key]||[])}));
  const tOn=eBC.reduce((a,c)=>a+c.total,0);
  const cTO=(s.oldMortgage||0)+tOn+(s.stateTaxSavings||0);
  const cCF=(s.monthlyIncome||0)-cTO;
  const nTO=nH+tOn,nCF=(s.monthlyIncome||0)-nTO;
  return{loan,effTax:eT,mTax:mT,mIns:mI,addonT:aT,pi,postIO:pIO,newHousing:nH,ficaOff:fO,carOffT:cO,otherOffT:oO,totalOff:tO,delta:d,expByCat:eBC,totalOngoing:tOn,currentTotalOut:cTO,currentCashflow:cCF,newTotalOut:nTO,newCashflow:nCF,monthlyIncome:s.monthlyIncome||0,oldMortgage:s.oldMortgage||0,stateTaxSavings:s.stateTaxSavings||0,homePrice:s.homePrice||0,downPayment:s.downPayment||0,rate:s.rate||0,mortgageType:s.mortgageType||"30fixed",hoa:s.hoa||0,pmi:s.pmi||0,
  newBreakdown:[{label:s.mortgageType==="30fixed"?"P&I (30yr)":"IO (7/1)",amount:pi},{label:"Property Tax",amount:mT},{label:"Insurance",amount:mI},{label:"HOA",amount:s.hoa||0},{label:"PMI",amount:s.pmi||0},{label:"Add-ons",amount:aT}],
  offBreakdown:[{label:"Old Mortgage",amount:s.oldMortgage||0},{label:"State Tax Savings",amount:s.stateTaxSavings||0},{label:"FICA Savings",amount:fO},{label:"Car Payoffs",amount:cO},{label:"Other Offsets",amount:oO}]};
}
function eqHP(tD,sB){let lo=0,hi=5e7;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(cFS({...sB,homePrice:m}).delta<tD)lo=m;else hi=m;}return Math.round((lo+hi)/2);}

/* ── Storage: local fallback + cloud when authenticated ── */
function loadLocal(){try{const r=localStorage.getItem(LOCAL_SK);return r?JSON.parse(r):[];}catch{return[];}}
function saveLocal(l){try{localStorage.setItem(LOCAL_SK,JSON.stringify(l));}catch{}}

async function loadCloud(){
  try{const r=await fetch("/api/scenarios");if(!r.ok)return null;const data=await r.json();return Array.isArray(data)&&data.length>0?data[0].scenarios:[];}catch{return null;}
}
async function saveCloud(scenarios){
  try{await fetch("/api/scenarios",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenarios})});}catch(e){console.error("Cloud save failed",e);}
}

function xls(scs){if(!scs.length)return;const h=["Scenario","Home Price","Down Payment","Loan","Rate %","Type","P&I/mo","Tax/mo","Ins/mo","HOA","PMI","Add-ons","Housing Total","Old Mortgage","State Tax Sav","FICA Sav","Car Payoffs","Other Off","Total Off","Delta","Income","Ongoing Exp","New Outflows","New CF","Cur Outflows","Cur CF"];const rows=scs.map(sc=>{const c=cFS(sc.state);return[sc.name,sc.state.homePrice,sc.state.downPayment,c.loan,sc.state.rate,sc.state.mortgageType==="30fixed"?"30yr":"IO",Math.round(c.pi),Math.round(c.mTax),Math.round(c.mIns),sc.state.hoa,sc.state.pmi,Math.round(c.addonT),Math.round(c.newHousing),sc.state.oldMortgage,sc.state.stateTaxSavings,Math.round(c.ficaOff),Math.round(c.carOffT),Math.round(c.otherOffT),Math.round(c.totalOff),Math.round(c.delta),sc.state.monthlyIncome,Math.round(c.totalOngoing),Math.round(c.newTotalOut),Math.round(c.newCashflow),Math.round(c.currentTotalOut),Math.round(c.currentCashflow)];});const csv=[h,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");const b=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="cashflow_scenarios.csv";a.click();}
function fC(n){if(n===0)return"0";const p=String(n).split(".");p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");return p.join(".");}
function sC(s){return s.replace(/,/g,"");}
function NumInput({value,onChange,style:sx}){
  const[d,setD]=useState(fC(value));const[f,setF]=useState(false);const ref=useRef(null);
  useEffect(()=>{if(!f)setD(fC(value));},[value,f]);
  return<input ref={ref} type="text" inputMode="decimal" value={d} onChange={e=>{if(/^-?[\d.,]*$/.test(e.target.value))setD(e.target.value);}} onFocus={()=>{setF(true);if(value===0)setD("");else setD(sC(d));setTimeout(()=>ref.current?.select(),0);}} onBlur={()=>{setF(false);const p=parseFloat(sC(d));if(isNaN(p)||d.trim()===""){onChange(0);setD("0");}else{onChange(p);setD(fC(p));}}} style={{background:"transparent",border:"none",outline:"none",color:"#e8eaed",fontSize:14,fontFamily:"'DM Sans',sans-serif",padding:"0 10px",width:"100%",height:"100%",...sx}}/>;
}
function Field({label,value,onChange,prefix,suffix,hint,small}){
  return<div style={{display:"flex",flexDirection:"column",gap:4,flex:small?"0 0 auto":1}}><label style={{fontSize:11,fontWeight:500,color:"#8a8f98",letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</label><div style={{display:"flex",alignItems:"center",background:"#1a1d24",borderRadius:8,border:"1px solid #2a2e37",overflow:"hidden",height:40}}>{prefix&&<span style={{padding:"0 0 0 10px",color:"#5a5f6a",fontSize:14}}>{prefix}</span>}<NumInput value={value} onChange={onChange}/>{suffix&&<span style={{padding:"0 10px 0 0",color:"#5a5f6a",fontSize:13,whiteSpace:"nowrap"}}>{suffix}</span>}</div>{hint&&<span style={{fontSize:11,color:"#555a63"}}>{hint}</span>}</div>;
}
function Toggle({options,value,onChange}){return<div style={{display:"flex",width:"100%",background:"#1a1d24",borderRadius:8,border:"1px solid #2a2e37",overflow:"hidden"}}>{options.map(o=><button key={o.value} onClick={()=>onChange(o.value)} style={{flex:1,padding:"7px 14px",fontSize:12,fontWeight:500,fontFamily:"'DM Sans'",border:"none",cursor:"pointer",transition:"all .2s",background:value===o.value?"#2c6fef":"transparent",color:value===o.value?"#fff":"#8a8f98"}}>{o.label}</button>)}</div>;}
function DynList({items,setItems,defaultName,addLabel}){const add=()=>setItems([...items,{id:uid(),name:defaultName,amount:0}]);const rm=id=>setItems(items.filter(i=>i.id!==id));const up=(id,k,v)=>setItems(items.map(i=>i.id===id?{...i,[k]:v}:i));return<div style={{display:"flex",flexDirection:"column",gap:6}}>{items.map(item=><div key={item.id} style={{display:"flex",gap:6,alignItems:"center"}}><input value={item.name} onChange={e=>up(item.id,"name",e.target.value)} onFocus={e=>{if(item.name===defaultName)e.target.select();}} style={{flex:1,background:"#1a1d24",border:"1px solid #2a2e37",borderRadius:8,color:"#e8eaed",fontSize:13,fontFamily:"'DM Sans'",padding:"8px 10px",outline:"none"}}/><div style={{display:"flex",alignItems:"center",background:"#1a1d24",borderRadius:8,border:"1px solid #2a2e37",overflow:"hidden",width:120,height:38}}><span style={{padding:"0 0 0 8px",color:"#5a5f6a",fontSize:13}}>$</span><NumInput value={item.amount} onChange={v=>up(item.id,"amount",v)} style={{fontSize:13,padding:"0 8px"}}/></div><button onClick={()=>rm(item.id)} style={{background:"none",border:"none",color:"#555a63",cursor:"pointer",fontSize:18,lineHeight:1,padding:4}} onMouseEnter={e=>e.target.style.color="#ef4444"} onMouseLeave={e=>e.target.style.color="#555a63"}>×</button></div>)}<button onClick={add} style={{background:"none",border:"1px dashed #2a2e37",borderRadius:8,color:"#5a7fcc",fontSize:12,fontFamily:"'DM Sans'",padding:"7px 0",cursor:"pointer",marginTop:2}} onMouseEnter={e=>{e.target.style.borderColor="#5a7fcc";e.target.style.background="#1a1d2488";}} onMouseLeave={e=>{e.target.style.borderColor="#2a2e37";e.target.style.background="none";}}>+ {addLabel}</button></div>;}
function Sec({title,children,open:dO=true,badge}){const[open,setOpen]=useState(dO);return<div style={{borderBottom:"1px solid #1e2128"}}><button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",color:"#c0c4cc",cursor:"pointer",padding:"14px 0",fontSize:13,fontWeight:600,fontFamily:"'DM Sans'",letterSpacing:"0.03em",textTransform:"uppercase"}}><span style={{display:"flex",alignItems:"center",gap:8}}>{title}{badge>0&&<span style={{fontSize:11,fontWeight:500,color:"#8a8f98",background:"#1a1d24",padding:"2px 7px",borderRadius:10,textTransform:"none",letterSpacing:0}}>{money(badge)}/mo</span>}</span><span style={{fontSize:11,color:"#555a63",transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .2s"}}>▼</span></button>{open&&<div style={{paddingBottom:16,display:"flex",flexDirection:"column",gap:12}}>{children}</div>}</div>;}
function KPI({label,value,sub,accent}){return<div style={{flex:1,background:"#13151a",borderRadius:12,border:"1px solid #1e2128",padding:"18px 20px",display:"flex",flexDirection:"column",gap:5,minWidth:160}}><span style={{fontSize:10,fontWeight:500,color:"#6b7080",letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}</span><span style={{fontSize:26,fontWeight:700,fontFamily:"'Instrument Serif',serif",color:accent||"#e8eaed",letterSpacing:"-0.02em",lineHeight:1.1}}>{value}</span>{sub&&<span style={{fontSize:11,color:"#555a63"}}>{sub}</span>}</div>;}
function Row({label,amount,highlight,green,red}){const col=highlight?"#e8eaed":green?"#3dd68c":red?"#ef6b4a":"#c0c4cc";return<div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1a1d24"}}><span style={{fontSize:13,color:highlight?"#e8eaed":"#9a9faa",fontWeight:highlight?600:400}}>{label}</span><span style={{fontSize:14,fontFamily:"'DM Sans'",fontWeight:highlight?700:500,color:col,fontVariantNumeric:"tabular-nums"}}>{green&&amount>0?`-${money(amount)}`:signedMoney(amount)}</span></div>;}
function Bar({items,total}){const colors=["#2c6fef","#5b93f5","#3dd68c","#f5c542","#ef6b4a","#a78bfa","#f472b6","#64748b","#ec4899"];const t=Math.abs(total)||1;return<div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",borderRadius:6,overflow:"hidden",height:8,background:"#1a1d24"}}>{items.filter(i=>i.amount>0).map((item,idx)=><div key={idx} style={{width:`${(item.amount/t)*100}%`,background:colors[idx%colors.length],transition:"width .4s ease",minWidth:2}} title={`${item.label}: ${money(item.amount)}`}/>)}</div><div style={{display:"flex",flexWrap:"wrap",gap:"3px 12px"}}>{items.filter(i=>i.amount>0).map((item,idx)=><span key={idx} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#8a8f98"}}><span style={{width:7,height:7,borderRadius:"50%",background:colors[idx%colors.length],display:"inline-block"}}/>{item.label}</span>)}</div></div>;}
function ScenarioMgr({state,onLoad,onReset,scenarios,setScenarios,onSave}){
  const[name,setName]=useState("");const[showSave,setShowSave]=useState(false);const[toast,setToast]=useState(null);
  const flash=(msg,color)=>{setToast({msg,color});setTimeout(()=>setToast(null),2500);};
  const save=(oN)=>{const n=(oN||name).trim();if(!n)return;const rest=scenarios.filter(s=>s.name!==n);if(!scenarios.find(s=>s.name===n)&&rest.length>=MX){flash(`Max ${MX}.`,"#ef4444");return;}const upd=[...rest,{name:n,state:JSON.parse(JSON.stringify(state)),savedAt:Date.now()}];setScenarios(upd);onSave(upd);if(!oN){setName("");setShowSave(false);}flash(`"${n}" saved`,"#3dd68c");};
  const del=n=>{const upd=scenarios.filter(s=>s.name!==n);setScenarios(upd);onSave(upd);flash(`"${n}" deleted`,"#8a8f98");};
  const btn={border:"none",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:11,fontWeight:500,borderRadius:6,padding:"6px 12px"};
  return<div style={{padding:"12px 0",borderBottom:"1px solid #1e2128"}}>
    {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"#1a1d24",border:`1px solid ${toast.color}44`,color:toast.color,padding:"8px 20px",borderRadius:8,fontSize:13,fontFamily:"'DM Sans'",zIndex:9999,boxShadow:"0 4px 20px #00000066"}}>{toast.msg}</div>}
    <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}><button onClick={()=>setShowSave(!showSave)} style={{...btn,background:"#2c6fef22",color:"#5b93f5"}}>💾 Save New</button><button onClick={onReset} style={{...btn,background:"#ef444418",color:"#ef6b4a"}}>↺ Clear</button></div>
    {showSave&&<div style={{display:"flex",gap:6,marginBottom:8}}><input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="e.g. Beach House $1.6M" maxLength={30} autoFocus style={{flex:1,background:"#1a1d24",border:"1px solid #2a2e37",borderRadius:8,color:"#e8eaed",fontSize:12,fontFamily:"'DM Sans'",padding:"6px 10px",outline:"none"}}/><button onClick={()=>save()} style={{...btn,background:"#2c6fef",color:"#fff"}}>Save</button></div>}
    {scenarios.length>0&&<div style={{display:"flex",flexDirection:"column",gap:3,maxHeight:220,overflowY:"auto"}}><span style={{fontSize:10,color:"#555a63",textTransform:"uppercase",letterSpacing:"0.05em"}}>Saved ({scenarios.length}/{MX})</span>
      {scenarios.map(s=><div key={s.name} style={{display:"flex",alignItems:"center",gap:4,background:"#1a1d24",borderRadius:6,padding:"5px 8px"}}>
        <button onClick={()=>{onLoad(s.state);flash(`"${s.name}" loaded`,"#2c6fef");}} style={{background:"none",border:"none",color:"#c0c4cc",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans'",textAlign:"left",flex:1,padding:0}} title="Load">{s.name}</button>
        <button onClick={()=>save(s.name)} style={{...btn,background:"#2c6fef18",color:"#5b93f5",padding:"3px 8px",fontSize:10}} title="Overwrite">↻</button>
        <button onClick={()=>del(s.name)} style={{background:"none",border:"none",color:"#555a63",cursor:"pointer",fontSize:15,padding:"0 2px"}} onMouseEnter={e=>e.target.style.color="#ef4444"} onMouseLeave={e=>e.target.style.color="#555a63"}>×</button>
      </div>)}</div>}
  </div>;
}
function CompareView({scenarios}){
  const[sel,setSel]=useState({});const[detail,setDetail]=useState(null);
  const ranked=useMemo(()=>scenarios.map(sc=>({...sc,calc:cFS(sc.state)})).sort((a,b)=>a.calc.delta-b.calc.delta),[scenarios]);
  const toggle=n=>setSel(p=>({...p,[n]:!p[n]}));
  const doExport=()=>{const e=ranked.filter(r=>sel[r.name]);if(!e.length){alert("Select scenarios first");return;}xls(e);};
  const cf=v=>v>0?"#3dd68c":v<0?"#ef4444":"#8a8f98";
  if(!scenarios.length)return<div style={{padding:40,textAlign:"center",color:"#555a63"}}>Save at least one scenario to compare.</div>;
  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
      <span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>Ranked by Delta <span style={{fontSize:11,color:"#555a63"}}>(best → worst)</span></span>
      <button onClick={doExport} style={{border:"none",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:11,fontWeight:500,borderRadius:6,padding:"6px 14px",background:"#3dd68c22",color:"#3dd68c"}}>📊 Export CSV</button>
    </div>
    <div style={{overflowX:"auto",marginBottom:24}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:"'DM Sans'"}}><thead><tr style={{borderBottom:"2px solid #2a2e37"}}>
      {["","#","Scenario","Home Price","Housing","Offsets","Delta",""].map((h,i)=><th key={i} style={{padding:"8px 6px",textAlign:i>=3&&i<=6?"right":i===7?"center":"left",color:"#6b7080",fontWeight:600,fontSize:10,textTransform:"uppercase"}}>{h}</th>)}
    </tr></thead><tbody>{ranked.map((r,idx)=><tr key={r.name} style={{borderBottom:"1px solid #1a1d24",background:detail===r.name?"#1a1d24":"transparent"}}>
      <td style={{padding:"8px 6px"}}><input type="checkbox" checked={!!sel[r.name]} onChange={()=>toggle(r.name)} style={{accentColor:"#2c6fef"}}/></td>
      <td style={{padding:"8px 6px",color:"#555a63"}}>#{idx+1}</td>
      <td style={{padding:"8px 6px",color:"#e8eaed",fontWeight:500}}>{r.name}</td>
      <td style={{padding:"8px 6px",textAlign:"right",color:"#c0c4cc"}}>{money(r.calc.homePrice)}</td>
      <td style={{padding:"8px 6px",textAlign:"right",color:"#c0c4cc"}}>{money(r.calc.newHousing)}</td>
      <td style={{padding:"8px 6px",textAlign:"right",color:"#3dd68c"}}>-{money(r.calc.totalOff)}</td>
      <td style={{padding:"8px 6px",textAlign:"right",fontWeight:700,color:cf(-r.calc.delta)}}>{signedMoney(r.calc.delta)}</td>
      <td style={{padding:"8px 6px",textAlign:"center"}}><button onClick={()=>setDetail(detail===r.name?null:r.name)} style={{background:"none",border:"none",color:"#5b93f5",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans'"}}>{detail===r.name?"hide":"view"}</button></td>
    </tr>)}</tbody></table></div>
    {detail&&(()=>{const sc=ranked.find(r=>r.name===detail);if(!sc)return null;const c=sc.calc;return<div style={{background:"#13151a",borderRadius:12,border:"1px solid #1e2128",padding:20,marginBottom:24}}>
      <div style={{fontSize:15,fontWeight:600,color:"#e8eaed",marginBottom:16}}>{sc.name}</div>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:220}}><div style={{fontSize:12,fontWeight:600,color:"#6b7080",textTransform:"uppercase",marginBottom:8}}>New Costs</div>{c.newBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount}/>)}<Row label="Total" amount={c.newHousing} highlight/></div>
        <div style={{flex:1,minWidth:220}}><div style={{fontSize:12,fontWeight:600,color:"#6b7080",textTransform:"uppercase",marginBottom:8}}>Offsets</div>{c.offBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount} green/>)}<Row label="Total" amount={c.totalOff} highlight/></div>
        <div style={{flex:1,minWidth:220}}><div style={{fontSize:12,fontWeight:600,color:"#6b7080",textTransform:"uppercase",marginBottom:8}}>Summary</div><Row label="Home" amount={c.homePrice}/><Row label="Loan" amount={c.loan}/><div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1a1d24"}}><span style={{fontSize:13,color:"#9a9faa"}}>Rate</span><span style={{fontSize:14,color:"#c0c4cc"}}>{pF(c.rate)}</span></div><Row label="Delta" amount={c.delta} highlight/></div>
      </div></div>;})()}
  </div>;
}
function EquivView({scenarios}){
  const calcs=useMemo(()=>scenarios.map(sc=>({...sc,calc:cFS(sc.state)})),[scenarios]);
  if(scenarios.length<2)return<div style={{padding:40,textAlign:"center",color:"#555a63"}}>Save 2+ scenarios for equivalencies.</div>;
  const mx=calcs.map(a=>calcs.map(b=>{if(a.name===b.name)return null;return eqHP(a.calc.delta,b.state);}));
  return<div><div style={{marginBottom:12}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>Equivalency Matrix</span><div style={{fontSize:12,color:"#6b7080",marginTop:4}}>Cell = home price Column needs to match Row's delta.</div></div>
    <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",fontSize:12,fontFamily:"'DM Sans'"}}><thead><tr>
      <th style={{padding:"8px 10px",textAlign:"left",color:"#6b7080",fontSize:10,textTransform:"uppercase",fontWeight:600,borderBottom:"2px solid #2a2e37",position:"sticky",left:0,background:"#0d0f13",zIndex:1}}>Match ↓ via →</th>
      {calcs.map(c=><th key={c.name} style={{padding:"8px 10px",textAlign:"right",color:"#8a8f98",fontSize:11,fontWeight:600,borderBottom:"2px solid #2a2e37",whiteSpace:"nowrap"}}>{c.name}<div style={{fontSize:10,color:"#555a63",fontWeight:400}}>{money(c.state.homePrice)}</div></th>)}
    </tr></thead><tbody>{calcs.map((a,i)=><tr key={a.name} style={{borderBottom:"1px solid #1a1d24"}}>
      <td style={{padding:"8px 10px",color:"#e8eaed",fontWeight:500,whiteSpace:"nowrap",position:"sticky",left:0,background:"#0d0f13",zIndex:1}}>{a.name}<div style={{fontSize:10,color:"#555a63"}}>Δ {signedMoney(a.calc.delta)}/mo</div></td>
      {calcs.map((b,j)=><td key={b.name} style={{padding:"8px 10px",textAlign:"right",color:mx[i][j]===null?"#2a2e37":"#c0c4cc",background:mx[i][j]===null?"transparent":mx[i][j]>b.state.homePrice?"#ef444412":"#3dd68c12"}}>{mx[i][j]===null?"—":money(mx[i][j])}{mx[i][j]!==null&&<div style={{fontSize:10,color:mx[i][j]>b.state.homePrice?"#ef6b4a":"#3dd68c"}}>{mx[i][j]>b.state.homePrice?"+":""}{signedMoney(mx[i][j]-b.state.homePrice)}</div>}</td>)}
    </tr>)}</tbody></table></div></div>;
}
export default function App(){
  const { instance, accounts } = useMsal();
  const isAuth = useIsAuthenticated();
  const user = accounts[0];
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  const[homePrice,setHomePrice]=useState(0);const[downPayment,setDownPayment]=useState(0);const[mortgageType,setMortgageType]=useState("30fixed");const[rate,setRate]=useState(0);const[hoa,setHoa]=useState(0);const[pmi,setPmi]=useState(0);const[taxMode,setTaxMode]=useState("dollar");const[annualTax,setAnnualTax]=useState(0);const[taxRatePct,setTaxRatePct]=useState(0);const[annualInsurance,setAnnualInsurance]=useState(0);const[addons,setAddons]=useState([]);
  const[oldMortgage,setOldMortgage]=useState(0);const[stateTaxSavings,setStateTaxSavings]=useState(0);const[ficaMode,setFicaMode]=useState("dollar");const[ficaDollar,setFicaDollar]=useState(0);const[ficaPct,setFicaPct]=useState(6.2);const[ficaBaseSalary,setFicaBaseSalary]=useState(0);const[carPayoffs,setCarPayoffs]=useState([]);const[otherOffsets,setOtherOffsets]=useState([]);
  const[monthlyIncome,setMonthlyIncome]=useState(0);const[expenses,setExpenses]=useState(eE);const[sideTab,setSideTab]=useState("mortgage");const[view,setView]=useState("delta");
  const[scenarios,setScenarios]=useState(loadLocal);

  // Load from cloud on login
  useEffect(()=>{
    if(isAuth){
      setSyncing(true);setSyncStatus("Loading from cloud...");
      loadCloud().then(cloud=>{
        if(cloud&&cloud.length>0){setScenarios(cloud);saveLocal(cloud);setSyncStatus("Synced ✓");}
        else{setSyncStatus("No cloud data — using local");}
        setSyncing(false);setTimeout(()=>setSyncStatus(""),3000);
      }).catch(()=>{setSyncing(false);setSyncStatus("Cloud unavailable");setTimeout(()=>setSyncStatus(""),3000);});
    }
  },[isAuth]);

  const persistScenarios = useCallback((list)=>{
    saveLocal(list);
    if(isAuth){saveCloud(list).then(()=>{setSyncStatus("Saved ✓");setTimeout(()=>setSyncStatus(""),2000);});}
  },[isAuth]);

  const login = async()=>{try{await instance.loginPopup({scopes:["openid","profile","email"]});}catch(e){console.error(e);}};
  const logout = ()=>{instance.logoutPopup();};

  const getState=()=>({homePrice,downPayment,mortgageType,rate,hoa,pmi,taxMode,annualTax,taxRatePct,annualInsurance,addons,oldMortgage,stateTaxSavings,ficaMode,ficaDollar,ficaPct,ficaBaseSalary,carPayoffs,otherOffsets,monthlyIncome,expenses});
  const loadState=s=>{setHomePrice(s.homePrice??0);setDownPayment(s.downPayment??0);setMortgageType(s.mortgageType??"30fixed");setRate(s.rate??0);setHoa(s.hoa??0);setPmi(s.pmi??0);setTaxMode(s.taxMode??"dollar");setAnnualTax(s.annualTax??0);setTaxRatePct(s.taxRatePct??0);setAnnualInsurance(s.annualInsurance??0);setAddons(s.addons??[]);setOldMortgage(s.oldMortgage??0);setStateTaxSavings(s.stateTaxSavings??0);setFicaMode(s.ficaMode??"dollar");setFicaDollar(s.ficaDollar??0);setFicaPct(s.ficaPct??6.2);setFicaBaseSalary(s.ficaBaseSalary??0);setCarPayoffs(s.carPayoffs??[]);setOtherOffsets(s.otherOffsets??[]);setMonthlyIncome(s.monthlyIncome??0);setExpenses(s.expenses??eE());};
  const resetAll=()=>loadState(gD());const setExpCat=(k,items)=>setExpenses(p=>({...p,[k]:items}));
  const calc=useMemo(()=>cFS(getState()),[homePrice,downPayment,mortgageType,rate,hoa,pmi,taxMode,annualTax,taxRatePct,annualInsurance,addons,oldMortgage,stateTaxSavings,ficaMode,ficaDollar,ficaPct,ficaBaseSalary,carPayoffs,otherOffsets,monthlyIncome,expenses]);
  const dC=calc.delta>0?"#ef4444":calc.delta<0?"#3dd68c":"#8a8f98";
  const cfC=v=>v>0?"#3dd68c":v<0?"#ef4444":"#8a8f98";
  const authBtn={border:"none",cursor:"pointer",fontFamily:"'DM Sans'",fontSize:11,fontWeight:500,borderRadius:6,padding:"6px 14px"};

  return<div style={{fontFamily:"'DM Sans',sans-serif",background:"#0d0f13",color:"#e8eaed",minHeight:"100vh"}}>
    <link href={FONT_URL} rel="stylesheet"/>
    <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}input[type=number]{-moz-appearance:textfield}::selection{background:#2c6fef44}@media(max-width:900px){.layout{flex-direction:column!important}.sidebar{width:100%!important;max-height:none!important;position:static!important}.main{padding:20px 16px!important}}table th,table td{font-family:'DM Sans',sans-serif}`}</style>
    <div style={{borderBottom:"1px solid #1a1d24",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <a href={window.location.href} target="_blank" rel="noopener noreferrer" style={{fontSize:20,fontFamily:"'Instrument Serif',serif",color:"#e8eaed",textDecoration:"none"}}>Cashflow Simulator</a>
        {syncStatus&&<span style={{fontSize:10,color:syncStatus.includes("✓")?"#3dd68c":"#8a8f98",fontFamily:"'DM Sans'"}}>{syncStatus}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",background:"#1a1d24",borderRadius:8,border:"1px solid #2a2e37",overflow:"hidden",flexWrap:"wrap"}}>
          {[{v:"delta",l:"Delta"},{v:"cashflow",l:"Cashflow"},{v:"cv",l:"Cur vs New"},{v:"sc",l:"Compare"},{v:"eq",l:"Equiv"}].map(t=><button key={t.v} onClick={()=>setView(t.v)} style={{padding:"8px 12px",fontSize:10,fontWeight:600,fontFamily:"'DM Sans'",border:"none",cursor:"pointer",transition:"all .2s",letterSpacing:"0.03em",textTransform:"uppercase",background:view===t.v?"#2c6fef":"transparent",color:view===t.v?"#fff":"#8a8f98"}}>{t.l}</button>)}
        </div>
        {isAuth?<div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:11,color:"#8a8f98"}}>{user?.name && user.name !== "unknown" ? user.name : user?.username?.split("_")[0] || user?.idTokenClaims?.email || user?.idTokenClaims?.preferred_username || "Signed in"}</span>
          <button onClick={logout} style={{...authBtn,background:"#ef444418",color:"#ef6b4a"}}>Sign Out</button>
        </div>:<button onClick={login} style={{...authBtn,background:"#2c6fef",color:"#fff"}}>Sign In</button>}
      </div>
    </div>
    <div className="layout" style={{display:"flex",minHeight:"calc(100vh - 57px)"}}>
      <div className="sidebar" style={{width:380,background:"#101218",borderRight:"1px solid #1a1d24",overflowY:"auto",maxHeight:"calc(100vh - 57px)",position:"sticky",top:57,padding:"4px 20px 40px"}}>
        <ScenarioMgr state={getState()} onLoad={loadState} onReset={resetAll} scenarios={scenarios} setScenarios={setScenarios} onSave={persistScenarios}/>
        <div style={{display:"flex",margin:"8px 0",borderBottom:"1px solid #1e2128"}}>
          {[["mortgage","Mortgage"],["offsets","Offsets"],["income","Income"],["expenses","Expenses"]].map(([k,l])=><button key={k} onClick={()=>setSideTab(k)} style={{flex:1,background:"none",border:"none",borderBottom:sideTab===k?"2px solid #2c6fef":"2px solid transparent",color:sideTab===k?"#e8eaed":"#555a63",cursor:"pointer",padding:"10px 0",fontSize:11,fontWeight:600,fontFamily:"'DM Sans'",letterSpacing:"0.04em",textTransform:"uppercase"}}>{l}</button>)}
        </div>
        {sideTab==="mortgage"&&<><Sec title="Purchase Details"><div style={{display:"flex",gap:10}}><Field label="Home Price" prefix="$" value={homePrice} onChange={setHomePrice}/><Field label="Down Payment" prefix="$" value={downPayment} onChange={setDownPayment}/></div><div style={{display:"flex",alignItems:"flex-end",gap:10}}><div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><label style={{fontSize:11,fontWeight:500,color:"#8a8f98",letterSpacing:"0.04em",textTransform:"uppercase"}}>Type</label><Toggle options={[{value:"30fixed",label:"30yr Fixed"},{value:"io",label:"7/1 IO"}]} value={mortgageType} onChange={setMortgageType}/></div><Field label="Rate" suffix="%" value={rate} onChange={setRate} small/></div><div style={{display:"flex",gap:10}}><Field label="HOA" prefix="$" suffix="/mo" value={hoa} onChange={setHoa}/><Field label="PMI" prefix="$" suffix="/mo" value={pmi} onChange={setPmi}/></div></Sec>
        <Sec title="Taxes & Insurance"><div style={{display:"flex",flexDirection:"column",gap:4}}><label style={{fontSize:11,fontWeight:500,color:"#8a8f98",letterSpacing:"0.04em",textTransform:"uppercase"}}>Property Tax</label><Toggle options={[{value:"dollar",label:"$/year"},{value:"pct",label:"% of price"}]} value={taxMode} onChange={setTaxMode}/></div>{taxMode==="dollar"?<Field label="Annual Property Tax" prefix="$" suffix="/yr" value={annualTax} onChange={setAnnualTax}/>:<Field label="Tax Rate" suffix="%" value={taxRatePct} onChange={setTaxRatePct} hint={homePrice>0?`= ${money(homePrice*taxRatePct/100)}/yr`:""}/>}<Field label="Annual Insurance" prefix="$" suffix="/yr" value={annualInsurance} onChange={setAnnualInsurance}/></Sec>
        <Sec title="Monthly Add-ons" open={false}><span style={{fontSize:11,color:"#555a63"}}>Pool, utilities, etc.</span><DynList items={addons} setItems={setAddons} defaultName="Add-on" addLabel="Add cost"/></Sec></>}
        {sideTab==="offsets"&&<><div style={{padding:"8px 0 4px",fontSize:12,color:"#6b7080",lineHeight:1.5}}>Expenses that <strong style={{color:"#3dd68c"}}>go away</strong> in the new scenario.</div>
        <Sec title="Old Mortgage"><Field label="Current Mortgage" prefix="$" suffix="/mo" value={oldMortgage} onChange={setOldMortgage} hint="Goes away — deducted from new costs"/></Sec>
        <Sec title="State Tax Savings"><Field label="Current State Tax" prefix="$" suffix="/mo" value={stateTaxSavings} onChange={setStateTaxSavings} hint="e.g. NJ → FL"/></Sec>
        <Sec title="FICA Cap Savings"><Toggle options={[{value:"dollar",label:"$/mo"},{value:"pct",label:"% salary"}]} value={ficaMode} onChange={setFicaMode}/>{ficaMode==="dollar"?<Field label="FICA Savings" prefix="$" suffix="/mo" value={ficaDollar} onChange={setFicaDollar}/>:<><Field label="FICA Rate" suffix="%" value={ficaPct} onChange={setFicaPct} hint="Usually 6.2%"/><Field label="Base Salary" prefix="$" suffix="/yr" value={ficaBaseSalary} onChange={setFicaBaseSalary} hint={ficaBaseSalary>0?`= ${money((ficaPct/100)*ficaBaseSalary/12)}/mo`:""}/></>}</Sec>
        <Sec title="Car Payoffs"><DynList items={carPayoffs} setItems={setCarPayoffs} defaultName="Car" addLabel="Add car"/></Sec>
        <Sec title="Other Offsets"><DynList items={otherOffsets} setItems={setOtherOffsets} defaultName="Offset" addLabel="Add offset"/></Sec></>}
        {sideTab==="income"&&<Sec title="Household Income"><Field label="Combined Monthly Take-Home" prefix="$" suffix="/mo" value={monthlyIncome} onChange={setMonthlyIncome} hint="After-tax income"/></Sec>}
        {sideTab==="expenses"&&<><div style={{padding:"8px 0 4px",fontSize:12,color:"#6b7080",lineHeight:1.5}}>Ongoing expenses that <strong style={{color:"#f5c542"}}>persist regardless</strong>.</div>{CATS.map(cat=><Sec key={cat.key} title={`${cat.icon} ${cat.label}`} open={false} badge={sm(expenses[cat.key]||[])}><DynList items={expenses[cat.key]||[]} setItems={items=>setExpCat(cat.key,items)} defaultName={cat.label} addLabel={`Add ${cat.label.toLowerCase()}`}/></Sec>)}</>}
      </div>
      <div className="main" style={{flex:1,padding:"28px 36px",overflowY:"auto"}}>
        {view==="delta"&&<><div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:24}}><KPI label="New Housing" value={money(calc.newHousing)} sub="before offsets" accent="#2c6fef"/><KPI label="Offsets" value={money(calc.totalOff)} sub="eliminated" accent="#3dd68c"/><KPI label="Monthly Delta" value={`${calc.delta>=0?"":"-"}${money(calc.delta)}`} sub={calc.delta>0?"more/mo":calc.delta<0?"less/mo":"neutral"} accent={dC}/></div>
          <div style={{padding:"12px 18px",borderRadius:10,marginBottom:24,fontSize:13,background:calc.delta>0?"#ef444412":calc.delta<0?"#3dd68c12":"#8a8f9812",color:dC,border:`1px solid ${dC}22`}}>{calc.newHousing===0?"Enter scenario details to start.":calc.delta>0?`Net new cost: ${money(calc.delta)}/mo.`:calc.delta<0?`You'd free up ${money(calc.delta)}/mo.`:"Net neutral."}{calc.postIO&&calc.newHousing>0&&<span style={{display:"block",marginTop:6,color:"#8a8f98",fontSize:12}}>⚠ Post-IO: ~{money(calc.postIO)}/mo</span>}</div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}><div style={{flex:1,minWidth:260}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>New Costs</span><span style={{fontSize:20,fontFamily:"'Instrument Serif'",color:"#2c6fef"}}>{money(calc.newHousing)}</span></div><Bar items={calc.newBreakdown} total={calc.newHousing}/><div style={{marginTop:12}}>{calc.newBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount}/>)}<Row label="Total" amount={calc.newHousing} highlight/></div></div>
          <div style={{flex:1,minWidth:260}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>Offsets</span><span style={{fontSize:20,fontFamily:"'Instrument Serif'",color:"#3dd68c"}}>-{money(calc.totalOff)}</span></div><Bar items={calc.offBreakdown} total={calc.totalOff}/><div style={{marginTop:12}}>{calc.offBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount} green/>)}<Row label="Total" amount={calc.totalOff} highlight/></div></div></div>
          <div style={{marginTop:24,padding:"20px 24px",borderRadius:12,background:"#13151a",border:`1px solid ${dC}33`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><div style={{fontSize:11,fontWeight:500,color:"#6b7080",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:4}}>Change in Monthly Outlay</div><div style={{fontSize:12,color:"#555a63"}}>{money(calc.newHousing)} − {money(calc.totalOff)}</div></div><span style={{fontSize:36,fontWeight:700,fontFamily:"'Instrument Serif',serif",color:dC}}>{calc.delta>=0?"":"−"}{money(calc.delta)}<span style={{fontSize:14,color:"#555a63",marginLeft:6}}>/mo</span></span></div></>}

        {view==="cashflow"&&<><div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:24}}><KPI label="Income" value={money(calc.monthlyIncome)} accent="#2c6fef"/><KPI label="Housing" value={money(calc.newHousing)} accent="#f5c542"/><KPI label="Ongoing" value={money(calc.totalOngoing)} accent="#a78bfa"/><KPI label="Surplus" value={signedMoney(calc.newCashflow)} sub={calc.newCashflow>=0?"remaining":"shortfall"} accent={cfC(calc.newCashflow)}/></div>
          {calc.monthlyIncome===0&&<div style={{padding:"12px 18px",borderRadius:10,marginBottom:24,fontSize:13,background:"#f5c54212",color:"#f5c542",border:"1px solid #f5c54222"}}>Add income in the Income tab.</div>}
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}><div style={{flex:1,minWidth:260}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>Income</span><span style={{fontSize:20,fontFamily:"'Instrument Serif'",color:"#2c6fef"}}>{money(calc.monthlyIncome)}</span></div><Row label="Take-Home" amount={calc.monthlyIncome}/></div>
          <div style={{flex:1,minWidth:260}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>Outflows</span><span style={{fontSize:20,fontFamily:"'Instrument Serif'",color:"#ef6b4a"}}>{money(calc.newTotalOut)}</span></div><Bar items={[{label:"Housing",amount:calc.newHousing},...calc.expByCat.filter(c=>c.total>0).map(c=>({label:c.label,amount:c.total}))]} total={calc.newTotalOut}/><div style={{marginTop:12}}><Row label="Housing" amount={calc.newHousing}/>{calc.expByCat.filter(c=>c.total>0).map(c=><Row key={c.key} label={`${c.icon} ${c.label}`} amount={c.total}/>)}<Row label="Total" amount={calc.newTotalOut} highlight/></div></div></div>
          <div style={{marginTop:24,padding:"20px 24px",borderRadius:12,background:"#13151a",border:`1px solid ${cfC(calc.newCashflow)}33`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><div style={{fontSize:11,fontWeight:500,color:"#6b7080",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:4}}>Surplus / (Shortfall)</div><div style={{fontSize:12,color:"#555a63"}}>{money(calc.monthlyIncome)} − {money(calc.newTotalOut)}</div></div><span style={{fontSize:36,fontWeight:700,fontFamily:"'Instrument Serif',serif",color:cfC(calc.newCashflow)}}>{signedMoney(calc.newCashflow)}<span style={{fontSize:14,color:"#555a63",marginLeft:6}}>/mo</span></span></div></>}

        {view==="cv"&&<><div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:24}}><KPI label="Current Surplus" value={signedMoney(calc.currentCashflow)} accent={cfC(calc.currentCashflow)}/><KPI label="New Surplus" value={signedMoney(calc.newCashflow)} accent={cfC(calc.newCashflow)}/><KPI label="Change" value={signedMoney(calc.newCashflow-calc.currentCashflow)} sub={calc.newCashflow>=calc.currentCashflow?"improvement":"reduction"} accent={cfC(calc.newCashflow-calc.currentCashflow)}/></div>
          {(calc.monthlyIncome===0||(calc.oldMortgage===0&&calc.newHousing===0))&&<div style={{padding:"12px 18px",borderRadius:10,marginBottom:24,fontSize:13,background:"#f5c54212",color:"#f5c542",border:"1px solid #f5c54222"}}>Fill in Income, Mortgage & Offsets.</div>}
          <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:280,background:"#13151a",borderRadius:12,border:"1px solid #1e2128",padding:20}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>Current</span><span style={{fontSize:11,color:"#555a63",textTransform:"uppercase"}}>Before</span></div><Row label="Income" amount={calc.monthlyIncome}/><div style={{height:8}}/><Row label="Current Mortgage" amount={calc.oldMortgage} red/><Row label="State Tax" amount={calc.stateTaxSavings} red/>{calc.expByCat.filter(c=>c.total>0).map(c=><Row key={c.key} label={`${c.icon} ${c.label}`} amount={c.total} red/>)}<Row label="Total Out" amount={calc.currentTotalOut} highlight/><div style={{height:8}}/><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid #2a2e37"}}><span style={{fontSize:14,fontWeight:700}}>Surplus</span><span style={{fontSize:18,fontWeight:700,fontFamily:"'Instrument Serif'",color:cfC(calc.currentCashflow)}}>{signedMoney(calc.currentCashflow)}</span></div></div>
            <div style={{flex:1,minWidth:280,background:"#13151a",borderRadius:12,border:"1px solid #1e2128",padding:20}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><span style={{fontSize:15,fontWeight:600,color:"#c0c4cc"}}>New</span><span style={{fontSize:11,color:"#555a63",textTransform:"uppercase"}}>After</span></div><Row label="Income" amount={calc.monthlyIncome}/><div style={{height:8}}/>{calc.newBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount} red/>)}{calc.expByCat.filter(c=>c.total>0).map(c=><Row key={c.key} label={`${c.icon} ${c.label}`} amount={c.total} red/>)}<Row label="Total Out" amount={calc.newTotalOut} highlight/><div style={{height:8}}/><div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"2px solid #2a2e37"}}><span style={{fontSize:14,fontWeight:700}}>Surplus</span><span style={{fontSize:18,fontWeight:700,fontFamily:"'Instrument Serif'",color:cfC(calc.newCashflow)}}>{signedMoney(calc.newCashflow)}</span></div></div>
          </div>
          <div style={{marginTop:24,padding:"20px 24px",borderRadius:12,background:"#13151a",border:`1px solid ${cfC(calc.newCashflow-calc.currentCashflow)}33`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}><div><div style={{fontSize:11,fontWeight:500,color:"#6b7080",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:4}}>Change in Surplus</div><div style={{fontSize:12,color:"#555a63"}}>{signedMoney(calc.newCashflow)} − {signedMoney(calc.currentCashflow)}</div></div><span style={{fontSize:36,fontWeight:700,fontFamily:"'Instrument Serif',serif",color:cfC(calc.newCashflow-calc.currentCashflow)}}>{signedMoney(calc.newCashflow-calc.currentCashflow)}<span style={{fontSize:14,color:"#555a63",marginLeft:6}}>/mo</span></span></div></>}

        {view==="sc"&&<CompareView scenarios={scenarios}/>}
        {view==="eq"&&<EquivView scenarios={scenarios}/>}

        {calc.loan>0&&["delta","cashflow","cv"].includes(view)&&<div style={{marginTop:20,padding:"14px 18px",background:"#101218",borderRadius:10,border:"1px solid #1a1d24",display:"flex",flexWrap:"wrap",gap:"6px 28px",fontSize:12,color:"#6b7080"}}><span>Loan: <strong style={{color:"#9a9faa"}}>{money(calc.loan)}</strong></span><span>Down: <strong style={{color:"#9a9faa"}}>{money(downPayment)}</strong> ({homePrice>0?((downPayment/homePrice)*100).toFixed(1):0}%)</span><span>Rate: <strong style={{color:"#9a9faa"}}>{pF(rate)}</strong></span><span>Type: <strong style={{color:"#9a9faa"}}>{mortgageType==="30fixed"?"30yr":"IO"}</strong></span></div>}
      </div>
    </div>
  </div>;
}
