const { useState, useRef, useEffect } = React;

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
const Tip = ({ text, children }) => { const [s, setS] = useState(false); const ref = useRef(null); const [pos, setPos] = useState({ above: true, alignRight: false }); return (<span ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }} onMouseEnter={() => { if (ref.current) { const rect = ref.current.getBoundingClientRect(); setPos({ above: rect.top > 160, alignRight: rect.left > window.innerWidth / 2 }); } setS(true); }} onMouseLeave={() => setS(false)}>{children}{s && <span style={{ position: "absolute", ...(pos.above ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }), ...(pos.alignRight ? { right: 0 } : { left: 0 }), background: C.surface, color: C.dark, padding: "10px 14px", borderRadius: 10, fontSize: 11, lineHeight: 1.5, width: 260, maxWidth: "85vw", zIndex: 999, fontWeight: 400, boxShadow: "0 4px 24px rgba(0,0,0,0.14)", border: `1px solid ${C.border}`, pointerEvents: "none", whiteSpace: "normal", wordBreak: "break-word", textAlign: "left" }}>{text}</span>}</span>); };
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
  const renderLine = (line, i) => {
    const hMatch = line.match(/^(H[1-3]):\s*(.*)/);
    if (hMatch) {
      const lv = hMatch[1], text = hMatch[2];
      const isBroken = text.includes("⚠");
      return (<div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: isBroken ? C.accent : C.dark, padding: "2px 0" }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: isBroken ? C.accent : C.muted, background: isBroken ? "rgba(110,43,255,0.08)" : C.bg, padding: "2px 5px", borderRadius: 3, minWidth: 22, textAlign: "center", flexShrink: 0 }}>{lv}</span>
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
const Bub = ({ from, children, err }) => { const b = from === "bot"; const formatted = typeof children === "string" ? children.split("\n").map((line, i) => <span key={i}>{i > 0 && <br/>}{line}</span>) : children; return (<div style={{ display: "flex", flexDirection: "column", alignItems: b ? "flex-start" : "flex-end", maxWidth: "88%", alignSelf: b ? "flex-start" : "flex-end" }}><div style={{ padding: "10px 14px", borderRadius: b ? "4px 12px 12px 12px" : "12px 4px 12px 12px", background: err ? "rgba(239,68,68,0.06)" : b ? C.surface : C.accent, color: err ? C.red : b ? C.dark : "#fff", border: b ? `1px solid ${err ? "rgba(239,68,68,0.15)" : C.border}` : "none", fontSize: 13, lineHeight: 1.5 }}>{formatted}</div></div>); };
function valUrl(raw) { let s = raw.trim(); if (!s) return { ok: false, e: "Paste a URL to start." }; const m = s.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i); if (m) s = m[0]; else { const d = s.match(/[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*/); if (d) s = "https://" + d[0]; else return { ok: false, e: "Need a URL like https://example.com" }; } s = s.replace(/\s+/g, ""); if (!s.startsWith("http")) s = "https://" + s; try { const u = new URL(s); if (!u.hostname.includes(".")) return { ok: false, e: "Not valid." }; return { ok: true, url: u.href }; } catch { return { ok: false, e: "Not valid." }; } }
const CompBadge = ({ level }) => { const map = { Low: { color: "#9B7AE6", bg: "rgba(155,122,230,0.08)" }, Medium: { color: "#D4A0E8", bg: "rgba(212,160,232,0.08)" }, High: { color: C.accent, bg: "rgba(110,43,255,0.08)" } }; const s = map[level] || map.Medium; return <span style={{ fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, padding: "3px 10px", borderRadius: 20 }}>{level}</span>; };

/* ═══ CONFIG ═══ */
const USE_MOCK = false; // true for preview in Claude, false for ivabot.xyz
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

  // Title
  const mt = html.match(/<title[^>]*>(.*?)<\/title>/i);
  r.title = mt ? mt[1].trim() : "";
  r.title_missing = !r.title;
  r.title_length = r.title.length;
  r.title_too_short = r.title.length > 0 && r.title.length < 30;
  r.title_slightly_long = r.title.length >= 66 && r.title.length <= 90;
  r.title_too_long = r.title.length > 90;
  const tw = r.title.toLowerCase().match(/\b[\w''-]+\b/g) || [];
  r.title_has_duplicates = [...new Set(tw.filter((w,i,a) => a.indexOf(w)!==i && w.length>2))].length > 0;
  // Check for repeated brand pattern like "Brand | Brand" or "Brand - Brand"
  const titleParts = r.title.split(/\s*[|–—-]\s*/).map(p => p.trim().toLowerCase()).filter(Boolean);
  r.title_has_repeated_brand = titleParts.length >= 2 && new Set(titleParts).size < titleParts.length;

  // Description — check both attr orders
  const md = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
    || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
  r.desc = md ? md[1].trim() : "";
  r.desc_missing = !r.desc;
  r.desc_too_short = r.desc.length > 0 && r.desc.length < 50;
  r.desc_too_long = r.desc.length > 200;

  // Headings
  const isTemplate = (t) => /^\{.*\}$/.test(t) || /^\{\{.*\}\}$/.test(t) || /^\[.*\]$/.test(t);
  const exH = (h, lv) => [...h.matchAll(new RegExp(`<h${lv}[^>]*>([\\s\\S]*?)<\\/h${lv}>`, 'gi'))].map(m => m[1].replace(/<[^>]+>/g,'').trim()).filter(t => t && t.length > 1);
  r.h1_raw = exH(html,1); r.h2 = exH(html,2); r.h3 = exH(html,3);
  // Separate real H1s from broken template H1s
  r.h1 = r.h1_raw.filter(t => !isTemplate(t));
  r.h1_broken = r.h1_raw.filter(t => isTemplate(t));
  r.h1_missing = r.h1.length === 0;
  r.h1_has_broken_template = r.h1_broken.length > 0;
  r.h2_missing = r.h2.length===0; r.h3_missing = r.h3.length===0;
  const findDups = arr => { const m = new Map(); arr.forEach(t => { const k = t.trim().toLowerCase(); if(k) m.set(k,(m.get(k)||0)+1); }); return [...m.entries()].filter(([,c])=>c>1).length>0; };
  r.h1_has_dups = findDups(r.h1); r.h2_has_dups = findDups(r.h2); r.h3_has_dups = findDups(r.h3);

  // Visible text
  const vis = html.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
  r.char_count = vis.length;

  // Mobile
  r.has_mobile = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html) && /width\s*=\s*device-width/i.test(html);

  // Social
  const socials = [["Facebook",/facebook\.com/i],["Instagram",/instagram\.com/i],["LinkedIn",/linkedin\.com/i],["X (Twitter)",/(?:twitter\.com|x\.com)/i],["YouTube",/youtube\.com|youtu\.be/i],["TikTok",/tiktok\.com/i],["Pinterest",/pinterest\.com/i]];
  r.social = [];
  const allHrefs = [...rawHtml.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);
  socials.forEach(([name, pat]) => {
    const found = allHrefs.find(h => pat.test(h) && !/share|sharer|intent|dialog/i.test(h));
    if (found) r.social.push({ name, url: found.startsWith("http") ? found : "https://" + found });
  });

  // Links
  let int=0, ext=0;
  [...html.matchAll(/<a\s[^>]*href=["']([^"']+)["']/gi)].forEach(m => {
    const h = m[1]; try {
      if(/^https?:\/\//.test(h)) { new URL(h).hostname.replace(/^www\./,"")===hostname ? int++ : ext++; }
      else if(/^\/|^#/.test(h)) int++; else ext++;
    } catch(e){ ext++; }
  });
  r.int_links = int; r.ext_links = ext;

  // Images & Videos
  const imgs = [...html.matchAll(/<img\s[^>]*>/gi)].filter(m => !/(logo|icon|sprite|favicon|badge|social|nav|menu)/i.test(m[0]));
  r.img_count = imgs.length;
  r.all_alt = imgs.length===0 || imgs.every(m => /alt=["'][^"']+["']/i.test(m[0]));
  r.alt_missing = imgs.length>0 && !r.all_alt;
  r.vid_count = (html.match(/<video[^>]*>/gi)||[]).length + (html.match(/<iframe[^>]+(youtube|vimeo|wistia|loom|dailymotion)[^>]*>/gi)||[]).length;

  // CTA
  const CTA = ["buy","add to cart","checkout","contact","sign up","get started","book","subscribe","download","learn more","shop now","order now","request","pricing","try","start","browse","explore","view"];
  r.has_cta = false; r.cta_text = "";
  for (const m of html.matchAll(/<(a|button)([^>]*)>([\s\S]*?)<\/\1>/gi)) {
    let v = (m[3]||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    // Aggressive cleanup: remove anything that looks like code/attributes
    v = v.replace(/["'][^"']*["']\s*[^>]*>/g, "").replace(/data-[a-z0-9-]+(?:="[^"]*")?/gi, "").replace(/[a-z-]+#[a-z0-9-]*/gi, "").replace(/class="[^"]*"/gi, "").replace(/style="[^"]*"/gi, "").replace(/[{}[\]<>]/g, "").replace(/\s+/g," ").trim();
    if(!v || v.length > 60 || v.length < 2 || /[{}<>\[\]="]/i.test(v) || /\b(logo|brand|navbar|cid)\b/i.test(v)) continue;
    if(CTA.some(k=>v.toLowerCase().includes(k)) || /\b(btn|button|cta)\b/i.test(m[2]||"")) { r.has_cta=true; r.cta_text=v; break; }
  }

  // robots/sitemap URLs
  let base = ""; try { base = new URL(normalized).origin; } catch(e){}
  r.robots_url = base+"/robots.txt"; r.sitemap_url = base+"/sitemap.xml";

  // Score
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

  // Summary for GPT
  r.summary = `URL: ${r.url}\nTitle: ${r.title}\nDescription: ${r.desc}\nH1: ${r.h1.join(", ")||"missing"}\nH2 count: ${r.h2.length}\nH3 count: ${r.h3.length}\nInternal links: ${int}\nExternal links: ${ext}\nImages: ${r.img_count}\nVideos: ${r.vid_count}\nHas CTA: ${r.has_cta}\nMobile: ${r.has_mobile}\nSocial: ${r.social.map(s=>s.name).join(", ")||"none"}\nScore: ${r.score}/100`;
  return r;
}

/* Transform parsed + GPT + DataForSEO data into report format */
function buildReportData(parsed, gpt, dfs) {
  /* DataForSEO data comes pre-cleaned from Edge Function:
     { ranked_keywords: [{keyword, position, volume, difficulty}], serp_competitors: [{name, tactics, url, rank}], total_ranked } */
  const rankedKeywords = dfs?.ranked_keywords || [];
  const serpCompetitors = dfs?.serp_competitors || [];
  const totalRanked = dfs?.total_ranked || 0;

  /* Enrich GPT keywords with DataForSEO volume/difficulty/position data */
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
    titleEval: parsed.title_status !== "good" ? { currentLabel: "Current Title", current: parsed.title || "Missing", why: parsed.title_missing ? "No meta title found — Google can't generate a proper search snippet." : parsed.title_has_repeated_brand ? `Your title repeats the brand name ("${parsed.title}"). This wastes valuable characters and looks unprofessional in search results. Use the space to describe what the page offers.` : parsed.title_too_short ? "Too short — users and Google need more context to understand what this page offers." : "Title is too long — Google will truncate it in search results.", sugLabel: "Suggested Titles", suggestions: (Array.isArray(gpt?.suggested_titles) && gpt.suggested_titles.length > 0) ? gpt.suggested_titles : (gpt?.suggested_title ? (Array.isArray(gpt.suggested_title) ? gpt.suggested_title : [gpt.suggested_title]) : (gpt?.keywords?.length > 0 ? gpt.keywords.map(k => k.charAt(0).toUpperCase() + k.slice(1) + " — " + (gpt?.page_context?.owner || parsed.hostname)) : ["Add a descriptive title with your primary keyword"])), showCopy: true, links: [{ label: "Google Search Console", url: "https://search.google.com/search-console" }] } : null,
    descStatus: parsed.desc_status === "good" ? "good" : "bad",
    descEval: parsed.desc_status !== "good" ? { currentLabel: "Current Description", current: parsed.desc || "Missing", why: parsed.desc_missing ? "No meta description found — search engines can't generate a proper snippet." : parsed.desc_too_short ? "Description is too short — aim for 120-160 characters." : "Description is too long — Google may truncate it.", sugLabel: "Suggested Descriptions", suggestions: (Array.isArray(gpt?.suggested_descriptions) && gpt.suggested_descriptions.length > 0) ? gpt.suggested_descriptions : (gpt?.suggested_description ? (Array.isArray(gpt.suggested_description) ? gpt.suggested_description : [gpt.suggested_description]) : ["Write a 120-160 character description including your primary keyword"]), showCopy: true } : null,
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
        // Enrich SERP competitors with GPT tactics if GPT has matching domains
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
  const NB = C.cardBorder; // neutral border for all
  const g = [], b = [];
  if (d.titleStatus === "good") g.push({ title: "Meta Title", content: (<><SerpSnippet url={d.url} title={d.title} desc={d.desc} hideDesc /><BotNote inline text={`Your title is ${d.title.length} characters — right in the sweet spot (30–60). This is the #1 on-page signal Google uses to understand your content.`} /></>) }); else b.push({ ...d.titleEval, title: d.titleEval?.title || "Meta Title Too Short", serpSnippet: { url: d.url, title: d.title, desc: d.desc, hideDesc: true } });
  if (d.descStatus === "good") g.push({ title: "Meta Description", content: (<><SerpSnippet url={d.url} title={d.title} desc={d.desc} /><BotNote inline text={`Your description is ${d.desc.length} characters — within 120–160, the sweet spot. This is what users see in search results, so a good one means more clicks.`} /></>) }); else b.push({ ...d.descEval, title: d.descEval?.title || "Description Needs Work", serpSnippet: { url: d.url, title: d.title, desc: d.desc } });
  if (d.headingsStatus === "good") { const h1 = d.headings.filter(h => h.level === "H1"), h2 = d.headings.filter(h => h.level === "H2"), h3 = d.headings.filter(h => h.level === "H3");
    const HL = ({ tags, lv }) => (<div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{tags.map((h, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: h.broken ? C.accent : C.dark }}><span style={{ fontSize: 9, fontWeight: 600, color: h.broken ? C.accent : C.muted, background: h.broken ? "rgba(110,43,255,0.08)" : C.bg, padding: "2px 5px", borderRadius: 3, minWidth: 22, textAlign: "center" }}>{lv}</span>{h.text}{h.broken && <span style={{ fontSize: 10, color: C.accent, fontWeight: 600 }}>⚠ unrendered</span>}</div>))}</div>);
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

const TCard = ({ title, desc, tag, credits, onClick }) => (<button onClick={onClick} disabled={credits <= 0} style={{ padding: 22, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface, cursor: credits > 0 ? "pointer" : "not-allowed", textAlign: "left", fontFamily: "'DM Sans',sans-serif", transition: "box-shadow 0.3s, border-color 0.3s", flex: 1, minWidth: 0, opacity: credits > 0 ? 1 : 0.55, overflow: "hidden" }} onMouseEnter={e => { if (credits > 0) { e.currentTarget.style.borderColor = C.hoverBorder; e.currentTarget.style.boxShadow = C.hoverShadow; } }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}><div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><span style={{ fontSize: 10, fontWeight: 600, color: C.accent, background: C.accentLight, padding: "4px 10px", borderRadius: 6 }}>{tag}</span></div><div style={{ fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 6, letterSpacing: "-0.02em" }}>{title}</div><div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>{desc}</div><div style={{ height: 1, background: C.border, marginBottom: 8 }} /><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 500 }}><span style={{ color: C.muted }}>Credits left</span><span style={{ fontWeight: 700, color: credits > 0 ? C.accent : C.red }}>{credits}</span></div></button>);

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

/* SERP Snippet Preview — shows how the page looks in Google */
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
  <div style={{ background: C.surface, borderRadius: 10, padding: "4px 14px", border: `1px solid ${C.cardBorder}`, overflowX: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
    <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
      <th style={{ textAlign: "left", padding: "8px 0", color: C.muted, fontWeight: 500, fontSize: 11.5 }}>Keyword</th>
      <th style={{ textAlign: "center", padding: "8px 4px", color: C.muted, fontWeight: 500, fontSize: 11.5, width: 50, whiteSpace: "nowrap" }}>Pos.</th>
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

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40, CW = W - M * 2;
  let y = 0;
  const purple = [110, 43, 255], dark = [21, 20, 21], muted = [146, 142, 149], white = [255, 255, 255];
  const ensureSpace = (need) => { if (y + need > H - 50) { doc.addPage(); y = 40; } };
  const drawLine = (yPos) => { doc.setDrawColor(230, 226, 235); doc.setLineWidth(0.5); doc.line(M, yPos, W - M, yPos); };
  const sectionTitle = (text) => { ensureSpace(36); doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark); doc.text(text, M, y); y += 20; };
  const bodyText = (text, opts = {}) => { doc.setFontSize(opts.size || 9); doc.setFont("helvetica", opts.bold ? "bold" : "normal"); doc.setTextColor(...(opts.color || muted)); const lines = doc.splitTextToSize(String(text || ""), CW); ensureSpace(lines.length * 13 + 4); doc.text(lines, M, y); y += lines.length * 13; };
  const fmtV = (v) => { if (!v) return "\u2014"; if (v >= 1000) return (v/1000).toFixed(1).replace(/\.0$/,"")+"K"; return String(v); };

  // HEADER
  doc.setFillColor(...purple); doc.rect(0, 0, W, 70, "F");
  doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(...white); doc.text("IvaBot", M, 35);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Core Audit Report", M, 52);
  doc.setFontSize(9); doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - M, 35, { align: "right" });
  const urlShort = (data.url || "").length > 60 ? data.url.slice(0, 57) + "..." : (data.url || "");
  doc.text(urlShort, W - M, 50, { align: "right" });
  y = 90;

  // SCORE
  const scoreLabel = data.score >= 80 ? "Strong" : data.score >= 50 ? "Moderate" : "Weak";
  const scoreColor = data.score >= 80 ? [155, 122, 230] : data.score >= 50 ? [212, 160, 232] : [226, 212, 245];
  const cx = M + 30, cy = y + 24;
  doc.setDrawColor(230, 226, 235); doc.setLineWidth(4); doc.circle(cx, cy, 24);
  doc.setDrawColor(...scoreColor); doc.setLineWidth(4);
  for (let a = -90; a < -90 + (data.score / 100) * 360; a += 2) { const r1 = (a * Math.PI) / 180, r2 = ((Math.min(a + 2, -90 + (data.score / 100) * 360)) * Math.PI) / 180; doc.line(cx + 24 * Math.cos(r1), cy + 24 * Math.sin(r1), cx + 24 * Math.cos(r2), cy + 24 * Math.sin(r2)); }
  doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark); doc.text(String(data.score), cx, cy + 4, { align: "center" });
  doc.setFontSize(7); doc.setTextColor(...scoreColor); doc.text(scoreLabel, cx, cy + 14, { align: "center" });
  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark); doc.text("SEO Score", M + 68, y + 12);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text(urlShort, M + 68, y + 26);
  doc.setFontSize(9); doc.setTextColor(...muted); doc.text(data.score >= 80 ? "Your page has a strong foundation." : "There's room for improvement.", M + 68, y + 40);
  y += 64; drawLine(y); y += 16;

  // PAGE CONTEXT
  sectionTitle("Page Context Summary");
  [["Page URL", data.ctx?.url], ["Page Title", data.ctx?.title], ["Topic", data.ctx?.topic], ["Owner", data.ctx?.owner], ["Goal", data.ctx?.goal], ["Industry", data.ctx?.industry], ["Region", data.ctx?.region], ["Competition", data.ctx?.competition]].forEach(([label, value]) => { if (!value) return; ensureSpace(18); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...muted); doc.text(label.toUpperCase(), M, y); doc.setFontSize(9.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark); doc.text(String(value).slice(0, 75), M + 90, y); y += 15; });
  if (data.ctx?.message) { ensureSpace(20); doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(...muted); doc.text("CORE MESSAGE", M, y); y += 12; bodyText(data.ctx.message, { color: dark, size: 9.5 }); }
  y += 8; drawLine(y); y += 16;

  // KEYWORDS TABLES
  const kwTable = (title, rows) => { if (!rows?.length) return; sectionTitle(title); doc.autoTable({ startY: y, margin: { left: M, right: M }, headStyles: { fillColor: purple, textColor: white, fontSize: 8, fontStyle: "bold", cellPadding: 6 }, bodyStyles: { fontSize: 9, textColor: dark, cellPadding: 5 }, alternateRowStyles: { fillColor: [250, 248, 255] }, columnStyles: { 0: { cellWidth: "auto" }, 1: { halign: "center", cellWidth: 50 }, 2: { halign: "right", cellWidth: 65 }, 3: { halign: "right", cellWidth: 50 } }, head: [["Keyword", "Pos.", "Volume", "KD"]], body: rows.map(r => [r.keyword, r.position != null ? String(r.position) : "100+", fmtV(r.volume), r.difficulty != null ? String(r.difficulty) : "\u2014"]) }); y = doc.lastAutoTable.finalY + 16; drawLine(y); y += 16; };
  kwTable("How Your Page Ranks in Google", data.rankedKeywords);
  kwTable("What Your Page Is Built For", data.keywordMetrics);

  // WHAT'S WORKING / NEEDS IMPROVEMENT
  const pG = [], pB = [];
  if (data.titleStatus === "good") pG.push("Meta Title"); else pB.push({ t: "Meta Title", w: data.titleEval?.why, s: data.titleEval?.suggestions });
  if (data.descStatus === "good") pG.push("Meta Description"); else pB.push({ t: "Description", w: data.descEval?.why, s: data.descEval?.suggestions });
  if (data.headingsStatus === "good") pG.push("Heading Structure"); else pB.push({ t: "Headings", w: data.headingsEval?.why, s: data.headingsEval?.suggestions });
  if (data.linksStatus === "good") pG.push("Links & Social"); else pB.push({ t: "Links", w: data.linksEval?.why, s: data.linksEval?.suggestions });
  if (data.ux?.cta?.found) pG.push("Call to Action"); else pB.push({ t: "No CTA", w: "No call-to-action detected." });
  if (data.ux?.mobile) pG.push("Mobile"); else pB.push({ t: "Not Mobile-Friendly", w: "Missing viewport meta tag." });
  if (!data.ux?.altMissing) pG.push("Image Alt Text"); else pB.push({ t: "Images", w: data.imagesEval?.why, s: data.imagesEval?.suggestions });
  if (!data.ux?.noVideo) pG.push("Video"); else pB.push({ t: "No Video", w: data.videoEval?.why });
  if (data.speedStatus === "good") pG.push("Page Speed"); else pB.push({ t: "Speed", w: data.speedEval?.why, s: data.speedEval?.suggestions });
  if (data.robotsStatus === "good") pG.push("robots.txt"); else pB.push({ t: "robots.txt", w: "Missing." });
  if (data.sitemapStatus === "good") pG.push("Sitemap"); else pB.push({ t: "Sitemap", w: "Not found." });

  sectionTitle("What's Working (" + pG.length + ")");
  pG.forEach(item => { ensureSpace(16); doc.setFontSize(9.5); doc.setTextColor(155, 122, 230); doc.text("\u2713", M + 3, y); doc.setTextColor(...dark); doc.text(item, M + 16, y); y += 15; });
  y += 8; drawLine(y); y += 16;

  if (pB.length > 0) { sectionTitle("Needs Improvement (" + pB.length + ")"); pB.forEach(item => { ensureSpace(50); doc.setFillColor(...purple); doc.circle(M + 3, y - 2.5, 2.5, "F"); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark); doc.text(item.t, M + 14, y); y += 14; if (item.w) { bodyText(item.w); y += 2; } if (item.s?.length > 0) { item.s.forEach(s => { ensureSpace(18); doc.setFillColor(250, 248, 255); doc.roundedRect(M + 8, y - 10, CW - 16, 16, 3, 3, "F"); doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark); doc.text(String(s).slice(0, 90), M + 14, y); y += 18; }); } y += 6; }); drawLine(y); y += 16; }

  // COMPETITORS
  if (data.competitors?.length > 0) { sectionTitle("Top Competitors in Google"); doc.autoTable({ startY: y, margin: { left: M, right: M }, headStyles: { fillColor: purple, textColor: white, fontSize: 8, fontStyle: "bold", cellPadding: 6 }, bodyStyles: { fontSize: 9, textColor: dark, cellPadding: 5 }, alternateRowStyles: { fillColor: [250, 248, 255] }, head: [["#", "Domain", "Strategy"]], body: data.competitors.map((c, i) => [String(i + 1), c.name || "", (c.title || c.tactics || "").slice(0, 80)]) }); y = doc.lastAutoTable.finalY + 16; drawLine(y); y += 16; }

  // BACKLINKS
  sectionTitle("PR & Backlink Opportunities");
  if (data.backlinksCount != null) { ensureSpace(30); [["Backlinks", data.backlinksCount], ["Referring Domains", data.referringDomains], ["Ranked Keywords", data.totalRanked]].forEach(([label, val], i) => { const sx = M + (CW / 3) * i; doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark); doc.text(val != null ? val.toLocaleString() : "\u2014", sx, y); doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...muted); doc.text(String(label), sx, y + 12); }); y += 30; }
  if (data.backlinks?.length > 0) { doc.autoTable({ startY: y, margin: { left: M, right: M }, headStyles: { fillColor: purple, textColor: white, fontSize: 8, fontStyle: "bold", cellPadding: 6 }, bodyStyles: { fontSize: 9, textColor: dark, cellPadding: 5 }, alternateRowStyles: { fillColor: [250, 248, 255] }, head: [["#", "Source", "Description"]], body: data.backlinks.map((b, i) => [String(i + 1), b.name, b.desc || ""]) }); y = doc.lastAutoTable.finalY + 16; drawLine(y); y += 16; }

  // FINAL RECOMMENDATIONS
  sectionTitle("Final Recommendations");
  [...pB.map(item => ({ t: item.t, d: item.w || "" })), { t: "Build quality backlinks", d: "Reach out to industry blogs, directories, and publications." }, { t: "Create useful content", d: "Content that solves real problems is the foundation of lasting SEO success." }, { t: "Monitor with Google tools", d: "Use Search Console and PageSpeed Insights." }, { t: "Re-audit after changes", d: "Run another Core Audit to measure progress." }].forEach(rec => { ensureSpace(35); doc.setFillColor(...purple); doc.circle(M + 3, y - 2.5, 2.5, "F"); doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(...dark); doc.text(rec.t, M + 14, y); y += 13; if (rec.d) { doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...muted); const dL = doc.splitTextToSize(rec.d, CW - 20); ensureSpace(dL.length * 11); doc.text(dL, M + 14, y); y += dL.length * 11; } y += 4; });

  // FOOTER
  const tp = doc.getNumberOfPages();
  for (let i = 1; i <= tp; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...muted); doc.text("ivabot.xyz  \u00B7  AI SEO Assistant", W / 2, H - 20, { align: "center" }); doc.text("Page " + i + " of " + tp, W - M, H - 20, { align: "right" }); }

  const domain = (() => { try { return new URL(data.url).hostname.replace(/^www\./, ""); } catch(e) { return "audit"; } })();
  doc.save("IvaBot-Audit-" + domain + "-" + new Date().toISOString().slice(0,10) + ".pdf");
  } catch(err) { console.error("[IvaBot] PDF error:", err); alert("PDF export failed: " + err.message); }
}

/* ═══ REPORT ═══ */
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

/* ═══ MAIN ═══ */
function IvaBotV6() {
  const [view, setView] = useState("select"), [tool, setTool] = useState(null), [msgs, setMsgs] = useState([]), [input, setInput] = useState(""), [loadStep, setLS] = useState(-1), [showR, setSR] = useState(false), [inputV, setIV] = useState(false), [showBuy, setSB] = useState(false), [expanded, setExpanded] = useState(false), [typing, setTyping] = useState(false), [credits, setCredits] = useState({ core: 0, builder: 0, coverage: 0 }), [memberId, setMemberId] = useState(null), [memberName, setMemberName] = useState(null), [loading, setLoading] = useState(true);
  useEffect(() => { (async () => { const info = await getMemberInfo(); setMemberId(info.id); setMemberName(info.name); const cr = await fetchCredits(info.id); setCredits(cr); setLoading(false); })(); }, []);
  const chatRef = useRef(null);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, loadStep]);
  /* Reveal on scroll */
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }); }, { threshold: 0.1 });
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  });
  const [auditData, setAuditData] = useState(null);
  const addMsg = (f, c, e) => setMsgs(p => [...p, { from: f, content: c, err: e, id: Date.now() + Math.random() }]);
  const start = (t) => { setTool(t); setView("chat"); setSR(false); setLS(-1); setIV(false); setExpanded(false); setMsgs([]); setAuditData(null); setTyping(true);
    setTimeout(() => { setTyping(false); setMsgs([{ from: "bot", content: memberName ? `Hey, ${memberName}! Welcome to Core Audit 👋` : "Hey! Welcome to Core Audit 👋", id: Date.now() }]); setTyping(true); }, 2000);
    setTimeout(() => { setTyping(false); setMsgs(p => [...p, { from: "bot", content: "I'll check your page for technical SEO, content structure, speed, mobile readiness, and more. You'll get clear, actionable recommendations that are easy to apply — even if you're new to SEO. Just paste your URL below and I'll get started.", id: Date.now() + 1 }]); setIV(true); }, 4500);
  };
  const home = () => { setView("select"); setTool(null); setMsgs([]); setSR(false); setLS(-1); setIV(false); setExpanded(false); setAuditData(null); };

  const runAudit = async (url) => {
    setSR(false); setAuditData(null); setExpanded(false);
    setLS(0);
    const setStep = (s) => setLS(prev => Math.max(prev, s));
    let step = 0;

    try {
      if (USE_MOCK) {
        await new Promise(res => setTimeout(res, STEPS.length * 800));
        var reportData = A;
      } else {
        // STEP 1: Fetch HTML
        setStep(0);
        const htmlRes = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        if (!htmlRes.ok) throw new Error("Could not fetch page");
        const rawHtml = await htmlRes.text();

        // STEP 2: Parse HTML locally
        setStep(1);
        await new Promise(r => setTimeout(r, 300));
        setStep(2);
        const parsed = parseSEO(rawHtml, url);

        // STEP 3: Send to Make for GPT + call DataForSEO in parallel
        setStep(3);
        await new Promise(r => setTimeout(r, 300));
        setStep(4);
        let gpt = null;
        let dfsSeo = null;
        const domain = new URL(url).hostname.replace(/^www\./, "");
        const cleanKw = (v) => v && v.length > 2 && !/^\{.*\}$/.test(v) && !/^[^a-zA-Z]*$/.test(v) ? v : null;
        const primaryKw = cleanKw(parsed.h1?.[0]) || cleanKw(parsed.title) || "";

        // Run Make (GPT) and DataForSEO in parallel
        const [makeResult, dfsResult] = await Promise.allSettled([
          // --- Make: GPT personalization ---
          (async () => {
            const makeRes = await fetch(WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ member_id: memberId || "UNKNOWN", parsed_data: parsed.summary, domain, primary_keyword: primaryKw })
            });
            if (!makeRes.ok) throw new Error("Make HTTP " + makeRes.status);
            const raw = await makeRes.text();
            console.log("[IvaBot] Make raw length:", raw.length, "first 300:", raw.substring(0, 300));
            // Make now returns GPT result directly (no wrapper)
            let parsed_gpt = null;
            try { parsed_gpt = JSON.parse(raw); } catch(e) {
              console.log("[IvaBot] GPT JSON parse failed:", e.message);
              // Try extracting JSON from wrapper
              const m = raw.match(/\{[\s\S]*\}/);
              if (m) try { parsed_gpt = JSON.parse(m[0]); } catch(e2) {}
            }
            // Handle if Make still wraps in gpt_raw (backward compat)
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
          // --- DataForSEO: via Supabase Edge Function proxy ---
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

        // Process results
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

        // STEP 4: Build report from parsed data + GPT enrichment
        setStep(5);
        var reportData = buildReportData(parsed, gpt, dfsSeo);

        // Check robots.txt & sitemap
        try { const rb = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: parsed.robots_url }) }); if (rb.ok) { const rbt = await rb.text(); reportData.robotsStatus = (rbt.toLowerCase().includes("user-agent") || rbt.toLowerCase().includes("disallow") || rbt.toLowerCase().includes("sitemap")) ? "good" : "bad"; } else { reportData.robotsStatus = "bad"; } } catch(e){ reportData.robotsStatus = "bad"; }
        try { const sm = await fetch(CORS_PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: parsed.sitemap_url }) }); if (sm.ok) { const smt = await sm.text(); reportData.sitemapStatus = (smt.includes("<urlset") || smt.includes("<sitemapindex") || smt.includes("<url>")) ? "good" : "bad"; } else { reportData.sitemapStatus = "bad"; } } catch(e){ reportData.sitemapStatus = "bad"; }
      }

      // Done — show report
      
      setLS(-1);
      setSR(true);
      setAuditData(reportData);
      if (!USE_MOCK) setCredits(prev => ({ ...prev, core: Math.max(0, prev.core - 1) }));

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
          <div style={{ color: C.muted }}>Check the report on the right for details. Come back and re-audit once you've made changes — I'll track your progress.</div>
        </div>);
        setTimeout(() => { setTyping(true); }, 5000);
        setTimeout(() => {
          setTyping(false);
          addMsg("bot", <div>If you have any questions, I'm ready to explain all the SEO details and help fix some of the issues on your page. Just ask!</div>);
        }, 7000);
      }, 4500);

    } catch (err) {
      
      setLS(-1);
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
        "To add an image to your search snippet, you need structured data (schema markup). Add a `WebPage` or `Article` schema with an `image` property to your page. Most CMS platforms have an SEO plugin for this — in WordPress it's Yoast or RankMath, in Webflow it's in Page Settings → Open Graph Image. Google doesn't guarantee it'll show, but having it increases your chances.",
        "Your title is only 5 characters — Google needs more context to understand your page. Aim for 30-60 characters with your main keyword. Go to your CMS → Page Settings → SEO Title and update it there.",
        "Internal links help Google discover your other pages and pass authority between them. Add 3-5 links to your most important pages within the body content. In your CMS, just highlight text and add a link to another page on your site.",
        "Meta description doesn't directly affect rankings, but it affects click-through rate. A good one is 120-160 characters, includes your main keyword, and has a clear value proposition. Update it in your CMS → Page Settings → Meta Description.",
        "H2 headings break your content into sections. Google uses them to understand your page structure. Add 3-5 H2s that describe each main section of your content. Each H2 should ideally include a related keyword naturally.",
        "Page speed depends on image size, JS/CSS files, and server response time. Run your URL through PageSpeed Insights (pagespeed.web.dev) to see specific issues. The quickest wins are usually compressing images to WebP and removing unused scripts.",
        "Alt text describes images for Google and screen readers. Go through each image in your CMS and add a short description of what's shown. Include keywords where natural, but don't stuff — describe the image honestly.",
        "Backlinks take time. Start with directories in your industry, write guest posts on relevant blogs, and share your work on social media. Even 2-3 quality links from trusted sites can move the needle."
      ];
      setTimeout(() => {
        setTyping(false);
        addMsg("bot", mockAnswers[chatCount % mockAnswers.length]);
      }, 2000);
    } else {
      try {
        const d = auditData || A;
        // Build chat history from last 10 messages for context
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
          // If JSON parse fails, raw text is the answer
          answer = raw;
        }
        // Clean up - remove wrapping quotes if present
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
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    // pendingUrl handled by buttons — if user types, just clear and continue
    if (pendingUrl) setPendingUrl(null);

    if (showR) {
      // After audit — check if it's a URL for new audit
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
      // Regular chat
      addMsg("user", text);
      sendChat(text);
    } else {
      // First audit — run directly, no confirmation needed
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

  return (
    <div className="iva-root" style={{ fontFamily: "'DM Sans',sans-serif", background: "#f8f7f9", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", padding: "8px 12px" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "linear-gradient(180deg, #ffffff 0%, #F8F5FF 15%, #F0EAFF 40%, #E4D8FC 70%, #D9CCFA 100%)", borderRadius: 12 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}@keyframes foldOpen{from{opacity:0;max-height:0}to{opacity:1;max-height:2000px}}@keyframes dotPulse{0%,80%,100%{opacity:0.3}40%{opacity:1}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(21,20,21,0.1);border-radius:3px}.reveal{opacity:0;transform:translateY(32px);transition:opacity 0.7s cubic-bezier(0.16,1,0.3,1),transform 0.7s cubic-bezier(0.16,1,0.3,1)}.reveal.visible{opacity:1;transform:translateY(0)}.reveal-delay-1{transition-delay:0.08s}.reveal-delay-2{transition-delay:0.16s}.reveal-delay-3{transition-delay:0.24s}.typing-dots span{display:inline-block;width:6px;height:6px;border-radius:50%;background:#928E95;margin:0 2px;animation:dotPulse 1.2s infinite}.typing-dots span:nth-child(2){animation-delay:0.2s}.typing-dots span:nth-child(3){animation-delay:0.4s}.fold-content{animation:foldOpen 0.4s cubic-bezier(0.4,0,0.2,1) forwards;overflow:hidden}.iva-tools{display:flex;gap:14px;width:100%}.iva-chat-wrap{display:flex;overflow:hidden;padding:0 24px 8px;max-width:1224px;margin:0 auto;width:100%}.iva-actions{display:flex;gap:8px;flex-wrap:wrap;padding:8px 24px 0;max-width:1224px;margin:0 auto;width:100%}.iva-buy-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.iva-ctx-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}.iva-buy-footer{display:flex;gap:16px;justify-content:center;margin-top:16px}.iva-seo-title{font-size:64px}.iva-nav{height:84px;padding:24px 0 0}@media(max-width:1024px){.iva-root{height:auto!important;min-height:100vh;overflow:auto!important}.iva-chat-wrap{flex-direction:column;padding:0 12px 8px;gap:12px}.iva-chat-panel{width:100%!important;max-width:none!important;min-width:0!important;margin-right:0!important;max-height:none;height:auto}.iva-report-panel{min-height:auto}.iva-actions{padding:8px 12px 0;justify-content:center}}@media(max-width:768px){.iva-root{height:auto!important;min-height:100vh;overflow:auto!important}.iva-tools{flex-direction:column}.iva-buy-grid{grid-template-columns:1fr}.iva-ctx-grid{grid-template-columns:1fr}.iva-buy-footer{flex-direction:column;align-items:center;gap:8px}.iva-seo-title{font-size:32px}.iva-nav{padding:0 12px}}@media(max-width:520px){.iva-seo-title{font-size:26px}.iva-nav{height:48px;padding:0 10px}}`}</style>
      {showBuy && <BuyM onClose={() => setSB(false)} />}
      <nav className="iva-nav" style={{ display: "flex", justifyContent: "center", background: "transparent", flexShrink: 0, zIndex: 100, height: 84, paddingTop: 24 }}>
        <div style={{ width: "100%", maxWidth: 1224, padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://ivabot.xyz" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textDecoration: "none" }}><svg width="33" height="29" viewBox="0 0 66 58" fill="none"><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill={C.accent} /><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill={C.accent} /></svg><span style={{ fontSize: 17, fontWeight: 700, color: C.dark, letterSpacing: "-0.02em" }}>IvaBot</span></a>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><a href="https://ivabot.xyz/dashboard" style={{ fontSize: 14, fontWeight: 500, color: C.dark, textDecoration: "none", letterSpacing: "-0.14px", transition: "opacity 0.2s", padding: "8px 16px" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.6"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Dashboard</a><button onClick={() => setSB(true)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.dark, background: "rgba(255,255,255,0.43)", border: "1px solid rgba(21,20,21,0.16)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif", letterSpacing: "-0.3px", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#fff"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.43)"}>Buy Credits</button><a href="https://ivabot.xyz/dashboard" data-ms-action="logout" style={{ fontSize: 14, fontWeight: 500, color: C.muted, textDecoration: "none", letterSpacing: "-0.14px", transition: "opacity 0.2s", padding: "8px 16px" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.6"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>Log out</a></div>
        </div>
      </nav>

      {view === "select" ? (
        <div style={{ flex: 1, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 36, maxWidth: 780, width: "100%" }}>
            <div style={{ textAlign: "center" }}><div className="iva-seo-title" style={{ fontWeight: 400, color: C.dark, letterSpacing: "-0.2px", lineHeight: 1, marginBottom: 16, background: "linear-gradient(116deg, rgba(21,20,21,0.25) 8%, #151415 35%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>SEO Tools</div><p style={{ fontSize: 20, color: "rgba(21,20,21,0.5)", maxWidth: 460, margin: "0 auto", lineHeight: 1.1, letterSpacing: "-0.2px", fontWeight: 400 }}>Analyze pages, build content, and find gaps — powered by AI with real Google data.</p></div>
            <div className="iva-tools"><TCard title="Core Audit" desc="Technical SEO, content structure, links, speed, and usability. Plus AI chat to explain results and help fix issues." tag="~2 min" credits={credits.core} onClick={() => start("core")} /><TCard title="Content Builder" desc="Keywords, SEO structure, and full page content. AI assistant helps refine your copy." tag="~5 min" credits={credits.builder} onClick={() => start("builder")} /><TCard title="Coverage Audit" desc="Keyword gaps, topical depth, and trust signals. Chat with AI to explore improvements." tag="~3 min" credits={credits.coverage} onClick={() => start("coverage")} /></div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 24px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, maxWidth: 1224, margin: "0 auto", width: "100%" }}><button onClick={home} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.muted, display: "flex" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg></button><span style={{ fontSize: 13, fontWeight: 500, color: C.muted }}>{tool === "core" ? "Core Audit" : tool === "builder" ? "Content Builder" : "Coverage Audit"}</span>{showR && <span style={{ fontSize: 10, fontWeight: 600, color: "#9B7AE6", background: "rgba(155,122,230,0.08)", padding: "3px 8px", borderRadius: 10, marginLeft: 4 }}>Done</span>}</div>
          <div className="iva-chat-wrap" style={{ flex: 1 }}>
            <div className="iva-chat-panel" style={{ width: showR ? "35%" : "100%", maxWidth: showR ? 420 : 640, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", background: C.surface, borderRadius: 12, flexShrink: 0, minWidth: showR ? 280 : 0, marginRight: showR ? 12 : 0, border: `1px solid ${C.border}`, overflow: "hidden", ...(showR ? {} : { margin: "0 auto" }) }}>
              <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "24px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                {msgs.map(m => <Bub key={m.id} from={m.from} err={m.err}>{m.content}</Bub>)}
                {loadStep >= 0 && <div style={{ animation: "fadeIn 0.3s ease" }}><LBar step={loadStep} total={STEPS.length} text={STEPS[loadStep]} /></div>}
                {typing && <div style={{ alignSelf: "flex-start", padding: "10px 14px", borderRadius: "4px 12px 12px 12px", background: C.surface, border: `1px solid ${C.border}` }}><div className="typing-dots"><span /><span /><span /></div></div>}
              </div>
              {inputV && (<div style={{ padding: "14px 14px 14px", background: C.surface, flexShrink: 0 }}><div style={{ display: "flex", gap: 8 }}><input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={showR ? "Ask me anything about your SEO..." : "Paste your URL here..."} autoFocus={!showR} style={{ flex: 1, height: 44, borderRadius: 10, border: `1px solid ${C.border}`, padding: "0 14px", fontSize: 13, fontFamily: "'DM Sans',sans-serif", color: C.dark, outline: "none", background: C.surface, transition: "box-shadow 0.3s, border-color 0.3s" }} onMouseEnter={e => { e.target.style.borderColor = C.hoverBorder; e.target.style.boxShadow = C.hoverShadow; }} onMouseLeave={e => { if (document.activeElement !== e.target) { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; } }} onFocus={e => { e.target.style.borderColor = C.hoverBorder; e.target.style.boxShadow = C.hoverShadow; }} onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} /><button onClick={send} style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${C.borderMid}`, background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></button></div></div>)}
            </div>
            {showR && (<div className="iva-report-panel" style={{ flex: 1, display: "flex", flexDirection: "column", background: C.surface, animation: "slideIn 0.4s ease", borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}><div style={{ flex: 1, overflowY: "auto" }}><ReportV6 data={auditData || A} onNewAudit={() => { setSR(false); setMsgs([]); setIV(true); setLS(-1); setAuditData(null); }} onHome={home} /></div></div>)}
          </div>
          {/* ACTION BUTTONS — full width, proper spacing */}
          {showR && (
            <div className="iva-actions" style={{ flexShrink: 0, alignItems: "center", padding: "14px 24px 0" }}>
              <button onClick={() => { setSR(false); setMsgs([]); setIV(true); setLS(-1); setAuditData(null); }} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.accent, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#5a22d9"} onMouseLeave={e => e.currentTarget.style.background = C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>New Audit</button>
              <button onClick={() => generatePDF(auditData || A)} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>Export PDF</button>
              <button onClick={home} style={{ height: 40, padding: "0 20px", borderRadius: 10, background: C.surface, border: `1px solid ${C.borderMid}`, color: C.dark, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.accentLight} onMouseLeave={e => e.currentTarget.style.background = C.surface}>Try Other Tools</button>
            </div>
          )}
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
