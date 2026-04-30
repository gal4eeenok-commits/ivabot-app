/* IvaBot Content Coverage v6.91 — adds hreflang parsing for precise geo detection (site-declared target region). Priority: hreflang → TLD → html lang → US default. */
(function() {
const{useState,useRef,useEffect,useCallback}=React;
console.log("[IvaBot] content-coverage.js v6.91 loaded");

/* ═══ CONFIG ═══ */
const USE_MOCK=false;
const SUPABASE_URL="https://empuzslozakbicmenxfo.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";
const CORS_PROXY=SUPABASE_URL+"/functions/v1/fetch-page";
const DFS_PROXY=SUPABASE_URL+"/functions/v1/dataforseo-proxy";
const COVERAGE_GPT=SUPABASE_URL+"/functions/v1/coverage-gpt";

/* ═══ MEMBER ID + CREDITS ═══ */
function getMemberId(){if(window.__memberId)return window.__memberId;if(window.__userId)return window.__userId;try{const sb=window.__supabase;if(sb){const key=Object.keys(localStorage).find(k=>k.includes('auth-token'));if(key){const data=JSON.parse(localStorage.getItem(key));if(data?.user?.id)return data.user.id;}}}catch(e){}return null;}
async function checkCoverageCredits(memberId){if(!memberId)return{ok:true};try{let res=await fetch(`${SUPABASE_URL}/rest/v1/usage?user_id=eq.${memberId}&select=coverage_used,coverage_limit`,{headers:{"Authorization":"Bearer "+SUPABASE_KEY,"apikey":SUPABASE_KEY}});let rows=res.ok?await res.json():[];if(rows.length===0){res=await fetch(`${SUPABASE_URL}/rest/v1/usage?member_id=eq.${memberId}&select=coverage_used,coverage_limit`,{headers:{"Authorization":"Bearer "+SUPABASE_KEY,"apikey":SUPABASE_KEY}});rows=res.ok?await res.json():[];}if(rows.length===0)return{ok:true};const{coverage_used,coverage_limit}=rows[0];if(coverage_limit&&coverage_limit>0&&coverage_used>=coverage_limit)return{ok:false,used:coverage_used,limit:coverage_limit};return{ok:true,used:coverage_used,limit:coverage_limit};}catch(e){console.error("[CC] checkCredits error:",e);return{ok:true};}}
async function trackCoverageUsage(memberId){if(!memberId){console.log("[CC] trackUsage: no memberId");return{success:false};}try{const isUUID=/^[0-9a-f]{8}-/.test(memberId);const rpcBody=isUUID?{p_user_id:memberId}:{p_member_id:memberId};const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_coverage_used`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+SUPABASE_KEY,"apikey":SUPABASE_KEY},body:JSON.stringify(rpcBody)});if(res.ok){const data=await res.json();console.log("[CC] trackUsage:",JSON.stringify(data));return data;}else{console.error("[CC] trackUsage HTTP",res.status);return{success:false};}}catch(e){console.error("[CC] trackUsage error:",e);return{success:false};}}
async function recordCoverageRun(memberId,url){try{const isUUID=/^[0-9a-f]{8}-/.test(memberId);const runBody=isUUID?{p_user_id:memberId,p_source_url:url||null}:{p_member_id:memberId,p_source_url:url||null};await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_coverage_run`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+SUPABASE_KEY,"apikey":SUPABASE_KEY},body:JSON.stringify(runBody)});console.log("[CC] run recorded");}catch(e){console.error("[CC] run record error:",e);}}

/* ═══ COLORS (identical to Core Audit + CB) ═══ */
const C={bg:"#FBF5FF",surface:"#ffffff",accent:"#6E2BFF",accentLight:"#f3f0fd",dark:"#151415",muted:"#928E95",border:"rgba(21,20,21,0.08)",borderMid:"rgba(21,20,21,0.12)",green:"#22C55E",red:"#EF4444",card:"#F0EAFF",cardBorder:"rgba(110,43,255,0.08)",numBg:"#6E2BFF",hoverBorder:"rgba(110,43,255,0.2)",hoverShadow:"0 0 0 1px rgba(110,43,255,0.2), 0 8px 32px rgba(110,43,255,0.1)"};

/* ═══ PRIMITIVES (1:1 from seo-tools.js) ═══ */
const Tip=({text,children})=>{const[s,setS]=useState(false);const ref=useRef(null);const[pos,setPos]=useState({above:true,alignRight:false});return(<span ref={ref} style={{position:"relative",display:"inline-flex",alignItems:"center"}} onMouseEnter={()=>{if(ref.current){const rect=ref.current.getBoundingClientRect();setPos({above:rect.top>160,alignRight:rect.left>window.innerWidth/2});}setS(true);}} onMouseLeave={()=>setS(false)}>{children}{s&&<span style={{position:"absolute",...(pos.above?{bottom:"calc(100% + 8px)"}:{top:"calc(100% + 8px)"}),...(pos.alignRight?{right:0}:{left:0}),background:C.surface,color:C.dark,padding:"10px 14px",borderRadius:10,fontSize:11,lineHeight:1.5,width:260,maxWidth:"85vw",zIndex:9999,fontWeight:400,boxShadow:"0 4px 24px rgba(0,0,0,0.14)",border:`1px solid ${C.border}`,pointerEvents:"none",whiteSpace:"normal",wordBreak:"break-word",textAlign:"left"}}>{text}</span>}</span>);};
const QM=({text})=>(<Tip text={text}><span style={{width:16,height:16,borderRadius:"50%",border:`1px solid ${C.borderMid}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:C.muted,cursor:"help",marginLeft:4,flexShrink:0,verticalAlign:"top",position:"relative",top:-1}}>?</span></Tip>);
/* Parse **bold** segments in text — returns React fragments */
const renderBoldText = (text) => {
  if (!text || typeof text !== "string") return text;
  if (!text.includes("**")) return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i} style={{ fontWeight: 700, color: C.dark }}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};
const CopyBtn=({text})=>{const[c,setC]=useState(false);return(<button onClick={()=>{navigator.clipboard?.writeText(text);setC(true);setTimeout(()=>setC(false),1500);}} style={{fontSize:10,fontWeight:600,color:c?"#9B7AE6":C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"2px 6px"}}>{c?"Copied!":"Copy"}</button>);};
const HoverCard=({children,style={}})=>(<div style={{borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,transition:"box-shadow 0.3s, border-color 0.3s",cursor:"default",...style}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.hoverBorder;e.currentTarget.style.boxShadow=C.hoverShadow;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>{children}</div>);
const SOCIAL_URLS={Facebook:"https://facebook.com",Instagram:"https://instagram.com",LinkedIn:"https://linkedin.com","X (Twitter)":"https://x.com",YouTube:"https://youtube.com",TikTok:"https://tiktok.com",Pinterest:"https://pinterest.com",Threads:"https://threads.net"};
const SocialBadge=({name,url})=>(<a href={url||SOCIAL_URLS[name]||"#"} target="_blank" rel="noopener noreferrer" style={{padding:"8px 14px",borderRadius:8,background:C.surface,border:`1px solid ${C.border}`,textDecoration:"none",display:"inline-block",transition:"border-color 0.2s, box-shadow 0.2s",cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.hoverBorder;e.currentTarget.style.boxShadow=C.hoverShadow;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}><span style={{fontSize:12,fontWeight:500,color:C.dark}}>{name}</span></a>);

const Fold=({title,children,open:d=false,borderColor,headerBg,titleColor,count})=>{const[o,setO]=useState(d);return(<div style={{borderRadius:12,border:`1px solid ${borderColor||C.border}`,overflow:"hidden",background:C.surface}}><button onClick={()=>setO(!o)} style={{width:"100%",padding:"14px 16px",background:headerBg||"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'DM Sans',sans-serif"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:titleColor||C.dark}}>{title}</span>{count!=null&&<span style={{fontSize:11,fontWeight:600,color:titleColor?"rgba(255,255,255,0.7)":C.muted,background:titleColor?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.5)",padding:"2px 8px",borderRadius:10}}>{count}</span>}</div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={titleColor||C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s ease",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></button><div style={{display:"grid",gridTemplateRows:o?"1fr":"0fr",opacity:o?1:0,transition:"grid-template-rows 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease"}}><div style={{overflow:"hidden"}}><div style={{padding:"0 16px 16px",borderTop:`1px solid ${borderColor||C.border}`}}>{children}</div></div></div></div>);};

const WorkingItem=({title,content})=>{const[o,setO]=useState(true);return(<div style={{borderRadius:10,border:`1px solid ${C.cardBorder}`,overflow:"hidden",background:C.surface}}><button onClick={()=>setO(!o)} style={{width:"100%",padding:"11px 14px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}><span style={{color:"#9B7AE6",flexShrink:0,fontSize:13,fontWeight:600,display:"flex",alignItems:"center"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B7AE6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span style={{fontSize:13,fontWeight:600,color:C.dark,flex:1,textAlign:"left"}}>{title}</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></button>{o&&<div style={{padding:"0 14px 14px",borderTop:`1px solid ${C.cardBorder}`}}><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>{content}</div></div>}</div>);};

const InfoBlock=({label,value,borderColor})=>{const renderLine=(line,i)=>{const hMatch=line.match(/^(H[1-3]):\s*(.*)/);if(hMatch){const lv=hMatch[1],text=hMatch[2];const hColorMap={H1:{color:"#6E2BFF",bg:"rgba(110,43,255,0.08)"},H2:{color:"#9B7AE6",bg:"rgba(155,122,230,0.08)"},H3:{color:"#B89CF0",bg:"rgba(184,156,240,0.12)"}};const hc=hColorMap[lv]||hColorMap.H2;const isBroken=text.includes("⚠");return(<div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:500,color:isBroken?C.accent:C.dark,padding:"2px 0"}}><span style={{fontSize:9,fontWeight:600,color:isBroken?C.accent:hc.color,background:isBroken?"rgba(110,43,255,0.08)":hc.bg,padding:"2px 5px",borderRadius:3,minWidth:22,textAlign:"center",flexShrink:0}}>{lv}</span><span>{text}</span></div>);}return<div key={i} style={{padding:"2px 0"}}>{line}</div>;};return(<div style={{padding:"10px 14px",borderRadius:8,background:C.surface,border:`1px solid ${borderColor||C.border}`}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:3}}>{label}</div><div style={{fontSize:13,fontWeight:500,color:C.dark,lineHeight:1.5}}>{typeof value==="string"?value.split("\n").map(renderLine):value}</div></div>);};

const PRIO={critical:{label:"Critical",color:"#6E2BFF",bg:"rgba(110,43,255,0.08)"},important:{label:"Important",color:"#9B7AE6",bg:"rgba(155,122,230,0.08)"},nice:{label:"Nice to have",color:"#B89CF0",bg:"rgba(184,156,240,0.08)"}};
const ProblemCard=({title,why,currentLabel,current,suggestions,sugLabel,showCopy=true,links,serpSnippet,soft,priority})=>{const[o,setO]=useState(false);const pr=PRIO[priority]||PRIO.important;return(<div style={{borderRadius:12,border:soft?"1px solid rgba(110,43,255,0.12)":"1px solid rgba(110,43,255,0.25)",overflow:"hidden",background:C.surface}}><button onClick={()=>setO(!o)} style={{width:"100%",padding:"13px 16px",background:C.surface,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:"'DM Sans',sans-serif"}}><div style={{width:6,height:6,borderRadius:"50%",background:pr.color,flexShrink:0}}/><span style={{fontSize:13,fontWeight:600,color:C.dark,flex:1,textAlign:"left"}}>{title}</span><span style={{fontSize:9,fontWeight:600,color:pr.color,background:pr.bg,padding:"3px 8px",borderRadius:6,textTransform:"uppercase",letterSpacing:"0.5px",flexShrink:0}}>{pr.label}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></button>{o&&(<div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.cardBorder}`}}><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>{serpSnippet&&<SerpSnippet {...serpSnippet}/>}{current&&(typeof current==="string"?<InfoBlock label={currentLabel||"Current"} value={current} borderColor="rgba(110,43,255,0.15)"/>:<div style={{padding:"10px 14px",borderRadius:8,background:C.surface,border:"1px solid rgba(110,43,255,0.15)"}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:6}}>{currentLabel||"Current"}</div>{current}</div>)}{why&&<div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 12px",borderRadius:8,background:soft?"rgba(184,156,240,0.06)":"rgba(110,43,255,0.04)",border:`1px solid ${soft?"rgba(184,156,240,0.12)":"rgba(110,43,255,0.1)"}`}}><div style={{width:7,height:7,borderRadius:"50%",background:pr.color,flexShrink:0,marginTop:4}}/><span style={{fontSize:11.5,color:C.dark,lineHeight:1.5}}>{renderBoldText(why)}</span></div>}{suggestions?.length>0&&<div><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:6}}>{sugLabel||"Suggested"}</div><div style={{display:"flex",flexDirection:"column",gap:5}}>{suggestions.map((s,i)=>showCopy?(<HoverCard key={i} style={{padding:"9px 12px"}}><span style={{fontSize:12.5,color:C.dark,fontWeight:500,display:"block",marginBottom:4}}>{s}</span><CopyBtn text={s}/></HoverCard>):(<div key={i} style={{padding:"9px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,fontSize:12.5,color:C.dark,fontWeight:500}}>{s}</div>))}</div></div>}{links?.length>0&&<div><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:6}}>Learn more</div>{links.map((l,i)=>(<a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:12,color:C.accent,marginBottom:4,textDecoration:"none"}}>{l.label} →</a>))}</div>}</div></div>)}</div>);};

const SerpSnippet=({url,title,desc,hideDesc})=>{let displayUrl=url||"";try{const u=new URL(url);displayUrl=u.hostname+(u.pathname==="/"?"":u.pathname);}catch(e){}const truncTitle=title?(title.length>60?title.slice(0,57)+"...":title):"No title set";const truncDesc=desc?(desc.length>160?desc.slice(0,157)+"...":desc):"No description set";return(<div style={{padding:"14px 16px",borderRadius:10,background:C.surface,border:`1px solid ${C.cardBorder}`}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.5px"}}>Google Search Preview</div><div style={{padding:"12px 14px",borderRadius:8,background:"#fff",border:"1px solid rgba(21,20,21,0.06)"}}><div style={{fontSize:11,color:"#202124",marginBottom:2,display:"flex",alignItems:"center",gap:6}}><div style={{width:18,height:18,borderRadius:"50%",background:"rgba(21,20,21,0.06)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,fontWeight:700,color:C.muted}}>{(displayUrl[0]||"?").toUpperCase()}</span></div><span style={{color:"#4d5156",fontSize:11}}>{displayUrl}</span></div><div style={{fontSize:16,color:"#1a0dab",fontWeight:400,lineHeight:1.3,marginBottom:hideDesc?0:3,cursor:"pointer"}}>{truncTitle}</div>{!hideDesc&&<div style={{fontSize:12,color:"#4d5156",lineHeight:1.5}}>{truncDesc}</div>}</div></div>);};

/* Bot bubbles */
const BL=({s=16})=>(<svg width={s} height={Math.round(s*0.81)} viewBox="0 0 66 58" fill="none" style={{flexShrink:0,opacity:0.35}}><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill="#6E2BFF"/><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill="#6E2BFF"/></svg>);
const BotLogo=()=><BL s={16}/>;
const UA=({n})=><div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{(n||"U")[0].toUpperCase()}</span></div>;
const BB=({children})=><div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"90%",alignSelf:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`,fontSize:13,color:C.dark,lineHeight:1.5}}>{children}</div></div>;
const UB=({children,n})=><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",maxWidth:"80%",alignSelf:"flex-end"}}><div style={{marginBottom:3,marginRight:2}}><UA n={n}/></div><div style={{padding:"8px 14px",borderRadius:"12px 4px 12px 12px",background:C.accent,fontSize:13,color:"#fff"}}>{children}</div></div>;
const BotNote=({text,inline})=>inline?(<div style={{fontSize:11.5,color:C.muted,lineHeight:1.5,padding:"4px 0"}}>{text}</div>):(<div className="reveal" style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",marginBottom:8}}><BotLogo/><span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{text}</span></div>);

const useIsMobile=()=>{const[m,sm]=useState(window.innerWidth<1024);useEffect(()=>{const h=()=>sm(window.innerWidth<1024);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};
const LBar=({step,total,text})=>{const p=((step+1)/total)*100;return(<div style={{padding:"14px 16px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:500,color:C.dark}}>{text}</span><span style={{fontSize:11,fontWeight:600,color:C.accent}}>{Math.round(p)}%</span></div><div style={{height:4,background:"rgba(110,43,255,0.08)",borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",background:C.accent,borderRadius:100,width:`${p}%`,transition:"width 0.5s ease"}}/></div></div>);};
const MobileTab=({active,onSwitch,hasReport})=>{if(!hasReport)return null;return<div style={{display:"flex",gap:0,background:"rgba(21,20,21,0.04)",borderRadius:10,padding:3,margin:"0 16px 8px"}}><button onClick={()=>onSwitch("chat")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="chat"?C.surface:"transparent",color:active==="chat"?C.dark:C.muted,boxShadow:active==="chat"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Chat</button><button onClick={()=>onSwitch("report")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="report"?C.surface:"transparent",color:active==="report"?C.dark:C.muted,boxShadow:active==="report"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Report</button></div>;};

/* ═══ RANKINGS TABLE ═══ */
const fmtVol=(v)=>{if(!v)return"—";if(v>=1000000)return(v/1000000).toFixed(1).replace(/\.0$/,"")+"M";if(v>=1000)return(v/1000).toFixed(1).replace(/\.0$/,"")+"K";return v.toLocaleString();};
const NicheBadge=()=><Tip text="This keyword has fewer than 10 monthly searches in Google. This is normal for branded or highly specific terms — your page may still rank well for it."><span style={{fontSize:9,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"2px 6px",borderRadius:4,fontWeight:500,cursor:"help"}}>&lt; 10</span></Tip>;
const KdBadge=({d})=>{const label=d==null?"low":d<30?"low":d<60?"medium":"high";return<span style={{fontSize:9,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"2px 6px",borderRadius:4,fontWeight:500}}>{label}</span>;};
const LowBadge=()=><KdBadge d={null}/>;
const RankingsTable=({rows,emptyMsg})=>(<div style={{background:C.surface,borderRadius:10,padding:"4px 14px",border:`1px solid ${C.cardBorder}`,overflow:"visible"}}><table style={{width:"100%",minWidth:380,borderCollapse:"collapse",fontSize:12.5}}><thead><tr style={{borderBottom:`1px solid ${C.border}`}}><th style={{textAlign:"left",padding:"8px 0",color:C.muted,fontWeight:500,fontSize:11.5}}>Keyword</th><th style={{textAlign:"center",padding:"8px 4px",color:C.muted,fontWeight:500,fontSize:11.5,width:50,whiteSpace:"nowrap"}}>Pos. <QM text="Your page's position in Google search results for this keyword. Position 1 = top result. Based on your target region."/></th><th style={{textAlign:"right",padding:"8px 4px",color:C.muted,fontWeight:500,fontSize:11.5,width:70,whiteSpace:"nowrap"}}>Vol. <QM text="Monthly search volume — how many times per month people search this keyword in Google."/></th><th style={{textAlign:"right",padding:"8px 0",color:C.muted,fontWeight:500,fontSize:11.5,width:50,whiteSpace:"nowrap"}}>KD <QM text="Keyword difficulty — how hard it is to rank in the top 10. Low = easy to rank, medium = moderate competition, high = very competitive."/></th></tr></thead><tbody>{rows&&rows.length>0?rows.map((r,i)=>(<tr key={i} style={{borderBottom:i<rows.length-1?`1px solid rgba(21,20,21,0.04)`:"none"}}><td style={{padding:"10px 8px 10px 0",color:C.dark,fontWeight:500}}>{r.keyword}</td><td style={{textAlign:"center",padding:"10px 4px"}}>{r.position!=null?(<span style={{background:r.position<=3?"rgba(110,43,255,0.08)":"rgba(21,20,21,0.04)",color:r.position<=3?C.accent:C.muted,fontWeight:600,padding:"3px 10px",borderRadius:8,fontSize:12}}>{r.position}</span>):<Tip text="Position data unavailable — this keyword may be too niche for automated tracking. Your page could still rank for it."><span style={{color:C.muted,fontSize:10,background:"rgba(21,20,21,0.03)",padding:"3px 8px",borderRadius:6,cursor:"help"}}>—</span></Tip>}</td><td style={{textAlign:"right",padding:"10px 4px",whiteSpace:"nowrap"}}>{r.volume!=null&&r.volume>0?<span style={{color:C.dark,fontSize:12}}>{fmtVol(r.volume)}</span>:<NicheBadge/>}</td><td style={{textAlign:"right",padding:"10px 0",whiteSpace:"nowrap"}}><KdBadge d={r.difficulty}/></td></tr>)):<tr><td colSpan={4} style={{padding:"14px 0",color:C.muted,fontSize:12,textAlign:"center"}}>{emptyMsg||"No data available yet."}</td></tr>}</tbody></table></div>);

const Btn=({text,onClick,primary,disabled:d})=><button onClick={d?undefined:onClick} style={{padding:"9px 20px",borderRadius:10,border:primary?"none":`1px solid ${C.borderMid}`,background:primary?C.accent:C.surface,color:primary?"#fff":C.dark,fontSize:13,fontWeight:600,cursor:d?"default":"pointer",fontFamily:"'DM Sans',sans-serif",opacity:d?0.4:1,pointerEvents:d?"none":"auto"}} onMouseEnter={e=>{if(!primary&&!d){e.currentTarget.style.background=C.accentLight;e.currentTarget.style.borderColor=C.hoverBorder;}}} onMouseLeave={e=>{if(!primary&&!d){e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.borderMid;}}}>{text}</button>;

function valUrl(raw){let s=raw.trim();if(!s)return{ok:false,e:"Paste a URL to start."};const m=s.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);if(m)s=m[0];else{const d=s.match(/[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*/);if(d)s="https://"+d[0];else return{ok:false,e:"Need a URL like https://example.com"};}s=s.replace(/\s+/g,"");if(!s.startsWith("http"))s="https://"+s;try{const u=new URL(s);if(!u.hostname.includes("."))return{ok:false,e:"Not valid."};return{ok:true,url:u.href};}catch{return{ok:false,e:"Not valid."};}}

/* ═══ DataForSEO geo/language detection ═══
   Detects target country + language from URL TLD + HTML lang attribute.
   This is CRITICAL — without it, DFS defaults to US/English and Pos. = "—" for non-US sites.
*/
function detectLocale(url, htmlLang, hreflang) {
  // Mapping: TLD → DataForSEO location_code (Google country)
  // Full list: https://api.dataforseo.com/v3/serp/google/locations
  const tldToLoc = {
    "ro": { loc: 2642, lang: "ro" },  // Romania
    "de": { loc: 2276, lang: "de" },  // Germany
    "fr": { loc: 2250, lang: "fr" },  // France
    "es": { loc: 2724, lang: "es" },  // Spain
    "it": { loc: 2380, lang: "it" },  // Italy
    "nl": { loc: 2528, lang: "nl" },  // Netherlands
    "pl": { loc: 2616, lang: "pl" },  // Poland
    "pt": { loc: 2620, lang: "pt-PT" },  // Portugal
    "br": { loc: 2076, lang: "pt-BR" },  // Brazil
    "ru": { loc: 2643, lang: "ru" },  // Russia
    "ua": { loc: 2804, lang: "uk" },  // Ukraine
    "tr": { loc: 2792, lang: "tr" },  // Turkey
    "se": { loc: 2752, lang: "sv" },  // Sweden
    "no": { loc: 2578, lang: "no" },  // Norway
    "dk": { loc: 2208, lang: "da" },  // Denmark
    "fi": { loc: 2246, lang: "fi" },  // Finland
    "cz": { loc: 2203, lang: "cs" },  // Czechia
    "gr": { loc: 2300, lang: "el" },  // Greece
    "hu": { loc: 2348, lang: "hu" },  // Hungary
    "at": { loc: 2040, lang: "de" },  // Austria
    "ch": { loc: 2756, lang: "de" },  // Switzerland (German default)
    "be": { loc: 2056, lang: "nl" },  // Belgium (Dutch default)
    "uk": { loc: 2826, lang: "en" },  // UK
    "co.uk": { loc: 2826, lang: "en" },  // UK
    "au": { loc: 2036, lang: "en" },  // Australia
    "ca": { loc: 2124, lang: "en" },  // Canada
    "in": { loc: 2356, lang: "en" },  // India
    "ie": { loc: 2372, lang: "en" },  // Ireland
    "nz": { loc: 2554, lang: "en" },  // New Zealand
    "za": { loc: 2710, lang: "en" },  // South Africa
    "mx": { loc: 2484, lang: "es" },  // Mexico
    "ar": { loc: 2032, lang: "es" },  // Argentina
    "jp": { loc: 2392, lang: "ja" },  // Japan
    "kr": { loc: 2410, lang: "ko" },  // South Korea
    "cn": { loc: 2156, lang: "zh-CN" },  // China
    "tw": { loc: 2158, lang: "zh-TW" },  // Taiwan
  };
  // Lang code → DataForSEO location_code (used when TLD is .com/.net/.org but lang is set)
  const langToLoc = {
    "ro": { loc: 2642, lang: "ro" },
    "de": { loc: 2276, lang: "de" },
    "fr": { loc: 2250, lang: "fr" },
    "es": { loc: 2724, lang: "es" },
    "it": { loc: 2380, lang: "it" },
    "nl": { loc: 2528, lang: "nl" },
    "pl": { loc: 2616, lang: "pl" },
    "pt": { loc: 2620, lang: "pt-PT" },
    "ru": { loc: 2643, lang: "ru" },
    "uk": { loc: 2804, lang: "uk" },
    "tr": { loc: 2792, lang: "tr" },
    "sv": { loc: 2752, lang: "sv" },
    "no": { loc: 2578, lang: "no" },
    "da": { loc: 2208, lang: "da" },
    "fi": { loc: 2246, lang: "fi" },
    "cs": { loc: 2203, lang: "cs" },
    "el": { loc: 2300, lang: "el" },
    "hu": { loc: 2348, lang: "hu" },
    "ja": { loc: 2392, lang: "ja" },
    "ko": { loc: 2410, lang: "ko" },
    "zh": { loc: 2156, lang: "zh-CN" },
  };
  let location_code = 2840;  // United States default
  let language_code = "en";
  let source = "default";

  /* v6.91: Step 0 — hreflang country code (most reliable signal — site self-declares target region) */
  /* hreflang format: "ro-RO", "en-US", "de-AT", "x-default" — we extract the country code part */
  const countryToLoc = {
    "ro": { loc: 2642, lang: "ro" }, "de": { loc: 2276, lang: "de" }, "fr": { loc: 2250, lang: "fr" },
    "es": { loc: 2724, lang: "es" }, "it": { loc: 2380, lang: "it" }, "nl": { loc: 2528, lang: "nl" },
    "pl": { loc: 2616, lang: "pl" }, "pt": { loc: 2620, lang: "pt-PT" }, "br": { loc: 2076, lang: "pt-BR" },
    "ru": { loc: 2643, lang: "ru" }, "ua": { loc: 2804, lang: "uk" }, "tr": { loc: 2792, lang: "tr" },
    "se": { loc: 2752, lang: "sv" }, "no": { loc: 2578, lang: "no" }, "dk": { loc: 2208, lang: "da" },
    "fi": { loc: 2246, lang: "fi" }, "cz": { loc: 2203, lang: "cs" }, "gr": { loc: 2300, lang: "el" },
    "hu": { loc: 2348, lang: "hu" }, "at": { loc: 2040, lang: "de" }, "ch": { loc: 2756, lang: "de" },
    "be": { loc: 2056, lang: "nl" }, "gb": { loc: 2826, lang: "en" }, "uk": { loc: 2826, lang: "en" },
    "us": { loc: 2840, lang: "en" }, "au": { loc: 2036, lang: "en" }, "ca": { loc: 2124, lang: "en" },
    "in": { loc: 2356, lang: "en" }, "ie": { loc: 2372, lang: "en" }, "nz": { loc: 2554, lang: "en" },
    "za": { loc: 2710, lang: "en" }, "mx": { loc: 2484, lang: "es" }, "ar": { loc: 2032, lang: "es" },
    "jp": { loc: 2392, lang: "ja" }, "kr": { loc: 2410, lang: "ko" }, "cn": { loc: 2156, lang: "zh-CN" },
    "tw": { loc: 2158, lang: "zh-TW" },
  };
  if (hreflang) {
    const hrParts = hreflang.toLowerCase().split(/[-_]/);
    /* hreflang can be just "ro" (lang only) OR "ro-ro" (lang-country). Country is more reliable. */
    if (hrParts.length >= 2 && countryToLoc[hrParts[1]]) {
      location_code = countryToLoc[hrParts[1]].loc;
      language_code = countryToLoc[hrParts[1]].lang;
      source = "hreflang:" + hreflang;
    } else if (hrParts.length === 1 && countryToLoc[hrParts[0]]) {
      location_code = countryToLoc[hrParts[0]].loc;
      language_code = countryToLoc[hrParts[0]].lang;
      source = "hreflang-lang:" + hrParts[0];
    }
  }

  // Step 1: Try TLD (most reliable for ccTLDs)
  if (source === "default") {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    // Check 2-part TLD first (.co.uk, .co.jp, etc.)
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      const twoPart = parts.slice(-2).join(".");
      if (tldToLoc[twoPart]) { location_code = tldToLoc[twoPart].loc; language_code = tldToLoc[twoPart].lang; source = "tld:" + twoPart; }
    }
    if (source === "default") {
      const tld = parts[parts.length - 1];
      if (tldToLoc[tld]) { location_code = tldToLoc[tld].loc; language_code = tldToLoc[tld].lang; source = "tld:" + tld; }
    }
  } catch(e){}
  }
  // Step 2: HTML lang fallback (when TLD is .com/.net/.org/etc.)
  if (source === "default" && htmlLang) {
    const langKey = htmlLang.toLowerCase().split(/[-_]/)[0];
    if (langToLoc[langKey]) { location_code = langToLoc[langKey].loc; language_code = langToLoc[langKey].lang; source = "lang:" + langKey; }
  }
  console.log(`[CC] detectLocale: url=${url} htmlLang=${htmlLang} hreflang=${hreflang} → loc=${location_code} lang=${language_code} (source=${source})`);
  return { location_code, language_code };
}

/* ═══ HTML PARSER — extended from Core Audit parseSEO ═══ */
function parseCoverage(rawHtml, pageUrl) {
  const decodeHTML = (s) => {
    if (typeof s !== "string" || !s) return s;
    if (!s.includes("&")) return s;
    const ta = document.createElement("textarea");
    ta.innerHTML = s;
    return ta.value;
  };
  const r = {};
  let normalized = pageUrl.trim().replace(/\s+/g, "");
  if (!normalized.startsWith("http")) normalized = "https://" + normalized;
  r.url = normalized.replace(/\?.*$/, "");
  let hostname = ""; try { hostname = new URL(normalized).hostname.replace(/^www\./, ""); } catch(e){}
  r.hostname = hostname;

  // Detect HTML lang attribute (e.g. <html lang="ro">) — used for DataForSEO geo/lang targeting
  const langMatch = rawHtml.match(/<html[^>]*\blang\s*=\s*["']([a-zA-Z]{2,3}(?:[-_][a-zA-Z]{2,4})?)["']/i);
  r.html_lang = langMatch ? langMatch[1].toLowerCase().split(/[-_]/)[0] : null;

  /* v6.91: Parse hreflang tags — most precise geo signal (site self-declares target region per page) */
  /* Format: <link rel="alternate" hreflang="ro-RO" href="..." /> */
  /* We find the hreflang whose href best matches the current pageUrl */
  r.hreflang = null;
  try {
    const hreflangRegex = /<link[^>]*\brel\s*=\s*["']alternate["'][^>]*\bhreflang\s*=\s*["']([^"']+)["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
    const hreflangRegex2 = /<link[^>]*\bhreflang\s*=\s*["']([^"']+)["'][^>]*\brel\s*=\s*["']alternate["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
    const found = [];
    let m;
    while ((m = hreflangRegex.exec(rawHtml)) !== null) found.push({ lang: m[1], href: m[2] });
    while ((m = hreflangRegex2.exec(rawHtml)) !== null) found.push({ lang: m[1], href: m[2] });
    if (found.length > 0) {
      const normalizedPage = normalized.replace(/\/$/, "").toLowerCase();
      /* Try exact match first */
      const exact = found.find(h => h.href.replace(/\/$/, "").toLowerCase() === normalizedPage);
      if (exact && exact.lang.toLowerCase() !== "x-default") {
        r.hreflang = exact.lang;
      } else {
        /* Try match by URL contains hreflang code (e.g. /ro/ in URL → match ro-RO) */
        for (const h of found) {
          if (h.lang.toLowerCase() === "x-default") continue;
          const langCode = h.lang.toLowerCase().split(/[-_]/)[0];
          if (normalizedPage.includes("/" + langCode + "/") || normalizedPage.endsWith("/" + langCode)) {
            r.hreflang = h.lang;
            break;
          }
        }
        /* If still nothing — use first non-default hreflang (assumes single-region site) */
        if (!r.hreflang) {
          const firstReal = found.find(h => h.lang.toLowerCase() !== "x-default");
          if (firstReal && found.length === 1) r.hreflang = firstReal.lang;
        }
      }
    }
  } catch(e) { console.log("[CC] hreflang parse error:", e); }

  let html = rawHtml.replace(/\\"/g,'"').replace(/\\</g,'<').replace(/\\>/g,'>').replace(/\\[nrt]/g,' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');

  // Title + Description
  const mt = html.match(/<title[^>]*>(.*?)<\/title>/i);
  r.title = mt ? decodeHTML(mt[1].trim()) : "";
  r.title_missing = !r.title;
  r.title_length = r.title.length;
  r.title_too_short = r.title.length > 0 && r.title.length < 30;
  r.title_too_long = r.title.length > 90;
  const titleParts = r.title.split(/\s*[|–—-]\s*/).map(p => p.trim().toLowerCase()).filter(Boolean);
  r.title_has_repeated_brand = titleParts.length >= 2 && new Set(titleParts).size < titleParts.length;

  const md = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  r.desc = md ? decodeHTML(md[1].trim()) : "";
  r.desc_missing = !r.desc;
  r.desc_length = r.desc.length;

  // Headings
  const isTemplate = (t) => /^\{.*\}$/.test(t) || /^\{\{.*\}\}$/.test(t) || /^\[.*\]$/.test(t);
  const exH = (h, lv) => [...h.matchAll(new RegExp(`<h${lv}[^>]*>([\\s\\S]*?)<\\/h${lv}>`, 'gi'))].map(m => decodeHTML(m[1].replace(/<[^>]+>/g,'').trim())).filter(t => t && t.length > 1);
  r.h1 = exH(html,1).filter(t => !isTemplate(t));
  r.h1_broken = exH(html,1).filter(t => isTemplate(t));
  r.h2 = exH(html,2);
  r.h3 = exH(html,3);

  // Body text (paragraphs only — for keyword density)
  const bodyParagraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim()).filter(t => t.length > 10);
  r.body_text = bodyParagraphs.join(" ");

  // Full visible text (for semantic coverage check)
  r.visible_text = html.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  r.char_count = r.visible_text.length;

  // Social links
  const socials = [["Facebook",/facebook\.com/i],["Instagram",/instagram\.com/i],["LinkedIn",/linkedin\.com/i],["X (Twitter)",/(?:twitter\.com|x\.com)/i],["YouTube",/youtube\.com|youtu\.be/i],["TikTok",/tiktok\.com/i],["Pinterest",/pinterest\.com/i]];
  r.social = [];
  const allHrefs = [...rawHtml.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  socials.forEach(([name, pat]) => {
    const found = allHrefs.find(h => pat.test(h) && !/share|sharer|intent|dialog/i.test(h));
    if (found) r.social.push({ name, url: found });
  });

  // CTA detection (from Core Audit)
  const CTA_TOKENS = ["buy","add to cart","checkout","contact","sign up","get started","book","subscribe","download","learn more","shop now","order now","request","pricing","try","start"];
  r.has_cta = false; r.cta_text = "";
  for (const m of html.matchAll(/<(a|button)([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    let v = (m[3]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    if(!v || v.length > 60 || v.length < 2 || /[{}<>\[\]="]/i.test(v)) continue;
    if(CTA_TOKENS.some(k=>v.toLowerCase().includes(k)) || /\b(btn|button|cta)\b/i.test(m[2]||"")) { r.has_cta=true; r.cta_text=v; break; }
  }

  // Trust signals detection (from Typebot single_trust.js)
  // Contacts
  r.has_contacts = /(?:mailto:|tel:|phone|email|contact@|info@|\+\d{1,3}[\s-]?\(?\d)/i.test(html);
  // FAQ
  r.has_faq = /<(section|div)[^>]*(?:id|class)=["'][^"']*faq[^"']*["']/i.test(html) || /<h[2-3][^>]*>.*?(?:FAQ|Frequently Asked|Questions).*?<\/h[2-3]>/i.test(html);
  // Testimonials
  r.has_testimonials = /<(section|div)[^>]*(?:id|class)=["'][^"']*(?:testimonial|review|feedback)[^"']*["']/i.test(html) || /(?:testimonial|customer\s*review|client\s*feedback|what\s*(?:our|people)\s*say)/i.test(r.visible_text.slice(0,5000));

  // Summary for GPT
  const cleanKw = (v) => v && v.length > 2 && !/^\{.*\}$/.test(v) && !/^[^a-zA-Z]*$/.test(v) ? v : null;
  r.primary_keyword = cleanKw(r.h1?.[0]) || cleanKw(r.title) || "";
  r.summary = `URL: ${r.url}\nTitle: ${r.title}\nDescription: ${r.desc}\nH1: ${r.h1.join(", ")||"missing"}\nH2: ${r.h2.slice(0,10).join(", ")||"none"}\nH3: ${r.h3.slice(0,8).join(", ")||"none"}\nInternal links: ${(allHrefs.filter(h => { try { return new URL(h, r.url).hostname === hostname; } catch(e) { return /^\//.test(h); } }).length)}\nHas CTA: ${r.has_cta}${r.cta_text ? " ("+r.cta_text+")" : ""}\nSocial: ${r.social.map(s => typeof s === "string" ? s : s.name).join(", ")||"none"}\nHas contacts: ${r.has_contacts}\nHas FAQ: ${r.has_faq}\nHas testimonials: ${r.has_testimonials}\nBody chars: ${r.char_count}`;

  return r;
}

/* ═══ BODY KEYWORD DENSITY — ported from Typebot single_body_density.js ═══ */
function analyzeBodyDensity(bodyText, keywords) {
  const scanChars = bodyText.length;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const STOP_EN = new Set(["a","an","the","and","or","but","of","in","on","to","for","from","with","as","is","are","was","were","be","been","being","it","its","at","by","if","not","no","so","than","that","this","into","over","under","up","down","out","off","via","per","about","can","could","should","would","may","might","must","do","does","did","have","has","had","you","your","we","our","they","their","he","she","him","her","his","them","i","me","my"]);
  const STOP_RU = new Set(["и","в","на","по","к","с","у","о","от","до","за","из","во","не","да","но","или","же","что","так","как","для","при","над","без"]);
  const STOP = new Set([...STOP_EN, ...STOP_RU]);

  const countPhrase = (text, phrase) => {
    if (!text || !phrase) return 0;
    const m = text.toLowerCase().match(new RegExp(esc(phrase.toLowerCase()), "gi"));
    return m ? m.length : 0;
  };

  // Soft match: allow prepositions between keyword words (from CB v63 logic)
  const PREPS = new Set(["to","in","for","from","during","of","on","at","with","by","about","and","the","a","an","в","на","для","по","с","из","от","до","за","о","к"]);
  const countSoftPhrase = (text, phrase) => {
    if (!text || !phrase) return 0;
    const words = phrase.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length < 2) return countPhrase(text, phrase);
    // Build regex: each keyword word with optional preposition between
    const pattern = words.map(w => esc(w)).join("(?:\\s+(?:" + [...PREPS].map(esc).join("|") + "))?\\s+");
    const m = text.toLowerCase().match(new RegExp(pattern, "gi"));
    return m ? m.length : 0;
  };

  const countToken = (text, token) => {
    if (!text || !token || STOP.has(token.toLowerCase())) return 0;
    const m = text.match(new RegExp(`(?:^|[^\\p{L}\\p{N}])${esc(token)}(?=[^\\p{L}\\p{N}]|$)`, "giu"));
    return m ? m.length : 0;
  };

  // Body budget formula from Typebot
  function bodyBudget(chars) {
    if (chars <= 800) return { per: [1, 1], total: [1, 2] };
    if (chars <= 2000) return { per: [1, 2], total: [2, 3] };
    if (chars <= 3500) return { per: [1, 2], total: [3, 4] };
    if (chars <= 6000) return { per: [2, 3], total: [4, 6] };
    return { per: [2, 3], total: [5, 7] };
  }

  const B = bodyBudget(scanChars);
  const [low, high] = B.per;
  const [totalLow, totalHigh] = B.total;

  // Build occurrences
  const occurrences = [];
  for (const k of keywords) {
    const exact = countPhrase(bodyText, k);
    const soft = countSoftPhrase(bodyText, k);
    const effectiveCount = Math.max(exact, soft);
    if (exact > 0) occurrences.push(`• phrase "${k.toLowerCase()}" — appears ${exact} ${exact===1?"time":"times"}`);
    else if (soft > 0) occurrences.push(`• phrase "${k.toLowerCase()}" — appears ${soft} ${soft===1?"time":"times"} (with prepositions)`);
  }
  // Individual words
  const tokens = Array.from(new Set(keywords.flatMap(k => k.toLowerCase().split(/\s+/).filter(Boolean)).filter(t => !STOP.has(t))));
  for (const t of tokens) {
    const c = countToken(bodyText, t);
    if (c > 0) occurrences.push(`• word "${t}" — appears ${c} ${c===1?"time":"times"}`);
  }

  const totalExact = keywords.reduce((s, k) => s + Math.max(countPhrase(bodyText, k), countSoftPhrase(bodyText, k)), 0);

  let status = "good";
  if (!scanChars) status = "no_body";
  else if (totalExact === 0) status = "missing";
  else if (totalExact < low) status = "low";
  else if (totalExact > totalHigh) status = "overused";

  return {
    scanChars,
    totalExact,
    occurrences: occurrences.length ? occurrences.join("\n") : "No keyword phrases detected in the body text.",
    status,
    budgetPer: B.per,
    budgetTotal: B.total,
    // Rank booleans (for full balance)
    bodyFound: scanChars > 0,
    bodyMissing: totalExact === 0,
    bodyLow: totalExact > 0 && totalExact < low,
    bodyGood: totalExact >= low && totalExact <= totalHigh,
    bodyOverused: totalExact > totalHigh,
  };
}

/* ═══ KEYWORD VALIDATION — clean user input ═══ */
function validateUserKeywords(raw) {
  const parts = raw.split(",").map(s => s.trim()).filter(Boolean);
  const cleaned = [];
  const errors = [];
  for (const p of parts) {
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length < 2) { errors.push(`"${p}" — needs at least 2 words`); continue; }
    if (words.length > 4) { errors.push(`"${p}" — max 3-4 words per phrase`); continue; }
    cleaned.push(p);
  }
  return { keywords: cleaned.slice(0, 3), errors, valid: cleaned.length > 0 };
}

/* ═══ TITLE/DESC/HEADINGS KEYWORD ANALYSIS — ported from Typebot ═══ */
function analyzeTitleDescHeadings(parsed, keywords) {
  const STOP = new Set(["a","an","the","and","or","but","of","in","on","to","for","from","with","as","is","are","was","were","be","been","being","it","its","at","by","if","not","no","so","than","that","this","into","up","down","out","off","via","per","about","can","could","should","would","do","does","did","have","has","had","you","your","we","our","they","their","he","she","him","her","his","them","i","me","my","и","в","на","по","к","с","у","о","от","до","за","из","во","не","да","но","или","же","что","как","для","при"]);
  const norm = s => (s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const tokenizeNoStop = s => norm(s).split(" ").filter(w => w && !STOP.has(w));

  const countPhrase = (text, phrase) => {
    if (!text || !phrase) return 0;
    const m = norm(text).match(new RegExp(esc(norm(phrase)), "gi"));
    return m ? m.length : 0;
  };

  const labelFor = (area, kw) => {
    if (!kw) return "missing";
    const aNorm = norm(area), kNorm = norm(kw);
    if (aNorm.includes(kNorm)) return "exact";
    const kwTokens = tokenizeNoStop(kw);
    const areaTokens = new Set(tokenizeNoStop(area));
    if (kwTokens.length && kwTokens.every(t => areaTokens.has(t))) return "all_words";
    if (kwTokens.length && kwTokens.some(t => areaTokens.has(t))) return "some_words";
    return "missing";
  };

  const result = { title: {}, desc: {}, h1: {}, h2h3: {} };

  // --- TITLE analysis ---
  const title = parsed.title || "";
  const titleLen = title.length;
  const titleKwResults = keywords.map(kw => ({ keyword: kw, label: labelFor(title, kw), exact: countPhrase(title, kw) }));
  const titleHasExact = titleKwResults.some(r => r.exact > 0);
  const titleHasPartial = titleKwResults.some(r => r.label === "all_words" || r.label === "some_words");
  const titleExactSum = titleKwResults.reduce((s, r) => s + r.exact, 0);
  const titleOverused = titleExactSum >= 3 || titleKwResults.some(r => r.exact >= 2);

  // Duplicate words in title
  const titleWordMap = new Map();
  for (const w of tokenizeNoStop(title)) titleWordMap.set(w, (titleWordMap.get(w)||0) + 1);
  const titleDuplicates = [...titleWordMap.entries()].filter(([,c]) => c > 1);

  let titleCoverage = "none";
  if (titleHasExact && !titleDuplicates.length) titleCoverage = "strong";
  else if (titleHasExact || titleHasPartial) titleCoverage = "partial";

  result.title = {
    text: title, length: titleLen,
    kwResults: titleKwResults, coverage: titleCoverage,
    overused: titleOverused, duplicates: titleDuplicates,
    missing: !title,
    tooShort: titleLen > 0 && titleLen < 30,
    tooLong: titleLen > 90,
    occurrences: titleKwResults.map(r => `• "${r.keyword}" — ${r.label === "exact" ? `exact match (${r.exact}×)` : r.label === "all_words" ? "all words present (not exact)" : r.label === "some_words" ? "some words present" : "not found"}`).join("\n"),
    // Rank booleans for full balance
    strong: titleCoverage === "strong",
    overusedKw: titleOverused,
  };

  // --- DESCRIPTION analysis ---
  const desc = parsed.desc || "";
  const descLen = desc.length;
  const descKwResults = keywords.map(kw => ({ keyword: kw, label: labelFor(desc, kw) }));
  const descHasKw = descKwResults.some(r => r.label !== "missing");
  result.desc = {
    text: desc, length: descLen,
    kwResults: descKwResults, hasKeywords: descHasKw,
    missing: !desc,
    tooShort: descLen > 0 && descLen < 90,
    tooLong: descLen > 180,
    good: descLen >= 90 && descLen <= 180,
  };

  // --- H1 analysis ---
  const h1List = parsed.h1 || [];
  const h1Text = h1List.join(" ");
  const h1KwResults = keywords.map(kw => ({ keyword: kw, label: labelFor(h1Text, kw), exact: countPhrase(h1Text, kw) }));
  const h1HasExact = h1KwResults.some(r => r.exact > 0);
  const h1MatchesTitle = h1List.length === 1 && norm(h1List[0]) === norm(title);
  result.h1 = {
    list: h1List, kwResults: h1KwResults,
    missing: h1List.length === 0,
    tooLong: h1List.length > 0 && h1List[0].length > 80,
    matchesTitle: h1MatchesTitle,
    strong: h1HasExact,
    occurrences: h1KwResults.map(r => `• "${r.keyword}" — ${r.label === "exact" ? `found in H1` : r.label === "all_words" ? "all words present" : r.label === "some_words" ? "some words" : "not in H1"}`).join("\n"),
  };

  // --- H2/H3 analysis ---
  const h2Text = (parsed.h2 || []).join(" ");
  const h3Text = (parsed.h3 || []).join(" ");
  const h2h3Text = h2Text + " " + h3Text;
  const h2h3KwResults = keywords.map(kw => ({ keyword: kw, label: labelFor(h2h3Text, kw) }));
  const h2h3HasKw = h2h3KwResults.some(r => r.label !== "missing");
  result.h2h3 = {
    h2Count: (parsed.h2 || []).length, h3Count: (parsed.h3 || []).length,
    kwResults: h2h3KwResults, hasKeywords: h2h3HasKw,
    strong: h2h3HasKw,
  };

  return result;
}
function analyzeTrust(parsed, pageType) {
  const urlL = (parsed.url || "").toLowerCase();
  const topicL = pageType || "other";

  const isHomepage = urlL.replace(/^https?:\/\/[^/]+/,'').replace(/[#?].*$/,'').replace(/\/+$/,'') === "";
  const isProduct = /product|shop|store/.test(topicL);
  const isArticle = /article|blog/.test(topicL);
  const isAbout = /about/.test(topicL);
  const isContact = /contact/.test(topicL);
  const isPricing = /pricing/.test(topicL);
  const isCategory = /category/.test(topicL);
  const isDocs = /docs/.test(topicL);
  const isRecipe = /recipe/.test(topicL);
  const isCaseStudy = /case_study/.test(topicL);

  const trust = {
    contacts: { found: parsed.has_contacts, show: isHomepage || isAbout || isContact },
    socials: { found: parsed.social.length > 0, show: !isDocs, list: parsed.social },
    testimonials: { found: parsed.has_testimonials, show: isProduct || isPricing || isCaseStudy || isHomepage || isCategory },
    faq: { found: parsed.has_faq, show: isPricing || isProduct || isDocs || isHomepage || isCategory },
    cta: { found: parsed.has_cta, text: parsed.cta_text, show: isHomepage || isCategory || isPricing || isProduct || isCaseStudy || isArticle },
  };

  return trust;
}

/* ═══ AI READINESS — wraps window.AIReadiness module + maps to good/bad ═══ */
const AI_CHECK_LABELS = {
  schema: "Schema.org markup",
  faq: "FAQ schema",
  llms: "llms.txt file",
  bots: "AI crawlers access",
  qa: "Question patterns",
  og: "Open Graph tags",
  author: "Author information",
  dates: "Last updated date",
  citations: "Authoritative citations",
  statistics: "Statistics & data",
};

function analyzeAIReadiness(aiResult, pageType) {
  /* aiResult comes from window.AIReadiness.parse() — has score, checks, weights_used */
  const aiGood = [], aiBad = [];
  if (!aiResult || !aiResult.checks) return { score: 0, total: 0, aiGood, aiBad, weights: null };

  const checks = aiResult.checks;
  const weights = aiResult.weights_used || {};

  /* Helper: build "passed" boolean per check */
  const isPassed = {
    schema: checks.schema.found && checks.schema.malformed_blocks === 0,
    faq: checks.faq_schema.status === "good" || checks.faq_schema.status === "partial_match",
    llms: checks.llms_txt.found && checks.llms_txt.valid,
    bots: checks.ai_bots.all_allowed === true,
    qa: (checks.qa_patterns.total || 0) + (checks.qa_patterns.heading_questions || 0) >= 3,
    og: checks.open_graph.status === "complete" || checks.open_graph.status === "good",
    author: ["good", "partial", "org_only"].includes(checks.author.status),
    dates: checks.dates.status === "fresh",
    citations: (checks.citations.unique_hosts || 0) >= 1,
    statistics: (checks.statistics.total || 0) >= 5,
  };

  /* Articles need Person markup, not just org_only */
  if (pageType === "article" || pageType === "blog" || pageType === "blog_post") {
    isPassed.author = checks.author.status === "good" || checks.author.status === "partial";
  }

  /* Iterate all 10 checks but only include those with weight > 0 for this page type */
  const checkOrder = ["schema", "faq", "llms", "bots", "qa", "og", "author", "dates", "citations", "statistics"];
  for (const checkName of checkOrder) {
    const weight = weights[checkName] || 0;
    if (weight === 0) continue; /* not relevant for this page type */

    const passed = isPassed[checkName];
    const label = AI_CHECK_LABELS[checkName];

    if (passed) {
      aiGood.push({
        title: label,
        check: checkName,
        content: aiReadinessGoodContent(checkName, checks[mapCheckKey(checkName)]),
      });
    } else {
      aiBad.push({
        title: label,
        check: checkName,
        priority: aiReadinessPriority(checkName, weight),
        why: aiReadinessWhy(checkName, pageType),
        suggestions: aiReadinessSuggestions(checkName),
        links: aiReadinessLinks(checkName),
        showCopy: false,
      });
    }
  }

  return {
    score: aiResult.score,
    status: aiResult.status,
    pageType: aiResult.page_type,
    total: aiGood.length + aiBad.length,
    aiGood,
    aiBad,
    weights,
    breakdown: aiResult.breakdown,
  };
}

function mapCheckKey(checkName) {
  const map = { schema: "schema", faq: "faq_schema", llms: "llms_txt", bots: "ai_bots", qa: "qa_patterns", og: "open_graph", author: "author", dates: "dates", citations: "citations", statistics: "statistics" };
  return map[checkName] || checkName;
}

function aiReadinessPriority(checkName, weight) {
  /* Critical if check has high weight (>= 15), important if moderate (>= 8), nice if low */
  if (weight >= 15) return "critical";
  if (weight >= 8) return "important";
  return "nice";
}

function aiReadinessGoodContent(checkName, check) {
  /* Short status line shown in "Working Well" expandable item */
  switch (checkName) {
    case "schema":
      return <div style={{ fontSize: 12, color: C.muted }}>Found {check.valid_blocks} valid schema block{check.valid_blocks === 1 ? "" : "s"}: {(check.types || []).slice(0, 3).join(", ")}{check.types?.length > 3 ? "..." : ""}</div>;
    case "faq":
      return <div style={{ fontSize: 12, color: C.muted }}>FAQ schema matches {check.matched_questions} of {check.html_questions_count} questions on page</div>;
    case "llms":
      return <div style={{ fontSize: 12, color: C.muted }}>llms.txt found ({check.length} chars, {check.has_sections} sections)</div>;
    case "bots":
      return <div style={{ fontSize: 12, color: C.muted }}>All major AI crawlers can access this page (GPTBot, ClaudeBot, PerplexityBot, etc.)</div>;
    case "qa":
      return <div style={{ fontSize: 12, color: C.muted }}>Found {(check.total || 0) + (check.heading_questions || 0)} question patterns — AI tools love Q&A format</div>;
    case "og":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.og_count} Open Graph tags + {check.twitter_count} Twitter Card tags</div>;
    case "author":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.author_name ? `Author: ${check.author_name}` : "Author or organization markup found"}</div>;
    case "dates":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.date_modified ? `Last updated: ${String(check.date_modified).slice(0, 10)}` : "Date signals found"}</div>;
    case "citations":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.unique_hosts} unique authoritative source{check.unique_hosts === 1 ? "" : "s"} cited</div>;
    case "statistics":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.total} numbers and statistics in content — strong factual signal</div>;
  }
  return null;
}

function aiReadinessWhy(checkName, pageType) {
  /* Short "why this matters" — 1-2 sentences, with term definition in bold */
  const why = {
    schema: "**Schema.org is special code that tells AI what your page is about.** Without it, AI search tools may skip you when answering user questions.",
    faq: "**FAQ schema marks Q&A pairs on your page so AI can find them.** Pages with FAQ schema are more likely to be quoted in ChatGPT or Perplexity answers.",
    llms: "**llms.txt is a simple text file telling AI tools what's important on your site** (like robots.txt for AI). Adding it puts you ahead of 99% of websites.",
    bots: "**AI crawlers are bots like GPTBot and ClaudeBot that read your site for AI search.** If your robots.txt blocks them, ChatGPT and Perplexity won't recommend you.",
    qa: "**Question patterns are headings written as actual questions** (\"What is X?\", \"How to Y?\"). They match how users ask AI tools, so your page gets cited more often.",
    og: "**Open Graph tags control how your link looks when shared online** — title, description, preview image. Without them, AI tools may skip your page.",
    author: "**Author information is markup or visible text saying who wrote the page.** AI tools trust pages with clear authorship and rarely cite anonymous content.",
    dates: "**A \"last updated\" date shows AI when the page was last edited.** AI prefers fresh content — without this, your page looks outdated even if it isn't.",
    citations: "**Citations are external links to trusted sources** (.edu, .gov, well-known sites). They signal to AI that you do real research, increasing your chances of being cited.",
    statistics: "**Statistics are concrete numbers in your content** (like \"60% of users\" or \"$5 to start\"). AI loves quoting specific numbers more than vague claims.",
  };
  return why[checkName] || "";
}

function aiReadinessSuggestions(checkName) {
  /* Concrete actionable suggestions */
  const sug = {
    schema: ["Add Organization schema with your name, URL, logo, and description", "If you sell software/products, add SoftwareApplication or Product schema", "Add WebSite schema for your homepage", "Validate your markup with Google's Rich Results Test"],
    faq: ["Add a FAQ section to your page with real questions users ask", "Wrap each Q&A pair in FAQPage JSON-LD schema", "Make sure schema text matches the visible text exactly", "Validate with Google Rich Results Test"],
    llms: ["Create a /llms.txt file in your site root", "Format: # Site Name on first line, > Short description, then ## sections with key links", "See llmstxt.org for the spec and examples"],
    bots: ["Check your robots.txt file at /robots.txt", "Make sure it doesn't block GPTBot, ClaudeBot, PerplexityBot, Google-Extended, anthropic-ai, ChatGPT-User, OAI-SearchBot, CCBot", "If you want maximum AI visibility, allow all of these"],
    qa: ["Add 3+ heading-style questions to your page (e.g., \"What is X?\", \"How does Y work?\")", "Use H2 or H3 tags for questions", "Answer each question clearly in 1-3 sentences below"],
    og: ["Add og:title, og:description, og:image, og:type, og:url meta tags", "Image should be 1200×630 px for best preview results", "Also add Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image) — they control previews on Slack, Discord, iMessage, LinkedIn, X, and other apps"],
    author: ["Add Person schema with author name, url, optional image", "Or add visible byline like \"By [Name]\" near the top of articles", "Link to author bio page if possible"],
    dates: ["Add datePublished and dateModified to your Schema.org markup", "Update dateModified whenever you edit the page", "Show the date visibly on the page (\"Last updated: [date]\")"],
    citations: ["Link to 2-3 authoritative external sources (.gov, .edu, well-known industry sites)", "Cite specific studies, official documentation, or reputable publications", "Use full URLs (not shortened)"],
    statistics: ["Add at least 5 specific numbers, percentages, or stats to your content", "Use formats like \"60% of users\", \"$5 starts\", \"3x faster\", \"10,000 customers\"", "Cite the source for each statistic when possible"],
  };
  return sug[checkName] || [];
}

function aiReadinessLinks(checkName) {
  /* Official documentation + validators per check */
  const links = {
    schema: [
      { label: "Schema.org — getting started", url: "https://schema.org/docs/gs.html" },
      { label: "Google Rich Results Test (validator)", url: "https://search.google.com/test/rich-results" },
    ],
    faq: [
      { label: "Google guide: FAQ schema", url: "https://developers.google.com/search/docs/appearance/structured-data/faqpage" },
      { label: "Google Rich Results Test (validator)", url: "https://search.google.com/test/rich-results" },
    ],
    llms: [
      { label: "llms.txt — official spec", url: "https://llmstxt.org" },
    ],
    bots: [
      { label: "OpenAI: GPTBot crawler info", url: "https://platform.openai.com/docs/gptbot" },
      { label: "Anthropic: ClaudeBot crawler info", url: "https://support.anthropic.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler" },
    ],
    qa: [
      { label: "Google: how AI Overviews work", url: "https://blog.google/products/search/generative-ai-google-search-may-2024/" },
    ],
    og: [
      { label: "Open Graph protocol — official", url: "https://ogp.me" },
      { label: "Twitter Card validator", url: "https://cards-dev.twitter.com/validator" },
      { label: "Facebook Sharing Debugger", url: "https://developers.facebook.com/tools/debug/" },
    ],
    author: [
      { label: "Schema.org Person type", url: "https://schema.org/Person" },
      { label: "Google E-E-A-T guidelines", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
    ],
    dates: [
      { label: "Schema.org dateModified", url: "https://schema.org/dateModified" },
      { label: "Google: freshness signals", url: "https://developers.google.com/search/docs/appearance/structured-data/article" },
    ],
    citations: [
      { label: "Google E-E-A-T: trust signals", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
    ],
    statistics: [
      { label: "Google: helpful content guidelines", url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content" },
    ],
  };
  return links[checkName] || [];
}

/* ═══ SEMANTIC FILTER — from Typebot single_semantic.js ═══ */
function filterSemanticMissing(autocomplete, related, paa, visibleText) {
  const STOPWORDS = new Set(["a","an","the","and","or","but","if","for","from","to","of","in","on","at","by","with","as","is","are","was","were","be","been","being","it","its","so","not","no","very","can","could","should","would","may","might","must","do","does","did","have","has","had","you","your","we","our","they","their","he","she","him","her","his","them","i","me","my","s","t","re","ll","d","m","ve"]);
  const norm = s => (s||"").toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
  const tokenize = s => norm(s).split(" ").filter(w => w && !STOPWORDS.has(w));
  const escRx = s => s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

  const areaTokens = new Set(tokenize(visibleText));
  const areaLower = (visibleText||"").toLowerCase();

  const isCovered = (phrase) => {
    const p = (phrase||"").trim();
    if (!p) return false;
    if (new RegExp(escRx(p.toLowerCase())).test(areaLower)) return true;
    const toks = tokenize(p);
    return toks.length > 0 && toks.every(t => areaTokens.has(t));
  };

  return {
    autocomplete: (autocomplete||[]).filter(p => !isCovered(p)),
    related: (related||[]).filter(p => !isCovered(p)),
    paa: (paa||[]).filter(p => !isCovered(p)),
  };
}

/* ═══ HEADING LIST (from Core Audit — colored badges) ═══ */
const hColors = { H1: { color: "#6E2BFF", bg: "rgba(110,43,255,0.08)" }, H2: { color: "#9B7AE6", bg: "rgba(155,122,230,0.08)" }, H3: { color: "#B89CF0", bg: "rgba(184,156,240,0.12)" } };
const HL = ({ tags, lv }) => (<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{tags.map((h, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: C.dark }}><span style={{ fontSize: 9, fontWeight: 600, color: hColors[lv].color, background: hColors[lv].bg, padding: "2px 5px", borderRadius: 3, minWidth: 22, textAlign: "center" }}>{lv}</span>{typeof h === "string" ? h : h.text}</div>))}</div>);

/* ═══ COVERAGE SCORE CARD ═══ */
const CoverageScoreCard = ({ url, contentGood, contentBad, trustGood, trustBad, aiGood, aiBad }) => {
  const contentTotal = contentGood.length + contentBad.length;
  const trustTotal = trustGood.length + trustBad.length;
  const aiTotal = (aiGood?.length || 0) + (aiBad?.length || 0);
  const totalIssues = contentBad.length + trustBad.length + (aiBad?.length || 0);
  const contentPct = contentTotal > 0 ? Math.round((contentGood.length / contentTotal) * 100) : 0;
  const trustPct = trustTotal > 0 ? Math.round((trustGood.length / trustTotal) * 100) : 0;
  const aiPct = aiTotal > 0 ? Math.round(((aiGood?.length || 0) / aiTotal) * 100) : 0;
  return (<div className="reveal" style={{ display: "flex", gap: 16, marginBottom: 18, padding: 16, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}>
    <div style={{ width: 92, height: 92, flexShrink: 0, borderRadius: 14, background: C.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${C.cardBorder}` }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: C.dark }}>{totalIssues}</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: "#9B7AE6", marginTop: 1 }}>Issues</span>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>Content Coverage Score</span>
        <QM text="Your coverage score shows how well your page is optimized across three areas: Content & Keywords (target keywords in title, headings, body), Trust & Conversion (social proof, CTA, FAQ, contacts), and AI Readiness (signals for AI search tools like ChatGPT and Perplexity). Each area has its own progress bar." />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 8, wordBreak: "break-all" }}>{url}</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>Content & Keywords</span>
            <QM text="Content & Keywords checks how well your target keywords appear in title, description, headings, and body text — these are the basics search engines use to understand what your page is about." />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9B7AE6" }}>{contentGood.length} / {contentTotal}</span>
        </div>
        <div style={{ height: 4, background: "rgba(110,43,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${contentPct}%`, background: "#9B7AE6", borderRadius: 100, transition: "width 0.8s ease" }} />
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>Trust & Conversion</span>
            <QM text="Trust & Conversion checks for social proof, CTA, FAQ, contacts, and testimonials. These signals build trust with visitors and help convert them into customers." />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#D4A0E8" }}>{trustGood.length} / {trustTotal}</span>
        </div>
        <div style={{ height: 4, background: "rgba(110,43,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${trustPct}%`, background: "#D4A0E8", borderRadius: 100, transition: "width 0.8s ease" }} />
        </div>
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>AI Readiness</span>
            <QM text="AI Readiness shows how well your page is optimized for AI search tools like ChatGPT and Perplexity. The score is an estimate — what matters most depends on your page type. Also known as GEO (Generative Engine Optimization)." />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#B89CF0" }}>{aiGood?.length || 0} / {aiTotal}</span>
        </div>
        <div style={{ height: 4, background: "rgba(110,43,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${aiPct}%`, background: "#B89CF0", borderRadius: 100, transition: "width 0.8s ease" }} />
        </div>
      </div>
    </div>
  </div>);
};

/* ═══ BUILD RESULTS (same structure as v4 but with real data) ═══ */
function buildCoverageResults(d) {
  const NB = C.cardBorder;
  const contentGood = [], contentBad = [], trustGood = [], trustBad = [];
  const ukw = d.userKeywords || [];

  /* Title — with keyword presence analysis */
  const ta = d.titleAnalysis?.title;
  if (ta) {
    const titleOk = !ta.missing && !ta.tooShort && !ta.tooLong && ta.coverage === "strong" && !ta.duplicates.length;
    if (titleOk) {
      contentGood.push({ title: "Meta Title", content: (<><SerpSnippet url={d.url} title={d.title} desc={d.desc} hideDesc /><InfoBlock label="Keyword scan" value={ta.occurrences} borderColor={NB} /><BotNote inline text={`Your title is ${ta.length} characters with strong keyword alignment.`} /></>) });
    } else {
      const whyParts = [];
      if (ta.missing) whyParts.push("No meta title found — Google can't generate a proper search snippet.");
      else {
        if (ta.tooShort) whyParts.push(`Title is only ${ta.length} characters — too short. Aim for 30–60 characters.`);
        if (ta.tooLong) whyParts.push(`Title is ${ta.length} characters — too long, Google will truncate it.`);
        if (ta.coverage === "none") whyParts.push("None of your target keywords appear in the title — this is the #1 on-page SEO signal.");
        else if (ta.coverage === "partial") whyParts.push("Your keywords are partially present in the title, but not as exact phrases.");
        if (ta.duplicates.length) whyParts.push("Duplicate words found: " + ta.duplicates.map(([w,c]) => `"${w}" (${c}×)`).join(", ") + ". Rephrase to avoid repetition.");
        if (ta.overused) whyParts.push("Keywords are overused in the title — keep each phrase to 1 mention.");
      }
      const titlePrio = (d.pageType === "about" || d.pageType === "contact") ? "important" : "critical";
      contentBad.push({ title: "Meta Title Needs Work", priority: titlePrio, serpSnippet: { url: d.url, title: d.title || "(no title)", desc: d.desc, hideDesc: true }, currentLabel: "Keyword presence in title", current: ta.occurrences, why: whyParts.join(" "), suggestions: d.gptSuggestions?.suggested_titles?.length > 0 ? d.gptSuggestions.suggested_titles : ["Add your primary keyword phrase once near the beginning of the title", "Keep title between 30–60 characters"], showCopy: !!(d.gptSuggestions?.suggested_titles?.length > 0) });
    }
    d.titleStatus = titleOk ? "good" : "bad";
  } else {
    d.titleStatus = "bad";
    contentBad.push({ title: "Meta Title", priority: "critical", why: "Could not analyze title.", suggestions: [], showCopy: false });
  }

  /* Description — with keyword check */
  const da = d.titleAnalysis?.desc;
  if (da) {
    if (da.good && da.hasKeywords) {
      contentGood.push({ title: "Meta Description", content: (<><SerpSnippet url={d.url} title={d.title} desc={d.desc} /><BotNote inline text={`Your description is ${da.length} characters — within 90–180, with keyword mentions. Good for click-through rate.`} /></>) });
    } else {
      const whyParts = [];
      if (da.missing) whyParts.push("No meta description found.");
      else {
        if (da.tooShort) whyParts.push(`Description is only ${da.length} characters — too short. Aim for 140–160 characters.`);
        if (da.tooLong) whyParts.push(`Description is ${da.length} characters — too long, Google may truncate it.`);
        if (!da.hasKeywords && !da.missing) whyParts.push("None of your target keywords appear in the description. Including them improves click-through rate.");
      }
      contentBad.push({ title: "Description Needs Work", priority: "critical", serpSnippet: { url: d.url, title: d.title, desc: d.desc || "(no description)" }, why: whyParts.join(" ") || "Description needs improvement.", suggestions: d.gptSuggestions?.suggested_descriptions?.length > 0 ? d.gptSuggestions.suggested_descriptions : ["Write 140–160 characters including your primary keyword", "Make it compelling — this is what users see in search results"], showCopy: !!(d.gptSuggestions?.suggested_descriptions?.length > 0) });
    }
    d.descStatus = (da.good && da.hasKeywords) ? "good" : "bad";
  } else {
    d.descStatus = "bad";
    contentBad.push({ title: "Description", priority: "critical", why: "Could not analyze description.", suggestions: [], showCopy: false });
  }

  /* Headings — with keyword presence */
  const ha = d.titleAnalysis;
  const h1a = ha?.h1;
  const h2h3a = ha?.h2h3;
  if (h1a && h2h3a) {
    const h1Ok = !h1a.missing && !h1a.matchesTitle && !h1a.tooLong && h1a.strong;
    const h2h3Ok = h2h3a.h2Count > 0 && h2h3a.hasKeywords;
    if (h1Ok && h2h3Ok) {
      const h1 = d.h1, h2 = d.h2, h3 = d.h3;
      contentGood.push({ title: "Heading Structure", content: (<><InfoBlock label={`H1 — ${h1.length} found`} value={<HL tags={h1} lv="H1" />} borderColor={NB} /><InfoBlock label={`H2 — ${h2.length} found`} value={<HL tags={h2} lv="H2" />} borderColor={NB} />{h3.length > 0 && <InfoBlock label={`H3 — ${h3.length} found`} value={<HL tags={h3} lv="H3" />} borderColor={NB} />}<InfoBlock label="Keyword presence" value={h1a.occurrences} borderColor={NB} /><BotNote inline text="Your heading structure is well-organized with keywords present. Google uses this hierarchy to understand your page." /></>) });
    } else {
      if (h1a.missing || h1a.matchesTitle || h1a.tooLong || !h1a.strong) {
        const h1WhyParts = [];
        if (h1a.missing) h1WhyParts.push("H1 is missing — this is your page's main heading. Google uses it to understand what the page is about.");
        if (h1a.tooLong) h1WhyParts.push(`H1 is ${h1a.list[0]?.length || 0} characters — way too long. Keep H1 under 60–80 characters for best impact.`);
        if (h1a.matchesTitle) h1WhyParts.push("H1 is identical to the title — rewrite it to expand on the title while keeping your primary keyword.");
        if (!h1a.strong && !h1a.missing) h1WhyParts.push("Your target keywords are not in the H1 heading.");
        const h1Why = h1WhyParts.join(" ");
        contentBad.push({ title: "H1 Needs Work", priority: "critical", currentLabel: "Current H1", current: d.h1.length > 0 ? <HL tags={d.h1} lv="H1" /> : "No H1 found", why: h1Why, suggestions: d.gptSuggestions?.suggested_h1?.length > 0 ? d.gptSuggestions.suggested_h1 : ["Add a unique H1 with your primary keyword", "Make it different from the title — expand on the topic"], showCopy: !!(d.gptSuggestions?.suggested_h1?.length > 0) });
      }
      if (h2h3a.h2Count === 0 || !h2h3a.hasKeywords) {
        const h2Why = h2h3a.h2Count === 0 ? "No H2 headings found — add subheadings to break content into sections." : "Keywords are missing from H2/H3 headings. Include secondary keywords in subheadings.";
        contentBad.push({ title: "H2/H3 Structure Needs Work", priority: "important", currentLabel: "Current Subheadings", current: (d.h2.length > 0 || d.h3.length > 0) ? <div>{d.h2.length > 0 && <HL tags={d.h2} lv="H2" />}{d.h3.length > 0 && <div style={{marginTop:4}}><HL tags={d.h3.slice(0, 4)} lv="H3" /></div>}</div> : "No subheadings found", why: h2Why, suggestions: d.gptSuggestions?.suggested_h2?.length > 0 ? d.gptSuggestions.suggested_h2 : ["Use H2 for main content sections with secondary keywords", "Add H3 for subsections within each H2"], showCopy: !!(d.gptSuggestions?.suggested_h2?.length > 0) });
      }
    }
    d.h1Status = (h1Ok) ? "good" : "bad";
    d.h2h3Status = (h2h3Ok) ? "good" : "bad";
  } else {
    d.h1Status = "bad";
    d.h2h3Status = "bad";
    contentBad.push({ title: "Heading Structure", priority: "critical", why: "Could not analyze headings.", suggestions: [], showCopy: false });
  }

  /* Body Content */
  if (d.bodyEval) {
    const be = d.bodyEval;
    if (be.status === "good") {
      contentGood.push({ title: "Body Content — Keyword Coverage", content: (<><InfoBlock label="Keyword scan results" value={be.occurrences} borderColor={NB} /><BotNote inline text="Your keywords appear naturally throughout the body text — good balance without overuse." /></>) });
    } else {
      const kwList = (ukw.length ? ukw : d.extractedKeywords || []);
      const actionLines = kwList.map(k => `"${typeof k === "string" ? k : k.keyword}" — ${be.budgetPer[0]}–${be.budgetPer[1]} times`);
      contentBad.push({ title: "Body Content — Keyword Coverage", priority: "critical", currentLabel: "Keyword scan results", current: be.occurrences, why: be.status === "no_body" ? "No body text detected on your page." : be.status === "missing" ? "Body content has individual keyword words but no exact phrases. Google weights exact phrase matches more heavily." : be.status === "low" ? "Partial coverage — add at least one more full key phrase." : "Keyword usage appears high — reduce repetition.", sugLabel: "Recommended keyword usage", suggestions: [...actionLines, `Total recommended: ${be.budgetTotal[0]}–${be.budgetTotal[1]} times across the entire body text.`], showCopy: false });
    }
    d.bodyStatus = be.status === "good" ? "good" : "bad";
  }

  /* Semantic Expansion */
  if (d.semanticMissing) {
    const sm = d.semanticMissing;
    const allMissing = [...(sm.autocomplete||[]), ...(sm.related||[]), ...(sm.paa||[])];
    if (allMissing.length > 0) {
      contentBad.push({ title: "Semantic Expansion — Topics You May Be Missing", priority: "nice", soft: true,
        why: "I checked real Google search data and found topics related to your keywords that are missing from your page. Adding some of these phrases can help your page appear for more search queries and bring in more targeted visitors. Only add phrases that naturally fit your content — don't force them in.",
        currentLabel: "Missing from your page",
        current: (<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sm.autocomplete.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Autocomplete <QM text="These are Google's suggestions that appear as users type your keyword into the search bar. They reflect real, popular search patterns." /></div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>Google's suggestions as you type — real, popular search patterns.</div>{sm.autocomplete.map((s, i) => <div key={i} style={{ fontSize: 12, color: C.dark, padding: "3px 0" }}>• {s}</div>)}</div>}
          {sm.related.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Related searches <QM text="These queries appear at the bottom of Google's search results page. They show what users also search for after your keyword." /></div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>Queries users also look for — shown at the bottom of Google results.</div>{sm.related.map((s, i) => <div key={i} style={{ fontSize: 12, color: C.dark, padding: "3px 0" }}>• {s}</div>)}</div>}
          {sm.paa.length > 0 && <div><div style={{ fontSize: 11, fontWeight: 600, color: C.dark, marginBottom: 2 }}>People Also Ask <QM text="These are real questions that Google shows in a special FAQ-style block on the search results page. Answering them on your page can help you appear in this block." /></div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 6 }}>Common questions shown in Google — answering them can get you featured.</div>{sm.paa.map((s, i) => <div key={i} style={{ fontSize: 12, color: C.dark, padding: "3px 0" }}>• {s}</div>)}</div>}
        </div>),
        sugLabel: "How to use these phrases",
        suggestions: [...(sm.related.length > 0 ? ["Related Searches — pick 1–2 phrases and use them as H2 or H3 headings, or mention them in your body text."] : []), ...(sm.paa.length > 0 ? ["People Also Ask — take 3–5 questions and add a short FAQ section to your page. This helps you appear in Google's FAQ block."] : []), ...(sm.autocomplete.length > 0 ? ["Autocomplete — mention 1–2 of these phrases naturally in your text where they fit the context. Don't overuse them."] : [])],
        showCopy: false
      });
    }
  }

  /* Trust signals */
  if (d.trust) {
    const t = d.trust;
    if (t.contacts.show) {
      if (t.contacts.found) trustGood.push({ title: "Contact Information", content: (<><InfoBlock label="Status" value="Contact information detected on your page." borderColor={NB} /><BotNote inline text="Visible contact info builds trust with visitors and search engines — it's a key E-E-A-T signal." /></>) });
      else trustBad.push({ title: "No Contact Information", priority: "nice", why: "No contact details found. Adding an email, phone number, or contact form helps build trust.", suggestions: ["Add a contact section or footer with email/phone", "Include a contact form on the page"], showCopy: false });
    }
    if (t.cta.show) {
      if (t.cta.found) trustGood.push({ title: "Call to Action", content: (<><InfoBlock label="Current CTA" value={`"${t.cta.text}"`} borderColor={NB} /><BotNote inline text="A clear call-to-action guides visitors to the next step." /></>) });
      else trustBad.push({ title: "No CTA Found", priority: "important", why: "No call-to-action detected. Without one, visitors may leave without converting.", suggestions: ["Add a prominent CTA above the fold"], showCopy: false });
    }
    if (t.socials.show) {
      if (t.socials.found) trustGood.push({ title: "Social Profiles", content: (<><div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Detected profiles</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>{t.socials.list.map((s, i) => <SocialBadge key={i} name={typeof s === "string" ? s : s.name} url={typeof s === "string" ? null : s.url} />)}</div><BotNote inline text="Social profiles reinforce brand recognition and give users multiple ways to connect with you." /></>) });
      else trustBad.push({ title: "No Social Profiles Found", priority: "nice", why: "No social media links found. Adding links to your active profiles strengthens trust.", suggestions: ["Add social profile links to your footer or header", "Link at least 2 relevant social accounts"], showCopy: false });
    }
    if (t.testimonials.show) {
      if (t.testimonials.found) trustGood.push({ title: "Testimonials / Social Proof", content: (<><InfoBlock label="Status" value="Testimonials or reviews detected." borderColor={NB} /><BotNote inline text="Social proof helps visitors trust your brand." /></>) });
      else trustBad.push({ title: "No Testimonials Found", priority: "nice", why: "No testimonials or reviews detected. Adding 2–3 short customer quotes builds social proof.", suggestions: ["Add 2–3 short testimonials from customers", "Include star ratings or review counts if available"], showCopy: false });
    }
    if (t.faq.show) {
      if (t.faq.found) trustGood.push({ title: "FAQ Section", content: (<><InfoBlock label="Status" value="FAQ section detected on your page." borderColor={NB} /><BotNote inline text="FAQ sections help users find answers quickly and improve your chances of appearing in Google's 'People Also Ask' results." /></>) });
      else trustBad.push({ title: "No FAQ Section", priority: "nice", why: "No FAQ section found. Adding 3–5 common questions improves E-E-A-T signals.", suggestions: ["Add a short FAQ with 3–5 questions related to your topic"], showCopy: false });
    }
  }

  return { contentGood, contentBad, trustGood, trustBad };
}

/* ═══ RANKING GAPS ═══ */
function buildRankingGaps(d) {
  const g = [];
  if (d.titleStatus !== "good") g.push({ text: "Title needs work — lacks descriptive keywords and context.", critical: true });
  if (d.h1Status !== "good") g.push({ text: "H1 too short or matches the title — rewrite for clarity.", critical: true });
  if (d.bodyStatus !== "good") g.push({ text: "Missing keyword phrases in body text — weak search relevance.", critical: true });
  if (d.trust && !d.trust.testimonials?.found && d.trust.testimonials?.show) g.push({ text: "No testimonials — weak social proof.", critical: false });
  if (d.trust && !d.trust.faq?.found && d.trust.faq?.show) g.push({ text: "No FAQ section — fewer trust indicators.", critical: false });
  if (d.trust && !d.trust.socials?.found && d.trust.socials?.show) g.push({ text: "Missing social profiles — weak off-page trust.", critical: false });
  return g;
}

/* ═══ REPORT ═══ */
const CoverageReport = ({ data }) => {
  const { contentGood, contentBad, trustGood, trustBad } = buildCoverageResults(data);
  const aiGood = data.aiReadiness?.aiGood || [];
  const aiBad = data.aiReadiness?.aiBad || [];
  const prioOrder = { critical: 0, important: 1, nice: 2 };
  const sortByPrio = (a, b) => (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1);
  contentBad.sort(sortByPrio);
  trustBad.sort(sortByPrio);
  aiBad.sort(sortByPrio);
  const allBad = [...contentBad, ...trustBad, ...aiBad].sort(sortByPrio);
  const ukw = data.userKeywords || [];

  return (<div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 16px" }}>
    <BotNote text="Here's your full content coverage audit. I'll walk you through each part — what's working, what needs fixing, and exactly how to fix it." />

    {/* Coverage Score Card */}
    <CoverageScoreCard url={data.url} contentGood={contentGood} contentBad={contentBad} trustGood={trustGood} trustBad={trustBad} aiGood={aiGood} aiBad={aiBad} />

    {/* Page Summary */}
    <BotNote text="This is how search engines interpret your page based on visible content and structure." />
    <div className="reveal reveal-delay-1" style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Page Context Summary</span><QM text="If something looks off here, it means Google may misunderstand your page's purpose." /></div>
      <div className="iva-ctx-grid">{[{ l: "Page URL", v: data.url }, { l: "Page Title", v: data.title || "(no title)" }, { l: "Topic", v: data.ctx?.topic || "Unknown" }, { l: "Content Type", v: data.ctx?.content_type || "Page" }, { l: "Goal", v: data.ctx?.goal || "Inform" }, { l: "Industry", v: data.ctx?.industry || "General" }, { l: "Region", v: data.ctx?.region || "Global" }, { l: "Word Count", v: data.wordCount ? data.wordCount.toLocaleString() : "—" }].map((x, i) => (<div key={i} style={{ padding: "6px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 1 }}>{x.l}</div><div style={{ fontSize: 12, fontWeight: 500, color: C.dark, wordBreak: "break-all" }}>{x.v}</div></div>))}<div style={{ gridColumn: "1/-1", padding: "6px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 1 }}>Core Message</div><div style={{ fontSize: 12, fontWeight: 500, color: C.dark, lineHeight: 1.4 }}>{data.ctx?.message || ""}</div></div></div>
    </div>

    {/* Keywords — smart merge: one table if keywords match, two if different */}
    {(() => {
      const exKw = (data.extractedKeywords || []).map(k => (typeof k === "string" ? k : k.keyword || "").toLowerCase().trim()).filter(Boolean);
      const usKw = ukw.map(k => k.toLowerCase().trim()).filter(Boolean);
      const kwMatch = !!data.usedExtracted || (usKw.length > 0 && exKw.length > 0 && usKw.length === exKw.length && usKw.every(k => exKw.includes(k)));
      console.log("[CC] table merge:", { usedExtracted: data.usedExtracted, kwMatch, exKw, usKw });

      if (kwMatch) {
        return (<>
          <BotNote text="Your page is already aligned with your target keywords. Here's how they perform." />
          <div className="reveal reveal-delay-2" style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Keywords you're optimizing for</span><QM text="These keywords were found on your page and match what you want to rank for. The audit below checks how well your content covers them." /></div>
              <span style={{ fontSize: 10, color: "#9B7AE6", background: "rgba(110,43,255,0.06)", padding: "3px 10px", borderRadius: 10, fontWeight: 500 }}>aligned</span>
            </div>
            <RankingsTable rows={data.userKeywordMetrics || data.keywordMetrics || ukw.map(k => ({ keyword: k, position: null, volume: null, difficulty: null }))} emptyMsg="Keywords will appear after audit completes." />
          </div>
        </>);
      }

      return (<>
        <BotNote text="These are the keywords Google currently associates with your page." />
        <div className="reveal reveal-delay-2" style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>What your page is built for</span><QM text="Based on your title, H1–H3 headings, and meta description." /></div>
            <span style={{ fontSize: 10, color: C.muted, background: "rgba(21,20,21,0.04)", padding: "3px 10px", borderRadius: 10, fontWeight: 500 }}>content analysis</span>
          </div>
          <RankingsTable rows={data.keywordMetrics || data.extractedKeywords?.map(k => ({ keyword: k, position: null, volume: null, difficulty: null }))} emptyMsg="Keywords will appear after audit completes." />
        </div>

        {ukw.length > 0 && <div className="reveal" style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>What you want to rank for</span><QM text="These are the keywords you provided." /></div>
            <span style={{ fontSize: 10, color: C.accent, background: "rgba(110,43,255,0.06)", padding: "3px 10px", borderRadius: 10, fontWeight: 500 }}>your target</span>
          </div>
          <RankingsTable rows={data.userKeywordMetrics || ukw.map(k => ({ keyword: k, position: null, volume: null, difficulty: null }))} emptyMsg="No target keywords provided." />
        </div>}
      </>);
    })()}

    <BotNote inline text="Low-volume keywords are useful as supporting phrases on your page — they bring niche traffic with less competition." />

    {/* Content Working */}
    <BotNote text={contentGood.length > 0 ? `Good news — ${contentGood.length} content elements are already working well.` : "Let's look at your content structure."} />
    {contentGood.length > 0 && <div className="reveal reveal-delay-3" style={{ marginBottom: 12 }}><Fold title="Content & Structure — Working Well" count={contentGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{contentGood.map((g, i) => <WorkingItem key={i} title={g.title} content={g.content} />)}</div></Fold></div>}

    {/* Content Needs Improvement */}
    <BotNote text={contentBad.length > 0 ? `I found ${contentBad.length} content areas that need attention.` : "Your content structure looks great!"} />
    {contentBad.length > 0 && <div className="reveal" style={{ marginBottom: 20 }}><Fold title="Content & Structure — Needs Improvement" count={contentBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{contentBad.map((p, i) => <ProblemCard key={i} {...p} />)}</div></Fold></div>}

    {/* Trust Working */}
    <BotNote text={trustGood.length > 0 ? `${trustGood.length} trust signals are already in place.` : "Let's check your trust and conversion signals."} />
    {trustGood.length > 0 && <div className="reveal" style={{ marginBottom: 12 }}><Fold title="Trust & Conversion — Working Well" count={trustGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{trustGood.map((g, i) => <WorkingItem key={i} title={g.title} content={g.content} />)}</div></Fold></div>}

    {/* Trust Needs Improvement */}
    <BotNote text={trustBad.length > 0 ? `${trustBad.length} trust signals are missing.` : "All trust signals are in place!"} />
    {trustBad.length > 0 && <div className="reveal" style={{ marginBottom: 20 }}><Fold title="Trust & Conversion — Needs Improvement" count={trustBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{trustBad.map((p, i) => <ProblemCard key={i} {...p} />)}</div></Fold></div>}

    {/* AI Readiness — only show if module ran successfully */}
    {data.aiReadiness && <>
      <BotNote text={aiGood.length > 0 ? `${aiGood.length} AI search signals are in place.` : "Let's check how AI search tools see your page."} />
      {aiGood.length > 0 && <div className="reveal" style={{ marginBottom: 12 }}><Fold title="AI Search Optimization — Working Well" count={aiGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{aiGood.map((g, i) => <WorkingItem key={i} title={g.title} content={g.content} />)}</div></Fold></div>}

      <BotNote text={aiBad.length > 0 ? `${aiBad.length} AI readiness signals need improvement.` : "All AI readiness signals are in place!"} />
      {aiBad.length > 0 && <div className="reveal" style={{ marginBottom: 20 }}><Fold title="AI Search Optimization — Needs Improvement" count={aiBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{aiBad.map((p, i) => <ProblemCard key={i} {...p} />)}</div></Fold></div>}
    </>}

    {/* Final Recommendations */}
    <BotNote text="Here's a summary of what to focus on. Fix these and your rankings will improve." />
    <div className="reveal" style={{ marginBottom: 8, padding: 20, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Final Recommendations</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {allBad.map((item, i) => {const pr=PRIO[item.priority]||PRIO.important;return(<div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ color: pr.color, fontSize: 10, marginTop: 4 }}>●</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}><span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.title}</span><span style={{ fontSize: 9, fontWeight: 600, color: pr.color, background: pr.bg, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>{pr.label}</span></div>
              {item.why && typeof item.why === "string" && <div style={{ fontSize: 11.5, color: C.muted, marginBottom: item.suggestions?.[0] ? 6 : 0 }}>{item.why.length > 150 ? item.why.slice(0, 147) + "..." : item.why}</div>}
              {item.suggestions?.length > 0 && typeof item.suggestions[0] === "string" && (() => {
                const isBody = item.title?.includes("Body Content");
                const showSugs = isBody ? item.suggestions : item.suggestions.slice(0, 1);
                return <div style={{ padding: "8px 10px", borderRadius: 6, background: C.bg }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Suggested:</div>{showSugs.map((s, si) => <div key={si} style={{ fontSize: 12, fontWeight: 500, color: C.dark, padding: "2px 0" }}>{s}</div>)}</div>;
              })()}
            </div>
          </div>
        </div>)})}
        <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Re-audit after changes</div><div style={{ fontSize: 11.5, color: C.muted }}>Run another Content Coverage to measure your progress.</div></div></div></div>
      </div>
    </div>
  </div>);
};


async function generateCoveragePDF(data) {
  try {
  const loadScript = (url) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing && window.pdfMake) { resolve(); return; }
    if (existing) existing.remove();
    const s = document.createElement("script"); s.src = url; s.onload = resolve; s.onerror = () => reject(new Error("Failed to load " + url));
    document.head.appendChild(s);
  });
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js");
  if (window.pdfMake && window.pdfMake.fonts) {
    window.pdfMake.fonts = { Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" } };
  }

  const dk = "#151415", mt = "#928E95", accentC = "#6E2BFF";
  const divClr = "#e6e3e9", tblHdrBg = "#f0edf3", lavCardBg = "#fcfaff", lavCardBdr = "#dcd2f0";
  const PRIO_PDF = {
    critical: { label: "Critical", color: "#6E2BFF", bg: "#ede4ff" },
    important: { label: "Important", color: "#9B7AE6", bg: "#f1ebfc" },
    nice: { label: "Nice to have", color: "#B89CF0", bg: "#f5f0fd" }
  };
  const dateString = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const domain = (() => { try { return new URL(data.url).hostname.replace(/^www\./, ""); } catch(e) { return "audit"; } })();
  const fV = (v) => { if (!v || v === 0) return "< 10"; if (v >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, "") + "M"; if (v >= 1e3) return (v / 1e3).toFixed(1).replace(/\.0$/, "") + "K"; return String(v); };
  const fKD = (d) => d == null ? "low" : (d < 30 ? "low" : d < 60 ? "medium" : "high");

  const secTitle = (t, color) => ({ text: t, fontSize: 22, bold: true, color: color || dk, margin: [0, 24, 0, 4] });
  const noteText = (t) => ({ text: t, fontSize: 11, color: mt, margin: [0, 0, 0, 6], lineHeight: 1.3 });
  const spacer = (n) => ({ text: "", margin: [0, 0, 0, n || 12] });

  const badge = (prio) => {
    const pr = PRIO_PDF[prio] || PRIO_PDF.important;
    return {
      table: { body: [[{ text: pr.label, fontSize: 8, bold: true, color: pr.color, margin: [6, 2, 6, 2] }]] },
      layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => pr.bg, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }
    };
  };

  const lavCard = (item) => {
    const pr = PRIO_PDF[item.priority] || PRIO_PDF.important;
    const stack = [];
    stack.push({ columns: [
      { text: item.title, fontSize: 13, bold: true, color: dk, width: "*" },
      { ...badge(item.priority), width: "auto", alignment: "right" }
    ], columnGap: 8, margin: [0, 0, 0, 4] });
    if (item.why && typeof item.why === "string") stack.push({ text: item.why.replace(/\*\*/g, "").slice(0, 300), fontSize: 11, color: mt, margin: [0, 0, 0, 4], lineHeight: 1.3 });
    if (item.suggestions?.length > 0) {
      stack.push({ text: "Suggested:", fontSize: 9, color: mt, bold: true, margin: [0, 4, 0, 2] });
      item.suggestions.forEach(s => {
        if (typeof s === "string") stack.push({ text: "\u2022 " + s, fontSize: 11, color: dk, margin: [0, 1, 0, 1] });
      });
    }
    if (item.links?.length > 0) {
      stack.push({ text: "Learn more:", fontSize: 9, color: mt, bold: true, margin: [0, 6, 0, 2] });
      item.links.forEach(l => {
        if (l && l.label && l.url) stack.push({ text: l.label, fontSize: 10, color: accentC, link: l.url, margin: [0, 1, 0, 1] });
      });
    }
    return {
      table: { widths: ["*"], body: [[{ stack, margin: [10, 10, 10, 10] }]] },
      layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => lavCardBdr, vLineColor: () => lavCardBdr, fillColor: () => lavCardBg },
      margin: [0, 0, 0, 8]
    };
  };

  /* Logo */
  const makeLogo = () => new Promise(resolve => {
    const cvs = document.createElement("canvas"); cvs.width = 132; cvs.height = 116;
    const ctx = cvs.getContext("2d"); ctx.fillStyle = "#6E2BFF"; ctx.scale(2, 2);
    ctx.fill(new Path2D("M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z"));
    ctx.fill(new Path2D("M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7-.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z"));
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.ellipse(16.3, 24.8, 8.2, 8.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(48.9, 24.8, 8.2, 8.4, 0, 0, Math.PI * 2); ctx.fill();
    resolve(cvs.toDataURL("image/png"));
  });
  const logoImg = await makeLogo();

  /* Build results */
  const { contentGood, contentBad, trustGood, trustBad } = buildCoverageResults(data);
  const aiGood = data.aiReadiness?.aiGood || [];
  const aiBad = data.aiReadiness?.aiBad || [];
  const totalIssues = contentBad.length + trustBad.length + aiBad.length;
  const contentTotal = contentGood.length + contentBad.length;
  const trustTotal = trustGood.length + trustBad.length;
  const aiTotal = aiGood.length + aiBad.length;
  const contentPct = contentTotal > 0 ? Math.round((contentGood.length / contentTotal) * 100) : 0;
  const trustPct = trustTotal > 0 ? Math.round((trustGood.length / trustTotal) * 100) : 0;
  const aiPct = aiTotal > 0 ? Math.round((aiGood.length / aiTotal) * 100) : 0;

  const content = [];

  /* ── HEADER ── */
  content.push({ columns: [
    { image: logoImg, width: 22, margin: [0, 2, 0, 0] },
    { text: "IvaBot", fontSize: 16, bold: true, color: dk, width: "auto", margin: [6, 0, 0, 0] },
    { text: dateString, fontSize: 10, color: mt, alignment: "right" }
  ], margin: [0, 0, 0, 2] });
  content.push({ columns: [
    { text: "Content Coverage Report", fontSize: 10, color: mt, margin: [28, 0, 0, 0] },
    { text: data.url || "", fontSize: data.url?.length > 60 ? 8 : 10, color: mt, alignment: "right", link: data.url }
  ], margin: [0, 0, 0, 6] });
  content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: divClr }], margin: [0, 0, 0, 16] });

  /* ── SCORE CARD ── */
  content.push({
    table: { widths: [80, "*"], body: [[
      { stack: [
        { text: String(totalIssues), fontSize: 36, bold: true, color: dk, alignment: "center" },
        { text: "Issues", fontSize: 10, bold: true, color: "#9B7AE6", alignment: "center" }
      ], margin: [8, 14, 8, 14], fillColor: lavCardBg },
      { stack: [
        { text: domain, fontSize: 14, bold: true, color: dk, margin: [0, 0, 0, 10] },
        { text: [
          { text: "Content & Keywords  ", fontSize: 10, color: mt },
          { text: contentGood.length + " / " + contentTotal + "  (" + contentPct + "%)", fontSize: 10, bold: true, color: "#9B7AE6" }
        ], margin: [0, 0, 0, 6] },
        { text: [
          { text: "Trust & Conversion  ", fontSize: 10, color: mt },
          { text: trustGood.length + " / " + trustTotal + "  (" + trustPct + "%)", fontSize: 10, bold: true, color: "#D4A0E8" }
        ], margin: [0, 0, 0, 6] },
        { text: [
          { text: "AI Readiness  ", fontSize: 10, color: mt },
          { text: aiTotal > 0 ? (aiGood.length + " / " + aiTotal + "  (" + aiPct + "%)") : "—", fontSize: 10, bold: true, color: "#B89CF0" }
        ] }
      ], margin: [12, 14, 8, 14] }
    ]] },
    layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => lavCardBdr, vLineColor: () => lavCardBdr, fillColor: (i, node, col) => col === 0 ? lavCardBg : null, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 },
    margin: [0, 0, 0, 16]
  });

  /* ── KEYWORDS TABLE ── */
  const kwRows = data.userKeywordMetrics || data.keywordMetrics || (data.userKeywords || []).map(k => ({ keyword: k, position: null, volume: null, difficulty: null }));
  if (kwRows.length > 0) {
    content.push(secTitle("Keywords"));
    const isAligned = data.usedExtracted || false;
    content.push(noteText(isAligned ? "Your page is aligned with your target keywords." : "Keywords you want to rank for."));
    const kwHead = [
      { text: "Keyword", fontSize: 9, color: mt, fillColor: tblHdrBg, margin: [4, 6, 4, 6] },
      { text: "Pos.", fontSize: 9, color: mt, fillColor: tblHdrBg, alignment: "center", margin: [4, 6, 4, 6] },
      { text: "Volume", fontSize: 9, color: mt, fillColor: tblHdrBg, alignment: "center", margin: [4, 6, 4, 6] },
      { text: "KD", fontSize: 9, color: mt, fillColor: tblHdrBg, alignment: "center", margin: [4, 6, 4, 6] }
    ];
    const kwBody = kwRows.map(r => [
      { text: r.keyword, fontSize: 11, bold: true, color: dk, margin: [4, 6, 4, 6] },
      { text: r.position != null ? String(r.position) : "\u2014", fontSize: 11, color: r.position && r.position <= 3 ? accentC : dk, bold: r.position && r.position <= 3, alignment: "center", fillColor: r.position && r.position <= 3 ? "#ede4ff" : null, margin: [4, 6, 4, 6] },
      { text: fV(r.volume), fontSize: 11, color: dk, alignment: "center", margin: [4, 6, 4, 6] },
      { text: fKD(r.difficulty), fontSize: 11, color: dk, alignment: "center", margin: [4, 6, 4, 6] }
    ]);
    content.push({ table: { headerRows: 1, widths: ["*", 45, 60, 45], body: [kwHead, ...kwBody] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => divClr, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 4, 0, 8] });

    /* Extracted keywords table (if different from user keywords) */
    if (!isAligned && data.keywordMetrics?.length > 0) {
      content.push(spacer(6));
      content.push(noteText("What your page is currently built for:"));
      const exBody = data.keywordMetrics.map(r => [
        { text: r.keyword, fontSize: 11, bold: true, color: dk, margin: [4, 6, 4, 6] },
        { text: r.position != null ? String(r.position) : "\u2014", fontSize: 11, color: dk, alignment: "center", margin: [4, 6, 4, 6] },
        { text: fV(r.volume || r.search_volume), fontSize: 11, color: dk, alignment: "center", margin: [4, 6, 4, 6] },
        { text: fKD(r.difficulty || r.keyword_difficulty), fontSize: 11, color: dk, alignment: "center", margin: [4, 6, 4, 6] }
      ]);
      content.push({ table: { headerRows: 1, widths: ["*", 45, 60, 45], body: [kwHead, ...exBody] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => divClr, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 4, 0, 8] });
    }
    content.push(spacer(8));
  }

  /* ── CONTENT WORKING WELL (detailed, like Core Audit PDF) ── */
  if (contentGood.length > 0) {
    content.push(secTitle("Content & Structure \u2014 Working Well"));
    content.push(noteText(contentGood.length + " content elements are working well."));
    content.push(spacer(6));

    contentGood.forEach((g, idx) => {
      content.push({ text: g.title, fontSize: 13, bold: true, color: dk, margin: [0, 0, 0, 6] });

      /* SERP Preview for Title/Description */
      if (g.title === "Meta Title" || g.title === "Meta Description") {
        let displayUrl = data.url || ""; try { const u = new URL(data.url); displayUrl = u.hostname + (u.pathname === "/" ? "" : u.pathname); } catch(e) {}
        const serpStack = [
          { text: displayUrl, fontSize: 9, color: "#4d5156", margin: [8, 6, 8, 2] },
          { text: (data.title || "No title").length > 60 ? (data.title || "").slice(0, 57) + "..." : (data.title || "No title"), fontSize: 12, color: "#1a0dab", margin: [8, 0, 8, 2] }
        ];
        if (g.title === "Meta Description" && data.desc) {
          serpStack.push({ text: data.desc.length > 160 ? data.desc.slice(0, 157) + "..." : data.desc, fontSize: 10, color: "#4d5156", margin: [8, 0, 8, 6] });
        } else { serpStack.push(spacer(4)); }
        content.push({ table: { widths: ["*"], body: [[{ stack: serpStack }]] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => divClr, vLineColor: () => divClr, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 6] });
        if (g.title === "Meta Title") content.push({ text: (data.title || "").length + " characters", fontSize: 11, bold: true, color: dk, margin: [0, 2, 0, 2] });
        if (g.title === "Meta Description") content.push({ text: (data.desc || "").length + " characters", fontSize: 11, bold: true, color: dk, margin: [0, 2, 0, 2] });
      }

      /* Heading Structure */
      if (g.title === "Heading Structure") {
        const hColors = { H1: accentC, H2: "#9B7AE6", H3: "#B89CF0" };
        [["H1", data.h1], ["H2", data.h2], ["H3", data.h3]].forEach(([lv, arr], gi) => {
          if (!arr || arr.length === 0) return;
          content.push({ text: lv + " \u2014 " + arr.length + " found", fontSize: 11, bold: true, color: dk, margin: [0, gi > 0 ? 10 : 4, 0, 4] });
          arr.slice(0, 6).forEach(h => {
            const hText = typeof h === "string" ? h : h.text || h;
            content.push({ text: [{ text: lv + "  ", fontSize: 8, bold: true, color: hColors[lv] || "#9B7AE6" }, { text: hText, fontSize: 10, color: dk }], margin: [8, 1, 0, 1] });
          });
        });
      }

      /* Body Content */
      if (g.title.includes("Body Content")) {
        content.push({ text: "Keywords appear naturally throughout the body text.", fontSize: 11, color: dk, margin: [0, 0, 0, 4] });
      }

      /* Explain text */
      const explains = {
        "Meta Title": "Your title is " + (data.title || "").length + " characters \u2014 right in the sweet spot (30\u201360). This is the #1 on-page signal Google uses to understand your content.",
        "Meta Description": "Your description is " + (data.desc || "").length + " characters \u2014 within the recommended range. This is what users see in search results, so a good one means more clicks.",
        "Heading Structure": "Your heading structure is well-organized with keywords present. Google uses this hierarchy to understand your page.",
        "Body Content \u2014 Keyword Coverage": "Your keywords appear naturally throughout the body text \u2014 good balance without overuse."
      };
      const explain = explains[g.title] || null;
      if (explain) content.push({ text: explain, fontSize: 10, color: mt, margin: [0, 6, 0, 6], lineHeight: 1.3 });

      if (idx < contentGood.length - 1) content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: divClr }], margin: [0, 6, 0, 6] });
    });
    content.push(spacer(8));
  }

  /* ── CONTENT NEEDS IMPROVEMENT (with SERP preview + full suggestions) ── */
  if (contentBad.length > 0) {
    content.push(secTitle("Content & Structure \u2014 Needs Improvement (" + contentBad.length + ")", accentC));
    content.push(noteText("Each card has a clear fix \u2014 start from the top."));
    contentBad.forEach(item => {
      const itemCard = lavCard(item);
      content.push(itemCard);

      /* Add SERP preview for title/description issues */
      if ((item.title.includes("Title") || item.title.includes("Description")) && data.url) {
        let displayUrl = data.url; try { const u = new URL(data.url); displayUrl = u.hostname + (u.pathname === "/" ? "" : u.pathname); } catch(e) {}
        const serpStack = [
          { text: displayUrl, fontSize: 9, color: "#4d5156", margin: [8, 6, 8, 2] },
          { text: (data.title || "No title").length > 60 ? (data.title || "").slice(0, 57) + "..." : (data.title || "No title"), fontSize: 12, color: "#1a0dab", margin: [8, 0, 8, 2] }
        ];
        if (data.desc) serpStack.push({ text: data.desc.length > 160 ? data.desc.slice(0, 157) + "..." : data.desc, fontSize: 10, color: "#4d5156", margin: [8, 0, 8, 6] });
        else serpStack.push(spacer(4));
        content.push({ table: { widths: ["*"], body: [[{ stack: serpStack }]] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => divClr, vLineColor: () => divClr, paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0 }, margin: [0, 0, 0, 8] });
      }
    });
    content.push(spacer(8));
  }

  /* ── TRUST WORKING WELL (with details) ── */
  if (trustGood.length > 0) {
    content.push(secTitle("Trust & Conversion \u2014 Working Well"));
    content.push(noteText(trustGood.length + " trust signals are in place."));
    content.push(spacer(6));

    const trustExplains = {
      "Call to Action": "A clear call-to-action guides visitors to the next step. Pages with visible CTAs convert better.",
      "FAQ Section": "An FAQ section improves user experience and helps you appear in Google's rich results.",
      "Social Profiles": "Social links build brand trust and help Google verify your business identity.",
      "Contact Info": "Contact information signals legitimacy and trustworthiness to both users and search engines.",
      "Testimonials": "Social proof from customer testimonials increases conversion rates."
    };
    trustGood.forEach((g, idx) => {
      content.push({ text: g.title, fontSize: 13, bold: true, color: dk, margin: [0, 0, 0, 4] });
      const explain = trustExplains[g.title] || "This trust signal is present on your page.";
      content.push({ text: explain, fontSize: 10, color: mt, margin: [0, 0, 0, 6], lineHeight: 1.3 });
      if (idx < trustGood.length - 1) content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: divClr }], margin: [0, 4, 0, 4] });
    });
    content.push(spacer(8));
  }

  /* ── TRUST NEEDS IMPROVEMENT ── */
  if (trustBad.length > 0) {
    content.push(secTitle("Trust & Conversion \u2014 Needs Improvement (" + trustBad.length + ")", accentC));
    trustBad.forEach(item => content.push(lavCard(item)));
    content.push(spacer(8));
  }

  /* ── AI READINESS WORKING WELL ── */
  if (aiGood.length > 0) {
    content.push(secTitle("AI Search Optimization \u2014 Working Well"));
    content.push(noteText(aiGood.length + " AI search signals are in place."));
    content.push(spacer(6));

    const aiExplains = {
      "Schema.org markup": "Structured data tells AI tools (ChatGPT, Perplexity, Google AI) what your page is about.",
      "FAQ schema": "FAQ schema makes your Q&A directly citable by AI search engines.",
      "llms.txt file": "llms.txt is a new standard that tells AI tools how to read your site (like robots.txt for AI).",
      "AI crawlers access": "Major AI crawlers (GPTBot, ClaudeBot, PerplexityBot) can read your page.",
      "Question patterns": "Question-style headings match how users ask AI tools — your page gets cited more often.",
      "Open Graph tags": "Open Graph tags control how your link previews on social media and AI search results.",
      "Author information": "Clear authorship signals to AI that your content is trustworthy and citable.",
      "Last updated date": "Date signals show AI tools that your content is fresh.",
      "Authoritative citations": "Linking to .edu, .gov, and trusted sources signals real research to AI tools.",
      "Statistics & data": "Concrete numbers and statistics make your content more useful for AI answers."
    };
    aiGood.forEach((g, idx) => {
      content.push({ text: g.title, fontSize: 13, bold: true, color: dk, margin: [0, 0, 0, 4] });
      const explain = aiExplains[g.title] || "This AI readiness signal is present on your page.";
      content.push({ text: explain, fontSize: 10, color: mt, margin: [0, 0, 0, 6], lineHeight: 1.3 });
      if (idx < aiGood.length - 1) content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: divClr }], margin: [0, 4, 0, 4] });
    });
    content.push(spacer(8));
  }

  /* ── AI READINESS NEEDS IMPROVEMENT ── */
  if (aiBad.length > 0) {
    content.push(secTitle("AI Search Optimization \u2014 Needs Improvement (" + aiBad.length + ")", accentC));
    aiBad.forEach(item => content.push(lavCard(item)));
    content.push(spacer(8));
  }

  /* ── FINAL RECOMMENDATIONS ── */
  const allBad = [...contentBad, ...trustBad, ...aiBad];
  if (allBad.length > 0) {
    content.push(secTitle("Final Recommendations"));
    content.push(noteText("Fix these and your rankings will improve."));
    allBad.forEach(item => {
      const pr = PRIO_PDF[item.priority] || PRIO_PDF.important;
      const stack = [];
      stack.push({ columns: [
        { text: [{ text: "-  ", color: pr.color, fontSize: 10, bold: true }, { text: item.title, fontSize: 12, bold: true, color: dk }], width: "*" },
        { ...badge(item.priority), width: "auto", alignment: "right" }
      ], columnGap: 8, margin: [0, 0, 0, 3] });
      if (item.why && typeof item.why === "string") {
        const shortWhy = item.why.length > 200 ? item.why.slice(0, 197) + "..." : item.why;
        stack.push({ text: shortWhy, fontSize: 10, color: mt, lineHeight: 1.3 });
      }
      if (item.suggestions?.length > 0 && typeof item.suggestions[0] === "string") {
        stack.push({ text: "Suggested: " + item.suggestions[0], fontSize: 10, color: dk, margin: [0, 3, 0, 0] });
      }
      content.push({ table: { widths: ["*"], body: [[{ stack, margin: [10, 8, 10, 8] }]] },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => divClr, vLineColor: () => divClr },
        margin: [0, 0, 0, 6]
      });
    });
    /* Re-audit reminder */
    content.push({ table: { widths: ["*"], body: [[{
      stack: [
        { text: [{ text: "-  ", color: accentC, fontSize: 10, bold: true }, { text: "Re-audit after changes", fontSize: 12, bold: true, color: dk }] },
        { text: "Run another Content Coverage to measure your progress.", fontSize: 10, color: mt }
      ], margin: [10, 8, 10, 8]
    }]] }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => divClr, vLineColor: () => divClr }, margin: [0, 0, 0, 6] });
    content.push(spacer(8));
  }

  /* ── IvaBot CTA ── */
  content.push(spacer(12));
  content.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: divClr }], margin: [0, 0, 0, 16] });
  content.push({ table: { widths: ["*"], body: [[{
    stack: [
      { text: "Want to improve your score?", fontSize: 16, bold: true, color: dk, alignment: "center", margin: [0, 0, 0, 6] },
      { text: "Run another audit or try our other tools:", fontSize: 11, color: mt, alignment: "center", margin: [0, 0, 0, 10] },
      { text: [
        { text: "Core Audit", bold: true, color: accentC, link: "https://ivabot.xyz/app?tool=core" },
        { text: "  \u2022  ", color: mt },
        { text: "Content Builder", bold: true, color: accentC, link: "https://ivabot.xyz/app?tool=builder" },
        { text: "  \u2022  ", color: mt },
        { text: "Content Coverage", bold: true, color: accentC, link: "https://ivabot.xyz/app?tool=coverage" }
      ], alignment: "center", fontSize: 11, margin: [0, 0, 0, 10] },
      { text: "ivabot.xyz/app", fontSize: 12, bold: true, color: accentC, alignment: "center", link: "https://ivabot.xyz/app" }
    ], margin: [16, 16, 16, 16]
  }]] }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => lavCardBdr, vLineColor: () => lavCardBdr, fillColor: () => lavCardBg }, margin: [0, 0, 0, 8] });

  /* ── BUILD DOCUMENT ── */
  const docDefinition = {
    pageSize: "A4", pageMargins: [40, 40, 40, 50],
    defaultStyle: { fontSize: 11, color: dk },
    footer: (currentPage, pageCount) => ({ columns: [
      { text: "Run your audit at ivabot.xyz", fontSize: 8, color: mt, alignment: "center", link: "https://ivabot.xyz/app" },
      { text: "Page " + currentPage + " of " + pageCount, fontSize: 8, color: mt, alignment: "right", margin: [0, 0, 40, 0] }
    ], margin: [40, 10, 0, 0] }),
    content: content
  };

  /* ── GENERATE + DOWNLOAD + UPLOAD ── */
  const fileName = "IvaBot-Coverage-" + domain + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
  const pdfDocGen = pdfMake.createPdf(docDefinition);
  const pdfBtn = document.getElementById("export-coverage-pdf-btn");
  const origHTML = pdfBtn ? pdfBtn.innerHTML : "";

  pdfDocGen.getBlob(async (pdfBlob) => {
    try {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = fileName; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 200);
      console.log("[CC] PDF downloaded:", fileName);
      if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Downloaded"; pdfBtn.style.color = C.dark; }

      let upMemberId = window.__memberId || window.__userId;
      if (!upMemberId && window.__supabase) {
        try { const { data: { session } } = await window.__supabase.auth.getSession(); upMemberId = session?.user?.id; } catch(me) {}
      }
      if (upMemberId && pdfBlob) {
        if (pdfBtn) { pdfBtn.innerHTML = "Saving To Dashboard..."; pdfBtn.style.color = C.muted; }
        const form = new FormData();
        form.append("pdf", new File([pdfBlob], fileName, { type: "application/pdf" }));
        form.append("member_id", upMemberId);
        form.append("source_url", data.url || "");
        form.append("flow_type", "coverage");
        fetch("https://empuzslozakbicmenxfo.supabase.co/functions/v1/upload-pdf", {
          method: "POST", body: form
        }).then(r => r.json()).then(res => {
          if (res?.already_saved) { if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Already Saved"; pdfBtn.style.color = C.dark; } }
          else if (res?.url) { console.log("[CC] PDF saved:", res.url); if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Saved To Dashboard"; pdfBtn.style.color = C.dark; } }
          else { if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Downloaded"; pdfBtn.style.color = C.dark; } }
          setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 4000);
        }).catch(e => {
          console.warn("[CC] PDF upload failed:", e);
          if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Downloaded"; pdfBtn.style.color = C.dark; }
          setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 4000);
        });
      } else {
        console.log("[CC] PDF not uploaded — no member ID");
        setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 3000);
      }
    } catch(ue) { console.warn("[CC] PDF error:", ue); if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }
  });
  } catch(err) { console.error("[CC] PDF error:", err); alert("PDF export failed: " + err.message); }
}

/* ═══ PLACEHOLDER ═══ */
const CoveragePlaceholder = () => <div style={{ minHeight: "calc(100vh - 180px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(110,43,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
  <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Your content coverage report will appear here</div>
  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, textAlign: "center", maxWidth: 340, marginBottom: 24 }}>I'll analyze your page and show you what's missing — so you know exactly what to fix to rank higher in Google, build user trust, and get cited by AI tools like ChatGPT.</div>
  <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
    {[{ n: "1", t: "Keywords & context", d: "I check which keywords Google associates with your page" }, { n: "2", t: "Content & structure", d: "I analyze your title, headings, and body text for keyword coverage" }, { n: "3", t: "Trust & conversion", d: "I scan for social proof, CTAs, FAQ, and contact info" }, { n: "4", t: "AI search readiness", d: "I check schema, llms.txt, and other signals AI tools use to find you" }].map((s, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(110,43,255,0.04)", border: "1px solid rgba(110,43,255,0.08)" }}><div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(155,122,230,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#9B7AE6" }}>{s.n}</span></div><div><div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{s.t}</div><div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{s.d}</div></div></div>)}
  </div>
</div>;

const LoadingPanel = ({ text }) => <div style={{ minHeight: "calc(100vh - 130px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}><div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(110,43,255,0.1)", borderTopColor: C.accent, animation: "spin 0.8s linear infinite", marginBottom: 16 }} /><div style={{ fontSize: 13, fontWeight: 500, color: C.dark, marginBottom: 4 }}>{text || "Analyzing..."}</div><div style={{ fontSize: 12, color: C.muted }}>This usually takes 15–30 seconds</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

const STEPS = ["Fetching page...", "Analyzing structure...", "Extracting keywords...", "Checking keyword coverage...", "Fetching search data...", "Scanning trust signals...", "Building your report..."];

/* ═══ MAIN COMPONENT ═══ */
function ContentCoverage({ onHome, memberName: mn }) {
  const isMobile = useIsMobile();
  const [mTab, sMTab] = useState("chat");
  const [pLoad, sPLoad] = useState(null);
  const [step, setStep] = useState("init");
  const [msgs, sMsgs] = useState([]);
  const [typ, sTyp] = useState(false);
  const [showR, setSR] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [loadStep, setLS] = useState(-1);
  const [extractedKw, setExtractedKw] = useState(null);
  const [userKw, setUserKw] = useState(null);
  const [pendingKw, setPendingKw] = useState(null);
  const [pageTopic, setPageTopic] = useState("");
  const [pageUrl, setPageUrl] = useState(null);
  const [chatCount, setChatCount] = useState(0);
  const MAX_CHAT = 100;
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const prevMsgCount = useRef(0);

  const scrollChat = useCallback(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, []);
  useEffect(() => { if (msgs.length > prevMsgCount.current) setTimeout(scrollChat, 50); prevMsgCount.current = msgs.length; }, [msgs.length]);
  useEffect(() => { if (typ) setTimeout(scrollChat, 50); }, [typ]);
  useEffect(() => { if (!showR) return; const timer = setTimeout(() => { document.querySelectorAll(".reveal:not(.visible)").forEach((el, i) => { setTimeout(() => el.classList.add("visible"), i * 60); }); }, 150); return () => clearTimeout(timer); }, [showR, auditData, mTab, isMobile]);

  const add = (f, c) => sMsgs(p => [...p, { f, c, id: Date.now() + Math.random() }]);
  const bot = (c) => add("b", c);

  useEffect(() => {
    sTyp(true);
    setTimeout(() => { sTyp(false); add("b", mn ? `Hey, ${mn}!` : "Hey!"); sTyp(true); }, 1500);
    setTimeout(() => { sTyp(false); add("b", <div><div style={{color:C.muted,fontSize:12,marginBottom:8}}>I'll check how well your page covers target keywords, how deep and structured your content is, whether your trust signals are strong enough, and how ready it is for AI search. By fixing the gaps I find, you'll improve this page's visibility in Google and AI tools like ChatGPT.</div><div style={{fontWeight:600}}>Just paste your URL below and I'll get started.</div></div>); setStep("url"); }, 4000);
  }, []);

  /* ═══ REAL AUDIT PIPELINE ═══ */
  const runAudit = async (url, keywords, usedExtracted = false) => {
    /* Check credits before starting */
    const mid = getMemberId();
    const creditCheck = await checkCoverageCredits(mid);
    if (!creditCheck.ok) {
      bot(<div><div style={{marginBottom:6}}>You've used all your Content Coverage credits ({creditCheck.used}/{creditCheck.limit}).</div><div style={{color:C.muted,fontSize:12}}>Buy more credits to continue. <a href="/dashboard#buy-credits" style={{color:C.accent,fontWeight:600,textDecoration:"underline"}}>Buy credits</a></div></div>);
      return;
    }
    setSR(false); setAuditData(null); sPLoad("Analyzing your page..."); setLS(0);
    const setStepNum = (n) => setLS(prev => Math.max(prev, n));

    try {
      // Step 0: Fetch HTML + robots.txt + llms.txt in parallel
      setStepNum(0);
      let origin = "";
      try { origin = new URL(url).origin; } catch(e) {}
      const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
        fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }),
        origin ? fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: origin + "/robots.txt" }) }) : Promise.resolve(null),
        origin ? fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: origin + "/llms.txt" }) }) : Promise.resolve(null),
      ]);
      if (htmlRes.status !== "fulfilled" || !htmlRes.value?.ok) throw new Error("Could not fetch page");
      const rawHtml = await htmlRes.value.text();
      let robotsContent = null, llmsContent = null;
      try {
        if (robotsRes.status === "fulfilled" && robotsRes.value?.ok) {
          const t = await robotsRes.value.text();
          if (t && !/<html|<!doctype/i.test(t.slice(0, 200))) robotsContent = t;
        }
      } catch(e) {}
      try {
        if (llmsRes.status === "fulfilled" && llmsRes.value?.ok) {
          const t = await llmsRes.value.text();
          if (t && !/<html|<!doctype/i.test(t.slice(0, 200))) llmsContent = t;
        }
      } catch(e) {}
      console.log("[CC] Fetched: html=" + rawHtml.length + " robots=" + (robotsContent ? "yes" : "no") + " llms=" + (llmsContent ? "yes" : "no"));

      // Step 1: Parse HTML
      setStepNum(1);
      const parsed = parseCoverage(rawHtml, url);

      // Step 2: GPT — extract page context + keywords
      setStepNum(2);
      let gptData = null;
      try {
        const gptRes = await fetch(COVERAGE_GPT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "extract_context", parsed_summary: parsed.summary, domain: parsed.hostname, primary_keyword: parsed.primary_keyword })
        });
        if (gptRes.ok) gptData = await gptRes.json();
        console.log("[CC] GPT context:", gptData ? Object.keys(gptData) : "failed");
      } catch (e) { console.log("[CC] GPT error:", e); }

      const extractedKeywords = extractedKw || gptData?.keywords || [parsed.primary_keyword].filter(Boolean);
      const finalKeywords = keywords.length > 0 ? keywords : extractedKeywords;

      // Combine all unique keywords for a single DFS call
      const allKwSet = new Set([...extractedKeywords, ...finalKeywords].map(k => k.toLowerCase().trim()));
      const allKwUnique = [...allKwSet];

      // Step 3: Body keyword density
      setStepNum(3);
      const bodyEval = analyzeBodyDensity(parsed.body_text, finalKeywords);

      // Step 4: DFS — volume/KD + SERP (PAA, related, autocomplete)
      setStepNum(4);
      let dfsData = null;
      const locale = detectLocale(url, parsed.html_lang, parsed.hreflang);
      try {
        const dfsRes = await fetch(DFS_PROXY, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_KEY },
          body: JSON.stringify({ mode: "content_builder", keywords: allKwUnique.slice(0, 6), page_url: url, location_code: locale.location_code, language_code: locale.language_code })
        });
        if (dfsRes.ok) dfsData = await dfsRes.json();
        console.log("[CC] DFS:", dfsData ? `metrics=${dfsData.keyword_metrics?.length} ranked=${dfsData.ranked_keywords?.length || 0} paa=${dfsData.people_also_ask?.length} related=${dfsData.related_searches?.length} ac=${dfsData.autocomplete?.length} organic=${dfsData.serp_organic?.length || 0} serpPos=${JSON.stringify(dfsData.serp_positions || {})}` : "failed");
      } catch (e) { console.log("[CC] DFS error:", e); }

      /* v6.2: Use serp_positions from DFS — real Google positions for all keywords */
      const serpPositions = dfsData?.serp_positions || {};

      // Build keyword metrics — extracted keywords table (fallback to ranked data for volume/KD)
      const keywordMetrics = extractedKeywords.map((kw, idx) => {
        const m = dfsData?.keyword_metrics?.find(km => km.keyword?.toLowerCase() === kw.toLowerCase());
        const r = dfsData?.ranked_keywords?.find(rk => rk.keyword?.toLowerCase() === kw.toLowerCase());
        const serpPos = serpPositions[kw.toLowerCase()] || null;
        return {
          keyword: kw,
          position: r?.position || serpPos,
          volume: m?.search_volume || r?.volume || null,
          difficulty: m?.keyword_difficulty || r?.difficulty || null
        };
      });

      // If DFS returned no SERP suggestions, fallback to GPT
      let serpAutocomplete = dfsData?.autocomplete || [];
      let serpRelated = dfsData?.related_searches || [];
      let serpPaa = dfsData?.people_also_ask || [];
      if (serpAutocomplete.length === 0 && serpRelated.length === 0 && serpPaa.length === 0) {
        console.log("[CC] DFS SERP empty — falling back to GPT serp_suggestions");
        try {
          const serpGptRes = await fetch(COVERAGE_GPT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "serp_suggestions", keywords: finalKeywords, page_summary: gptData?.page_context?.topic || parsed.summary.slice(0, 300) })
          });
          if (serpGptRes.ok) {
            const serpGpt = await serpGptRes.json();
            serpAutocomplete = serpGpt.autocomplete || [];
            serpRelated = serpGpt.related || [];
            serpPaa = serpGpt.paa || [];
            console.log("[CC] GPT SERP fallback: ac=" + serpAutocomplete.length + " rel=" + serpRelated.length + " paa=" + serpPaa.length);
          }
        } catch (e) { console.log("[CC] GPT SERP fallback error:", e); }
      }

      // Step 5: Trust signals + semantic filter + title/desc/headings keyword analysis
      setStepNum(5);
      const pageType = gptData?.page_type || "other";
      const trust = analyzeTrust(parsed, pageType);

      // Step 5b: AI Readiness (uses window.AIReadiness module loaded before this script)
      let aiReadiness = null;
      try {
        if (window.AIReadiness && typeof window.AIReadiness.parse === "function") {
          const aiResult = window.AIReadiness.parse(rawHtml, url, robotsContent, llmsContent, pageType);
          aiReadiness = analyzeAIReadiness(aiResult, pageType);
          console.log("[CC] AI Readiness:", aiReadiness.score + "/100", "type=" + aiReadiness.pageType, "good=" + aiReadiness.aiGood.length + "/" + aiReadiness.total);
        } else {
          console.warn("[CC] window.AIReadiness module not loaded — skipping AI Readiness");
        }
      } catch (e) { console.error("[CC] AI Readiness error:", e); }

      const semanticMissing = filterSemanticMissing(serpAutocomplete, serpRelated, serpPaa, parsed.visible_text);
      const titleAnalysis = analyzeTitleDescHeadings(parsed, finalKeywords);

      // Step 6: GPT suggestions for title/desc/headings
      setStepNum(6);
      let gptSuggestions = null;
      try {
        const sugRes = await fetch(COVERAGE_GPT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "generate_suggestions", title: parsed.title, description: parsed.description, h1: parsed.h1, h2: parsed.h2, h3: parsed.h3, keywords: finalKeywords, page_context: gptData?.page_context })
        });
        if (sugRes.ok) gptSuggestions = await sugRes.json();
        console.log("[CC] GPT suggestions:", gptSuggestions ? "ok" : "failed");
      } catch (e) { console.log("[CC] suggestions error:", e); }

      // Word count (basic — count words in visible text)
      const wordCount = parsed.visible_text ? parsed.visible_text.trim().split(/\s+/).filter(Boolean).length : null;

      // Enrich user keywords with DFS data (same as extracted)
      const userKeywordMetrics = keywords.map((kw, idx) => {
        const m = dfsData?.keyword_metrics?.find(km => km.keyword?.toLowerCase() === kw.toLowerCase());
        const r = dfsData?.ranked_keywords?.find(rk => rk.keyword?.toLowerCase() === kw.toLowerCase());
        const serpPos = serpPositions[kw.toLowerCase()] || null;
        return { keyword: kw, position: r?.position || serpPos, volume: m?.search_volume || null, difficulty: m?.keyword_difficulty || null };
      });

      // Step 7: Build report
      const reportData = {
        ...parsed,
        ctx: gptData?.page_context || { topic: "Unknown", owner: parsed.hostname, goal: "Inform", industry: "General", region: "Global", message: "" },
        extractedKeywords,
        userKeywords: keywords,
        keywordMetrics,
        userKeywordMetrics,
        bodyEval,
        trust,
        aiReadiness,
        semanticMissing,
        pageType,
        titleAnalysis,
        gptSuggestions,
        wordCount,
        usedExtracted,
      };

      setLS(-1);
      sPLoad(null);
      setSR(true);
      setAuditData(reportData);
      if (isMobile) sMTab("report");

      /* Deduct 1 credit + record run */
      try{const r=await trackCoverageUsage(mid);if(r&&r.success)console.log("[CC] credit deducted:",r.used+"/"+r.limit);}catch(e){}
      try{await recordCoverageRun(mid,url);}catch(e){}

      // Summary chat message
      const { contentBad: cBad, trustBad: tBad } = buildCoverageResults(reportData);
      const totalIssues = cBad.length + tBad.length;
      sTyp(true);
      setTimeout(() => {
        sTyp(false);
        bot(<div><div style={{fontWeight:600,marginBottom:8}}>{"Done! I found " + totalIssues + " areas that need attention."}</div><div style={{color:C.muted,fontSize:12,marginBottom:8}}>Each card has a clear fix — tap to see what to do. {isMobile ? "Switch to the Report tab" : "Check the report on the right"} for the full breakdown.</div><div style={{fontWeight:600}}>Ask me anything — I can explain any issue or help you fix it.</div></div>);
        setStep("done");
      }, 1000);

    } catch (err) {
      setLS(-1); sPLoad(null);
      bot("Something went wrong: " + err.message + ". Please try again.");
      setStep("url");
    }
  };

  /* ═══ CHAT ═══ */
  const sendChat = async (text) => {
    if (chatCount >= MAX_CHAT) {
      bot(<div>You've reached the message limit for this session. Run another audit or try our other tools to keep improving your SEO!</div>);
      return;
    }
    setChatCount(c => c + 1);
    sTyp(true);
    try {
      const d = auditData;
      const chatMid = getMemberId();
      const chatCredits = await checkCoverageCredits(chatMid);
      const creditsLeft = chatCredits.ok ? (chatCredits.limit != null ? Math.max(0, (chatCredits.limit||0) - (chatCredits.used||0)) : null) : 0;
      const history = msgs.filter(m => typeof m.c === "string").slice(-10).map(m => `${m.f === "b" ? "IvaBot" : "User"}: ${m.c}`).join("\n");
      const res = await fetch(COVERAGE_GPT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "chat",
          audit_context: `Page: ${d?.url}\nTitle: "${d?.title}"\nKeywords: ${(d?.extractedKeywords || []).join(", ")}\nBody status: ${d?.bodyEval?.status || "unknown"}\nTrust: contacts=${d?.trust?.contacts?.found}, socials=${d?.trust?.socials?.found}, faq=${d?.trust?.faq?.found}, cta=${d?.trust?.cta?.found}`,
          chat_history: history,
          question: text,
          credits_left: creditsLeft,
        })
      });
      const raw = await res.json();
      sTyp(false);
      bot(raw.text || raw.answer || JSON.stringify(raw));
    } catch (e) {
      sTyp(false);
      bot("Sorry, I couldn't process that. Try asking again.");
    }
  };

  const send = () => {
    const el = inputRef.current; if (!el || !el.value.trim()) return;
    const text = el.value.trim(); el.value = ""; add("u", text);

    if (step === "url") {
      const v = valUrl(text); if (!v.ok) { bot(v.e); return; }
      setPageUrl(v.url); sTyp(true); setStep("parsing");
      // Real: fetch + parse + GPT extract keywords
      (async () => {
        try {
          const htmlRes = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: v.url }) });
          if (!htmlRes.ok) throw new Error("Could not fetch page");
          const rawHtml = await htmlRes.text();
          const parsed = parseCoverage(rawHtml, v.url);

          const gptRes = await fetch(COVERAGE_GPT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "extract_context", parsed_summary: parsed.summary, domain: parsed.hostname, primary_keyword: parsed.primary_keyword })
          });
          let kw = [parsed.primary_keyword].filter(Boolean);
          let topic = "";
          if (gptRes.ok) {
            const gpt = await gptRes.json();
            if (gpt.keywords?.length > 0) kw = gpt.keywords;
            topic = gpt.page_context?.topic || "";
          }
          setExtractedKw(kw);
          setPageTopic(topic);
          sTyp(false);
          bot(<div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>I analyzed your page's title, headings, and content to understand what Google currently associates with it.</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Keywords I found on your page:</div>
            <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>{kw.map((k, i) => <div key={i} style={{ fontSize: 12, fontWeight: 400, color: C.dark, padding: "2px 0" }}>• {k}</div>)}</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>I'll use these keywords to deeply analyze your page — checking how well your content covers them, where they appear in your structure, and what's missing.</div>
            <div style={{ fontWeight: 600 }}>Do these keywords match what you want to rank for?</div>
          </div>);
          setStep("keywords");
        } catch (e) {
          sTyp(false);
          bot("Could not analyze this page: " + e.message + ". Please check the URL and try again.");
          setStep("url");
        }
      })();
      return;
    }

    if (step === "own_keywords") {
      // User typed their own keywords — clean separators, send to GPT for cleaning
      const cleanedInput = text.replace(/[•·\-–—|\/\\]/g, ",").replace(/,{2,}/g, ",");
      sTyp(true);
      (async () => {
        try {
          const res = await fetch(COVERAGE_GPT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "confirm_keywords", initial_keywords: extractedKw || [], user_feedback: cleanedInput, page_topic: pageTopic || "" })
          });
          const data = await res.json();
          const cleaned = data.keywords || cleanedInput.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3);
          setPendingKw(cleaned);
          sTyp(false);
          bot(<div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Your keywords, ready for audit:</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>I removed duplicates, trimmed extra words, and made sure each phrase matches how people actually search in Google.</div>
            <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>{cleaned.map((k, i) => <div key={i} style={{ fontSize: 12, fontWeight: 400, color: C.dark, padding: "2px 0" }}>• {k}</div>)}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>These are the exact phrases I'll search for on your page. Confirm or adjust.</div>
          </div>);
          setStep("confirm_own");
        } catch (e) {
          sTyp(false);
          const fallback = cleanedInput.split(",").map(s => s.trim()).filter(Boolean).slice(0, 3);
          setPendingKw(fallback);
          bot(<div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>I'll use these keywords:</div>
            <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>{fallback.map((k, i) => <div key={i} style={{ fontSize: 12, fontWeight: 400, color: C.dark, padding: "2px 0" }}>• {k}</div>)}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Confirm or adjust.</div>
          </div>);
          setStep("confirm_own");
        }
      })();
      return;
    }

    if (step === "adjust_keywords") {
      // User wants to adjust — send feedback to GPT again
      sTyp(true);
      (async () => {
        try {
          const res = await fetch(COVERAGE_GPT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "confirm_keywords", initial_keywords: pendingKw || extractedKw || [], user_feedback: text, page_topic: pageTopic || "" })
          });
          const data = await res.json();
          const cleaned = data.keywords || (pendingKw || []);
          setPendingKw(cleaned);
          sTyp(false);
          bot(<div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Updated keywords:</div>
            <div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>{cleaned.map((k, i) => <div key={i} style={{ fontSize: 12, fontWeight: 400, color: C.dark, padding: "2px 0" }}>• {k}</div>)}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>Confirm or adjust again.</div>
          </div>);
          setStep("confirm_own");
        } catch (e) {
          sTyp(false);
          bot("Could not process your adjustment. Please try again.");
        }
      })();
      return;
    }

    if (step === "done" || showR) {
      // Check if user typed a new URL — offer re-audit with credit check
      const v = valUrl(text);
      if (v.ok) {
        (async () => {
          try {
            const mid = getMemberId();
            if (!mid) { bot("Could not verify your account. Please refresh and try again."); return; }
            let uRes = await fetch(`${SUPABASE_URL}/rest/v1/usage?user_id=eq.${mid}&select=*`, {
              headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
            });
            let rows = uRes.ok ? await uRes.json() : [];
            if (rows.length === 0) {
              uRes = await fetch(`${SUPABASE_URL}/rest/v1/usage?member_id=eq.${mid}&select=*`, {
                headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
              });
              rows = uRes.ok ? await uRes.json() : [];
            }
            const u = rows[0] || {};
            const left = Math.max(0, (u.coverage_limit || 0) - (u.coverage_used || 0));
            if (left <= 0) {
              bot(<div>You're out of Content Coverage credits. <a href="/dashboard#buy-credits" style={{ color: C.accent, fontWeight: 600, textDecoration: "underline" }}>Buy more credits</a> to continue.</div>);
              return;
            }
            bot(<div>
              <div style={{ marginBottom: 10 }}>You have <strong>{left}</strong> Content Coverage credit{left !== 1 ? "s" : ""} left. Run audit on <strong>{v.url}</strong>?</div>
            </div>);
            setStep("confirm_reaudit");
            setPageUrl(v.url);
          } catch (e) {
            bot("Could not check credits. Please try again.");
          }
        })();
        return;
      }
      sendChat(text);
      return;
    }
  };

  const lastBotIdx = msgs.reduce((acc, m, i) => m.f === "b" ? i : acc, -1);
  const chatMessages = <React.Fragment>
    <style>{`.cb-past-msg{opacity:0.75}.cb-past-msg button:not(.bot-tip-expand){pointer-events:none!important;cursor:default!important;opacity:0.5}`}</style>
    {msgs.map((m, i) => m.f === "b" ? <div key={m.id} className={i < lastBotIdx ? "cb-past-msg" : undefined}><BB>{typeof m.c === "string" ? m.c.split("\n").map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>) : m.c}</BB></div> : <UB key={m.id} n={mn}>{m.c}</UB>)}
    {loadStep >= 0 && <div style={{ maxWidth: "95%", alignSelf: "flex-start" }}><LBar step={loadStep} total={STEPS.length} text={STEPS[loadStep]} /></div>}
    {typ && <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}><div style={{ marginBottom: 3, marginLeft: 2 }}><BL s={16} /></div><div style={{ padding: "10px 14px", borderRadius: "4px 12px 12px 12px", background: C.surface, border: `1px solid ${C.border}` }}><div className="typing-dots"><span /><span /><span /></div></div></div>}
    {step === "keywords" && extractedKw && <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}><Btn text="Use These Keywords" onClick={() => { add("u", "Use these keywords"); setUserKw(extractedKw); setStep("running"); runAudit(pageUrl, extractedKw, true); }} /><Btn text="Write My Own" onClick={() => { setStep("own_keywords"); bot(<div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Type 1–3 keyword phrases you want to rank for.</div>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>Each phrase should be 2–3 words — the way real people search in Google. Separate with commas.</div>
            <div style={{ padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 4 }}>Example</div>
              <div style={{ fontSize: 12, color: C.dark }}>coffee shop Berlin, espresso Berlin, best coffee nearby</div>
            </div>
          </div>); }} /></div>}
    {step === "confirm_own" && pendingKw && <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}><Btn text="Confirm Keywords" onClick={() => { add("u", "Confirm"); setUserKw(pendingKw); setStep("running"); runAudit(pageUrl, pendingKw); }} /><Btn text="Adjust" onClick={() => { setStep("adjust_keywords"); bot("Tell me what to change — replace a keyword, add something, or describe what you're looking for."); }} /></div>}
    {step === "confirm_reaudit" && <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}><Btn text="Yes, run audit" primary onClick={() => { add("u", "Yes, run audit"); setSR(false); setAuditData(null); sPLoad(null); setExtractedKw(null); setUserKw(null); setPendingKw(null); setPageTopic(""); setChatCount(0); sTyp(true); setStep("parsing"); (async () => { try { const htmlRes = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: pageUrl }) }); if (!htmlRes.ok) throw new Error("Could not fetch page"); const rawHtml = await htmlRes.text(); const parsed = parseCoverage(rawHtml, pageUrl); const gptRes = await fetch(COVERAGE_GPT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: "extract_context", parsed_summary: parsed.summary, domain: parsed.hostname, primary_keyword: parsed.primary_keyword }) }); let kw = [parsed.primary_keyword].filter(Boolean); let topic = ""; if (gptRes.ok) { const gpt = await gptRes.json(); if (gpt.keywords?.length > 0) kw = gpt.keywords; topic = gpt.page_context?.topic || ""; } setExtractedKw(kw); setPageTopic(topic); sTyp(false); bot(<div><div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>I analyzed your page's title, headings, and content.</div><div style={{ fontWeight: 600, marginBottom: 6 }}>Keywords I found on your page:</div><div style={{ marginBottom: 10, padding: "10px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>{kw.map((k, i) => <div key={i} style={{ fontSize: 12, fontWeight: 400, color: C.dark, padding: "2px 0" }}>• {k}</div>)}</div><div style={{ fontWeight: 600 }}>Do these keywords match what you want to rank for?</div></div>); setStep("keywords"); } catch (e) { sTyp(false); bot("Could not analyze this page: " + e.message); setStep("done"); } })(); }} /><Btn text="No, cancel" onClick={() => { add("u", "Cancel"); bot("No problem! You can keep chatting about your current audit or paste another URL whenever you're ready."); setStep("done"); }} /></div>}
  </React.Fragment>;

  const panelContent = <React.Fragment>{pLoad ? <LoadingPanel text={pLoad} /> : showR && auditData ? <div style={{ animation: "fadeIn 0.5s ease", minHeight: "calc(100vh - 130px)" }}><CoverageReport data={auditData} /></div> : <CoveragePlaceholder />}</React.Fragment>;
  const placeholder = step === "url" ? "Paste your URL here..." : step === "own_keywords" ? "Type your keywords separated by commas..." : step === "adjust_keywords" ? "Describe what to change..." : "Ask me anything about your coverage...";
  const inputDisabled = step === "keywords" || step === "confirm_own" || step === "confirm_reaudit" || step === "parsing" || step === "running";

  return (<div style={{ fontFamily: "'DM Sans',sans-serif", flex: 1, display: "flex", flexDirection: "column" }}>
    <div style={{ padding: isMobile ? "0 12px 6px" : "0 24px 10px", display: "flex", alignItems: "center", gap: 6, maxWidth: 1224, margin: "0 auto", width: "100%" }}>
      <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted, display: "flex" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>Content Coverage</span>
      {showR && <span style={{ fontSize: 10, fontWeight: 600, color: "#9B7AE6", background: "rgba(155,122,230,0.08)", padding: "3px 8px", borderRadius: 10, marginLeft: 4 }}>Done</span>}
    </div>

    {!isMobile && <div style={{ display: "flex", padding: "0 24px 24px", maxWidth: 1224, margin: "0 auto", width: "100%", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: "35%", maxWidth: 420, position: "sticky", top: 12, display: "flex", flexDirection: "column", flexShrink: 0, minWidth: 280, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", background: C.card, height: "calc(100vh - 130px)" }}>
        <div ref={chatRef} className="iva-scroll-inner" style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>{chatMessages}</div>
        <div style={{ padding: "8px 12px 12px", flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input ref={inputRef} disabled={inputDisabled} defaultValue="" onKeyDown={e => e.key === "Enter" && send()} placeholder={placeholder} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 14px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: C.dark, outline: "none", background: inputDisabled ? "#f8f7f9" : C.surface, opacity: inputDisabled ? 0.6 : 1 }} onFocus={e => { if (!inputDisabled) { e.target.style.borderColor = C.hoverBorder; e.target.style.boxShadow = C.hoverShadow; } }} onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
            <button onClick={send} disabled={inputDisabled} style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${C.borderMid}`, background: C.surface, cursor: inputDisabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: inputDisabled ? 0.4 : 1 }} onMouseEnter={e => { if (!inputDisabled) e.currentTarget.style.background = C.accentLight; }} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></button>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${C.border}`, position: "relative", background: C.surface, minHeight: "calc(100vh - 130px)" }}>{panelContent}{showR && <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(transparent, #ffffff)", borderRadius: "0 0 12px 12px", pointerEvents: "none" }} />}</div>
    </div>}

    {isMobile && <div style={{ display: "flex", flexDirection: "column", padding: "0 12px 16px", gap: 12 }}>
      <MobileTab active={mTab} onSwitch={sMTab} hasReport={showR} />
      <div style={{ display: mTab === "chat" ? "flex" : "none", flexDirection: "column", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", background: C.card, maxHeight: "70vh" }}>
        <div ref={mTab === "chat" ? chatRef : null} className="iva-scroll-inner" style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>{chatMessages}</div>
        <div style={{ padding: "8px 10px 10px", flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 6 }}>
            <input ref={isMobile ? inputRef : null} disabled={inputDisabled} defaultValue="" onKeyDown={e => e.key === "Enter" && send()} placeholder={placeholder} style={{ flex: 1, height: 42, borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: C.dark, outline: "none", background: inputDisabled ? "#f8f7f9" : C.surface, opacity: inputDisabled ? 0.6 : 1 }} onFocus={e => { if (!inputDisabled) { e.target.style.borderColor = C.hoverBorder; e.target.style.boxShadow = C.hoverShadow; } }} onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
            <button onClick={send} disabled={inputDisabled} style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${C.borderMid}`, background: C.surface, cursor: inputDisabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: inputDisabled ? 0.4 : 1 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></button>
          </div>
        </div>
      </div>
      <div style={{ display: mTab === "report" ? "block" : "none", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>{panelContent}</div>
    </div>}

    {showR && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: isMobile ? "8px 12px 16px" : "8px 24px 16px", maxWidth: isMobile ? "100%" : 1224, margin: "0 auto", width: "100%", alignItems: "center" }}>
      <button onClick={() => { setSR(false); sMsgs([]); setLS(-1); setAuditData(null); sPLoad(null); sMTab("chat"); setStep("init"); setExtractedKw(null); setUserKw(null); setPendingKw(null); setPageTopic(""); setPageUrl(null); sTyp(true); setTimeout(() => { sTyp(false); add("b", mn ? `Hey, ${mn}!` : "Hey!"); sTyp(true); setTimeout(() => { sTyp(false); add("b", <div><div style={{fontWeight:600}}>Paste your URL below and I'll audit another page.</div></div>); setStep("url"); }, 1500); }, 1000); }} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = "#5a22d9"} onMouseLeave={e => e.currentTarget.style.background = C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>New Audit</button>
      <button id="export-coverage-pdf-btn" style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface} onClick={() => generateCoveragePDF(auditData)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Export PDF</button>
      {!isMobile && <button onClick={onHome} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}>Try Other Tools</button>}
    </div>}
  </div>);
}

window.ContentCoverage = ContentCoverage;
})();
