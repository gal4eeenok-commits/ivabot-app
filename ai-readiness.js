/* IvaBot AI Readiness (standalone) v3.7 — cloned from content-coverage.js shell; AI Readiness report for only, free preview, whitelist-gated. v3.1 change: removed the page backlinks block and the Google reviews / local-rating block (these now belong to Core Audit); the open-web mentions row is renamed to Brand mentions across the web. v3.2 change: distribution tips are now generated per page and vertical via the air-gpt distribution_tips step, with fallback to the static page-type tips. v3.3 change: tips load in the background after the report is shown, so the report never blocks; the tips block shows page-type tips instantly and quietly upgrades to the tailored ones when they arrive. v3.4 change: trimmed the completion message to score, signals, and a short invite to ask. v3.5 change: each completed analysis is recorded to Run history via insert_air_run (flow_type=ai_readiness); credit charge deferred until AI metrics are live and the whitelist is lifted. */
(function() {
const{useState,useRef,useEffect,useCallback}=React;
console.log("[IvaBot] ai-readiness.js (standalone) v4.1 loaded");

/* Phase 3: persist the finished Coverage result so a reload restores it (no re-run, no credit).
   reportData is plain JSON EXCEPT aiReadiness, which bakes React elements (aiGood[].content). Elements do not
   survive JSON, so on save we drop aiReadiness + keep the raw AI result, and rebuild aiReadiness on restore. */
var _COV_REPORT_TTL = 24 * 60 * 60 * 1000;
function _covReportKey(mid){ return "iva_coverage_report_" + (mid || "anon"); }
function _covStripEls(k, v){ if (v && typeof v === "object" && v.$$typeof) return undefined; return v; }
function saveCoverageReport(mid, data){ try { localStorage.setItem(_covReportKey(mid), JSON.stringify({ savedAt: Date.now(), data: data }, _covStripEls)); } catch(e){ console.warn("[CC] saveCoverageReport failed", e); } }
function loadCoverageReport(mid){ try { var raw = localStorage.getItem(_covReportKey(mid)); if(!raw) return null; var o = JSON.parse(raw); if(!o || !o.data) return null; if(Date.now() - (o.savedAt||0) > _COV_REPORT_TTL){ localStorage.removeItem(_covReportKey(mid)); return null; } return o.data; } catch(e){ return null; } }
function clearCoverageReport(mid){ try { localStorage.removeItem(_covReportKey(mid)); } catch(e){} }
function _covIsReload(){ try { var nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")) || []; if (nav[0] && nav[0].type) return nav[0].type === "reload"; } catch(e){} try { return !!(performance.navigation && performance.navigation.type === 1); } catch(e){} return false; }
/* Safety net: a restored report should never white-screen the app. */
class _CovErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err){ return { err: err }; }
  componentDidCatch(err, info){ console.error("[CC] report render error:", err, info && info.componentStack); try { clearCoverageReport(getMemberId()); } catch(e){} }
  render(){ if (this.state.err) return this.props.fallback || null; return this.props.children; }
}

/* ═══ CONFIG ═══ */
const USE_MOCK=false;
/* July-1 flip flags — single source of truth (guarded; shared with other tools). */
window.IVA_FLAGS = window.IVA_FLAGS || { backlinksLive: false, toolsOpen: false };
const SUPABASE_URL="https://empuzslozakbicmenxfo.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";

/* IvaBot security step 1: send the logged-in user's session token instead of the anon key.
   Falls back to the anon key if no session, so this change is non-breaking on its own. */
async function ivaAuthToken(){try{if(window.__supabase){const{data:{session}}=await window.__supabase.auth.getSession();if(session&&session.access_token)return session.access_token;}}catch(e){}return SUPABASE_KEY;}

const CORS_PROXY=SUPABASE_URL+"/functions/v1/fetch-page";
const DFS_PROXY=SUPABASE_URL+"/functions/v1/dataforseo-proxy";
const COVERAGE_GPT=SUPABASE_URL+"/functions/v1/coverage-gpt";
const AIR_GPT=SUPABASE_URL+"/functions/v1/air-gpt";

/* ═══ MEMBER ID + CREDITS ═══ */
function getMemberId(){if(window.__memberId)return window.__memberId;if(window.__userId)return window.__userId;try{const sb=window.__supabase;if(sb){const key=Object.keys(localStorage).find(k=>k.includes('auth-token'));if(key){const data=JSON.parse(localStorage.getItem(key));if(data?.user?.id)return data.user.id;}}}catch(e){}return null;}
async function checkCoverageCredits(memberId){if(!memberId)return{ok:true};try{let res=await fetch(`${SUPABASE_URL}/rest/v1/usage?user_id=eq.${memberId}&select=coverage_used,coverage_limit`,{headers:{"Authorization":"Bearer "+(await ivaAuthToken()),"apikey":SUPABASE_KEY}});let rows=res.ok?await res.json():[];if(rows.length===0){res=await fetch(`${SUPABASE_URL}/rest/v1/usage?member_id=eq.${memberId}&select=coverage_used,coverage_limit`,{headers:{"Authorization":"Bearer "+(await ivaAuthToken()),"apikey":SUPABASE_KEY}});rows=res.ok?await res.json():[];}if(rows.length===0)return{ok:true};const{coverage_used,coverage_limit}=rows[0];if(coverage_limit&&coverage_limit>0&&coverage_used>=coverage_limit)return{ok:false,used:coverage_used,limit:coverage_limit};return{ok:true,used:coverage_used,limit:coverage_limit};}catch(e){console.error("[CC] checkCredits error:",e);return{ok:true};}}
async function trackCoverageUsage(memberId){if(!memberId){console.log("[CC] trackUsage: no memberId");return{success:false};}try{const isUUID=/^[0-9a-f]{8}-/.test(memberId);const rpcBody=isUUID?{p_user_id:memberId}:{p_member_id:memberId};const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_coverage_used`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(await ivaAuthToken()),"apikey":SUPABASE_KEY},body:JSON.stringify(rpcBody)});if(res.ok){const data=await res.json();console.log("[CC] trackUsage:",JSON.stringify(data));return data;}else{console.error("[CC] trackUsage HTTP",res.status);return{success:false};}}catch(e){console.error("[CC] trackUsage error:",e);return{success:false};}}
async function recordCoverageRun(memberId,url){try{const isUUID=/^[0-9a-f]{8}-/.test(memberId);const runBody=isUUID?{p_user_id:memberId,p_source_url:url||null}:{p_member_id:memberId,p_source_url:url||null};const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_coverage_run`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(await ivaAuthToken()),"apikey":SUPABASE_KEY},body:JSON.stringify(runBody)});let runId=null;try{const d=await res.json();runId=d&&d.run_id?d.run_id:null;}catch(_){}console.log("[CC] run recorded:",runId);return runId;}catch(e){console.error("[CC] run record error:",e);return null;}}
async function recordAirRun(memberId,url){try{const isUUID=/^[0-9a-f]{8}-/.test(memberId);const runBody=isUUID?{p_user_id:memberId,p_source_url:url||null}:{p_member_id:memberId,p_source_url:url||null};const res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_air_run`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(await ivaAuthToken()),"apikey":SUPABASE_KEY},body:JSON.stringify(runBody)});let runId=null;try{const d=await res.json();runId=d&&d.run_id?d.run_id:null;}catch(_){}console.log("[AIR] run recorded:",runId);return runId;}catch(e){console.error("[AIR] run record error:",e);return null;}}
async function recordAirSnapshot(a){try{var ai=a.aiReadiness||{};var good=ai.aiGood||[];var bad=ai.aiBad||[];var passed=good.length;var total=ai.total||(good.length+bad.length);var score=(typeof ai.score==="number")?Math.round(ai.score):null;var coverage={score:score,signals_passed:passed,signals_total:total,page_type:ai.pageType||null,good:good.map(function(g){return g&&g.title;}).filter(Boolean),bad:bad.map(function(b){return b&&b.title;}).filter(Boolean),aio:(a.aioItems&&a.aioItems.length?a.aioItems:null)};var isUUID=/^[0-9a-f]{8}-/.test(a.memberId||"");var body={p_domain:a.domain||null,p_user_id:isUUID?a.memberId:null,p_member_id:isUUID?null:(a.memberId||null),p_flow_type:"ai_readiness",p_run_id:a.runId||null,p_audit_score:score,p_coverage:coverage,p_ai_mentions_count:(a.ai_mentions_count!=null)?a.ai_mentions_count:null,p_ai_search_volume:(a.ai_search_volume!=null)?a.ai_search_volume:null,p_ai_overview_count:(a.ai_overview_count!=null)?a.ai_overview_count:null,p_prompts_checked:a.prompts_checked||null,p_subject:"self"};var res=await fetch(`${SUPABASE_URL}/rest/v1/rpc/insert_snapshot`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+(await ivaAuthToken()),"apikey":SUPABASE_KEY},body:JSON.stringify(body)});if(res.ok){var dd=await res.json();console.log("[AIR] snapshot recorded:",JSON.stringify(dd));return dd;}var t="";try{t=await res.text();}catch(e){}console.error("[AIR] snapshot HTTP",res.status,t.slice(0,200));return null;}catch(e){console.error("[AIR] snapshot error:",e);return null;}}

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
                  {(tip && typeof tip === "object") ? (<><span style={{ fontWeight: 700 }}>{tip.channel}:</span> {tip.action}</>) : renderBoldText(tip)}
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
/* ═══ geo signal helpers (currency / phone / script) — non-English locale detection ═══ */
function scanCurrencies(text){ if(!text) return []; var t=(" "+text+" ").toLowerCase().slice(0,8000); var CUR={ "\u20b4":"ua","\u0433\u0440\u043d":"ua","uah":"ua","\u20bd":"ru","\u0440\u0443\u0431":"ru","rub":"ru","\u20b8":"kz","\u0442\u04a3\u0433":"kz","kzt":"kz","byn":"by","z\u0142":"pl","pln":"pl","\u043b\u0432":"bg","bgn":"bg","\u20be":"ge","gel":"ge","\u0586":"am","amd":"am","\u20bc":"az","azn":"az","uzs":"uz","\u0441\u045e\u043c":"uz","\u20ba":"tr","try":"tr","lei":"ro","ron":"ro","k\u010d":"cz","czk":"cz","huf":"hu","\u20aa":"il","ils":"il","\ufdfc":"sa","sar":"sa","aed":"ae","r$":"br","brl":"br","\u20b9":"in","inr":"in","\u20a9":"kr","krw":"kr" }; var out={}; for(var k in CUR){ if(t.indexOf(k)>=0) out[CUR[k]]=1; } return Object.keys(out); }
function scanPhones(text){ if(!text) return []; var t=text.slice(0,8000); var P=[[/\+380/,"ua"],[/\+375/,"by"],[/\+77\d{2}/,"kz"],[/\+7[\s\-(]*[489]\d{2}/,"ru"],[/\+48/,"pl"],[/\+40/,"ro"],[/\+359/,"bg"],[/\+90/,"tr"],[/\+995/,"ge"],[/\+374/,"am"],[/\+994/,"az"],[/\+998/,"uz"],[/\+370/,"lt"],[/\+371/,"lv"],[/\+372/,"ee"],[/\+972/,"il"],[/\+971/,"ae"],[/\+966/,"sa"],[/\+420/,"cz"],[/\+351/,"pt"],[/\+30\d/,"gr"],[/\+49/,"de"],[/\+33/,"fr"],[/\+34/,"es"],[/\+39/,"it"],[/\+44/,"gb"],[/\+81/,"jp"],[/\+82/,"kr"],[/\+86/,"cn"],[/\+55/,"br"],[/\+36/,"hu"],[/\+31/,"nl"]]; var out=[]; for(var i=0;i<P.length;i++){ if(P[i][0].test(t)){ if(out.indexOf(P[i][1])<0) out.push(P[i][1]); } } return out; }
function scriptLang(text){ if(!text) return null; var t=text.slice(0,4000); var cyr=0,greek=0,kana=0,hangul=0,han=0,arab=0,hebrew=0; for(var i=0;i<t.length;i++){ var c=t.charCodeAt(i); if(c>=0x0400&&c<=0x04FF)cyr++; else if(c>=0x0370&&c<=0x03FF)greek++; else if(c>=0x3040&&c<=0x30FF)kana++; else if(c>=0xAC00&&c<=0xD7A3)hangul++; else if(c>=0x4E00&&c<=0x9FFF)han++; else if(c>=0x0600&&c<=0x06FF)arab++; else if(c>=0x0590&&c<=0x05FF)hebrew++; } var nl=cyr+greek+kana+hangul+han+arab+hebrew; if(nl<8) return null; if(kana>0) return "ja"; if(hangul>0) return "ko"; if(cyr>=greek&&cyr>=arab&&cyr>=hebrew&&cyr>=han){ if(/[\u0456\u0457\u0454\u0491]/i.test(t)) return "uk"; return "ru"; } if(greek>0) return "el"; if(arab>0) return "ar"; if(hebrew>0) return "he"; if(han>0) return "zh"; return null; }

function detectLocale(url, htmlLang, hreflang, opts) {
  opts = opts || {};
  var text = opts.text || "";
  var gptCountry = (opts.gptCountry||"").toString().toLowerCase().trim();
  var gptLang = (opts.gptLang||"").toString().toLowerCase().split(/[-_]/)[0].trim();
  var gptConf = (opts.gptConfidence||"").toString().toLowerCase().trim();

  var countryToLoc = {
    ro:{loc:2642,lang:"ro"}, de:{loc:2276,lang:"de"}, fr:{loc:2250,lang:"fr"},
    es:{loc:2724,lang:"es"}, it:{loc:2380,lang:"it"}, nl:{loc:2528,lang:"nl"},
    pl:{loc:2616,lang:"pl"}, pt:{loc:2620,lang:"pt-PT"}, br:{loc:2076,lang:"pt-BR"},
    ru:{loc:2643,lang:"ru"}, ua:{loc:2804,lang:"uk"}, tr:{loc:2792,lang:"tr"},
    se:{loc:2752,lang:"sv"}, no:{loc:2578,lang:"no"}, dk:{loc:2208,lang:"da"},
    fi:{loc:2246,lang:"fi"}, cz:{loc:2203,lang:"cs"}, gr:{loc:2300,lang:"el"},
    hu:{loc:2348,lang:"hu"}, at:{loc:2040,lang:"de"}, ch:{loc:2756,lang:"de"},
    be:{loc:2056,lang:"nl"}, gb:{loc:2826,lang:"en"}, uk:{loc:2826,lang:"en"},
    us:{loc:2840,lang:"en"}, au:{loc:2036,lang:"en"}, ca:{loc:2124,lang:"en"},
    in:{loc:2356,lang:"en"}, ie:{loc:2372,lang:"en"}, nz:{loc:2554,lang:"en"},
    za:{loc:2710,lang:"en"}, mx:{loc:2484,lang:"es"}, ar:{loc:2032,lang:"es"},
    jp:{loc:2392,lang:"ja"}, kr:{loc:2410,lang:"ko"}, cn:{loc:2156,lang:"zh-CN"},
    tw:{loc:2158,lang:"zh-TW"}, kz:{loc:2398,lang:"ru"}, by:{loc:2112,lang:"ru"},
    rs:{loc:2688,lang:"sr"}, bg:{loc:2100,lang:"bg"}, ge:{loc:2268,lang:"ka"},
    am:{loc:2051,lang:"hy"}, az:{loc:2031,lang:"az"}, uz:{loc:2860,lang:"uz"},
    il:{loc:2376,lang:"he"}, ae:{loc:2784,lang:"ar"}, sa:{loc:2682,lang:"ar"},
    lt:{loc:2440,lang:"lt"}, lv:{loc:2428,lang:"lv"}, ee:{loc:2233,lang:"et"}
  };
  var TLD_TO_COUNTRY = { ro:"ro",de:"de",fr:"fr",es:"es",it:"it",nl:"nl",pl:"pl",pt:"pt",br:"br",ru:"ru",ua:"ua",tr:"tr",se:"se",no:"no",dk:"dk",fi:"fi",cz:"cz",gr:"gr",hu:"hu",at:"at",ch:"ch",be:"be",au:"au",ca:"ca",in:"in",ie:"ie",nz:"nz",za:"za",mx:"mx",ar:"ar",jp:"jp",kr:"kr",cn:"cn",tw:"tw",kz:"kz",by:"by",rs:"rs",bg:"bg",ge:"ge",am:"am",az:"az",uz:"uz",il:"il",ae:"ae",sa:"sa",lt:"lt",lv:"lv",ee:"ee","co.uk":"gb",uk:"gb" };
  var langToDfs = { ro:"ro",de:"de",fr:"fr",es:"es",it:"it",nl:"nl",pl:"pl",pt:"pt-PT",ru:"ru",uk:"uk",tr:"tr",sv:"sv",no:"no",da:"da",fi:"fi",cs:"cs",el:"el",hu:"hu",ja:"ja",ko:"ko",zh:"zh-CN",en:"en",sr:"sr",bg:"bg",ka:"ka",hy:"hy",az:"az",uz:"uz",lt:"lt",lv:"lv",et:"et",he:"he",ar:"ar" };
  var LANG_DOMINANT_LOC = { ru:2643,uk:2804,en:2840,de:2276,fr:2250,es:2724,it:2380,pl:2616,"pt-PT":2620,"pt-BR":2076,pt:2076,tr:2792,ro:2642,bg:2100,el:2300,ja:2392,ko:2410,"zh-CN":2156,zh:2156,ar:2682,he:2376,nl:2528,sr:2688,cs:2203,hu:2348,sv:2752,ka:2268,hy:2051,az:2031,uz:2860,lt:2440,lv:2428,et:2233 };

  var country = null, source = "default";

  if (hreflang) { var hp = hreflang.toLowerCase().split(/[-_]/); if (hp.length>=2 && countryToLoc[hp[1]]) { country=hp[1]; source="hreflang:"+hreflang; } else if (countryToLoc[hp[0]]) { country=hp[0]; source="hreflang-lang:"+hp[0]; } }
  if (!country) { try { var host=new URL(url).hostname.toLowerCase(); var pr=host.split("."); if (pr.length>=3){ var two=pr.slice(-2).join("."); if (TLD_TO_COUNTRY[two]){ country=TLD_TO_COUNTRY[two]; source="tld:"+two; } } if (!country){ var t1=pr[pr.length-1]; if (TLD_TO_COUNTRY[t1]){ country=TLD_TO_COUNTRY[t1]; source="tld:"+t1; } } } catch(e){} }
  if (!country) { var cur=scanCurrencies(text); if (cur.length===1 && countryToLoc[cur[0]]) { country=cur[0]; source="currency:"+cur[0]; } else if (cur.length>1 && gptCountry && cur.indexOf(gptCountry)>=0) { country=gptCountry; source="currency+gpt:"+gptCountry; } }
  if (!country) { var ph=scanPhones(text); if (ph.length>=1 && countryToLoc[ph[0]]) { country=ph[0]; source="phone:"+ph[0]; } }
  if (!country && gptCountry && countryToLoc[gptCountry] && gptConf!=="low") { country=gptCountry; source="gpt:"+gptCountry; }

  var langCode = null;
  var sl = scriptLang(text); if (sl) langCode = sl;
  if (!langCode && htmlLang) { var hk=htmlLang.toLowerCase().split(/[-_]/)[0]; langCode = langToDfs[hk] || hk; }
  if (!langCode && gptLang) { langCode = langToDfs[gptLang] || gptLang; }
  if (!langCode && country) langCode = countryToLoc[country].lang;
  if (!langCode) langCode = "en";
  if (langCode === "zh") langCode = "zh-CN";

  var location_code, language_code = langCode;
  if (country) { location_code = countryToLoc[country].loc; }
  else if (LANG_DOMINANT_LOC[langCode]) { location_code = LANG_DOMINANT_LOC[langCode]; source = source + "|lang-dominant:" + langCode; }
  else { location_code = 2840; }

  console.log(`[CC] detectLocale: url=${url} htmlLang=${htmlLang} hreflang=${hreflang} country=${country} → loc=${location_code} lang=${language_code} (source=${source})`);
  return { location_code, language_code };
}

function extractGeoSignals(parsed) {
  var text = (((parsed&&parsed.title)||"")+" "+((parsed&&(parsed.body_text||parsed.visible_text))||"")).slice(0,8000);
  var tld = "unknown";
  try { if (parsed && parsed.hostname) { var h = parsed.hostname.toLowerCase().split("."); tld = h.slice(-2).join("."); } } catch(e){}
  var cur=scanCurrencies(text), ph=scanPhones(text), sl=scriptLang(text);
  var lines=[];
  lines.push("Domain TLD: "+tld);
  lines.push("Currencies on page: "+(cur.length?cur.join(", "):"none detected"));
  lines.push("Phone country prefixes: "+(ph.length?ph.join(", "):"none detected"));
  lines.push("HTML lang attribute: "+((parsed&&parsed.html_lang)||"none"));
  lines.push("hreflang: "+((parsed&&parsed.hreflang)||"none"));
  lines.push("Dominant script language: "+(sl||"latin/undetermined"));
  return lines.join("\n");
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
  const CTA_TOKENS = ["buy","add to cart","checkout","contact","sign up","get started","book","subscribe","download","learn more","shop now","order now","request","pricing","try","start","quote","free quote","get a quote","request a quote","estimate","free estimate","schedule","call now","consultation"];
  r.has_cta = false; r.cta_text = "";
  const htmlForCta = html.replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  for (const m of htmlForCta.matchAll(/<(a|button)([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    let v = (m[3]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    if(!v || v.length > 60 || v.length < 2 || /[{}<>\[\]="]/i.test(v)) continue;
    if(/menu-item|nav-link|nav__|navbar/i.test(m[2]||"")) continue;
    if(CTA_TOKENS.some(k=>new RegExp("(?:^|[^a-z])"+k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?:[^a-z]|$)","i").test(v)) || /(?:^|[^a-z])(btn|button|cta)(?:[^a-z]|$)/i.test(m[2]||"")) { r.has_cta=true; r.cta_text=v; break; }
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
  if (checkName === "citations") return "nice";
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
    llms: "**llms.txt is a simple text file telling AI tools what's important on your site** (like robots.txt for AI). It is optional \u2014 even if it shows up here, your page is completely fine without it. Adding it simply puts you ahead of most websites.",
    bots: "**AI crawlers are bots like GPTBot and ClaudeBot that read your site for AI search.** If your robots.txt blocks them, ChatGPT and Perplexity won't recommend you.",
    qa: "**Question patterns are headings written as actual questions** (\"What is X?\", \"How to Y?\"). They match how users ask AI tools, so your page gets cited more often.",
    og: "**Open Graph tags control how your link looks when shared online** — title, description, preview image. Without them, AI tools may skip your page.",
    author: "**Author information is markup or visible text saying who wrote the page.** AI tools trust pages with clear authorship and rarely cite anonymous content.",
    dates: "**A \"last updated\" date shows AI when the page was last edited.** AI prefers fresh content — without this, your page looks outdated even if it isn't.",
    citations: "**Outbound links are links from your page out to other websites.** Linking to relevant, trustworthy sources can complement your content, but it is optional and not a ranking factor on its own \u2014 your page is fine without them.",
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
    citations: ["Optional: where it genuinely helps the reader, link out to 1-2 relevant, trustworthy sources", "Cite specific studies or official documentation when you reference them", "Don't add links just for SEO \u2014 only when they help the reader"],
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
        <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>Content Coverage & AI Readiness Score</span>
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
      {(aiGood.length > 0 || data.aiReadiness.extractablePassages?.length > 0) && <div className="reveal" style={{ marginBottom: 12 }}><Fold title="AI Search Optimization — Working Well" count={aiGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{data.aiReadiness.extractablePassages?.length > 0 && <WorkingItem title="Passages AI is most likely to quote" content={(<><BotNote inline text="AI search tools like ChatGPT and Perplexity tend to pull self-contained passages (roughly 100–180 words) straight into their answers. These are the strongest candidates on your page right now." /><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{data.aiReadiness.extractablePassages.map((p, i) => (<div key={"pq" + i} style={{ padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}`, borderLeft: "3px solid #B89CF0" }}><div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5 }}>{p.text}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{p.words} words</div></div>))}</div></>)} />}{aiGood.map((g, i) => <WorkingItem key={i} title={g.title} content={g.content} />)}</div></Fold></div>}

      <BotNote text={aiBad.length > 0 ? `${aiBad.length} AI readiness signals need improvement.` : "All AI readiness signals are in place!"} />
      {aiBad.length > 0 && <div className="reveal" style={{ marginBottom: 20 }}><Fold title="AI Search Optimization — Needs Improvement" count={aiBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{aiBad.map((p, i) => <ProblemCard key={i} {...p} />)}</div></Fold></div>}

      {/* Distribution Tips — page-type-aware advice for AI citations (v4 addition) */}
      <BotNote text="Here are some tips on where to mention this page to build AI citation signals." />
      <div className="reveal" style={{ marginBottom: 20 }}>
        <DistributionTipsBlock tips={(data.distributionTips && data.distributionTips.length) ? data.distributionTips : distributionTipsForPageType(data.aiReadiness?.pageType || "other")} />
      </div>
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
              {item.why && typeof item.why === "string" && <div style={{ fontSize: 11.5, color: C.muted, marginBottom: item.suggestions?.[0] ? 6 : 0 }}>{renderBoldText(item.why)}</div>}
              {item.suggestions?.length > 0 && typeof item.suggestions[0] === "string" && (() => {
                const isBody = item.title?.includes("Body Content");
                const showSugs = isBody ? item.suggestions : item.suggestions.slice(0, 1);
                return <div style={{ padding: "8px 10px", borderRadius: 6, background: C.bg }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Suggested:</div>{showSugs.map((s, si) => <div key={si} style={{ fontSize: 12, fontWeight: 500, color: C.dark, padding: "2px 0" }}>{s}</div>)}</div>;
              })()}
            </div>
          </div>
        </div>)})}
        <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Re-audit after changes</div><div style={{ fontSize: 11.5, color: C.muted }}>Run another Content Coverage & AI Readiness audit to measure your progress.</div></div></div></div>
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
    { text: "Content Coverage & AI Readiness Report", fontSize: 10, color: mt, margin: [28, 0, 0, 0] },
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
        { text: "Run another Content Coverage & AI Readiness audit to measure your progress.", fontSize: 10, color: mt }
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
        { text: "Content Coverage & AI Readiness", bold: true, color: accentC, link: "https://ivabot.xyz/app?tool=coverage" }
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
async function generateAIReadinessPDF(data) {
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
    if (window.pdfMake && window.pdfMake.fonts) { window.pdfMake.fonts = { Roboto: { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" } }; }

    const dk = "#151415", mt = "#928E95", accentC = "#6E2BFF";
    const lavCardBg = "#fcfaff", lavCardBdr = "#dcd2f0", cardBg = "#F0EAFF", cardBdr = "#e6def8";
    const PRIO_PDF = { critical: { label: "Critical", color: "#6E2BFF", bg: "#ede4ff" }, important: { label: "Important", color: "#9B7AE6", bg: "#f1ebfc" }, nice: { label: "Nice to have", color: "#B89CF0", bg: "#f5f0fd" } };
    const dateString = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const domain = (() => { try { return new URL(data.url).hostname.replace(/^www\./, ""); } catch (e) { return "page"; } })();

    const secTitle = (t) => ({ text: t, fontSize: 18, bold: true, color: dk, margin: [0, 22, 0, 6] });
    const noteText = (t) => ({ text: t, fontSize: 11, color: mt, margin: [0, 0, 0, 8], lineHeight: 1.3 });
    const badge = (prio) => { const pr = PRIO_PDF[prio] || PRIO_PDF.important; return { table: { body: [[{ text: pr.label, fontSize: 8, bold: true, color: pr.color, margin: [6, 2, 6, 2] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => pr.bg } }; };
    const lavCard = (item) => { const stack = []; stack.push({ columns: [{ text: item.title, fontSize: 13, bold: true, color: dk, width: "*" }, { ...badge(item.priority), width: "auto", alignment: "right" }], columnGap: 8, margin: [0, 0, 0, 4] }); if (item.why && typeof item.why === "string") stack.push({ text: item.why.replace(/\*\*/g, "").slice(0, 300), fontSize: 11, color: mt, margin: [0, 0, 0, 4], lineHeight: 1.3 }); if (item.suggestions && item.suggestions.length > 0) { stack.push({ text: "Suggested:", fontSize: 9, color: mt, bold: true, margin: [0, 4, 0, 2] }); item.suggestions.forEach(x => { if (typeof x === "string") stack.push({ text: "\u2022 " + x, fontSize: 11, color: dk, margin: [0, 1, 0, 1] }); }); } if (item.links && item.links.length > 0) { stack.push({ text: "Learn more:", fontSize: 9, color: mt, bold: true, margin: [0, 6, 0, 2] }); item.links.forEach(l => { if (l && l.label && l.url) stack.push({ text: l.label, fontSize: 10, color: accentC, link: l.url, margin: [0, 1, 0, 1] }); }); } return { table: { widths: ["*"], body: [[{ stack, margin: [10, 10, 10, 10] }]] }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => lavCardBdr, vLineColor: () => lavCardBdr, fillColor: () => lavCardBg }, margin: [0, 0, 0, 8] }; };
    const makeLogo = () => new Promise(resolve => { const cvs = document.createElement("canvas"); cvs.width = 132; cvs.height = 116; const ctx = cvs.getContext("2d"); ctx.fillStyle = "#6E2BFF"; ctx.scale(2, 2); ctx.fill(new Path2D("M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z")); ctx.fill(new Path2D("M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7-.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z")); ctx.globalCompositeOperation = "destination-out"; ctx.beginPath(); ctx.ellipse(16.3, 24.8, 8.2, 8.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(48.9, 24.8, 8.2, 8.4, 0, 0, Math.PI * 2); ctx.fill(); resolve(cvs.toDataURL("image/png")); });
    const logoImg = await makeLogo();

    const ai = data.aiReadiness || {};
    const aiGood = ai.aiGood || [];
    const aiBad = (ai.aiBad || []).slice().sort((a, b) => (({ critical: 0, important: 1, nice: 2 }[a.priority]) ?? 1) - (({ critical: 0, important: 1, nice: 2 }[b.priority]) ?? 1));
    const passages = ai.extractablePassages || [];
    const score = typeof ai.score === "number" ? Math.round(ai.score) : 0;
    const passed = aiGood.length;
    const total = ai.total || (aiGood.length + aiBad.length);

    const content = [];
    content.push({ columns: [{ image: logoImg, width: 28 }, { text: "IvaBot", fontSize: 16, bold: true, color: dk, margin: [6, 5, 0, 0] }], columnGap: 4 });
    content.push({ text: "AI Readiness Report", fontSize: 26, bold: true, color: dk, margin: [0, 14, 0, 2] });
    content.push({ text: data.url || "", fontSize: 11, color: accentC, margin: [0, 0, 0, 2] });
    content.push({ text: dateString + (data.pageType ? "  \u00b7  Page type: " + String(data.pageType).replace(/_/g, " ") : ""), fontSize: 10, color: mt, margin: [0, 0, 0, 14] });

    content.push({ table: { widths: ["auto", "*"], body: [[{ text: String(score), fontSize: 40, bold: true, color: accentC, margin: [16, 14, 16, 14] }, { stack: [{ text: "AI readiness score", fontSize: 13, bold: true, color: dk, margin: [0, 16, 0, 2] }, { text: passed + " of " + total + " on-page signals passed", fontSize: 11, color: mt }] }]] }, layout: { hLineWidth: () => 1, vLineWidth: () => 1, hLineColor: () => cardBdr, vLineColor: () => cardBdr, fillColor: () => cardBg }, margin: [0, 0, 0, 8] });

    content.push(secTitle("AI citations & authority"));
    content.push(noteText("Live tracking of AI citations, brand mentions, and AI Overview presence, plus prompt visibility across ChatGPT, Perplexity, and Google AI, is available in your IvaBot dashboard for this domain."));

    content.push(secTitle("On-page AI signals \u2014 Working Well"));
    if (passages.length > 0) { content.push({ text: "Passages AI is most likely to quote", fontSize: 12, bold: true, color: dk, margin: [0, 2, 0, 4] }); passages.forEach(p => { content.push({ table: { widths: ["*"], body: [[{ stack: [{ text: p.text, fontSize: 10, color: dk, lineHeight: 1.3 }, { text: (p.words || 0) + " words", fontSize: 8, color: mt, margin: [0, 3, 0, 0] }], margin: [8, 8, 8, 8] }]] }, layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => "#f8f5ff" }, margin: [0, 0, 0, 6] }); }); }
    if (aiGood.length > 0) { aiGood.forEach(g => { content.push({ text: "\u2713 " + g.title, fontSize: 11, color: dk, margin: [0, 2, 0, 2] }); }); }
    else if (passages.length === 0) { content.push(noteText("No on-page signals detected yet.")); }

    content.push(secTitle("On-page AI signals \u2014 Needs Improvement"));
    if (aiBad.length > 0) aiBad.forEach(item => content.push(lavCard(item)));
    else content.push(noteText("All on-page AI signals are in place."));

    if (aiBad.length > 0) {
      content.push(secTitle("Final recommendations"));
      content.push(noteText("Fix these first, starting with anything marked critical."));
      aiBad.slice(0, 5).forEach((item, i) => { const pr = PRIO_PDF[item.priority] || PRIO_PDF.important; content.push({ columns: [{ text: (i + 1) + ".", fontSize: 11, bold: true, color: pr.color, width: 14 }, { stack: [{ text: item.title, fontSize: 11, bold: true, color: dk }, (item.suggestions && item.suggestions[0] && typeof item.suggestions[0] === "string") ? { text: item.suggestions[0], fontSize: 10, color: mt, margin: [0, 1, 0, 0] } : { text: "" }], width: "*" }], columnGap: 4, margin: [0, 0, 0, 6] }); });
    }

    content.push({ text: "Generated by IvaBot \u00b7 ivabot.xyz", fontSize: 9, color: mt, margin: [0, 26, 0, 0], alignment: "center" });

    const docDefinition = { content, pageMargins: [40, 40, 40, 50], defaultStyle: { font: "Roboto", color: dk }, footer: (cp, pc) => ({ text: cp + " / " + pc, fontSize: 8, color: mt, alignment: "center", margin: [0, 10, 0, 0] }) };

    const fileName = "IvaBot-AI-Readiness-" + domain + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
    const pdfDocGen = pdfMake.createPdf(docDefinition);
    const pdfBtn = document.getElementById("export-air-pdf-btn");
    const origHTML = pdfBtn ? pdfBtn.innerHTML : "";

    pdfDocGen.getBlob(async (pdfBlob) => {
      try {
        const blobUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a"); a.href = blobUrl; a.download = fileName; a.style.display = "none";
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 200);
        console.log("[AIR] PDF downloaded:", fileName);
        if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Downloaded"; pdfBtn.style.color = dk; }

        let upMemberId = window.__memberId || window.__userId;
        if (!upMemberId && window.__supabase) { try { const { data: { session } } = await window.__supabase.auth.getSession(); upMemberId = session?.user?.id; } catch (me) {} }
        if (upMemberId && pdfBlob) {
          if (pdfBtn) { pdfBtn.innerHTML = "Saving To Dashboard..."; pdfBtn.style.color = mt; }
          const form = new FormData();
          form.append("pdf", new File([pdfBlob], fileName, { type: "application/pdf" }));
          form.append("member_id", upMemberId);
          form.append("source_url", data.url || "");
          form.append("flow_type", "ai_readiness");
          fetch("https://empuzslozakbicmenxfo.supabase.co/functions/v1/upload-pdf", { method: "POST", body: form }).then(r => r.json()).then(res => {
            if (res?.already_saved) { if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Already Saved"; pdfBtn.style.color = dk; } }
            else if (res?.url) { console.log("[AIR] PDF saved:", res.url); if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Saved To Dashboard"; pdfBtn.style.color = dk; } }
            else { if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Downloaded"; pdfBtn.style.color = dk; } }
            setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 4000);
          }).catch(e => { console.warn("[AIR] PDF upload failed:", e); if (pdfBtn) { pdfBtn.innerHTML = "\u2713 Downloaded"; pdfBtn.style.color = dk; } setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 4000); });
        } else { setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 3000); }
      } catch (ue) { console.warn("[AIR] PDF error:", ue); if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }
    });
  } catch (err) { console.error("[AIR] PDF error:", err); alert("PDF export failed: " + err.message); }
}

function AIReadinessTool({ onHome, memberName: mn }) {
  const isMobile = useIsMobile();
  const [mTab, sMTab] = useState("chat");
  const [pLoad, sPLoad] = useState(null);
  const [step, setStep] = useState("init");
  const [msgs, sMsgs] = useState([]);
  const [typ, sTyp] = useState(false);
  const [showR, setSR] = useState(false);
  const [auditData, setAuditData] = useState(null);
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
    try { const _p = new URLSearchParams(window.location.search); if (_p.get("url") && _p.get("autorun") === "1") return; } catch (e) {}
    sTyp(true);
    setTimeout(() => { sTyp(false); add("b", mn ? `Hey, ${mn}!` : "Hey!"); sTyp(true); }, 1200);
    setTimeout(() => { sTyp(false); add("b", <div><div style={{ color: C.muted, fontSize: 12, marginBottom: 8 }}>I'll check how ready this page is to be cited by AI search tools like ChatGPT, Perplexity, and Google AI, and show you the signals to fix first.</div><div style={{ fontWeight: 600 }}>Just paste your URL below and I'll get started.</div></div>); setStep("url"); }, 3200);
  }, []);
  const _autoRanAir = useRef(false);
  useEffect(() => {
    if (_autoRanAir.current) return;
    try {
      const p = new URLSearchParams(window.location.search);
      const au = p.get("url");
      if (au && p.get("autorun") === "1") {
        _autoRanAir.current = true;
        try { const u2 = new URL(window.location); u2.searchParams.delete("url"); u2.searchParams.delete("autorun"); window.history.replaceState({}, "", u2); } catch (e) {}
        setTimeout(() => { try { runAIReadiness(au); } catch (e) {} }, 1200);
      }
    } catch (e) {}
  }, []);


  /* ═══ AI READINESS PIPELINE (no credits in preview, no DFS, no keywords) ═══ */
  const runAIReadiness = async (url) => {
    /* Charge 1 credit up front (unified wallet). Abort only if the wallet confirms insufficient. */
    try {
      const _mid = getMemberId();
      const _isU = _mid && /^[0-9a-f]{8}-/.test(_mid);
      const _chBody = _isU ? { p_user_id: _mid, p_action: "ai_readiness", p_cost: 1 } : { p_member_id: _mid, p_action: "ai_readiness", p_cost: 1 };
      const _chRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/charge_credit`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()), "apikey": SUPABASE_KEY }, body: JSON.stringify(_chBody) });
      const _ch = await _chRes.json();
      console.log("[AIR] charge_credit:", _ch);
      if (_ch && _ch.ok === false) { try { sPLoad(null); } catch(e) {} try { alert("Not enough credits to run AI Readiness. Buy more credits to continue."); } catch(e) {} return; }
    } catch(e) { console.warn("[AIR] charge_credit error:", e); }
    setSR(false); setAuditData(null); sPLoad("Analyzing your page...");
    try {
      let origin = ""; try { origin = new URL(url).origin; } catch (e) {}
      const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
        fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }),
        origin ? fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: origin + "/robots.txt" }) }) : Promise.resolve(null),
        origin ? fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: origin + "/llms.txt" }) }) : Promise.resolve(null),
      ]);
      if (htmlRes.status !== "fulfilled" || !htmlRes.value || !htmlRes.value.ok) throw new Error("Could not fetch page");
      const rawHtml = await htmlRes.value.text();
      let robotsContent = null, llmsContent = null;
      try { if (robotsRes.status === "fulfilled" && robotsRes.value && robotsRes.value.ok) { const t = await robotsRes.value.text(); if (t && !/<html|<!doctype/i.test(t.slice(0, 200))) robotsContent = t; } } catch (e) {}
      try { if (llmsRes.status === "fulfilled" && llmsRes.value && llmsRes.value.ok) { const t = await llmsRes.value.text(); if (t && !/<html|<!doctype/i.test(t.slice(0, 200))) llmsContent = t; } } catch (e) {}

      const parsed = parseCoverage(rawHtml, url);

      /* page type — best-effort via GPT context, falls back to "other" */
      let pageType = "other";
      try {
        const gptRes = await fetch(COVERAGE_GPT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ step: "extract_context", parsed_summary: parsed.summary, domain: parsed.hostname, primary_keyword: parsed.primary_keyword, signals: extractGeoSignals(parsed) }) });
        if (gptRes.ok) { const gpt = await gptRes.json(); pageType = (gpt && gpt.page_type) || "other"; }
      } catch (e) {}

      if (!(window.AIReadiness && typeof window.AIReadiness.parse === "function")) throw new Error("AI Readiness engine not loaded");
      const aiResult = window.AIReadiness.parse(rawHtml, url, robotsContent, llmsContent, pageType);
      const aiReadiness = analyzeAIReadiness(aiResult, pageType);
      console.log("[AIR] AI Readiness:", aiReadiness.score + "/100", "type=" + aiReadiness.pageType, "good=" + aiReadiness.aiGood.length + "/" + aiReadiness.total);

      const d = { url, title: parsed.title || "", pageType: aiReadiness.pageType || pageType, aiReadiness };
      sPLoad(null); setAuditData(d); setSR(true); setStep("done"); sTyp(false);
      /* Run history (layer 1): record this completed AI Readiness run so it shows in the dashboard.
         Credit charge intentionally deferred while metrics are demo and the tool is whitelisted.
         To enable charging later: call trackCoverageUsage(_air_mid) here AND add a checkCoverageCredits gate before runAIReadiness. */
      /* Run + snapshot are recorded together in the coordinator below, after the AI-metric fetches settle. */
      /* AIR: real AI mentions of the brand (llm_mentions) — feeds the trust table; no demo. */
      const _pMentions = (async () => {
        try {
          var _isHome = ((url || "").toLowerCase().replace(/^https?:\/\/[^/]+/, "").replace(/[#?].*$/, "").replace(/\/+$/, "") === "");
          if (!_isHome) return null; /* brand mentions / AI search volume are domain-level — homepage only. Internal pages stay page-level (score, on-page signals, prompt visibility). */
          var _host = ""; try { _host = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
          if (!_host) return;
          /* brand for AI-mentions: prefer the site's own declared name (og:site_name), then the last title segment (e.g. "Aptos | Ashfall Studio" -> "Ashfall Studio"), then the domain's second-level label. */
          var _brand = "";
          try {
            var _ogm = rawHtml.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i) || rawHtml.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:site_name["']/i);
            if (_ogm && _ogm[1]) _brand = _ogm[1].trim();
            if (_brand && (_brand.length > 40 || _brand.length < 2)) _brand = "";
          } catch (e) {}
          try {
            if (!_brand) {
              var _tt = (d.title || "").trim();
              var _seg = _tt.split(/\s[|\u2013\u2014\u00b7:\-]\s/).map(function (s) { return s.trim(); }).filter(Boolean);
              if (_seg.length > 1) _brand = _seg[_seg.length - 1];
              if (!_brand || _brand.length > 40 || _brand.length < 2) _brand = "";
            }
          } catch (e) {}
          if (!_brand) _brand = _host.split(".")[0];
          var _mr = await fetch(DFS_PROXY, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ mode: "llm_mentions", brand: _brand, target: _host, platform: "google" }) }).then(function (r) { return r.ok ? r.json() : null; });
          if (_mr) {
            var _m = (_mr.mentions != null) ? _mr.mentions : 0;
            var _asv = (_mr.ai_search_volume != null) ? _mr.ai_search_volume : 0;
            var _rows = [
              { label: "AI mentions of your brand", value: String(_m), period: "last 30 days", tip: "Times AI answers (ChatGPT, Perplexity, Google AI) named your brand in the last 30 days. 0 means no AI mentions found yet; the on-page fixes and distribution tips below are how you earn them." },
              { label: "AI search volume", value: String(_asv), period: "est. monthly", tip: "Estimated monthly AI-driven searches related to your brand." }
            ];
            setAuditData(function (prev) { return (prev && prev.url === d.url) ? Object.assign({}, prev, { trust: { rows: _rows } }) : prev; });
            return { ai_mentions_count: _m, ai_search_volume: _asv };
          }
          return null;
        } catch (_me) { console.log("[AIR] llm_mentions", _me); return null; }
      })();
      /* AIR (variant B): AI Overview by the page's real ranked keywords \u2014 does Google show an AI Overview and are you cited. Hardcoded US/en (matches Core for English pages). */
      const _pAio = (async () => {
        try {
          var _h = ""; try { _h = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
          if (!_h) return;
          var _nrm = function (u) { try { var x = new URL(u); return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "")).toLowerCase(); } catch (e) { return String(u || "").toLowerCase(); } };
          var _rk = await fetch(DFS_PROXY, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ mode: "ranked_only", domain: _h, location_code: 2840, language_code: "en" }) }).then(function (r) { return r.ok ? r.json() : null; });
          var _pk = _nrm(url);
          var _kws = (((_rk && _rk.ranked_keywords) || []).filter(function (k) { return k && k.url && _nrm(k.url) === _pk; }).map(function (k) { return k.keyword; })).slice(0, 3);
          if (!_kws.length) { console.log("[AIR] ai_overview: no ranked keywords for this page"); return; }
          var _ao = await fetch(DFS_PROXY, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ mode: "ai_overview", keywords: _kws, target: _h, location_code: 2840, language_code: "en" }) }).then(function (r) { return r.ok ? r.json() : null; });
          if (_ao && Array.isArray(_ao.ai_overview) && _ao.ai_overview.length) {
            console.log("[AIR] ai_overview OK:", _ao.ai_overview.length, "keywords checked");
            /* Option B 2026-07-08: for the top-3 keywords, also check ChatGPT + Perplexity citation via llm_responses (extra credits). Fills the ChatGPT/Perplexity columns for those rows. */
            try {
              var _tok = await ivaAuthToken();
              var _top3 = _ao.ai_overview.slice(0, 3);
              var _llmJobs = [];
              _top3.forEach(function (row) {
                ["chat_gpt", "sonar"].forEach(function (eng) {
                  _llmJobs.push(fetch(DFS_PROXY, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + _tok }, body: JSON.stringify({ mode: "llm_responses", user_prompt: row.q, engine: eng }) }).then(function (r) { return r.ok ? r.json() : null; }).then(function (resp) { var c = false; try { c = !!(resp && resp.items && JSON.stringify(resp.items).toLowerCase().indexOf(_h) !== -1); } catch (e) {} return { q: row.q, eng: eng, cited: c }; }).catch(function () { return { q: row.q, eng: eng, cited: false }; }));
                });
              });
              var _llmRes = await Promise.all(_llmJobs);
              _ao.ai_overview.forEach(function (row) {
                _llmRes.forEach(function (lr) { if (lr.q === row.q) { if (lr.eng === "chat_gpt") row.chat_gpt = lr.cited; if (lr.eng === "sonar") row.perplexity = lr.cited; } });
              });
              console.log("[AIR] llm top-3 checked (ChatGPT + Perplexity)");
            } catch (_le) { console.log("[AIR] llm top-3 enrich error", _le); }
            setAuditData(function (prev) { return (prev && prev.url === d.url) ? Object.assign({}, prev, { aioItems: _ao.ai_overview }) : prev; });
            var _aioCited = _ao.ai_overview.reduce(function (n, x) { return n + ((x && x.cited) ? 1 : 0) + ((x && x.chat_gpt) ? 1 : 0) + ((x && x.perplexity) ? 1 : 0); }, 0);
            return { ai_overview_count: _aioCited, prompts_checked: _kws, aioItems: _ao.ai_overview };
          }
          return null;
        } catch (_ae) { console.log("[AIR] ai_overview", _ae); return null; }
      })();
      (async () => {
        try {
          const _dtCtx = `URL: ${url}\nTitle: ${parsed.title || ""}\nPage type: ${d.pageType}\nPrimary keyword: ${parsed.primary_keyword || ""}\nSummary: ${(parsed.summary || "").slice(0, 600)}`;
          const _dtRes = await fetch(AIR_GPT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ step: "distribution_tips", page_context: _dtCtx }) });
          if (!_dtRes.ok) return;
          const _dt = await _dtRes.json();
          if (_dt && Array.isArray(_dt.tips)) { const _clean = _dt.tips.filter(t => t && t.channel && t.action).slice(0, 4); if (_clean.length) setAuditData(prev => (prev && prev.url === d.url) ? { ...prev, distributionTips: _clean } : prev); }
        } catch (_dtErr) { console.log("[AIR] distribution_tips fallback", _dtErr); }
      })();
      (async () => {
        try {
          const _snapMid = getMemberId(); if (!_snapMid) return;
          var _snapDom = ""; try { _snapDom = new URL(url).hostname.replace(/^www\./, ""); } catch (e) {}
          if (!_snapDom) return;
          const _snapRunId = await recordAirRun(_snapMid, url);
          const _settled = await Promise.allSettled([_pMentions, _pAio]);
          const _mv = (_settled[0].status === "fulfilled" && _settled[0].value) ? _settled[0].value : {};
          const _av = (_settled[1].status === "fulfilled" && _settled[1].value) ? _settled[1].value : {};
          recordAirSnapshot({ memberId: _snapMid, domain: _snapDom, url: url, runId: _snapRunId, aiReadiness: aiReadiness, ai_mentions_count: (_mv.ai_mentions_count != null ? _mv.ai_mentions_count : null), ai_search_volume: (_mv.ai_search_volume != null ? _mv.ai_search_volume : null), ai_overview_count: (_av.ai_overview_count != null ? _av.ai_overview_count : null), prompts_checked: (_av.prompts_checked || null), aioItems: (_av.aioItems || null) });
        } catch (_snapErr) { console.log("[AIR] snapshot coordinator", _snapErr); }
      })();
      if (isMobile) sMTab("report");
      const nBad = aiReadiness.aiBad.length;
      const nGood = aiReadiness.aiGood.length;
      const nTot = aiReadiness.total || (nGood + nBad);
      bot(<div>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{"Done. " + aiReadiness.aiGood.length + " of " + aiReadiness.total + " AI signals are in place."}</div>
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.55, marginBottom: 8 }}>{nGood + " of " + nTot + " on-page signals that help AI cite this page are in place" + (nBad > 0 ? ", and " + nBad + " can be improved." : ".")}</div>
        <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.55 }}>Ask me anything, and I will explain each signal and how to get this page cited.</div>
      </div>);
    } catch (e) {
      sPLoad(null); sTyp(false);
      bot("Could not analyze this page: " + e.message + ". Please check the URL and try again.");
      setStep("url");
    }
  };

  const sendChat = async (text) => {
    if (chatCount >= MAX_CHAT) { bot("You've reached the message limit for this session. Run another check to keep going."); return; }
    setChatCount(c => c + 1); sTyp(true);
    try {
      const d = auditData;
      const history = msgs.filter(m => typeof m.c === "string").slice(-10).map(m => `${m.f === "b" ? "IvaBot" : "User"}: ${m.c}`).join("\n");
      const issues = ((d && d.aiReadiness && d.aiReadiness.aiBad) || []).map(b => b.title).join("; ");
      const res = await fetch(AIR_GPT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + (await ivaAuthToken()) }, body: JSON.stringify({ step: "air_chat", audit_context: `AI Readiness check.\nPage: ${d && d.url}\nTitle: "${d && d.title}"\nPage type: ${d && d.pageType}\nAI readiness score: ${d && d.aiReadiness && d.aiReadiness.score}/100\nSignals passed: ${((d && d.aiReadiness && d.aiReadiness.aiGood) || []).length}/${d && d.aiReadiness && d.aiReadiness.total}\nSignals to improve: ${issues}`, chat_history: history, question: text, credits_left: null }) });
      const raw = await res.json(); sTyp(false);
      bot(raw.text || raw.answer || "I couldn't find an answer for that one. Try rephrasing.");
    } catch (e) { sTyp(false); bot("Sorry, I couldn't process that. Try asking again."); }
  };

  const send = () => {
    const el = inputRef.current; if (!el || !el.value.trim()) return;
    const text = el.value.trim(); el.value = ""; add("u", text);
    if (step === "url") {
      const v = valUrl(text); if (!v.ok) { bot(v.e); return; }
      setPageUrl(v.url); sTyp(true); setStep("parsing"); runAIReadiness(v.url);
      return;
    }
    if (step === "done" || showR) {
      const v = valUrl(text);
      if (v.ok) { setPageUrl(v.url); bot("On it — checking " + v.url); sTyp(true); setStep("parsing"); runAIReadiness(v.url); return; }
      sendChat(text);
      return;
    }
  };

  const newCheck = () => {
    setSR(false); sMsgs([]); setAuditData(null); sPLoad(null); sMTab("chat"); setChatCount(0); setPageUrl(null); sTyp(true); setStep("init");
    setTimeout(() => { sTyp(false); add("b", mn ? `Hey, ${mn}!` : "Hey!"); sTyp(true); }, 800);
    setTimeout(() => { sTyp(false); add("b", <div><div style={{ fontWeight: 600 }}>Paste another URL and I'll check it.</div></div>); setStep("url"); }, 2000);
  };

  const lastBotIdx = msgs.reduce((acc, m, i) => m.f === "b" ? i : acc, -1);
  const chatMessages = <React.Fragment>
    <style>{`.cb-past-msg{opacity:0.75}.cb-past-msg button:not(.bot-tip-expand){pointer-events:none!important;cursor:default!important;opacity:0.5}`}</style>
    {msgs.map((m, i) => m.f === "b" ? <div key={m.id} className={i < lastBotIdx ? "cb-past-msg" : undefined}><BB>{typeof m.c === "string" ? m.c.split("\n").map((line, j) => <span key={j}>{j > 0 && <br />}{line}</span>) : m.c}</BB></div> : <UB key={m.id} n={mn}>{m.c}</UB>)}
    {typ && <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}><div style={{ marginBottom: 3, marginLeft: 2 }}><BL s={16} /></div><div style={{ padding: "10px 14px", borderRadius: "4px 12px 12px 12px", background: C.surface, border: `1px solid ${C.border}` }}><div className="typing-dots"><span /><span /><span /></div></div></div>}
  </React.Fragment>;

  const panelContent = <React.Fragment>{pLoad ? <LoadingPanel text={pLoad} /> : showR && auditData ? <div style={{ animation: "fadeIn 0.5s ease", minHeight: "calc(100vh - 130px)" }}><AIReadinessReport data={auditData} /></div> : <AIReadinessPlaceholder />}</React.Fragment>;
  const placeholder = step === "url" ? "Paste your URL here..." : "Ask me anything about AI readiness...";
  const inputDisabled = step === "parsing";

  const _uid = getMemberId();
  const _allowed = true; /* GO-LIVE: whitelist lifted */
  console.log("[AIR] uid:", _uid, "allowed:", _allowed);

  if (!_allowed) {
    return (<div style={{ fontFamily: "'DM Sans',sans-serif", flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: isMobile ? "0 12px 6px" : "0 24px 10px", display: "flex", alignItems: "center", gap: 6, maxWidth: 1224, margin: "0 auto", width: "100%" }}>
        <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted, display: "flex" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>AI Readiness</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ maxWidth: 420, textAlign: "center", padding: 32, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 8 }}>AI Readiness is coming soon</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>This tool is in private preview. It checks how ready your pages are to be cited by ChatGPT, Perplexity, and Google AI, and shows you the signals to fix first.</div>
        </div>
      </div>
    </div>);
  }

  return (<div style={{ fontFamily: "'DM Sans',sans-serif", flex: 1, display: "flex", flexDirection: "column" }}>
    <div style={{ padding: isMobile ? "0 12px 6px" : "0 24px 10px", display: "flex", alignItems: "center", gap: 6, maxWidth: 1224, margin: "0 auto", width: "100%" }}>
      <button onClick={onHome} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted, display: "flex" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>AI Readiness</span>
      
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
      <button onClick={newCheck} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = "#5a22d9"} onMouseLeave={e => e.currentTarget.style.background = C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>New Check</button>
      <button id="export-air-pdf-btn" onClick={() => generateAIReadinessPDF(auditData)} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Export PDF</button>
      
      <a href="https://ivabot.xyz/dashboard" target="_blank" rel="noopener noreferrer" style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", boxSizing: "border-box" }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M19 9l-5 5-4-4-3 3" /></svg>Dashboard</a>
    </div>}
  </div>);
}

const NumBadge = ({ n }) => { const colors = ["#9B7AE6", "#B89CF0", "#D4A0E8"]; const c = colors[(n - 1) % colors.length]; return (<span style={{ width: 22, height: 22, borderRadius: "50%", background: `${c}18`, color: c, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>); };

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

/* AI readiness score card — same style as the Coverage score card */
const AIReadinessScoreCard = ({ url, score, passed, total }) => {
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  return (<div className="reveal" style={{ display: "flex", gap: 16, marginBottom: 18, padding: 16, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}>
    <div style={{ width: 92, height: 92, flexShrink: 0, borderRadius: 14, background: C.card, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: `1px solid ${C.cardBorder}` }}>
      <span style={{ fontSize: 28, fontWeight: 700, color: C.dark }}>{passed}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#9B7AE6", marginTop: 1 }}>/ {total}</span>
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>AI signals in place</span>
        <QM text="How many of the AI-readiness signals I check are already in place on your page. These are the on-page things that make ChatGPT, Perplexity, and Google AI more likely to cite you. Also known as GEO (Generative Engine Optimization)." />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 8, wordBreak: "break-all" }}>{url}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>{pct}% in place</span>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#B89CF0" }}>{passed} of {total} signals</span>
        </div>
        <div style={{ height: 4, background: "rgba(110,43,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#B89CF0", borderRadius: 100, transition: "width 0.8s ease" }} />
        </div>
      </div>
    </div>
  </div>);
};

/* Trust & Authority blocks are drafted now; numbers connect to live data after the new data sources are added. */
const DownloadLink = ({ onClick, label }) => (
  <button onClick={onClick || (() => {})} style={{ background: "none", border: "none", cursor: "pointer", color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", display: "inline-flex", alignItems: "center", gap: 4, padding: 0, flexShrink: 0 }}>{label || "Download"}<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></button>
);

const TrustTable = ({ rows, dashHref }) => (
  <div className="reveal" style={{ marginBottom: 14, borderRadius: 12, border: `1px solid ${C.cardBorder}`, background: C.surface }}>
    <div style={{ background: C.card, padding: "12px 16px", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>AI citations & authority</span>
      <a href={dashHref || DASHBOARD_URL} title="Open this domain in your dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.accent, textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = "0.7"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M19 9l-5 5-4-4-3 3" /></svg>Dashboard
      </a>
    </div>
    <div style={{ padding: "2px 16px 10px" }}>
      {(rows || []).map((r, i) => (
        <div key={i} style={{ padding: "13px 0", borderTop: i ? "1px solid rgba(21,20,21,0.06)" : "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{r.label}</span>
              <QM text={r.tip} />
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.dark, whiteSpace: "nowrap" }}>{r.value}</span>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{r.period}</div>
            </div>
          </div>
          {r.note && <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 9, background: "rgba(110,43,255,0.05)", border: "1px solid rgba(110,43,255,0.12)", fontSize: 11.5, color: C.dark, lineHeight: 1.5 }}>{r.note}</div>}
          {r.chips && r.chips.length > 0 && <div style={{ marginTop: 8 }}>{r.chipsLabel && <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{r.chipsLabel}</div>}<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{r.chips.map((c, j) => <span key={j} style={{ fontSize: 11.5, fontWeight: 600, color: C.accent, background: "rgba(110,43,255,0.08)", padding: "5px 11px", borderRadius: 8 }}>{c}</span>)}</div></div>}
        </div>
      ))}
    </div>
  </div>
);

const Chip = ({ children, color }) => <span style={{ fontSize: 11, fontWeight: 600, color: color || C.accent, background: "rgba(110,43,255,0.08)", padding: "3px 9px", borderRadius: 8, display: "inline-block" }}>{children}</span>;

const TrustDetail = ({ row }) => {
  if (row.key === "mentions") {
    return (<div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>{row.goodNote}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Named by</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>{(row.engines || []).map((e, i) => <Chip key={i}>{e.name} · {e.n}</Chip>)}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Appeared for these prompts</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{(row.queries || []).map((q, i) => <div key={i} style={{ fontSize: 12, color: C.dark, padding: "7px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}` }}>“{q}”</div>)}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>Sentiment: {row.sentiment}</div>
    </div>);
  }
  if (row.key === "web") {
    const s = row.sentimentSplit || {};
    return (<div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12 }}>{row.goodNote}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Chip color="#9B7AE6">{s.pos} positive</Chip><Chip color={C.muted}>{s.neu} neutral</Chip><Chip color="#B89CF0">{s.neg} negative</Chip></div>
      <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Top domains mentioning you</div>
      <div style={{ fontSize: 12, color: C.dark, lineHeight: 1.9 }}>{(row.topDomains || []).join(" · ")}</div>
    </div>);
  }
  return <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{row.goodNote}</div>;
};

const AIOverviewBlock = ({ items, dashHref }) => {
  const rows = items || [];
  const triggered = rows.filter(r => r.triggers).length;
  const cited = rows.filter(r => r.cited).length;
  const total = rows.length;
  return (
  <div className="reveal" style={{ marginBottom: 20, borderRadius: 12, border: `1px solid ${C.cardBorder}`, background: C.surface }}>
    <div style={{ background: C.card, padding: "12px 16px", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}><span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Google AI Overview</span><QM text="For the questions people ask, whether Google shows an AI Overview and whether your page is cited inside it. A query can trigger an AI Overview without citing you. You pick the queries and run the check in the dashboard." /></span>
      <a href={dashHref || DASHBOARD_URL} title="Open this domain in your dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.accent, textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = "0.7"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M19 9l-5 5-4-4-3 3" /></svg>Dashboard</a>
    </div>
    <div style={{ padding: "4px 16px 14px" }}>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, margin: "8px 0 10px" }}>Across your tracked queries, {triggered} of {total} show a Google AI Overview and you're cited in {cited}.</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}><Chip color="#9B7AE6">Cited in {cited} of {total}</Chip><Chip color={C.muted}>{triggered} of {total} trigger an AI Overview</Chip></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{rows.map((r, i) => {
        const label = r.cited ? "You're cited" : (r.triggers ? "Shows an overview, not cited" : "No AI Overview");
        const col = r.cited ? "#9B7AE6" : C.muted;
        return (<div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: C.dark, padding: "8px 11px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}` }}><span style={{ minWidth: 0 }}>“{r.q}”</span><span style={{ fontSize: 11, fontWeight: 600, color: col, flexShrink: 0 }}>{label}</span></div>);
      })}</div>
    </div>
  </div>);
};

/* Dashboard route — confirm the real path and update here once. */
const DASHBOARD_URL = "/dashboard";

const PromptVisibility = ({ dashHref }) => (
  <div className="reveal" style={{ marginBottom: 20, borderRadius: 12, border: `1px solid ${C.cardBorder}`, background: C.surface }}>
    <div style={{ background: C.card, padding: "12px 16px", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, minWidth: 0 }}>Prompt visibility</span>
      <a href={dashHref || DASHBOARD_URL} title="Open this domain in your dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: C.accent, textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.opacity = "0.7"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M19 9l-5 5-4-4-3 3" /></svg>Dashboard</a>
    </div>
    <div style={{ padding: "8px 16px 16px" }}>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>In your dashboard, add the questions you want AI to find you for, and I check whether ChatGPT, Perplexity, and Google AI mention your brand and cite your page for each one.</div>
    </div>
  </div>
);

const AIReadinessPlaceholder = () => <div style={{ minHeight: "calc(100vh - 180px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
  <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(110,43,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg></div>
  <div style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 8 }}>Your AI readiness report will appear here</div>
  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, textAlign: "center", maxWidth: 340, marginBottom: 24 }}>I'll check how ready your page is for AI search — so you know exactly what to fix to get cited by tools like ChatGPT, Perplexity, and Google AI.</div>
  <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 340 }}>
    {[{ n: "1", t: "Page type", d: "I detect what kind of page this is, since AI weighs signals differently per type" }, { n: "2", t: "AI search signals", d: "I check schema, FAQ, question patterns, dates, author, and extractable passages" }, { n: "3", t: "Trust & authority", d: "I look at citations and brand mentions that build authority" }, { n: "4", t: "Where to get cited", d: "Tips on where to mention this page to earn AI citations" }].map((s, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(110,43,255,0.04)", border: "1px solid rgba(110,43,255,0.08)" }}><div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(155,122,230,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}><span style={{ fontSize: 11, fontWeight: 700, color: "#9B7AE6" }}>{s.n}</span></div><div><div style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>{s.t}</div><div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{s.d}</div></div></div>)}
  </div>
</div>;


const TRUST_PREVIEW = true;

const AIReadinessReport = ({ data }) => {
  const ai = data.aiReadiness || {};
  const aiGood = ai.aiGood || [];
  const aiBad = (ai.aiBad || []).slice();
  const prioOrder = { critical: 0, important: 1, nice: 2 };
  aiBad.sort((a, b) => (prioOrder[a.priority] != null ? prioOrder[a.priority] : 1) - (prioOrder[b.priority] != null ? prioOrder[b.priority] : 1));
  const passed = aiGood.length;
  const total = ai.total || (aiGood.length + aiBad.length);
  const score = typeof ai.score === "number" ? Math.round(ai.score) : 0;
  const t = data.trust || {};

  const trustRows = (t.rows && t.rows.length) ? t.rows : [];
  const extractableBad = aiBad.some(p => p.title === "Extractable passages");
  const showPassages = ai.extractablePassages && ai.extractablePassages.length > 0 && !extractableBad;
  const wwCount = aiGood.length + (showPassages ? 1 : 0);
  const niCount = aiBad.length;
  let _host = ""; try { _host = new URL(data.url).hostname; } catch (e) {}
  const dashHref = DASHBOARD_URL + (_host ? "?domain=" + encodeURIComponent(_host) : "");

  return (<div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 16px" }}>
    <BotNote text="Two things drive AI search: how you're cited right now, and what to add so AI cites you more easily. The report is split that way." />

    <AIReadinessScoreCard url={data.url} score={score} passed={passed} total={total} />

    {TRUST_PREVIEW && <>
      {trustRows.length > 0 && <BotNote text="How AI cites your brand right now, from live data. Full history and tracking are in your dashboard." />}
      {trustRows.length > 0 && <TrustTable rows={trustRows} dashHref={dashHref} />}
      <BotNote text="Prompt visibility shows where AI already mentions and cites you for the questions that matter to your business." />
      <PromptVisibility dashHref={dashHref} />
      <BotNote text="Where to get this page mentioned so AI tools pick it up. This is how the citations and mentions above grow." />
      <div className="reveal" style={{ marginBottom: 20 }}>
        <DistributionTipsBlock tips={(data.distributionTips && data.distributionTips.length) ? data.distributionTips : distributionTipsForPageType(data.pageType || "other")} />
      </div>
      {/* Google AI Overview section removed from instrument 2026-07-08 — _pAio still runs and stores ai_overview_count; results surface in the dashboard AI Readiness section (page citation count + prompt table). */}
      
      
      
    </>}

    <BotNote text={wwCount > 0 ? `On the page, ${wwCount} signal${wwCount !== 1 ? "s" : ""} that help AI cite you are already in place.` : "Let's look at the on-page signals that help AI cite you."} />
    {wwCount > 0 && <div className="reveal" style={{ marginBottom: 12 }}><Fold title="On-page AI signals — Working Well" count={wwCount} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{showPassages && <WorkingItem title="Passages AI is most likely to quote" content={(<><BotNote inline text="AI search tools like ChatGPT and Perplexity tend to pull self-contained passages (roughly 100–180 words) straight into their answers. These are the strongest candidates on your page right now." /><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{ai.extractablePassages.map((p, i) => (<div key={"pq" + i} style={{ padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}`, borderLeft: "3px solid #B89CF0" }}><div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5 }}>{p.text}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{p.words} words</div></div>))}</div></>)} />}{aiGood.map((g, i) => <WorkingItem key={"ag" + i} title={g.title} content={g.content} />)}</div></Fold></div>}

    <BotNote text={niCount > 0 ? `${niCount} on-page signal${niCount !== 1 ? "s" : ""} to add or fix so AI cites you more easily.` : "All on-page AI signals are in place!"} />
    {niCount > 0 && <div className="reveal" style={{ marginBottom: 20 }}><Fold title="On-page AI signals — Needs Improvement" count={niCount} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{aiBad.map((p, i) => <ProblemCard key={"ab" + i} {...p} />)}</div></Fold></div>}

    {aiBad.length > 0 && <>
      <BotNote text="In short — fix these on-page items first, starting with anything marked critical." />
      <div className="reveal" style={{ marginBottom: 8, padding: 20, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Final recommendations</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {aiBad.slice().sort((a, b) => (({ critical: 0, important: 1, nice: 2 }[a.priority]) ?? 1) - (({ critical: 0, important: 1, nice: 2 }[b.priority]) ?? 1)).slice(0, 5).map((item, i) => { const pr = PRIO[item.priority] || PRIO.important; return (<div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ color: pr.color, fontSize: 10, marginTop: 4 }}>●</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}><span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.title}</span><span style={{ fontSize: 9, fontWeight: 600, color: pr.color, background: pr.bg, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>{pr.label}</span></div>
                {item.why && typeof item.why === "string" && <div style={{ fontSize: 11.5, color: C.muted, marginBottom: item.suggestions && item.suggestions[0] ? 6 : 0 }}>{renderBoldText(item.why)}</div>}
                {item.suggestions && item.suggestions.length > 0 && typeof item.suggestions[0] === "string" && <div style={{ padding: "8px 10px", borderRadius: 6, background: C.bg }}><div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Start with:</div><div style={{ fontSize: 12, fontWeight: 500, color: C.dark, padding: "2px 0" }}>{item.suggestions[0]}</div></div>}
              </div>
            </div>
          </div>); })}
          <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Re-check after changes</div><div style={{ fontSize: 11.5, color: C.muted }}>Publish your fixes, then run AI Readiness again to see on-page signals improve right away. Citations and mentions take a week or two — track those in your dashboard.</div></div></div></div>
        </div>
      </div>
    </>}
  </div>);
};

window.AIReadinessTool = AIReadinessTool;
})();
