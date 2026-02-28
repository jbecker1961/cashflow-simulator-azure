import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";

const FONTS = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,700;1,9..144,300&display=swap";
const LOCAL_SK = "cashflow_sim_v2";
const MX = 15;

/* ── palette ── */
const P = {
  bg: "#f6f5f0", bgCard: "#ffffff", bgSide: "#fafaf7", bgInput: "#f0efeb",
  border: "#e8e6df", borderLight: "#f0eeea",
  text: "#1a1a1a", textSec: "#6b6966", textMute: "#a09d97",
  accent: "#2563eb", accentLight: "#dbeafe", accentDark: "#1d4ed8",
  green: "#16a34a", greenBg: "#dcfce7", greenLight: "#bbf7d0",
  red: "#dc2626", redBg: "#fef2f2", redLight: "#fecaca",
  amber: "#d97706", amberBg: "#fffbeb",
  purple: "#7c3aed", purpleBg: "#f3e8ff",
};

/* ── Tooltip ── */
function Tip({text}){const[show,setShow]=useState(false);return<span style={{position:"relative",display:"inline-flex",alignItems:"center",marginLeft:4}}>
  <span onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(!show)} style={{width:16,height:16,borderRadius:"50%",background:P.bgInput,border:`1.5px solid ${P.border}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:P.textMute,cursor:"help",transition:"all .2s",lineHeight:1}}>?</span>
  {show&&<div style={{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",background:P.text,color:"#fff",padding:"10px 14px",borderRadius:10,fontSize:12,lineHeight:1.5,fontWeight:500,width:240,zIndex:999,boxShadow:"0 8px 24px rgba(0,0,0,.2)",fontFamily:"'Plus Jakarta Sans'",pointerEvents:"none"}}>{text}<div style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:`6px solid ${P.text}`}}/></div>}
</span>;}

/* ── Info Banner ── */
function InfoBanner({children,color}){const bg=color==="blue"?P.accentLight:color==="green"?P.greenBg:color==="amber"?P.amberBg:P.accentLight;const fg=color==="blue"?P.accent:color==="green"?P.green:color==="amber"?P.amber:P.accent;const bdr=color==="blue"?"#93c5fd":color==="green"?"#86efac":color==="amber"?"#fcd34d":"#93c5fd";
  return<div style={{padding:"14px 18px",borderRadius:14,marginBottom:24,fontSize:13,lineHeight:1.6,background:bg,color:fg,border:`1.5px solid ${bdr}`,fontWeight:500}}>{children}</div>;
}

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

function loadLocal(){try{const r=localStorage.getItem(LOCAL_SK);return r?JSON.parse(r):[];}catch{return[];}}
function saveLocal(l){try{localStorage.setItem(LOCAL_SK,JSON.stringify(l));}catch{}}
async function loadCloud(){try{const r=await fetch("/api/scenarios");if(!r.ok)return null;const data=await r.json();return Array.isArray(data)&&data.length>0?data[0].scenarios:[];}catch{return null;}}
async function saveCloud(scenarios){try{await fetch("/api/scenarios",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scenarios})});}catch(e){console.error("Cloud save failed",e);}}

function xls(scs){if(!scs.length)return;const h=["Scenario","Home Price","Down Payment","Loan","Rate %","Type","P&I/mo","Tax/mo","Ins/mo","HOA","PMI","Add-ons","Housing Total","Old Mortgage","State Tax Sav","FICA Sav","Car Payoffs","Other Off","Total Off","Delta","Income","Ongoing Exp","New Outflows","New CF","Cur Outflows","Cur CF"];const rows=scs.map(sc=>{const c=cFS(sc.state);return[sc.name,sc.state.homePrice,sc.state.downPayment,c.loan,sc.state.rate,sc.state.mortgageType==="30fixed"?"30yr":"IO",Math.round(c.pi),Math.round(c.mTax),Math.round(c.mIns),sc.state.hoa,sc.state.pmi,Math.round(c.addonT),Math.round(c.newHousing),sc.state.oldMortgage,sc.state.stateTaxSavings,Math.round(c.ficaOff),Math.round(c.carOffT),Math.round(c.otherOffT),Math.round(c.totalOff),Math.round(c.delta),sc.state.monthlyIncome,Math.round(c.totalOngoing),Math.round(c.newTotalOut),Math.round(c.newCashflow),Math.round(c.currentTotalOut),Math.round(c.currentCashflow)];});const csv=[h,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");const b=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="cashflow_scenarios.csv";a.click();}
/* ── Donut Chart SVG ── */
function Donut({items,size=140,thickness=20,label,amount}){
  const total=items.reduce((s,i)=>s+i.amount,0);
  const colors=["#2563eb","#7c3aed","#16a34a","#d97706","#dc2626","#ec4899","#0891b2","#64748b","#f97316"];
  if(total===0)return null;
  const r=(size-thickness)/2,cx=size/2,cy=size/2;
  let cumAngle=-90;
  const arcs=items.filter(i=>i.amount>0).map((item,idx)=>{
    const pct=item.amount/total;const angle=pct*360;
    const startAngle=cumAngle;cumAngle+=angle;const endAngle=cumAngle;
    const largeArc=angle>180?1:0;
    const s1=Math.cos(startAngle*Math.PI/180)*r;const s2=Math.sin(startAngle*Math.PI/180)*r;
    const e1=Math.cos(endAngle*Math.PI/180)*r;const e2=Math.sin(endAngle*Math.PI/180)*r;
    const d=`M ${cx+s1} ${cy+s2} A ${r} ${r} 0 ${largeArc} 1 ${cx+e1} ${cy+e2}`;
    return<path key={idx} d={d} fill="none" stroke={colors[idx%colors.length]} strokeWidth={thickness} strokeLinecap="butt" style={{transition:"all .5s ease"}}/>;
  });
  return<div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size}>{arcs}</svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:11,color:P.textMute,fontWeight:500}}>{label}</span>
      <span style={{fontSize:18,fontWeight:700,color:P.text,fontFamily:"'Fraunces',serif"}}>{amount}</span>
    </div>
  </div>;
}

/* ── Horizontal bar ── */
function HBar({items,total}){
  const colors=["#2563eb","#7c3aed","#16a34a","#d97706","#dc2626","#ec4899","#0891b2","#64748b","#f97316"];
  const t=Math.abs(total)||1;
  return<div style={{display:"flex",flexDirection:"column",gap:6}}>
    <div style={{display:"flex",borderRadius:8,overflow:"hidden",height:10,background:P.bgInput}}>
      {items.filter(i=>i.amount>0).map((item,idx)=><div key={idx} style={{width:`${(item.amount/t)*100}%`,background:colors[idx%colors.length],transition:"width .5s ease",minWidth:3}}/>)}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px 14px"}}>
      {items.filter(i=>i.amount>0).map((item,idx)=><span key={idx} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:P.textSec}}>
        <span style={{width:8,height:8,borderRadius:3,background:colors[idx%colors.length],display:"inline-block"}}/>{item.label} <strong>{money(item.amount)}</strong>
      </span>)}
    </div>
  </div>;
}

/* ── Number Input ── */
function fC(n){if(n===0)return"0";const p=String(n).split(".");p[0]=p[0].replace(/\B(?=(\d{3})+(?!\d))/g,",");return p.join(".");}
function sC(s){return s.replace(/,/g,"");}
function NumInput({value,onChange,style:sx}){
  const[d,setD]=useState(fC(value));const[f,setF]=useState(false);const ref=useRef(null);
  useEffect(()=>{if(!f)setD(fC(value));},[value,f]);
  return<input ref={ref} type="text" inputMode="decimal" value={d} onChange={e=>{if(/^-?[\d.,]*$/.test(e.target.value))setD(e.target.value);}} onFocus={()=>{setF(true);if(value===0)setD("");else setD(sC(d));setTimeout(()=>ref.current?.select(),0);}} onBlur={()=>{setF(false);const p=parseFloat(sC(d));if(isNaN(p)||d.trim()===""){onChange(0);setD("0");}else{onChange(p);setD(fC(p));}}} style={{background:"transparent",border:"none",outline:"none",color:P.text,fontSize:15,fontFamily:"'Plus Jakarta Sans',sans-serif",padding:"0 12px",width:"100%",height:"100%",fontWeight:500,...sx}}/>;
}

/* ── Field ── */
function Field({label,value,onChange,prefix,suffix,hint,small}){
  return<div style={{display:"flex",flexDirection:"column",gap:5,flex:small?"0 0 auto":1}}>
    <label style={{fontSize:12,fontWeight:600,color:P.textSec,letterSpacing:"0.02em"}}>{label}</label>
    <div style={{display:"flex",alignItems:"center",background:P.bgInput,borderRadius:10,border:`1.5px solid ${P.border}`,overflow:"hidden",height:44,transition:"border-color .2s"}}
      onFocus={e=>e.currentTarget.style.borderColor=P.accent} onBlur={e=>e.currentTarget.style.borderColor=P.border}>
      {prefix&&<span style={{padding:"0 0 0 12px",color:P.textMute,fontSize:15,fontWeight:600}}>{prefix}</span>}
      <NumInput value={value} onChange={onChange}/>
      {suffix&&<span style={{padding:"0 12px 0 0",color:P.textMute,fontSize:13,whiteSpace:"nowrap",fontWeight:500}}>{suffix}</span>}
    </div>
    {hint&&<span style={{fontSize:11,color:P.textMute}}>{hint}</span>}
  </div>;
}

/* ── Toggle ── */
function Toggle({options,value,onChange}){return<div style={{display:"flex",width:"100%",background:P.bgInput,borderRadius:10,border:`1.5px solid ${P.border}`,overflow:"hidden",padding:3}}>
  {options.map(o=><button key={o.value} onClick={()=>onChange(o.value)} style={{flex:1,padding:"8px 12px",fontSize:12,fontWeight:600,fontFamily:"'Plus Jakarta Sans'",border:"none",cursor:"pointer",borderRadius:8,transition:"all .25s",background:value===o.value?P.accent:"transparent",color:value===o.value?"#fff":P.textSec,boxShadow:value===o.value?"0 1px 3px rgba(37,99,235,.3)":"none"}}>{o.label}</button>)}
</div>;}

/* ── DynList ── */
function DynList({items,setItems,defaultName,addLabel}){const add=()=>setItems([...items,{id:uid(),name:defaultName,amount:0}]);const rm=id=>setItems(items.filter(i=>i.id!==id));const up=(id,k,v)=>setItems(items.map(i=>i.id===id?{...i,[k]:v}:i));return<div style={{display:"flex",flexDirection:"column",gap:8}}>
  {items.map(item=><div key={item.id} style={{display:"flex",gap:8,alignItems:"center"}}>
    <input value={item.name} onChange={e=>up(item.id,"name",e.target.value)} onFocus={e=>{if(item.name===defaultName)e.target.select();}}
      style={{flex:1,background:P.bgInput,border:`1.5px solid ${P.border}`,borderRadius:10,color:P.text,fontSize:13,fontFamily:"'Plus Jakarta Sans'",padding:"9px 12px",outline:"none",fontWeight:500}}/>
    <div style={{display:"flex",alignItems:"center",background:P.bgInput,borderRadius:10,border:`1.5px solid ${P.border}`,overflow:"hidden",width:120,height:40}}>
      <span style={{padding:"0 0 0 10px",color:P.textMute,fontSize:14,fontWeight:600}}>$</span>
      <NumInput value={item.amount} onChange={v=>up(item.id,"amount",v)} style={{fontSize:13,padding:"0 8px"}}/>
    </div>
    <button onClick={()=>rm(item.id)} style={{background:"none",border:"none",color:P.textMute,cursor:"pointer",fontSize:20,lineHeight:1,padding:4,borderRadius:6,transition:"all .2s"}} onMouseEnter={e=>{e.target.style.color=P.red;e.target.style.background=P.redBg;}} onMouseLeave={e=>{e.target.style.color=P.textMute;e.target.style.background="none";}}>×</button>
  </div>)}
  <button onClick={add} style={{background:"none",border:`1.5px dashed ${P.border}`,borderRadius:10,color:P.accent,fontSize:12,fontFamily:"'Plus Jakarta Sans'",padding:"9px 0",cursor:"pointer",fontWeight:600,transition:"all .2s"}} onMouseEnter={e=>{e.target.style.borderColor=P.accent;e.target.style.background=P.accentLight;}} onMouseLeave={e=>{e.target.style.borderColor=P.border;e.target.style.background="none";}}>+ {addLabel}</button>
</div>;}

/* ── Section ── */
function Sec({title,children,open:dO=true,badge}){const[open,setOpen]=useState(dO);return<div style={{borderBottom:`1px solid ${P.borderLight}`,paddingBottom:open?4:0}}>
  <button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"none",border:"none",color:P.text,cursor:"pointer",padding:"16px 0 10px",fontSize:13,fontWeight:700,fontFamily:"'Plus Jakarta Sans'",letterSpacing:"0.01em"}}>
    <span style={{display:"flex",alignItems:"center",gap:8}}>{title}{badge>0&&<span style={{fontSize:11,fontWeight:600,color:P.accent,background:P.accentLight,padding:"2px 8px",borderRadius:20}}>{money(badge)}/mo</span>}</span>
    <svg width="16" height="16" viewBox="0 0 16 16" style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s",color:P.textMute}}><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  </button>
  {open&&<div style={{paddingBottom:16,display:"flex",flexDirection:"column",gap:14}}>{children}</div>}
</div>;}

/* ── KPI Card ── */
function KPI({label,value,sub,accent,icon}){
  const bg=accent===P.green?P.greenBg:accent===P.red?P.redBg:accent===P.amber?P.amberBg:accent===P.purple?P.purpleBg:P.accentLight;
  return<div style={{flex:1,background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:"20px 22px",display:"flex",flexDirection:"column",gap:6,minWidth:160,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      {icon&&<span style={{width:28,height:28,borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{icon}</span>}
      <span style={{fontSize:11,fontWeight:600,color:P.textMute,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>
    </div>
    <span style={{fontSize:28,fontWeight:700,fontFamily:"'Fraunces',serif",color:accent||P.text,letterSpacing:"-0.02em",lineHeight:1.1}}>{value}</span>
    {sub&&<span style={{fontSize:12,color:P.textSec}}>{sub}</span>}
  </div>;
}

/* ── Row ── */
function Row({label,amount,highlight,green,red}){const col=highlight?P.text:green?P.green:red?P.red:P.textSec;
  return<div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${P.borderLight}`}}>
    <span style={{fontSize:13,color:highlight?P.text:P.textSec,fontWeight:highlight?700:500}}>{label}</span>
    <span style={{fontSize:14,fontWeight:highlight?700:600,color:col,fontVariantNumeric:"tabular-nums",fontFamily:"'Plus Jakarta Sans'"}}>
      {green&&amount>0?`-${money(amount)}`:signedMoney(amount)}
    </span>
  </div>;
}
/* ── Scenario Manager ── */
function ScenarioMgr({state,onLoad,onReset,scenarios,setScenarios,onSave}){
  const[name,setName]=useState("");const[showSave,setShowSave]=useState(false);const[toast,setToast]=useState(null);
  const flash=(msg,color)=>{setToast({msg,color});setTimeout(()=>setToast(null),2500);};
  const save=(oN)=>{const n=(oN||name).trim();if(!n)return;const rest=scenarios.filter(s=>s.name!==n);if(!scenarios.find(s=>s.name===n)&&rest.length>=MX){flash(`Max ${MX} scenarios`,"#dc2626");return;}const upd=[...rest,{name:n,state:JSON.parse(JSON.stringify(state)),savedAt:Date.now()}];setScenarios(upd);onSave(upd);if(!oN){setName("");setShowSave(false);}flash(`"${n}" saved`,"#16a34a");};
  const del=n=>{const upd=scenarios.filter(s=>s.name!==n);setScenarios(upd);onSave(upd);flash(`"${n}" deleted`,"#6b6966");};
  return<div style={{padding:"14px 0",borderBottom:`1px solid ${P.borderLight}`}}>
    {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:P.bgCard,border:`1.5px solid ${toast.color}33`,color:toast.color,padding:"10px 24px",borderRadius:12,fontSize:13,fontFamily:"'Plus Jakarta Sans'",fontWeight:600,zIndex:9999,boxShadow:"0 8px 30px rgba(0,0,0,.12)"}}>{toast.msg}</div>}
    <div style={{display:"flex",gap:8,marginBottom:10}}>
      <button onClick={()=>setShowSave(!showSave)} style={{border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",fontSize:12,fontWeight:600,borderRadius:10,padding:"8px 16px",background:P.accentLight,color:P.accent,transition:"all .2s"}} onMouseEnter={e=>e.target.style.background="#c7d8fe"} onMouseLeave={e=>e.target.style.background=P.accentLight}>💾 Save</button>
      <button onClick={onReset} style={{border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",fontSize:12,fontWeight:600,borderRadius:10,padding:"8px 16px",background:P.redBg,color:P.red,transition:"all .2s"}}>↺ Clear</button>
    </div>
    {showSave&&<div style={{display:"flex",gap:8,marginBottom:10}}>
      <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&save()} placeholder="e.g. Beach House $1.6M" maxLength={30} autoFocus style={{flex:1,background:P.bgInput,border:`1.5px solid ${P.border}`,borderRadius:10,color:P.text,fontSize:13,fontFamily:"'Plus Jakarta Sans'",padding:"8px 12px",outline:"none",fontWeight:500}}/>
      <button onClick={()=>save()} style={{border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",fontSize:12,fontWeight:600,borderRadius:10,padding:"8px 18px",background:P.accent,color:"#fff"}}>Save</button>
    </div>}
    {scenarios.length>0&&<div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
      <span style={{fontSize:11,color:P.textMute,fontWeight:600,letterSpacing:"0.04em",textTransform:"uppercase"}}>Saved ({scenarios.length}/{MX})</span>
      {scenarios.map(s=><div key={s.name} style={{display:"flex",alignItems:"center",gap:6,background:P.bgInput,borderRadius:10,padding:"7px 10px",transition:"all .15s"}}>
        <button onClick={()=>{onLoad(s.state);flash(`"${s.name}" loaded`,"#2563eb");}} style={{background:"none",border:"none",color:P.text,cursor:"pointer",fontSize:13,fontFamily:"'Plus Jakarta Sans'",textAlign:"left",flex:1,padding:0,fontWeight:500}}>{s.name}</button>
        <button onClick={()=>save(s.name)} style={{border:"none",cursor:"pointer",background:P.accentLight,color:P.accent,borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:700,fontFamily:"'Plus Jakarta Sans'"}} title="Overwrite">↻</button>
        <button onClick={()=>del(s.name)} style={{background:"none",border:"none",color:P.textMute,cursor:"pointer",fontSize:16,padding:"0 3px",transition:"color .15s"}} onMouseEnter={e=>e.target.style.color=P.red} onMouseLeave={e=>e.target.style.color=P.textMute}>×</button>
      </div>)}
    </div>}
  </div>;
}

/* ── Compare View ── */
function CompareView({scenarios}){
  const[sel,setSel]=useState({});const[detail,setDetail]=useState(null);
  const ranked=useMemo(()=>scenarios.map(sc=>({...sc,calc:cFS(sc.state)})).sort((a,b)=>a.calc.delta-b.calc.delta),[scenarios]);
  const toggle=n=>setSel(p=>({...p,[n]:!p[n]}));
  const doExport=()=>{const e=ranked.filter(r=>sel[r.name]);if(!e.length){alert("Select scenarios first");return;}xls(e);};
  const cf=v=>v<0?P.red:v>0?P.green:P.textMute;
  if(!scenarios.length)return<div style={{padding:60,textAlign:"center",color:P.textMute,fontSize:14}}>Save at least one scenario to compare.</div>;
  return<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:8}}>
      <div><h2 style={{fontSize:18,fontWeight:700,color:P.text,margin:0,fontFamily:"'Fraunces',serif"}}>Compare Scenarios</h2><p style={{fontSize:13,color:P.textSec,margin:"4px 0 0"}}>Ranked by monthly delta (net cost change) — best to worst. Lower delta = better deal.</p></div>
      <button onClick={doExport} style={{border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",fontSize:12,fontWeight:600,borderRadius:10,padding:"8px 18px",background:P.greenBg,color:P.green}}>📊 Export CSV</button>
    </div>
    <div style={{overflowX:"auto",marginBottom:24,background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:"'Plus Jakarta Sans'"}}>
        <thead><tr style={{borderBottom:`2px solid ${P.border}`}}>
          {["","#","Scenario","Home Price","Housing","Offsets","Delta",""].map((h,i)=><th key={i} style={{padding:"12px 10px",textAlign:i>=3&&i<=6?"right":i===7?"center":"left",color:P.textMute,fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:"0.04em"}}>{h}</th>)}
        </tr></thead>
        <tbody>{ranked.map((r,idx)=><tr key={r.name} style={{borderBottom:`1px solid ${P.borderLight}`,background:detail===r.name?P.bgInput:"transparent",transition:"background .15s"}}>
          <td style={{padding:"10px"}}><input type="checkbox" checked={!!sel[r.name]} onChange={()=>toggle(r.name)} style={{accentColor:P.accent,width:16,height:16}}/></td>
          <td style={{padding:"10px",color:P.textMute,fontWeight:600}}>#{idx+1}</td>
          <td style={{padding:"10px",color:P.text,fontWeight:600}}>{r.name}</td>
          <td style={{padding:"10px",textAlign:"right",color:P.textSec,fontWeight:500}}>{money(r.calc.homePrice)}</td>
          <td style={{padding:"10px",textAlign:"right",color:P.textSec,fontWeight:500}}>{money(r.calc.newHousing)}</td>
          <td style={{padding:"10px",textAlign:"right",color:P.green,fontWeight:600}}>-{money(r.calc.totalOff)}</td>
          <td style={{padding:"10px",textAlign:"right",fontWeight:700,color:cf(-r.calc.delta)}}>{signedMoney(r.calc.delta)}</td>
          <td style={{padding:"10px",textAlign:"center"}}><button onClick={()=>setDetail(detail===r.name?null:r.name)} style={{background:P.accentLight,border:"none",color:P.accent,cursor:"pointer",fontSize:11,fontFamily:"'Plus Jakarta Sans'",fontWeight:600,borderRadius:6,padding:"4px 10px"}}>{detail===r.name?"Hide":"View"}</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {detail&&(()=>{const sc=ranked.find(r=>r.name===detail);if(!sc)return null;const c=sc.calc;return<div style={{background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:24,marginBottom:24,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <h3 style={{fontSize:16,fontWeight:700,color:P.text,marginBottom:20,fontFamily:"'Fraunces',serif"}}>{sc.name}</h3>
      <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}><div style={{fontSize:11,fontWeight:700,color:P.textMute,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:10}}>New Costs</div>{c.newBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount}/>)}<Row label="Total" amount={c.newHousing} highlight/></div>
        <div style={{flex:1,minWidth:200}}><div style={{fontSize:11,fontWeight:700,color:P.textMute,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:10}}>Offsets</div>{c.offBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount} green/>)}<Row label="Total" amount={c.totalOff} highlight/></div>
        <div style={{flex:1,minWidth:200}}><div style={{fontSize:11,fontWeight:700,color:P.textMute,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:10}}>Summary</div><Row label="Home" amount={c.homePrice}/><Row label="Loan" amount={c.loan}/><div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${P.borderLight}`}}><span style={{fontSize:13,color:P.textSec,fontWeight:500}}>Rate</span><span style={{fontSize:14,color:P.text,fontWeight:600}}>{pF(c.rate)}</span></div><Row label="Delta" amount={c.delta} highlight/></div>
      </div></div>;})()}
  </div>;
}

/* ── Equiv View ── */
function EquivView({scenarios}){
  const calcs=useMemo(()=>scenarios.map(sc=>({...sc,calc:cFS(sc.state)})),[scenarios]);
  if(scenarios.length<2)return<div style={{padding:60,textAlign:"center",color:P.textMute,fontSize:14}}>Save 2+ scenarios for equivalencies.</div>;
  const mx=calcs.map(a=>calcs.map(b=>{if(a.name===b.name)return null;return eqHP(a.calc.delta,b.state);}));
  return<div>
    <div style={{marginBottom:16}}><h2 style={{fontSize:18,fontWeight:700,color:P.text,margin:0,fontFamily:"'Fraunces',serif"}}>Equivalency Matrix</h2><p style={{fontSize:13,color:P.textSec,margin:"4px 0 0"}}>Each cell answers: "To have the same monthly delta as the Row scenario, what home price could you afford in the Column scenario's location?" <strong style={{color:P.green}}>Green</strong> = you can buy more house, <strong style={{color:P.red}}>Red</strong> = you can buy less house, compared to the Row's price.</p></div>
    <div style={{overflowX:"auto",background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
      <table style={{borderCollapse:"collapse",fontSize:12,fontFamily:"'Plus Jakarta Sans'"}}><thead><tr>
        <th style={{padding:"12px 12px",textAlign:"left",color:P.textMute,fontSize:10,textTransform:"uppercase",fontWeight:700,letterSpacing:"0.04em",borderBottom:`2px solid ${P.border}`,position:"sticky",left:0,background:P.bgCard,zIndex:1}}>Match ↓ via →</th>
        {calcs.map(c=><th key={c.name} style={{padding:"12px",textAlign:"right",color:P.textSec,fontSize:12,fontWeight:700,borderBottom:`2px solid ${P.border}`,whiteSpace:"nowrap"}}>{c.name}<div style={{fontSize:10,color:P.textMute,fontWeight:500}}>{money(c.state.homePrice)}</div></th>)}
      </tr></thead><tbody>{calcs.map((a,i)=><tr key={a.name} style={{borderBottom:`1px solid ${P.borderLight}`}}>
        <td style={{padding:"10px 12px",color:P.text,fontWeight:600,whiteSpace:"nowrap",position:"sticky",left:0,background:P.bgCard,zIndex:1}}>{a.name}<div style={{fontSize:10,color:P.textMute,fontWeight:500}}>Δ {signedMoney(a.calc.delta)}/mo</div></td>
        {calcs.map((b,j)=><td key={b.name} style={{padding:"10px 12px",textAlign:"right",color:mx[i][j]===null?P.borderLight:P.text,fontWeight:600,background:mx[i][j]===null?"transparent":mx[i][j]<a.state.homePrice?P.redBg:P.greenBg}}>
          {mx[i][j]===null?"—":money(mx[i][j])}
          {mx[i][j]!==null&&<div style={{fontSize:10,fontWeight:600,color:mx[i][j]<a.state.homePrice?P.red:P.green}}>{mx[i][j]>a.state.homePrice?"+":""}{signedMoney(mx[i][j]-a.state.homePrice)}</div>}
        </td>)}
      </tr>)}</tbody></table>
    </div>
  </div>;
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
  const[mobileSidebar,setMobileSidebar]=useState(false);
  const[mobileTab,setMobileTab]=useState("inputs");

  useEffect(()=>{if(isAuth){setSyncing(true);setSyncStatus("Syncing...");loadCloud().then(cloud=>{if(cloud&&cloud.length>0){setScenarios(cloud);saveLocal(cloud);setSyncStatus("✓");}else{setSyncStatus("");}setSyncing(false);setTimeout(()=>setSyncStatus(""),3000);}).catch(()=>{setSyncing(false);setSyncStatus("");});};},[isAuth]);
  const persistScenarios=useCallback(list=>{saveLocal(list);if(isAuth){saveCloud(list).then(()=>{setSyncStatus("✓");setTimeout(()=>setSyncStatus(""),2000);});}},[isAuth]);
  const login=async()=>{try{await instance.loginPopup({scopes:["openid","profile","email"]});}catch(e){console.error(e);}};
  const logout=()=>{instance.logoutPopup();};

  const getState=()=>({homePrice,downPayment,mortgageType,rate,hoa,pmi,taxMode,annualTax,taxRatePct,annualInsurance,addons,oldMortgage,stateTaxSavings,ficaMode,ficaDollar,ficaPct,ficaBaseSalary,carPayoffs,otherOffsets,monthlyIncome,expenses});
  const loadState=s=>{setHomePrice(s.homePrice??0);setDownPayment(s.downPayment??0);setMortgageType(s.mortgageType??"30fixed");setRate(s.rate??0);setHoa(s.hoa??0);setPmi(s.pmi??0);setTaxMode(s.taxMode??"dollar");setAnnualTax(s.annualTax??0);setTaxRatePct(s.taxRatePct??0);setAnnualInsurance(s.annualInsurance??0);setAddons(s.addons??[]);setOldMortgage(s.oldMortgage??0);setStateTaxSavings(s.stateTaxSavings??0);setFicaMode(s.ficaMode??"dollar");setFicaDollar(s.ficaDollar??0);setFicaPct(s.ficaPct??6.2);setFicaBaseSalary(s.ficaBaseSalary??0);setCarPayoffs(s.carPayoffs??[]);setOtherOffsets(s.otherOffsets??[]);setMonthlyIncome(s.monthlyIncome??0);setExpenses(s.expenses??eE());};
  const resetAll=()=>loadState(gD());const setExpCat=(k,items)=>setExpenses(p=>({...p,[k]:items}));
  const calc=useMemo(()=>cFS(getState()),[homePrice,downPayment,mortgageType,rate,hoa,pmi,taxMode,annualTax,taxRatePct,annualInsurance,addons,oldMortgage,stateTaxSavings,ficaMode,ficaDollar,ficaPct,ficaBaseSalary,carPayoffs,otherOffsets,monthlyIncome,expenses]);
  const dC=calc.delta>0?P.red:calc.delta<0?P.green:P.textMute;
  const cfC=v=>v>0?P.green:v<0?P.red:P.textMute;

  const viewTabs=[{v:"delta",l:"Delta",i:"📊"},{v:"cashflow",l:"Cashflow",i:"💰"},{v:"cv",l:"Current vs New",i:"⚖️"},{v:"sc",l:"Compare",i:"📋"},{v:"eq",l:"Equiv",i:"🔄"}];
  const mobileTabs=[{v:"inputs",l:"Inputs",i:"✏️"},{v:"delta",l:"Delta",i:"📊"},{v:"cashflow",l:"Cash",i:"💰"},{v:"cv",l:"Cur/New",i:"⚖️"},{v:"sc",l:"Compare",i:"📋"}];
  const onMobileTab=(v)=>{setMobileTab(v);if(v!=="inputs")setView(v);};

  return<div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",background:P.bg,color:P.text,minHeight:"100vh"}}>
    <link href={FONTS} rel="stylesheet"/>
    <style>{`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}input[type=number]{-moz-appearance:textfield}::selection{background:#2563eb22}table th,table td{font-family:'Plus Jakarta Sans',sans-serif}
    .mob-toggle{display:none}
    .mob-bottom{display:none}
    .desk-tabs{display:flex}
    .mob-inputs{display:none}
    @media(max-width:900px){
      .layout{flex-direction:column!important}
      .sidebar{display:none!important}
      .main{padding:20px 16px 90px!important}
      .mob-toggle{display:none!important}
      .mob-bottom{display:flex!important}
      .desk-tabs{display:none!important}
      .mob-inputs{display:block!important}
      .mob-hide-main .main{display:none!important}
      .mob-hide-main .mob-inputs{display:block!important}
      .mob-show-main .main{display:block!important}
      .mob-show-main .mob-inputs{display:none!important}
    }
    ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#d4d2cc;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#b0ada6}`}</style>

    {/* Header */}
    <div style={{borderBottom:`1px solid ${P.border}`,padding:"12px 24px",background:P.bgCard,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:700,color:P.text}}>Cashflow</span>
        {syncStatus&&<span style={{fontSize:10,color:syncStatus==="✓"?P.green:P.textMute,fontWeight:600,background:syncStatus==="✓"?P.greenBg:P.bgInput,padding:"2px 8px",borderRadius:10}}>{syncStatus}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div className="desk-tabs" style={{background:P.bgInput,borderRadius:12,border:`1.5px solid ${P.border}`,overflow:"hidden",padding:3}}>
          {viewTabs.map(t=><button key={t.v} onClick={()=>setView(t.v)} style={{padding:"7px 12px",fontSize:11,fontWeight:600,fontFamily:"'Plus Jakarta Sans'",border:"none",cursor:"pointer",borderRadius:9,transition:"all .25s",background:view===t.v?P.accent:"transparent",color:view===t.v?"#fff":P.textSec,boxShadow:view===t.v?"0 1px 3px rgba(37,99,235,.3)":"none"}}>{t.l}</button>)}
        </div>
        {isAuth?<div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:12,color:P.textSec,fontWeight:500}}>{user?.name&&user.name!=="unknown"?user.name:user?.username?.split("_")[0]||user?.idTokenClaims?.email||"Signed in"}</span>
          <button onClick={logout} style={{border:`1.5px solid ${P.border}`,cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",fontSize:11,fontWeight:600,borderRadius:8,padding:"6px 12px",background:"transparent",color:P.textSec}}>Sign Out</button>
        </div>:<button onClick={login} style={{border:"none",cursor:"pointer",fontFamily:"'Plus Jakarta Sans'",fontSize:12,fontWeight:600,borderRadius:10,padding:"8px 18px",background:P.accent,color:"#fff",boxShadow:"0 1px 3px rgba(37,99,235,.3)"}}>Sign In</button>}
      </div>
    </div>

    <div className={`layout ${mobileTab==="inputs"?"mob-hide-main":"mob-show-main"}`} style={{display:"flex",minHeight:"calc(100vh - 57px)"}}>
      {/* Sidebar */}
      <div className={`sidebar ${mobileSidebar?"open":""}`} style={{width:380,background:P.bgSide,borderRight:`1px solid ${P.border}`,overflowY:"auto",maxHeight:"calc(100vh - 57px)",position:"sticky",top:57,padding:"4px 22px 40px"}}>
        <ScenarioMgr state={getState()} onLoad={loadState} onReset={resetAll} scenarios={scenarios} setScenarios={setScenarios} onSave={persistScenarios}/>
        <div style={{display:"flex",margin:"10px 0",gap:2,background:P.bgInput,borderRadius:12,padding:3,border:`1.5px solid ${P.border}`}}>
          {[["mortgage","Mortgage"],["offsets","Offsets"],["income","Income"],["expenses","Expenses"]].map(([k,l])=><button key={k} onClick={()=>setSideTab(k)} style={{flex:1,background:sideTab===k?P.bgCard:"transparent",border:"none",borderRadius:9,color:sideTab===k?P.text:P.textMute,cursor:"pointer",padding:"9px 0",fontSize:11,fontWeight:700,fontFamily:"'Plus Jakarta Sans'",transition:"all .2s",boxShadow:sideTab===k?"0 1px 2px rgba(0,0,0,.06)":"none"}}>{l}</button>)}
        </div>
        {sideTab==="mortgage"&&<><Sec title="Purchase Details"><div style={{display:"flex",gap:10}}><Field label="Home Price" prefix="$" value={homePrice} onChange={setHomePrice}/><Field label="Down Payment" prefix="$" value={downPayment} onChange={setDownPayment}/></div><div style={{display:"flex",alignItems:"flex-end",gap:10}}><div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:600,color:P.textSec}}>Type</label><Toggle options={[{value:"30fixed",label:"30yr Fixed"},{value:"io",label:"7/1 IO"}]} value={mortgageType} onChange={setMortgageType}/></div><Field label="Rate" suffix="%" value={rate} onChange={setRate} small/></div><div style={{display:"flex",gap:10}}><Field label="HOA" prefix="$" suffix="/mo" value={hoa} onChange={setHoa}/><Field label="PMI" prefix="$" suffix="/mo" value={pmi} onChange={setPmi}/></div></Sec>
        <Sec title="Taxes & Insurance"><div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:600,color:P.textSec}}>Property Tax</label><Toggle options={[{value:"dollar",label:"$/year"},{value:"pct",label:"% of price"}]} value={taxMode} onChange={setTaxMode}/></div>{taxMode==="dollar"?<Field label="Annual Property Tax" prefix="$" suffix="/yr" value={annualTax} onChange={setAnnualTax}/>:<Field label="Tax Rate" suffix="%" value={taxRatePct} onChange={setTaxRatePct} hint={homePrice>0?`= ${money(homePrice*taxRatePct/100)}/yr`:""}/>}<Field label="Annual Insurance" prefix="$" suffix="/yr" value={annualInsurance} onChange={setAnnualInsurance}/></Sec>
        <Sec title="Monthly Add-ons" open={false}><DynList items={addons} setItems={setAddons} defaultName="Add-on" addLabel="Add cost"/></Sec></>}
        {sideTab==="offsets"&&<><div style={{padding:"10px 0 6px",fontSize:13,color:P.textSec,lineHeight:1.5}}>Expenses that <strong style={{color:P.green}}>go away</strong> when you move.<Tip text="Offsets are recurring costs you currently pay that will be eliminated by your move. They reduce your net monthly cost change (delta). Examples: old mortgage payment, state income tax if moving to a no-tax state, car payments ending soon."/></div>
        <Sec title="Old Mortgage"><Field label="Current Mortgage" prefix="$" suffix="/mo" value={oldMortgage} onChange={setOldMortgage}/></Sec>
        <Sec title="State Tax Savings"><Field label="Current State Tax" prefix="$" suffix="/mo" value={stateTaxSavings} onChange={setStateTaxSavings}/></Sec>
        <Sec title={<>FICA Cap Savings<Tip text="If your salary exceeds the Social Security wage base (~$168K in 2024), you stop paying FICA tax (6.2%) on income above that cap. If your move involves a salary change that crosses this threshold, the savings can be significant."/></>}><Toggle options={[{value:"dollar",label:"$/mo"},{value:"pct",label:"% salary"}]} value={ficaMode} onChange={setFicaMode}/>{ficaMode==="dollar"?<Field label="FICA Savings" prefix="$" suffix="/mo" value={ficaDollar} onChange={setFicaDollar}/>:<><Field label="FICA Rate" suffix="%" value={ficaPct} onChange={setFicaPct}/><Field label="Base Salary" prefix="$" suffix="/yr" value={ficaBaseSalary} onChange={setFicaBaseSalary} hint={ficaBaseSalary>0?`= ${money((ficaPct/100)*ficaBaseSalary/12)}/mo`:""}/></>}</Sec>
        <Sec title="Car Payoffs"><DynList items={carPayoffs} setItems={setCarPayoffs} defaultName="Car" addLabel="Add car"/></Sec>
        <Sec title="Other Offsets"><DynList items={otherOffsets} setItems={setOtherOffsets} defaultName="Offset" addLabel="Add offset"/></Sec></>}
        {sideTab==="income"&&<Sec title="Household Income"><Field label="Combined Monthly Take-Home" prefix="$" suffix="/mo" value={monthlyIncome} onChange={setMonthlyIncome} hint="After-tax income"/></Sec>}
        {sideTab==="expenses"&&<><div style={{padding:"10px 0 6px",fontSize:13,color:P.textSec,lineHeight:1.5}}>Ongoing expenses that <strong style={{color:P.amber}}>persist regardless</strong>.</div>{CATS.map(cat=><Sec key={cat.key} title={`${cat.icon} ${cat.label}`} open={false} badge={sm(expenses[cat.key]||[])}><DynList items={expenses[cat.key]||[]} setItems={items=>setExpCat(cat.key,items)} defaultName={cat.label} addLabel={`Add ${cat.label.toLowerCase()}`}/></Sec>)}</>}
      </div>

      {/* Main */}
      <div className="main" style={{flex:1,padding:"28px 40px",overflowY:"auto",maxWidth:960,margin:"0 auto"}}>
        {/* Delta View */}
        {view==="delta"&&<><InfoBanner color="blue">📊 <strong>Mortgage Delta</strong> shows the net change in your monthly housing costs. It takes your new home's total costs and subtracts any expenses that go away (offsets) to show what you'll actually pay more or less each month.</InfoBanner>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:28}}><KPI label="New Housing" value={money(calc.newHousing)} sub="before offsets" accent={P.accent} icon="🏠"/><KPI label="Offsets" value={money(calc.totalOff)} sub="eliminated" accent={P.green} icon="✅"/><KPI label="Monthly Delta" value={`${calc.delta>=0?"":"-"}${money(calc.delta)}`} sub={calc.delta>0?"more/mo":calc.delta<0?"less/mo":"neutral"} accent={dC} icon={calc.delta>0?"📈":"📉"}/></div>
          {calc.newHousing===0&&<div style={{padding:"16px 20px",borderRadius:14,marginBottom:28,fontSize:14,background:P.amberBg,color:P.amber,border:`1.5px solid #fcd34d`,fontWeight:500}}>Enter your new scenario details in the sidebar to get started.</div>}
          <div style={{display:"flex",gap:28,flexWrap:"wrap",marginBottom:28}}>
            <div style={{flex:1,minWidth:260}}>
              <div style={{background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <h3 style={{fontSize:15,fontWeight:700,margin:0}}>New Costs</h3>
                  <span style={{fontSize:20,fontFamily:"'Fraunces',serif",fontWeight:700,color:P.accent}}>{money(calc.newHousing)}</span>
                </div>
                <HBar items={calc.newBreakdown} total={calc.newHousing}/>
                <div style={{marginTop:16}}>{calc.newBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount}/>)}<Row label="Total" amount={calc.newHousing} highlight/></div>
              </div>
            </div>
            <div style={{flex:1,minWidth:260}}>
              <div style={{background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Offsets</h3>
                  <span style={{fontSize:20,fontFamily:"'Fraunces',serif",fontWeight:700,color:P.green}}>-{money(calc.totalOff)}</span>
                </div>
                <HBar items={calc.offBreakdown} total={calc.totalOff}/>
                <div style={{marginTop:16}}>{calc.offBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount} green/>)}<Row label="Total" amount={calc.totalOff} highlight/></div>
              </div>
            </div>
          </div>
          <div style={{padding:"24px 28px",borderRadius:16,background:P.bgCard,border:`1.5px solid ${dC}22`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div><div style={{fontSize:11,fontWeight:700,color:P.textMute,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:4}}>Net Monthly Change<Tip text="This is your bottom line — total new housing costs minus all offsets (expenses that go away). A positive number means you'll pay more each month. A negative number means you'll save money."/></div><div style={{fontSize:13,color:P.textSec}}>{money(calc.newHousing)} − {money(calc.totalOff)} offsets</div></div><span style={{fontSize:38,fontWeight:700,fontFamily:"'Fraunces',serif",color:dC}}>{calc.delta>=0?"":"−"}{money(calc.delta)}<span style={{fontSize:14,color:P.textMute,marginLeft:6,fontFamily:"'Plus Jakarta Sans'",fontWeight:500}}>/mo</span></span></div>
          {calc.postIO&&calc.newHousing>0&&<div style={{marginTop:12,padding:"12px 16px",borderRadius:12,background:P.amberBg,fontSize:13,color:P.amber,fontWeight:500}}>⚠ Post-IO estimate (~23yr amort): ~{money(calc.postIO)}/mo</div>}
        </>}

        {/* Cashflow View */}
        {view==="cashflow"&&<><InfoBanner color="green">💰 <strong>Full Cashflow</strong> shows your complete financial picture — income minus all outflows (housing + ongoing expenses). Unlike Delta which only shows the change, this shows your actual monthly surplus or shortfall.</InfoBanner>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:28}}><KPI label="Income" value={money(calc.monthlyIncome)} accent={P.accent} icon="💵"/><KPI label="Housing" value={money(calc.newHousing)} accent={P.amber} icon="🏠"/><KPI label="Ongoing" value={money(calc.totalOngoing)} accent={P.purple} icon="📋"/><KPI label="Surplus" value={signedMoney(calc.newCashflow)} sub={calc.newCashflow>=0?"remaining":"shortfall"} accent={cfC(calc.newCashflow)} icon={calc.newCashflow>=0?"✅":"⚠️"}/></div>
          {calc.monthlyIncome===0&&<div style={{padding:"16px 20px",borderRadius:14,marginBottom:28,fontSize:14,background:P.amberBg,color:P.amber,border:`1.5px solid #fcd34d`,fontWeight:500}}>Add your income in the Income tab.</div>}
          <div style={{display:"flex",gap:28,flexWrap:"wrap",alignItems:"flex-start",marginBottom:28}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
              <Donut items={[{label:"Housing",amount:calc.newHousing},...calc.expByCat.filter(c=>c.total>0).map(c=>({label:c.label,amount:c.total}))]} label="Outflows" amount={money(calc.newTotalOut)} size={180} thickness={24}/>
            </div>
            <div style={{flex:1,minWidth:260}}>
              <div style={{background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
                <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 16px"}}>Monthly Breakdown</h3>
                <Row label="Income" amount={calc.monthlyIncome}/>
                <div style={{height:6}}/>
                <Row label="Housing (all-in)" amount={calc.newHousing} red/>
                {calc.expByCat.filter(c=>c.total>0).map(c=><Row key={c.key} label={`${c.icon} ${c.label}`} amount={c.total} red/>)}
                <Row label="Total Outflows" amount={calc.newTotalOut} highlight/>
              </div>
            </div>
          </div>
          <div style={{padding:"24px 28px",borderRadius:16,background:P.bgCard,border:`1.5px solid ${cfC(calc.newCashflow)}22`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div><div style={{fontSize:11,fontWeight:700,color:P.textMute,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:4}}>Monthly Surplus</div><div style={{fontSize:13,color:P.textSec}}>{money(calc.monthlyIncome)} − {money(calc.newTotalOut)}</div></div><span style={{fontSize:38,fontWeight:700,fontFamily:"'Fraunces',serif",color:cfC(calc.newCashflow)}}>{signedMoney(calc.newCashflow)}<span style={{fontSize:14,color:P.textMute,marginLeft:6,fontFamily:"'Plus Jakarta Sans'",fontWeight:500}}>/mo</span></span></div>
        </>}

        {/* Current vs New */}
        {view==="cv"&&<><InfoBanner color="blue">⚖️ <strong>Current vs New</strong> compares your finances before and after the move side-by-side. The "Current" column includes your existing mortgage and state taxes as expenses. The "New" column shows your new housing costs. Both include your ongoing expenses.</InfoBanner>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:28}}><KPI label="Current Surplus" value={signedMoney(calc.currentCashflow)} accent={cfC(calc.currentCashflow)} icon="📍"/><KPI label="New Surplus" value={signedMoney(calc.newCashflow)} accent={cfC(calc.newCashflow)} icon="🎯"/><KPI label="Change" value={signedMoney(calc.newCashflow-calc.currentCashflow)} sub={calc.newCashflow>=calc.currentCashflow?"improvement":"reduction"} accent={cfC(calc.newCashflow-calc.currentCashflow)} icon="↕️"/></div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap",marginBottom:28}}>
            <div style={{flex:1,minWidth:280,background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>Current</h3><span style={{fontSize:11,color:P.textMute,fontWeight:600,textTransform:"uppercase",background:P.bgInput,padding:"4px 10px",borderRadius:8}}>Before</span></div><Row label="Income" amount={calc.monthlyIncome}/><div style={{height:6}}/><Row label="Mortgage" amount={calc.oldMortgage} red/><Row label="State Tax" amount={calc.stateTaxSavings} red/>{calc.expByCat.filter(c=>c.total>0).map(c=><Row key={c.key} label={`${c.icon} ${c.label}`} amount={c.total} red/>)}<Row label="Total Out" amount={calc.currentTotalOut} highlight/><div style={{height:8}}/><div style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderTop:`2px solid ${P.border}`}}><span style={{fontSize:15,fontWeight:700}}>Surplus</span><span style={{fontSize:22,fontWeight:700,fontFamily:"'Fraunces',serif",color:cfC(calc.currentCashflow)}}>{signedMoney(calc.currentCashflow)}</span></div></div>
            <div style={{flex:1,minWidth:280,background:P.bgCard,borderRadius:16,border:`1px solid ${P.border}`,padding:24,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}><h3 style={{fontSize:15,fontWeight:700,margin:0}}>New</h3><span style={{fontSize:11,color:P.textMute,fontWeight:600,textTransform:"uppercase",background:P.bgInput,padding:"4px 10px",borderRadius:8}}>After</span></div><Row label="Income" amount={calc.monthlyIncome}/><div style={{height:6}}/>{calc.newBreakdown.filter(r=>r.amount>0).map((r,i)=><Row key={i} label={r.label} amount={r.amount} red/>)}{calc.expByCat.filter(c=>c.total>0).map(c=><Row key={c.key} label={`${c.icon} ${c.label}`} amount={c.total} red/>)}<Row label="Total Out" amount={calc.newTotalOut} highlight/><div style={{height:8}}/><div style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderTop:`2px solid ${P.border}`}}><span style={{fontSize:15,fontWeight:700}}>Surplus</span><span style={{fontSize:22,fontWeight:700,fontFamily:"'Fraunces',serif",color:cfC(calc.newCashflow)}}>{signedMoney(calc.newCashflow)}</span></div></div>
          </div>
          <div style={{padding:"24px 28px",borderRadius:16,background:P.bgCard,border:`1.5px solid ${cfC(calc.newCashflow-calc.currentCashflow)}22`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}><div><div style={{fontSize:11,fontWeight:700,color:P.textMute,letterSpacing:"0.04em",textTransform:"uppercase",marginBottom:4}}>Change in Surplus</div></div><span style={{fontSize:38,fontWeight:700,fontFamily:"'Fraunces',serif",color:cfC(calc.newCashflow-calc.currentCashflow)}}>{signedMoney(calc.newCashflow-calc.currentCashflow)}<span style={{fontSize:14,color:P.textMute,marginLeft:6,fontFamily:"'Plus Jakarta Sans'",fontWeight:500}}>/mo</span></span></div>
        </>}

        {view==="sc"&&<CompareView scenarios={scenarios}/>}
        {view==="eq"&&<EquivView scenarios={scenarios}/>}

        {calc.loan>0&&["delta","cashflow","cv"].includes(view)&&<div style={{marginTop:20,padding:"14px 20px",background:P.bgCard,borderRadius:14,border:`1px solid ${P.border}`,display:"flex",flexWrap:"wrap",gap:"6px 28px",fontSize:12,color:P.textSec,fontWeight:500,boxShadow:"0 1px 2px rgba(0,0,0,.03)"}}><span>Loan: <strong style={{color:P.text}}>{money(calc.loan)}</strong></span><span>Down: <strong style={{color:P.text}}>{money(downPayment)}</strong> ({homePrice>0?((downPayment/homePrice)*100).toFixed(1):0}%)</span><span>Rate: <strong style={{color:P.text}}>{pF(rate)}</strong></span><span>Type: <strong style={{color:P.text}}>{mortgageType==="30fixed"?"30yr Fixed":"7/1 IO"}</strong></span></div>}
      </div>

      {/* Mobile Inputs Panel */}
      <div className="mob-inputs" style={{display:"none",padding:"16px 20px 90px",background:P.bgSide}}>
        {mobileTab==="inputs"&&<>
          <ScenarioMgr state={getState()} onLoad={loadState} onReset={resetAll} scenarios={scenarios} setScenarios={setScenarios} onSave={persistScenarios}/>
          <div style={{display:"flex",margin:"10px 0",gap:2,background:P.bgInput,borderRadius:12,padding:3,border:`1.5px solid ${P.border}`}}>
            {[["mortgage","Mortgage"],["offsets","Offsets"],["income","Income"],["expenses","Expenses"]].map(([k,l])=><button key={k} onClick={()=>setSideTab(k)} style={{flex:1,background:sideTab===k?P.bgCard:"transparent",border:"none",borderRadius:9,color:sideTab===k?P.text:P.textMute,cursor:"pointer",padding:"9px 0",fontSize:11,fontWeight:700,fontFamily:"'Plus Jakarta Sans'",transition:"all .2s",boxShadow:sideTab===k?"0 1px 2px rgba(0,0,0,.06)":"none"}}>{l}</button>)}
          </div>
          {sideTab==="mortgage"&&<><Sec title="Purchase Details"><div style={{display:"flex",gap:10}}><Field label="Home Price" prefix="$" value={homePrice} onChange={setHomePrice}/><Field label="Down Payment" prefix="$" value={downPayment} onChange={setDownPayment}/></div><div style={{display:"flex",alignItems:"flex-end",gap:10}}><div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:600,color:P.textSec}}>Type</label><Toggle options={[{value:"30fixed",label:"30yr Fixed"},{value:"io",label:"7/1 IO"}]} value={mortgageType} onChange={setMortgageType}/></div><Field label="Rate" suffix="%" value={rate} onChange={setRate} small/></div><div style={{display:"flex",gap:10}}><Field label="HOA" prefix="$" suffix="/mo" value={hoa} onChange={setHoa}/><Field label="PMI" prefix="$" suffix="/mo" value={pmi} onChange={setPmi}/></div></Sec>
          <Sec title="Taxes & Insurance"><div style={{display:"flex",flexDirection:"column",gap:5}}><label style={{fontSize:12,fontWeight:600,color:P.textSec}}>Property Tax</label><Toggle options={[{value:"dollar",label:"$/year"},{value:"pct",label:"% of price"}]} value={taxMode} onChange={setTaxMode}/></div>{taxMode==="dollar"?<Field label="Annual Property Tax" prefix="$" suffix="/yr" value={annualTax} onChange={setAnnualTax}/>:<Field label="Tax Rate" suffix="%" value={taxRatePct} onChange={setTaxRatePct} hint={homePrice>0?`= ${money(homePrice*taxRatePct/100)}/yr`:""}/>}<Field label="Annual Insurance" prefix="$" suffix="/yr" value={annualInsurance} onChange={setAnnualInsurance}/></Sec>
          <Sec title="Monthly Add-ons" open={false}><DynList items={addons} setItems={setAddons} defaultName="Add-on" addLabel="Add cost"/></Sec></>}
          {sideTab==="offsets"&&<><div style={{padding:"10px 0 6px",fontSize:13,color:P.textSec,lineHeight:1.5}}>Expenses that <strong style={{color:P.green}}>go away</strong> when you move.<Tip text="Offsets are recurring costs you currently pay that will be eliminated by your move. They reduce your net monthly cost change (delta). Examples: old mortgage payment, state income tax if moving to a no-tax state, car payments ending soon."/></div>
          <Sec title="Old Mortgage"><Field label="Current Mortgage" prefix="$" suffix="/mo" value={oldMortgage} onChange={setOldMortgage}/></Sec>
          <Sec title="State Tax Savings"><Field label="Current State Tax" prefix="$" suffix="/mo" value={stateTaxSavings} onChange={setStateTaxSavings}/></Sec>
          <Sec title={<>FICA Cap Savings<Tip text="If your salary exceeds the Social Security wage base (~$168K in 2024), you stop paying FICA tax (6.2%) on income above that cap. If your move involves a salary change that crosses this threshold, the savings can be significant."/></>}><Toggle options={[{value:"dollar",label:"$/mo"},{value:"pct",label:"% salary"}]} value={ficaMode} onChange={setFicaMode}/>{ficaMode==="dollar"?<Field label="FICA Savings" prefix="$" suffix="/mo" value={ficaDollar} onChange={setFicaDollar}/>:<><Field label="FICA Rate" suffix="%" value={ficaPct} onChange={setFicaPct}/><Field label="Base Salary" prefix="$" suffix="/yr" value={ficaBaseSalary} onChange={setFicaBaseSalary} hint={ficaBaseSalary>0?`= ${money((ficaPct/100)*ficaBaseSalary/12)}/mo`:""}/></>}</Sec>
          <Sec title="Car Payoffs"><DynList items={carPayoffs} setItems={setCarPayoffs} defaultName="Car" addLabel="Add car"/></Sec>
          <Sec title="Other Offsets"><DynList items={otherOffsets} setItems={setOtherOffsets} defaultName="Offset" addLabel="Add offset"/></Sec></>}
          {sideTab==="income"&&<Sec title="Household Income"><Field label="Combined Monthly Take-Home" prefix="$" suffix="/mo" value={monthlyIncome} onChange={setMonthlyIncome} hint="After-tax income"/></Sec>}
          {sideTab==="expenses"&&<><div style={{padding:"10px 0 6px",fontSize:13,color:P.textSec,lineHeight:1.5}}>Ongoing expenses that <strong style={{color:P.amber}}>persist regardless</strong>.</div>{CATS.map(cat=><Sec key={cat.key} title={`${cat.icon} ${cat.label}`} open={false} badge={sm(expenses[cat.key]||[])}><DynList items={expenses[cat.key]||[]} setItems={items=>setExpCat(cat.key,items)} defaultName={cat.label} addLabel={`Add ${cat.label.toLowerCase()}`}/></Sec>)}</>}
        </>}
      </div>
    </div>

    {/* Mobile Bottom Tab Bar */}
    <div className="mob-bottom" style={{display:"none",position:"fixed",bottom:0,left:0,right:0,background:P.bgCard,borderTop:`1px solid ${P.border}`,padding:"6px 8px env(safe-area-inset-bottom,0px)",justifyContent:"space-around",zIndex:100,boxShadow:"0 -2px 12px rgba(0,0,0,.08)"}}>
      {mobileTabs.map(t=><button key={t.v} onClick={()=>onMobileTab(t.v)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,border:"none",background:"none",cursor:"pointer",padding:"6px 4px",minWidth:56,borderRadius:8,transition:"all .2s",backgroundColor:mobileTab===t.v?P.accentLight:"transparent"}}>
        <span style={{fontSize:18}}>{t.i}</span>
        <span style={{fontSize:10,fontWeight:700,color:mobileTab===t.v?P.accent:P.textMute,fontFamily:"'Plus Jakarta Sans'"}}>{t.l}</span>
      </button>)}
    </div>
  </div>;
}
