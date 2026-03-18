const { useState, useRef, useEffect, useCallback } = React;
console.log("[IvaBot] seo-tools.js v73 loaded");

const C = {
  bg: "#FBF5FF", surface: "#ffffff", accent: "#6E2BFF", accentLight: "#f3f0fd",
  dark: "#151415", muted: "#928E95", border: "rgba(21,20,21,0.08)",
  borderMid: "rgba(21,20,21,0.12)", green: "#22C55E", red: "#EF4444",
  card: "#F0EAFF", cardBorder: "rgba(110,43,255,0.08)", numBg: "#6E2BFF",
  hoverBorder: "rgba(110,43,255,0.2)", hoverShadow: "0 0 0 1px rgba(110,43,255,0.2), 0 8px 32px rgba(110,43,255,0.1)",
};
const STRIPE = { mini: "https://buy.stripe.com/test_mini", starter: "https://buy.stripe.com/test_starter", medium: "https://buy.stripe.com/test_medium", large: "https://buy.stripe.com/test_large" };

/* ═══ PRIMITIVES ═══ */
const ScoreRing = ({ score, size = 92 }) => { const r = (size - 10) / 2, circ = 2 * Math.PI * r, off = circ - (score / 100) * circ, co = score >= 80 ? "#9B7AE6" : score >= 50 ? "#D4A0E8" : "#E2D4F5", lb = score >= 80 ? "Strong" : score >= 50 ? "Moderate" : "Weak"; return (<div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}><svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(21,20,21,0.05)" strokeWidth="6" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={co} strokeWidth="6" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)" }} /></svg><div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 22, fontWeight: 700, color: C.dark }}>{score}</span><span style={{ fontSize: 9, fontWeight: 700, color: "#9B7AE6", marginTop: 1 }}>{lb}</span></div></div>); };
const Tip = ({ text, children }) => {
  const [s, setS] = useState(false);
  const [style, setStyle] = useState({});
  const ref = useRef(null);
  const show = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const above = rect.top > 200;
      const alignRight = rect.left > window.innerWidth - 280;
      setStyle({
        position: "fixed",
        top: above ? "auto" : rect.bottom + 8,
        bottom: above ? (window.innerHeight - rect.top + 8) : "auto",
        left: alignRight ? Math.max(8, rect.right - 260) : Math.max(8, rect.left),
      });
    }
    setS(true);
  };
  return (<span ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }} onMouseEnter={show} onMouseLeave={() => setS(false)}>{children}{s && <span style={{ ...style, background: C.surface, color: C.dark, padding: "10px 14px", borderRadius: 10, fontSize: 11, lineHeight: 1.5, width: 260, maxWidth: "85vw", zIndex: 9999, fontWeight: 400, boxShadow: "0 4px 24px rgba(0,0,0,0.14)", border: `1px solid ${C.border}`, pointerEvents: "none", whiteSpace: "normal", wordBreak: "break-word", textAlign: "left" }}>{text}</span>}</span>);
};
const QM = ({ text }) => (<Tip text={text}><span style={{ width: 16, height: 16, borderRadius: "50%", border: `1px solid ${C.borderMid}`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.muted, cursor: "help", marginLeft: 4, flexShrink: 0, verticalAlign: "top", position: "relative", top: -1 }}>?</span></Tip>);
const CopyBtn = ({ text }) => { const [c, setC] = useState(false); return (<button onClick={() => { navigator.clipboard?.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }} style={{ fontSize: 10, fontWeight: 600, color: c ? "#9B7AE6" : C.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "2px 6px" }}>{c ? "Copied!" : "Copy"}</button>); };

/* Hover card wrapper */
const HoverCard = ({ children, style = {} }) => (<div style={{ borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, transition: "box-shadow 0.3s, border-color 0.3s", cursor: "default", ...style }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.hoverBorder; e.currentTarget.style.boxShadow = C.hoverShadow; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}>{children}</div>);

const Fold = ({ title, children, open: d = false, borderColor, headerBg, titleColor, count }) => {
  const [o, setO] = useState(d);
  return (<div style={{ borderRadius: 12, border: `1px solid ${borderColor || C.border}`, overflow: "hidden", background: C.surface }}>
    <button onClick={() => setO(!o)} style={{ width: "100%", padding: "14px 16px", background: headerBg || "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14, fontWeight: 700, color: titleColor || C.dark }}>{title}</span>{count != null && <span style={{ fontSize: 11, fontWeight: 600, color: titleColor ? "rgba(255,255,255,0.7)" : C.muted, background: titleColor ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)", padding: "2px 8px", borderRadius: 10 }}>{count}</span>}</div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={titleColor || C.muted} strokeWidth="2" strokeLinecap="round" style={{ transform: o ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s ease", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
    </button>
    <div style={{ display: "grid", gridTemplateRows: o ? "1fr" : "0fr", opacity: o ? 1 : 0, transition: "grid-template-rows 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease" }}>
      <div style={{ overflow: "hidden" }}>
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${borderColor || C.border}` }}>{children}</div>
      </div>
    </div>
  </div>);
};

const WorkingItem = ({ title, content }) => { const [o, setO] = useState(false); return (<div style={{ borderRadius: 10, border: `1px solid ${C.cardBorder}`, overflow: "hidden", background: C.surface }}><button onClick={() => setO(!o)} style={{ width: "100%", padding: "11px 14px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'DM Sans',sans-serif" }}><span style={{ color: "#9B7AE6", flexShrink: 0, fontSize: 13, fontWeight: 600 }}>✓</span><span style={{ fontSize: 13, fontWeight: 600, color: C.dark, flex: 1, textAlign: "left" }}>{title}</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ transform: o ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg></button>{o && <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{content}</div></div>}</div>); };

/* Unified block — Current value. borderColor determines green/red/grey */
const InfoBlock = ({ label, value, borderColor }) => {
  const hColorMap = { H1: { color: "#6E2BFF", bg: "rgba(110,43,255,0.08)" }, H2: { color: "#9B7AE6", bg: "rgba(155,122,230,0.08)" }, H3: { color: "#B89CF0", bg: "rgba(184,156,240,0.12)" } };
  const renderLine = (line, i) => {
    const hMatch = line.match(/^(H[1-3]):\s*(.*)/);
    if (hMatch) {
      const lv = hMatch[1], text = hMatch[2];
      const isBroken = text.includes("⚠");
      const hc = hColorMap[lv] || hColorMap.H2;
      return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: isBroken ? C.accent : C.dark, padding: "2px 0" }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: isBroken ? C.accent : hc.color, background: isBroken ? "rgba(110,43,255,0.08)" : hc.bg, padding: "2px 5px", borderRadius: 3, minWidth: 22, textAlign: "center", flexShrink: 0 }}>{lv}</span>
        <span>{text}</span>
      </div>);
    }
    return <div key={i} style={{ padding: "2px 0" }}>{line}</div>;
  };
  return (<div style={{ padding: "10px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${borderColor || C.border}` }}><div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 3 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 500, color: C.dark, lineHeight: 1.5 }}>{typeof value === "string" ? value.split("\n").map(renderLine) : value}</div></div>);
};
/* Unified explanation — sireneviy bg, used for both "why good" and "why bad" */
const ExplainBlock = ({ label, text }) => (<div style={{ padding: "10px 14px", borderRadius: 8, background: C.card, border: `1px solid ${C.cardBorder}` }}><div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 2 }}>{label || "Details"}</div><div style={{ fontSize: 12, color: C.dark, lineHeight: 1.5 }}>{text}</div></div>);
/* Stat card — white bg, colored border */
const StatCard = ({ number, label, desc, borderColor }) => (<div style={{ padding: 14, borderRadius: 10, background: C.surface, border: `1px solid ${borderColor || C.border}`, flex: 1 }}><div style={{ fontSize: typeof number === "string" && number.length > 5 ? 16 : 24, fontWeight: 700, color: C.dark, marginBottom: 2 }}>{number}</div><div style={{ fontSize: 11, fontWeight: 600, color: C.dark, marginBottom: 4 }}>{label}</div><div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{desc}</div></div>);
/* Social — white bg, normal text */
const SOCIAL_URLS = { Facebook: "https://facebook.com", Instagram: "https://instagram.com", LinkedIn: "https://linkedin.com", "X (Twitter)": "https://x.com", YouTube: "https://youtube.com", TikTok: "https://tiktok.com", Pinterest: "https://pinterest.com", Threads: "https://threads.net" };
const SocialBadge = ({ name, url }) => (<a href={url || SOCIAL_URLS[name] || "#"} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, textDecoration: "none", display: "inline-block", transition: "border-color 0.2s, box-shadow 0.2s", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.borderColor = C.hoverBorder; e.currentTarget.style.boxShadow = C.hoverShadow; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}><span style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>{name}</span></a>);
const NumBadge = ({ n }) => { const colors = ["#9B7AE6", "#B89CF0", "#D4A0E8"]; const c = colors[(n - 1) % colors.length]; return (<span style={{ width: 22, height: 22, borderRadius: "50%", background: `${c}18`, color: c, fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>); };

/* Problem Card — purple accent border, bot explains inside */
const ProblemCard = ({ title, why, currentLabel, current, suggestions, sugLabel, showCopy = true, links, serpSnippet }) => { const [o, setO] = useState(false); return (<div style={{ borderRadius: 12, border: "1px solid rgba(110,43,255,0.25)", overflow: "hidden", background: C.surface }}><button onClick={() => setO(!o)} style={{ width: "100%", padding: "13px 16px", background: C.surface, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "'DM Sans',sans-serif" }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, flexShrink: 0 }} /><span style={{ fontSize: 13, fontWeight: 600, color: C.dark, flex: 1, textAlign: "left" }}>{title}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{ transform: o ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg></button>{o && (<div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
  {serpSnippet && <SerpSnippet url={serpSnippet.url} title={serpSnippet.title} desc={serpSnippet.desc} hideDesc={serpSnippet.hideDesc} />}
  {current && <InfoBlock label={currentLabel || "Current"} value={current} borderColor="rgba(110,43,255,0.15)" />}
  {why && <BotNote inline text={why} />}
  {suggestions?.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 6 }}>{sugLabel || "Suggested"}</div><div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{suggestions.map((s, i) => showCopy ? (<HoverCard key={i} style={{ padding: "9px 12px" }}><span style={{ fontSize: 12.5, color: C.dark, fontWeight: 500, display: "block", marginBottom: 4 }}>{s}</span><CopyBtn text={s} /></HoverCard>) : (<div key={i} style={{ padding: "9px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, fontSize: 12.5, color: C.dark, fontWeight: 500 }}>{s}</div>))}</div></div>}
  {links?.length > 0 && <div><div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Learn more</div>{links.map((l, i) => (<a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: 12, color: C.accent, marginBottom: 4, textDecoration: "none" }}>{l.label} →</a>))}</div>}
</div></div>)}</div>); };

const LBar = ({ step, total, text }) => { const p = ((step + 1) / total) * 100; return (<div style={{ padding: "14px 16px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}` }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>{text}</span><span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{Math.round(p)}%</span></div><div style={{ height: 4, background: "rgba(110,43,255,0.08)", borderRadius: 100, overflow: "hidden" }}><div style={{ height: "100%", background: C.accent, borderRadius: 100, width: `${p}%`, transition: "width 0.5s ease" }} /></div></div>); };

/* ═══ CHAT BUBBLES (Builder style) ═══ */
const BL = ({s=16}) => (<svg width={s} height={Math.round(s*0.81)} viewBox="0 0 66 58" fill="none" style={{flexShrink:0,opacity:0.35}}><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill="#6E2BFF"/><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill="#6E2BFF"/></svg>);
const UA = ({n}) => <div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{(n||"U")[0].toUpperCase()}</span></div>;
const BB = ({children}) => <div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"90%",alignSelf:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`,fontSize:13,color:C.dark,lineHeight:1.5}}>{children}</div></div>;
const UB = ({children,n}) => <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",maxWidth:"80%",alignSelf:"flex-end"}}><div style={{marginBottom:3,marginRight:2}}><UA n={n}/></div><div style={{padding:"8px 14px",borderRadius:"12px 4px 12px 12px",background:C.accent,fontSize:13,color:"#fff"}}>{children}</div></div>;

/* ═══ Responsive hook ═══ */
const useIsMobile = () => { const [m,sm] = useState(window.innerWidth < 768); useEffect(() => { const h = () => sm(window.innerWidth < 768); window.addEventListener("resize",h); return () => window.removeEventListener("resize",h); },[]); return m; };

/* ═══ Reveal on scroll ═══ */
const RevealBlock = ({children, delay=0}) => { const ref = useRef(null); const [vis, setVis] = useState(false); useEffect(() => { const el = ref.current; if(!el) return; const obs = new IntersectionObserver(([e]) => { if(e.isIntersecting){ setVis(true); obs.unobserve(el); } }, {threshold:0.08}); obs.observe(el); return () => obs.disconnect(); },[]); return <div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(28px)",transition:`opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`}}>{children}</div>; };

/* ═══ Loading & Placeholder panels ═══ */
const LoadingPanel = ({text}) => <div style={{minHeight:"calc(100vh - 130px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:40,height:40,borderRadius:"50%",border:"3px solid rgba(110,43,255,0.1)",borderTopColor:C.accent,animation:"spin 0.8s linear infinite",marginBottom:16}}/><div style={{fontSize:13,fontWeight:500,color:C.dark,marginBottom:4}}>{text||"Analyzing..."}</div><div style={{fontSize:12,color:C.muted}}>This usually takes a few seconds</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
const AuditPlaceholder = () => <div style={{minHeight:"calc(100vh - 180px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:64,height:64,borderRadius:16,background:"rgba(110,43,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div style={{fontSize:18,fontWeight:700,color:C.dark,marginBottom:8}}>Your report will appear here</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6,textAlign:"center",maxWidth:320,marginBottom:24}}>Paste your URL in the chat, and I'll analyze your page for SEO issues and opportunities.</div><div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:300}}>{[{n:"1",t:"Paste your URL",d:"Any page you want to audit"},{n:"2",t:"SERP & SEO analysis",d:"Google rankings, meta tags, content, links, speed"},{n:"3",t:"Full report + AI chat",d:"Detailed fixes with AI assistant"}].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"rgba(110,43,255,0.04)",border:"1px solid rgba(110,43,255,0.08)"}}><div style={{width:24,height:24,borderRadius:"50%",background:"rgba(155,122,230,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:"#9B7AE6"}}>{s.n}</span></div><div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>{s.t}</div><div style={{fontSize:11,color:C.muted}}>{s.d}</div></div></div>)}</div></div>;

/* ═══ Mobile Tab Switcher ═══ */
const MobileTab = ({active, onSwitch, hasReport}) => {
  if(!hasReport) return null;
  return <div style={{display:"flex",gap:0,background:"rgba(21,20,21,0.04)",borderRadius:10,padding:3,margin:"0 16px 8px"}}>
    <button onClick={()=>onSwitch("chat")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="chat"?C.surface:"transparent",color:active==="chat"?C.dark:C.muted,boxShadow:active==="chat"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Chat</button>
    <button onClick={()=>onSwitch("report")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="report"?C.surface:"transparent",color:active==="report"?C.dark:C.muted,boxShadow:active==="report"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Report</button>
  </div>;
};

function valUrl(raw) { let s = raw.trim(); if (!s) return { ok: false, e: "Paste a URL to start." }; const m = s.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i); if (m) s = m[0]; else { const d = s.match(/[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*/); if (d) s = "https://" + d[0]; else return { ok: false, e: "Need a URL like https://example.com" }; } s = s.replace(/\s+/g, ""); if (!s.startsWith("http")) s = "https://" + s; try { const u = new URL(s); if (!u.hostname.includes(".")) return { ok: false, e: "Not valid." }; return { ok: true, url: u.href }; } catch { return { ok: false, e: "Not valid." }; } }
const CompBadge = ({ level }) => { const map = { Low: { color: "#9B7AE6", bg: "rgba(155,122,230,0.08)" }, Medium: { color: "#D4A0E8", bg: "rgba(212,160,232,0.08)" }, High: { color: C.accent, bg: "rgba(110,43,255,0.08)" } }; const s = map[level] || map.Medium; return <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 20 }}>{level}</span>; };

/* ═══ CONFIG ═══ */
const USE_MOCK = false;
const WEBHOOK_URL = "https://hook.eu2.make.com/la0f5jggl23gkearytvw7xjhagwd3ibc";
const CHAT_WEBHOOK_URL = "https://hook.eu2.make.com/it65d8rtzws93lsnl1jncrcmcwx14xyj";
const CORS_PROXY = "https://empuzslozakbicmenxfo.supabase.co/functions/v1/fetch-page";
const SUPABASE_URL = "https://empuzslozakbicmenxfo.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";

/* Get Memberstack member — waits for Memberstack to load */
function getMemberInfo() {
  return new Promise((resolve) => {
    let attempts = 0;
    function check() {
      attempts++;
      if (window.$memberstackDom) {
        window.$memberstackDom.getCurrentMember().then(({ data }) => {
          resolve({ id: data?.id || null, name: data?.customFields?.["first-name"] || data?.customFields?.name || null });
        }).catch(() => resolve({ id: null, name: null }));
      } else if (attempts < 30) {
        setTimeout(check, 200);
      } else {
        resolve({ id: null, name: null });
      }
    }
    check();
  });
}

/* Fetch credits from Supabase */
async function fetchCredits(memberId) {
  if (!memberId) return { core: 0, builder: 0, coverage: 0 };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usage?member_id=eq.${memberId}&select=*`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        const u = rows[0];
        return {
          core: Math.max(0, (u.core_limit || 0) - (u.core_used || 0)),
          builder: Math.max(0, (u.builder_limit || 0) - (u.builder_used || 0)),
          coverage: Math.max(0, (u.coverage_limit || 0) - (u.coverage_used || 0))
        };
      }
    }
  } catch(e) { console.log("Credits fetch error:", e); }
  return { core: 0, builder: 0, coverage: 0 };
}

/* ═══ SEO PARSER ═══ */
function parseSEO(rawHtml, pageUrl) {
  const r = {};
  let normalized = pageUrl.trim().replace(/\s+/g, "");
  if (!normalized.startsWith("http")) normalized = "https://" + normalized;
  r.url = normalized.replace(/\?.*$/, "");
  let hostname = ""; try { hostname = new URL(normalized).hostname.replace(/^www\./, ""); } catch(e){}
  r.hostname = hostname;

  let html = rawHtml.replace(/\\"/g,'"').replace(/\\</g,'<').replace(/\\>/g,'>').replace(/\\[nrt]/g,' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi,'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');

  const mt = html.match(/<title[^>]*>(.*?)<\/title>/i);
  r.title = mt ? mt[1].trim() : "";
  r.title_missing = !r.title;
  r.title_length = r.title.length;
  r.title_too_short = r.title.length > 0 && r.title.length < 30;
  r.title_slightly_long = r.title.length >= 66 && r.title.length <= 90;
  r.title_too_long = r.title.length > 90;
  const tw = r.title.toLowerCase().match(/\b[\w''-]+\b/g) || [];
  r.title_has_duplicates = [...new Set(tw.filter((w,i,a) => a.indexOf(w)!==i && w.length>2))].length > 0;
  const titleParts = r.title.split(/\s*[|–—-]\s*/).map(p => p.trim().toLowerCase()).filter(Boolean);
  r.title_has_repeated_brand = titleParts.length >= 2 && new Set(titleParts).size < titleParts.length;

  const md = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  r.desc = md ? md[1].trim() : "";
  r.desc_missing = !r.desc;
  r.desc_too_short = r.desc.length > 0 && r.desc.length < 50;
  r.desc_too_long = r.desc.length > 200;

  const isTemplate = (t) => /^\{.*\}$/.test(t) || /^\{\{.*\}\}$/.test(t) || /^\[.*\]$/.test(t);
  const exH = (h, lv) => [...h.matchAll(new RegExp(`<h${lv}[^>]*>([\\s\\S]*?)<\\/h${lv}>`, 'gi'))].map(m => m[1].replace(/<[^>]+>/g,'').trim()).filter(t => t && t.length > 1);
  r.h1_raw = exH(html,1); r.h2 = exH(html,2); r.h3 = exH(html,3);
  r.h1 = r.h1_raw.filter(t => !isTemplate(t));
  r.h1_broken = r.h1_raw.filter(t => isTemplate(t));
  r.h1_missing = r.h1.length === 0;
  r.h1_has_broken_template = r.h1_broken.length > 0;
  r.h2_missing = r.h2.length===0; r.h3_missing = r.h3.length===0;
  const findDups = arr => { const m = new Map(); arr.forEach(t => { const k = t.trim().toLowerCase(); if(k) m.set(k,(m.get(k)||0)+1); }); return [...m.entries()].filter(([,c])=>c>1).length>0; };
  r.h1_has_dups = findDups(r.h1); r.h2_has_dups = findDups(r.h2); r.h3_has_dups = findDups(r.h3);

  const vis = html.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  r.char_count = vis.length;

  r.has_mobile = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html) && /width\s*=\s*device-width/i.test(html);

  const socials = [["Facebook",/facebook\.com/i],["Instagram",/instagram\.com/i],["LinkedIn",/linkedin\.com/i],["X (Twitter)",/(?:twitter\.com|x\.com)/i],["YouTube",/youtube\.com|youtu\.be/i],["TikTok",/tiktok\.com/i],["Pinterest",/pinterest\.com/i]];
  r.social = [];
  const allHrefs = [...rawHtml.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  socials.forEach(([name, pat]) => {
    const found = allHrefs.find(h => pat.test(h) && !/share|sharer|intent|dialog/i.test(h));
    if (found) r.social.push({ name, url: found.startsWith("http") ? found : "https://" + found });
  });

  let int=0, ext=0;
  [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].forEach(m => {
    const h = m[1]; try {
      if(/^https?:\/\//.test(h)) { new URL(h).hostname.replace(/^www\./,"")===hostname ? int++ : ext++; }
      else if(/^\/|^#/.test(h)) int++; else ext++;
    } catch(e){ ext++; }
  });
  r.int_links = int; r.ext_links = ext;

  const imgs = [...html.matchAll(/<img\s[^>]*>/gi)].filter(m => !/(logo|icon|sprite|favicon|badge|social|nav|menu)/i.test(m[0]));
  r.img_count = imgs.length;
  r.all_alt = imgs.length===0 || imgs.every(m => /alt=["'][^"']+["']/i.test(m[0]));
  r.alt_missing = imgs.length>0 && !r.all_alt;
  r.vid_count = (html.match(/<video[^>]*>/gi)||[]).length + (html.match(/<iframe[^>]+(youtube|vimeo|wistia|loom|dailymotion)[^>]*>/gi)||[]).length;

  const CTA = ["buy","add to cart","checkout","contact","sign up","get started","book","subscribe","download","learn more","shop now","order now","request","pricing","try","start","browse","explore","view"];
  r.has_cta = false; r.cta_text = "";
  for (const m of html.matchAll(/<(a|button)([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    let v = (m[3]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    v = v.replace(/["'][^"']*["']\s*[^>]*>/g, "").replace(/data-[a-z0-9-]+(?:="[^"]*")?/gi, "").replace(/[a-z-]+#[a-z0-9-]*/gi, "").replace(/class="[^"]*"/gi, "").replace(/style="[^"]*"/gi, "").replace(/[{}[\]<>]/g, "").replace(/\s+/g," ").trim();
    if(!v || v.length > 60 || v.length < 2 || /[{}<>\[\]="]/i.test(v) || /\b(logo|brand|navbar|cid)\b/i.test(v)) continue;
    if(CTA.some(k=>v.toLowerCase().includes(k)) || /\b(btn|button|cta)\b/i.test(m[2]||"")) { r.has_cta=true; r.cta_text=v; break; }
  }

  let base = ""; try { base = new URL(normalized).origin; } catch(e){}
  r.robots_url = base+"/robots.txt"; r.sitemap_url = base+"/sitemap.xml";

  let sc = 0;
  const ts = r.title_missing ? "missing" : r.title_too_short ? "too_short" : r.title_too_long ? "too_long" : r.title_has_repeated_brand ? "duplicate" : "good";
  const ds = r.desc_missing ? "missing" : r.desc_too_short ? "too_short" : r.desc_too_long ? "too_long" : "good";
  if(ts==="good") sc+=15; else if(!r.title_missing) sc+=5;
  if(ds==="good") sc+=10; else if(!r.desc_missing) sc+=3;
  if(r.h1.length>0 && !r.h1_has_dups) sc+=10; else if(r.h1.length>0) sc+=6;
  if(r.h2.length>0 && r.h3.length>0) sc+=8; else if(r.h2.length>0) sc+=5; else sc+=2;
  if(int>3 && ext>0 && r.social.length>0) sc+=10; else if(int>0||ext>0) sc+=5;
  if(r.has_cta) sc+=7;
  if(r.has_mobile) sc+=10;
  if(r.img_count>0 && r.all_alt) sc+=8; else if(r.img_count>0) sc+=4; else sc+=2;
  if(r.vid_count>0) sc+=5; else sc+=1;
  if(r.char_count>3000) sc+=7; else if(r.char_count>1000) sc+=4; else sc+=1;
  r.score = Math.min(sc,100);
  r.title_status = ts; r.desc_status = ds;

  r.summary = `URL: ${r.url}\nTitle: ${r.title}\nDescription: ${r.desc}\nH1: ${r.h1.join(", ")||"missing"}\nH2 count: ${r.h2.length}\nH3 count: ${r.h3.length}\nInternal links: ${int}\nExternal links: ${ext}\nImages: ${r.img_count}\nVideos: ${r.vid_count}\nHas CTA: ${r.has_cta}\nMobile: ${r.has_mobile}\nSocial: ${r.social.map(s=>s.name).join(", ")||"none"}\nScore: ${r.score}/100`;
  return r;
}

/* Transform parsed + GPT + DataForSEO data into report format */
function buildReportData(parsed, gpt, dfs) {
  const rankedKeywords = dfs?.ranked_keywords || [];
  const serpCompetitors = dfs?.serp_competitors || [];
  const totalRanked = dfs?.total_ranked || 0;

  const gptKeywords = gpt?.keywords || [];
  const keywordMetrics = gptKeywords.map(k => {
    const match = rankedKeywords.find(rk => rk.keyword?.toLowerCase() === k.toLowerCase());
    return { keyword: k, position: match?.position || null, volume: match?.volume || null, difficulty: match?.difficulty || null };
  });

  const backlinksCount = dfs?.backlinksCount || null;
  const referringDomains = dfs?.referringDomains || null;

  return {
    score: parsed.score, url: parsed.url, title: parsed.title, desc: parsed.desc,
    ctx: { url: parsed.url, title: parsed.title, topic: gpt?.page_context?.topic || "Unknown", owner: gpt?.page_context?.owner || parsed.hostname, goal: gpt?.page_context?.goal || "Inform", industry: gpt?.page_context?.industry || "General", region: gpt?.page_context?.region || "Global", competition: "Medium", message: gpt?.page_context?.core_message || "" },
    keywords: gptKeywords,
    titleStatus: parsed.title_status === "good" ? "good" : "bad",
    titleEval: parsed.title_status !== "good" ? { why: parsed.title_missing ? "No meta title found — Google can't generate a proper search snippet." : parsed.title_has_repeated_brand ? `Your title repeats the brand name ("${parsed.title}"). This wastes valuable characters and looks unprofessional in search results. Use the space to describe what the page offers.` : parsed.title_too_short ? "Too short — users and Google need more context to understand what this page offers." : "Title is too long — Google will truncate it in search results.", sugLabel: "Suggested Titles", suggestions: (Array.isArray(gpt?.suggested_titles) && gpt.suggested_titles.length > 0) ? gpt.suggested_titles : (gpt?.suggested_title ? (Array.isArray(gpt.suggested_title) ? gpt.suggested_title : [gpt.suggested_title]) : (gpt?.keywords?.length > 0 ? gpt.keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1) + " — " + (gpt?.page_context?.owner || parsed.hostname)) : ["Add a descriptive title with your primary keyword"])), showCopy: true, links: [{ label: "Google Search Console", url: "https://search.google.com/search-console" }] } : null,
    descStatus: parsed.desc_status === "good" ? "good" : "bad",
    descEval: parsed.desc_status !== "good" ? { why: parsed.desc_missing ? "No meta description found — search engines can't generate a proper snippet." : parsed.desc_too_short ? "Description is too short — aim for 120-160 characters." : "Description is too long — Google may truncate it.", sugLabel: "Suggested Descriptions", suggestions: (Array.isArray(gpt?.suggested_descriptions) && gpt.suggested_descriptions.length > 0) ? gpt.suggested_descriptions : (gpt?.suggested_description ? (Array.isArray(gpt.suggested_description) ? gpt.suggested_description : [gpt.suggested_description]) : ["Write a 120-160 character description including your primary keyword"]), showCopy: true } : null,
    headings: [...parsed.h1.map(t=>({level:"H1",text:t})), ...parsed.h1_broken.map(t=>({level:"H1",text:t,broken:true})), ...parsed.h2.map(t=>({level:"H2",text:t})), ...parsed.h3.map(t=>({level:"H3",text:t}))],
    h1HasBrokenTemplate: parsed.h1_has_broken_template,
    headingsStatus: (parsed.h1.length>0 && !parsed.h1_has_dups && !parsed.h1_has_broken_template && parsed.h2.length>0) ? "good" : "bad",
    headingsEval: { title: "Heading Structure Needs Work", currentLabel: "Current Headings", current: [parsed.h1_has_broken_template ? `H1: ${parsed.h1_broken[0]} ⚠ unrendered template` : null, ...parsed.h1.map(t => `H1: ${t}`), ...parsed.h2.map(t => `H2: ${t}`), ...parsed.h3.map(t => `H3: ${t}`)].filter(Boolean).join("\n") || "No headings found", why: parsed.h1_has_broken_template ? `Your H1 contains an unrendered template variable (${parsed.h1_broken[0]}). Search engines see code instead of your heading — this is a critical rendering issue. Check your CMS or framework.` : parsed.h1_missing ? "H1 is your page's main heading — Google uses it to understand what the page is about. Without it, search engines have to guess your topic, which hurts rankings." : parsed.h1_has_dups ? "Duplicate H1 headings confuse Google about which is the main topic. Keep exactly one H1 per page." : "H2 subheadings break content into sections. Without them, Google sees your page as one big block of text, making it harder to rank for specific topics.", suggestions: (gpt?.suggested_h1?.length > 0 ? gpt.suggested_h1 : gpt?.suggested_h2?.length > 0 ? gpt.suggested_h2 : ["Add clear H1 with primary keyword", "Use H2 for main sections"]), showCopy: !!(gpt?.suggested_h1?.length > 0 || gpt?.suggested_h2?.length > 0) },
    links: { internal: parsed.int_links, external: parsed.ext_links, social: parsed.social },
    linksStatus: (parsed.int_links > 0 || parsed.ext_links > 0) ? "good" : "bad",
    linksEval: { title: "Links Need Attention", why: parsed.int_links === 0 && parsed.ext_links === 0 ? "Your page has no links at all. Internal links help Google discover your other pages, and external links to trusted sources build credibility and trust." : parsed.int_links === 0 ? "No internal links found. Internal links connect your pages and help Google crawl your site. Consider adding links to related content on your site." : "No external links found. Linking to authoritative sources shows Google your content is well-researched and trustworthy.", suggestions: [...(gpt?.internal_link_suggestions?.map(l => l.text + " — " + l.why) || []), ...(gpt?.external_link_suggestions?.map(l => l.text + " — " + l.why) || [])].slice(0, 4) || ["Add internal links to key pages", "Link to trusted external sources"], showCopy: false },
    ux: { cta: { found: parsed.has_cta, text: parsed.cta_text }, mobile: parsed.has_mobile, altMissing: parsed.alt_missing, noVideo: parsed.vid_count === 0 },
    speedStatus: "bad", speedEval: { title: "Page Speed Check", why: "Speed is a Core Web Vital — slow pages lose visitors and rank lower.", suggestions: ["Compress images to WebP", "Remove unused JS/CSS", "Enable lazy loading"], showCopy: false, links: [{ label: "Google PageSpeed Insights", url: "https://pagespeed.web.dev/" }] },
    imagesEval: { title: "Some Images Missing Alt Text", why: "Alt text helps search engines understand images and improves accessibility.", suggestions: ["Add descriptive alt to every image"], showCopy: false },
    videoEval: { title: "No Video Content Detected", why: "Pages with video tend to rank higher and keep visitors engaged longer.", suggestions: ["Add a product video or brand intro"], showCopy: false },
    robotsStatus: "good", sitemapStatus: "good",
    competitors: (() => {
      const gptComps = gpt?.competitors || [];
      if (serpCompetitors.length > 0) {
        return serpCompetitors.map((sc, i) => {
          const gptMatch = gptComps.find(gc => sc.name.includes(gc.name) || gc.name.includes(sc.name.replace(/^www\./, "")));
          return { ...sc, tactics: gptMatch?.tactics || gptComps[i]?.tactics || "" };
        });
      }
      return gptComps.length > 0 ? gptComps : [{ name: "competitor1.com", tactics: "Strong content strategy" }, { name: "competitor2.com", tactics: "Good backlink profile" }, { name: "competitor3.com", tactics: "Fast page speed" }];
    })(),
    backlinks: gpt?.backlinks || [{ name: "Industry Blog", desc: "Guest posts and mentions" }, { name: "Directory", desc: "Business listing" }, { name: "Social Platform", desc: "Brand presence" }],
    rankedKeywords,
    keywordMetrics,
    backlinksCount,
    referringDomains,
    totalRanked,
  };
}

/* ═══ DATA (mock fallback) ═══ */
const A = { score: 85, url: "https://www.apple.com/", title: "Apple", desc: "Discover the innovative world of Apple and shop everything iPhone, iPad, Apple Watch, Mac, and Apple TV, plus explore accessories, entertainment, and expert device support.", ctx: { url: "https://www.apple.com/", title: "Apple", topic: "Official Apple product and service page", owner: "Apple Inc.", goal: "Sell", industry: "Technology", region: "Global", competition: "High", message: "Discover the innovative world of Apple and shop everything iPhone, iPad, Apple Watch, Mac, and Apple TV." }, keywords: ["iPhone trade-in deals", "MacBook Pro features", "Apple Card benefits"], titleStatus: "bad", titleEval: { currentLabel: "Current Title", current: "Apple", why: "Too short — users and Google need more context to understand what this page offers.", sugLabel: "Suggested Titles", suggestions: ["Apple Products and Innovations", "Apple Technology and Features", "Apple: Leading the Way in Tech"], showCopy: true, links: [{ label: "Google Search Console", url: "https://search.google.com/search-console" }] }, descStatus: "bad", descEval: { currentLabel: "Current Description", current: "Discover the innovative world of Apple and shop everything iPhone, iPad, Apple Watch, Mac, and Apple TV, plus explore accessories, entertainment, and expert device support.", why: "Google may truncate descriptions longer than 160 characters in search results, reducing click-through rate.", sugLabel: "Suggested Descriptions", suggestions: ["Shop the latest iPhone, iPad, Apple Watch, Mac and Apple TV, plus accessories and expert support.", "Find everything Apple — iPhones to Macs, accessories, entertainment, backed by expert support."], showCopy: true }, headings: [{ level: "H1", text: "Apple" }, { level: "H2", text: "MacBook Neo" }, { level: "H2", text: "iPhone 17e" }, { level: "H3", text: "MacBook Air" }, { level: "H3", text: "iPad Air" }, { level: "H2", text: "Endless entertainment." }, { level: "H3", text: "Apple Trade In" }, { level: "H3", text: "Apple Card" }], headingsStatus: "good", links: { internal: 47, external: 12, social: ["Facebook", "LinkedIn", "X (Twitter)", "YouTube"] }, linksStatus: "good", ux: { cta: { found: true, text: "Learn more" }, mobile: true, altMissing: true, noVideo: true }, speedStatus: "bad", speedEval: { title: "Page Speed Is Moderate", why: "Slow pages lose visitors — even a 1-second delay can reduce conversions by 7%.", suggestions: ["Compress images to WebP", "Remove unused JS/CSS", "Enable lazy loading"], showCopy: false, links: [{ label: "Google PageSpeed Insights", url: "https://pagespeed.web.dev/" }] }, imagesEval: { title: "Some Images Missing Alt Text", why: "Alt text helps search engines understand images and improves accessibility for screen readers.", suggestions: ["Add descriptive alt to every image", "Include keywords naturally in alt descriptions"], showCopy: false }, videoEval: { title: "No Video Content Detected", why: "Pages with video tend to rank higher and keep visitors engaged longer.", suggestions: ["Add a product video or brand intro", "Use schema markup for video", "Embed from YouTube for SEO benefit"], showCopy: false }, robotsStatus: "good", sitemapStatus: "good", competitors: [{ name: "samsung.com", tactics: "Strong mobile UX, frequent product launches" }, { name: "microsoft.com", tactics: "Clear pricing, enterprise focus" }, { name: "google.com", tactics: "Clean design, prominent search features" }], backlinks: [{ name: "TechCrunch", desc: "Product reviews and features" }, { name: "CNET", desc: "In-depth reviews and buying guides" }, { name: "The Verge", desc: "Launches and industry news" }, { name: "Product Hunt", desc: "Early adopters and discovery" }, { name: "YouTube Influencers", desc: "Reviews and unboxing" }, { name: "Wired", desc: "Tech journalism and trends" }, { name: "Forbes Tech", desc: "Business tech coverage" }, { name: "Mashable", desc: "Culture and roundups" }, { name: "Ars Technica", desc: "Deep dives and security" }, { name: "TechRadar", desc: "Rankings and testing" }], rankedKeywords: [{ keyword: "buy iphone online", position: 1, volume: 12100, difficulty: 72 }, { keyword: "apple trade in value", position: 1, volume: 8100, difficulty: 38 }, { keyword: "macbook pro price", position: 2, volume: 5400, difficulty: 55 }, { keyword: "apple card benefits", position: 4, volume: 3600, difficulty: 42 }, { keyword: "ipad air review", position: 8, volume: 2900, difficulty: 48 }], keywordMetrics: [{ keyword: "iPhone trade-in deals", position: 3, volume: 6600, difficulty: 45 }, { keyword: "MacBook Pro features", position: null, volume: 4400, difficulty: 52 }, { keyword: "Apple Card benefits", position: 4, volume: 3600, difficulty: 42 }], backlinksCount: 13268, referringDomains: 2675, totalRanked: 18743 };

/* ═══ Build ═══ */
function buildResults(d) {
  const NB = C.cardBorder;
  const g = [], b = [];
  if (d.titleStatus === "good") g.push({ title: "Meta Title", content: (<><SerpSnippet url={d.url} title={d.title} desc={d.desc} hideDesc /><BotNote inline text={`Your title is ${d.title.length} characters — right in the sweet spot (30–60). This is the #1 on-page signal Google uses to understand your content.`} /></>) }); else b.push({ ...d.titleEval, title: d.titleEval?.title || "Meta Title Too Short", serpSnippet: { url: d.url, title: d.title, desc: d.desc, hideDesc: true } });
  if (d.descStatus === "good") g.push({ title: "Meta Description", content: (<><SerpSnippet url={d.url} title={d.title} desc={d.desc} /><BotNote inline text={`Your description is ${d.desc.length} characters — within 120–160, the sweet spot. This is what users see in search results, so a good one means more clicks.`} /></>) }); else b.push({ ...d.descEval, title: d.descEval?.title || "Description Needs Work", serpSnippet: { url: d.url, title: d.title, desc: d.desc } });
  if (d.headingsStatus === "good") { const h1 = d.headings.filter(h => h.level === "H1"), h2 = d.headings.filter(h => h.level === "H2"), h3 = d.headings.filter(h => h.level === "H3");
    const hColors = { H1: { color: "#6E2BFF", bg: "rgba(110,43,255,0.08)" }, H2: { color: "#9B7AE6", bg: "rgba(155,122,230,0.08)" }, H3: { color: "#B89CF0", bg: "rgba(184,156,240,0.12)" } };
    const HL = ({ tags, lv }) => (<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{tags.map((h, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: h.broken ? C.accent : C.dark }}><span style={{ fontSize: 9, fontWeight: 600, color: h.broken ? C.accent : hColors[lv].color, background: h.broken ? "rgba(110,43,255,0.08)" : hColors[lv].bg, padding: "2px 5px", borderRadius: 3, minWidth: 22, textAlign: "center" }}>{lv}</span>{h.text}{h.broken && <span style={{ fontSize: 10, color: C.accent, fontWeight: 600 }}>⚠ unrendered</span>}</div>))}</div>);
    g.push({ title: "Heading Structure", content: (<>
      <InfoBlock label={`H1 — ${h1.length} found`} value={<HL tags={h1} lv="H1" />} borderColor={NB} />
      <InfoBlock label={`H2 — ${h2.length} found`} value={<HL tags={h2} lv="H2" />} borderColor={NB} />
      <InfoBlock label={`H3 — ${h3.length} found`} value={<HL tags={h3} lv="H3" />} borderColor={NB} />
      <BotNote inline text="Think of headings as a table of contents. H1 is your main topic, H2s are chapters, H3s are subsections. Google uses this hierarchy to understand your page. Yours looks clean — no duplicates detected." />
    </>) }); } else b.push(d.headingsEval);
  if (d.linksStatus === "good") g.push({ title: "Links & Social Profiles", content: (<><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><StatCard number={d.links.internal} label="Internal Links" desc="Connect your pages so Google can discover and rank them." borderColor={NB} /><StatCard number={d.links.external} label="External Links" desc={d.links.external === 0 ? "No external links found. Linking to trusted sources builds credibility." : "Linking to trusted sources builds credibility."} borderColor={d.links.external === 0 ? "rgba(110,43,255,0.2)" : NB} /></div>{d.links.social.length > 0 ? (<div><div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 6 }}>Social Profiles</div><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{d.links.social.map((s, i) => <SocialBadge key={i} name={typeof s === "string" ? s : s.name} url={typeof s === "string" ? null : s.url} />)}</div></div>) : (<div style={{ fontSize: 12, color: C.muted, padding: "8px 0" }}>No social profiles linked. Consider adding social links to build brand trust.</div>)}<BotNote inline text="A healthy mix of internal links, external references, and social profiles tells Google your site is well-connected and trustworthy." /></>) }); else b.push(d.linksEval);
  if (d.ux.cta.found) g.push({ title: "Call to Action", content: (<><InfoBlock label="Current CTA" value={`"${d.ux.cta.text}"`} borderColor={NB} /><BotNote inline text="A clear call-to-action guides visitors to the next step — buy, sign up, learn more. Pages with visible CTAs convert better." /></>) }); else b.push({ title: "No CTA Found", why: "A call-to-action (CTA) is a button or link that guides visitors to take action — like 'Buy now', 'Sign up', or 'Contact us'. Without one, visitors may leave without converting.", suggestions: ["Add a prominent CTA above the fold"], showCopy: false });
  if (d.ux.mobile) g.push({ title: "Mobile Optimization", content: (<><InfoBlock label="Status" value="Your page looks great on phones and tablets." borderColor={NB} /><BotNote inline text="Over 60% of searches happen on mobile. Google ranks mobile-friendly pages higher — and yours is ready." /></>) }); else b.push({ title: "Not Mobile-Friendly", why: "Your page doesn't have a viewport meta tag, which means it won't display properly on phones and tablets. Google uses mobile-first indexing, so this directly hurts your rankings.", suggestions: ["Add viewport meta tag to your page head"], showCopy: false });
  if (!d.ux.altMissing) g.push({ title: "Image Alt Text", content: (<><InfoBlock label="Status" value="All images have descriptions." borderColor={NB} /><BotNote inline text="Alt text helps Google understand your images and makes your site accessible to screen readers. Every image should have a description." /></>) }); else b.push(d.imagesEval);
  if (!d.ux.noVideo) g.push({ title: "Video Content", content: (<><InfoBlock label="Status" value="Video detected on your page." borderColor={NB} /><BotNote inline text="Pages with video keep visitors engaged longer. Google notices this — it's a positive ranking signal." /></>) }); else b.push(d.videoEval);
  if (d.speedStatus === "good") g.push({ title: "Page Speed", content: (<><InfoBlock label="Status" value="Your page loads fast." borderColor={NB} /><BotNote inline text="Speed is a Core Web Vital — Google uses it directly for rankings. Fast pages also have lower bounce rates and happier visitors." /></>) }); else b.push(d.speedEval);
  if (d.robotsStatus === "good") g.push({ title: "robots.txt", content: (<><InfoBlock label="Status" value={<>Properly configured. <a href={(()=>{ try { return new URL(d.url).origin+"/robots.txt"; } catch(e) { return "#"; } })()} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none", fontSize: 12 }}>View your robots.txt →</a></>} borderColor={NB} /><BotNote inline text="This file tells search engines which pages to crawl and which to skip. Yours is set up correctly." /></>) }); else b.push({ title: "robots.txt Not Found", why: "robots.txt is a small file at the root of your site that tells search engines which pages to crawl and which to skip. Without it, Google may waste time crawling unnecessary pages or miss important ones. Most website platforms can generate this automatically.", suggestions: ["Create robots.txt at your domain root"], showCopy: false, links: [{ label: "How to create robots.txt", url: "https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt" }] });
  if (d.sitemapStatus === "good") g.push({ title: "Sitemap", content: (<><InfoBlock label="Status" value={<>XML sitemap is accessible. <a href={(()=>{ try { return new URL(d.url).origin+"/sitemap.xml"; } catch(e) { return "#"; } })()} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none", fontSize: 12 }}>View your sitemap →</a></>} borderColor={NB} /><BotNote inline text="A sitemap is like a roadmap for Google — it helps discover and index all your pages faster." /></>) }); else b.push({ title: "Sitemap Not Found", why: "An XML sitemap is a list of all your pages that helps Google discover and index them faster. Without one, new or deep pages may not appear in search results for weeks. Most CMS platforms generate sitemaps automatically — check your settings.", suggestions: ["Generate and submit XML sitemap"], showCopy: false, links: [{ label: "Google Sitemap Guide", url: "https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap" }] });
  return { good: g, bad: b };
}
const STEPS = ["Fetching page data...", "Parsing HTML structure...", "Analyzing meta & headings...", "Checking links & social...", "Speed & technical checks...", "Generating recommendations..."];

const TCard = ({ title, desc, tag, credits, onClick }) => (<button onClick={credits > 0 ? onClick : undefined} style={{ padding: 22, borderRadius: 12, border: `1px solid ${credits > 0 ? C.border : C.borderMid}`, background: C.surface, cursor: credits > 0 ? "pointer" : "default", textAlign: "left", fontFamily: "'DM Sans',sans-serif", transition: "box-shadow 0.3s, border-color 0.3s", flex: 1, minWidth: 0, opacity: 1, overflow: "hidden", position: "relative" }} onMouseEnter={e => { if (credits > 0) { e.currentTarget.style.borderColor = C.hoverBorder; e.currentTarget.style.boxShadow = C.hoverShadow; } }} onMouseLeave={e => { e.currentTarget.style.borderColor = credits > 0 ? C.border : C.borderMid; e.currentTarget.style.boxShadow = "none"; }}><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><span style={{ fontSize: 10, fontWeight: 600, color: C.accent, background: C.accentLight, padding: "4px 10px", borderRadius: 6 }}>{tag}</span></div><div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 6, letterSpacing: "-0.02em" }}>{title}</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>{desc}</div><div style={{ height: 1, background: C.border, marginBottom: 8 }} /><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 500 }}><span style={{ color: C.muted }}>Credits Left</span><span style={{ fontWeight: 700, color: credits > 0 ? C.accent : C.muted }}>{credits}</span></div>{credits <= 0 && <a href="/dashboard#buy-credits" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, padding: "10px 0", borderRadius: 8, border: `1px solid ${C.borderMid}`, background: C.surface, color: C.dark, fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", textDecoration: "none", transition: "all 0.2s", cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.background = C.accentLight; e.currentTarget.style.borderColor = "rgba(110,43,255,0.2)"; e.currentTarget.style.color = C.accent; }} onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.color = C.dark; }}>Buy Credits</a>}</button>);

const PACKS_AUDIT = [
  { n: "Audit Mini", p: "7", desc: "For quick page checks and fast insights.", items: [{ name: "Core Audit", num: 2 }, { name: "Content Coverage Audit", num: 4 }], link: STRIPE.mini },
  { n: "Audit Starter", p: "17", desc: "For small SEO projects and teams.", items: [{ name: "Core Audit", num: 6 }, { name: "Content Coverage Audit", num: 9 }], link: STRIPE.starter },
  { n: "Audit Medium", p: "37", desc: "For regular audit workflow at scale.", items: [{ name: "Core Audit", num: 15 }, { name: "Content Coverage Audit", num: 20 }], link: STRIPE.medium, primary: true },
  { n: "Audit Large", p: "67", desc: "For intensive SEO work and agencies.", items: [{ name: "Core Audit", num: 35 }, { name: "Content Coverage Audit", num: 45 }], link: STRIPE.large },
];
const PACKS_COPY = [
  { n: "Copywriter Mini", p: "7", desc: "Quick top-up for small tasks and testing.", items: [{ name: "Content Builder", num: 5 }, { name: "Content Coverage", num: 2 }], link: STRIPE.mini },
  { n: "Copywriter Starter", p: "15", desc: "For regular content creation.", items: [{ name: "Content Builder", num: 10 }, { name: "Content Coverage", num: 5 }], link: STRIPE.starter },
  { n: "Copywriter Medium", p: "32", desc: "For active content work and scaling.", items: [{ name: "Content Builder", num: 30 }, { name: "Content Coverage", num: 15 }], link: STRIPE.medium, primary: true },
  { n: "Copywriter Large", p: "90", desc: "For intensive use and teams.", items: [{ name: "Content Builder", num: 100 }, { name: "Content Coverage", num: 50 }], link: STRIPE.large },
];
const BuyM = ({ onClose }) => { const [tab, setTab] = useState("audit"); const packs = tab === "audit" ? PACKS_AUDIT : PACKS_COPY; return (<div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }} onClick={onClose}><div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, padding: "28px 24px", maxWidth: 620, width: "95%", boxShadow: "0 24px 48px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>Buy Credits</span><button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18 }}>✕</button></div>
  <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>One-time payments. Credits never expire.</p>
  <div style={{ display: "inline-grid", gridTemplateColumns: "1fr 1fr", position: "relative", border: `1px solid rgba(21,20,21,0.12)`, borderRadius: 10, padding: 4, marginBottom: 16, background: "#fff" }}>
    <div style={{ position: "absolute", top: 4, left: tab === "audit" ? 4 : "calc(50%)", width: "calc(50% - 4px)", height: "calc(100% - 8px)", borderRadius: 7, background: "#151415", transition: "left 0.28s cubic-bezier(0.4,0,0.2,1)", zIndex: 0 }} />
    <button onClick={() => setTab("audit")} style={{ position: "relative", zIndex: 1, padding: "8px 20px", border: "none", background: "transparent", borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: tab === "audit" ? "#fff" : "#928E95", cursor: "pointer", transition: "color 0.25s", whiteSpace: "nowrap", textAlign: "center" }}>Audit Pack</button>
    <button onClick={() => setTab("copy")} style={{ position: "relative", zIndex: 1, padding: "8px 20px", border: "none", background: "transparent", borderRadius: 7, fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 500, color: tab === "copy" ? "#fff" : "#928E95", cursor: "pointer", transition: "color 0.25s", whiteSpace: "nowrap", textAlign: "center" }}>Copywriter Pack</button>
  </div>
  <div className="iva-buy-grid">
    {packs.map((pk, i) => (
      <div key={tab + i} style={{ borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 16px 12px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{pk.n}</div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginBottom: 12 }}>{pk.desc}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>$</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>{pk.p}</span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>one-time</span>
          </div>
          <a href={pk.link} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: "10px 0", borderRadius: 8, background: pk.primary ? C.dark : C.surface, color: pk.primary ? "#fff" : C.dark, border: `1px solid ${pk.primary ? C.dark : C.borderMid}`, fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", fontFamily: "'DM Sans',sans-serif", cursor: "pointer", transition: "background 0.2s" }} onMouseEnter={e => { if (pk.primary) e.currentTarget.style.background = "#333"; else e.currentTarget.style.background = C.accentLight; }} onMouseLeave={e => { e.currentTarget.style.background = pk.primary ? C.dark : C.surface; }}>Buy Credits</a>
        </div>
        <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 8 }}>Included:</div>
          {pk.items.map((item, j) => (
            <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                <span style={{ color: C.dark }}>{item.name}</span>
              </div>
              <span style={{ fontWeight: 700, color: C.dark }}>{item.num}</span>
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
            <span style={{ color: C.dark }}>AI Chat included</span>
          </div>
        </div>
      </div>
    ))}
  </div>
  <div className="iva-buy-footer">
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>Credits never expire</div>
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>No subscriptions</div>
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>Buy more anytime</div>
  </div>
</div></div>); };

/* Bot voice — with logo between sections, plain inside cards */
const BotLogo = () => (<svg width="16" height="13" viewBox="0 0 66 58" fill="none" style={{ flexShrink: 0, marginTop: 2, opacity: 0.45 }}><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill="#6E2BFF" /><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill="#6E2BFF" /></svg>);
const BotNote = ({ text, inline }) => inline
  ? (<div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, padding: "4px 0" }}>{text}</div>)
  : (<div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", marginBottom: 8 }}><BotLogo /><span style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{text}</span></div>);

/* SERP Snippet Preview */
const SerpSnippet = ({ url, title, desc, hideDesc }) => {
  let displayUrl = url || "";
  try { const u = new URL(url); displayUrl = u.hostname + (u.pathname === "/" ? "" : u.pathname); } catch(e) {}
  const truncTitle = title ? (title.length > 60 ? title.slice(0, 57) + "..." : title) : "No title set";
  const truncDesc = desc ? (desc.length > 160 ? desc.slice(0, 157) + "..." : desc) : "No description set";
  return (<div style={{ padding: "14px 16px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Google Search Preview</div>
    <div style={{ padding: "12px 14px", borderRadius: 8, background: "#fff", border: "1px solid rgba(21,20,21,0.06)" }}>
      <div style={{ fontSize: 11, color: "#202124", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(21,20,21,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>{(displayUrl[0] || "?").toUpperCase()}</span></div>
        <span style={{ color: "#4d5156", fontSize: 11 }}>{displayUrl}</span>
      </div>
      <div style={{ fontSize: 16, color: "#1a0dab", fontWeight: 400, lineHeight: 1.3, marginBottom: hideDesc ? 0 : 3, cursor: "pointer" }}>{truncTitle}</div>
      {!hideDesc && <div style={{ fontSize: 12, color: "#4d5156", lineHeight: 1.5 }}>{truncDesc}</div>}
    </div>
  </div>);
};

/* ═══ RANKINGS TABLE ═══ */
const fmtVol = (v) => { if (!v) return "—"; if (v >= 1000000) return (v/1000000).toFixed(1).replace(/\.0$/,"") + "M"; if (v >= 1000) return (v/1000).toFixed(1).replace(/\.0$/,"") + "K"; return v.toLocaleString(); };
const RankingsTable = ({ rows, emptyMsg }) => (
  <div className="iva-scroll-inner" style={{ background: C.surface, borderRadius: 10, padding: "4px 14px", border: `1px solid ${C.cardBorder}`, overflowX: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
    <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <th style={{ textAlign: "left", padding: "8px 0", color: C.muted, fontWeight: 500, fontSize: 11.5 }}>Keyword</th>
      <th style={{ textAlign: "center", padding: "8px 4px", color: C.muted, fontWeight: 500, fontSize: 11.5, width: 50, whiteSpace: "nowrap" }}>Pos. <QM text="Your page's position in Google search results for this keyword. Position 1 = top result. Based on your target region." /></th>
      <th style={{ textAlign: "right", padding: "8px 4px", color: C.muted, fontWeight: 500, fontSize: 11.5, width: 70, whiteSpace: "nowrap" }}>Vol. <QM text="Monthly search volume — how many times per month people search this keyword in Google." /></th>
      <th style={{ textAlign: "right", padding: "8px 0", color: C.muted, fontWeight: 500, fontSize: 11.5, width: 50, whiteSpace: "nowrap" }}>KD <QM text="Keyword difficulty (0–100) — how hard it is to rank in the top 10. Under 30 = easy, 30–60 = moderate, 60+ = hard." /></th>
    </tr></thead>
    <tbody>{rows.length > 0 ? rows.map((r, i) => (
      <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid rgba(21,20,21,0.04)` : "none" }}>
        <td style={{ padding: "10px 8px 10px 0", color: C.dark, fontWeight: 500 }}>{r.keyword}</td>
        <td style={{ textAlign: "center", padding: "10px 4px" }}>{r.position != null ? (
          <span style={{ background: r.position <= 3 ? "rgba(110,43,255,0.08)" : "rgba(21,20,21,0.04)", color: r.position <= 3 ? C.accent : C.muted, fontWeight: 600, padding: "3px 10px", borderRadius: 8, fontSize: 12 }}>{r.position}</span>
        ) : <span style={{ color: C.muted, fontSize: 10, background: "rgba(21,20,21,0.03)", padding: "3px 8px", borderRadius: 6 }}>100+</span>}</td>
        <td style={{ textAlign: "right", padding: "10px 4px", color: C.dark, fontSize: 12, whiteSpace: "nowrap" }}>{fmtVol(r.volume)}</td>
        <td style={{ textAlign: "right", padding: "10px 0", color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{r.difficulty != null ? r.difficulty : "—"}</td>
      </tr>
    )) : <tr><td colSpan={4} style={{ padding: "14px 0", color: C.muted, fontSize: 12, textAlign: "center" }}>{emptyMsg || "No data available yet."}</td></tr>}</tbody>
  </table>
  </div>
);


/* ═══ PDF EXPORT ═══ */
async function generatePDF(data) {
  try {
  const loadScript = (url) => new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing && window.jspdf) { resolve(); return; }
    if (existing) existing.remove();
    const s = document.createElement("script"); s.src = url; s.onload = resolve; s.onerror = () => reject(new Error("Failed to load " + url));
    document.head.appendChild(s);
  });
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/3.0.3/jspdf.umd.min.js");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.2/jspdf.plugin.autotable.min.js");
  const makeLogo = () => new Promise(resolve => {
    const cvs = document.createElement("canvas"); cvs.width = 132; cvs.height = 116;
    const ctx = cvs.getContext("2d"); ctx.fillStyle = "white"; ctx.scale(2, 2);
    ctx.fill(new Path2D("M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z"));
    ctx.fill(new Path2D("M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7-.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1z"));
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.ellipse(16.3, 24.8, 8.2, 8.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(48.9, 24.8, 8.2, 8.4, 0, 0, Math.PI * 2); ctx.fill();
    resolve(cvs.toDataURL("image/png"));
  });
  const logoImg = await makeLogo();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 40, CW = W - M * 2;
  let y = 0;
  const purple = [110,43,255], tc = [90,85,100], dk = [60,56,65], mt = [146,142,149], wh = [255,255,255];
  const lavH = [184,156,240], lavBg = [248,245,255];
  const ensureSpace = (n) => { if (y + n > H - 60) { doc.addPage(); y = 44; } };
  const gap = (n) => { y += (n||10); };
  const ln = () => { doc.setDrawColor(229,224,238); doc.setLineWidth(0.5); doc.line(M, y, W-M, y); };
  const sec = (t) => { ensureSpace(40); doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(...tc); doc.text(t, M, y); y += 20; };
  const note = (t) => { doc.setFontSize(8.5); doc.setFont("helvetica","normal"); doc.setTextColor(...mt); const L = doc.splitTextToSize(String(t), CW); ensureSpace(L.length*12+4); doc.text(L, M, y); y += L.length*12+4; };
  const fV = (v) => { if (!v) return "\u2014"; if (v>=1e6) return (v/1e6).toFixed(1).replace(/\.0$/,"")+"M"; if (v>=1e3) return (v/1e3).toFixed(1).replace(/\.0$/,"")+"K"; return String(v); };
  const lH = { fillColor: lavH, textColor: wh, fontSize: 8, fontStyle: "bold", cellPadding: 7 };
  const pH = { fillColor: purple, textColor: wh, fontSize: 8, fontStyle: "bold", cellPadding: 7 };
  const tB = { fontSize: 9, textColor: dk, cellPadding: 6, fillColor: lavBg };
  const tA = { fillColor: lavBg };

  const g1=[184,156,240], g2=[212,190,247];
  for (let i=0;i<40;i++){const t=i/40; doc.setFillColor(Math.round(g1[0]+(g2[0]-g1[0])*t),Math.round(g1[1]+(g2[1]-g1[1])*t),Math.round(g1[2]+(g2[2]-g1[2])*t)); doc.rect(0,(78/40)*i,W,78/40+.5,"F");}
  doc.addImage(logoImg,"PNG",M,22,22,19);
  doc.setFontSize(18); doc.setFont("helvetica","bold"); doc.setTextColor(...wh); doc.text("IvaBot",M+28,36);
  doc.setFontSize(9.5); doc.setFont("helvetica","normal"); doc.text("Core Audit Report",M+28,48);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}),W-M,30,{align:"right"});
  const urlS = (data.url||"").length>56 ? data.url.slice(0,53)+"..." : (data.url||"");
  doc.text(urlS,W-M,44,{align:"right"});
  y = 96;

  const sL = data.score>=80?"Strong":data.score>=50?"Moderate":"Weak";
  const sC = data.score>=80?[155,122,230]:data.score>=50?[212,160,232]:[226,212,245];
  const cx=M+28, cy=y+22;
  doc.setDrawColor(229,224,238); doc.setLineWidth(3.5); doc.circle(cx,cy,22);
  doc.setDrawColor(...sC); doc.setLineWidth(3.5);
  for(let a=-90;a<-90+(data.score/100)*360;a+=2){const a1=(a*Math.PI)/180,a2=((Math.min(a+2,-90+(data.score/100)*360))*Math.PI)/180;doc.line(cx+22*Math.cos(a1),cy+22*Math.sin(a1),cx+22*Math.cos(a2),cy+22*Math.sin(a2));}
  doc.setFontSize(18); doc.setFont("helvetica","bold"); doc.setTextColor(...tc); doc.text(String(data.score),cx,cy+3,{align:"center"});
  doc.setFontSize(7); doc.setTextColor(...sC); doc.text(sL,cx,cy+13,{align:"center"});
  doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...tc); doc.text("SEO Score",M+62,y+10);
  doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(...dk); doc.text(urlS,M+62,y+24);
  doc.setFontSize(9); doc.setTextColor(...mt); doc.text(data.score>=80?"Your page has a strong foundation.":"There's room for improvement.",M+62,y+38);
  y+=60; ln(); gap(16);

  sec("Page context summary");
  [["PAGE URL",data.ctx?.url],["PAGE TITLE",data.ctx?.title],["TOPIC",data.ctx?.topic],["OWNER",data.ctx?.owner],["GOAL",data.ctx?.goal],["INDUSTRY",data.ctx?.industry],["REGION",data.ctx?.region],["COMPETITION",data.ctx?.competition],["CORE MESSAGE",data.ctx?.message]].forEach(([l,v])=>{
    if(!v)return; ensureSpace(16);
    doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...mt); doc.text(l,M,y);
    doc.setFontSize(9); doc.setFont("helvetica","normal"); doc.setTextColor(...dk); doc.text(String(v).slice(0,72),M+90,y); y+=14;
  });
  gap(10); ln(); gap(16);

  const kwT = (title, rows) => {
    if(!rows?.length) return; sec(title);
    doc.autoTable({startY:y,margin:{left:M,right:M},headStyles:lH,bodyStyles:tB,alternateRowStyles:tA,
      columnStyles:{0:{cellWidth:260,halign:"left"},1:{halign:"center",cellWidth:45},2:{halign:"center",cellWidth:60},3:{halign:"center",cellWidth:45}},
      head:[["Keyword","Pos.","Volume","KD"]],
      body:rows.map(r=>[r.keyword,r.position!=null?String(r.position):"100+",fV(r.volume),r.difficulty!=null?String(r.difficulty):"\u2014"])
    });
    y=doc.lastAutoTable.finalY+8; note("Positions 1\u20133 = strong visibility. 4\u201310 = page one below fold. 11+ = page two or deeper."); gap(4); ln(); gap(16);
  };
  kwT("How your page ranks in Google", data.rankedKeywords);
  kwT("What your page is built for", data.keywordMetrics);

  const gR=[];
  if(data.titleStatus==="good") gR.push(["Meta Title","\""+(data.title.length>50?data.title.slice(0,47)+"...":data.title)+"\" ("+data.title.length+" chars)"]);
  if(data.descStatus==="good") gR.push(["Meta Description","\""+(data.desc.length>60?data.desc.slice(0,57)+"...":data.desc)+"\" ("+data.desc.length+" chars)"]);
  if(data.headingsStatus==="good"){const h1=data.headings.filter(h=>h.level==="H1"),h2=data.headings.filter(h=>h.level==="H2"),h3=data.headings.filter(h=>h.level==="H3"); gR.push(["Heading Structure","H1: "+h1.map(h=>h.text).join(", ")+" | H2: "+h2.length+" | H3: "+h3.length]);}
  if(data.linksStatus==="good"){const sn=data.links.social.map(s=>typeof s==="string"?s:s.name); gR.push(["Links & Social","Internal: "+data.links.internal+" | External: "+data.links.external+(sn.length?"\nSocial: "+sn.join(" \u00B7 "):"")]);}
  if(data.ux?.cta?.found) gR.push(["Call to Action","CTA: \""+data.ux.cta.text+"\""]);
  if(data.ux?.mobile) gR.push(["Mobile","Viewport meta present. Mobile-friendly."]);
  if(!data.ux?.altMissing) gR.push(["Image Alt Text","All images have descriptions."]);
  if(!data.ux?.noVideo) gR.push(["Video Content","Video detected."]);
  if(data.speedStatus==="good") gR.push(["Page Speed","Fast loading."]);
  if(data.robotsStatus==="good") gR.push(["robots.txt","Properly configured."]);
  if(data.sitemapStatus==="good") gR.push(["Sitemap","XML sitemap accessible."]);
  if(gR.length>0){
    sec("What's working ("+gR.length+")");
    doc.autoTable({startY:y,margin:{left:M,right:M},headStyles:lH,bodyStyles:tB,alternateRowStyles:tA,
      head:[["#","Check","Details"]],body:gR.map((r,i)=>[String(i+1),r[0],r[1]]),
      columnStyles:{0:{cellWidth:26,halign:"center"},1:{cellWidth:110,fontStyle:"bold"},2:{cellWidth:"auto"}}
    });
    y=doc.lastAutoTable.finalY+12; ln(); gap(16);
  }

  const pB=[];
  if(data.titleStatus!=="good") pB.push({t:data.titleEval?.title||"Meta Title",serp:"SERP: "+urlS+" \u2014 "+(data.title||"No title"),w:data.titleEval?.why,s:data.titleEval?.suggestions,lk:[{l:"Google Search Console",u:"https://search.google.com/search-console"}]});
  if(data.descStatus!=="good") pB.push({t:data.descEval?.title||"Meta Description",serp:"SERP: "+(data.desc?"\""+( data.desc.length>60?data.desc.slice(0,57)+"...":data.desc)+"\"":"No description"),w:data.descEval?.why,s:data.descEval?.suggestions});
  if(data.headingsStatus!=="good") pB.push({t:"Heading Structure",w:data.headingsEval?.why,cur:data.headingsEval?.current,s:data.headingsEval?.suggestions});
  if(data.linksStatus!=="good") pB.push({t:"Links",w:data.linksEval?.why,s:data.linksEval?.suggestions});
  if(!data.ux?.cta?.found) pB.push({t:"No CTA Found",w:"No call-to-action detected.",s:["Add a prominent CTA above the fold"]});
  if(!data.ux?.mobile) pB.push({t:"Not Mobile-Friendly",w:"Missing viewport meta tag.",s:["Add viewport meta tag"]});
  if(data.ux?.altMissing) pB.push({t:data.imagesEval?.title||"Images Missing Alt",w:data.imagesEval?.why,s:data.imagesEval?.suggestions});
  if(data.ux?.noVideo) pB.push({t:data.videoEval?.title||"No Video",w:data.videoEval?.why,s:data.videoEval?.suggestions});
  if(data.speedStatus!=="good") pB.push({t:data.speedEval?.title||"Page Speed",w:data.speedEval?.why,s:data.speedEval?.suggestions,lk:[{l:"Google PageSpeed Insights",u:"https://pagespeed.web.dev/"}]});
  if(data.robotsStatus!=="good") pB.push({t:"robots.txt Not Found",w:"Tells search engines which pages to crawl.",s:["Create robots.txt at your domain root"],lk:[{l:"How to create robots.txt",u:"https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt"}]});
  if(data.sitemapStatus!=="good") pB.push({t:"Sitemap Not Found",w:"Helps Google discover and index pages.",s:["Generate and submit XML sitemap"],lk:[{l:"Google Sitemap Guide",u:"https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap"}]});

  if(pB.length>0){
    sec("Needs improvement ("+pB.length+")");
    const rows=[];
    pB.forEach((item,i)=>{
      rows.push([{content:String(i+1),styles:{fontStyle:"bold"}},{content:item.t,styles:{fontStyle:"bold"}},item.w||""]);
      if(item.serp) rows.push(["",{content:item.serp,colSpan:2,styles:{fontSize:8,fontStyle:"italic",textColor:mt,fillColor:lavBg}}]);
      if(item.cur){const ct=String(item.cur).slice(0,300); rows.push(["",{content:"Current:\n"+ct,colSpan:2,styles:{fontSize:8,textColor:dk,fillColor:lavBg,cellPadding:{top:4,bottom:4,left:6,right:6}}}]);}
      if(item.s?.length>0) item.s.forEach(s=>{rows.push(["",{content:"Suggested:  "+String(s),colSpan:2,styles:{fillColor:wh,fontSize:8.5,textColor:mt}}]);});
      if(item.lk?.length>0) item.lk.forEach(l=>{rows.push(["",{content:l.l+" \u2192",colSpan:2,styles:{fillColor:wh,fontSize:8,textColor:purple}}]);});
    });
    doc.autoTable({startY:y,margin:{left:M,right:M},headStyles:pH,bodyStyles:tB,alternateRowStyles:tA,
      head:[["#","Issue","Details"]],body:rows,
      columnStyles:{0:{cellWidth:26,halign:"center"},1:{cellWidth:100},2:{cellWidth:"auto"}}
    });
    y=doc.lastAutoTable.finalY+12; ln(); gap(16);
  }

  if(data.competitors?.length>0){
    sec("Top competitors in Google");
    note("Top organic results for \""+(data.keywords?.[0]||"your topic")+"\".");
    doc.autoTable({startY:y,margin:{left:M,right:M},headStyles:lH,bodyStyles:tB,alternateRowStyles:tA,
      head:[["#","Domain","SEO Tactics"]],
      body:data.competitors.map((c,i)=>[String(i+1),(c.name||"")+(c.url?"\n"+c.url:""),c.tactics||""]),
      columnStyles:{0:{cellWidth:26,halign:"center"},1:{cellWidth:150},2:{cellWidth:"auto"}}
    });
    y=doc.lastAutoTable.finalY+12; ln(); gap(16);
  }

  sec("PR & backlink opportunities");
  if(data.backlinksCount!=null){
    ensureSpace(35);
    [["Backlinks",data.backlinksCount],["Referring Domains",data.referringDomains],["Ranked Keywords",data.totalRanked]].forEach(([l,v],i)=>{
      const sx=M+(CW/3)*i;
      doc.setFontSize(16); doc.setFont("helvetica","bold"); doc.setTextColor(...tc); doc.text(v!=null?v.toLocaleString():"\u2014",sx,y);
      doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.setTextColor(...mt); doc.text(String(l),sx,y+14);
    }); y+=34;
    if(data.backlinksCount<10){note(data.backlinksCount===0?"No backlinks detected. Top 3 Google ranking factor.":"Low backlink count ("+data.backlinksCount+")."); gap(2);}
  }
  note("Every quality link is a 'vote of confidence' for Google.");
  if(data.backlinks?.length>0){
    doc.autoTable({startY:y,margin:{left:M,right:M},headStyles:lH,bodyStyles:tB,alternateRowStyles:tA,
      head:[["#","Source","Outreach Strategy"]],body:data.backlinks.map((b,i)=>[String(i+1),b.name,b.desc||""])
    });
    y=doc.lastAutoTable.finalY+12; ln(); gap(16);
  }

  sec("Final recommendations");
  const recs=[...pB.map(item=>[item.t,item.s?.[0]||""]),
    [data.backlinksCount!=null&&data.backlinksCount>=10?"Keep building backlinks":"Build quality backlinks","Reach out to industry blogs, directories."],
    ["Create useful content","Content that solves real problems."],
    ["Monitor with Google tools","Use Search Console and PageSpeed Insights."],
    ["Re-audit after changes","Run another Core Audit to measure progress."]
  ];
  doc.autoTable({startY:y,margin:{left:M,right:M},headStyles:lH,bodyStyles:tB,alternateRowStyles:tA,
    head:[["#","Action","How"]],body:recs.map((r,i)=>[String(i+1),r[0],r[1]]),
    columnStyles:{0:{cellWidth:26,halign:"center"},1:{cellWidth:140,fontStyle:"bold"},2:{cellWidth:"auto"}}
  });
  y=doc.lastAutoTable.finalY+20;

  gap(6); ensureSpace(40);
  const bW=200,bH=32,bX=W/2-bW/2,bY=y;
  doc.setFillColor(...purple); doc.roundedRect(bX,bY,bW,bH,8,8,"F");
  doc.setFontSize(11); doc.setFont("helvetica","bold"); doc.setTextColor(...wh);
  doc.text("Run your audit at ivabot.xyz",W/2,bY+20,{align:"center"});
  doc.link(bX,bY,bW,bH,{url:"https://ivabot.xyz/app"});

  const tp=doc.getNumberOfPages();
  for(let i=1;i<=tp;i++){doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...mt); doc.text("ivabot.xyz  \u00B7  AI SEO Assistant",W/2,H-22,{align:"center"}); doc.text("Page "+i+" of "+tp,W-M,H-22,{align:"right"}); doc.link(W/2-60,H-32,120,14,{url:"https://ivabot.xyz/app"});}

  const domain=(()=>{try{return new URL(data.url).hostname.replace(/^www\./,"");}catch(e){return "audit";}})();
  const fileName="IvaBot-Audit-"+domain+"-"+new Date().toISOString().slice(0,10)+".pdf";
  doc.save(fileName);

  const pdfBtn = document.getElementById("export-pdf-btn");
  const origHTML = pdfBtn ? pdfBtn.innerHTML : "";
  if (pdfBtn) { pdfBtn.innerHTML = "✓ Downloaded"; pdfBtn.style.color = C.dark; }

  try {
    const pdfBlob = doc.output("blob");
    let memberId = window.__memberId;
    if (!memberId && window.$memberstackDom) {
      try {
        const msRes = await window.$memberstackDom.getCurrentMember();
        memberId = msRes?.data?.id;
      } catch(me) {}
    }
    if (memberId && pdfBlob) {
      if (pdfBtn) { pdfBtn.innerHTML = "Saving To Dashboard..."; pdfBtn.style.color = C.muted; }
      const form = new FormData();
      form.append("pdf", new File([pdfBlob], fileName, { type: "application/pdf" }));
      form.append("member_id", memberId);
      form.append("source_url", data.url || "");
      form.append("flow_type", "core");
      fetch("https://empuzslozakbicmenxfo.supabase.co/functions/v1/upload-pdf", {
        method: "POST", body: form
      }).then(r => r.json()).then(d => {
        if (d?.already_saved) {
          console.log("[IvaBot] PDF already saved for this audit");
          if (pdfBtn) { pdfBtn.innerHTML = "✓ Already Saved"; pdfBtn.style.color = C.dark; }
        } else if (d?.url) {
          console.log("[IvaBot] PDF saved to dashboard:", d.url);
          if (pdfBtn) { pdfBtn.innerHTML = "✓ Saved To Dashboard"; pdfBtn.style.color = C.dark; }
        } else {
          console.warn("[IvaBot] PDF upload response:", d);
          if (pdfBtn) { pdfBtn.innerHTML = "✓ Downloaded"; pdfBtn.style.color = C.dark; }
        }
        setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 4000);
      }).catch(e => {
        console.warn("[IvaBot] PDF upload failed:", e);
        if (pdfBtn) { pdfBtn.innerHTML = "✓ Downloaded"; pdfBtn.style.color = C.dark; }
        setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 4000);
      });
    } else {
      console.log("[IvaBot] PDF not uploaded — no member ID (user not logged in)");
      setTimeout(() => { if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }, 3000);
    }
  } catch(ue) { console.warn("[IvaBot] PDF upload error:", ue); if (pdfBtn) { pdfBtn.innerHTML = origHTML; pdfBtn.style.color = ""; } }
  } catch(err){console.error("[IvaBot] PDF error:",err); alert("PDF export failed: "+err.message);}
}

/* ═══ REPORT (unchanged) ═══ */
const ReportV6 = ({ data, onNewAudit, onHome }) => { const { good, bad } = buildResults(data); return (<div style={{ maxWidth: 580, margin: "0 auto", padding: "20px 16px 16px" }}>
  <BotNote text="Here's your full SEO audit. I'll walk you through each part — what's working, what needs fixing, and exactly how to fix it." />
  <div className="reveal" style={{ display: "flex", gap: 16, marginBottom: 18, padding: 16, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}><ScoreRing score={data.score} /><div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}><span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>SEO Score</span><QM text="Your overall score based on title, description, headings, speed, mobile, links, robots.txt, and sitemap. Higher is better — aim for 80+." /></div><div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 4, wordBreak: "break-all" }}>{data.url}</div><div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.4 }}>{data.score >= 80 ? "Your page has a strong foundation. Let's fine-tune the details below." : "There's room for improvement — I'll show you exactly what to fix."}</div></div></div>
  <BotNote text="Let's start with how Google sees your page. This is what search engines understand about your content, topic, and purpose." />
  <div className="reveal reveal-delay-1" style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Page Context Summary</span><QM text="If something looks off here, it means Google may misunderstand your page's purpose." /></div><div className="iva-ctx-grid">{[{ l: "Page URL", v: data.ctx.url }, { l: "Page Title", v: data.ctx.title }, { l: "Topic", v: data.ctx.topic }, { l: "Owner / Creator", v: data.ctx.owner }, { l: "Goal", v: data.ctx.goal }, { l: "Industry", v: data.ctx.industry }, { l: "Region", v: data.ctx.region }, { l: "Topic Competition", v: null, badge: data.ctx.competition }].map((x, i) => (<div key={i} style={{ padding: "6px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 1 }}>{x.l}</div>{x.badge ? <CompBadge level={x.badge} /> : <div style={{ fontSize: 12, fontWeight: 500, color: C.dark, wordBreak: "break-all" }}>{x.v}</div>}</div>))}<div style={{ gridColumn: "1/-1", padding: "6px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ fontSize: 9, fontWeight: 600, color: C.muted, textTransform: "uppercase", marginBottom: 1 }}>Core Message</div><div style={{ fontSize: 12, fontWeight: 500, color: C.dark, lineHeight: 1.4 }}>{data.ctx.message}</div></div></div></div>
  <BotNote text="These are the keywords Google currently associates with your page. All recommendations below are based on these topics." />
  {data.rankedKeywords?.length > 0 && <div className="reveal reveal-delay-2" style={{ marginBottom: 16, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>How your page ranks in Google</span><QM text="Real positions from the Google search index — these are the actual search queries your page currently ranks for." /></div>
      <span style={{ fontSize: 10, color: C.accent, background: "rgba(110,43,255,0.06)", padding: "3px 10px", borderRadius: 10, fontWeight: 500 }}>real data</span>
    </div>
    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>Keywords your page actually ranks for in Google right now — with real positions from the search index.</div>
    <RankingsTable rows={data.rankedKeywords} />
    <BotNote inline text="Positions 1–3 mean strong visibility. 4–10 is page one but below the fold. 11+ means page two or deeper — most users never scroll there." />
  </div>}
  <div className="reveal reveal-delay-2" style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.cardBorder}` }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>What your page is built for</span><QM text="Based on your title, H1–H3 headings, and meta description — these are the search queries your content is currently optimized for." /></div>
      <span style={{ fontSize: 10, color: C.muted, background: "rgba(21,20,21,0.04)", padding: "3px 10px", borderRadius: 10, fontWeight: 500 }}>content analysis</span>
    </div>
    <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5, marginBottom: 10 }}>Based on your title, headings (H1–H3), and meta description — these are the search queries your content is currently optimized for.</div>
    <RankingsTable rows={data.keywordMetrics} emptyMsg="Keywords will appear after audit completes." />
    <BotNote inline text="If your real rankings don't match these keywords, your content may need better keyword targeting. Update your headings and meta tags to align with your target queries." />
  </div>
  <BotNote text={good.length > 0 ? `Good news — ${good.length} things are already working well on your page.` : "Let's look at what needs attention."} />
  {good.length > 0 && <div className="reveal reveal-delay-3" style={{ marginBottom: 12 }}><Fold title="What's Working" count={good.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>{good.map((g, i) => <WorkingItem key={i} title={g.title} content={g.content} />)}</div></Fold></div>}
  <BotNote text={bad.length > 0 ? `I found ${bad.length} areas that need attention. Each card has a clear fix — tap to see what to do.` : "Everything looks great! No major issues found."} />
  {bad.length > 0 && <div className="reveal" style={{ marginBottom: 20 }}><Fold title="Needs Improvement" count={bad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>{bad.map((p, i) => <ProblemCard key={i} {...p} />)}</div></Fold></div>}
  <BotNote text="Want to go deeper? See how your competitors rank and where to earn backlinks." />
  <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
    <Fold title="Top Competitors in Google" borderColor={C.cardBorder} headerBg={C.card}><BotNote inline text={`These are the top organic Google results for "${data.keywords?.[0] || "your topic"}". They currently outrank your page for this search query.`} /><div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>{data.competitors.map((c, i) => (<div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ background: "rgba(110,43,255,0.08)", color: C.accent, fontWeight: 700, width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>{i + 1}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, flex: 1 }}>{c.name}</span>
      </div>
      {(c.title || c.tactics) && <div style={{ fontSize: 12.5, color: C.dark, fontWeight: 500, paddingLeft: 32, marginBottom: 2 }}>{c.title || c.tactics}</div>}
      {c.tactics && c.title && <div style={{ fontSize: 11.5, color: C.muted, paddingLeft: 32, marginBottom: 3, lineHeight: 1.4 }}>{c.tactics}</div>}
      {c.description && !c.tactics && <div style={{ fontSize: 11.5, color: C.muted, paddingLeft: 32, marginBottom: 4, lineHeight: 1.4 }}>{c.description.length > 120 ? c.description.slice(0, 117) + "..." : c.description}</div>}
      {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accent, textDecoration: "none", paddingLeft: 32, display: "block" }}>{c.url.length > 55 ? c.url.slice(0, 52) + "..." : c.url} →</a>}
    </div>))}</div><BotNote inline text="Study their titles, descriptions, and content structure. What are they doing that you're not? Use their strengths as inspiration to improve your own page." /></Fold>
    <Fold title="PR & Backlink Opportunities" borderColor={C.cardBorder} headerBg={C.card}>
      {data.backlinksCount != null && <div style={{ display: "flex", gap: 8, marginBottom: 8, marginTop: 4 }}>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${data.backlinksCount < 10 ? "rgba(110,43,255,0.25)" : C.cardBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{data.backlinksCount.toLocaleString()}</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>Backlinks</div>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{data.referringDomains?.toLocaleString() || "—"}</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>Referring Domains</div>
        </div>
        <div style={{ flex: 1, padding: "10px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.cardBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.dark }}>{data.totalRanked?.toLocaleString() || "—"}</div>
          <div style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>Ranked Keywords</div>
        </div>
      </div>}
      {(data.backlinksCount != null && data.backlinksCount < 10) && <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(110,43,255,0.04)", border: "1px solid rgba(110,43,255,0.15)", marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{data.backlinksCount === 0 ? "No backlinks detected" : "Low backlink count"}</div><div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>Backlinks are one of Google's top 3 ranking factors. {data.backlinksCount === 0 ? "Without them, it's very hard to rank on page one — even with perfect on-page SEO." : "With fewer than 10 backlinks, you're likely losing rankings to competitors with stronger link profiles."} Start with directories, guest posts, and industry publications.</div></div>}
      <BotNote inline text="Every quality link from another website is a 'vote of confidence' for Google. Reach out to these sites — offer a guest post, suggest a resource mention, or propose a collaboration. Even 2–3 strong backlinks can make a real difference." />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>{data.backlinks.map((b, i) => (<div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}><NumBadge n={i + 1} /><span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{b.name}</span></div><div style={{ fontSize: 11.5, color: C.muted, paddingLeft: 28 }}>{b.desc}</div></div>))}</div>
    </Fold>
  </div>
  <BotNote text="Here's a summary of what to focus on. Fix these and your rankings will improve." />
  <div className="reveal" style={{ marginBottom: 8, padding: 20, borderRadius: 14, background: C.card, border: `1px solid ${C.cardBorder}` }}><div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Final Recommendations</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {bad.map((item, i) => (
      <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{item.title}</div>
            {item.why && <div style={{ fontSize: 11.5, color: C.muted, marginBottom: item.suggestions?.[0] ? 6 : 0 }}>{item.why}</div>}
            {item.suggestions?.[0] && <div style={{ padding: "6px 10px", borderRadius: 6, background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: item.links?.[0] ? 4 : 0 }}><div><div style={{ fontSize: 10, color: C.muted }}>Suggested:</div><div style={{ fontSize: 12, fontWeight: 500, color: C.dark }}>{item.suggestions[0]}</div></div>{item.showCopy !== false && <CopyBtn text={item.suggestions[0]} />}</div>}
            {item.links?.[0] && <a href={item.links[0].url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: C.accent, textDecoration: "none" }}>{item.links[0].label} →</a>}
          </div>
        </div>
      </div>
    ))}
    <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${(data.backlinksCount == null || data.backlinksCount < 10) ? "rgba(110,43,255,0.25)" : C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>{data.backlinksCount != null && data.backlinksCount >= 10 ? "Keep building backlinks" : "Build quality backlinks — this is critical"}</div><div style={{ fontSize: 11.5, color: C.muted }}>{data.backlinksCount != null && data.backlinksCount < 10 ? `You currently have ${data.backlinksCount === 0 ? "no" : "only " + data.backlinksCount} backlink${data.backlinksCount !== 1 ? "s" : ""}. Backlinks are one of Google's top 3 ranking factors — without them, even perfect on-page SEO won't be enough. ` : ""}Reach out to industry blogs, directories, and publications. Offer guest posts, case studies, or resource mentions. Check the PR & Backlinks section above for specific opportunities.</div></div></div></div>
    <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Create useful content</div><div style={{ fontSize: 11.5, color: C.muted }}>Content that solves real problems for your users is the foundation of lasting SEO success.</div></div></div></div>
    <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Monitor with Google tools</div><div style={{ fontSize: 11.5, color: C.muted }}>Use <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>Search Console</a> and <a href="https://pagespeed.web.dev/" target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: "none" }}>PageSpeed Insights</a> to track improvements.</div></div></div></div>
    <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.cardBorder}` }}><div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}><span style={{ color: C.accent, fontSize: 10, marginTop: 4 }}>●</span><div><div style={{ fontSize: 13, fontWeight: 600, color: C.dark, marginBottom: 2 }}>Re-audit after changes</div><div style={{ fontSize: 11.5, color: C.muted }}>Run another Core Audit to measure your progress and track score improvements.</div></div></div></div>
  </div></div>
</div>); };

/* ═══ MAIN — NEW LAYOUT (Builder-style) ═══ */
function IvaBotV6() {
  const isMobile = useIsMobile();
  const [mTab, sMTab] = useState("chat");
  const [pLoad, sPLoad] = useState(null);
  const [view, setView] = useState("select"), [tool, setTool] = useState(null), [msgs, setMsgs] = useState([]), [loadStep, setLS] = useState(-1), [showR, setSR] = useState(false), [showBuy, setSB] = useState(false), [typing, setTyping] = useState(false), [credits, setCredits] = useState({ core: 0, builder: 0, coverage: 0 }), [memberId, setMemberId] = useState(null), [memberName, setMemberName] = useState(null), [loading, setLoading] = useState(true);
  const inputRef = useRef(null);
  useEffect(() => { (async () => { const info = await getMemberInfo(); setMemberId(info.id); setMemberName(info.name); const cr = await fetchCredits(info.id); setCredits(cr); setLoading(false); })(); }, []);
  const chatRef = useRef(null);
  const prevMsgCount = useRef(0);
  const scrollChat = useCallback(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, []);
  useEffect(() => {
    if (msgs.length > prevMsgCount.current) {
      setTimeout(scrollChat, 50);
    }
    prevMsgCount.current = msgs.length;
  }, [msgs.length]);
  useEffect(() => { if (typing) setTimeout(scrollChat, 50); }, [typing]);

  /* Reveal on scroll for report */
  useEffect(() => {
    if (!showR) return;
    const timer = setTimeout(() => {
      const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }); }, { threshold: 0.1 });
      document.querySelectorAll(".reveal:not(.visible)").forEach(el => obs.observe(el));
      return () => obs.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, [showR, auditData]);

  /* Sticky fix — CSS override instead of JS DOM manipulation to prevent layout jumping */
  /* The actual override is in the <style> tag below: .iva-root gets overflow:visible!important when in chat view */

  const [auditData, setAuditData] = useState(null);
  const addMsg = (f, c, e) => setMsgs(p => [...p, { from: f, content: c, err: e, id: Date.now() + Math.random() }]);

  const start = (t) => {
    setTool(t);
    setView("chat");
    setSR(false);
    setLS(-1);
    setMsgs([]);
    setAuditData(null);
    sPLoad(null);
    sMTab("chat");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs([{ from: "bot", content: memberName ? `Hey, ${memberName}! Welcome to Core Audit.` : "Hey! Welcome to Core Audit.", id: Date.now() }]);
      setTyping(true);
    }, 1500);
    setTimeout(() => {
      setTyping(false);
      setMsgs(p => [...p, { from: "bot", content: "I'll check your page for technical SEO, content structure, speed, mobile readiness, and more. You'll get clear, actionable recommendations.\n\nJust paste your URL below and I'll get started.", id: Date.now() + 1 }]);
    }, 4000);
  };
  const home = () => { setView("select"); setTool(null); setMsgs([]); setSR(false); setLS(-1); setAuditData(null); sPLoad(null); sMTab("chat"); };

  const runAudit = async (url) => {
    setSR(false); setAuditData(null); sPLoad("Analyzing your page...");
    setLS(0);
    const setStep = (s) => setLS(prev => Math.max(prev, s));

    try {
      if (USE_MOCK) {
        await new Promise(res => setTimeout(res, STEPS.length * 800));
        var reportData = A;
      } else {
        setStep(0);
        const htmlRes = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        if (!htmlRes.ok) throw new Error("Could not fetch page");
        const rawHtml = await htmlRes.text();

        setStep(1);
        await new Promise(r => setTimeout(r, 300));
        setStep(2);
        const parsed = parseSEO(rawHtml, url);

        setStep(3);
        await new Promise(r => setTimeout(r, 300));
        setStep(4);
        let gpt = null;
        let dfsSeo = null;
        const domain = new URL(url).hostname.replace(/^www\./, "");
        const cleanKw = (v) => v && v.length > 2 && !/^\{.*\}$/.test(v) && !/^[^a-zA-Z]*$/.test(v) ? v : null;
        const primaryKw = cleanKw(parsed.h1?.[0]) || cleanKw(parsed.title) || "";

        const [makeResult, dfsResult] = await Promise.allSettled([
          (async () => {
            const makeRes = await fetch(WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ member_id: memberId || "UNKNOWN", parsed_data: parsed.summary, domain, primary_keyword: primaryKw })
            });
            if (!makeRes.ok) throw new Error("Make HTTP " + makeRes.status);
            const raw = await makeRes.text();
            console.log("[IvaBot] Make raw length:", raw.length, "first 300:", raw.substring(0, 300));
            let parsed_gpt = null;
            try { parsed_gpt = JSON.parse(raw); } catch(e) {
              console.log("[IvaBot] GPT JSON parse failed:", e.message);
              const m = raw.match(/\{[\s\S]*\}/);
              if (m) try { parsed_gpt = JSON.parse(m[0]); } catch(e2) {}
            }
            if (parsed_gpt?.gpt_raw) {
              const gr = parsed_gpt.gpt_raw;
              parsed_gpt = typeof gr === "string" ? JSON.parse(gr) : gr;
            }
            if (parsed_gpt?.gpt) {
              const gr = parsed_gpt.gpt;
              parsed_gpt = typeof gr === "string" ? JSON.parse(gr) : gr;
            }
            return parsed_gpt;
          })(),
          (async () => {
            const DFS_PROXY = SUPABASE_URL + "/functions/v1/dataforseo-proxy";
            const dfsRes = await fetch(DFS_PROXY, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_KEY },
              body: JSON.stringify({ domain, keyword: primaryKw, page_url: url })
            });
            if (!dfsRes.ok) { console.log("[IvaBot] DFS proxy HTTP", dfsRes.status); return null; }
            const dfsData = await dfsRes.json();
            console.log("[IvaBot] DFS proxy response keys:", Object.keys(dfsData || {}));
            return dfsData;
          })()
        ]);

        if (makeResult.status === "fulfilled" && makeResult.value) {
          gpt = makeResult.value;
          console.log("[IvaBot] GPT OK, keys:", Object.keys(gpt));
        } else {
          console.log("[IvaBot] GPT failed:", makeResult.reason?.message || "unknown");
        }

        if (dfsResult.status === "fulfilled" && dfsResult.value) {
          const dfs = dfsResult.value;
          dfsSeo = {
            ranked_keywords: dfs.ranked_keywords || [],
            serp_competitors: dfs.serp_competitors || [],
            total_ranked: dfs.total_ranked || 0,
          };
          console.log("[IvaBot] DFS OK — ranked:", dfsSeo.ranked_keywords.length, "serp:", dfsSeo.serp_competitors.length);
        } else {
          console.log("[IvaBot] DFS failed:", dfsResult.reason?.message || "no data");
        }

        setStep(5);
        var reportData = buildReportData(parsed, gpt, dfsSeo);

        try { const rb = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: parsed.robots_url }) }); if (rb.ok) { const rbt = await rb.text(); reportData.robotsStatus = (rbt.toLowerCase().includes("user-agent") || rbt.toLowerCase().includes("disallow") || rbt.toLowerCase().includes("sitemap")) ? "good" : "bad"; } else { reportData.robotsStatus = "bad"; } } catch(e){ reportData.robotsStatus = "bad"; }
        try { const sm = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: parsed.sitemap_url }) }); if (sm.ok) { const smt = await sm.text(); reportData.sitemapStatus = (smt.includes("<urlset") || smt.includes("<sitemapindex") || smt.includes("<url>")) ? "good" : "bad"; } else { reportData.sitemapStatus = "bad"; } } catch(e){ reportData.sitemapStatus = "bad"; }
      }

      setLS(-1);
      sPLoad(null);
      setSR(true);
      setAuditData(reportData);
      if (!USE_MOCK) setCredits(prev => ({ ...prev, core: Math.max(0, prev.core - 1) }));
      if (isMobile) sMTab("report");

      const d = reportData;
      const { good, bad } = buildResults(d);
      const potential = Math.min(100, d.score + bad.length * 3);
      const summary = d.score >= 80
        ? `Your site is in good shape — ${good.length} things are working well${bad.length > 0 ? ` and ${bad.length} small improvements can push you even higher` : ""}.`
        : d.score >= 50
          ? `You have strong foundations, but ${bad.length} areas need attention to reach your full potential.`
          : `There's a lot of room for growth — ${bad.length} key areas need work, but every fix will make a real difference.`;
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        addMsg("bot", <div>
          <div style={{ marginBottom: 8 }}>Done! Your page scored <strong>{d.score}/100</strong>.</div>
          <div style={{ marginBottom: 8 }}>{summary}</div>
          {bad.length > 0 && <div style={{ marginBottom: 8 }}>If you fix the issues I found, your score could reach around <strong>{potential}/100</strong>.</div>}
          <div style={{ color: C.muted, fontSize: 12 }}>{isMobile ? "Switch to the Report tab to see details." : "Check the report on the right for details."} Come back and re-audit once you've made changes — I'll track your progress.</div>
        </div>);
        setTimeout(() => { setTyping(true); }, 5000);
        setTimeout(() => {
          setTyping(false);
          addMsg("bot", "If you have any questions, I'm ready to explain all the SEO details and help fix some of the issues on your page. Just ask!");
        }, 7000);
      }, 4500);

    } catch (err) {
      setLS(-1);
      sPLoad(null);
      addMsg("bot", `Something went wrong: ${err.message}. Please try again.`, true);
    }
  };

  const [chatCount, setChatCount] = useState(0);
  const MAX_CHAT = 100;

  const sendChat = async (text) => {
    if (chatCount >= MAX_CHAT) {
      addMsg("bot", <div>You've reached the message limit for this session. Run another audit or try our other tools to keep improving your SEO!</div>);
      return;
    }
    setChatCount(c => c + 1);
    setTyping(true);

    if (USE_MOCK) {
      const mockAnswers = [
        "To add an image to your search snippet, you need structured data (schema markup). Add a `WebPage` or `Article` schema with an `image` property to your page.",
        "Your title is only 5 characters — Google needs more context to understand your page. Aim for 30-60 characters with your main keyword.",
        "Internal links help Google discover your other pages and pass authority between them. Add 3-5 links to your most important pages within the body content.",
        "Meta description doesn't directly affect rankings, but it affects click-through rate. A good one is 120-160 characters, includes your main keyword.",
        "H2 headings break your content into sections. Google uses them to understand your page structure. Add 3-5 H2s that describe each main section.",
        "Page speed depends on image size, JS/CSS files, and server response time. Run your URL through PageSpeed Insights.",
        "Alt text describes images for Google and screen readers. Go through each image in your CMS and add a short description.",
        "Backlinks take time. Start with directories in your industry, write guest posts on relevant blogs."
      ];
      setTimeout(() => {
        setTyping(false);
        addMsg("bot", mockAnswers[chatCount % mockAnswers.length]);
      }, 2000);
    } else {
      try {
        const d = auditData || A;
        const history = msgs.filter(m => typeof m.content === "string").slice(-10).map(m => `${m.from === "bot" ? "IvaBot" : "User"}: ${m.content}`).join("\n");
        const res = await fetch(CHAT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audit_context: `Page: ${d.url}\nScore: ${d.score}/100\nTitle: "${d.title}"\nDescription: "${d.desc}"\nKeywords: ${d.keywords?.join(", ") || "N/A"}\nH1: ${d.headings?.filter(h=>h.level==="H1").map(h=>h.text).join(", ") || "none"}\nH2: ${d.headings?.filter(h=>h.level==="H2").map(h=>h.text).join(", ") || "none"}\nInternal links: ${d.links?.internal || 0}\nExternal links: ${d.links?.external || 0}\nSocial: ${d.links?.social?.map(s => typeof s === "string" ? s : s.name).join(", ") || "none"}\nHas CTA: ${d.ux?.cta?.found || false}\nMobile: ${d.ux?.mobile || false}\nrobots.txt: ${d.robotsStatus || "unknown"}\nsitemap: ${d.sitemapStatus || "unknown"}`,
            chat_history: history,
            question: text
          })
        });
        const raw = await res.text();
        setTyping(false);
        let answer = raw;
        try {
          const j = JSON.parse(raw);
          answer = j.answer || j.result || raw;
        } catch(e){
          answer = raw;
        }
        if (answer.startsWith('"') && answer.endsWith('"')) answer = answer.slice(1, -1);
        answer = answer.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\*\*/g, '').replace(/###\s?/g, '').replace(/^- /gm, '• ');
        addMsg("bot", answer);
      } catch(e) {
        setTyping(false);
        addMsg("bot", "Sorry, I couldn't process that. Try asking again.", true);
      }
    }
  };

  const [pendingUrl, setPendingUrl] = useState(null);

  const send = () => {
    const el = inputRef.current;
    if (!el || !el.value.trim()) return;
    const text = el.value.trim();
    el.value = "";

    if (pendingUrl) setPendingUrl(null);

    if (showR) {
      const v = valUrl(text);
      if (v.ok) {
        addMsg("user", text);
        if (credits.core <= 0) {
          addMsg("bot", <div>You're out of Core Audit credits. <button onClick={() => setSB(true)} style={{ color: C.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: 600, textDecoration: "underline" }}>Buy more credits</button> to continue.</div>);
          return;
        }
        addMsg("bot", <div>
          <div style={{ marginBottom: 10 }}>You have <strong>{credits.core}</strong> Core Audit credit{credits.core !== 1 ? "s" : ""} left. Run audit on <strong>{v.url}</strong>?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setPendingUrl(null); runAudit(v.url); }} style={{ padding: "8px 20px", borderRadius: 8, background: C.accent, color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>Yes, run audit</button>
            <button onClick={() => { setPendingUrl(null); addMsg("bot", "No problem! You can paste another URL whenever you're ready."); }} style={{ padding: "8px 20px", borderRadius: 8, background: C.surface, color: C.dark, border: `1px solid ${C.borderMid}`, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}>No, cancel</button>
          </div>
        </div>);
        setPendingUrl(v.url);
        return;
      }
      addMsg("user", text);
      sendChat(text);
    } else {
      addMsg("user", text);
      const v = valUrl(text);
      if (!v.ok) { addMsg("bot", v.e, true); return; }
      if (credits.core <= 0) {
        addMsg("bot", <div>You're out of Core Audit credits. <button onClick={() => setSB(true)} style={{ color: C.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", fontWeight: 600, textDecoration: "underline" }}>Buy more credits</button> to continue.</div>);
        return;
      }
      runAudit(v.url);
    }
  };

  /* ═══ Chat Messages — stable, no animation re-trigger ═══ */
  const lastBotIdx = msgs.reduce((acc, m, i) => m.from === "bot" ? i : acc, -1);
  const chatMessages = <React.Fragment>
      <style>{`.cb-past-msg{pointer-events:none!important;opacity:0.8}.cb-past-msg *{pointer-events:none!important;cursor:default!important}`}</style>
      {msgs.map((m, i) => m.from === "bot"
        ? <div key={m.id} className={i < lastBotIdx ? "cb-past-msg" : undefined}>
            {m.err
              ? <BB><span style={{color:"rgba(239,68,68,0.8)"}}>{m.content}</span></BB>
              : <BB>{typeof m.content === "string" ? m.content.split("\n").map((line, j) => <span key={j}>{j > 0 && <br/>}{line}</span>) : m.content}</BB>
            }
          </div>
        : <UB key={m.id} n={memberName}>{m.content}</UB>
      )}
      {loadStep >= 0 && <div style={{ maxWidth: "95%", alignSelf: "flex-start" }}><LBar step={loadStep} total={STEPS.length} text={STEPS[loadStep]} /></div>}
      {typing && <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}><div style={{ marginBottom: 3, marginLeft: 2 }}><BL s={16} /></div><div style={{ padding: "10px 14px", borderRadius: "4px 12px 12px 12px", background: C.surface, border: `1px solid ${C.border}` }}><div className="typing-dots"><span /><span /><span /></div></div></div>}
    </React.Fragment>;

  /* Right panel content — always shows something, never blank */
  const panelContent = <React.Fragment>
    {pLoad ? <LoadingPanel text={pLoad} /> : showR && auditData ? <div style={{ animation: "fadeIn 0.5s ease", minHeight: "calc(100vh - 130px)" }}><ReportV6 data={auditData} onNewAudit={() => { setSR(false); setMsgs([]); setLS(-1); setAuditData(null); sPLoad(null); }} onHome={home} /></div> : <AuditPlaceholder />}
    <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
  </React.Fragment>;

  return (
    <div className="iva-root" style={{ fontFamily: "'DM Sans',sans-serif", background: "#f8f7f9", display: "flex", flexDirection: "column", padding: "8px 12px", minHeight: "100vh" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg, #ffffff 0%, #F8F5FF 15%, #F0EAFF 40%, #E4D8FC 70%, #D9CCFA 100%)", borderRadius: 12, minHeight: 0 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}@keyframes foldOpen{from{opacity:0;max-height:0}to{opacity:1;max-height:2000px}}@keyframes dotPulse{0%,80%,100%{opacity:0.3}40%{opacity:1}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(21,20,21,0.1);border-radius:3px}.reveal{opacity:0;transform:translateY(32px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)}.reveal.visible{opacity:1;transform:translateY(0)}.reveal-delay-1{transition-delay:0.08s}.reveal-delay-2{transition-delay:0.16s}.reveal-delay-3{transition-delay:0.24s}.typing-dots span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#928E95;margin:0 2px;animation:dotPulse 1.2s infinite}.typing-dots span:nth-child(2){animation-delay:0.2s}.typing-dots span:nth-child(3){animation-delay:0.4s}.fold-content{animation:foldOpen 0.4s cubic-bezier(0.4,0,0.2,1) forwards;overflow:hidden}.iva-tools{display:flex;gap:14px;width:100%}.iva-buy-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.iva-ctx-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.iva-buy-footer{display:flex;gap:16px;justify-content:center;margin-top:16px}.iva-seo-title{font-size:64px}.iva-nav{height:84px;padding:24px 0 0}.iva-root{height:auto!important;min-height:100vh!important;overflow:visible!important}#ivabot-root{overflow:visible!important;height:auto!important;min-height:100vh!important}.w-embed,.w-container,.w-layout-cell,.w-layout-layout{overflow:visible!important}.iva-scroll-inner{overflow:auto!important}@media(max-width:768px){.iva-tools{flex-direction:column}.iva-buy-grid{grid-template-columns:1fr}.iva-ctx-grid{grid-template-columns:1fr}.iva-buy-footer{flex-direction:column;align-items:center;gap:8px}.iva-seo-title{font-size:32px}.iva-nav{padding:0 12px}}@media(max-width:520px){.iva-seo-title{font-size:26px}.iva-nav{height:48px;padding:0 10px}}`}</style>
      {showBuy && <BuyM onClose={() => setSB(false)} />}
      <nav className="iva-nav" style={{ display: "flex", justifyContent: "center", background: "transparent", flexShrink: 0, zIndex: 100, height: 84, paddingTop: 24 }}>
        <div style={{ width: "100%", maxWidth: 1224, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://ivabot.xyz" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textDecoration: "none" }}><svg width="33" height="29" viewBox="0 0 66 58" fill="none"><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill={C.accent} /><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill={C.accent} /></svg><span style={{ fontSize: 17, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>IvaBot</span></a>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><a href="https://ivabot.xyz/dashboard" style={{ fontSize: 14, fontWeight: 500, color: C.dark, textDecoration: "none", letterSpacing: "-0.14px", transition: "opacity 0.2s", padding: "8px 16px" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.6"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Dashboard</a><button onClick={() => setSB(true)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.dark, background: "rgba(255,255,255,0.43)", border: "1px solid rgba(21,20,21,0.16)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", letterSpacing: "-0.3px", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fff"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.43)"}>Buy Credits</button><a href="https://ivabot.xyz/" data-ms-action="logout" style={{ fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none", letterSpacing: "-0.14px", transition: "opacity 0.2s", padding: "8px 16px" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.6"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Log out</a></div>
        </div>
      </nav>

      {view === "select" ? (
        <div style={{ flex: 1, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 36, maxWidth: 780, width: "100%" }}>
            <div style={{ textAlign: "center" }}><div className="iva-seo-title" style={{ fontWeight: 400, color: C.dark, letterSpacing: "-0.2px", lineHeight: 1, marginBottom: 16, background: "linear-gradient(116deg, rgba(21,20,21,0.25) 8%, #151415 35%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>SEO Tools</div><p style={{ fontSize: 20, color: "rgba(21,20,21,0.5)", maxWidth: 460, margin: "0 auto", lineHeight: 1.1, letterSpacing: "-0.2px", fontWeight: 400 }}>Analyze pages, build content, and find gaps — powered by AI with real Google data.</p></div>
            <div className="iva-tools"><TCard title="Core Audit" desc="Technical SEO, content structure, links, speed, and usability. Plus AI chat to explain results and help fix issues." tag="~2 min" credits={credits.core} onClick={() => start("core")} /><TCard title="Content Builder" desc="Keywords, SEO structure, and full page content. AI assistant helps refine your copy." tag="~5 min" credits={credits.builder} onClick={() => start("builder")} /><TCard title="Coverage Audit" desc="Keyword gaps, topical depth, and trust signals. Chat with AI to explore improvements." tag="~3 min" credits={credits.coverage} onClick={() => start("coverage")} /></div>
          </div>
        </div>
      ) : tool === "builder" && window.ContentBuilder ? (
        React.createElement(window.ContentBuilder, { onHome: home, memberName: memberName || "" })
      ) : (
        /* ═══ CORE AUDIT — Builder-style layout ═══ */
        <div style={{ fontFamily: "'DM Sans',sans-serif", flex: 1, display: "flex", flexDirection: "column" }}>
          {/* BREADCRUMB */}
          <div style={{ padding: isMobile ? "0 12px 6px" : "0 24px 10px", display: "flex", alignItems: "center", gap: 6, maxWidth: 1224, margin: "0 auto", width: "100%" }}>
            <button onClick={home} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted, display: "flex" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button>
            <span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>Core Audit</span>
            {showR && <span style={{ fontSize: 10, fontWeight: 600, color: "#9B7AE6", background: "rgba(155,122,230,0.08)", padding: "3px 8px", borderRadius: 10, marginLeft: 4 }}>Done</span>}
          </div>

          {/* ═══ DESKTOP ═══ */}
          {!isMobile && <div style={{ display: "flex", padding: "0 24px 24px", maxWidth: 1224, margin: "0 auto", width: "100%", alignItems: "flex-start", gap: 12 }}>
            {/* Chat — sticky */}
            <div id="ca-chat" style={{ width: "35%", maxWidth: 420, position: "sticky", top: 12, display: "flex", flexDirection: "column", flexShrink: 0, minWidth: 280, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", background: C.card, height: "calc(100vh - 130px)" }}>
              <div ref={chatRef} className="iva-scroll-inner" style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>{chatMessages}</div>
              <div style={{ padding: "8px 12px 12px", flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input ref={inputRef} defaultValue="" onKeyDown={e => e.key === "Enter" && send()} placeholder={showR ? "Ask me anything about your SEO..." : "Paste your URL here..."} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 14px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: C.dark, outline: "none", background: C.surface }} onFocus={e => { e.target.style.borderColor = C.hoverBorder; e.target.style.boxShadow = C.hoverShadow; }} onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                  <button onClick={send} style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${C.borderMid}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></button>
                </div>
              </div>
            </div>
            {/* Right panel — scrolls with page */}
            <div style={{ flex: 1, borderRadius: 12, border: `1px solid ${C.border}`, position: "relative", background: C.surface, minHeight: "calc(100vh - 130px)" }}>
              {panelContent}
              {showR && <div style={{ position: "sticky", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(transparent, #ffffff)", borderRadius: "0 0 12px 12px", pointerEvents: "none" }} />}
            </div>
          </div>}

          {/* ═══ MOBILE ═══ */}
          {isMobile && <div style={{ display: "flex", flexDirection: "column", padding: "0 12px 16px", gap: 12 }}>
            <MobileTab active={mTab} onSwitch={sMTab} hasReport={showR} />
            {/* Chat */}
            <div style={{ display: mTab === "chat" ? "flex" : "none", flexDirection: "column", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", background: C.card, maxHeight: "70vh" }}>
              <div ref={mTab === "chat" ? chatRef : null} className="iva-scroll-inner" style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>{chatMessages}</div>
              <div style={{ padding: "8px 10px 10px", flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input ref={isMobile ? inputRef : null} defaultValue="" onKeyDown={e => e.key === "Enter" && send()} placeholder={showR ? "Ask me anything..." : "Paste your URL here..."} style={{ flex: 1, height: 42, borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 12px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: C.dark, outline: "none", background: C.surface }} onFocus={e => { e.target.style.borderColor = C.hoverBorder; e.target.style.boxShadow = C.hoverShadow; }} onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                  <button onClick={send} style={{ width: 42, height: 42, borderRadius: 10, border: `1px solid ${C.borderMid}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></button>
                </div>
              </div>
            </div>
            {/* Panel */}
            <div style={{ display: mTab === "report" ? "block" : "none", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>{panelContent}</div>
          </div>}

          {/* ═══ BOTTOM ACTIONS ═══ */}
          {showR && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: isMobile ? "8px 12px 16px" : "8px 24px 16px", maxWidth: isMobile ? "100%" : 1224, margin: "0 auto", width: "100%", alignItems: "center" }}>
            <button onClick={() => { setSR(false); setMsgs([]); setLS(-1); setAuditData(null); sPLoad(null); sMTab("chat"); start("core"); }} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = "#5a22d9"} onMouseLeave={e => e.currentTarget.style.background = C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>New Audit</button>
            <button id="export-pdf-btn" onClick={() => generatePDF(auditData || A)} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", gap: 6 }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Export PDF</button>
            {!isMobile && <button onClick={home} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}>Try Other Tools</button>}
          </div>}
        </div>
      )}
      <div style={{ padding: "6px 16px 4px", background: "transparent", textAlign: "center", flexShrink: 0 }}><span style={{ fontSize: 10, color: C.muted }}>Powered by IvaBot · AI SEO Assistant</span></div>
      </div>
    </div>
  );
}

/* ═══ MOUNT ═══ */
const root = document.getElementById("ivabot-root");
if (root) {
  if (ReactDOM.createRoot) {
    ReactDOM.createRoot(root).render(React.createElement(IvaBotV6));
  } else {
    ReactDOM.render(React.createElement(IvaBotV6), root);
  }
}
