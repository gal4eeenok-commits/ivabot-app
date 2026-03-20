/* IvaBot Content Builder v34 — deep research + all UI fixes */
const{useState,useRef,useEffect,useCallback}=React;
console.log("[IvaBot] content-builder.js v34 loaded");

/* ═══ CONFIG ═══ */
const CB_WEBHOOK_URL = "https://hook.eu2.make.com/gqqiiji1qrcqp7o23x45bmdjb6on6tzt";
const CB_CHAT_URL = "https://hook.eu2.make.com/v14qvdq3l3mu2hjevrc7dps9j74a6lkf";
const CB_RESEARCH_URL = "https://hook.eu2.make.com/l2oskfgirlj3twospfbjt5ada9vstsf5";
const DFS_PROXY = "https://empuzslozakbicmenxfo.supabase.co/functions/v1/dataforseo-proxy";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";

/* ═══ COLORS ═══ */
const C={bg:"#FBF5FF",surface:"#ffffff",accent:"#6E2BFF",accentLight:"#f3f0fd",dark:"#151415",muted:"#928E95",border:"rgba(21,20,21,0.08)",borderMid:"rgba(21,20,21,0.12)",card:"#F0EAFF",cardBorder:"rgba(110,43,255,0.08)",hoverBorder:"rgba(110,43,255,0.2)",hoverShadow:"0 0 0 1px rgba(110,43,255,0.2),0 8px 32px rgba(110,43,255,0.1)"};
const FC={HV:{bg:"rgba(110,43,255,0.12)",color:"#6E2BFF"},MV:{bg:"rgba(155,122,230,0.1)",color:"#9B7AE6"},LV:{bg:"rgba(184,156,240,0.12)",color:"#B89CF0"}};
const HINTS={page_type:["Product page","Service page","Blog post","About page"],goal:["Sell a product","Explain a service","Build trust","Get leads"],audience:["Professional, for B2B","Friendly, for young people","Warm, for families"]};

/* ═══ API HELPERS ═══ */
async function callGPT(step, data) {
  console.log("[CB] callGPT step:", step);
  try {
    const payload = { step, data: typeof data === "string" ? data : JSON.stringify(data) };
    /* Send critical fields as top-level so GPT sees them clearly via {{1.field}} */
    if (data && typeof data === "object") {
      if (data.brand_details !== undefined && data.brand_details !== null) payload.brand_details = data.brand_details;
      if (data.title !== undefined && data.title !== null) payload.title = data.title;
    }
    console.log("[CB] callGPT payload title:", payload.title, "step:", step);
    const res = await fetch(CB_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("GPT HTTP " + res.status);
    const raw = await res.text();
    console.log("[CB] GPT raw (" + step + "):", raw.substring(0, 300));
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch(e) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) {}
    }
    if (parsed?.gpt_raw) { const gr = parsed.gpt_raw; parsed = typeof gr === "string" ? JSON.parse(gr) : gr; }
    if (parsed?.gpt) { const gr = parsed.gpt; parsed = typeof gr === "string" ? JSON.parse(gr) : gr; }
    if (parsed?.result) { const gr = parsed.result; if (typeof gr === "string") { try { parsed = JSON.parse(gr); } catch(e) { parsed = { text: gr }; } } else { parsed = gr; } }
    return parsed || { text: raw };
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
    const res = await fetch(CB_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, chat_history: chatHistory, question })
    });
    if (!res.ok) throw new Error("Chat HTTP " + res.status);
    const raw = await res.text();
    let answer = raw;
    try { const j = JSON.parse(raw); answer = j.answer || j.result || j.text || raw; } catch(e) { answer = raw; }
    if (answer.startsWith('"') && answer.endsWith('"')) answer = answer.slice(1, -1);
    answer = answer.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\*\*/g, '').replace(/###\s?/g, '').replace(/^- /gm, '• ');
    return answer;
  } catch(e) {
    console.error("[CB] callChat error:", e);
    return null;
  }
}

/* ═══ CHAT ROUTER — parses JSON action from GPT ═══ */
async function callChatRouter(context, chatHistory, question) {
  console.log("[CB] callChatRouter:", question.substring(0, 80));
  try {
    const res = await fetch(CB_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, chat_history: chatHistory, question })
    });
    if (!res.ok) throw new Error("ChatRouter HTTP " + res.status);
    const raw = await res.text();
    console.log("[CB] Router raw:", raw.substring(0, 300));

    /* Try to parse JSON action from response */
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch(e) {
      /* GPT sometimes wraps in quotes or adds text around JSON */
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) {}
    }

    /* Handle Make's toString wrapper: {result: "..."} or {answer: "..."} */
    if (parsed && !parsed.action) {
      const inner = parsed.result || parsed.answer || parsed.text;
      if (typeof inner === "string") {
        try { parsed = JSON.parse(inner); } catch(e) {
          const m2 = inner.match(/\{[\s\S]*\}/);
          if (m2) try { parsed = JSON.parse(m2[0]); } catch(e3) {}
        }
      }
    }

    /* Valid action response */
    if (parsed && parsed.action) {
      console.log("[CB] Router action:", parsed.action);
      return parsed;
    }

    /* Fallback: treat as plain text answer */
    let fallbackText = raw;
    if (parsed) fallbackText = parsed.text || parsed.answer || parsed.result || raw;
    if (typeof fallbackText === "string") {
      if (fallbackText.startsWith('"') && fallbackText.endsWith('"')) fallbackText = fallbackText.slice(1, -1);
      fallbackText = fallbackText.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\*\*/g, '').replace(/###\s?/g, '').replace(/^- /gm, '• ');
    }
    console.log("[CB] Router fallback to answer");
    return { action: "answer", text: fallbackText };
  } catch(e) {
    console.error("[CB] callChatRouter error:", e);
    return { action: "answer", text: "Sorry, I couldn't process that. Try again." };
  }
}

/* ═══ CONTENT RESEARCH — web search for real facts ═══ */
async function callResearch(topic, keywords, pageType, market) {
  if (!CB_RESEARCH_URL) { console.log("[CB] Research URL not set, skipping"); return null; }
  console.log("[CB] callResearch topic:", topic);
  try {
    const res = await fetch(CB_RESEARCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, keywords: Array.isArray(keywords) ? keywords.join(", ") : keywords, page_type: pageType, market })
    });
    if (!res.ok) { console.log("[CB] Research HTTP", res.status); return null; }
    const raw = await res.text();
    console.log("[CB] Research raw:", raw.substring(0, 300));
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch(e) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) try { parsed = JSON.parse(m[0]); } catch(e2) {}
    }
    if (parsed?.result) {
      const inner = parsed.result;
      if (typeof inner === "string") { try { parsed = JSON.parse(inner); } catch(e) { parsed = { research_text: inner }; } }
      else { parsed = inner; }
    }
    return parsed;
  } catch(e) {
    console.error("[CB] callResearch error:", e);
    return null;
  }
}

/* Track usage: increment builder_used in Supabase usage table */
async function trackBuilderUsage(memberId) {
  if (!memberId) { console.log("[CB] trackUsage: no memberId"); return; }
  try {
    const res = await fetch(`https://empuzslozakbicmenxfo.supabase.co/rest/v1/usage?member_id=eq.${memberId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + SUPABASE_KEY,
        "apikey": SUPABASE_KEY,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ builder_used: "builder_used + 1" })
    });
    /* Supabase REST doesn't support increment via PATCH directly, use RPC or raw SQL */
    /* Fallback: read current value, increment, write back */
    const getRes = await fetch(`https://empuzslozakbicmenxfo.supabase.co/rest/v1/usage?member_id=eq.${memberId}&select=builder_used`, {
      headers: { "Authorization": "Bearer " + SUPABASE_KEY, "apikey": SUPABASE_KEY }
    });
    if (getRes.ok) {
      const rows = await getRes.json();
      const current = rows?.[0]?.builder_used || 0;
      await fetch(`https://empuzslozakbicmenxfo.supabase.co/rest/v1/usage?member_id=eq.${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_KEY,
          "apikey": SUPABASE_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ builder_used: current + 1 })
      });
      console.log("[CB] trackUsage: builder_used incremented to", current + 1);
    }
  } catch(e) {
    console.error("[CB] trackUsage error:", e);
  }
}

/* === LEGACY REGEX HELPERS (kept as offline fallback, no longer used in send()) === */
function isQuestion(text) {
  const t = text.trim().toLowerCase();
  if (t.length < 3) return false;
  /* Clear question words — always a question */
  if (/^(what|why|how|which|when|where|who|can|could|should|is|are|do|does|will|would|explain|tell me|help me|what do you mean|what('s| is) the difference)/i.test(t)) return true;
  /* Ends with ? — always a question */
  if (t.endsWith("?")) return true;
  /* Uncertainty phrases — only question when STANDALONE (no real content after) */
  if (/^(hmm|idk|unsure|confused|clarify|not sure|i('m| am) not sure|i don'?t know|i don'?t understand)[\s!.?,]*$/i.test(t)) return true;
  return false;
}
function isAcknowledgement(text) {
  const t = text.trim().toLowerCase().replace(/[!.,]+$/,"");
  const acks = ["ok","okay","got it","sure","thanks","thank you","i see","yeah","yes","yep","alright","cool","nice","great","good","right","understood","i get it","i understand","fine","noted","aha","ah","oh"];
  return acks.includes(t) || t.length < 3;
}
function isConfirmation(text) {
  const t = text.trim().toLowerCase().replace(/[!.,]+$/,"");
  return /^(yes|yeah|yep|sure|ok|okay|go|let'?s? (go|do it|do this|move|continue|proceed|start)|do it|go ahead|continue|move (on|forward)|next|proceed|let'?s? move|what'?s? next|ready|i'?m? ready|build|generate|sounds good|perfect|let'?s?)$/i.test(t);
}

/* Page type config: guided questions + content length limits */
const PAGE_TYPE_CONFIG = {
  "about page": { 
    extraQ: "What's your company/brand name? Any founder story or mission you'd like to include?",
    hints: ["Company name + founder story", "Mission and values", "Team background"],
    defaultLen: "500-800 words", maxLen: 3000
  },
  "product page": {
    extraQ: "Tell me about the product: name, price range, key features, sizes or variants?",
    hints: ["Product name + price", "Key features + materials", "Sizes / variants"],
    defaultLen: "300-600 words", maxLen: 2500
  },
  "service page": {
    extraQ: "What service do you offer? Any pricing model, service area, or process details?",
    hints: ["Service name + pricing", "Service area / location", "Process / how it works"],
    defaultLen: "500-1000 words", maxLen: 4000
  },
  "blog post": {
    extraQ: "What's the main topic or angle? Any specific points you want to cover?",
    hints: ["Main topic / angle", "Key points to cover", "Target reader"],
    defaultLen: "1000-2000 words", maxLen: 11000
  },
  "landing page": {
    extraQ: "What's the main offer or CTA? Any urgency, deadline, or special deal?",
    hints: ["Main offer / CTA", "Urgency / deadline", "Key benefit"],
    defaultLen: "500-1000 words", maxLen: 4000
  },
  "category page": {
    extraQ: "How many products/items in this category? Any filters like price range or type?",
    hints: ["Number of products", "Category structure", "Filters (price, type)"],
    defaultLen: "300-500 words", maxLen: 2000
  }
};
function getPageConfig(pt) {
  if (!pt) return null;
  const t = pt.toLowerCase().trim();
  for (const [key, cfg] of Object.entries(PAGE_TYPE_CONFIG)) {
    if (t.includes(key) || key.includes(t.replace(" page",""))) return cfg;
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
  return msgs.filter(m => typeof m.c === "string").slice(-10).map(m => `${m.f === "b" ? "IvaBot" : "User"}: ${m.c}`).join("\n");
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
const QM=({text})=>{const[s,ss]=useState(false);const r=useRef(null);return<span ref={r} style={{position:"relative",display:"inline-flex",alignItems:"center",verticalAlign:"middle"}} onMouseEnter={()=>ss(true)} onMouseLeave={()=>ss(false)} onClick={()=>ss(!s)}><span style={{width:16,height:16,borderRadius:"50%",border:`1px solid ${C.borderMid}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:C.muted,cursor:"help",marginLeft:4,verticalAlign:"middle"}}>?</span>{s&&<span style={{position:"fixed",top:r.current?r.current.getBoundingClientRect().bottom+8:0,left:r.current?Math.min(r.current.getBoundingClientRect().left,window.innerWidth-260):0,background:C.surface,color:C.dark,padding:"10px 14px",borderRadius:10,fontSize:11,lineHeight:1.5,width:240,zIndex:9999,fontWeight:400,boxShadow:"0 4px 24px rgba(0,0,0,0.14)",border:`1px solid ${C.border}`,pointerEvents:"none",whiteSpace:"normal"}}>{text}</span>}</span>;};

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
const ExBox=({items})=><div style={{padding:"8px 12px",borderRadius:8,border:`1px dashed ${C.border}`,background:"transparent",marginBottom:6}}><div style={{fontSize:10,fontWeight:500,color:C.muted,marginBottom:4}}>Examples:</div><div style={{fontSize:11,color:C.muted,lineHeight:1.8}}>{items.map((item,i)=><div key={i}>• {item}</div>)}</div><div style={{fontSize:10,color:"#B8B5BB",marginTop:4,fontStyle:"italic"}}>or type your own</div></div>;
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
const KwS=({keywords,init,onDone,onAdj})=>{const maxKw=7;const[s,ss]=useState(init.slice(0,maxKw));const t=k=>{ss(p=>{if(p.includes(k)){if(p.length<=2)return p;return p.filter(x=>x!==k);}if(p.length>=maxKw)return p;return[...p,k];});};return<div><div style={{fontWeight:600,marginBottom:6,fontSize:13}}>Your keywords — tap to select/deselect:</div><div style={{display:"flex",alignItems:"center",gap:6,padding:"0 10px 4px",fontSize:9,fontWeight:500,color:C.muted}}><span style={{width:16,flexShrink:0}}/><span style={{flex:1}}>Keyword</span><span style={{width:42,textAlign:"right"}}>Vol.</span><span style={{width:32,textAlign:"center"}}>KD</span><span style={{width:30,textAlign:"center"}}>Freq</span></div><div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>{keywords.slice(0,maxKw).map((k,i)=>{const a=s.includes(k.keyword);const fc=FC[k.freq]||FC.MV;return<div key={i} onClick={()=>t(k.keyword)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,border:`1px solid ${a?"rgba(110,43,255,0.2)":"rgba(21,20,21,0.06)"}`,background:a?"rgba(110,43,255,0.04)":"transparent",cursor:"pointer"}}><div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${a?C.accent:"rgba(21,20,21,0.15)"}`,background:a?C.accent:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{a&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}</div><span style={{flex:1,fontSize:12,fontWeight:500,color:a?C.dark:C.muted}}>{k.keyword}</span><span style={{width:42,textAlign:"right",fontSize:10,color:C.muted,fontWeight:600}}>{fmtVol(k.volume)}</span><span style={{width:32,textAlign:"center",fontSize:10,color:C.muted}}>{fmtKd(k.kd)}</span><span style={{width:30,textAlign:"center"}}><span style={{fontSize:9,fontWeight:600,color:fc.color,background:fc.bg,padding:"2px 6px",borderRadius:4}}>{k.freq}</span></span></div>;})}</div><div style={{fontSize:12,color:C.dark,marginBottom:8}}>Select 2 to 7 keywords. {s.length} selected.</div><div style={{display:"flex",gap:8}}><Btn text="Build With These" onClick={()=>onDone(s)} primary/><Btn text="Adjust" onClick={onAdj}/></div></div>;};

/* ═══ HIGHLIGHT HELPERS ═══ */
const HlT=({text,hl})=>{if(!hl?.length)return<span>{text}</span>;const p=[];let r=text;hl.forEach(h=>{const i=r.toLowerCase().indexOf(h.toLowerCase());if(i>=0){if(i>0)p.push({t:r.slice(0,i),h:false});p.push({t:r.slice(i,i+h.length),h:true});r=r.slice(i+h.length);}});if(r)p.push({t:r,h:false});return<span>{p.map((x,i)=>x.h?<span key={i} style={{background:"rgba(110,43,255,0.1)",color:C.accent,padding:"1px 3px",borderRadius:3}}>{x.t}</span>:<span key={i}>{x.t}</span>)}</span>;};
const TSel=({titles,onSelect})=><div><div style={{fontWeight:600,marginBottom:8,fontSize:13}}>Choose a title for your page:</div><div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:6}}>{titles.map((t,i)=><div key={i} onClick={()=>onSelect(t.text)} style={{padding:"9px 12px",borderRadius:8,border:`1px solid ${C.border}`,background:C.surface,fontSize:12.5,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.hoverBorder;e.currentTarget.style.background=C.accentLight;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.surface;}}><HlT text={t.text} hl={t.hl}/></div>)}</div><div style={{fontSize:10,color:C.muted}}>Or type your own title below</div></div>;
const VI=({type})=>{const s={width:11,height:11,viewBox:"0 0 24 24",fill:"none",stroke:"#928E95",strokeWidth:"1.5"};const m={image:<svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,video:<svg {...s}><polygon points="23 7 16 12 23 17"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,list:<svg {...s}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>,table:<svg {...s}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,quote:<svg {...s}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,faq:<svg {...s}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>};return m[type]||m.image;};
const hlF=(text,kd)=>{if(!text||!kd?.length)return text;let p=[{t:text,h:false,f:null}];kd.forEach(({text:kw,freq})=>{const np=[];p.forEach(pt=>{if(pt.h){np.push(pt);return;}const re=new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`,'gi');pt.t.split(re).forEach(s=>{if(s.toLowerCase()===kw.toLowerCase())np.push({t:s,h:true,f:freq});else if(s)np.push({t:s,h:false,f:null});});});p=np;});return<span>{p.map((x,i)=>{if(!x.h)return<span key={i}>{x.t}</span>;const fc=FC[x.f]||FC.MV;return<span key={i} style={{background:fc.bg,color:fc.color,padding:"1px 4px",borderRadius:3}}>{x.t}</span>;})}</span>;};
const RevealBlock=({children,delay=0})=>{const ref=useRef(null);const[vis,setVis]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.unobserve(el);}},{threshold:0.08});obs.observe(el);return()=>obs.disconnect();},[]);return<div ref={ref} style={{opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(28px)",transition:`opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s`}}>{children}</div>;};
const LoadingPanel=({text})=><div style={{minHeight:"calc(100vh - 130px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:40,height:40,borderRadius:"50%",border:"3px solid rgba(110,43,255,0.1)",borderTopColor:C.accent,animation:"spin 0.8s linear infinite",marginBottom:16}}/><div style={{fontSize:13,fontWeight:500,color:C.dark,marginBottom:4}}>{text||"Generating..."}</div><div style={{fontSize:12,color:C.muted}}>This usually takes a few seconds</div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
const Placeholder=()=><div style={{minHeight:"calc(100vh - 180px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:64,height:64,borderRadius:16,background:"rgba(110,43,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div><div style={{fontSize:18,fontWeight:700,color:C.dark,marginBottom:8}}>Your content will appear here</div><div style={{fontSize:13,color:C.muted,lineHeight:1.6,textAlign:"center",maxWidth:320,marginBottom:24}}>Answer the questions on the left, and I'll build your SEO brief and content step by step.</div><div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:300}}>{[{n:"1",t:"Keywords + context",d:"Topic, audience, tone, goals"},{n:"2",t:"SEO structure",d:"Title, description, H1-H3"},{n:"3",t:"Full content",d:"Complete page text, ready to publish"}].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:"rgba(110,43,255,0.04)",border:"1px solid rgba(110,43,255,0.08)"}}><div style={{width:24,height:24,borderRadius:"50%",background:"rgba(155,122,230,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:"#9B7AE6"}}>{s.n}</span></div><div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>{s.t}</div><div style={{fontSize:11,color:C.muted}}>{s.d}</div></div></div>)}</div></div>;

/* ═══ BRIEF & CONTENT PANELS ═══ */
const BriefInner=({d,kwData:kwDataProp})=>{const[kwE,skE]=useState(false);return<div><RevealBlock><div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>SEO TITLE</div><div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13.5,fontWeight:500,color:C.dark}}>{hlF(d.title,d.titleKw)}</span><CB t={d.title}/></div></div></RevealBlock><RevealBlock delay={0.06}><div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>META DESCRIPTION</div><div style={{padding:"11px 14px",borderRadius:10,border:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}><span style={{fontSize:12.5,color:C.dark,lineHeight:1.5}}>{hlF(d.description,d.descKw)}</span><CB t={d.description}/></div></div></RevealBlock><RevealBlock delay={0.12}><div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>FOCUS KEYWORDS</div><div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"visible"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:11.5}}><thead><tr style={{borderBottom:"1px solid rgba(21,20,21,0.06)"}}><th style={{textAlign:"left",padding:"8px 12px",color:C.muted,fontWeight:500,fontSize:10}}>Keyword</th><th style={{textAlign:"center",padding:"8px 6px",color:C.muted,fontWeight:500,fontSize:10,width:55,whiteSpace:"nowrap"}}>Vol.<QM text="Monthly search volume — how many people search this per month."/></th><th style={{textAlign:"center",padding:"8px 6px",color:C.muted,fontWeight:500,fontSize:10,width:40,whiteSpace:"nowrap"}}>KD<QM text="Keyword difficulty (0–100). Lower is easier to rank for."/></th><th style={{textAlign:"center",padding:"8px 6px",color:C.muted,fontWeight:500,fontSize:10,width:45,whiteSpace:"nowrap"}}>Freq<QM text="Keyword priority. HV = High Volume, main keyword. MV = Medium, supporting. LV = Low, extra."/></th></tr></thead><tbody>{d.keywords.map((k,i)=>{const fc=FC[k.freq]||FC.MV;return<tr key={i} style={{borderBottom:i<d.keywords.length-1?"1px solid rgba(21,20,21,0.04)":"none"}}><td style={{padding:"7px 12px",color:C.dark,fontWeight:500,fontSize:12}}>{k.keyword}</td><td style={{textAlign:"center",padding:"7px",color:C.dark,fontWeight:600}}>{fmtVol(k.volume)}</td><td style={{textAlign:"center",padding:"7px",color:C.muted}}>{k.kd!=null?(typeof k.kd==="number"?k.kd:String(k.kd)):"—"}</td><td style={{textAlign:"center",padding:"7px"}}><span style={{fontSize:10,fontWeight:600,color:fc.color,background:fc.bg,padding:"2px 6px",borderRadius:4}}>{k.freq}</span></td></tr>;})}</tbody></table></div>{d.keywords.some(k=>k.volume==null)&&<div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>— = Google doesn't have enough search data for this keyword in the selected market.</div>}{d.related?.length>0&&<button onClick={()=>skE(!kwE)} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,color:C.accent,fontWeight:500,padding:"6px 0",display:"flex",alignItems:"center",gap:4,marginTop:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="2" strokeLinecap="round" style={{transform:kwE?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}><polyline points="6 9 12 15 18 9"/></svg>Additional search phrases from Google</button>}{kwE&&<div style={{marginTop:6,padding:14,borderRadius:10,background:"rgba(110,43,255,0.02)",border:`1px solid ${C.cardBorder}`,fontSize:11}}>{d.related?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>RELATED SEARCHES</div><div style={{fontSize:10.5,color:C.muted,marginBottom:6,lineHeight:1.4}}>Other searches Google considers relevant to your topic — great for subtopics and H2 ideas.</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>{d.related.map((s,i)=><span key={i} style={{padding:"4px 10px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{s}</span>)}</div></>}{d.paa?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>PEOPLE ALSO ASK</div><div style={{fontSize:10.5,color:C.muted,marginBottom:6,lineHeight:1.4}}>Real questions people ask Google about your topic — perfect for FAQ sections.</div><div style={{fontSize:11,color:C.dark,lineHeight:1.7,marginBottom:12}}>{d.paa.map((q,i)=><div key={i} style={{padding:"4px 0",borderBottom:i<d.paa.length-1?`1px solid ${C.border}`:"none"}}>• {q}</div>)}</div></>}{d.autocomplete?.length>0&&<><div style={{fontSize:9,fontWeight:600,color:C.accent,marginBottom:3,textTransform:"uppercase",letterSpacing:"0.5px"}}>AUTOCOMPLETE</div><div style={{fontSize:10.5,color:C.muted,marginBottom:6,lineHeight:1.4}}>What Google suggests as people type — shows real search patterns.</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{d.autocomplete.map((s,i)=><span key={i} style={{padding:"4px 10px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{s}</span>)}</div></>}</div>}</div></RevealBlock><RevealBlock delay={0.18}>{d.recs?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>RECOMMENDATIONS</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{d.recs.map((r,i)=><div key={i} style={{padding:"8px 10px",borderRadius:8,background:"rgba(110,43,255,0.03)",border:"1px solid rgba(110,43,255,0.06)"}}><div style={{fontSize:9,color:C.muted,textTransform:"capitalize"}}>{r.key}</div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>{r.value}</div></div>)}</div></div>}</RevealBlock><RevealBlock delay={0.24}>{d.sections?.length>0&&<div style={{marginBottom:16}}><div style={{fontSize:10,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>PAGE STRUCTURE</div>{d.sections.map((sec,i)=><div key={i} style={{padding:"14px 16px",borderRadius:10,border:`1px solid ${C.border}`,marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><span style={{fontSize:9,fontWeight:600,color:sec.level==="H1"?"#6E2BFF":"#9B7AE6",background:sec.level==="H1"?"rgba(110,43,255,0.08)":"rgba(155,122,230,0.08)",padding:"2px 6px",borderRadius:3}}>{sec.level}</span><span style={{fontSize:sec.level==="H1"?13:12.5,fontWeight:600,color:C.dark}}>{sec.title}</span></div><div style={{fontSize:11.5,color:C.muted,lineHeight:1.5,marginTop:4}}>{sec.desc}</div>{sec.kwNote&&<div style={{fontSize:10,color:C.muted,marginTop:4,fontStyle:"italic"}}>{sec.kwNote}</div>}{sec.visuals?.length>0&&<div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>{sec.visuals.map((v,j)=><span key={j} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,color:C.muted,padding:"3px 8px",borderRadius:6,background:"rgba(21,20,21,0.03)"}}><VI type={v.icon}/>{v.text}</span>)}</div>}</div>)}</div>}</RevealBlock><RevealBlock delay={0.3}><BN text="Add internal links to related pages on your site."/><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",marginBottom:8}}><BL s={16}/><span style={{fontSize:11.5,color:C.muted,lineHeight:1.5}}>After publishing, submit your page to <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{color:C.accent,textDecoration:"none"}}>Google Search Console</a>.</span></div></RevealBlock></div>;};
const BriefPanel=({d,kwData:kwDataProp})=><div style={{padding:"28px 24px"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:17,fontWeight:700,color:C.dark}}>SEO Brief</span><span style={{fontSize:10,fontWeight:500,color:C.muted,background:"rgba(21,20,21,0.04)",padding:"3px 10px",borderRadius:10}}>{d.recs?.find(r=>r.key==="Goal")?.value||"Content"}</span></div><span style={{fontSize:10,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"3px 10px",borderRadius:10,fontWeight:500}}>structure ready</span></div><BriefInner d={d} kwData={kwDataProp}/></div>;
const ContentPanel=({html,d,kwData:kwDataProp})=>{const[bo,sbo]=useState(false);const render=()=>{if(!html)return null;const secs=html.split(/(?=<h[12]>)/);return secs.map((sec,i)=>{const hm=sec.match(/<h([12])>(.*?)<\/h\1>/);const lv=hm?parseInt(hm[1]):null;const hd=hm?hm[2]:null;const body=sec.replace(/<h[12]>.*?<\/h[12]>/,"").trim();return<RevealBlock key={i} delay={i*0.08}><div style={{marginBottom:24}}>{hd&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><span style={{fontSize:9,fontWeight:600,color:lv===1?"#6E2BFF":"#9B7AE6",background:lv===1?"rgba(110,43,255,0.08)":"rgba(155,122,230,0.08)",padding:"2px 6px",borderRadius:3}}>H{lv}</span><span style={{fontSize:lv===1?18:15,fontWeight:700,color:C.dark}}>{hd}</span></div>}<div style={{fontSize:13,color:C.dark,lineHeight:1.7}} dangerouslySetInnerHTML={{__html:body.replace(/<mark data-freq="HV">(.*?)<\/mark>/g,'<span style="background:rgba(110,43,255,0.12);color:#6E2BFF;padding:1px 4px;border-radius:3px">$1</span>').replace(/<mark data-freq="MV">(.*?)<\/mark>/g,'<span style="background:rgba(155,122,230,0.1);color:#9B7AE6;padding:1px 4px;border-radius:3px">$1</span>').replace(/<mark data-freq="LV">(.*?)<\/mark>/g,'<span style="background:rgba(184,156,240,0.12);color:#B89CF0;padding:1px 4px;border-radius:3px">$1</span>').replace(/<strong>(.*?)<\/strong>/g,'<strong style="font-weight:600">$1</strong>').replace(/<ul>/g,'<ul style="padding-left:20px;margin:8px 0">').replace(/<li>/g,'<li style="margin-bottom:4px">').replace(/<blockquote>(.*?)<\/blockquote>/g,'<div style="border-left:3px solid rgba(110,43,255,0.2);padding:10px 14px;background:rgba(110,43,255,0.03);border-radius:0 8px 8px 0;margin:8px 0;font-style:italic">$1</div>').replace(/<table>/g,'<table style="width:100%;border-collapse:collapse;margin:8px 0;font-size:12px">').replace(/<th>/g,'<th style="text-align:left;padding:6px 10px;background:rgba(110,43,255,0.06);border:1px solid rgba(21,20,21,0.06);font-weight:600">').replace(/<td>/g,'<td style="padding:6px 10px;border:1px solid rgba(21,20,21,0.06)">').replace(/<details><summary>(.*?)<\/summary>/g,'<div style="border:1px solid rgba(21,20,21,0.08);border-radius:8px;margin:4px 0"><div style="padding:8px 12px;font-weight:600;font-size:12px;background:rgba(21,20,21,0.02)">$1</div><div style="padding:8px 12px;font-size:12px">').replace(/<\/details>/g,'</div></div>').replace(/\[visual:([^\]]*)\]/g,'<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;background:rgba(21,20,21,0.03);color:#928E95;font-size:11px;margin:4px 0">$1</div>')}}/></div></RevealBlock>;});};return<div style={{padding:"28px 24px"}}><RevealBlock><div style={{marginBottom:20,borderRadius:12,border:`1px solid ${C.cardBorder}`,overflow:"hidden"}}><button onClick={()=>sbo(!bo)} style={{width:"100%",padding:"14px 16px",background:C.card,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'DM Sans',sans-serif"}}><div style={{display:"flex",alignItems:"center",gap:8}}><BL s={16}/><span style={{fontSize:14,fontWeight:700,color:C.dark}}>SEO Brief</span><span style={{fontSize:10,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"3px 8px",borderRadius:8,fontWeight:500}}>view</span></div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:bo?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s"}}><polyline points="6 9 12 15 18 9"/></svg></button>{bo&&<div style={{padding:16,borderTop:`1px solid ${C.cardBorder}`}}><BriefInner d={d} kwData={kwDataProp}/></div>}</div></RevealBlock><RevealBlock delay={0.06}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:17,fontWeight:700,color:C.dark}}>Full Content</span><span style={{fontSize:10,fontWeight:500,color:C.muted,background:"rgba(21,20,21,0.04)",padding:"3px 10px",borderRadius:10}}>{d.contentLength||"~800 words"}</span></div><span style={{fontSize:10,color:"#9B7AE6",background:"rgba(110,43,255,0.06)",padding:"3px 10px",borderRadius:10,fontWeight:500}}>ready to use</span></div></RevealBlock><RevealBlock delay={0.12}><div style={{padding:"14px 16px",borderRadius:10,background:"rgba(110,43,255,0.03)",border:"1px solid rgba(110,43,255,0.06)",marginBottom:20}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:4}}>SEO TITLE</div><div style={{fontSize:13,fontWeight:600,color:C.dark,marginBottom:8}}>{d.title}</div><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:4}}>META DESCRIPTION</div><div style={{fontSize:12,color:C.dark,lineHeight:1.5}}>{d.description}</div></div></RevealBlock>{render()}<RevealBlock delay={0.1}><div style={{marginTop:16}}><BN text="Add internal links to related pages on your site."/><div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",marginBottom:8}}><BL s={16}/><span style={{fontSize:11.5,color:C.muted,lineHeight:1.5}}>After publishing, submit your URL in <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" style={{color:C.accent,textDecoration:"none"}}>Google Search Console</a>.</span></div></div></RevealBlock></div>;};

/* ═══ LOADING STEP LABELS ═══ */
const LKW=["Generating keyword ideas...","Searching Google data...","Analyzing search volume...","Ranking by difficulty..."];
const LST=["Preparing meta data...","Building content structure...","Adding visual suggestions..."];
const LCN=["Researching real facts...","Writing intro section...","Building product details...","Adding FAQ and reviews...","Polishing final copy..."];

const MobileTab=({active,onSwitch,hasBrief,hasContent})=>{if(!hasBrief&&!hasContent)return null;return<div style={{display:"flex",gap:0,background:"rgba(21,20,21,0.04)",borderRadius:10,padding:3,margin:"0 16px 8px"}}><button onClick={()=>onSwitch("chat")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="chat"?C.surface:"transparent",color:active==="chat"?C.dark:C.muted,boxShadow:active==="chat"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Chat</button><button onClick={()=>onSwitch("panel")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="panel"?C.surface:"transparent",color:active==="panel"?C.dark:C.muted,boxShadow:active==="panel"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>{hasContent?"Content":"Brief"}</button></div>;};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
function ContentBuilder({onHome,memberName:mn}){
const isMobile=useIsMobile();const[mTab,sMTab]=useState("chat");const[pLoad,sPLoad]=useState(null);
const[step,sStep]=useState("init");const[msgs,sMsgs]=useState([]);const[typ,sTyp]=useState(false);
const[ans,sAns]=useState({});
const[kwData,sKwData]=useState([]);
const[dfsExtra,sDfsExtra]=useState({});
const dfsExtraRef=useRef({});
/* Keep ref in sync with state */
useEffect(()=>{dfsExtraRef.current=dfsExtra;},[dfsExtra]);
const[skw,sSkw]=useState([]);
const[stit,sStit]=useState(null);
const[bd,sBd]=useState(null);
const[contentHtml,sContentHtml]=useState(null);
const[rp,sRp]=useState("ph");
const[ls,sLs]=useState(-1);const[lst,sLst]=useState([]);const[lsWaiting,sLsWaiting]=useState(false);
const[dn,sDn]=useState({});
const[tweakCount,sTweakCount]=useState(0);
const[kwFlowType,sKwFlowType]=useState(null);
const[adjustUsed,sAdjustUsed]=useState(false);
const cr=useRef(null);const inpRef=useRef(null);
const prevMsgCount=useRef(0);
const loadingResolveRef=useRef(null);
const scrollChat=useCallback(()=>{if(cr.current)cr.current.scrollTop=cr.current.scrollHeight;},[]);
useEffect(()=>{if(msgs.length>prevMsgCount.current)setTimeout(scrollChat,50);prevMsgCount.current=msgs.length;},[msgs.length]);
useEffect(()=>{if(typ)setTimeout(scrollChat,50);},[typ]);

const add=useCallback((f,c)=>{sMsgs(p=>[...p,{f,c,id:Date.now()+Math.random()}]);},[]);
const bot=useCallback((c,dl=800)=>{sTyp(true);return new Promise(r=>{setTimeout(()=>{sTyp(false);add("b",c);r();},dl);});},[add]);
const botInstant=useCallback((c)=>{sTyp(false);add("b",c);},[add]);

const startLoading=useCallback((steps)=>{
  sLst(steps);sLs(0);sLsWaiting(false);
  return new Promise(resolve=>{
    loadingResolveRef.current=resolve;
    let i=0;
    const iv=setInterval(()=>{
      i++;
      if(i>=steps.length-1){
        clearInterval(iv);
        sLs(steps.length-1);
        sLsWaiting(true);
      } else {
        sLs(i);
      }
    },1200);
  });
},[]);
const stopLoading=useCallback(()=>{
  sLs(-1);sLst([]);sLsWaiting(false);
  if(loadingResolveRef.current){loadingResolveRef.current();loadingResolveRef.current=null;}
},[]);

const mk=id=>sDn(p=>({...p,[id]:true}));

/* ═══ AI CHAT (plain text answer, used as fallback) ═══ */
const handleAiChat=useCallback(async(text)=>{
  sTyp(true);
  const ctx=buildStepContext(step,ans,kwData,stit,bd);
  const history=buildChatHistory(msgs);
  const answer=await callChat(ctx,history,text);
  sTyp(false);
  if(answer){
    add("b",typeof answer==="string"?answer:"I couldn't process that. Try rephrasing.");
  } else {
    add("b","Sorry, I couldn't get a response. Try again.");
  }
},[step,ans,kwData,stit,bd,msgs,add]);

/* ═══ INIT ═══ */
useEffect(()=>{sTyp(true);setTimeout(()=>{sTyp(false);add("b",<div><div style={{marginBottom:6}}>{mn?`Hey ${mn}!`:"Hey!"} Let's build the right content for your page.</div><div style={{fontWeight:600}}>Do you have keywords or should I find them?</div></div>);sStep("ec");},1500);},[]);

/* ═══ ENTRY CHOICE ═══ */
const hEntry=ch=>{mk("e");add("u",ch);if(ch==="Find Keywords"){sKwFlowType("find");setTimeout(()=>{bot(<div><div style={{marginBottom:6}}>To find the best keywords, I need to understand your page.</div><div style={{fontWeight:600,marginBottom:6}}>What type of page are you working on?</div><ExBox items={HINTS.page_type}/></div>).then(()=>sStep("pt"));},300);}else{sKwFlowType("own");setTimeout(()=>{bot(<div><div style={{marginBottom:6}}>Paste your target keywords below, separated by commas.</div><ExBox items={["coffee shop Berlin, best espresso near me","vegan sweets online, buy vegan candy","massage Kyiv, therapeutic massage","handmade jewelry, silver rings for women"]}/></div>).then(()=>sStep("ok"));},300);}};

/* ═══ ANSWER HANDLER (flow steps) — UNCHANGED from v21 ═══ */
const hAns=(sid,val,skipAdd)=>{
mk(sid);if(!skipAdd)add("u",val);sAns(p=>({...p,[sid]:val}));

if(sid==="pt"){
  const cfg=getPageConfig(val);
  if(cfg){
    sStep("ptx");
    bot(<div><div style={{marginBottom:6}}>{cfg.extraQ}</div><ExBox items={cfg.hints}/></div>);
  } else {
    sStep("pd");
    bot(<div><div style={{fontWeight:600,marginBottom:6}}>Describe your page briefly:</div><ExBox items={["Handmade wooden rings with resin inlays","Vegan bakery in Brooklyn, cakes and cookies","Travel blog about Southeast Asia","Yoga studio in London, classes and retreats"]}/></div>);
  }
}
else if(sid==="ptx"){
  if(val.length>15){
    sStep("pd");
    bot(<div><div style={{marginBottom:6}}>Got it! Anything else to add, or should I use this to find keywords?</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}><Btn text="Find Keywords" onClick={()=>{sAns(p=>({...p,pd:val}));hAns("pd",val);}}/></div></div>);
  } else {
    sStep("pd");
    bot(<div><div style={{fontWeight:600,marginBottom:6}}>Describe your page briefly:</div><ExBox items={["Handmade wooden rings with resin inlays","Vegan bakery in Brooklyn, cakes and cookies","Travel blog about Southeast Asia","Yoga studio in London, classes and retreats"]}/></div>);
  }
}
else if(sid==="ok"){
  /* Own keywords path: save keywords, ask market, then DFS */
  sAns(p=>({...p,ownKeywords:val}));
  sStep("mk");
  bot(<div><div style={{fontWeight:600,marginBottom:6}}>What country or market are you targeting?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>This affects keyword data and language.</div><ExBox items={["US","UK","Germany","Ukraine"]}/></div>);
}
else if(sid==="pd"){
  /* After page description → ask market BEFORE keywords */
  sStep("mk");
  bot(<div><div style={{fontWeight:600,marginBottom:6}}>What country or market are you targeting?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>This affects keyword data and language.</div><ExBox items={["US","UK","Germany","Ukraine"]}/></div>);
}
else if(sid==="mk"){
  /* After market → generate keywords with correct location */
  sStep("kl");
  startLoading(LKW);
  sTyp(true);
  (async()=>{
    try {
      let rawKeywords=[];
      let dfsData=null;

      if(ans.ownKeywords){
        /* Own keywords path */
        rawKeywords=ans.ownKeywords.split(/[,\n]+/).map(k=>k.trim()).filter(Boolean);
      } else {
        /* Find keywords path */
        const gptRes=await callGPT("generate_keywords",{
          page_type:ans.pt||"",
          page_description:ans.pd||"",
          page_type_details:ans.ptx||"",
          market:val,
          ...ans
        });
        if(gptRes){
          rawKeywords=Array.isArray(gptRes.keywords)?gptRes.keywords:
            Array.isArray(gptRes)?gptRes:
            typeof gptRes.text==="string"?gptRes.text.split(/[,\n]+/).map(k=>k.trim()).filter(Boolean):[];
        }
        if(rawKeywords.length===0) rawKeywords=[ans.pd||""];
      }

      const locCode=parseLocationCode(val||"");
      dfsData=await callDFS(rawKeywords.slice(0,5),locCode);

      let enrichedKw=[];
      const metrics=dfsData?.keyword_metrics||[];
      const allSugs=dfsData?.suggestions||[];
      const lookup=new Map();
      metrics.forEach(m=>{if(m?.keyword)lookup.set(m.keyword.toLowerCase(),m);});
      allSugs.forEach(s=>{if(s?.keyword&&!lookup.has(s.keyword.toLowerCase()))lookup.set(s.keyword.toLowerCase(),s);});
      const getVol=m=>(m?.search_volume??m?.volume??null);
      const getKd=m=>{const v=(m?.competition_index??m?.keyword_difficulty??m?.competition??null);if(typeof v==="number")return v;return null;};
      const allVols=[...lookup.values()].map(m=>getVol(m)||0);
      const maxVol=Math.max(...allVols,1);

      if(lookup.size>0){
        enrichedKw=rawKeywords.map(kw=>{
          const match=lookup.get(kw.toLowerCase());
          const vol=getVol(match);
          const kd=getKd(match);
          return{keyword:kw,volume:vol,kd:kd,freq:assignFreq(vol,maxVol)};
        });
        if(allSugs.length>0){
          const existing=new Set(enrichedKw.map(k=>k.keyword.toLowerCase()));
          allSugs.filter(s=>s.keyword&&!existing.has(s.keyword.toLowerCase())&&(getVol(s)||0)>0).slice(0,3).forEach(s=>{
            enrichedKw.push({keyword:s.keyword,volume:getVol(s),kd:getKd(s),freq:assignFreq(getVol(s)||0,maxVol)});
          });
        }
      } else {
        enrichedKw=rawKeywords.map(kw=>({keyword:kw,volume:null,kd:null,freq:"MV"}));
      }

      const normArr=(arr,field)=>(arr||[]).map(x=>typeof x==="string"?x:x?.[field]||x?.keyword||String(x)).filter(Boolean);
      const dfsExtraData={
        suggestions:dfsData?.suggestions||[],
        paa:normArr(dfsData?.people_also_ask,"question"),
        related:normArr(dfsData?.related_searches,"title"),
        autocomplete:normArr(dfsData?.autocomplete,"suggestion")
      };
      console.log("[CB] DFS extras:", JSON.stringify({paa:dfsExtraData.paa.length,related:dfsExtraData.related.length,autocomplete:dfsExtraData.autocomplete.length,raw_keys:Object.keys(dfsData||{})}));
      sDfsExtra(dfsExtraData);
      dfsExtraRef.current=dfsExtraData;

      sKwData(enrichedKw);
      const init=enrichedKw.map(k=>k.keyword);
      sSkw(init);
      stopLoading();
      sTyp(false);
      sStep("kw");
      add("b",<div>
        <div style={{marginBottom:6}}>{dfsData?"I found keywords with real Google search data. Pick the ones that match your page best.":"Here are keyword suggestions. Pick the ones that fit."}</div>
        <BotTip short="Each keyword has search volume, competition, and priority."><div><div style={{marginBottom:6}}>Vol. — how many people search this per month.</div><div style={{marginBottom:6}}>KD — competition (0–100). Lower = easier to rank.</div><div>HV = High Volume, main keyword. MV = Medium, supporting keyword. LV = Low, extra keyword.</div></div></BotTip>
        <div style={{color:C.muted,fontSize:12,marginBottom:8}}>Not sure what to pick? Just ask me in the chat!</div>
        <KwS keywords={enrichedKw} init={init} onDone={s=>{sSkw(s);kwD(enrichedKw,dfsExtraData);}} onAdj={()=>{
          sStep("ka");bot("What would you like to change? Describe what keywords to add or remove.");
        }}/>
        <ExtrasBlock extra={dfsExtraData}/>
      </div>);
    } catch(err) {
      console.error("[CB] keyword flow error:", err);
      stopLoading();
      sTyp(false);
      sPLoad(null);
      bot("Something went wrong while generating keywords. Please try again.");
    }
  })();
}
else if(sid==="gl"){
  sStep("au");
  bot(<div><div style={{fontWeight:600,marginBottom:6}}>Who is your target audience?</div><ExBox items={["Women 25-40","Young travelers","Small business owners","Parents with kids"]}/></div>);
}
else if(sid==="au"){
  sStep("tn");
  bot(<div><div style={{fontWeight:600,marginBottom:6}}>What tone should the content have?</div><ExBox items={["Professional and clear","Friendly and casual","Fun and playful","Warm and personal"]}/><div style={{display:"flex",alignItems:"center",gap:8,marginTop:4}}><UBtn onUpload={f=>{add("u",`Uploaded: ${f.name}`);}}/></div></div>);
}
else if(sid==="tn"){
  /* mk already answered before keywords, go straight to titles */
  sStep("tl");
  startLoading(["Generating titles...","Applying keyword rules..."]);
  sTyp(true);
  (async()=>{
    try {
      const selKw=skw.length>0?skw:kwData.map(k=>k.keyword);
      const gptRes=await callGPT("generate_titles",{
        keywords:selKw,
        page_type:ans.pt||"",
        page_type_details:ans.ptx||"",
        page_description:ans.pd||"",
        goal:ans.gl||"",
        audience:ans.au||"",
        tone:ans.tn||"",
        market:ans.mk||val,
        ...ans
      });
      let titles=[];
      if(gptRes){
        const raw=Array.isArray(gptRes.titles)?gptRes.titles:
          Array.isArray(gptRes)?gptRes:
          gptRes.titles?[gptRes.titles]:[];
        titles=raw.map(t=>{
          if(typeof t==="string") return{text:t,hl:selKw.filter(k=>t.toLowerCase().includes(k.toLowerCase()))};
          return{text:t.text||t.title||String(t),hl:t.highlights||t.hl||selKw.filter(k=>(t.text||t.title||"").toLowerCase().includes(k.toLowerCase()))};
        });
      }
      if(titles.length===0){
        titles=selKw.slice(0,5).map(k=>({text:k.charAt(0).toUpperCase()+k.slice(1)+" — Your Guide",hl:[k]}));
      }
      stopLoading();
      sTyp(false);
      sStep("ti");
      add("b",<div><div style={{marginBottom:6}}>Here are title options for your page.</div><TSel titles={titles} onSelect={t=>{sStit(t);hAns("ti",t);}}/></div>);
    } catch(err) {
      console.error("[CB] title flow error:", err);
      stopLoading();
      sTyp(false);
      sPLoad(null);
      bot("Something went wrong while generating titles. Please try again.");
    }
  })();
}
else if(sid==="ti"){
  sStep("me");
  bot(<div><div style={{fontWeight:600,marginBottom:6}}>Any personal details, stories, or brand values?</div><div style={{color:C.muted,fontSize:12,marginBottom:6}}>Unique details build trust and make your page stand out.</div><ExBox items={["Founded in 2020 by Maria","Family-owned bakery since 1995","10 years of experience in web design","We source only organic ingredients"]}/><div style={{display:"flex",gap:8,marginTop:6}}><Btn text="Nothing Special to Add" onClick={()=>hAns("me","Nothing special to add")}/></div></div>);
}
else if(sid==="me"){
  sStep("cf");
  bot(<div><div style={{marginBottom:6}}>All steps done! I have everything I need.</div><div style={{fontWeight:600,marginBottom:6}}>Ready to generate your SEO structure?</div><div style={{color:C.muted,fontSize:12,marginBottom:10}}>You can use this as a brief for your copywriter, or click Generate Content.</div><div style={{display:"flex",gap:8}}><Btn text="Generate Structure" onClick={gStr} primary/><Btn text="Go Back" onClick={()=>{sStep("me");bot("What would you like to change?");}}/></div></div>);
}};

/* ═══ KEYWORD DONE → show extras + ask goal ═══ */
const kwD=(enrichedKwOverride,extrasOverride)=>{
  const extra=extrasOverride||dfsExtra;
  console.log("[CB] kwD extras:", JSON.stringify({related:extra.related?.length||0,paa:extra.paa?.length||0,autocomplete:extra.autocomplete?.length||0}));
  mk("kw");
  const hasExtras=extra.related?.length>0||extra.paa?.length>0||extra.autocomplete?.length>0;
  bot(<div>
    <div style={{marginBottom:6}}>Great keywords! {hasExtras?"I also found additional search data from Google.":"Let's continue."}</div>
    {hasExtras&&<BotTip short="Real Google search data for your topic — related searches, questions, and autocomplete."><div>
      {extra.related?.length>0&&<><div style={{fontWeight:600,fontSize:11,color:C.accent,marginBottom:3}}>Related Searches</div><div style={{fontSize:11,color:C.muted,marginBottom:4}}>Other searches Google considers relevant — use as subtopics or H2 ideas.</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{extra.related.map((s,i)=><span key={i} style={{padding:"3px 8px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{typeof s==="string"?s:s.keyword||s}</span>)}</div></>}
      {extra.paa?.length>0&&<><div style={{fontWeight:600,fontSize:11,color:C.accent,marginBottom:3}}>People Also Ask</div><div style={{fontSize:11,color:C.muted,marginBottom:4}}>Real questions people ask Google — great for FAQ sections.</div><div style={{lineHeight:1.7,marginBottom:10,fontSize:11}}>{extra.paa.map((q,i)=><div key={i}>• {typeof q==="string"?q:q.question||q}</div>)}</div></>}
      {extra.autocomplete?.length>0&&<><div style={{fontWeight:600,fontSize:11,color:C.accent,marginBottom:3}}>Autocomplete</div><div style={{fontSize:11,color:C.muted,marginBottom:4}}>What Google suggests as people type — shows real search patterns.</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{extra.autocomplete.map((s,i)=><span key={i} style={{padding:"3px 8px",borderRadius:6,background:"rgba(110,43,255,0.05)",border:"1px solid rgba(110,43,255,0.1)",color:C.dark,fontSize:11}}>{typeof s==="string"?s:s.keyword||s}</span>)}</div></>}
    </div></BotTip>}
  </div>).then(()=>{
    sStep("gl");
    bot(<div><div style={{fontWeight:600,marginBottom:6}}>What should this page achieve?</div><ExBox items={HINTS.goal}/></div>);
  });
};

/* ═══ GENERATE STRUCTURE ═══ */
const gStr=async()=>{
  mk("cf");sStep("sl");
  window.scrollTo({top:0,behavior:"smooth"});
  sPLoad("Building SEO structure...");
  startLoading(LST);
  sTyp(true);
  try {
    const selKw=skw.length>0?skw:kwData.map(k=>k.keyword);
    const kwWithData=kwData.filter(k=>selKw.includes(k.keyword));
    const pageCfg=getPageConfig(ans.pt||"");
    const defaultLen=pageCfg?.defaultLen||"500-800 words";
    const chosenTitle=stit||ans.ti||"";
    console.log("[CB] gStr title:", chosenTitle);
    const gptRes=await callGPT("generate_structure",{
      title:chosenTitle,
      keywords:kwWithData,
      page_type:ans.pt||"",
      page_type_details:ans.ptx||"",
      page_description:ans.pd||"",
      goal:ans.gl||"",
      audience:ans.au||"",
      tone:ans.tn||"",
      market:ans.mk||"",
      brand_details:ans.me||"",
      target_length:defaultLen,
      related:dfsExtraRef.current.related||[],
      paa:dfsExtraRef.current.paa||[],
      autocomplete:dfsExtraRef.current.autocomplete||[]
    });

    let briefData;
    if(gptRes&&(gptRes.title||gptRes.sections)){
      const titleText=(gptRes.title||stit||"").toLowerCase();
      const titleKw=kwWithData.filter(k=>titleText.includes(k.keyword.toLowerCase())).map(k=>({text:k.keyword,freq:k.freq||"MV"}));
      const descText=(gptRes.description||gptRes.meta_description||"").toLowerCase();
      const descKw=kwWithData.filter(k=>descText.includes(k.keyword.toLowerCase())).slice(0,3).map(k=>({text:k.keyword,freq:k.freq||"MV"}));
      briefData={
        title:gptRes.title||chosenTitle||"Untitled",
        titleKw,
        description:gptRes.description||gptRes.meta_description||"",
        descKw,
        keywords:kwWithData,
        recs:gptRes.recs||gptRes.recommendations||[
          {key:"Length",value:gptRes.content_length||defaultLen},
          {key:"Tone",value:ans.au||"Professional"},
          {key:"CTA",value:gptRes.cta||"Learn More"},
          {key:"Goal",value:ans.gl||"Inform"}
        ],
        sections:Array.isArray(gptRes.sections)?gptRes.sections.map(s=>({
          level:s.level||"H2",
          title:s.title||"",
          desc:s.desc||s.description||"",
          kwNote:s.kwNote||s.keyword_note||null,
          visuals:s.visuals||[]
        })):[],
        related:[...new Set([...(dfsExtraRef.current.related||[]).map(s=>typeof s==="string"?s:s.keyword||String(s)),...(Array.isArray(gptRes.related)?gptRes.related:[])])],
        paa:[...new Set([...(dfsExtraRef.current.paa||[]).map(q=>typeof q==="string"?q:q.question||String(q)),...(Array.isArray(gptRes.paa)?gptRes.paa:[])])],
        autocomplete:[...new Set([...(dfsExtraRef.current.autocomplete||[]).map(s=>typeof s==="string"?s:s.keyword||String(s)),...(Array.isArray(gptRes.autocomplete)?gptRes.autocomplete:[])])],
        contentLength:gptRes.content_length||defaultLen
      };
    } else {
      briefData={
        title:chosenTitle||"Untitled Page",
        titleKw:[],
        description:"Generated SEO content for your page.",
        descKw:[],
        keywords:kwWithData,
        recs:[{key:"Length",value:defaultLen},{key:"Tone",value:ans.au||"Professional"},{key:"Goal",value:ans.gl||"Inform"}],
        sections:[{level:"H1",title:chosenTitle||"Main Heading",desc:"Introduction paragraph",kwNote:null,visuals:[]}],
        related:dfsExtraRef.current.related?.map(s=>typeof s==="string"?s:s.keyword||String(s))||[],
        paa:dfsExtraRef.current.paa?.map(q=>typeof q==="string"?q:q.question||String(q))||[],
        autocomplete:dfsExtraRef.current.autocomplete?.map(s=>typeof s==="string"?s:s.keyword||String(s))||[],
        contentLength:defaultLen
      };
    }

    sBd(briefData);sRp("br");sPLoad(null);stopLoading();sTyp(false);sStep("sr");
    if(isMobile)sMTab("panel");
    bot(<div>
      <div style={{marginBottom:6}}>Your SEO structure is ready! {isMobile?"Switch to the Brief tab.":"Check the brief on the right."}</div>
      <div style={{marginBottom:6}}>I recommend <strong>{briefData.contentLength}</strong> for this page.</div>
      <div style={{color:C.muted,fontSize:12}}>Edit the structure, or click "Generate Content" when ready.</div>
    </div>);
  } catch(err) {
    console.error("[CB] gStr error:", err);
    stopLoading();sTyp(false);sPLoad(null);
    bot("Something went wrong while generating the structure. Please try again.");
  }
};

/* ═══ GENERATE CONTENT ═══ */
const gCnt=async()=>{
  sStep("cl");
  add("b",<div style={{color:C.muted,fontSize:12}}>Researching and generating content...</div>);
  window.scrollTo({top:0,behavior:"smooth"});
  sPLoad("Writing your content...");
  startLoading(LCN);
  sTyp(true);
  try {
    /* Step 1: Research real facts via web search */
    const selKw=kwData.filter(k=>skw.includes(k.keyword)).map(k=>k.keyword);
    const researchTopic=(bd?.title||ans.pd||ans.ptx||"").substring(0,200);
    let researchData=null;
    try {
      researchData=await callResearch(researchTopic,selKw,ans.pt||"",ans.mk||"");
      console.log("[CB] Research result:", researchData ? "got data" : "null");
    } catch(e) { console.log("[CB] Research skipped:", e); }

    /* Step 2: Generate content with research */
    const gptRes=await callGPT("generate_content",{
      structure:bd,
      keywords:kwData.filter(k=>skw.includes(k.keyword)),
      page_type:ans.pt||"",
      goal:ans.gl||"",
      audience:ans.au||"",
      tone:ans.tn||"",
      market:ans.mk||"",
      brand_details:ans.me||"",
      extra_instructions:ans.sr_extra||"",
      title:bd?.title||stit||ans.ti||"",
      research:researchData||null
    });

    let html="";
    if(gptRes){
      html=gptRes.html||gptRes.content||gptRes.text||"";
      if(typeof html!=="string") html=JSON.stringify(html);
    }
    if(!html||html.length<50){
      html="<h1>"+(bd?.title||"Content")+"</h1><p>Content generation is being set up. Please try again shortly.</p>";
    }

    sContentHtml(html);sRp("ct");sPLoad(null);stopLoading();sTyp(false);sStep("cr");
    try { const msId=window.__memberId||window._msData?.id; trackBuilderUsage(msId); } catch(e) { console.log("[CB] credit track skip:", e); }
    if(isMobile)sMTab("panel");
    bot(<div>
      <div style={{marginBottom:6}}>Your full content is ready!</div>
      <BotTip short="Keywords are color-coded."><div>
        <div style={{marginBottom:3}}>• <span style={{background:"rgba(110,43,255,0.12)",color:"#6E2BFF",padding:"1px 4px",borderRadius:3}}>Purple</span> = high-volume</div>
        <div style={{marginBottom:3}}>• <span style={{background:"rgba(155,122,230,0.1)",color:"#9B7AE6",padding:"1px 4px",borderRadius:3}}>Light</span> = medium</div>
        <div>• <span style={{background:"rgba(184,156,240,0.12)",color:"#B89CF0",padding:"1px 4px",borderRadius:3}}>Soft</span> = low</div>
      </div></BotTip>
      <div style={{color:C.muted,fontSize:12,marginTop:4}}>Want changes? Just ask.</div>
    </div>);
  } catch(err) {
    console.error("[CB] gCnt error:", err);
    stopLoading();sTyp(false);sPLoad(null);
    bot("Something went wrong while generating content. Please try again.");
  }
};

/* ═══ TWEAK ═══ */
const handleTweak=async(text)=>{
  sTyp(true);
  const newCount=tweakCount+1;
  sTweakCount(newCount);

  try {
    const gptRes=await callGPT("tweak",{
      current_content:contentHtml,
      request:text,
      keywords:kwData.filter(k=>skw.includes(k.keyword)),
      structure:bd
    });

    sTyp(false);
    if(gptRes){
      const newHtml=gptRes.html||gptRes.content||gptRes.text||contentHtml;
      if(typeof newHtml==="string"&&newHtml.length>50){
        sContentHtml(newHtml);
        add("b","Done! I've updated the content. Check the right panel.");
      } else {
        add("b","I made some adjustments. Check the content panel.");
      }
    } else {
      add("b","Sorry, I couldn't process that tweak. Try describing the change differently.");
    }

    if(newCount>=3){
      setTimeout(()=>{
        bot(<div style={{color:C.muted,fontSize:12}}>You've made {newCount} edits. The content is looking good! Consider finalizing and exporting. Of course, you can keep tweaking if needed.</div>,500);
      },1000);
    }
  } catch(err) {
    console.error("[CB] tweak error:", err);
    sTyp(false);
    add("b","Something went wrong with that tweak. Try again.");
  }
};

/* ═══ KEYWORD ADJUST (shared helper for ka step + inline modify) ═══ */
const doKeywordAdjust=async(adjustText)=>{
  sStep("kl");
  sTyp(true);
  try {
    const gptRes=await callGPT("generate_keywords",{
      page_type:ans.pt||"",
      page_description:ans.pd||"",
      page_type_details:ans.ptx||"",
      adjustment:adjustText,
      previous_keywords:kwData.map(k=>k.keyword)
    });
    let newRaw=[];
    if(gptRes){
      newRaw=Array.isArray(gptRes.keywords)?gptRes.keywords:Array.isArray(gptRes)?gptRes:[];
    }
    if(newRaw.length===0) newRaw=kwData.map(k=>k.keyword);
    const locCode=parseLocationCode(ans.mk||ans.au||"");
    const dfsData=await callDFS(newRaw.slice(0,5),locCode);
    let enriched=[];
    const metrics2=dfsData?.keyword_metrics||[];
    const sug2=dfsData?.suggestions||[];
    const lookup2=new Map();
    metrics2.forEach(m=>{if(m?.keyword)lookup2.set(m.keyword.toLowerCase(),m);});
    sug2.forEach(s=>{if(s?.keyword&&!lookup2.has(s.keyword.toLowerCase()))lookup2.set(s.keyword.toLowerCase(),s);});
    const gV2=m=>(m?.search_volume??m?.volume??null);
    const gK2=m=>{const v=(m?.competition_index??m?.keyword_difficulty??m?.competition??null);return typeof v==="number"?v:null;};
    const maxV2=Math.max(...[...lookup2.values()].map(m=>gV2(m)||0),1);
    if(lookup2.size>0){
      enriched=newRaw.map(kw=>{const match=lookup2.get(kw.toLowerCase());return{keyword:kw,volume:gV2(match),kd:gK2(match),freq:assignFreq(gV2(match)||0,maxV2)};});
    } else {
      enriched=newRaw.map(kw=>({keyword:kw,volume:null,kd:null,freq:"MV"}));
    }
    let adjustExtras=dfsExtraRef.current;
    if(dfsData){
      const normArr2=(arr,field)=>(arr||[]).map(x=>typeof x==="string"?x:x?.[field]||x?.keyword||String(x)).filter(Boolean);
      const newExtras={suggestions:dfsData.suggestions||[],paa:normArr2(dfsData.people_also_ask,"question"),related:normArr2(dfsData.related_searches,"title"),autocomplete:normArr2(dfsData.autocomplete,"suggestion")};
      /* Merge: keep old extras if new ones are empty */
      adjustExtras={
        suggestions:[...new Set([...(newExtras.suggestions||[]),...(adjustExtras.suggestions||[])])],
        paa:[...new Set([...(newExtras.paa||[]),...(adjustExtras.paa||[])])],
        related:[...new Set([...(newExtras.related||[]),...(adjustExtras.related||[])])],
        autocomplete:[...new Set([...(newExtras.autocomplete||[]),...(adjustExtras.autocomplete||[])])]
      };
      sDfsExtra(adjustExtras);
      dfsExtraRef.current=adjustExtras;
    }
    sKwData(enriched);sSkw(enriched.map(k=>k.keyword));sTyp(false);sStep("kw");
    add("b",<div>
      <div style={{marginBottom:6}}>Keywords updated! Here's the new list.</div>
      <KwS keywords={enriched} init={enriched.map(k=>k.keyword)} onDone={s=>{sSkw(s);kwD(enriched,adjustExtras);}} onAdj={()=>{sStep("ka");bot("What would you like to change?");}}/>
      <ExtrasBlock extra={adjustExtras}/>
    </div>);
  } catch(err) {
    console.error("[CB] keyword adjust error:", err);
    sTyp(false);
    bot("Something went wrong adjusting keywords. Try again.");
    sStep("kw");
  }
};

/* ═══ HANDLE LENGTH CHANGE (shared for sr and cr steps) ═══ */
const handleLengthChange=(words)=>{
  const cfg=getPageConfig(ans.pt||"");
  const absMax=cfg?.maxLen||10000;
  if(words>absMax){
    bot(`The maximum for this page type is about ${absMax} words. Want me to set it to ${absMax}?`);
    return;
  }
  if(bd){
    const updatedBd={...bd,contentLength:`~${words} words`};
    const updatedRecs=(updatedBd.recs||[]).map(r=>r.key==="Length"?{...r,value:`${words} words`}:r);
    updatedBd.recs=updatedRecs;
    sBd(updatedBd);
  }
  if(step==="cr"){
    handleTweak(`Rewrite the full content to be approximately ${words} words. Keep the same structure and keywords.`);
  } else {
    bot(`Updated to ~${words} words. Click "Generate Content" when ready.`);
  }
};

/* ═══ STEP REMINDERS ═══ */
const STEP_REMINDERS={
  pt:"What type of page are you working on? (Product, Service, Blog, About, Landing, Category)",
  ptx:"Can you share details about your page? It helps me write better content.",
  pd:"Describe your page briefly so I can find the right keywords.",
  gl:"What should this page achieve? (Sell, Explain, Build trust)",
  au:"Who is your target audience?",
  tn:"What tone should the content have? (Professional, Friendly, Fun, Warm)",
  mk:"What country or market are you targeting?",
  ti:"Which title do you want? Pick one above or type your own.",
  me:"Any brand details to add, or type 'nothing' to continue."
};

/* ═══ RESET ═══ */
const reset=()=>{
  sStep("init");sMsgs([]);sTyp(false);sAns({});sKwData([]);sDfsExtra({});dfsExtraRef.current={};sSkw([]);sStit(null);sBd(null);sContentHtml(null);sRp("ph");sLs(-1);sLst([]);sLsWaiting(false);sDn({});sMTab("chat");sPLoad(null);sTweakCount(0);sKwFlowType(null);sAdjustUsed(false);
  setTimeout(()=>{sTyp(true);setTimeout(()=>{sTyp(false);add("b",<div><div style={{marginBottom:6}}>{mn?`Hey ${mn}!`:"Hey!"} Let's build the right content for your page.</div><div style={{fontWeight:600}}>Do you have keywords or should I find them?</div></div>);sStep("ec");},1000);},100);
};

/* ═══════════════════════════════════════════════════════════
   SEND — v22 hybrid: regex for flow steps, GPT router for kw/sr/cr
   ═══════════════════════════════════════════════════════════ */
const send=()=>{
  const el=inpRef.current;if(!el||!el.value.trim())return;
  const t=el.value.trim();el.value="";

  /* === FLOW STEPS: direct regex handling (proven from v21) === */

  if(step==="ec") {
    const tl=t.toLowerCase().replace(/[!.,?]+$/,"").trim();
    /* Greeting → reply + keep buttons */
    const greetings=["hi","hey","hello","привет","хай","добрый день","доброе утро","good morning","sup","yo","hola"];
    if(greetings.includes(tl)||tl.length<4){
      add("u",t);
      bot(<div><div style={{marginBottom:6}}>Hey! Ready to start?</div><div style={{fontWeight:600}}>Do you have keywords or should I find them?</div></div>);
      return;
    }
    /* Question → answer via chat, keep buttons */
    if(isQuestion(t)){ add("u",t); handleAiChat(t); return; }
    /* Intent detection */
    if(/\b(find|search|suggest|get|help)\b/i.test(tl)) { hEntry("Find Keywords"); return; }
    if(/\b(my|own|have|paste|use)\b/i.test(tl)) { hEntry("Use My Keywords"); return; }
    if(t.includes(",")) { hEntry("Use My Keywords"); return; }
    /* Default: ask to choose, don't auto-select */
    add("u",t);
    bot(<div><div style={{marginBottom:6}}>Please choose one of the options below to get started.</div></div>);
    return;
  }

  if(step==="ok") { hAns("ok",t); return; }

  if(step==="ka") {
    add("u",t);
    sAdjustUsed(true);
    doKeywordAdjust(t);
    return;
  }

  /* Simple flow steps: pt, ptx, gl, au, tn, mk, me — regex like v21 */
  if(["pt","ptx","gl","au","tn","mk","me"].includes(step)){
    if(isQuestion(t)){ add("u",t); handleAiChat(t); return; }
    if(isAcknowledgement(t)){
      add("u",t);
      bot(STEP_REMINDERS[step]||"Got it! Please answer the current question to continue.");
      return;
    }
    hAns(step,t);
    return;
  }

  if(step==="pd"){
    if(isQuestion(t)){ add("u",t); handleAiChat(t); return; }
    const isNeg=/^(no|nope|nothing|nah|not really|none|skip|n\/a|na)$/i.test(t.replace(/[!.,]+$/,"").trim());
    if(isNeg&&ans.ptx&&ans.ptx.length>10){ hAns("pd",ans.ptx); return; }
    if(isNeg){ add("u",t); bot("I need at least a brief description to find the right keywords. What is your page about?"); return; }
    if(isAcknowledgement(t)){ add("u",t); bot(STEP_REMINDERS.pd); return; }
    hAns("pd",t);
    return;
  }

  if(step==="ti"){
    if(isQuestion(t)){ add("u",t); handleAiChat(t); return; }
    if(isAcknowledgement(t)){ add("u",t); bot("Which title do you want? Pick one from the list or type your own."); return; }
    sStit(t);hAns("ti",t);
    return;
  }

  if(step==="cf"){
    if(isConfirmation(t)){ add("u",t); gStr(); return; }
    add("u",t); handleAiChat(t);
    return;
  }

  /* === AMBIGUOUS STEPS: GPT router for kw, sr, cr === */
  add("u",t);
  sTyp(true);
  const ctx=buildStepContext(step,ans,kwData,stit,bd);
  const history=buildChatHistory(msgs);

  (async()=>{
    try {
      const r=await callChatRouter(ctx,history,t);
      sTyp(false);
      const action=r.action||"answer";
      console.log("[CB] Router dispatch:", action, "step:", step);

      if(step==="kw"){
        if(action==="proceed"||(action==="flow_answer"&&isConfirmation(t))){
          /* User wants to continue → go straight to goal step */
          kwD(kwData, dfsExtraRef.current);
        } else if(action==="adjust_keywords"||(action==="flow_answer"&&!isConfirmation(t))){
          /* Adjust keywords — no limit, always allowed */
          doKeywordAdjust(r.adjustment||r.text||t);
        } else {
          /* answer or anything else — show GPT's text, never raw JSON */
          const text=r.text;
          if(text && typeof text==="string" && text.length>10 && !text.startsWith("{")){
            add("b",text);
          } else {
            handleAiChat(t);
          }
        }
        return;
      }

      if(step==="sr"){
        if(action==="proceed"){ gCnt(); return; }
        if(action==="set_length"){
          const words=r.words||parseInt((t.match(/(\d{3,5})/)||[])[1]);
          if(words){ handleLengthChange(words); } else { bot("How many words? e.g. 1500 words."); }
          return;
        }
        /* Length from text even if GPT didn't catch it */
        const lenMatch=t.match(/(\d{3,5})\s*(words?|слов)?/i);
        if(lenMatch){ handleLengthChange(parseInt(lenMatch[1])); return; }
        /* adjust_keywords on sr = user adding extra info for content (address, details) */
        if(action==="adjust_keywords"){
          const extra=r.adjustment||t;
          sAns(p=>({...p,sr_extra:(p.sr_extra||"")+"\n"+extra}));
          bot("Got it! I'll include this in your content when you generate it. Click 'Generate Content' when ready.");
          return;
        }
        /* answer on sr = user adding info or asking question */
        if(action==="answer"){
          const ansText=r.text||"";
          /* If GPT's answer suggests it understood extra info, save it */
          if(ansText.toLowerCase().includes("got it") || ansText.toLowerCase().includes("include") || ansText.toLowerCase().includes("записала") || ansText.toLowerCase().includes("добавлю")){
            sAns(p=>({...p,sr_extra:(p.sr_extra||"")+"\n"+t}));
          }
          if(ansText && ansText.length>5 && !ansText.startsWith("{")){
            add("b",ansText);
          } else {
            handleAiChat(t);
          }
          return;
        }
        /* Otherwise chat — use GPT answer text, but never show raw JSON */
        const ansText=r.text;
        if(ansText && typeof ansText==="string" && ansText.length>10 && !ansText.startsWith("{")){
          add("b",ansText);
        } else {
          handleAiChat(t);
        }
        return;
      }

      if(step==="cr"){
        if(action==="set_length"){
          const words=r.words||parseInt((t.match(/(\d{3,5})/)||[])[1]);
          if(words){ handleLengthChange(words); return; }
        }
        /* Length from text */
        const lenMatch=t.match(/(\d{3,5})\s*(words?|слов)?/i);
        if(lenMatch){ handleLengthChange(parseInt(lenMatch[1])); return; }
        /* Everything else on cr = tweak */
        handleTweak(t);
        return;
      }

      /* Fallback for any other step */
      const text=r.text;
      if(text && typeof text==="string" && text.length>10){ add("b",text); } else { handleAiChat(t); }

    } catch(err) {
      console.error("[CB] Router error:", err);
      sTyp(false);
      add("b","Sorry, something went wrong. Try again.");
    }
  })();
};

/* ═══ RENDER ═══ */
const lastBotIdx=msgs.reduce((acc,m,i)=>m.f==="b"?i:acc,-1);
const chatMessages=<React.Fragment><style>{`.cb-past-msg{pointer-events:none!important;opacity:0.8}.cb-past-msg *{pointer-events:none!important;cursor:default!important}.cb-past-msg .bot-tip-expand{pointer-events:auto!important;cursor:pointer!important}`}</style>{msgs.map((m,i)=>m.f==="b"?<div key={m.id} className={i<lastBotIdx?"cb-past-msg":undefined}><BB>{typeof m.c==="string"?m.c.split("\n").map((line,j)=><span key={j}>{j>0&&<br/>}{line}</span>):m.c}</BB></div>:<UB key={m.id} n={mn}>{m.c}</UB>)}{ls>=0&&lst.length>0&&<div style={{maxWidth:"95%",alignSelf:"flex-start"}}><LB step={ls} total={lst.length} text={lst[ls]} waiting={lsWaiting}/></div>}{typ&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`}}><div className="typing-dots"><span/><span/><span/></div></div></div>}{step==="ec"&&!dn.e&&<div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}><Btn text="Find Keywords" onClick={()=>hEntry("Find Keywords")}/><Btn text="Use My Keywords" onClick={()=>hEntry("Use My Keywords")}/></div>}</React.Fragment>;

const panelContent=<React.Fragment>{pLoad?<LoadingPanel text={pLoad}/>:rp==="br"&&bd?<div style={{animation:"fadeIn 0.5s ease"}}><BriefPanel d={bd} kwData={kwData}/></div>:rp==="ct"&&bd?<div style={{animation:"fadeIn 0.5s ease"}}><ContentPanel html={contentHtml} d={bd} kwData={kwData}/></div>:<Placeholder/>}<style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style></React.Fragment>;

return<div style={{fontFamily:"'DM Sans',sans-serif",flex:1,display:"flex",flexDirection:"column"}}>
<div style={{padding:isMobile?"0 12px 6px":"0 24px 10px",display:"flex",alignItems:"center",gap:6,maxWidth:1224,margin:"0 auto",width:"100%"}}><button onClick={onHome} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:C.muted,display:"flex"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button><span style={{fontSize:13,fontWeight:500,color:C.muted}}>Content Builder</span>{rp==="br"&&<span style={{fontSize:10,fontWeight:600,color:"#9B7AE6",background:"rgba(155,122,230,0.08)",padding:"3px 8px",borderRadius:10,marginLeft:4}}>Structure Ready</span>}{rp==="ct"&&<span style={{fontSize:10,fontWeight:600,color:"#9B7AE6",background:"rgba(155,122,230,0.08)",padding:"3px 8px",borderRadius:10,marginLeft:4}}>Content Ready</span>}</div>
{!isMobile&&<div style={{display:"flex",padding:"0 24px 24px",maxWidth:1224,margin:"0 auto",width:"100%",alignItems:"flex-start",gap:12}}>
<div id="cb-chat" style={{width:"35%",maxWidth:420,position:"sticky",top:12,display:"flex",flexDirection:"column",flexShrink:0,minWidth:280,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.card,height:"calc(100vh - 130px)"}}><div ref={cr} className="iva-scroll-inner" style={{flex:1,padding:"16px 12px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>{chatMessages}</div><div style={{padding:"8px 12px 12px",flexShrink:0,borderTop:`1px solid ${C.border}`}}><div style={{display:"flex",gap:8}}><input ref={inpRef} defaultValue="" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)send();}} placeholder={step==="cr"?"Ask a question or request changes...":"Type your answer..."} style={{flex:1,height:44,borderRadius:10,border:`1px solid ${C.border}`,padding:"0 14px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",background:C.surface}} onFocus={e=>{e.target.style.borderColor=C.hoverBorder;e.target.style.boxShadow=C.hoverShadow;}} onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/><button onClick={send} style={{width:44,height:44,borderRadius:10,border:`1px solid ${C.borderMid}`,background:C.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button></div></div></div>
<div style={{flex:1,borderRadius:12,border:`1px solid ${C.border}`,position:"relative",background:C.surface,minHeight:"calc(100vh - 130px)"}}>{panelContent}{rp!=="ph"&&<div style={{position:"sticky",bottom:0,left:0,right:0,height:48,background:"linear-gradient(transparent, #ffffff)",borderRadius:"0 0 12px 12px",pointerEvents:"none"}}/>}</div>
</div>}
{isMobile&&<div style={{display:"flex",flexDirection:"column",padding:"0 12px 16px",gap:12}}>
<MobileTab active={mTab} onSwitch={sMTab} hasBrief={rp==="br"} hasContent={rp==="ct"}/>
<div style={{display:mTab==="chat"?"flex":"none",flexDirection:"column",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.card,maxHeight:"70vh"}}><div ref={mTab==="chat"?cr:null} className="iva-scroll-inner" style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>{chatMessages}</div><div style={{padding:"8px 10px 10px",flexShrink:0,borderTop:`1px solid ${C.border}`}}><div style={{display:"flex",gap:6}}><input ref={isMobile?inpRef:null} defaultValue="" onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey)send();}} placeholder={step==="cr"?"Ask a question or request changes...":"Type your answer..."} style={{flex:1,height:42,borderRadius:10,border:`1px solid ${C.border}`,padding:"0 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",background:C.surface}} onFocus={e=>{e.target.style.borderColor=C.hoverBorder;e.target.style.boxShadow=C.hoverShadow;}} onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/><button onClick={send} style={{width:42,height:42,borderRadius:10,border:`1px solid ${C.borderMid}`,background:C.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button></div></div></div>
<div style={{display:mTab==="panel"?"block":"none",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>{panelContent}</div>
</div>}
{(rp==="br"||rp==="ct")&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:isMobile?"8px 12px 16px":"8px 24px 16px",maxWidth:isMobile?"100%":1224,margin:"0 auto",width:"100%",alignItems:"center"}}>
{rp==="br"&&<button onClick={gCnt} style={{height:40,padding:"0 20px",borderRadius:10,background:C.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background="#5a22d9"} onMouseLeave={e=>e.currentTarget.style.background=C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Generate Content</button>}
{rp==="ct"&&<button onClick={reset} style={{height:40,padding:"0 20px",borderRadius:10,background:C.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background="#5a22d9"} onMouseLeave={e=>e.currentTarget.style.background=C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Start New Page</button>}
<button style={{height:40,padding:"0 20px",borderRadius:10,background:C.surface,border:`1px solid ${C.borderMid}`,color:C.dark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Export PDF</button>
{!isMobile&&<button onClick={onHome} style={{height:40,padding:"0 20px",borderRadius:10,background:C.surface,border:`1px solid ${C.borderMid}`,color:C.dark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}>Try Other Tools</button>}
</div>}
</div>;}

window.ContentBuilder = ContentBuilder;
