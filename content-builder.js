/* IvaBot Content Builder v66 — keyword density fix + brand examples + v38 prompts */
(function() {
const{useState,useRef,useEffect,useCallback}=React;
console.log("[IvaBot] content-builder.js v66 loaded");

/* ═══ CONFIG — single Edge Function endpoint ═══ */
const CB_GPT_URL = "https://empuzslozakbicmenxfo.supabase.co/functions/v1/cb-gpt";
const DFS_PROXY = "https://empuzslozakbicmenxfo.supabase.co/functions/v1/dataforseo-proxy";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";

/* ═══ COLORS ═══ */
const C={bg:"#FBF5FF",surface:"#ffffff",accent:"#6E2BFF",accentLight:"#f3f0fd",dark:"#151415",muted:"#928E95",border:"rgba(21,20,21,0.08)",borderMid:"rgba(21,20,21,0.12)",card:"#F0EAFF",cardBorder:"rgba(110,43,255,0.08)",hoverBorder:"rgba(110,43,255,0.2)",hoverShadow:"0 0 0 1px rgba(110,43,255,0.2),0 8px 32px rgba(110,43,255,0.1)"};
const FC={HV:{bg:"rgba(110,43,255,0.12)",color:"#6E2BFF"},MV:{bg:"rgba(155,122,230,0.1)",color:"#9B7AE6"},LV:{bg:"rgba(184,156,240,0.12)",color:"#B89CF0"}};
const HINTS={page_type:["Product page","Service page","Blog post","About page","Landing page"],goal:["Sell a product","Explain a service","Build trust","Get leads","Inform visitors"],audience:["Women 25-40","Young travelers","Small business owners","Parents with kids","Tech professionals"]};

/* ═══ API HELPERS — v45: direct Edge Function, no Make ═══ */
async function callGPT(step, data) {
  console.log("[CB] callGPT step:", step);
  try {
    const payload = { step, ...(typeof data === "string" ? { data } : data) };
    const res = await fetch(CB_GPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[CB] GPT HTTP", res.status, errText.substring(0, 200));
      throw new Error("GPT HTTP " + res.status);
    }
    const parsed = await res.json();
    console.log("[CB] GPT response (" + step + "):", JSON.stringify(parsed).substring(0, 200));
    return parsed || { text: "empty response" };
  } catch(e) {
    console.error("[CB] callGPT error:", e);
    return null;
  }
}

async function callDFS(keywords, locationCode = 2840, languageCode = "en") {
  console.log("[CB] callDFS keywords:", keywords);
  try {
    const res = await fetch(DFS_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + SUPABASE_KEY },
      body: JSON.stringify({ mode: "content_builder", keywords, location_code: locationCode, language_code: languageCode })
    });
    if (!res.ok) { console.log("[CB] DFS HTTP", res.status); return null; }
    const data = await res.json();
    console.log("[CB] DFS response keys:", Object.keys(data || {}));
    return data;
  } catch(e) {
    console.error("[CB] callDFS error:", e);
    return null;
  }
}

async function callChat(context, chatHistory, question) {
  console.log("[CB] callChat question:", question.substring(0, 80));
  try {
    const res = await fetch(CB_GPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "chat", context, chat_history: chatHistory, question })
    });
    if (!res.ok) throw new Error("Chat HTTP " + res.status);
    const parsed = await res.json();
    let answer = parsed?.text || parsed?.answer || JSON.stringify(parsed);
    if (typeof answer === "string") {
      if (answer.startsWith('"') && answer.endsWith('"')) answer = answer.slice(1, -1);
      answer = answer.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\*\*/g, '').replace(/###\s?/g, '').replace(/^- /gm, '• ');
      if (answer.startsWith("{")) { answer = "I can help with that. Could you rephrase your question?"; }
    }
    return answer;
  } catch(e) {
    console.error("[CB] callChat error:", e);
    return null;
  }
}

/* Track usage: atomic increment via Supabase RPC */
async function trackBuilderUsage(memberId) {
  if (!memberId) { console.log("[CB] trackUsage: no memberId"); return { success: false }; }
  try {
    const res = await fetch("https://empuzslozakbicmenxfo.supabase.co/rest/v1/rpc/increment_builder_used", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_KEY,
        "apikey": SUPABASE_KEY
      },
      body: JSON.stringify({ p_member_id: memberId })
    });
    if (res.ok) {
      const data = await res.json();
      console.log("[CB] trackUsage:", JSON.stringify(data));
      return data;
    } else {
      console.error("[CB] trackUsage HTTP", res.status);
      return { success: false };
    }
  } catch(e) {
    console.error("[CB] trackUsage error:", e);
    return { success: false };
  }
}

/* Check if user has credits before starting */
async function checkBuilderCredits(memberId) {
  if (!memberId) return { ok: true }; /* allow if no member ID */
  try {
    const res = await fetch(`https://empuzslozakbicmenxfo.supabase.co/rest/v1/usage?member_id=eq.${memberId}&select=builder_used,builder_limit`, {
      headers: { "Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY }
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows.length === 0) return { ok: true }; /* new user */
      const { builder_used, builder_limit } = rows[0];
      if (builder_limit && builder_limit > 0 && builder_used >= builder_limit) {
        return { ok: false, used: builder_used, limit: builder_limit };
      }
      return { ok: true, used: builder_used, limit: builder_limit };
    }
    return { ok: true };
  } catch(e) {
    console.error("[CB] checkCredits error:", e);
    return { ok: true }; /* allow on error */
  }
}

/* Get member ID from any available source */
function getMemberId() {
  /* Try direct globals first */
  if (window.__memberId) return window.__memberId;
  if (window._msData?.id) return window._msData.id;
  /* Try Memberstack DOM data attribute */
  const msEl = document.querySelector('[data-ms-member-id]');
  if (msEl) return msEl.getAttribute('data-ms-member-id');
  /* Try localStorage where Memberstack stores session */
  try {
    const msKeys = Object.keys(localStorage).filter(k => k.startsWith('_ms'));
    for (const k of msKeys) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (v?.id && v.id.startsWith('mem_')) return v.id;
      } catch(e) {}
    }
  } catch(e) {}
  /* Try window.$memberstackDom */
  try {
    const msdom = window.$memberstackDom;
    if (msdom && msdom._currentMember?.id) return msdom._currentMember.id;
  } catch(e) {}
  return null;
}
function isQuestion(text) { return text.trim().endsWith("?"); }

/* Page type config: guided questions + content length limits */
const PAGE_TYPE_CONFIG = {
  "homepage": {
    extraQ: "What does your company do? Tell me a bit about your business.",
    hints: ["We make handmade candles from organic wax","Digital marketing agency for small businesses","Online store for vintage furniture","Dog grooming salon in Brooklyn","Fitness coaching for women over 40"],
    defaultLen: "900-1200 words", maxLen: 5000
  },
  "about page": { 
    extraQ: "What's your brand story? Who's behind it?",
    hints: ["Family bakery in Brooklyn, baking sourdough bread since 1995","I'm a wedding photographer based in London, 6 years of experience","We run a coworking space in Lisbon for digital nomads"],
    defaultLen: "700-1000 words", maxLen: 4000
  },
  "product page": {
    extraQ: "Tell me about the product — what is it, what's special about it?",
    hints: ["Red silk dress, XS to XL, handmade in Italy","Organic face cream, 50ml, for sensitive skin","Wooden phone stand, walnut, fits all phones","Kids rain boots, sizes 5-12, waterproof","Handmade leather wallet, minimalist design"],
    defaultLen: "500-800 words", maxLen: 3000
  },
  "service page": {
    extraQ: "What service do you offer? Where and how?",
    hints: ["House cleaning in London, weekly or one-time","Wedding photography, Berlin area, from €800","Online English lessons for kids, group or private","Roof repair and installation, free estimate","Mobile car detailing, same-day service"],
    defaultLen: "500-800 words", maxLen: 4000
  },
  "blog post": {
    extraQ: "What's the blog post about? What should it cover?",
    hints: ["Budget travel to Japan during cherry blossom","How to start a small bakery from home","Best exercises for back pain, no equipment","Comparing iPhone vs Samsung for photography","Guide to sourdough bread for beginners"],
    defaultLen: "1500-3000 words", maxLen: 11000
  },
  "landing page": {
    extraQ: "What's the offer? What should visitors do?",
    hints: ["Free trial of our project management app","50% off first order, limited time","Download our free SEO checklist PDF","Book a free 30-min consultation call","Sign up for our weekly newsletter"],
    defaultLen: "900-1200 words", maxLen: 4000
  },
  "category page": {
    extraQ: "What products are in this category? How is it organized?",
    hints: ["Women's summer dresses, 50 items, by style","Coffee beans by origin, 20 varieties","Running shoes, men's, sorted by price","Handmade earrings, silver and gold","Organic skincare products by ingredient"],
    defaultLen: "500-800 words", maxLen: 2000
  }
};
function getPageConfig(pt) {
  if (!pt) return null;
  const t = pt.toLowerCase().trim();
  /* aliases */
  let normalized = t
    .replace(/\b(article|post|blog)\b/g,"blog post")
    .replace(/\b(main page|front page|home page|home|main|front|главная|домашняя)\b/g,"homepage")
    .replace(/\b(item|goods|shop item|product card)\b/g,"product page")
    .replace(/\b(services|what we do|our service)\b/g,"service page")
    .replace(/\b(about us|who we are|our story|our team)\b/g,"about page")
    .replace(/\b(landing|lead page|promo|offer page|sales page)\b/g,"landing page")
    .replace(/\b(catalog|collection|listings|category)\b/g,"category page");
  for (const [key, cfg] of Object.entries(PAGE_TYPE_CONFIG)) {
    if (normalized.includes(key) || key.includes(normalized.replace(" page",""))) return cfg;
  }
  return null;
}

/* Location codes for common markets */
const LOCATION_CODES = {
  "us": 2840, "usa": 2840, "united states": 2840,
  "uk": 2826, "united kingdom": 2826, "england": 2826,
  "germany": 2276, "de": 2276, "deutschland": 2276,
  "france": 2250, "fr": 2250,
  "canada": 2124, "ca": 2124,
  "australia": 2036, "au": 2036,
  "netherlands": 2528, "nl": 2528,
  "spain": 2724, "es": 2724,
  "italy": 2380, "it": 2380,
  "ukraine": 2804, "ua": 2804, "україна": 2804, "украина": 2804,
  "poland": 2616, "pl": 2616, "polska": 2616,
  "romania": 2642, "ro": 2642,
  "czech": 2203, "czechia": 2203,
  "portugal": 2620, "pt": 2620,
  "sweden": 2752, "se": 2752,
  "norway": 2578, "no": 2578,
  "denmark": 2208, "dk": 2208,
  "finland": 2246, "fi": 2246,
  "ireland": 2372, "ie": 2372,
  "japan": 2392, "jp": 2392,
  "india": 2356, "in": 2356,
  "brazil": 2076, "br": 2076,
  "mexico": 2484, "mx": 2484,
  "israel": 2376, "il": 2376,
  "global": 2840
};
function parseLocationCode(text) {
  if (!text) return 2840;
  const t = text.toLowerCase().trim();
  for (const [key, code] of Object.entries(LOCATION_CODES)) {
    if (t.includes(key)) return code;
  }
  return 2840;
}

/* Build chat history string from messages array */
function buildChatHistory(msgs) {
  /* Full chat history for GPT context. Truncate individual messages, keep last 40. */
  return msgs.slice(-40).map(m => {
    const who = m.f === "b" ? "IvaBot" : "User";
    let text = "";
    if (typeof m.c === "string") {
      text = m.c;
    } else if (m.c && typeof m.c === "object") {
      /* Try to extract text from React element props */
      try {
        const extract = (el) => {
          if (typeof el === "string") return el;
          if (!el) return "";
          if (el.props) {
            const children = el.props.children;
            if (typeof children === "string") return children;
            if (Array.isArray(children)) return children.map(extract).join(" ");
            if (children && typeof children === "object") return extract(children);
          }
          return "";
        };
        text = extract(m.c).replace(/\s+/g, " ").trim();
      } catch(e) { text = "[UI element]"; }
    }
    if (!text || text.length < 2) return null;
    /* Truncate very long messages */
    if (text.length > 300) text = text.substring(0, 300) + "...";
    return `${who}: ${text}`;
  }).filter(Boolean).join("\n");
}

/* Build context summary for current step */
function buildStepContext(step, ans, keywords, selectedTitle, briefData) {
  const parts = ["Content Builder tool. Keep answers SHORT: 2-3 sentences max. Use specific numbers when available. No generic SEO advice paragraphs."];
  if (ans.pt) parts.push("Page type: " + ans.pt);
  if (ans.ptx) parts.push("Page details: " + ans.ptx);
  if (ans.pd) parts.push("Page description: " + ans.pd);
  if (keywords?.length) {
    const kwStr = keywords.map(k => {
      const parts2 = [k.keyword || k];
      if (k.volume) parts2.push("Vol:" + k.volume);
      if (k.kd != null) parts2.push("KD:" + k.kd);
      if (k.freq) parts2.push(k.freq);
      return parts2.join(" ");
    }).join(" | ");
    parts.push("Keywords: " + kwStr);
  }
  if (ans.gl) parts.push("Goal: " + ans.gl);
  if (ans.au) parts.push("Audience: " + ans.au);
  if (ans.tn) parts.push("Tone: " + ans.tn);
  if (ans.mk) parts.push("Market: " + ans.mk);
  if (selectedTitle) parts.push("Selected title: " + selectedTitle);
  if (ans.me) parts.push("Brand details: " + ans.me);
  if (briefData) parts.push("Structure generated: yes, length: " + (briefData.contentLength || "~800 words"));
  parts.push("Current step: " + step);
  return parts.join("\n");
}

/* Assign frequency label based on volume */
function assignFreq(volume, maxVol) {
  if (!volume || !maxVol) return "MV";
  const ratio = volume / maxVol;
  if (ratio >= 0.6) return "HV";
  if (ratio >= 0.2) return "MV";
  return "LV";
}

/* Format volume number */
const fmtVol = v => { if (!v) return "—"; if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "K"; return String(v); };

/* ═══ UI PRIMITIVES ═══ */
const useIsMobile=()=>{const[m,sm]=useState(window.innerWidth<1024);useEffect(()=>{const h=()=>sm(window.innerWidth<1024);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};
const BotLogoFull=()=>(<svg width="33" height="29" viewBox="0 0 66 58" fill="none"><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill="#6E2BFF"/><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill="#6E2BFF"/></svg>);
const BL=({s=16})=>(<svg width={s} height={Math.round(s*0.81)} viewBox="0 0 66 58" fill="none" style={{flexShrink:0,opacity:0.35}}><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill="#6E2BFF"/><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill="#6E2BFF"/></svg>);
const UA=({n})=><div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{(n||"U")[0].toUpperCase()}</span></div>;
const CB=({t})=>{const[c,sc]=useState(false);return<button onClick={()=>{navigator.clipboard?.writeText(t);sc(true);setTimeout(()=>sc(false),1500);}} style={{fontSize:10,fontWeight:600,color:c?"#9B7AE6":C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"2px 6px",whiteSpace:"nowrap"}}>{c?"Copied!":"Copy"}</button>;};
const Tip=({text,children})=>{const[s,ss]=useState(false);const r=useRef(null);const[pos,sPos]=useState({top:true,left:0});useEffect(()=>{if(!s||!r.current)return;const rc=r.current.getBoundingClientRect();const above=rc.top>260;const spaceRight=window.innerWidth-rc.left;let left=0;if(spaceRight<260)left=-(260-spaceRight+12);sPos({top:!above,left});},[s]);return<span ref={r} style={{position:"relative",display:"inline-flex",alignItems:"center",verticalAlign:"middle"}} onMouseEnter={()=>ss(true)} onMouseLeave={()=>ss(false)} onClick={()=>ss(!s)}>{children}{s&&<span style={{position:"absolute",...(pos.top?{top:"calc(100% + 6px)"}:{bottom:"calc(100% + 6px)"}),left:pos.left,background:C.surface,color:C.dark,padding:"10px 14px",borderRadius:10,fontSize:11,lineHeight:1.5,width:240,zIndex:9999,fontWeight:400,boxShadow:"0 4px 24px rgba(0,0,0,0.14)",border:`1px solid ${C.border}`,pointerEvents:"none",whiteSpace:"normal"}}>{text}</span>}</span>;};
const QM=({text})=><Tip text={text}><span style={{width:16,height:16,borderRadius:"50%",border:`1px solid ${C.borderMid}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:C.muted,cursor:"help",marginLeft:4,verticalAlign:"middle"}}>?</span></Tip>;

/* ═══ FIX #2: Loading bar that waits for API ═══ */
const LB=({step,total,text,waiting})=>{
  const p = waiting ? Math.min(((step+1)/total)*100, 95) : ((step+1)/total)*100;
  return<div style={{padding:"14px 16px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
      <span style={{fontSize:12,fontWeight:500,color:C.dark}}>{text}</span>
      <span style={{fontSize:11,fontWeight:600,color:C.accent}}>{Math.round(p)}%</span>
    </div>
    <div style={{height:4,background:"rgba(110,43,255,0.08)",borderRadius:100,overflow:"hidden"}}>
      <div style={{height:"100%",background:C.accent,borderRadius:100,width:`${p}%`,transition:"width 0.5s ease"}}/>
    </div>
  </div>;
};

const BN=({text})=><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",marginBottom:8}}><BL s={16}/><span style={{fontSize:11.5,color:C.muted,lineHeight:1.5}}>{text}</span></div>;
const BotTip=({short,children})=>{const[o,so]=useState(false);return<div style={{padding:"8px 12px",borderRadius:10,background:"rgba(110,43,255,0.03)",border:`1px solid ${C.cardBorder}`,marginTop:6,marginBottom:4}}><div style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{short}</div>{children&&<button className="bot-tip-expand" onClick={()=>so(!o)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:C.accent,fontWeight:500,padding:"4px 0 0",display:"flex",alignItems:"center",gap:3}}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>{o?"Less":"Learn more"}</button>}{o&&children&&<div style={{fontSize:12,color:C.dark,lineHeight:1.6,marginTop:6,paddingTop:6,borderTop:`1px solid ${C.cardBorder}`}}>{children}</div>}</div>;};
const BB=({children})=><div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"90%",alignSelf:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`,fontSize:13,color:C.dark,lineHeight:1.5}}>{children}</div></div>;
const UB=({children,n})=><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",maxWidth:"80%",alignSelf:"flex-end"}}><div style={{marginBottom:3,marginRight:2}}><UA n={n}/></div><div style={{padding:"8px 14px",borderRadius:"12px 4px 12px 12px",background:C.accent,fontSize:13,color:"#fff"}}>{children}</div></div>;
const Btn=({text,onClick,primary,disabled:d})=><button onClick={d?undefined:onClick} style={{padding:"9px 20px",borderRadius:10,border:primary?"none":`1px solid ${C.borderMid}`,background:primary?C.accent:C.surface,color:primary?"#fff":C.dark,fontSize:13,fontWeight:600,cursor:d?"default":"pointer",fontFamily:"'DM Sans',sans-serif",opacity:d?0.4:1,pointerEvents:d?"none":"auto"}} onMouseEnter={e=>{if(!primary&&!d){e.currentTarget.style.background=C.accentLight;e.currentTarget.style.borderColor=C.hoverBorder;}}} onMouseLeave={e=>{if(!primary&&!d){e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.borderMid;}}}>{text}</button>;
const HP=({text,onClick,disabled:d})=><span onClick={d?undefined:onClick} style={{padding:"5px 12px",borderRadius:8,background:d?"rgba(21,20,21,0.02)":"rgba(21,20,21,0.03)",color:d?"rgba(21,20,21,0.2)":"#B8B5BB",fontSize:11,cursor:d?"default":"pointer",border:"1px solid transparent",fontFamily:"'DM Sans',sans-serif",pointerEvents:d?"none":"auto"}} onMouseEnter={e=>{if(!d){e.currentTarget.style.background="rgba(110,43,255,0.06)";e.currentTarget.style.color="#6E2BFF";e.currentTarget.style.borderColor="rgba(110,43,255,0.12)";}}} onMouseLeave={e=>{if(!d){e.currentTarget.style.background="rgba(21,20,21,0.03)";e.currentTarget.style.color="#B8B5BB";e.currentTarget.style.borderColor="transparent";}}}>{text}</span>;
const HE=({text})=><span style={{padding:"5px 12px",borderRadius:8,background:"rgba(21,20,21,0.03)",color:"#B8B5BB",fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"default",pointerEvents:"none"}}>{text}</span>;
/* Example box — shows examples in vertical list, grey, clearly not clickable */
const ExBox=({items})=><div style={{padding:"8px 12px",borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",marginBottom:6}}><div style={{fontSize:11,fontWeight:500,color:C.muted,marginBottom:4}}>Examples:</div><div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>{items.map((item,i)=><div key={i}>• {item}</div>)}</div><div style={{fontSize:10,color:"#B8B5BB",marginTop:4,fontStyle:"italic"}}>or type your own</div></div>;
const UBtn=({onUpload:ou})=>{const r=useRef(null);const[f,sf]=useState(null);return<div style={{display:"inline-flex",alignItems:"center",gap:6}}><input ref={r} type="file" accept=".pdf,.doc,.docx,.txt" style={{display:"none"}} onChange={e=>{if(e.target.files?.[0]){sf(e.target.files[0]);ou?.(e.target.files[0]);}}}/><button onClick={()=>r.current?.click()} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:8,background:"rgba(21,20,21,0.03)",border:"1px solid transparent",color:"#B8B5BB",fontSize:11,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(110,43,255,0.06)";e.currentTarget.style.color="#6E2BFF";e.currentTarget.style.borderColor="rgba(110,43,255,0.12)";}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(21,20,21,0.03)";e.currentTarget.style.color="#B8B5BB";e.currentTarget.style.borderColor="transparent";}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>Upload brand guide</button>{f&&<span style={{fontSize:10,color:C.accent,fontWeight:500}}>{f.name}</span>}</div>;};

/* ═══ EXTRAS BLOCK — shows related/paa/autocomplete inline with keywords ═══ */
const ExtrasBlock=({extra})=>{
  const[o,so]=useState(false);
  if(!extra)return null;
  const has=extra.related?.length>0||extra.paa?.length>0||extra.autocomplete?.length>0;
  if(!has)return null;
  return<div style={{marginTop:8}}>
    <button onClick={()=>so(!o)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:C.accent,fontWeight:500,padding:"4px 0",display:"flex",alignItems:"center",gap:4}}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>
      Additional search data from Google
    </button>
    {o&&<div style={{marginTop:6,padding:12,borderRadius:10,background:"rgba(110,43,255,0.02)",border:`1px solid ${C.cardBorder}`,fontSize:11}}>
      {extra.related?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>RELATED SEARCHES</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{extra.related.map((s,i)=><span key={i} style={{padding:"3px 8px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{typeof s==="string"?s:s.keyword||s}</span>)}</div></>}
      {extra.paa?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>PEOPLE ALSO ASK</div><div style={{lineHeight:1.7,marginBottom:10,fontSize:11}}>{extra.paa.map((q,i)=><div key={i}>• {typeof q==="string"?q:q.question||q}</div>)}</div></>}
      {extra.autocomplete?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>AUTOCOMPLETE</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{extra.autocomplete.map((s,i)=><span key={i} style={{padding:"3px 8px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{typeof s==="string"?s:s.keyword||s}</span>)}</div></>}
    </div>}
  </div>;
};

/* ═══ KEYWORD SELECTOR ═══ */
const fmtKd=v=>{if(v==null)return"—";if(typeof v==="number")return String(v);const s=String(v);if(s==="LOW")return"Low";if(s==="HIGH")return"High";if(s==="MEDIUM")return"Med";return s;};
const KwS=({keywords,init,onDone,onAdj})=>{const maxSel=3;const maxShow=7;const[s,ss]=useState([]);const[toast,sToast]=useState("");const t=k=>{ss(p=>{if(p.includes(k)){return p.filter(x=>x!==k);}if(p.length>=maxSel){sToast("You can select up to 3 keywords. Deselect one to choose another.");setTimeout(()=>sToast(""),2500);return p;}return[...p,k];});};return<div><div style={{fontWeight:600,marginBottom:6,fontSize:13}}>Your keywords — tap to select/deselect:</div><div style={{display:"flex",alignItems:"center",gap:6,padding:"0 10px 4px",fontSize:9,fontWeight:500,color:C.muted}}><span style={{width:16,flexShrink:0}}/><span style={{flex:1}}>Keyword</span><span style={{width:42,textAlign:"right"}}>Vol.</span><span style={{width:32,textAlign:"center"}}>KD</span><span style={{width:30,textAlign:"center"}}>Freq</span></div><div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>{keywords.slice(0,maxShow).map((k,i)=>{const a=s.includes(k.keyword);const fc=FC[k.freq]||FC.MV;return<div key={i} onClick={()=>t(k.keyword)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,border:`1px solid ${a?"rgba(110,43,255,0.2)":"rgba(21,20,21,0.06)"}`,background:a?"rgba(110,43,255,0.04)":"transparent",cursor:"pointer"}}><div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${a?C.accent:"rgba(21,20,21,0.15)"}`,background:a?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{a&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div><span style={{flex:1,fontSize:12,fontWeight:500,color:a?C.dark:C.muted}}>{k.keyword}</span><span style={{width:42,textAlign:"right",fontSize:10,color:C.muted,fontWeight:600}}>{fmtVol(k.volume)}</span><span style={{width:32,textAlign:"center",fontSize:10,color:C.muted}}>{fmtKd(k.kd)}</span><span style={{width:30,textAlign:"center"}}><span style={{fontSize:9,fontWeight:600,color:fc.color,background:fc.bg,padding:"2px 6px",borderRadius:4}}>{k.freq}</span></span></div>;})}</div>{toast&&<div style={{fontSize:11,color:"#c0392b",background:"rgba(192,57,43,0.06)",padding:"6px 10px",borderRadius:8,marginBottom:6,transition:"opacity 0.3s"}}>{toast}</div>}<div style={{fontSize:12,color:C.dark,marginBottom:4}}>Select 2 to 3 keywords. {s.length} selected.</div>{(()=>{const hasLowKd=keywords.some(k=>k.kd!=null&&k.kd<50);const allHighKd=keywords.every(k=>k.kd==null||k.kd>=70);if(allHighKd)return<div style={{fontSize:10.5,color:C.muted,lineHeight:1.4,marginBottom:8}}>These keywords have high competition. Consider using Adjust to find less competitive alternatives or long-tail variations.</div>;if(hasLowKd)return<div style={{fontSize:10.5,color:C.muted,lineHeight:1.4,marginBottom:8}}>I focused on high-volume and medium-volume terms with low competition, so they're easier to rank for and bring steady traffic faster.</div>;return<div style={{fontSize:10.5,color:C.muted,lineHeight:1.4,marginBottom:8}}>Pick keywords that match your page topic. Higher volume means more potential traffic.</div>;})()}<div style={{display:"flex",gap:8}}><Btn text="Build With These" onClick={()=>onDone(s)} primary disabled={s.length<2}/><Btn text="Adjust" onClick={()=>onAdj(s)}/></div></div>;};

/* ═══ HIGHLIGHT HELPERS ═══ */
const HlT=({text,hl})=>{if(!hl?.length)return<span>{text}</span>;const p=[];let r=text;hl.forEach(h=>{const i=r.toLowerCase().indexOf(h.toLowerCase());if(i>=0){if(i>0)p.push({t:r.slice(0,i),h:false});p.push({t:r.slice(i,i+h.length),h:true});r=r.slice(i+h.length);}});if(r)p.push({t:r,h:false});return<span>{p.map((x,i)=>x.h?<span key={i} style={{background:"rgba(110,43,255,0.1)",color:C.accent,padding:"1px 3px",borderRadius:3}}>{x.t}</span>:<span key={i}>{x.t}</span>)}</span>;};
const TSel=({titles,onSelect})=><div><div style={{fontWeight:600,marginBottom:8,fontSize:13}}>Choose a title for your page:</div><div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:6}}>{titles.map((t,i)=><div key={i} onClick={()=>onSelect(t.text)} style={{padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,fontSize:12.5,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.hoverBorder;e.currentTarget.style.background=C.accentLight;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}><HlT text={t.text} hl={t.hl}/></div>)}</div><div style={{fontSize:10,color:C.muted}}>Or type your own title below</div></div>;
const VI=({type})=>{const s={width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"#928E95",strokeWidth:"1.5"};const m={image:<svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,video:<svg {...s}><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,list:<svg {...s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>,table:<svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,quote:<svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,faq:<svg {...s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>};return m[type]||m.image;};
const STOP_HL="(?:to|in|for|from|during|of|the|a|and|on|with|by|our|my|your|its|this|that)";
const hlF=(text,kd)=>{if(!text||!kd?.length)return text;const sorted=[...kd].filter(x=>x.text&&x.text.split(/\s+/).length>=2).sort((a,b)=>(b.text?.length||0)-(a.text?.length||0));if(!sorted.length)return text;let p=[{t:text,h:false,f:null}];sorted.forEach(({text:kw,freq})=>{const words=kw.split(/\s+/).filter(w=>w.length>0);if(words.length<2)return;const escaped=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));const re=new RegExp(`(${escaped.join(`(?:\\s+${STOP_HL}){0,3}\\s+`)})`,'gi');const np=[];p.forEach(pt=>{if(pt.h){np.push(pt);return;}const parts=pt.t.split(re);for(let i=0;i<parts.length;i++){const s=parts[i];if(!s)continue;if(re.test(s)){np.push({t:s,h:true,f:freq});re.lastIndex=0;}else{np.push({t:s,h:false,f:null});}}});p=np;});return<span>{p.map((x,i)=>{if(!x.h)return<span key={i}>{x.t}</span>;const fc=FC[x.f]||FC.MV;return<span key={i} style={{background:fc.bg,color:fc.color,padding:"1px 4px",borderRadius:3}}>{x.t}</span>;})}</span>;};
const RevealBlock=({children,delay=0})=>{const[vis,setVis]=useState(false);useEffect(()=>{const t=setTimeout(()=>setVis(true),Math.max(60,delay*1000+60));return()=>clearTimeout(t);},[delay]);return<div style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(28px)",transition:`opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)`}}>{children}</div>;};
const LoadingPanel=({text})=><div style={{minHeight:"calc(100vh - 130px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:40,height:40,borderRadius:"50%",border:"3px solid rgba(110,43,255,0.1)",borderTopColor:C.accent,animation:"spin 0.8s linear infinite",marginBottom:16}}/><div style={{fontSize:13,fontWeight:500,color:C.dark,marginBottom:4}}>{text||"Generating..."}</div><div style={{fontSize:12,color:C.muted}}>This usually takes a few seconds</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
const Placeholder=()=><div style={{minHeight:"calc(100vh - 180px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:64,height:64,borderRadius:16,background:"rgba(110,43,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div style={{fontSize:18,fontWeight:700,color:C.dark,marginBottom:8}}>Your content will appear here</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6,textAlign:"center",maxWidth:320,marginBottom:24}}>Answer the questions on the left, and I'll build your SEO brief and content step by step.</div><div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:300}}>{[{n:"1",t:"Keywords + context",d:"Topic, audience, tone, goals"},{n:"2",t:"SEO structure",d:"Title, description, H1-H3"},{n:"3",t:"Full content",d:"Complete page text, ready to publish"}].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"rgba(110,43,255,0.04)",border:"1px solid rgba(110,43,255,0.08)"}}><div style={{width:24,height:24,borderRadius:"50%",background:"rgba(155,122,230,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:"#9B7AE6"}}>{s.n}</span></div><div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>{s.t}</div><div style={{fontSize:11,color:C.muted}}>{s.d}</div></div></div>)}</div></div>;

/* ═══ BRIEF & CONTENT PANELS ═══ */
const BriefInner=({d,kwData:kwDataProp})=>{const[kwE,skE]=useState(false);return<div><RevealBlock><div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>SEO TITLE</div><div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13.5,fontWeight:500,color:C.dark}}>{hlF(d.title,d.titleKw)}</span><CB t={d.title}/></div></div></RevealBlock><RevealBlock delay={0.06}><div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>META DESCRIPTION</div><div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}><span style={{fontSize:12.5,color:C.dark,lineHeight:1.5}}>{hlF(d.description,d.descKw)}</span><CB t={d.description}/></div></div></RevealBlock><RevealBlock delay={0.12}><div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>FOCUS KEYWORDS</div><div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"visible"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}><thead><tr style={{borderBottom:"1px solid rgba(21,20,21,0.06)"}}><th style={{textAlign:"left",padding:"8px 12px",color:C.muted,fontWeight:500,fontSize:10}}>Keyword</th><th style={{textAlign:"center",padding:"8px 6px",color:C.muted,fontWeight:500,fontSize:10,width:55,whiteSpace:"nowrap"}}>Vol.<QM text="Monthly search volume — how many people search this per month."/></th><th style={{textAlign:"center",padding:"8px 6px",color:C.muted,fontWeight:500,fontSize:10,width:40,whiteSpace:"nowrap"}}>KD<QM text="Keyword difficulty (0–100). Lower is easier to rank for."/></th><th style={{textAlign:"center",padding:"8px 6px",color:C.muted,fontWeight:500,fontSize:10,width:45,whiteSpace:"nowrap"}}>Freq<QM text="Keyword priority. HV = High Volume, main keyword. MV = Medium, supporting. LV = Low, extra."/></th></tr></thead><tbody>{d.keywords.map((k,i)=>{const fc=FC[k.freq]||FC.MV;return<tr key={i} style={{borderBottom:i<d.keywords.length-1?"1px solid rgba(21,20,21,0.04)":"none"}}><td style={{padding:"7px 12px",color:fc.color,fontWeight:500,fontSize:12}}>{k.keyword}</td><td style={{textAlign:"center",padding:"7px",color:C.dark,fontWeight:600}}>{fmtVol(k.volume)}</td><td style={{textAlign:"center",padding:"7px",color:C.muted}}>{k.kd!=null?(typeof k.kd==="number"?k.kd:String(k.kd)):"—"}</td><td style={{textAlign:"center",padding:"7px"}}><span style={{fontSize:10,fontWeight:600,color:fc.color,background:fc.bg,padding:"2px 6px",borderRadius:4}}>{k.freq}</span></td></tr>;})}</tbody></table></div>{d.keywords.some(k=>k.volume==null)&&<div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>— = Google doesn't have enough search data for this keyword in the selected market.</div>}{(d.related?.length>0||d.paa?.length>0||d.autocomplete?.length>0)&&<button onClick={()=>skE(!kwE)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:C.accent,fontWeight:500,padding:"6px 0",display:"flex",alignItems:"center",gap:4,marginTop:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="2" strokeLinecap="round" style={{transform:kwE?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>Additional search phrases from Google</button>}{kwE&&<div style={{marginTop:6,padding:14,borderRadius:10,background:"rgba(110,43,255,0.02)",border:`1px solid ${C.cardBorder}`,fontSize:11}}>{d.related?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>RELATED SEARCHES</div><div style={{fontSize:10.5,color:C.muted,marginBottom:6,lineHeight:1.4}}>Other searches Google considers relevant to your topic — great for subtopics and H2 ideas.</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>{d.related.map((s,i)=><span key={i} style={{padding:"4px 10px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{s}</span>)}</div></>}{d.paa?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>PEOPLE ALSO ASK</div><div style={{fontSize:10.5,color:C.muted,marginBottom:6,lineHeight:1.4}}>Real questions people ask Google about your topic — perfect for FAQ sections.</div><div style={{fontSize:11,color:C.dark,lineHeight:1.7,marginBottom:12}}>{d.paa.map((q,i)=><div key={i} style={{padding:"4px 0",borderBottom:i<d.paa.length-1?`1px solid ${C.border}`:"none"}}>• {q}</div>)}</div></>}{d.autocomplete?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>AUTOCOMPLETE</div><div style={{fontSize:10.5,color:C.muted,marginBottom:6,lineHeight:1.4}}>What Google suggests as people type — shows real search patterns.</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{d.autocomplete.map((s,i)=><span key={i} style={{padding:"4px 10px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{s}</span>)}</div></>}</div>}</div></RevealBlock><RevealBlock delay={0.18}>{d.recs?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>RECOMMENDATIONS</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{d.recs.map((r,i)=><div key={i} style={{padding:"8px 10px",borderRadius:8,background:"rgba(110,43,255,0.03)",border:"1px solid rgba(110,43,255,0.06)"}}><div style={{fontSize:9,color:C.muted,textTransform:"capitalize"}}>{r.key}</div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>{r.value}</div></div>)}</div></div>}</RevealBlock><RevealBlock delay={0.24}>{d.sections?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>PAGE STRUCTURE</div>{d.sections.map((sec,i)=><div key={i} style={{padding:"14px 16px",borderRadius:10,border:`1px solid ${C.border}`,marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:9,fontWeight:600,color:sec.level==="H1"?"#6E2BFF":"#9B7AE6",background:sec.level==="H1"?"rgba(110,43,255,0.08)":"rgba(155,122,230,0.08)",padding:"2px 6px",borderRadius:3}}>{sec.level}</span><span style={{fontSize:sec.level==="H1"?13:12.5,fontWeight:600,color:C.dark}}>{sec.title}</span></div><div style={{fontSize:11.5,color:C.muted,lineHeight:1.5,marginTop:4}}>{sec.desc}</div>{sec.kwNote&&<div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>{sec.kwNote}</div>}{sec.visuals?.length>0&&<div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>{sec.visuals.map((v,j)=><span key={j} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:C.muted,padding:"3px 8px",borderRadius:6,background:"rgba(21,20,21,0.03)"}}><VI type={v.icon}/>{v.text}</span>)}</div>}</div>)}</div>}</RevealBlock><RevealBlock delay={0.3}><BN text="Add internal links to related pages on your site."/><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",marginBottom:8}}><BL s={16}/><span style={{fontSize:11.5,color:C.muted,lineHeight:1.5}}>After publishing, submit your page to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{color:C.accent,textDecoration:"none"}}>Google Search Console</a>.</span></div></RevealBlock></div>;};
const BriefPanel=({d,kwData:kwDataProp})=><div style={{padding:"28px 24px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:17,fontWeight:700,color:C.dark}}>SEO Brief</span><span style={{fontSize:10,fontWeight:500,color:C.muted,background:"rgba(21,20,21,0.04)",padding:"3px 10px",borderRadius:10}}>{d.recs?.find(r=>r.key==="Goal")?.value||"Content"}</span></div><span style={{fontSize:10,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"3px 10px",borderRadius:10,fontWeight:500}}>structure ready</span></div><BriefInner d={d} kwData={kwDataProp}/></div>;
const ContentPanel=({html,d,kwData:kwDataProp})=>{const[bo,sbo]=useState(false);
/* v62: Soft keyword highlighting — allows prepositions (to,in,for,from,during,of,the,a,and,on) between keyword words. Min 2 keyword words must match. */
const STOP_WORDS="(?:to|in|for|from|during|of|the|a|and|on|with|by|our|my|your|its|this|that)";
const buildSoftRegex=(kw)=>{const words=kw.split(/\s+/).filter(w=>w.length>0);if(words.length<2)return null;const escaped=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));return new RegExp(`\\b(${escaped.join(`(?:\\s+${STOP_WORDS}){0,3}\\s+`)})\\b`,'gi');};
const hlHtml=(rawHtml,kws)=>{if(!rawHtml||!kws?.length)return rawHtml;
const kwList=kws.filter(k=>k.keyword&&k.keyword.split(/\s+/).length>=2).sort((a,b)=>(b.keyword?.length||0)-(a.keyword?.length||0));
if(!kwList.length)return rawHtml;
let out=rawHtml;
kwList.forEach(k=>{const re=buildSoftRegex(k.keyword);if(!re)return;const freq=k.freq||"MV";
const parts=out.split(/(<[^>]*>)/);
out=parts.map(part=>{if(part.startsWith('<'))return part;return part.replace(re,(m)=>`<mark data-freq="${freq}">${m}</mark>`);}).join('');
});return out;};
const kwsForHl=kwDataProp||d?.keywords||[];
const highlightedHtml=hlHtml(html,kwsForHl);
const render=()=>{if(!highlightedHtml)return null;const secs=highlightedHtml.split(/(?=<h[12]>)/);return secs.map((sec,i)=>{const hm=sec.match(/<h([12])>(.*?)<\/h\1>/);const lv=hm?parseInt(hm[1]):null;const hd=hm?hm[2]?.replace(/<mark[^>]*>(.*?)<\/mark>/g,'$1'):null;const body=sec.replace(/<h[12]>.*?<\/h[12]>/,"").trim();return<RevealBlock key={i} delay={i*0.08}><div style={{marginBottom:24}}>{hd&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><span style={{fontSize:9,fontWeight:600,color:lv===1?"#6E2BFF":"#9B7AE6",background:lv===1?"rgba(110,43,255,0.08)":"rgba(155,122,230,0.08)",padding:"2px 6px",borderRadius:3}}>H{lv}</span><span style={{fontSize:lv===1?18:15,fontWeight:700,color:C.dark}}>{hd}</span></div>}<div style={{fontSize:13,color:C.dark,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:body.replace(/<mark data-freq="HV">(.*?)<\/mark>/g,'<span style="background:rgba(110,43,255,0.12);color:#6E2BFF;padding:1px 4px;border-radius:3px">$1</span>').replace(/<mark data-freq="MV">(.*?)<\/mark>/g,'<span style="background:rgba(155,122,230,0.1);color:#9B7AE6;padding:1px 4px;border-radius:3px">$1</span>').replace(/<mark data-freq="LV">(.*?)<\/mark>/g,'<span style="background:rgba(184,156,240,0.12);color:#B89CF0;padding:1px 4px;border-radius:3px">$1</span>').replace(/<h3>(.*?)<\/h3>/g,'<p style="font-weight:600;font-size:14px;margin:16px 0 6px;color:#151415">$1</p>').replace(/<strong>(.*?)<\/strong>/g,'<strong style="font-weight:600">$1</strong>').replace(/<ul>/g,'<ul style="padding-left:20px;margin:8px 0">').replace(/<li>/g,'<li style="margin-bottom:4px">').replace(/<blockquote>(.*?)<\/blockquote>/g,'<div style="border-left:3px solid rgba(110,43,255,0.2);padding:10px 14px;background:rgba(110,43,255,0.03);border-radius:0 8px 8px 0;margin:8px 0;font-style:italic">$1</div>').replace(/<table>/g,'<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px">').replace(/<th>/g,'<th style="text-align:left;padding:6px 10px;background:rgba(110,43,255,0.06);border:1px solid rgba(21,20,21,0.06);font-weight:600">').replace(/<td>/g,'<td style="padding:6px 10px;border:1px solid rgba(21,20,21,0.06)">').replace(/<details><summary>(.*?)<\/summary>/g,'<div style="border:1px solid rgba(21,20,21,0.08);border-radius:8px;margin:4px 0"><div style="padding:8px 12px;font-weight:600;font-size:12px;background:rgba(21,20,21,0.02)">$1</div><div style="padding:8px 12px;font-size:12px">').replace(/<\/details>/g,'</div></div>').replace(/\[visual:([^\]]*)\]/g,'<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:rgba(21,20,21,0.03);color:#928E95;font-size:11px;margin:4px 0">$1</div>')}}/></div></RevealBlock>;});};return<div style={{padding:"28px 24px"}}><RevealBlock><div style={{marginBottom:20,borderRadius:12,border:`1px solid ${C.cardBorder}`,overflow:"hidden"}}><button onClick={()=>sbo(!bo)} style={{width:"100%",padding:"14px 16px",background:C.card,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'DM Sans',sans-serif"}}><div style={{display:"flex",alignItems:"center",gap:8}}><BL s={16}/><span style={{fontSize:14,fontWeight:700,color:C.dark}}>SEO Brief</span><span style={{fontSize:10,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"3px 8px",borderRadius:8,fontWeight:500}}>view</span></div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:bo?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s"}}><polyline points="6 9 12 15 18 9"/></svg></button>{bo&&<div style={{padding:16,borderTop:`1px solid ${C.cardBorder}`}}><BriefInner d={d} kwData={kwDataProp}/></div>}</div></RevealBlock><RevealBlock delay={0.06}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:17,fontWeight:700,color:C.dark}}>Full Content</span><span style={{fontSize:10,fontWeight:500,color:C.muted,background:"rgba(21,20,21,0.04)",padding:"3px 10px",borderRadius:10}}>{d.contentLength||"~800 words"}</span></div><span style={{fontSize:10,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"3px 10px",borderRadius:10,fontWeight:500}}>ready to use</span></div></RevealBlock><RevealBlock delay={0.12}><div style={{padding:"14px 16px",borderRadius:10,background:"rgba(110,43,255,0.03)",border:"1px solid rgba(110,43,255,0.06)",marginBottom:20}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:4}}>SEO TITLE</div><div style={{fontSize:13,fontWeight:600,color:C.dark,marginBottom:8}}>{hlF(d.title,d.titleKw)}</div><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:4}}>META DESCRIPTION</div><div style={{fontSize:12,color:C.dark,lineHeight:1.5}}>{hlF(d.description,d.descKw)}</div></div></RevealBlock>{render()}<RevealBlock delay={0.1}><div style={{marginTop:16}}><BN text="Add internal links to related pages on your site."/><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",marginBottom:8}}><BL s={16}/><span style={{fontSize:11.5,color:C.muted,lineHeight:1.5}}>After publishing, submit your URL in <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{color:C.accent,textDecoration:"none"}}>Google Search Console</a>.</span></div></div></RevealBlock></div>;};

/* ═══ LOADING STEP LABELS ═══ */
const LKW=["Generating keyword ideas...","Searching Google data...","Analyzing search volume...","Ranking by difficulty..."];
const LST=["Preparing your meta data...","Building your SEO content structure...","Adding visual and layout suggestions..."];
const LCN=["Researching top Google results...","Extracting real-world data from SERP...","Transforming structure into conversion-ready content...","Organically integrating all confirmed keywords...","Aligning CTAs with tone, audience, and page goals...","Polishing final copy..."];

const MobileTab=({active,onSwitch,hasBrief,hasContent})=>{if(!hasBrief&&!hasContent)return null;return<div style={{display:"flex",gap:0,background:"rgba(21,20,21,0.04)",borderRadius:10,padding:3,margin:"0 16px 8px"}}><button onClick={()=>onSwitch("chat")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="chat"?C.surface:"transparent",color:active==="chat"?C.dark:C.muted,boxShadow:active==="chat"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Chat</button><button onClick={()=>onSwitch("panel")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="panel"?C.surface:"transparent",color:active==="panel"?C.dark:C.muted,boxShadow:active==="panel"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{hasContent?"Content":"Brief"}</button></div>;};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — v48: Fixed keyword selection tracking + title generation
   Phase 1: input = answer to current step. No chat, no questions.
   Phase 2 (sr/cr): input = tweak or question (if ends with ?)
   ═══════════════════════════════════════════════════════════ */
function ContentBuilder({onHome,memberName:mn}){
const isMobile=useIsMobile();const[mTab,sMTab]=useState("chat");const[pLoad,sPLoad]=useState(null);
const[step,sStep]=useState("init");const stepRef=useRef("init");const setStep=useCallback((v)=>{sStep(v);stepRef.current=v;},[]);const[msgs,sMsgs]=useState([]);const[typ,sTyp]=useState(false);
const[ans,sAns]=useState({});
const[kwData,sKwData]=useState([]);
const[dfsExtra,sDfsExtra]=useState({});
const dfsExtraRef=useRef({});
useEffect(()=>{dfsExtraRef.current=dfsExtra;},[dfsExtra]);
const[skw,sSkw]=useState([]);
const skwRef=useRef([]);
useEffect(()=>{skwRef.current=skw;},[skw]);
const[stit,sStit]=useState(null);
const confirmedTitleRef=useRef(null);
const[confirmedKeywords,sConfirmedKeywords]=useState([]);
const[brandName,sBrandName]=useState(null);
const[cleanedBrand,sCleanedBrand]=useState("");

/* Classify keywords into primary/secondary/supporting based on volume + KD */
function classifyKeywords(kwList) {
  if (!kwList || kwList.length === 0) return { primary: null, secondary: [], supporting: [] };
  /* Sort: highest volume first, then lowest KD */
  const sorted = [...kwList].sort((a, b) => {
    const va = a.volume || 0, vb = b.volume || 0;
    if (vb !== va) return vb - va;
    return (a.kd || 100) - (b.kd || 100);
  });
  const primary = sorted[0];
  const secondary = sorted.slice(1, 3);
  const supporting = sorted.slice(3);
  console.log("[CB] classifyKeywords: primary=", primary?.keyword, "secondary=", secondary.map(k=>k.keyword), "supporting=", supporting.map(k=>k.keyword));
  return { primary, secondary, supporting };
}
const[savedTitles,sSavedTitles]=useState([]);
const[bd,sBd]=useState(null);
const[contentHtml,sContentHtml]=useState(null);
const[rp,sRp]=useState("ph");
const[ls,sLs]=useState(-1);const[lst,sLst]=useState([]);const[lsWaiting,sLsWaiting]=useState(false);
const[dn,sDn]=useState({});
const[tweakCount,sTweakCount]=useState(0);
const[adjustRound,sAdjustRound]=useState(0);
const cr=useRef(null);const inpRef=useRef(null);
const prevMsgCount=useRef(0);
const loadingResolveRef=useRef(null);
const scrollChat=useCallback(()=>{if(cr.current)cr.current.scrollTop=cr.current.scrollHeight;},[]);
useEffect(()=>{if(msgs.length>prevMsgCount.current)setTimeout(scrollChat,50);prevMsgCount.current=msgs.length;},[msgs.length]);
useEffect(()=>{if(typ)setTimeout(scrollChat,50);},[typ]);

const add=useCallback((f,c)=>{sMsgs(p=>[...p,{f,c,id:Date.now()+Math.random()}]);},[]);
const bot=useCallback((c,dl=800)=>{sTyp(true);return new Promise(r=>{setTimeout(()=>{sTyp(false);add("b",c);r();},dl);});},[add]);
const mk=id=>sDn(p=>({...p,[id]:true}));

const startLoading=useCallback((steps)=>{
  sLst(steps);sLs(0);sLsWaiting(false);
  return new Promise(resolve=>{
    loadingResolveRef.current=resolve;
    let i=0;
    const iv=setInterval(()=>{
      i++;
      if(i>=steps.length-1){clearInterval(iv);sLs(steps.length-1);sLsWaiting(true);}
      else{sLs(i);}
    },1200);
  });
},[]);
const stopLoading=useCallback(()=>{
  sLs(-1);sLst([]);sLsWaiting(false);
  if(loadingResolveRef.current){loadingResolveRef.current();loadingResolveRef.current=null;}
},[]);

/* ═══ PHASE 2: AI Chat (questions only, after structure) ═══ */
const handleAiChat=useCallback(async(text)=>{
  sTyp(true);
  const ctx=buildStepContext(step,ans,kwData,stit,bd);
  const history=buildChatHistory(msgs);
  const answer=await callChat(ctx,history,text);
  sTyp(false);
  if(answer){add("b",typeof answer==="string"?answer:"I couldn't process that. Try rephrasing.");}
  else{add("b","Sorry, I couldn't get a response. Try again.");}
},[step,ans,kwData,stit,bd,msgs,add]);

/* ═══ INIT ═══ */
useEffect(()=>{
  const mid=getMemberId();
  console.log("[CB] INIT memberId:", mid);
  sTyp(true);setTimeout(()=>{sTyp(false);add("b",mn?`Hey ${mn}!`:"Hey!");sTyp(true);},1500);
  setTimeout(()=>{sTyp(false);add("b",<div><div style={{color:C.muted,fontSize:12,marginBottom:8}}>I'll guide you step by step to build SEO content for your page. First we'll find the right keywords, then build a structure and full content. After the structure is ready, you can edit and adjust everything freely.</div><div style={{fontWeight:600}}>Do you have keywords or should I find them?</div></div>);setStep("ec");},3500);
},[]);

/* ═══ DFS ENRICHMENT (shared helper) ═══ */
const enrichWithDFS=async(rawKeywords,locCode)=>{
  const dfsData=await callDFS(rawKeywords.slice(0,5),locCode||2840);
  let enriched=[];
  const metrics=dfsData?.keyword_metrics||[];
  const sug=dfsData?.suggestions||[];
  const lookup=new Map();
  metrics.forEach(m=>{if(m?.keyword)lookup.set(m.keyword.toLowerCase(),m);});
  sug.forEach(s=>{if(s?.keyword&&!lookup.has(s.keyword.toLowerCase()))lookup.set(s.keyword.toLowerCase(),s);});
  const gV=m=>(m?.search_volume??m?.volume??null);
  const gK=m=>{const v=(m?.competition_index??m?.keyword_difficulty??m?.competition??null);return typeof v==="number"?v:null;};
  const maxV=Math.max(...[...lookup.values()].map(m=>gV(m)||0),1);
  /* Normalize keyword for dedup: lowercase, remove dashes/extra spaces, sort words */
  const normKw=(k)=>k.toLowerCase().replace(/[-_]/g," ").replace(/\s+/g," ").trim();
  const normSorted=(k)=>normKw(k).split(" ").sort().join(" ");
  /* Even stricter: collapse spaces to detect "key word" vs "keyword" */
  const normCollapsed=(k)=>normKw(k).replace(/\s+/g,"");
  if(lookup.size>0){
    enriched=rawKeywords.map(kw=>{const match=lookup.get(kw.toLowerCase());return{keyword:kw,volume:gV(match),kd:gK(match),freq:assignFreq(gV(match)||0,maxV)};});
    /* Dedup GPT keywords themselves: if "key word research" and "keyword research" both exist, keep the one with higher volume */
    const seen=new Map();
    enriched=enriched.filter(k=>{
      const collapsed=normCollapsed(k.keyword);
      if(seen.has(collapsed)){
        const prev=seen.get(collapsed);
        if((k.volume||0)>(prev.volume||0)){enriched[enriched.indexOf(prev)]=null;seen.set(collapsed,k);return true;}
        return false;
      }
      seen.set(collapsed,k);return true;
    }).filter(Boolean);
    /* Add high-volume DFS suggestions not already in list */
    const existingNorm=new Set(enriched.map(k=>normCollapsed(k.keyword)));
    const existingSorted=new Set(enriched.map(k=>normSorted(k.keyword)));
    (sug||[]).filter(s=>{
      if(!s.keyword||(gV(s)||0)<=0)return false;
      const kw=s.keyword.toLowerCase();
      /* Filter exact duplicates */
      if(existingNorm.has(normCollapsed(kw)))return false;
      /* Filter same-words-different-order duplicates */
      if(existingSorted.has(normSorted(kw)))return false;
      /* Filter junk: keyword with duplicate words like "keyword keyword research" */
      const words=normKw(kw).split(" ");
      const uniqueWords=new Set(words);
      if(uniqueWords.size<words.length)return false;
      return true;
    }).slice(0,3).forEach(s=>{
      existingNorm.add(normCollapsed(s.keyword));
      existingSorted.add(normSorted(s.keyword));
      enriched.push({keyword:s.keyword,volume:gV(s),kd:gK(s),freq:assignFreq(gV(s)||0,maxV)});
    });
  } else {
    enriched=rawKeywords.map(kw=>({keyword:kw,volume:null,kd:null,freq:"MV"}));
  }
  const normArr=(arr,field)=>(arr||[]).map(x=>typeof x==="string"?x:x?.[field]||x?.keyword||String(x)).filter(Boolean);
  const extras={suggestions:dfsData?.suggestions||[],paa:normArr(dfsData?.people_also_ask,"question"),related:normArr(dfsData?.related_searches,"title"),autocomplete:normArr(dfsData?.autocomplete,"suggestion")};
  return{enriched,extras,dfsData};
};

/* ═══ SHOW KEYWORDS (shared UI builder) ═══ */
const showKeywords=(enriched,extras,adjustsLeft)=>{
  sDfsExtra(extras);dfsExtraRef.current=extras;
  console.log("[CB] showKeywords extras:", JSON.stringify({paa:extras?.paa?.length||0,related:extras?.related?.length||0,autocomplete:extras?.autocomplete?.length||0}));
  sKwData(enriched);const init=enriched.map(k=>k.keyword);sSkw(init);skwRef.current=init;
  stopLoading();sTyp(false);setStep("kw");
  add("b",<div>
    {adjustsLeft<5&&<div style={{marginBottom:6}}>Keywords updated! ({adjustsLeft} adjusts left)</div>}
    {adjustsLeft>=5&&<div style={{marginBottom:6}}>Here are keyword suggestions based on real Google search data. Pick the ones that fit your page.</div>}
    <BotTip short="Each keyword has search volume, competition, and priority."><div><div style={{marginBottom:6}}>Vol. — how many people search this per month.</div><div style={{marginBottom:6}}>KD — competition (0–100). Lower = easier to rank.</div><div>HV = High Volume, main keyword. MV = Medium. LV = Low.</div></div></BotTip>
    <KwS keywords={enriched} init={init} onDone={s=>{sSkw(s);skwRef.current=s;sConfirmedKeywords(enriched.filter(k=>s.includes(k.keyword)));kwDone();}} onAdj={(currentSelection)=>{
      if(stepRef.current!=="kw"){console.log("[CB] onAdj blocked: step=",stepRef.current);return;}
      if(adjustRound>=5){bot("You've used all adjustments. Please select from the current list.");return;}
      /* Save current checkbox state before going to adjust */
      sSkw(currentSelection);skwRef.current=currentSelection;
      setStep("ka");bot("Just tell me what to change — add, remove, or refine keywords.");
    }}/>
    <ExtrasBlock extra={extras}/>
  </div>);
};

/* ═══ KEYWORD DONE → Phase 1 continues ═══ */
const kwDone=()=>{
  mk("kw");
  setStep("gl");
  bot(<div><div style={{marginBottom:8}}>Great keywords! Now let's shape your content.</div><div style={{fontWeight:600,marginBottom:6}}>Step 1 of 4 — What should this page achieve?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>This shapes the content strategy and call-to-action.</div><ExBox items={["Sell a product","Explain a service","Build trust","Get leads","Inform visitors"]}/></div>);
};

/* ═══ KEYWORD ADJUST (up to 5 rounds) ═══ */
const doAdjust=async(text)=>{
  const currentRound=adjustRound+1;
  sAdjustRound(currentRound);
  setStep("kl");sTyp(true);startLoading(LKW);
  try {
    /* Use skwRef for the ACTUAL current checkbox state */
    const currentChecked=skwRef.current;
    const prevCheckedKw=kwData.filter(k=>currentChecked.includes(k.keyword));
    const gptRes=await callGPT("generate_keywords",{
      page_type:ans.pt||"",page_description:ans.pd||"",page_type_details:ans.ptx||"",
      adjustment:text,previous_keywords:kwData.map(k=>k.keyword),
      chat_history:buildChatHistory(msgs)
    });
    let newRaw=[];
    if(gptRes){
      newRaw=Array.isArray(gptRes.keywords)?gptRes.keywords.map(k=>typeof k==="string"?k:k.keyword||String(k)):[];
      /* Update page context if GPT returned it */
      if(gptRes.updated_page_context){
        sAns(p=>({...p,pd:gptRes.updated_page_context}));
        console.log("[CB] page context updated:", gptRes.updated_page_context);
      }
    }
    if(newRaw.length===0)newRaw=kwData.map(k=>k.keyword);
    const locCode=parseLocationCode(ans.mk||"");
    const{enriched:newEnriched,extras}=await enrichWithDFS(newRaw,locCode);
    /* MERGE: old CHECKED keywords stay at the top + new keywords (skip dupes) */
    const newKwSet=new Set(newEnriched.map(k=>k.keyword.toLowerCase()));
    const checkedNotInNew=prevCheckedKw.filter(k=>!newKwSet.has(k.keyword.toLowerCase()));
    const mergedKw=[...checkedNotInNew,...newEnriched].slice(0,10);
    /* Pre-select: old checked stay checked, new ones also checked */
    const preSelected=mergedKw.map(k=>k.keyword);
    /* Merge extras with previous */
    const merged={
      suggestions:[...new Set([...(extras.suggestions||[]),...(dfsExtraRef.current.suggestions||[])])],
      paa:[...new Set([...(extras.paa||[]),...(dfsExtraRef.current.paa||[])])],
      related:[...new Set([...(extras.related||[]),...(dfsExtraRef.current.related||[])])],
      autocomplete:[...new Set([...(extras.autocomplete||[]),...(dfsExtraRef.current.autocomplete||[])])]
    };
    /* Show merged list with all pre-selected */
    sDfsExtra(merged);dfsExtraRef.current=merged;
    sKwData(mergedKw);sSkw(preSelected);skwRef.current=preSelected;
    stopLoading();sTyp(false);setStep("kw");
    const adjustsLeft=5-currentRound;
    add("b",<div>
      {<div style={{marginBottom:6}}>Keywords updated! Your previous selections are kept. ({adjustsLeft} adjusts left)</div>}
      <BotTip short="Each keyword has search volume, competition, and priority."><div><div style={{marginBottom:6}}>Vol. — how many people search this per month.</div><div style={{marginBottom:6}}>KD — competition (0–100). Lower = easier to rank.</div><div>HV = High Volume, main keyword. MV = Medium. LV = Low.</div></div></BotTip>
      <KwS keywords={mergedKw} init={preSelected} onDone={s=>{sSkw(s);skwRef.current=s;sConfirmedKeywords(mergedKw.filter(k=>s.includes(k.keyword)));kwDone();}} onAdj={(currentSelection)=>{
        if(stepRef.current!=="kw"){console.log("[CB] onAdj blocked: step=",stepRef.current);return;}
        if(currentRound>=5){bot("You've used all adjustments. Please select from the current list.");return;}
        sSkw(currentSelection);skwRef.current=currentSelection;
        setStep("ka");bot("Just tell me what to change — add, remove, or refine keywords.");
      }}/>
      <ExtrasBlock extra={merged}/>
    </div>);
  } catch(err){
    console.error("[CB] adjust error:",err);stopLoading();sTyp(false);
    bot("Something went wrong. Try again.");setStep("kw");
  }
};

/* ═══ GENERATE TITLES ═══ */
const genTitles=async(market)=>{
  setStep("tl");startLoading(["Generating titles...","Applying SEO rules..."]);sTyp(true);
  try {
    /* Use ONLY confirmed keywords (user-selected), never all kwData */
    const selKwData=confirmedKeywords.length>0?confirmedKeywords:kwData.filter(k=>skwRef.current.includes(k.keyword));
    const selKw=selKwData.map(k=>k.keyword);
    const classified=classifyKeywords(selKwData);
    console.log("[CB] genTitles using keywords:", selKw, "primary:", classified.primary?.keyword);
    const gptRes=await callGPT("generate_titles",{
      primary_keyword:classified.primary?.keyword||selKw[0],
      secondary_keywords:classified.secondary.map(k=>k.keyword),
      supporting_keywords:classified.supporting.map(k=>k.keyword),
      page_type:ans.pt||"",page_type_details:ans.ptx||"",
      page_description:ans.pd||"",goal:ans.gl||"",audience:ans.au||"",
      tone:ans.tn||"",market:market||ans.mk||"",brand_name:brandName||null,
      previous_titles:savedTitles.length>0?savedTitles.map(t=>t.text):[],
      chat_history:buildChatHistory(msgs)
    });
    let titles=[];
    if(gptRes){
      const raw=Array.isArray(gptRes.titles)?gptRes.titles:[];
      const kwWords=[...new Set(selKw.flatMap(k=>k.toLowerCase().split(/\s+/)).filter(w=>w.length>3))];
      titles=raw.map(t=>{
        const text=typeof t==="string"?t:(t.text||t.title||String(t));
        const textLow=text.toLowerCase();
        const hl=selKw.filter(k=>textLow.includes(k.toLowerCase()));
        if(hl.length===0){kwWords.forEach(w=>{if(textLow.includes(w)&&!hl.includes(w))hl.push(w);});}
        return{text,hl};
      });
    }
    if(titles.length===0)titles=selKw.slice(0,5).map(k=>({text:k.charAt(0).toUpperCase()+k.slice(1),hl:[k]}));
    sSavedTitles(titles);
    stopLoading();sTyp(false);setStep("ti");
    add("b",<div>
      <div style={{marginBottom:6}}>Here are title options for your page.</div>
      <TSel titles={titles} onSelect={t=>{add("u",t);confirmTitle(t);}}/>
      <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
        <Btn text="Generate New Titles" onClick={()=>genTitles(ans.mk)}/>
        <Btn text="Write My Own Title" onClick={()=>{setStep("ti_custom");bot("Type your custom title below:");}}/>
      </div>
    </div>);
  } catch(err){console.error("[CB] titles error:",err);stopLoading();sTyp(false);bot("Something went wrong. Please try again.");}
};

/* ═══ CONFIRM TITLE ═══ */
const confirmTitle=async(val)=>{
  sTyp(true);
  try {
    const gptRes=await callGPT("clean_title",{user_title:val,keywords:confirmedKeywords.length>0?confirmedKeywords.map(k=>k.keyword):skwRef.current,page_type:ans.pt||"",previous_titles:savedTitles.map(t=>t.text),market:ans.mk||""});
    sTyp(false);
    if(gptRes&&gptRes.valid===false){
      bot(gptRes.error||"That doesn't look like a page title. Pick one or type your own.");
      setStep("ti");return;
    }
    const clean=gptRes?.title||val;
    sStit(clean);confirmedTitleRef.current=clean;sAns(p=>({...p,ti:clean}));
    bot(<div><div style={{fontSize:12,color:C.muted,marginBottom:4}}>Your title:</div><div style={{padding:"10px 14px",borderRadius:8,border:"1px solid rgba(110,43,255,0.2)",background:"rgba(110,43,255,0.04)",fontSize:13,fontWeight:500,color:C.dark}}>{clean}</div></div>);
    setStep("me");
    setTimeout(()=>{bot(<div><div style={{fontWeight:600,marginBottom:6}}>Last question — Any personal details, stories, or brand values?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>Names, background, mission — anything that adds personality and makes your content unique.</div><ExBox items={["I'm Maria, I roast and sell specialty coffee in Portland since 2018","We're Little Stars, an international kindergarten in Bucharest since 2010","I'm Alex, been helping startups build their brands for 8 years"]}/><div style={{display:"flex",gap:8,marginTop:6}}><Btn text="Nothing to Add" onClick={()=>{add("u","Nothing special");sAns(p=>({...p,me:""}));mk("me");askConfirm();}}/></div></div>);},800);
  } catch(e){
    sTyp(false);sStit(val);confirmedTitleRef.current=val;sAns(p=>({...p,ti:val}));
    setStep("me");
    bot(<div><div style={{fontWeight:600,marginBottom:6}}>Any personal details, stories, or brand values?</div><ExBox items={["I'm Maria, I roast and sell specialty coffee in Portland since 2018","We're Little Stars, an international kindergarten in Bucharest since 2010","I'm Alex, been helping startups build their brands for 8 years"]}/><div style={{display:"flex",gap:8,marginTop:6}}><Btn text="Nothing to Add" onClick={()=>{add("u","Nothing special");sAns(p=>({...p,me:""}));mk("me");askConfirm();}}/></div></div>);
  }
};

/* ═══ ASK CONFIRM ═══ */
const askConfirm=()=>{
  setStep("cf");
  bot(<div><div style={{marginBottom:6}}>All steps done! I have everything I need.</div><div style={{fontWeight:600,marginBottom:6}}>Ready to generate your SEO structure?</div><div style={{color:C.muted,fontSize:12,marginBottom:10}}>You can use this as a brief for your copywriter, or click Generate Content.</div><div style={{display:"flex",gap:8}}><Btn text="Generate Structure" onClick={gStr} primary/></div></div>);
};

/* ═══ GENERATE STRUCTURE ═══ */
const gStr=async()=>{
  mk("cf");setStep("sl");
  window.scrollTo({top:0,behavior:"smooth"});
  sPLoad("Building SEO structure...");startLoading(LST);sTyp(true);
  try {
    const selKw=confirmedKeywords.length>0?confirmedKeywords.map(k=>k.keyword):skwRef.current.length>0?skwRef.current:kwData.map(k=>k.keyword);
    const kwWithData=confirmedKeywords.length>0?confirmedKeywords:kwData.filter(k=>selKw.includes(k.keyword));
    const classified=classifyKeywords(kwWithData);
    const pageCfg=getPageConfig(ans.pt||"");
    const defaultLen=pageCfg?.defaultLen||"500-800 words";
    const chosenTitle=confirmedTitleRef.current||stit||ans.ti||"";
    const gptRes=await callGPT("generate_structure",{
      title:chosenTitle,
      primary_keyword:classified.primary?.keyword||selKw[0],
      secondary_keywords:classified.secondary.map(k=>k.keyword),
      supporting_keywords:classified.supporting.map(k=>k.keyword),
      keywords:kwWithData,page_type:ans.pt||"",page_type_details:ans.ptx||"",
      page_description:ans.pd||"",goal:ans.gl||"",audience:ans.au||"",tone:ans.tn||"",
      market:ans.mk||"",brand_details:ans.me||"",brand_name:brandName||null,target_length:defaultLen,
      related:dfsExtraRef.current.related||[],paa:dfsExtraRef.current.paa||[],
      autocomplete:dfsExtraRef.current.autocomplete||[],chat_history:buildChatHistory(msgs)
    });
    const buildTitleKw=(text)=>{const titleKw=[];const tl=(text||"").toLowerCase();const SW="(?:to|in|for|from|during|of|the|a|and|on|with|by|our|my|your|its|this|that)";kwWithData.forEach(k=>{const kl=k.keyword.toLowerCase();if(tl.includes(kl)){titleKw.push({text:k.keyword,freq:k.freq||"MV"});}else{const words=kl.split(/\s+/).filter(w=>w.length>0);if(words.length>=2){const escaped=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));const softRe=new RegExp(escaped.join(`(?:\\s+${SW}){0,3}\\s+`),'i');if(softRe.test(tl)){titleKw.push({text:k.keyword,freq:k.freq||"MV"});return;}}words.filter(w=>w.length>3&&tl.includes(w)).forEach(w=>{if(!titleKw.find(x=>x.text===w))titleKw.push({text:w,freq:k.freq||"MV"});});}});return titleKw;};
    let briefData;
    if(gptRes&&(gptRes.title||gptRes.sections)){
      briefData={
        title:chosenTitle||gptRes.title||"Untitled",titleKw:buildTitleKw(chosenTitle||gptRes.title),
        description:gptRes.description||gptRes.meta_description||"",descKw:buildTitleKw(gptRes.description||""),
        keywords:kwWithData,
        recs:gptRes.recs||[{key:"Length",value:gptRes.content_length||defaultLen},{key:"Tone",value:ans.tn||"Professional"},{key:"CTA",value:gptRes.cta||"Learn More"},{key:"Goal",value:ans.gl||"Inform"}],
        sections:Array.isArray(gptRes.sections)?gptRes.sections.map(s=>({level:s.level||"H2",title:s.title||"",desc:s.desc||s.description||"",kwNote:s.kwNote||null,visuals:s.visuals||[]})):[],
        related:[...new Set([...(dfsExtraRef.current.related||[]),...(Array.isArray(gptRes.related)?gptRes.related:[])])],
        paa:[...new Set([...(dfsExtraRef.current.paa||[]),...(Array.isArray(gptRes.paa)?gptRes.paa:[])])],
        autocomplete:[...new Set([...(dfsExtraRef.current.autocomplete||[]),...(Array.isArray(gptRes.autocomplete)?gptRes.autocomplete:[])])],
        contentLength:gptRes.content_length||defaultLen
      };
    } else {
      briefData={title:chosenTitle||"Untitled",titleKw:[],description:"",descKw:[],keywords:kwWithData,
        recs:[{key:"Length",value:defaultLen}],sections:[{level:"H1",title:chosenTitle,desc:"Introduction",kwNote:null,visuals:[]}],
        related:dfsExtraRef.current.related||[],paa:dfsExtraRef.current.paa||[],autocomplete:dfsExtraRef.current.autocomplete||[],contentLength:defaultLen};
    }
    sBd(briefData);sRp("br");sPLoad(null);stopLoading();sTyp(false);setStep("sr");
    if(isMobile)sMTab("panel");
    bot(<div><div style={{marginBottom:6}}>Your SEO structure is ready! {isMobile?"Switch to the Brief tab.":"Check the brief on the right."}</div><div style={{marginBottom:6}}>I recommend <strong>{briefData.contentLength}</strong> for this page.</div><div style={{color:C.muted,fontSize:12}}>You can ask me to edit the structure, or click "Generate Content" when ready.</div></div>);
  } catch(err){console.error("[CB] gStr error:",err);stopLoading();sTyp(false);sPLoad(null);bot("Something went wrong. Please try again.");}
};

/* ═══ GENERATE CONTENT ═══ */
const gCnt=async()=>{
  /* Check credits first */
  const memberId=getMemberId();
  console.log("[CB] gCnt memberId:", memberId);
  const creditCheck=await checkBuilderCredits(memberId);
  if(!creditCheck.ok){
    bot(<div><div style={{marginBottom:6}}>You've used all your Content Builder credits ({creditCheck.used}/{creditCheck.limit}).</div><div style={{color:C.muted,fontSize:12}}>Buy more credits to continue building content.</div></div>);
    return;
  }
  setStep("cl");add("b",<div style={{color:C.muted,fontSize:12}}>Researching and writing content...</div>);
  window.scrollTo({top:0,behavior:"smooth"});sPLoad("Writing your content...");startLoading(LCN);sTyp(true);
  try {
    const selKw=confirmedKeywords.length>0?confirmedKeywords.map(k=>k.keyword):kwData.filter(k=>skwRef.current.includes(k.keyword)).map(k=>k.keyword);
    let researchData=null;
    /* Deep Research: fetch SERP organic results and analyze with GPT */
    try {
      console.log("[CB] deep research: fetching SERP for:", selKw[0]);
      const locCode=parseLocationCode(ans.mk||"");
      const dfsRes=await callDFS(selKw.slice(0,3),locCode);
      const serpOrganic=dfsRes?.serp_organic||[];
      console.log("[CB] deep research: got", serpOrganic.length, "organic results");
      if(serpOrganic.length>0){
        const resGpt=await callGPT("deep_research",{
          keyword:selKw[0],serp_results:serpOrganic,page_type:ans.pt||"",
          page_description:ans.pd||"",market:ans.mk||""
        });
        if(resGpt&&(resGpt.research_brief||resGpt.suggested_mentions)){
          researchData=resGpt;
          console.log("[CB] deep research: brief ready, names:", resGpt.real_names?.length||0);
        }
      }
    } catch(e){console.log("[CB] deep research skipped:",e);}
    const kwForContent=confirmedKeywords.length>0?confirmedKeywords:kwData.filter(k=>skwRef.current.includes(k.keyword));
    const classifiedContent=classifyKeywords(kwForContent);
    /* v49: Send only primary+secondary as exact keywords (max 3, like Typebot). Supporting → individual words. Market → supporting words. */
    const exactKeywords=[classifiedContent.primary,...classifiedContent.secondary].filter(Boolean);
    const supportingWords=[...new Set([
      ...classifiedContent.supporting.flatMap(k=>(k.keyword||"").split(/\s+/).filter(w=>w.length>2)),
      ...((ans.mk||"").split(/[\s,]+/).filter(w=>w.length>2))
    ])];
    console.log("[CB] content keywords: exact=",exactKeywords.map(k=>k.keyword),"supporting_words=",supportingWords);
    /* v58: Extract min_words from structure contentLength recommendation */
    const clMatch=(bd?.contentLength||"").match(/(\d+)/);
    const minWords=clMatch?parseInt(clMatch[1]):500;
    /* v58: Build keyword placement instructions for GPT */
    const kwPlacement=[];
    /* Keyword density based on Typebot formula (chars→words): <140w=1x, 140-350w=2x, 350-700w=3x, 700-1000w=4x, 1200+=5x */
    const priCount=minWords>=1200?5:minWords>=700?4:minWords>=350?3:2;
    const secCount=minWords>=1200?3:minWords>=700?2:1;
    if(classifiedContent.primary){
      const pk=classifiedContent.primary.keyword;
      kwPlacement.push({keyword:pk,role:"primary",placement:`Insert this exact phrase ${priCount} times total: 1 time in the intro paragraph before H1, and ${priCount-1} more time(s) spread evenly across body paragraphs. Do NOT cluster them — space them out.`});
    }
    classifiedContent.secondary.forEach((k,i)=>{
      kwPlacement.push({keyword:k.keyword,role:"secondary",placement:`Insert this exact phrase ${secCount} time(s) in body paragraphs in the ${i===0?"first":"second"} half of the content.`});
    });
    if(classifiedContent.supporting.length>0){
      kwPlacement.push({keywords:classifiedContent.supporting.map(k=>k.keyword),role:"supporting",placement:"Do NOT insert as exact phrases. Use only individual words from these keywords naturally throughout the text."});
    }
    console.log("[CB] kwPlacement:",JSON.stringify(kwPlacement));
    console.log("[CB] === KEYWORDS SENT TO GPT ===");
    kwPlacement.forEach((kw,i)=>{
      if(kw.role==="supporting"){console.log(`  [supporting] words from: ${kw.keywords?.join(", ")||"none"}`);}
      else{console.log(`  [${kw.role}] "${kw.keyword}" → ${kw.placement}`);}
    });
    console.log("[CB] ==============================");
    const gptRes=await callGPT("generate_content",{
      structure:bd,
      primary_keyword:classifiedContent.primary?.keyword||"",
      secondary_keywords:classifiedContent.secondary.map(k=>k.keyword),
      supporting_keywords:classifiedContent.supporting.map(k=>k.keyword),
      keywords:exactKeywords,
      supporting_words:supportingWords,
      keyword_placement:kwPlacement,
      min_words:minWords,
      page_type:ans.pt||"",goal:ans.gl||"",audience:ans.au||"",tone:ans.tn||"",
      market:ans.mk||"",brand_details:ans.me||"",brand_name:brandName||null,
      title:confirmedTitleRef.current||bd?.title||"",
      research:researchData,chat_history:buildChatHistory(msgs)
    });
    let html="";
    if(gptRes){html=gptRes.html||gptRes.content||gptRes.text||"";if(typeof html!=="string")html=JSON.stringify(html);}
    if(!html||html.length<50)html="<h1>"+(bd?.title||"Content")+"</h1><p>Content generation in progress. Please try again.</p>";
    /* v50: H3 post-processing — convert bold paragraphs back to <h3> for known H3 headings from structure */
    if(bd?.sections?.length>0){
      const h3titles=bd.sections.filter(s=>s.level==="H3"||s.level==="h3").map(s=>s.title).filter(Boolean);
      h3titles.forEach(h3=>{
        const esc=h3.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        /* Match: <p><strong>heading</strong></p> or <p><b>heading</b></p> */
        const re=new RegExp(`<p>\\s*<(strong|b)>\\s*${esc}\\s*</(strong|b)>\\s*</p>`,'gi');
        html=html.replace(re,`<h3>${h3}</h3>`);
      });
    }
    /* v49: Keyword spam postprocessor — count exact phrases, auto-fix if overspammed */
    if(html.length>50){
      try{
        const stripHtml=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').toLowerCase();
        const kwForCheck=kwForContent||[];
        const pageType=(ans.pt||"").toLowerCase();
        /* Limits by page type */
        const maxPrimary=pageType.includes("about")?1:pageType.includes("article")||pageType.includes("blog")?2:pageType.includes("homepage")||pageType.includes("service")?2:1;
        const maxSecondary=pageType.includes("about")?0:pageType.includes("article")||pageType.includes("blog")?2:1;
        const spamIssues=[];
        kwForCheck.forEach(k=>{
          if(!k.keyword)return;
          const kw=k.keyword.toLowerCase();
          const re=new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}\\b`,'gi');
          const matches=stripHtml.match(re);
          const count=matches?matches.length:0;
          const maxAllowed=k.freq==="HV"?maxPrimary:k.freq==="MV"?maxSecondary:0;
          if(count>Math.max(maxAllowed,1)){
            spamIssues.push({keyword:k.keyword,count,max:maxAllowed});
          }
        });
        /* Also check individual word spam (any word > 6 times) */
        const wordCount={};
        const stopWords=new Set(["the","a","an","and","or","is","are","was","were","be","been","being","in","on","at","to","for","of","with","by","from","as","into","that","this","it","its","our","your","we","you","they","them","their","has","have","had","not","but","if","can","will","all","each","how","what","when","who","which","do","does","did"]);
        stripHtml.split(/\s+/).forEach(w=>{const clean=w.replace(/[^a-z]/g,'');if(clean.length>2&&!stopWords.has(clean)){wordCount[clean]=(wordCount[clean]||0)+1;}});
        const wordSpam=Object.entries(wordCount).filter(([w,c])=>c>6).sort((a,b)=>b[1]-a[1]);
        if(spamIssues.length>0||wordSpam.length>0){
          console.log("[CB] spam detected:",JSON.stringify({phrases:spamIssues,words:wordSpam.slice(0,5)}));
          /* Build specific tweak instruction */
          let fixInstructions=[];
          spamIssues.forEach(s=>{
            const reduce=s.count-s.max;
            fixInstructions.push(`Reduce exact phrase "${s.keyword}" from ${s.count} to maximum ${s.max} occurrences. Replace ${reduce} of them with synonyms, pronouns, or remove them.`);
          });
          wordSpam.slice(0,3).forEach(([w,c])=>{
            fixInstructions.push(`The word "${w}" appears ${c} times — reduce to 4-5 by using synonyms or removing.`);
          });
          if(fixInstructions.length>0){
            console.log("[CB] auto-fixing spam with tweak...");
            const fixRes=await callGPT("tweak",{
              current_content:html,
              request:"AUTOMATIC KEYWORD SPAM FIX. Make these changes WITHOUT altering the structure, tone, or meaning:\\n"+fixInstructions.join("\\n"),
              keywords:kwForCheck,structure:bd
            });
            if(fixRes){
              const fixedHtml=fixRes.html||fixRes.content||fixRes.text||"";
              if(typeof fixedHtml==="string"&&fixedHtml.length>50){
                console.log("[CB] spam fix applied, old="+html.length+" new="+fixedHtml.length);
                html=fixedHtml;
              }
            }
          }
        } else {
          console.log("[CB] keyword density OK, no spam detected");
        }
      }catch(spamErr){console.log("[CB] spam check error (non-blocking):",spamErr);}
    }
    sContentHtml(html);sRp("ct");sPLoad(null);stopLoading();sTyp(false);setStep("cr");
    /* Deduct 1 credit after successful generation */
    try{const r=await trackBuilderUsage(memberId);if(r&&r.success)console.log("[CB] credit deducted:",r.used+"/"+r.limit);}catch(e){}
    /* Record run in runs table for Launch History */
    try{
      const title=confirmedTitleRef.current||bd?.title||"Content Builder";
      await fetch("https://empuzslozakbicmenxfo.supabase.co/rest/v1/rpc/insert_cb_run",{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+SUPABASE_KEY,"apikey":SUPABASE_KEY},
        body:JSON.stringify({p_member_id:memberId,p_title:title})
      });
      console.log("[CB] run recorded");
    }catch(e){console.error("[CB] run record error:",e);}
    if(isMobile)sMTab("panel");
    bot(<div><div style={{marginBottom:6}}>Your full content is ready!</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>I slightly adjusted some headings to distribute your keywords evenly across the page — this helps with SEO.</div><div style={{color:C.muted,fontSize:12}}>Want changes? Just describe what to fix.</div></div>);
  } catch(err){console.error("[CB] gCnt error:",err);stopLoading();sTyp(false);sPLoad(null);bot("Something went wrong. Please try again.");}
};

/* ═══ TWEAK (structure or content) ═══ */
const handleStructureTweak=async(text)=>{
  sTyp(true);
  try {
    const chosenTitle=confirmedTitleRef.current||stit||ans.ti||"";
    const kwWithData=confirmedKeywords.length>0?confirmedKeywords:kwData.filter(k=>skwRef.current.includes(k.keyword));
    const gptRes=await callGPT("generate_structure",{
      title:chosenTitle,keywords:kwWithData,page_type:ans.pt||"",page_description:ans.pd||"",
      goal:ans.gl||"",audience:ans.au||"",tone:ans.tn||"",brand_details:ans.me||"",
      target_length:bd?.contentLength||"500-800 words",
      related:dfsExtraRef.current.related||[],paa:dfsExtraRef.current.paa||[],
      autocomplete:dfsExtraRef.current.autocomplete||[],
      tweak_request:text,current_structure:JSON.stringify(bd?.sections||[]),chat_history:buildChatHistory(msgs)
    });
    sTyp(false);
    if(gptRes&&(gptRes.title||gptRes.sections)){
      const buildKw=(t)=>{const kw=[];const tl=(t||"").toLowerCase();const SW="(?:to|in|for|from|during|of|the|a|and|on|with|by|our|my|your|its|this|that)";kwWithData.forEach(k=>{const kl=k.keyword.toLowerCase();if(tl.includes(kl))kw.push({text:k.keyword,freq:k.freq||"MV"});else{const words=kl.split(/\s+/).filter(w=>w.length>0);if(words.length>=2){const escaped=words.map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));const softRe=new RegExp(escaped.join(`(?:\\s+${SW}){0,3}\\s+`),'i');if(softRe.test(tl)){kw.push({text:k.keyword,freq:k.freq||"MV"});return;}}words.filter(w=>w.length>3&&tl.includes(w)).forEach(w=>{if(!kw.find(x=>x.text===w))kw.push({text:w,freq:k.freq||"MV"});});}});return kw;};
      sBd(prev=>({...prev,title:gptRes.title||chosenTitle,titleKw:buildKw(gptRes.title||chosenTitle),
        description:gptRes.description||prev?.description||"",descKw:buildKw(gptRes.description||""),
        sections:Array.isArray(gptRes.sections)?gptRes.sections.map(s=>({level:s.level||"H2",title:s.title||"",desc:s.desc||s.description||"",kwNote:s.kwNote||null,visuals:s.visuals||[]})):prev?.sections||[],
        contentLength:gptRes.content_length||prev?.contentLength||"500-800 words"}));
      bot("Done! Structure updated. Check the right panel.");
    } else {bot("I couldn't update the structure. Try describing the change differently.");}
  } catch(err){console.error("[CB] sr tweak:",err);sTyp(false);bot("Something went wrong. Try again.");}
};

const handleContentTweak=async(text)=>{
  sTyp(true);const newCount=tweakCount+1;sTweakCount(newCount);
  try {
    const gptRes=await callGPT("tweak",{
      current_content:contentHtml,request:text,
      keywords:confirmedKeywords.length>0?confirmedKeywords:kwData.filter(k=>skwRef.current.includes(k.keyword)),
      structure:bd,chat_history:buildChatHistory(msgs)
    });
    sTyp(false);
    if(gptRes){
      const newHtml=gptRes.html||gptRes.content||gptRes.text||contentHtml;
      if(typeof newHtml==="string"&&newHtml.length>50){sContentHtml(newHtml);add("b","Done! Content updated.");}
      else{add("b","I made some adjustments. Check the content panel.");}
    } else {add("b","Couldn't process that. Try describing the change differently.");}
  } catch(err){console.error("[CB] tweak:",err);sTyp(false);add("b","Something went wrong. Try again.");}
};

/* ═══ RESET ═══ */
const reset=()=>{
  setStep("init");sMsgs([]);sTyp(false);sAns({});sKwData([]);sDfsExtra({});dfsExtraRef.current={};sSkw([]);skwRef.current=[];sStit(null);confirmedTitleRef.current=null;sConfirmedKeywords([]);sBrandName(null);sCleanedBrand("");sSavedTitles([]);sBd(null);sContentHtml(null);sRp("ph");sLs(-1);sLst([]);sDn({});sMTab("chat");sPLoad(null);sTweakCount(0);sAdjustRound(0);
  setTimeout(()=>{sTyp(true);setTimeout(()=>{sTyp(false);add("b",mn?`Hey ${mn}!`:"Hey!");sTyp(true);},1000);setTimeout(()=>{sTyp(false);add("b",<div><div style={{fontWeight:600}}>Do you have keywords or should I find them?</div></div>);setStep("ec");},2500);},100);
};

/* ═══════════════════════════════════════════════════════════
   SEND — v48: Phase 1 = strict (no chat). Phase 2 = tweak + questions.
   ═══════════════════════════════════════════════════════════ */
const send=()=>{
  const el=inpRef.current;if(!el||!el.value.trim())return;
  const t=el.value.trim();el.value="";el.style.height="auto";
  add("u",t);

  /* === PHASE 1: strict linear — input = answer === */

  if(step==="ec"){
    const tl=t.toLowerCase().trim();
    if(/\b(find|search|suggest|help|generate)\b/i.test(tl)){mk("e");setStep("pt");bot(<div><div style={{color:C.muted,fontSize:12,marginBottom:8}}>To find the right keywords, I need to understand your page.</div><div style={{fontWeight:600,marginBottom:6}}>What type of page are you working on?</div><ExBox items={HINTS.page_type}/></div>);return;}
    if(/\b(my|own|have|paste|use)\b/i.test(tl)||t.includes(",")){mk("e");setStep("ok");bot(<div>Paste your target keywords below, separated by commas.</div>);return;}
    bot(<div>Please choose: do you want me to find keywords, or do you have your own?</div>);return;
  }

  if(step==="ok"){
    setStep("kl");startLoading(LKW);sTyp(true);
    (async()=>{
      try {
        const rawKw=t.split(/[,\n]+/).map(k=>k.trim()).filter(Boolean);
        const{enriched,extras}=await enrichWithDFS(rawKw,parseLocationCode(ans.mk||""));
        showKeywords(enriched,extras,5);
      } catch(err){console.error("[CB] ok error:",err);stopLoading();sTyp(false);bot("Something went wrong. Try again.");}
    })();return;
  }

  if(step==="pt"){
    sAns(p=>({...p,pt:t}));mk("pt");
    const cfg=getPageConfig(t);
    if(cfg){setStep("ptx");bot(<div><div style={{fontWeight:600,marginBottom:6}}>{cfg.extraQ}</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>This helps me find keywords people actually search for in Google.</div><ExBox items={cfg.hints}/></div>);}
    else{setStep("pd");bot(<div><div style={{fontWeight:600,marginBottom:6}}>Tell me more about your page:</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>A short description helps me find the most relevant keywords.</div><ExBox items={["Handmade wooden rings with resin inlays","Vegan bakery in Brooklyn","Travel blog about Southeast Asia","Online yoga classes for beginners","Pet grooming salon in London"]}/></div>);}
    return;
  }

  if(step==="ptx"){
    sAns(p=>({...p,ptx:t}));mk("ptx");
    if(t.length>15){
      setStep("pd");bot(<div>Got it! Anything else to add, or should I find keywords?<div style={{display:"flex",gap:8,marginTop:6}}><Btn text="Find Keywords" onClick={()=>{sAns(p=>({...p,pd:t}));startKwGeneration(t);}}/></div></div>);
    } else {
      setStep("pd");bot(<div><div style={{fontWeight:600,marginBottom:6}}>Describe your page briefly:</div><ExBox items={["Handmade wooden rings with resin inlays","Vegan bakery in Brooklyn","Travel blog about Southeast Asia","Online yoga classes for beginners","Pet grooming salon in London"]}/></div>);
    }
    return;
  }

  if(step==="pd"){sAns(p=>({...p,pd:t}));mk("pd");startKwGeneration(t);return;}

  if(step==="ka"){doAdjust(t);return;}

  if(step==="gl"){sAns(p=>({...p,gl:t}));mk("gl");setStep("au");bot(<div><div style={{fontWeight:600,marginBottom:6}}>Step 2 of 4 — Who is your target audience?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>This affects tone, word choice, and how the content speaks to visitors.</div><ExBox items={["Women 25-40","Young travelers","Small business owners","Parents with kids","Tech professionals"]}/></div>);return;}

  if(step==="au"){sAns(p=>({...p,au:t}));mk("au");setStep("tn");bot(<div><div style={{fontWeight:600,marginBottom:6}}>Step 3 of 4 — How should the content sound?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>The right tone makes your page feel authentic to your audience.</div><ExBox items={["Professional and clear","Friendly and casual","Fun and playful","Warm and personal","Bold and confident"]}/><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><UBtn onUpload={f=>{add("u",`Uploaded: ${f.name}`);}}/></div></div>);return;}

  if(step==="tn"){sAns(p=>({...p,tn:t}));mk("tn");setStep("mk");bot(<div><div style={{fontWeight:600,marginBottom:6}}>Step 4 of 4 — What country or market are you targeting?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>This affects keyword data and language.</div><ExBox items={["US","UK","Germany","France","Global"]}/></div>);return;}

  if(step==="mk"){sAns(p=>({...p,mk:t}));mk("mk");genTitles(t);return;}

  if(step==="ti"){confirmTitle(t);return;}

  if(step==="me"){
    sAns(p=>({...p,me:t}));mk("me");
    /* Clean brand details via GPT */
    (async()=>{
      try {
        const res=await callGPT("clean_brand_details",{raw_input:t});
        if(res&&res.brand_details){
          sCleanedBrand(res.brand_details);
          if(res.brand_name)sBrandName(res.brand_name);
          sAns(p=>({...p,me:res.brand_details}));
          console.log("[CB] brand cleaned:", res.brand_details, "name:", res.brand_name);
        }
      } catch(e){console.log("[CB] brand clean skipped:",e);}
      askConfirm();
    })();
    return;
  }

  if(step==="cf"){gStr();return;}

  /* === PHASE 2: chat open — tweak or question === */

  /* Detect "start new" requests */
  const isNewReq=(t)=>{const tl=t.toLowerCase();return/\b(new (text|content|page|article|post)|start over|write another|another (text|page|content|article)|begin again|fresh start|restart|new topic|different (page|topic|text))\b/i.test(tl);};

  if((step==="sr"||step==="cr")&&isNewReq(t)){
    sTyp(true);
    (async()=>{
      try{
        const crd=await checkBuilderCredits(memberId);
        sTyp(false);
        if(!crd.ok){
          bot(<div><div style={{marginBottom:6}}>You've used all your Content Builder credits ({crd.used}/{crd.limit}).</div><div style={{color:C.muted,fontSize:12}}>Buy more credits to continue building content.</div></div>);
        }else{
          bot(<div><div style={{marginBottom:6}}>You have <strong>{crd.limit-crd.used}</strong> Content Builder credits remaining.</div><div style={{color:C.muted,fontSize:12,marginBottom:8}}>Starting a new content session will use 2 credits.</div><div style={{display:"flex",gap:8}}><Btn text="Start New Content" primary onClick={()=>{add("u","Start new");setStep("ec");sRp(null);sBd(null);sStit("");confirmedTitleRef.current="";sAns({});sKwData([]);skwRef.current=[];sConfirmedKw([]);dfsExtraRef.current={};sMsgs([]);sPLoad(null);setContentHtml("");bot(<div><div style={{marginBottom:6}}>Hey! Let's build new SEO content.</div><div style={{fontWeight:600,marginBottom:6}}>Do you have keywords or should I find them?</div></div>);}}/><Btn text="Stay Here" onClick={()=>{bot("No problem! You can keep editing your current content.");}}/></div></div>);
        }
      }catch(e){sTyp(false);bot("Something went wrong checking credits. Try again.");}
    })();
    return;
  }

  if(step==="sr"){
    if(isQuestion(t)){handleAiChat(t);}
    else{handleStructureTweak(t);}
    return;
  }

  if(step==="cr"){
    if(isQuestion(t)){handleAiChat(t);}
    else{handleContentTweak(t);}
    return;
  }

  /* Step ti_custom: user types custom title */
  if(step==="ti_custom"){
    confirmTitle(t);
    return;
  }

  /* Step kw: any text input = adjust request */
  if(step==="kw"){
    doAdjust(t);
    return;
  }

  /* Step ti: any text input = custom title */
  if(step==="ti"){
    confirmTitle(t);
    return;
  }

  /* Fallback */
  bot("Please follow the current step to continue.");
};

/* ═══ START KEYWORD GENERATION ═══ */
const startKwGeneration=async(pageDesc)=>{
  setStep("kl");startLoading(LKW);sTyp(true);
  try {
    const gptRes=await callGPT("generate_keywords",{
      page_type:ans.pt||"",page_description:pageDesc,page_type_details:ans.ptx||"",
      chat_history:buildChatHistory(msgs)
    });
    let rawKw=[];
    if(gptRes){rawKw=Array.isArray(gptRes.keywords)?gptRes.keywords.map(k=>typeof k==="string"?k:k.keyword||String(k)):typeof gptRes.text==="string"?gptRes.text.split(/[,\n]+/).map(k=>k.trim()).filter(Boolean):[];}
    if(rawKw.length===0)rawKw=[pageDesc];
    const{enriched,extras}=await enrichWithDFS(rawKw,parseLocationCode(ans.mk||""));
    showKeywords(enriched,extras,5);
  } catch(err){console.error("[CB] kw gen error:",err);stopLoading();sTyp(false);bot("Something went wrong. Try again.");}
};

/* ═══ RENDER ═══ */
const lastBotIdx=msgs.reduce((acc,m,i)=>m.f==="b"?i:acc,-1);
const phase2=step==="sr"||step==="cr";
const chatMessages=<React.Fragment><style>{`.cb-past-msg{opacity:0.75}.cb-past-msg button:not(.bot-tip-expand){pointer-events:none!important;cursor:default!important;opacity:0.5}.cb-past-msg [onclick]{pointer-events:none!important;cursor:default!important}.cb-past-msg .bot-tip-expand,.cb-past-msg details>summary{pointer-events:auto!important;cursor:pointer!important}`}</style>{msgs.map((m,i)=>m.f==="b"?<div key={m.id} className={i<lastBotIdx?"cb-past-msg":undefined}><BB>{typeof m.c==="string"?m.c.split("\n").map((line,j)=><span key={j}>{j>0&&<br/>}{line}</span>):m.c}</BB></div>:<UB key={m.id} n={mn}>{m.c}</UB>)}{ls>=0&&lst.length>0&&<div style={{maxWidth:"95%",alignSelf:"flex-start"}}><LB step={ls} total={lst.length} text={lst[ls]} waiting={lsWaiting}/></div>}{typ&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`}}><div className="typing-dots"><span/><span/><span/></div></div></div>}{step==="ec"&&!dn.e&&<div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}><Btn text="Find Keywords" onClick={()=>{add("u","Find Keywords");mk("e");setStep("pt");bot(<div><div style={{color:C.muted,fontSize:12,marginBottom:8}}>To find the right keywords, I need to understand your page.</div><div style={{fontWeight:600,marginBottom:6}}>What type of page are you working on?</div><ExBox items={HINTS.page_type}/></div>);}}/><Btn text="Use My Keywords" onClick={()=>{add("u","Use My Keywords");mk("e");setStep("ok");bot(<div>Paste your target keywords below, separated by commas.</div>);}}/></div>}</React.Fragment>;

const panelContent=<React.Fragment>{pLoad?<LoadingPanel text={pLoad}/>:rp==="br"&&bd?<div style={{animation:"fadeIn 0.5s ease"}}><BriefPanel d={bd} kwData={kwData}/></div>:rp==="ct"&&bd?<div style={{animation:"fadeIn 0.5s ease"}}><ContentPanel html={contentHtml} d={bd} kwData={kwData}/></div>:<Placeholder/>}<style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style></React.Fragment>;

const inputPlaceholder=step==="kw"?"Select keywords above, or click Adjust":step==="ti"?"Pick a title above, or click buttons below":phase2?(step==="cr"?"Describe changes or ask a question...":"Edit structure or ask a question..."):"Type your answer...";
const inputDisabled=step==="kw"||step==="ti";

return<div style={{fontFamily:"'DM Sans',sans-serif",flex:1,display:"flex",flexDirection:"column"}}>
<div style={{padding:isMobile?"0 12px 6px":"0 24px 10px",display:"flex",alignItems:"center",gap:6,maxWidth:1224,margin:"0 auto",width:"100%"}}><button onClick={onHome} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:C.muted,display:"flex"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button><span style={{fontSize:13,fontWeight:500,color:C.muted}}>Content Builder</span>{rp==="br"&&<span style={{fontSize:10,fontWeight:600,color:"#9B7AE6",background:"rgba(155,122,230,0.08)",padding:"3px 8px",borderRadius:10,marginLeft:4}}>Structure Ready</span>}{rp==="ct"&&<span style={{fontSize:10,fontWeight:600,color:"#9B7AE6",background:"rgba(155,122,230,0.08)",padding:"3px 8px",borderRadius:10,marginLeft:4}}>Content Ready</span>}</div>
{!isMobile&&<div style={{display:"flex",padding:"0 24px 24px",maxWidth:1224,margin:"0 auto",width:"100%",alignItems:"flex-start",gap:12}}>
<div id="cb-chat" style={{width:"35%",maxWidth:420,position:"sticky",top:12,display:"flex",flexDirection:"column",flexShrink:0,minWidth:280,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.card,height:"calc(100vh - 130px)"}}><div ref={cr} className="iva-scroll-inner" style={{flex:1,padding:"16px 12px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>{chatMessages}</div><div style={{padding:"8px 12px 12px",flexShrink:0,borderTop:`1px solid ${C.border}`}}><div style={{display:"flex",gap:8}}><textarea ref={inpRef} rows={1} defaultValue="" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}} disabled={inputDisabled} placeholder={inputPlaceholder} style={{flex:1,minHeight:44,maxHeight:120,borderRadius:10,border:`1px solid ${inputDisabled?C.border:C.border}`,background:inputDisabled?"rgba(21,20,21,0.03)":C.surface,opacity:inputDisabled?0.6:1,padding:"10px 14px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",background:C.surface,resize:"none",lineHeight:1.4}} onFocus={e=>{e.target.style.borderColor=C.hoverBorder;e.target.style.boxShadow=C.hoverShadow;}} onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/><button onClick={send} style={{width:44,height:44,borderRadius:10,border:`1px solid ${C.borderMid}`,background:C.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button></div></div></div>
<div style={{flex:1,borderRadius:12,border:`1px solid ${C.border}`,position:"relative",background:C.surface,minHeight:"calc(100vh - 130px)"}}>{panelContent}{rp!=="ph"&&<div style={{position:"sticky",bottom:0,left:0,right:0,height:48,background:"linear-gradient(transparent, #ffffff)",borderRadius:"0 0 12px 12px",pointerEvents:"none"}}/>}</div>
</div>}
{isMobile&&<div style={{display:"flex",flexDirection:"column",padding:"0 12px 16px",gap:12}}>
<MobileTab active={mTab} onSwitch={sMTab} hasBrief={rp==="br"} hasContent={rp==="ct"}/>
<div style={{display:mTab==="chat"?"flex":"none",flexDirection:"column",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.card,maxHeight:"70vh"}}><div ref={mTab==="chat"?cr:null} className="iva-scroll-inner" style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>{chatMessages}</div><div style={{padding:"8px 10px 10px",flexShrink:0,borderTop:`1px solid ${C.border}`}}><div style={{display:"flex",gap:6}}><textarea ref={isMobile?inpRef:null} rows={1} defaultValue="" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}} disabled={inputDisabled} placeholder={inputPlaceholder} style={{flex:1,minHeight:42,maxHeight:120,borderRadius:10,border:`1px solid ${inputDisabled?C.border:C.border}`,background:inputDisabled?"rgba(21,20,21,0.03)":C.surface,opacity:inputDisabled?0.6:1,padding:"10px 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",background:C.surface,resize:"none",lineHeight:1.4}} onFocus={e=>{e.target.style.borderColor=C.hoverBorder;e.target.style.boxShadow=C.hoverShadow;}} onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/><button onClick={send} style={{width:42,height:42,borderRadius:10,border:`1px solid ${C.borderMid}`,background:C.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button></div></div></div>
<div style={{display:mTab==="panel"?"block":"none",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>{panelContent}</div>
</div>}
{(rp==="br"||rp==="ct")&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:isMobile?"8px 12px 16px":"8px 24px 16px",maxWidth:isMobile?"100%":1224,margin:"0 auto",width:"100%",alignItems:"center"}}>
{rp==="br"&&<button onClick={gCnt} style={{height:40,padding:"0 20px",borderRadius:10,background:C.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background="#5a22d9"} onMouseLeave={e=>e.currentTarget.style.background=C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Generate Content</button>}
{rp==="ct"&&<button onClick={reset} style={{height:40,padding:"0 20px",borderRadius:10,background:C.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background="#5a22d9"} onMouseLeave={e=>e.currentTarget.style.background=C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Start New Page</button>}
<button style={{height:40,padding:"0 20px",borderRadius:10,background:C.surface,border:`1px solid ${C.borderMid}`,color:C.dark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export PDF</button>
<button onClick={onHome} style={{height:40,padding:"0 20px",borderRadius:10,background:C.surface,border:`1px solid ${C.borderMid}`,color:C.dark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>Try Another Tool</button>
</div>}
</div>;}

window._ContentBuilderInner = ContentBuilder;
/* Error boundary to prevent white screen */
class CBErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(error){return{hasError:true,error};}
  componentDidCatch(error,info){console.error("[CB] React crash:",error,info);}
  render(){
    if(this.state.hasError){
      return React.createElement("div",{style:{padding:40,textAlign:"center",fontFamily:"'DM Sans',sans-serif"}},
        React.createElement("div",{style:{fontSize:18,fontWeight:700,color:"#151415",marginBottom:8}},"Something went wrong"),
        React.createElement("div",{style:{fontSize:13,color:"#928E95",marginBottom:16}},"Please refresh the page to start over."),
        React.createElement("button",{onClick:()=>window.location.reload(),style:{padding:"10px 24px",borderRadius:10,background:"#6E2BFF",color:"#fff",border:"none",fontSize:13,fontWeight:600,cursor:"pointer"}},"Refresh Page"),
        React.createElement("div",{style:{fontSize:10,color:"#928E95",marginTop:12}},String(this.state.error))
      );
    }
    return this.props.children;
  }
}
function ContentBuilderSafe(props){
  return React.createElement(CBErrorBoundary,null,React.createElement(window._ContentBuilderInner,props));
}
window.ContentBuilder = ContentBuilderSafe;
})();
