/* IvaBot AI Readiness v1.0 — standalone flagship tool.
   Clone of content-coverage.js: reuses the exact palette, primitives, the 14-check
   mapping (analyzeAIReadiness) and the AI Readiness engine (window.AIReadiness).
   Keyword/ranking logic from Coverage is removed. New: gated preview by user_id,
   Trust & Authority blocks (backlinks, AI citations, AI mentions, web mentions, GBP)
   behind TRUST_LIVE, snapshot written with flow_type='ai_readiness'.
   Load order: ai-readiness-v4.js FIRST, then this file. Exposes window.AIReadinessTool. */
(function() {
const { useState, useRef, useEffect, useCallback } = React;
console.log("[IvaBot] ai-readiness.js v1.0 loaded");

/* ═══ FLAGS / GATE ═══ */
/* TRUST_LIVE: keep false until the DataForSEO endpoints are wired (after Jul 1).
   While false, the Trust & Authority blocks and the Google rating are NOT rendered,
   so no placeholder or sample data ever reaches a user. */
const TRUST_LIVE = false;
/* WHITELIST: only these Supabase user ids see the tool. Empty array = open to all.
   Flip by clearing this array (or removing the gate) when going public. */
const WHITELIST = ["05021d8c-f4c5-4607-8b9c-defb694ebe42"];

const SUPABASE_URL="https://empuzslozakbicmenxfo.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";
const CORS_PROXY=SUPABASE_URL+"/functions/v1/fetch-page";
const DFS_PROXY=SUPABASE_URL+"/functions/v1/dataforseo-proxy";
const COVERAGE_GPT=SUPABASE_URL+"/functions/v1/coverage-gpt";
async function ivaAuthToken(){try{if(window.__supabase){const{data:{session}}=await window.__supabase.auth.getSession();if(session&&session.access_token)return session.access_token;}}catch(e){}return SUPABASE_KEY;}
function getMemberId(){if(window.__memberId)return window.__memberId;if(window.__userId)return window.__userId;try{const sb=window.__supabase;if(sb){const key=Object.keys(localStorage).find(k=>k.includes('auth-token'));if(key){const data=JSON.parse(localStorage.getItem(key));if(data?.user?.id)return data.user.id;}}}catch(e){}return null;}
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

/* DistributionTipsBlock — advice block per page_type, NOT a check */
const DistributionTipsBlock = ({ tips }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.cardBorder}`, overflow: "hidden", background: C.surface }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "14px 16px", background: "rgba(184,156,240,0.08)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Sans',sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Where to mention this page</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#9B7AE6", background: "rgba(155,122,230,0.12)", padding: "3px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Tips</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0, transition: "grid-template-rows 0.5s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.cardBorder}` }}>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, padding: "12px 0 10px" }}>
              AI engines cite pages that have mentions across the web. Based on your page type, here's where to start building those mentions:
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(tips || []).map((tip, i) => (
                <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(184,156,240,0.05)", border: "1px solid rgba(184,156,240,0.15)", fontSize: 12.5, color: C.dark, lineHeight: 1.5 }}>
                  {renderBoldText(tip)}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Learn more</div>
            <a href="https://ivabot.xyz/blog/where-do-ai-engines-get-information" target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: C.accent, textDecoration: "none" }}>How AI engines source citations (2026 study) →</a>
          </div>
        </div>
      </div>
    </div>
  );
};


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

const NumBadge = ({ n }) => { const colors = ["#9B7AE6", "#B89CF0", "#D4A0E8"]; const c = colors[(n - 1) % colors.length]; return (<span style={{ width: 22, height: 22, borderRadius: "50%", background: `${c}18`, color: c, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>); };
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
  citations: "Outbound links",
  statistics: "Statistics & data",
  extractable: "Extractable passages",
  tldr: "TL;DR or quick summary",
  tables: "Comparison tables",
  howto: "HowTo schema",
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
    extractable: checks.extractable && checks.extractable.status === "good",
    tldr: checks.tldr && checks.tldr.status === "good",
    tables: checks.tables && checks.tables.status === "good",
    howto: checks.howto && (checks.howto.status === "good" || checks.howto.status === "not_applicable"),
  };

  /* Articles need Person markup, not just org_only */
  if (pageType === "article" || pageType === "blog" || pageType === "blog_post") {
    isPassed.author = checks.author.status === "good" || checks.author.status === "partial";
  }

  /* Iterate all 14 checks but only include those with weight > 0 for this page type */
  const checkOrder = ["schema", "faq", "llms", "bots", "qa", "og", "author", "dates", "citations", "statistics", "extractable", "tldr", "tables", "howto"];
  for (const checkName of checkOrder) {
    const weight = weights[checkName] || 0;
    if (weight === 0) continue; /* not relevant for this page type */

    /* Special: hide HowTo check entirely if page has no step content (not_applicable) */
    if (checkName === "howto" && checks.howto && checks.howto.status === "not_applicable") continue;

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
    extractablePassages: (checks.extractable && checks.extractable.passages) || [],
  };
}

function mapCheckKey(checkName) {
  const map = { schema: "schema", faq: "faq_schema", llms: "llms_txt", bots: "ai_bots", qa: "qa_patterns", og: "open_graph", author: "author", dates: "dates", citations: "citations", statistics: "statistics", extractable: "extractable", tldr: "tldr", tables: "tables", howto: "howto" };
  return map[checkName] || checkName;
}

function aiReadinessPriority(checkName, weight) {
  /* Critical if check has high weight (>= 15), important if moderate (>= 8), nice if low */
  if (checkName === "llms") return "nice";
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
    case "extractable":
      return <div style={{ fontSize: 12, color: C.muted }}>Found {check.count} paragraph{check.count === 1 ? "" : "s"} in the 100–180 word range — strong extraction signal for AI engines</div>;
    case "tldr":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.type === "explicit_marker" ? "Summary section detected near the top of the page" : "Strong intro paragraph found after H1 — works as a summary for AI engines"}</div>;
    case "tables":
      return <div style={{ fontSize: 12, color: C.muted }}>{check.count} comparison table{check.count === 1 ? "" : "s"} with structured data — AI engines extract these cleanly</div>;
    case "howto":
      return <div style={{ fontSize: 12, color: C.muted }}>Page has step-by-step content and HowTo schema is in place</div>;
  }
  return null;
}

function aiReadinessWhy(checkName, pageType) {
  /* Short "why this matters" — 1-2 sentences, with term definition in bold */
  const why = {
    schema: "**Schema.org is special code that tells AI what your page is about.** Without it, AI search tools may skip you when answering user questions.",
    faq: "**FAQ schema marks Q&A pairs on your page so AI can find them.** Pages with FAQ schema are more likely to be quoted in ChatGPT or Perplexity answers.",
    llms: "**llms.txt is an optional file that points AI tools to your key pages.** Google has said it does not affect ranking, so add it only if you want to.",
    bots: "**AI crawlers are bots like GPTBot and ClaudeBot that read your site for AI search.** If your robots.txt blocks them, ChatGPT and Perplexity won't recommend you.",
    qa: "**Question patterns are headings written as actual questions** (\"What is X?\", \"How to Y?\"). They match how users ask AI tools, so your page gets cited more often.",
    og: "**Open Graph tags control how your link looks when shared online** — title, description, preview image. Without them, AI tools may skip your page.",
    author: "**Author information is markup or visible text saying who wrote the page.** AI tools trust pages with clear authorship and rarely cite anonymous content.",
    dates: "**A \"last updated\" date shows AI when the page was last edited.** AI prefers fresh content — without this, your page looks outdated even if it isn't.",
    citations: "**Outbound links are links from your page to other sites.** It is good to have a few when they genuinely support or complete your content. This is optional and not a ranking factor on its own.",
    statistics: "**Statistics are concrete numbers in your content** (like \"60% of users\" or \"$5 to start\"). AI loves quoting specific numbers more than vague claims.",
    extractable: "**Extractable passages are paragraphs 100-180 words long that answer one clear question.** AI search engines like ChatGPT and Perplexity pull these chunks directly into their answers — pages without them get summarised, not quoted.",
    tldr: "**A TL;DR or quick summary near the top helps AI engines understand your page in one read.** Pages with a clear summary section get cited 28% more often by ChatGPT and Google AI Overviews.",
    tables: "**Comparison tables get cited 2x more often by AI engines than prose.** Tables let AI tools extract structured comparisons cleanly — especially Perplexity and Google AI.",
    howto: "**HowTo schema marks step-by-step instructions so AI engines and Google can show them directly.** Pages with steps but no HowTo schema get summarised; pages with proper schema get cited verbatim.",
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
    extractable: ["Aim for 3+ paragraphs in the 100-180 word range across the page", "Each paragraph should answer one specific question or cover one clear point", "Avoid very short paragraphs (under 50 words) for key explanations"],
    tldr: ["Add a short summary section (50-200 words) right after your H1", "Label it \"TL;DR\", \"Quick summary\", \"In short\", or similar", "Include the main answer to the page's core question in those first lines"],
    tables: ["Add a comparison table for any \"X vs Y\" or \"best of\" content", "Use proper <table> HTML with at least 2 columns and 3 rows", "Add a clear header row so AI knows what each column represents"],
    howto: ["Add HowTo JSON-LD schema if your page has numbered steps or instructions", "Each step should have a name and text inside the schema", "Validate with Google's Rich Results Test"],
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
    extractable: [
      { label: "Princeton GEO research: passage extraction", url: "https://arxiv.org/abs/2311.09735" },
    ],
    tldr: [
      { label: "Why direct answers win AI citations", url: "https://blog.google/products/search/generative-ai-google-search-may-2024/" },
    ],
    tables: [
      { label: "Structured data in AI search", url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data" },
    ],
    howto: [
      { label: "Google: HowTo structured data", url: "https://developers.google.com/search/docs/appearance/structured-data/how-to" },
    ],
  };
  return links[checkName] || [];
}

/* ═══ DISTRIBUTION TIPS — page-type-aware advice for AI citations (v4 addition) ═══ */
function distributionTipsForPageType(pageType) {
  const tipsByType = {
    homepage: [
      "**ChatGPT visibility:** Get listed on G2, Capterra, or your industry's main directories.",
      "**Perplexity visibility:** Engage in relevant subreddits where your target audience already discusses problems you solve.",
      "**Google AI visibility:** Create a short YouTube video explaining what you do — even a 2-minute screen recording counts.",
      "**Claude visibility:** Write one long-form explainer (2000+ words) about the problem you solve.",
    ],
    product: [
      "**G2 / Capterra / AlternativeTo:** List your product so AI engines find structured info about features and pricing.",
      "**Reddit:** Genuine comments in subreddits where users discuss similar tools (don't post about your own product directly).",
      "**YouTube:** A tutorial or demo video gives Google AI rich content to cite.",
      "**Wikipedia:** If your product has notable coverage in independent sources, consider a Wikipedia entry.",
    ],
    article: [
      "**Reddit:** Share the article in 1-2 relevant subreddits where it answers a real question.",
      "**Quora:** Answer 2-3 related questions and link to your article as a source.",
      "**YouTube:** Repurpose the article as a 5-10 minute video — Google AI heavily weights YouTube.",
      "**Industry newsletters:** Pitch the article to 2-3 newsletters in your niche.",
    ],
    about: [
      "**LinkedIn:** Connect your About page to your founder profile and post about the company regularly.",
      "**Crunchbase:** Ensure your company has a complete Crunchbase profile.",
      "**Industry interviews / podcasts:** Reach out to 3-5 small podcasts in your space.",
    ],
    pricing: [
      "**Comparison articles:** Reach out to bloggers writing \"Best X tools\" listicles in your niche.",
      "**G2 / Capterra:** Make sure pricing info is up-to-date on review sites.",
      "**Reddit:** Answer pricing questions in relevant communities (honestly, without overselling).",
    ],
    docs: [
      "**Stack Overflow / dev forums:** Answer related questions and link back to relevant docs sections.",
      "**GitHub discussions:** Engage where developers ask integration questions.",
      "**YouTube tutorials:** A walkthrough video gets your docs surfaced by Google AI.",
    ],
    contact: [
      "**LinkedIn:** Keep founder profiles current and link to your contact page.",
      "**Local business directories:** If location matters for your business, claim those listings.",
    ],
    other: [
      "**Get listed:** On 3-5 directories relevant to your niche (G2, Capterra, AlternativeTo, industry-specific).",
      "**Reddit:** Find 2-3 subreddits where your audience hangs out and engage genuinely.",
      "**YouTube:** Even one explainer video creates a strong AI citation signal.",
      "**Original data:** Publish one piece of original research or stats — it's the highest-leverage signal for AI citations.",
    ],
  };
  return tipsByType[pageType] || tipsByType.other;
}


/* ═══ PAGE TYPE (lightweight, no GPT) ═══ */
function detectPageType(url, html) {
  const u = (url || "").toLowerCase();
  const h = (html || "").toLowerCase();
  if (/"@type"\s*:\s*"(article|blogposting|newsarticle)"/.test(h) || /\/blog\/|\/article|\/news\/|\/post\//.test(u)) return "article";
  if (/\/about/.test(u)) return "about";
  if (/\/contact/.test(u)) return "contact";
  if (/\/pricing|\/plans/.test(u)) return "pricing";
  if (/\/docs?\/|\/documentation/.test(u)) return "docs";
  if (/"@type"\s*:\s*"product"/.test(h) || /\/product/.test(u)) return "product";
  try { const p = new URL(url); if (p.pathname === "/" || p.pathname === "") return "homepage"; } catch (e) {}
  return "other";
}

/* ═══ HERO SCORE ═══ */
const HeroScore = ({ ai }) => {
  const passed = ai.aiGood ? ai.aiGood.length : 0;
  const total = passed + (ai.aiBad ? ai.aiBad.length : 0);
  const score = Math.round(ai.score || 0);
  const pct = Math.max(0, Math.min(100, score));
  const ptLabel = (ai.pageType || "other").replace(/_/g, " ");
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", gap: 22, marginBottom: 20 }}>
      <div style={{ textAlign: "center", minWidth: 92 }}>
        <div style={{ fontSize: 48, fontWeight: 700, lineHeight: 1, color: C.accent }}>{score}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>out of 100</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 3 }}>AI readiness score</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 9 }}>{passed} of {total} signals passed</div>
        <div style={{ height: 6, borderRadius: 100, background: "rgba(110,43,255,0.12)", overflow: "hidden" }}><div style={{ width: pct + "%", height: "100%", background: C.accent, borderRadius: 100 }} /></div>
        <div style={{ marginTop: 11 }}><span style={{ fontSize: 11, fontWeight: 600, color: C.accent, background: "rgba(110,43,255,0.08)", padding: "3px 10px", borderRadius: 20 }}>Page type: {ptLabel}</span></div>
      </div>
    </div>
  );
};

/* ═══ TRUST & AUTHORITY (rendered only when TRUST_LIVE) ═══ */
const DownloadBtn = ({ label, onClick }) => (
  <button onClick={onClick || (() => {})} style={{ marginTop: "auto", alignSelf: "flex-start", fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 600, height: 34, padding: "0 14px", border: `1px solid ${C.borderMid}`, borderRadius: 9, background: C.surface, color: C.dark, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}>
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>{label || "Download"}
  </button>
);

const TrustCard = ({ label, total, unit, sourcesLabel, sources, onDownload }) => (
  <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden", background: C.surface, display: "flex", flexDirection: "column" }}>
    <div style={{ background: C.card, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: C.dark, marginBottom: 6 }}>{label}</div>
      <div><span style={{ fontSize: 24, fontWeight: 700, color: C.dark }}>{total != null ? total.toLocaleString() : "—"}</span> <span style={{ fontSize: 12, color: C.muted }}>{unit}</span></div>
    </div>
    <div style={{ padding: "8px 14px 12px", flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", padding: "6px 0 2px" }}>{sourcesLabel}</div>
      {(sources || []).map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid rgba(21,20,21,0.06)", fontSize: 12.5 }}><span>{s.name}</span><span style={{ fontWeight: 700, color: C.dark }}>{s.count != null ? s.count.toLocaleString() : "—"}</span></div>
      ))}
      <DownloadBtn label="Download all" onClick={onDownload} />
    </div>
  </div>
);

const BacklinksBlock = ({ total, domains, rows, onDownload }) => (
  <div style={{ border: `1px solid ${C.cardBorder}`, borderRadius: 12, overflow: "hidden", background: C.surface, marginBottom: 20 }}>
    <div style={{ background: C.card, padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Backlinks to your page</span>
      <span style={{ background: C.surface, borderRadius: 8, padding: "5px 11px", fontSize: 13, fontWeight: 700, color: C.dark }}>{(total != null ? total.toLocaleString() : "—")} links<span style={{ color: C.muted, fontWeight: 600 }}> · </span>{(domains != null ? domains.toLocaleString() : "—")} domains</span>
    </div>
    <div style={{ padding: "12px 16px 16px" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", padding: "4px 0 8px" }}>Top links</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(rows || []).map((b, i) => (
          <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}><NumBadge n={i + 1} /><span style={{ fontSize: 13, fontWeight: 600, color: C.dark, flex: 1 }}>{b.anchor || "(no anchor)"}</span>{b.rank != null && <span style={{ fontSize: 10, fontWeight: 600, color: C.accent, background: "rgba(110,43,255,0.08)", padding: "2px 7px", borderRadius: 6 }}>rank {b.rank}</span>}</div>
            <div style={{ fontSize: 11.5, color: C.muted, paddingLeft: 30 }}>{b.source}{b.date ? ", " + b.date : ""}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, margin: "10px 0 0" }}>The full list with every link and its anchor is in the download.</div>
      <DownloadBtn label="Download" onClick={onDownload} />
    </div>
  </div>
);

const RatingBlock = ({ rating, count, positive, critical, dist }) => {
  const [o, setO] = useState(false);
  const goodC = "#9B7AE6", badC = C.accent;
  const stars = Math.round(rating || 0);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", background: C.surface, marginBottom: 20 }}>
      <button onClick={() => setO(!o)} style={{ width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontFamily: "'DM Sans',sans-serif" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: C.dark, lineHeight: 1 }}>{(rating != null ? rating.toFixed(1) : "—")}</span>
          <span style={{ textAlign: "left" }}>
            <span style={{ fontSize: 16, letterSpacing: 2, color: C.accent }}>{"★".repeat(stars)}<span style={{ color: "rgba(110,43,255,0.22)" }}>{"★".repeat(Math.max(0, 5 - stars))}</span></span>
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 3 }}>{(count != null ? count.toLocaleString() : "—")} Google reviews</span>
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: goodC, background: "rgba(155,122,230,0.12)", padding: "5px 11px", borderRadius: 8 }}>{positive} positive</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: badC, background: "rgba(110,43,255,0.10)", padding: "5px 11px", borderRadius: 8 }}>{critical} critical</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ transform: o ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      </button>
      {o && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "12px 0" }}>
            {(dist || []).map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 11, color: C.muted, width: 36 }}>{d.label}</span><div style={{ flex: 1, height: 6, background: "rgba(21,20,21,0.06)", borderRadius: 100, overflow: "hidden" }}><div style={{ width: d.pct + "%", height: "100%", background: d.bad ? badC : goodC }} /></div><span style={{ fontSize: 11, color: C.muted, width: 28, textAlign: "right" }}>{d.n}</span></div>
            ))}
          </div>
          <BotNote inline text="Reply to critical reviews promptly and publicly. A calm, helpful response to a bad review builds more trust than a wall of five-star ratings, and AI engines increasingly factor review responses into local reputation." />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, borderTop: "1px solid rgba(21,20,21,0.06)", paddingTop: 10 }}>Shown only for pages tied to a local business profile.</div>
        </div>
      )}
    </div>
  );
};

/* ═══ REPORT ═══ */
const AIReadinessReport = ({ data }) => {
  const ai = data.aiReadiness || {};
  const aiGood = ai.aiGood || [];
  const aiBad = ai.aiBad || [];
  const prioOrder = { critical: 0, important: 1, nice: 2 };
  aiBad.sort((a, b) => (prioOrder[a.priority] ?? 1) - (prioOrder[b.priority] ?? 1));
  const t = data.trust || {};

  return (
    <div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 16px" }}>
      <BotNote text="Here's how AI search tools see your page right now. I'll show what's working, what to fix first, and where you can earn more trust." />

      <HeroScore ai={ai} />

      {TRUST_LIVE && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 11 }}>Trust and authority</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 11, marginBottom: 11 }}>
            <TrustCard label="AI citations of your page" total={t.aiCitations} unit="times cited" sourcesLabel="By platform" sources={t.aiCitationsBy} />
            <TrustCard label="AI mentions of your brand" total={t.aiMentions} unit="named, no link" sourcesLabel="By platform" sources={t.aiMentionsBy} />
            <TrustCard label="Web mentions of your brand" total={t.webMentions} unit={t.webPositivePct != null ? t.webPositivePct + "% positive" : ""} sourcesLabel="Top domains" sources={t.webMentionsBy} />
          </div>
          <BacklinksBlock total={t.backlinks} domains={t.referringDomains} rows={t.backlinkRows} />
          {t.hasLocalBusiness && <RatingBlock rating={t.rating} count={t.reviewCount} positive={t.positiveCount} critical={t.criticalCount} dist={t.reviewDist} />}
        </div>
      )}

      <BotNote text={aiGood.length > 0 ? aiGood.length + " AI search signals are in place." : "Let's check how AI search tools see your page."} />
      {(aiGood.length > 0 || (ai.extractablePassages && ai.extractablePassages.length > 0)) && <div style={{ marginBottom: 12 }}><Fold title="AI Search Optimization — Working Well" count={aiGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{ai.extractablePassages && ai.extractablePassages.length > 0 && <WorkingItem title="Passages AI is most likely to quote" content={(<><BotNote inline text="AI search tools like ChatGPT and Perplexity tend to pull self-contained passages (roughly 100–180 words) straight into their answers. These are the strongest candidates on your page right now." /><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{ai.extractablePassages.map((p, i) => (<div key={"pq" + i} style={{ padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}`, borderLeft: "3px solid #B89CF0" }}><div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5 }}>{p.text}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{p.words} words</div></div>))}</div></>)} />}{aiGood.map((g, i) => <WorkingItem key={i} title={g.title} content={g.content} />)}</div></Fold></div>}

      <BotNote text={aiBad.length > 0 ? aiBad.length + " AI readiness signals need improvement." : "All AI readiness signals are in place!"} />
      {aiBad.length > 0 && <div style={{ marginBottom: 20 }}><Fold title="AI Search Optimization — Needs Improvement" count={aiBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{aiBad.map((p, i) => <ProblemCard key={i} {...p} />)}</div></Fold></div>}

      <DistributionTipsBlock tips={distributionTipsForPageType(ai.pageType || "other")} />
    </div>
  );
};

/* ═══ MAIN COMPONENT ═══ */
function AIReadinessTool({ onHome, memberName: mn }) {
  const isMobile = useIsMobile();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [err, setErr] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const chatRef = useRef(null);
  const uid = getMemberId();
  const allowed = WHITELIST.length === 0 || (uid && WHITELIST.indexOf(uid) !== -1);

  const add = (f, c) => setMsgs(p => [...p, { f, c, id: Date.now() + Math.random() }]);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs.length, typing]);

  const runAudit = useCallback(async () => {
    const target = (url || "").trim();
    if (!target || busy) return;
    let full = target; if (!/^https?:\/\//i.test(full)) full = "https://" + full;
    setBusy(true); setErr(null); setAuditData(null);
    let origin = ""; try { origin = new URL(full).origin; } catch (e) {}
    try {
      const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
        fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: full }) }),
        origin ? fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: origin + "/robots.txt" }) }) : Promise.resolve(null),
        origin ? fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: origin + "/llms.txt" }) }) : Promise.resolve(null)
      ]);
      if (htmlRes.status !== "fulfilled" || !htmlRes.value || !htmlRes.value.ok) throw new Error("Could not fetch the page");
      const rawHtml = await htmlRes.value.text();
      let robotsContent = null, llmsContent = null;
      try { if (robotsRes.status === "fulfilled" && robotsRes.value && robotsRes.value.ok) { const tx = await robotsRes.value.text(); if (tx && !/<html|<!doctype/i.test(tx.slice(0, 200))) robotsContent = tx; } } catch (e) {}
      try { if (llmsRes.status === "fulfilled" && llmsRes.value && llmsRes.value.ok) { const tx = await llmsRes.value.text(); if (tx && !/<html|<!doctype/i.test(tx.slice(0, 200))) llmsContent = tx; } } catch (e) {}

      const pageType = detectPageType(full, rawHtml);
      if (!window.AIReadiness || typeof window.AIReadiness.parse !== "function") throw new Error("AI Readiness engine not loaded — include ai-readiness-v4.js before this file");
      const aiResult = window.AIReadiness.parse(rawHtml, full, robotsContent, llmsContent, pageType);
      const aiReadiness = analyzeAIReadiness(aiResult, pageType);
      let hostname = ""; try { hostname = new URL(full).hostname; } catch (e) {}
      const reportData = { url: full, hostname, pageType, aiReadiness, _aiRaw: aiResult };
      setAuditData(reportData);
      add("b", <div><div style={{ fontWeight: 600, marginBottom: 6 }}>Done. Your AI readiness score is {Math.round(aiReadiness.score || 0)} out of 100.</div><div style={{ color: C.muted, fontSize: 12 }}>{aiReadiness.aiBad.length} signal{aiReadiness.aiBad.length === 1 ? "" : "s"} to improve. Ask me about any of them.</div></div>);

      /* tracking snapshot (flow_type ai_readiness) — non-blocking, never breaks the report.
         No credit deducted and no run RPC in preview (a dedicated runs RPC can be added later with approval). */
      try {
        const mid = uid;
        const isUUID = mid && /^[0-9a-f]{8}-/.test(mid);
        const a = aiReadiness;
        const aiTotal = a.total || ((a.aiGood ? a.aiGood.length : 0) + (a.aiBad ? a.aiBad.length : 0));
        const snapBody = {
          p_domain: hostname || "",
          p_flow_type: "ai_readiness",
          p_audit_score: a.score != null ? a.score : null,
          p_coverage: { page_type: pageType, ai_status: a.status || null, ai_score: a.score != null ? a.score : null, checks_passed: a.aiGood ? a.aiGood.length : null, checks_total: aiTotal || null, breakdown: a.breakdown || null }
        };
        if (isUUID) snapBody.p_user_id = mid; else if (mid) snapBody.p_member_id = mid;
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_snapshot`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()), "apikey": SUPABASE_KEY }, body: JSON.stringify(snapBody) });
        console.log("[AIR] insert_snapshot:", r.status);
      } catch (e) { console.warn("[AIR] insert_snapshot error:", e); }
    } catch (e) {
      setErr(e.message || "Something went wrong");
    } finally { setBusy(false); }
  }, [url, busy, uid]);

  const sendChat = useCallback(async (q) => {
    const text = (q || "").trim(); if (!text) return;
    add("u", text); setTyping(true);
    try {
      /* Stopgap: reuse coverage-gpt until a dedicated AI Readiness prompt/endpoint is wired.
         The prompt gets rewritten separately for AI Readiness (no prompt is compressed or edited here). */
      const ctx = auditData ? { score: auditData.aiReadiness.score, page_type: auditData.pageType, needs: (auditData.aiReadiness.aiBad || []).map(b => b.title) } : null;
      const res = await fetch(COVERAGE_GPT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ step: "chat", question: text, context: ctx }) });
      let reply = "";
      if (res.ok) { const d = await res.json(); reply = d.reply || d.message || d.answer || ""; }
      setTyping(false);
      add("b", reply || "I can walk you through any signal in the report. Tell me which one and I'll explain what to change.");
    } catch (e) { setTyping(false); add("b", "I can walk you through any signal in the report. Tell me which one and I'll explain what to change."); }
  }, [auditData]);

  if (!allowed) {
    return (<div style={{ fontFamily: "'DM Sans',sans-serif", maxWidth: 520, margin: "40px auto", padding: "0 16px", textAlign: "center", color: C.muted }}><div style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>AI Readiness is coming soon</div><div style={{ fontSize: 13, lineHeight: 1.6 }}>This tool is in preview. It will open to everyone shortly.</div></div>);
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", color: C.dark }}>
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 0", display: "flex", gap: 8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") runAudit(); }} placeholder="Paste a page URL" style={{ flex: 1, fontFamily: "inherit", fontSize: 13, height: 40, padding: "0 14px", border: `1px solid ${C.borderMid}`, borderRadius: 10, background: C.surface, color: C.dark }} />
        <button onClick={runAudit} disabled={busy} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, height: 40, padding: "0 20px", border: `1px solid ${C.borderMid}`, borderRadius: 10, background: C.surface, color: C.dark, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }} onMouseEnter={e => { if (!busy) e.currentTarget.style.background = C.accentLight; }} onMouseLeave={e => e.currentTarget.style.background = C.surface}>{busy ? "Checking…" : "Run Check"}</button>
      </div>

      {err && <div style={{ maxWidth: 580, margin: "12px auto 0", padding: "0 16px", fontSize: 13, color: C.accent }}>{err}</div>}

      {auditData && <AIReadinessReport data={auditData} />}

      {auditData && (
        <div style={{ maxWidth: 580, margin: "0 auto", padding: "0 16px 24px" }}>
          <div ref={chatRef} style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto", padding: "4px 2px" }}>
            {msgs.map(m => m.f === "b" ? <BB key={m.id}>{m.c}</BB> : <UB key={m.id} n={mn}>{m.c}</UB>)}
            {typing && <BB><span style={{ color: C.muted }}>…</span></BB>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input id="air-chat" placeholder="Ask about your results" onKeyDown={e => { if (e.key === "Enter") { sendChat(e.target.value); e.target.value = ""; } }} style={{ flex: 1, fontFamily: "inherit", fontSize: 13, height: 40, padding: "0 14px", border: `1px solid ${C.borderMid}`, borderRadius: 10, background: C.surface, color: C.dark }} />
            <button onClick={() => { const el = document.getElementById("air-chat"); if (el) { sendChat(el.value); el.value = ""; } }} style={{ fontFamily: "inherit", fontSize: 13, fontWeight: 600, height: 40, padding: "0 18px", border: `1px solid ${C.borderMid}`, borderRadius: 10, background: C.surface, color: C.dark, cursor: "pointer" }}>Ask</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.AIReadinessTool = AIReadinessTool;
})();
