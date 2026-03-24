/* IvaBot Content Coverage v2 — full audit with mock data, all fixes */
const{useState,useRef,useEffect,useCallback}=React;
console.log("[IvaBot] content-coverage.js v4 loaded");

/* ═══ CONFIG ═══ */
const USE_MOCK=true;
const SUPABASE_URL="https://empuzslozakbicmenxfo.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcHV6c2xvemFrYmljbWVueGZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MjM0MDEsImV4cCI6MjA3OTM5OTQwMX0.d89Kk93fqL77Eq6jHGS5TdPzaWsWva632QoS4aPOm9E";

/* ═══ COLORS (identical to Core Audit + CB) ═══ */
const C={bg:"#FBF5FF",surface:"#ffffff",accent:"#6E2BFF",accentLight:"#f3f0fd",dark:"#151415",muted:"#928E95",border:"rgba(21,20,21,0.08)",borderMid:"rgba(21,20,21,0.12)",green:"#22C55E",red:"#EF4444",card:"#F0EAFF",cardBorder:"rgba(110,43,255,0.08)",numBg:"#6E2BFF",hoverBorder:"rgba(110,43,255,0.2)",hoverShadow:"0 0 0 1px rgba(110,43,255,0.2), 0 8px 32px rgba(110,43,255,0.1)"};

/* ═══ PRIMITIVES (1:1 from seo-tools.js) ═══ */
const Tip=({text,children})=>{const[s,setS]=useState(false);const ref=useRef(null);const[pos,setPos]=useState({above:true,alignRight:false});return(<span ref={ref} style={{position:"relative",display:"inline-flex",alignItems:"center"}} onMouseEnter={()=>{if(ref.current){const rect=ref.current.getBoundingClientRect();setPos({above:rect.top>160,alignRight:rect.left>window.innerWidth/2});}setS(true);}} onMouseLeave={()=>setS(false)}>{children}{s&&<span style={{position:"absolute",...(pos.above?{bottom:"calc(100% + 8px)"}:{top:"calc(100% + 8px)"}), ...(pos.alignRight?{right:0}:{left:0}),background:C.surface,color:C.dark,padding:"10px 14px",borderRadius:10,fontSize:11,lineHeight:1.5,width:260,maxWidth:"85vw",zIndex:9999,fontWeight:400,boxShadow:"0 4px 24px rgba(0,0,0,0.14)",border:`1px solid ${C.border}`,pointerEvents:"none",whiteSpace:"normal",wordBreak:"break-word",textAlign:"left"}}>{text}</span>}</span>);};
const QM=({text})=>(<Tip text={text}><span style={{width:16,height:16,borderRadius:"50%",border:`1px solid ${C.borderMid}`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:C.muted,cursor:"help",marginLeft:4,flexShrink:0,verticalAlign:"top",position:"relative",top:-1}}>?</span></Tip>);
const CopyBtn=({text})=>{const[c,setC]=useState(false);return(<button onClick={()=>{navigator.clipboard?.writeText(text);setC(true);setTimeout(()=>setC(false),1500);}} style={{fontSize:10,fontWeight:600,color:c?"#9B7AE6":C.accent,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"2px 6px"}}>{c?"Copied!":"Copy"}</button>);};
const HoverCard=({children,style={}})=>(<div style={{borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,transition:"box-shadow 0.3s, border-color 0.3s",cursor:"default",...style}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.hoverBorder;e.currentTarget.style.boxShadow=C.hoverShadow;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="none";}}>{children}</div>);

const Fold=({title,children,open:d=false,borderColor,headerBg,titleColor,count})=>{const[o,setO]=useState(d);return(<div style={{borderRadius:12,border:`1px solid ${borderColor||C.border}`,overflow:"hidden",background:C.surface}}><button onClick={()=>setO(!o)} style={{width:"100%",padding:"14px 16px",background:headerBg||"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'DM Sans',sans-serif"}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14,fontWeight:700,color:titleColor||C.dark}}>{title}</span>{count!=null&&<span style={{fontSize:11,fontWeight:600,color:titleColor?"rgba(255,255,255,0.7)":C.muted,background:titleColor?"rgba(255,255,255,0.2)":"rgba(255,255,255,0.5)",padding:"2px 8px",borderRadius:10}}>{count}</span>}</div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={titleColor||C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.3s ease",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></button><div style={{display:"grid",gridTemplateRows:o?"1fr":"0fr",opacity:o?1:0,transition:"grid-template-rows 0.7s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease"}}><div style={{overflow:"hidden"}}><div style={{padding:"0 16px 16px",borderTop:`1px solid ${borderColor||C.border}`}}>{children}</div></div></div></div>);};

const WorkingItem=({title,content})=>{const[o,setO]=useState(false);return(<div style={{borderRadius:10,border:`1px solid ${C.cardBorder}`,overflow:"hidden",background:C.surface}}><button onClick={()=>setO(!o)} style={{width:"100%",padding:"11px 14px",background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontFamily:"'DM Sans',sans-serif"}}><span style={{color:"#9B7AE6",flexShrink:0,fontSize:13,fontWeight:600}}>✓</span><span style={{fontSize:13,fontWeight:600,color:C.dark,flex:1,textAlign:"left"}}>{title}</span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></button>{o&&<div style={{padding:"0 14px 14px",borderTop:`1px solid ${C.cardBorder}`}}><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>{content}</div></div>}</div>);};

const InfoBlock=({label,value,borderColor})=>{const renderLine=(line,i)=>{const hMatch=line.match(/^(H[1-3]):\s*(.*)/);if(hMatch){const lv=hMatch[1],text=hMatch[2];const hColorMap={H1:{color:"#6E2BFF",bg:"rgba(110,43,255,0.08)"},H2:{color:"#9B7AE6",bg:"rgba(155,122,230,0.08)"},H3:{color:"#B89CF0",bg:"rgba(184,156,240,0.12)"}};const hc=hColorMap[lv]||hColorMap.H2;const isBroken=text.includes("⚠");return(<div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:12.5,fontWeight:500,color:isBroken?C.accent:C.dark,padding:"2px 0"}}><span style={{fontSize:9,fontWeight:600,color:isBroken?C.accent:hc.color,background:isBroken?"rgba(110,43,255,0.08)":hc.bg,padding:"2px 5px",borderRadius:3,minWidth:22,textAlign:"center",flexShrink:0}}>{lv}</span><span>{text}</span></div>);}return<div key={i} style={{padding:"2px 0"}}>{line}</div>;};return(<div style={{padding:"10px 14px",borderRadius:8,background:C.surface,border:`1px solid ${borderColor||C.border}`}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:3}}>{label}</div><div style={{fontSize:13,fontWeight:500,color:C.dark,lineHeight:1.5}}>{typeof value==="string"?value.split("\n").map(renderLine):value}</div></div>);};

const ProblemCard=({title,why,currentLabel,current,suggestions,sugLabel,showCopy=true,links,serpSnippet,soft})=>{const[o,setO]=useState(false);return(<div style={{borderRadius:12,border:soft?"1px solid rgba(110,43,255,0.12)":"1px solid rgba(110,43,255,0.25)",overflow:"hidden",background:C.surface}}><button onClick={()=>setO(!o)} style={{width:"100%",padding:"13px 16px",background:C.surface,border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontFamily:"'DM Sans',sans-serif"}}><div style={{width:6,height:6,borderRadius:"50%",background:soft?"#B89CF0":C.accent,flexShrink:0}}/><span style={{fontSize:13,fontWeight:600,color:C.dark,flex:1,textAlign:"left"}}>{title}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" style={{transform:o?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s",flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg></button>{o&&(<div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.cardBorder}`}}><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>{serpSnippet&&<SerpSnippet {...serpSnippet}/>}{current&&(typeof current==="string"?<InfoBlock label={currentLabel||"Current"} value={current} borderColor="rgba(110,43,255,0.15)"/>:<div style={{padding:"10px 14px",borderRadius:8,background:C.surface,border:"1px solid rgba(110,43,255,0.15)"}}><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:6}}>{currentLabel||"Current"}</div>{current}</div>)}{why&&<BotNote inline text={why}/>}{suggestions?.length>0&&<div><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:6}}>{sugLabel||"Suggested"}</div><div style={{display:"flex",flexDirection:"column",gap:5}}>{suggestions.map((s,i)=>showCopy?(<HoverCard key={i} style={{padding:"9px 12px"}}><span style={{fontSize:12.5,color:C.dark,fontWeight:500,display:"block",marginBottom:4}}>{s}</span><CopyBtn text={s}/></HoverCard>):(<div key={i} style={{padding:"9px 12px",borderRadius:10,border:`1px solid ${C.border}`,background:C.surface,fontSize:12.5,color:C.dark,fontWeight:500}}>{s}</div>))}</div></div>}{links?.length>0&&<div><div style={{fontSize:10,fontWeight:600,color:C.muted,marginBottom:6}}>Learn more</div>{links.map((l,i)=>(<a key={i} href={l.url} target="_blank" rel="noopener noreferrer" style={{display:"block",fontSize:12,color:C.accent,marginBottom:4,textDecoration:"none"}}>{l.label} →</a>))}</div>}</div></div>)}</div>);};

const SerpSnippet=({url,title,desc,hideDesc})=>(<div style={{padding:"12px 14px",borderRadius:10,background:"#f8f7f9",border:`1px solid ${C.border}`}}><div style={{fontSize:11,color:"#1a0dab",marginBottom:2,wordBreak:"break-all"}}>{url}</div><div style={{fontSize:14,fontWeight:600,color:"#1a0dab",marginBottom:hideDesc?0:4}}>{title}</div>{!hideDesc&&desc&&<div style={{fontSize:12,color:"#545454",lineHeight:1.4}}>{desc}</div>}</div>);

/* Bot bubbles */
const BL=({s=16})=>(<svg width={s} height={Math.round(s*0.81)} viewBox="0 0 66 58" fill="none" style={{flexShrink:0,opacity:0.35}}><path d="M63 44.4C61 50.8 61 52.7 56.4 54L33.5 58c-.7-4.6 2.3-8.9 6.7-9.6L63 44.4z" fill="#6E2BFF"/><path fillRule="evenodd" d="M46.3.1c1.7-.3 3.5 0 5 .8l9.4 4.8c2.8 1.4 4.5 4.3 4.5 7.5v21.2c0 4.1-2.9 7.6-6.8 8.3L18.9 49.4c-1.7.3-3.4 0-5-.8L4.5 43.8C1.7 42.4 0 39.5 0 36.3V15.1C0 11 2.9 7.5 6.8 6.9L46.3.1zM16.3 16.4c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.7-8.4-8.2-8.4zm32.6 0c-4.5 0-8.2 3.7-8.2 8.4s3.7 8.4 8.2 8.4 8.2-3.7 8.2-8.4-3.6-8.4-8.2-8.4z" fill="#6E2BFF"/></svg>);
const BotLogo=()=><BL s={16}/>;
const UA=({n})=><div style={{width:20,height:20,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:10,fontWeight:700,color:"#fff"}}>{(n||"U")[0].toUpperCase()}</span></div>;
const BB=({children})=><div style={{display:"flex",flexDirection:"column",alignItems:"flex-start",maxWidth:"90%",alignSelf:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`,fontSize:13,color:C.dark,lineHeight:1.5}}>{children}</div></div>;
const UB=({children,n})=><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",maxWidth:"80%",alignSelf:"flex-end"}}><div style={{marginBottom:3,marginRight:2}}><UA n={n}/></div><div style={{padding:"8px 14px",borderRadius:"12px 4px 12px 12px",background:C.accent,fontSize:13,color:"#fff"}}>{children}</div></div>;
const BotNote=({text,inline})=>inline?(<div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",marginBottom:8}}><BotLogo/><span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{text}</span></div>):(<div className="reveal" style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",marginBottom:8}}><BotLogo/><span style={{fontSize:12,color:C.muted,lineHeight:1.5}}>{text}</span></div>);

const useIsMobile=()=>{const[m,sm]=useState(window.innerWidth<1024);useEffect(()=>{const h=()=>sm(window.innerWidth<1024);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);return m;};
const LBar=({step,total,text})=>{const p=((step+1)/total)*100;return(<div style={{padding:"14px 16px",background:C.surface,borderRadius:10,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,fontWeight:500,color:C.dark}}>{text}</span><span style={{fontSize:11,fontWeight:600,color:C.accent}}>{Math.round(p)}%</span></div><div style={{height:4,background:"rgba(110,43,255,0.08)",borderRadius:100,overflow:"hidden"}}><div style={{height:"100%",background:C.accent,borderRadius:100,width:`${p}%`,transition:"width 0.5s ease"}}/></div></div>);};
const MobileTab=({active,onSwitch,hasReport})=>{if(!hasReport)return null;return<div style={{display:"flex",gap:0,background:"rgba(21,20,21,0.04)",borderRadius:10,padding:3,margin:"0 16px 8px"}}><button onClick={()=>onSwitch("chat")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="chat"?C.surface:"transparent",color:active==="chat"?C.dark:C.muted,boxShadow:active==="chat"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Chat</button><button onClick={()=>onSwitch("report")} style={{flex:1,padding:"8px 0",borderRadius:8,border:"none",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",background:active==="report"?C.surface:"transparent",color:active==="report"?C.dark:C.muted,boxShadow:active==="report"?"0 1px 3px rgba(0,0,0,0.06)":"none"}}>Report</button></div>;};

/* ═══ RANKINGS TABLE — 1:1 from Core Audit with QM tooltips ═══ */
const fmtVol=(v)=>{if(!v)return"—";if(v>=1000000)return(v/1000000).toFixed(1).replace(/\.0$/,"")+"M";if(v>=1000)return(v/1000).toFixed(1).replace(/\.0$/,"")+"K";return v.toLocaleString();};
const RankingsTable=({rows,emptyMsg})=>(<div className="iva-scroll-inner" style={{background:C.surface,borderRadius:10,padding:"4px 14px",border:`1px solid ${C.cardBorder}`,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}><thead><tr style={{borderBottom:`1px solid ${C.border}`}}><th style={{textAlign:"left",padding:"8px 0",color:C.muted,fontWeight:500,fontSize:11.5}}>Keyword</th><th style={{textAlign:"center",padding:"8px 4px",color:C.muted,fontWeight:500,fontSize:11.5,width:50,whiteSpace:"nowrap"}}>Pos. <QM text="Your page's position in Google search results for this keyword. Position 1 = top result. Based on your target region."/></th><th style={{textAlign:"right",padding:"8px 4px",color:C.muted,fontWeight:500,fontSize:11.5,width:70,whiteSpace:"nowrap"}}>Vol. <QM text="Monthly search volume — how many times per month people search this keyword in Google."/></th><th style={{textAlign:"right",padding:"8px 0",color:C.muted,fontWeight:500,fontSize:11.5,width:50,whiteSpace:"nowrap"}}>KD <QM text="Keyword difficulty (0–100) — how hard it is to rank in the top 10. Under 30 = easy, 30–60 = moderate, 60+ = hard."/></th></tr></thead><tbody>{rows&&rows.length>0?rows.map((r,i)=>(<tr key={i} style={{borderBottom:i<rows.length-1?`1px solid rgba(21,20,21,0.04)`:"none"}}><td style={{padding:"10px 8px 10px 0",color:C.dark,fontWeight:500}}>{r.keyword}</td><td style={{textAlign:"center",padding:"10px 4px"}}>{r.position!=null?(<span style={{background:r.position<=3?"rgba(110,43,255,0.08)":"rgba(21,20,21,0.04)",color:r.position<=3?C.accent:C.muted,fontWeight:600,padding:"3px 10px",borderRadius:8,fontSize:12}}>{r.position}</span>):<span style={{color:C.muted,fontSize:10,background:"rgba(21,20,21,0.03)",padding:"3px 8px",borderRadius:6}}>—</span>}</td><td style={{textAlign:"right",padding:"10px 4px",color:C.dark,fontSize:12,whiteSpace:"nowrap"}}>{fmtVol(r.volume)}</td><td style={{textAlign:"right",padding:"10px 0",color:C.muted,fontSize:12,whiteSpace:"nowrap"}}>{r.difficulty!=null?r.difficulty:"—"}</td></tr>)):<tr><td colSpan={4} style={{padding:"14px 0",color:C.muted,fontSize:12,textAlign:"center"}}>{emptyMsg||"No data available yet."}</td></tr>}</tbody></table></div>);

/* Btn — same as Content Builder */
const Btn=({text,onClick,primary,disabled:d})=><button onClick={d?undefined:onClick} style={{padding:"9px 20px",borderRadius:10,border:primary?"none":`1px solid ${C.borderMid}`,background:primary?C.accent:C.surface,color:primary?"#fff":C.dark,fontSize:13,fontWeight:600,cursor:d?"default":"pointer",fontFamily:"'DM Sans',sans-serif",opacity:d?0.4:1,pointerEvents:d?"none":"auto"}} onMouseEnter={e=>{if(!primary&&!d){e.currentTarget.style.background=C.accentLight;e.currentTarget.style.borderColor=C.hoverBorder;}}} onMouseLeave={e=>{if(!primary&&!d){e.currentTarget.style.background=C.surface;e.currentTarget.style.borderColor=C.borderMid;}}}>{text}</button>;

function valUrl(raw){let s=raw.trim();if(!s)return{ok:false,e:"Paste a URL to start."};const m=s.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/i);if(m)s=m[0];else{const d=s.match(/[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}[^\s]*/);if(d)s="https://"+d[0];else return{ok:false,e:"Need a URL like https://example.com"};}s=s.replace(/\s+/g,"");if(!s.startsWith("http"))s="https://"+s;try{const u=new URL(s);if(!u.hostname.includes("."))return{ok:false,e:"Not valid."};return{ok:true,url:u.href};}catch{return{ok:false,e:"Not valid."};}}

/* ═══ MOCK DATA ═══ */
const MOCK={
  url:"https://www.apple.com/",title:"Apple",
  desc:"Discover the innovative world of Apple and shop everything iPhone, iPad, Apple Watch, Mac, and Apple TV, plus explore accessories, entertainment, and expert device support.",
  ctx:{url:"https://www.apple.com/",title:"Apple",topic:"Official Apple product and service page",owner:"Apple Inc.",goal:"Sell",industry:"Technology",region:"Global",competition:"High",message:"Discover the innovative world of Apple and shop everything from devices to entertainment."},
  keywords:[{keyword:"Apple Store",position:null,volume:null,difficulty:null},{keyword:"Mac accessories",position:null,volume:null,difficulty:null},{keyword:"iPhone support options",position:null,volume:null,difficulty:null}],
  userKeywords:[],
  headings:[{level:"H1",text:"Apple"},{level:"H2",text:"MacBook Neo"},{level:"H2",text:"iPhone"},{level:"H2",text:"iPad Air"},{level:"H2",text:"Endless entertainment."},{level:"H3",text:"WWDC 26"},{level:"H3",text:"MacBook Pro"},{level:"H3",text:"Apple Watch Series 11"},{level:"H3",text:"Apple Trade In"},{level:"H3",text:"Apple Card"}],
  titleStatus:"bad",
  titleEval:{title:"Meta Title Too Short",why:"Your title is only 5 characters. Google needs more context to understand your page — aim for 30–60 characters with your main keyword near the beginning.",sugLabel:"Suggested Titles",suggestions:["Apple Products — Shop iPhone, Mac, iPad & More","Apple Store — Devices, Accessories & Support","Explore Apple: iPhones, Macs, iPads & Entertainment"],showCopy:true,serpSnippet:{url:"https://www.apple.com/",title:"Apple",desc:"Discover the innovative world of Apple...",hideDesc:true}},
  descStatus:"good",descLen:171,
  h1Status:"bad",
  h1Eval:{title:"H1 Too Short and Matches Title",why:"Your H1 is identical to your title and only 1 word long. The H1 should expand on the title and clearly describe what the page is about. Rewrite the H1 to be unique and include your primary keyword.",sugLabel:"Suggested H1",suggestions:["Discover Apple Products and Services","Shop the Latest iPhone, Mac, iPad & Apple Watch","Apple — Devices, Accessories, and Entertainment"],showCopy:true},
  h2h3Status:"good",
  bodyStatus:"bad",
  bodyEval:{scanChars:4200,totalExact:0,totalTokens:24,occurrences:"• word \"apple\" — appears 5 times\n• word \"store\" — appears 7 times\n• word \"mac\" — appears 7 times\n• word \"iphone\" — appears 5 times",statusLine:"No exact keyword phrases found in your body text.",budgetPer:[1,2],budgetTotal:[4,6]},
  semanticMissing:{autocomplete:["how to find an Apple Store location","Mac accessories for graphic designers","Apple Store online shopping experience","essential Mac accessories for students","iPhone support options for cracked screen","iPhone support options for troubleshooting"],related:["Apple Store near me","Mac accessories for video editing","Apple Store appointment scheduling","best Mac accessories for productivity","iPhone support options for battery issues","iPhone support options for software updates"],paa:["How can I get support for my Mac?","What services does the Apple Store provide?","Can I return accessories to the Apple Store?","What are the best accessories for a MacBook?","What should I do if my iPhone won't turn on?","How do I contact Apple support for my iPhone?"]},
  trust:{contacts:{found:true},socials:{found:false},testimonials:{found:false},faq:{found:false},cta:{found:true,text:"Learn more"}},
  cannibalization:[{keyword:"Apple Store",pages:["apple.com/","apple.com/shop","apple.com/retail"]}],
  fullBalance:"underused",
};

/* ═══ BUILD RESULTS ═══ */
function buildCoverageResults(d){
  const NB=C.cardBorder;
  const contentGood=[],contentBad=[],trustGood=[],trustBad=[];
  const ukw=d.userKeywords||[];

  /* Title */
  if(d.titleStatus==="good"){
    contentGood.push({title:"Meta Title",content:(<><SerpSnippet url={d.url} title={d.title} desc={d.desc} hideDesc/><BotNote inline text={`Your title is ${d.title.length} characters — right in the sweet spot (30–60). This is the #1 on-page signal Google uses to understand your content.`}/></>)});
  }else{
    contentBad.push({...d.titleEval});
  }

  /* Description */
  if(d.descStatus==="good"){
    contentGood.push({title:"Meta Description",content:(<><SerpSnippet url={d.url} title={d.title} desc={d.desc}/><BotNote inline text={`Your description is ${d.descLen||d.desc.length} characters — within 120–160, the sweet spot. This is what users see in search results, so a good one means more clicks.`}/></>)});
  }else{
    contentBad.push({title:"Description Needs Work",why:"Your meta description is too short or missing keywords. Aim for 120–160 characters that include your primary keyword and clearly describe the page.",sugLabel:"Suggested Descriptions",suggestions:["Shop the latest iPhone, iPad, Apple Watch, Mac and Apple TV, plus accessories and expert support.","Find everything Apple — iPhones to Macs, accessories, entertainment, backed by expert support."],showCopy:true,serpSnippet:{url:d.url,title:d.title,desc:d.desc}});
  }

  /* Headings */
  if(d.h1Status==="good"&&d.h2h3Status==="good"){
    const h1=d.headings.filter(h=>h.level==="H1"),h2=d.headings.filter(h=>h.level==="H2"),h3=d.headings.filter(h=>h.level==="H3");
    contentGood.push({title:"Heading Structure",content:(<><InfoBlock label={`H1 — ${h1.length} found`} value={h1.map(h=>`H1: ${h.text}`).join("\n")} borderColor={NB}/><InfoBlock label={`H2 — ${h2.length} found`} value={h2.map(h=>`H2: ${h.text}`).join("\n")} borderColor={NB}/><InfoBlock label={`H3 — ${h3.length} found`} value={h3.map(h=>`H3: ${h.text}`).join("\n")} borderColor={NB}/><BotNote inline text="Think of headings as a table of contents. H1 is your main topic, H2s are chapters, H3s are subsections. Google uses this hierarchy to understand your page."/></>)});
  }else{
    contentBad.push({...d.h1Eval,title:d.h1Eval?.title||"Heading Structure Needs Work"});
  }

  /* Body Content — Keyword Coverage */
  if(d.bodyStatus==="good"){
    contentGood.push({title:"Body Content — Keyword Coverage",content:(<><InfoBlock label="Keyword scan results" value={d.bodyEval.occurrences} borderColor={NB}/><BotNote inline text="Your keywords appear naturally throughout the body text — good balance without overuse."/></>)});
  }else{
    const be=d.bodyEval;const actionLines=(ukw.length?ukw:d.keywords.map(k=>k.keyword||k)).map(k=>`• "${typeof k==="string"?k:k.keyword}" — ${be.budgetPer[0]}–${be.budgetPer[1]} times`);
    contentBad.push({title:"Body Content — Keyword Coverage",currentLabel:"Keyword scan results (phrases & words)",current:be.occurrences||"No keyword phrases detected in the body text.",why:"Body content is the main text on your page — paragraphs, descriptions, and explanations that visitors read. Your keywords should appear as exact phrases in this text to reinforce topical relevance. Individual words are present, but Google weights exact phrase matches more heavily.",sugLabel:"Recommended keyword usage",suggestions:[...actionLines,`Total recommended: ${be.budgetTotal[0]}–${be.budgetTotal[1]} times across the entire body text.`],showCopy:false});
  }

  /* Semantic Expansion */
  if(d.semanticMissing){
    const sm=d.semanticMissing;const allMissing=[...sm.autocomplete,...sm.related,...sm.paa];
    if(allMissing.length>0){
      contentBad.push({title:"Semantic Expansion — Topics You May Be Missing",soft:true,
        why:"I've gathered extra keyword phrases from Google search results. These show what people actually type into Google in your topic. Adding relevant ones can broaden your reach and bring more targeted visitors. Avoid keyword stuffing — add only when it improves meaning and readability.",
        currentLabel:"Missing from your page",
        current:(<div style={{display:"flex",flexDirection:"column",gap:14}}>
          {sm.autocomplete.length>0&&<div><div style={{fontSize:11,fontWeight:600,color:C.dark,marginBottom:2}}>Autocomplete <QM text="These are Google's suggestions that appear as users type your keyword into the search bar. They reflect real, popular search patterns."/></div><div style={{fontSize:11.5,color:C.muted,marginBottom:6}}>Google's suggestions as you type — real, popular search patterns.</div>{sm.autocomplete.map((s,i)=><div key={i} style={{fontSize:12,color:C.dark,padding:"3px 0"}}>• {s}</div>)}</div>}
          {sm.related.length>0&&<div><div style={{fontSize:11,fontWeight:600,color:C.dark,marginBottom:2}}>Related searches <QM text="These queries appear at the bottom of Google's search results page. They show what users also search for after your keyword."/></div><div style={{fontSize:11.5,color:C.muted,marginBottom:6}}>Queries users also look for — shown at the bottom of Google results.</div>{sm.related.map((s,i)=><div key={i} style={{fontSize:12,color:C.dark,padding:"3px 0"}}>• {s}</div>)}</div>}
          {sm.paa.length>0&&<div><div style={{fontSize:11,fontWeight:600,color:C.dark,marginBottom:2}}>People Also Ask <QM text="These are real questions that Google shows in a special FAQ-style block on the search results page. Answering them on your page can help you appear in this block."/></div><div style={{fontSize:11.5,color:C.muted,marginBottom:6}}>Common questions shown in Google — answering them can get you featured.</div>{sm.paa.map((s,i)=><div key={i} style={{fontSize:12,color:C.dark,padding:"3px 0"}}>• {s}</div>)}</div>}
        </div>),
        sugLabel:"How to use these",
        suggestions:["Pick 1–2 relevant phrases from Related Searches and weave them naturally into your H2/H3 headings","Take 3–5 questions from People Also Ask and create a short FAQ section on your page","Mention 1–2 Autocomplete phrases naturally in your body text where they fit the context"],
        showCopy:false
      });
    }
  }

  /* Cannibalization */
  if(d.cannibalization?.length>0){
    const items=d.cannibalization.map(c=>`"${c.keyword}" — found on: ${c.pages.join(", ")}`);
    contentBad.push({title:"Keyword Cannibalization",soft:true,
      currentLabel:"Affected keywords and pages",current:items.join("\n"),
      why:"Keyword cannibalization means multiple pages on your domain are competing for the same search query. When Google sees several of your pages targeting the same keyword, it doesn't know which one to rank — so it may rank none of them well. This is common and fixable.",
      sugLabel:"How to fix this",
      suggestions:["Pick one primary page per keyword — make it the most complete and relevant","On other pages, change the focus to a different but related keyword","If pages are too similar, consider merging them into one comprehensive page","Use canonical tags if duplicate pages must exist for technical reasons"],
      showCopy:false
    });
  }

  /* Trust: Contacts */
  if(d.trust.contacts.found) trustGood.push({title:"Contact Information",content:(<><InfoBlock label="Status" value="Contact information detected on your page." borderColor={NB}/><BotNote inline text="Visible contact info builds trust with visitors and search engines — it's a key E-E-A-T signal."/></>)});
  else trustBad.push({title:"No Contact Information",why:"No contact details found on your page. Adding an email, phone number, or contact form helps build trust with both users and search engines.",suggestions:["Add a contact section or footer with email/phone","Include a contact form on the page"],showCopy:false});

  /* Trust: CTA */
  if(d.trust.cta.found) trustGood.push({title:"Call to Action",content:(<><InfoBlock label="Current CTA" value={`"${d.trust.cta.text}"`} borderColor={NB}/><BotNote inline text="A clear call-to-action guides visitors to the next step — buy, sign up, learn more. Pages with visible CTAs convert better."/></>)});
  else trustBad.push({title:"No CTA Found",why:"A call-to-action (CTA) is a button or link that guides visitors to take action — like 'Buy now', 'Sign up', or 'Contact us'. Without one, visitors may leave without converting.",suggestions:["Add a prominent CTA above the fold"],showCopy:false});

  /* Trust: Social */
  if(d.trust.socials.found) trustGood.push({title:"Social Profiles",content:(<><InfoBlock label="Status" value="Social media links detected." borderColor={NB}/><BotNote inline text="Social profiles reinforce brand recognition and give users multiple ways to connect with you."/></>)});
  else trustBad.push({title:"No Social Profiles Found",why:"No social media links found on your page. Adding links to your active profiles (Instagram, Facebook, LinkedIn, X) strengthens trust and brand visibility.",suggestions:["Add social profile links to your footer or header","Link at least 2 relevant social accounts"],showCopy:false});

  /* Trust: Testimonials */
  if(d.trust.testimonials.found) trustGood.push({title:"Testimonials / Social Proof",content:(<><InfoBlock label="Status" value="Testimonials or reviews detected." borderColor={NB}/><BotNote inline text="Social proof helps visitors trust your brand and makes them more likely to take action."/></>)});
  else trustBad.push({title:"No Testimonials Found",why:"No testimonials or reviews detected. Adding 2–3 short customer quotes or case study mentions builds social proof and increases conversion.",suggestions:["Add 2–3 short testimonials from customers","Include star ratings or review counts if available"],showCopy:false});

  /* Trust: FAQ */
  if(d.trust.faq.found) trustGood.push({title:"FAQ Section",content:(<><InfoBlock label="Status" value="FAQ section detected on your page." borderColor={NB}/><BotNote inline text="FAQ sections help users find answers quickly and improve your chances of appearing in Google's 'People Also Ask' results."/></>)});
  else trustBad.push({title:"No FAQ Section",why:"No FAQ section found. Adding 3–5 common questions and answers improves E-E-A-T signals and can help you appear in Google's 'People Also Ask' feature.",suggestions:["Add a short FAQ with 3–5 questions related to your topic","Use questions from Google's 'People Also Ask' for your keywords"],showCopy:false});

  return{contentGood,contentBad,trustGood,trustBad};
}

/* ═══ RANKING GAPS ═══ */
function buildRankingGaps(d){
  const g=[];
  if(d.titleStatus!=="good")g.push({text:"Title too short — lacks descriptive keywords and context.",critical:true});
  if(d.h1Status!=="good")g.push({text:"H1 too short or matches the title — rewrite for clarity.",critical:true});
  if(d.bodyStatus!=="good")g.push({text:"Missing keyword phrases in body text — weak search relevance.",critical:true});
  if(d.fullBalance==="underused")g.push({text:"Keywords underused across the page — title, headings, and body need more coverage.",critical:true});
  if(!d.trust.testimonials.found)g.push({text:"No testimonials — weak social proof and trust signals.",critical:false});
  if(!d.trust.faq.found)g.push({text:"No FAQ section — fewer informational and trust indicators.",critical:false});
  if(!d.trust.socials.found)g.push({text:"Missing social profiles — weak off-page trust and visibility.",critical:false});
  if(d.cannibalization?.length>0)g.push({text:"Keyword cannibalization — multiple pages compete for the same keyword.",critical:false});
  return g;
}

/* ═══ REPORT ═══ */
const CoverageReport=({data})=>{
  const{contentGood,contentBad,trustGood,trustBad}=buildCoverageResults(data);
  const allBad=[...contentBad,...trustBad];
  const ukw=data.userKeywords||[];

  return(<div style={{maxWidth:580,margin:"0 auto",padding:"20px 16px 16px"}}>
    <BotNote text="Here's your full content coverage audit. I'll walk you through each part — what's working, what needs fixing, and exactly how to fix it."/>

    {/* Page Summary */}
    <BotNote text="This summary reflects how search engines are likely to interpret your page based on visible content, structure, and text signals."/>
    <div className="reveal reveal-delay-1" style={{marginBottom:16,padding:16,borderRadius:12,background:C.card,border:`1px solid ${C.cardBorder}`}}>
      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:10}}><span style={{fontSize:13,fontWeight:700,color:C.dark}}>Page Context Summary</span><QM text="If something looks off here, it means Google may misunderstand your page's purpose."/></div>
      <div className="iva-ctx-grid">{[{l:"Page URL",v:data.ctx.url},{l:"Page Title",v:data.ctx.title},{l:"Topic",v:data.ctx.topic},{l:"Owner / Creator",v:data.ctx.owner},{l:"Goal",v:data.ctx.goal},{l:"Industry",v:data.ctx.industry},{l:"Region",v:data.ctx.region}].map((x,i)=>(<div key={i} style={{padding:"6px 10px",borderRadius:8,background:C.surface,border:`1px solid ${C.cardBorder}`}}><div style={{fontSize:9,fontWeight:600,color:C.muted,textTransform:"uppercase",marginBottom:1}}>{x.l}</div><div style={{fontSize:12,fontWeight:500,color:C.dark,wordBreak:"break-all"}}>{x.v}</div></div>))}<div style={{gridColumn:"1/-1",padding:"6px 10px",borderRadius:8,background:C.surface,border:`1px solid ${C.cardBorder}`}}><div style={{fontSize:9,fontWeight:600,color:C.muted,textTransform:"uppercase",marginBottom:1}}>Core Message</div><div style={{fontSize:12,fontWeight:500,color:C.dark,lineHeight:1.4}}>{data.ctx.message}</div></div></div>
    </div>

    {/* Keywords: What page is built for */}
    <BotNote text="These are the keywords Google currently associates with your page. All recommendations below are based on these topics."/>
    <div className="reveal reveal-delay-2" style={{marginBottom:16,padding:16,borderRadius:12,background:C.card,border:`1px solid ${C.cardBorder}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.dark}}>What your page is built for</span><QM text="Based on your title, H1–H3 headings, and meta description — these are the search queries your content is currently optimized for."/></div>
        <span style={{fontSize:10,color:C.muted,background:"rgba(21,20,21,0.04)",padding:"3px 10px",borderRadius:10,fontWeight:500}}>content analysis</span>
      </div>
      <div style={{fontSize:11.5,color:C.muted,lineHeight:1.5,marginBottom:10}}>Based on your title, headings (H1–H3), and meta description — these are the search queries your content is currently optimized for.</div>
      <RankingsTable rows={data.keywords} emptyMsg="Keywords will appear after audit completes."/>
      <BotNote inline text="If your real rankings don't match these keywords, your content may need better keyword targeting. Update your headings and meta tags to align with your target queries."/>
    </div>

    {/* Keywords: User target */}
    {ukw.length>0&&<div className="reveal" style={{marginBottom:20,padding:16,borderRadius:12,background:C.card,border:`1px solid ${C.cardBorder}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.dark}}>What you want to rank for</span><QM text="These are the keywords you provided — the audit checks how well your page covers them."/></div>
        <span style={{fontSize:10,color:C.accent,background:"rgba(110,43,255,0.06)",padding:"3px 10px",borderRadius:10,fontWeight:500}}>your target</span>
      </div>
      <div style={{fontSize:11.5,color:C.muted,lineHeight:1.5,marginBottom:10}}>These keywords were confirmed by you. The entire analysis is based on how well your page covers them.</div>
      <RankingsTable rows={ukw.map(k=>({keyword:k,position:null,volume:null,difficulty:null}))} emptyMsg="No target keywords provided."/>
    </div>}

    {/* Content & Structure Working Well */}
    <BotNote text={contentGood.length>0?`Good news — ${contentGood.length} content elements are already working well on your page.`:"Let's look at your content structure."}/>
    {contentGood.length>0&&<div className="reveal reveal-delay-3" style={{marginBottom:12}}><Fold title="Content & Structure — Working Well" count={contentGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:10}}>{contentGood.map((g,i)=><WorkingItem key={i} title={g.title} content={g.content}/>)}</div></Fold></div>}

    {/* Content & Structure Needs Improvement */}
    <BotNote text={contentBad.length>0?`I found ${contentBad.length} content areas that need attention. Each card has a clear fix — tap to see what to do.`:"Your content structure looks great!"}/>
    {contentBad.length>0&&<div className="reveal" style={{marginBottom:20}}><Fold title="Content & Structure — Needs Improvement" count={contentBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff" open={true}><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>{contentBad.map((p,i)=><ProblemCard key={i} {...p}/>)}</div></Fold></div>}

    {/* Trust Working Well */}
    <BotNote text={trustGood.length>0?`${trustGood.length} trust signals are already in place — that's a solid foundation.`:"Let's check your trust and conversion signals."}/>
    {trustGood.length>0&&<div className="reveal" style={{marginBottom:12}}><Fold title="Trust & Conversion — Working Well" count={trustGood.length} borderColor={C.cardBorder} headerBg={C.card}><div style={{display:"flex",flexDirection:"column",gap:6,marginTop:10}}>{trustGood.map((g,i)=><WorkingItem key={i} title={g.title} content={g.content}/>)}</div></Fold></div>}

    {/* Trust Needs Improvement */}
    <BotNote text={trustBad.length>0?`${trustBad.length} trust signals are missing — adding them can significantly improve conversions.`:"All trust signals are in place!"}/>
    {trustBad.length>0&&<div className="reveal" style={{marginBottom:20}}><Fold title="Trust & Conversion — Needs Improvement" count={trustBad.length} borderColor="rgba(110,43,255,0.3)" headerBg={C.accent} titleColor="#fff"><div style={{display:"flex",flexDirection:"column",gap:8,marginTop:10}}>{trustBad.map((p,i)=><ProblemCard key={i} {...p}/>)}</div></Fold></div>}

    {/* Final Recommendations */}
    <BotNote text="Here's a summary of what to focus on. Fix these and your rankings will improve."/>
    <div className="reveal" style={{marginBottom:8,padding:20,borderRadius:14,background:C.card,border:`1px solid ${C.cardBorder}`}}>
      <div style={{fontSize:15,fontWeight:700,color:C.dark,marginBottom:12}}>Final Recommendations</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {allBad.map((item,i)=>(<div key={i} style={{padding:"12px 14px",borderRadius:10,background:C.surface,border:`1px solid ${C.cardBorder}`}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
            <span style={{color:item.soft?"#B89CF0":C.accent,fontSize:10,marginTop:4}}>●</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.dark,marginBottom:2}}>{item.title}</div>
              {item.why&&typeof item.why==="string"&&<div style={{fontSize:11.5,color:C.muted,marginBottom:item.suggestions?.[0]?6:0}}>{item.why.length>150?item.why.slice(0,147)+"...":item.why}</div>}
              {item.suggestions?.[0]&&typeof item.suggestions[0]==="string"&&<div style={{padding:"6px 10px",borderRadius:6,background:C.bg,display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}}>
                <div><div style={{fontSize:10,color:C.muted}}>Suggested:</div><div style={{fontSize:12,fontWeight:500,color:C.dark}}>{item.suggestions[0]}</div></div>
                {item.showCopy!==false&&<CopyBtn text={item.suggestions[0]}/>}
              </div>}
            </div>
          </div>
        </div>))}
        <div style={{padding:"12px 14px",borderRadius:10,background:C.surface,border:`1px solid ${C.cardBorder}`}}><div style={{display:"flex",alignItems:"flex-start",gap:8}}><span style={{color:C.accent,fontSize:10,marginTop:4}}>●</span><div><div style={{fontSize:13,fontWeight:600,color:C.dark,marginBottom:2}}>Re-audit after changes</div><div style={{fontSize:11.5,color:C.muted}}>Run another Content Coverage Audit to measure your progress and verify improvements.</div></div></div></div>
      </div>
    </div>
  </div>);
};

/* ═══ PLACEHOLDER ═══ */
const CoveragePlaceholder=()=><div style={{minHeight:"calc(100vh - 180px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}>
  <div style={{width:64,height:64,borderRadius:16,background:"rgba(110,43,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
  <div style={{fontSize:18,fontWeight:700,color:C.dark,marginBottom:8}}>Your content coverage report will appear here</div>
  <div style={{fontSize:13,color:C.muted,lineHeight:1.6,textAlign:"center",maxWidth:340,marginBottom:24}}>I'll analyze your page and show you what's missing — so you know exactly what to fix to rank higher and convert more visitors.</div>
  <div style={{display:"flex",flexDirection:"column",gap:10,width:"100%",maxWidth:340}}>
    {[{n:"1",t:"Keywords & context",d:"I check which keywords Google associates with your page and whether they match your goals"},{n:"2",t:"Content & structure",d:"I analyze your title, headings, and body text for keyword coverage, depth, and gaps"},{n:"3",t:"Trust & conversion",d:"I scan for social proof, CTAs, FAQ, and contact info — signals that build trust and drive action"}].map((s,i)=><div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:10,background:"rgba(110,43,255,0.04)",border:"1px solid rgba(110,43,255,0.08)"}}><div style={{width:24,height:24,borderRadius:"50%",background:"rgba(155,122,230,0.12)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}><span style={{fontSize:11,fontWeight:700,color:"#9B7AE6"}}>{s.n}</span></div><div><div style={{fontSize:12,fontWeight:600,color:C.dark}}>{s.t}</div><div style={{fontSize:11,color:C.muted,lineHeight:1.4}}>{s.d}</div></div></div>)}
  </div>
</div>;

const LoadingPanel=({text})=><div style={{minHeight:"calc(100vh - 180px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:48,height:48,borderRadius:12,background:"rgba(110,43,255,0.06)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:16,animation:"pulse 1.5s ease infinite"}}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6E2BFF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div style={{fontSize:14,fontWeight:600,color:C.dark,marginBottom:4}}>{text}</div><div style={{fontSize:12,color:C.muted}}>This usually takes 15–30 seconds</div><style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style></div>;

const STEPS=["Analyzing page structure...","Checking keyword coverage...","Scanning trust signals...","Generating semantic analysis...","Building your report..."];

/* ═══ MAIN COMPONENT ═══ */
function ContentCoverage({onHome,memberName:mn}){
  const isMobile=useIsMobile();
  const[mTab,sMTab]=useState("chat");
  const[pLoad,sPLoad]=useState(null);
  const[step,setStep]=useState("init");
  const[msgs,sMsgs]=useState([]);
  const[typ,sTyp]=useState(false);
  const[showR,setSR]=useState(false);
  const[auditData,setAuditData]=useState(null);
  const[loadStep,setLS]=useState(-1);
  const[extractedKw,setExtractedKw]=useState(null);
  const[userKw,setUserKw]=useState(null);
  const[pageUrl,setPageUrl]=useState(null);
  const chatRef=useRef(null);
  const inputRef=useRef(null);
  const prevMsgCount=useRef(0);

  const scrollChat=useCallback(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[]);
  useEffect(()=>{if(msgs.length>prevMsgCount.current)setTimeout(scrollChat,50);prevMsgCount.current=msgs.length;},[msgs.length]);
  useEffect(()=>{if(typ)setTimeout(scrollChat,50);},[typ]);
  useEffect(()=>{if(!showR)return;const timer=setTimeout(()=>{const obs=new IntersectionObserver((entries)=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");obs.unobserve(e.target);}});},{threshold:0.1});document.querySelectorAll(".reveal:not(.visible)").forEach(el=>obs.observe(el));return()=>obs.disconnect();},100);return()=>clearTimeout(timer);},[showR,auditData]);

  const add=(f,c)=>sMsgs(p=>[...p,{f,c,id:Date.now()+Math.random()}]);
  const bot=(c)=>add("b",c);

  useEffect(()=>{
    sTyp(true);
    setTimeout(()=>{
      sTyp(false);
      add("b",mn?`Hey, ${mn}! Welcome to Content Coverage Audit.`:"Hey! Welcome to Content Coverage Audit.");
      sTyp(true);
    },1500);
    setTimeout(()=>{
      sTyp(false);
      add("b","I'll check how well your page covers target keywords, how deep and structured your content is, and whether your trust signals are strong enough. By fixing the gaps I find, you'll improve this page's visibility in Google.\n\nJust paste your URL below and I'll get started.");
      setStep("url");
    },4000);
  },[]);

  const runAudit=(url,keywords)=>{
    setSR(false);setAuditData(null);sPLoad("Analyzing your page...");setLS(0);
    let i=0;const iv=setInterval(()=>{i++;if(i>=STEPS.length){clearInterval(iv);setLS(STEPS.length-1);}else setLS(i);},1200);
    setTimeout(()=>{clearInterval(iv);setLS(-1);sPLoad(null);setSR(true);
      const d={...MOCK,url,userKeywords:keywords};setAuditData(d);
      if(isMobile)sMTab("report");
      sTyp(true);setTimeout(()=>{sTyp(false);const gaps=buildRankingGaps(d);
        bot("Done! I found "+gaps.length+" issues on your page. Not all of them are critical, but some may require your attention. Check the report "+(isMobile?"in the Report tab":"on the right")+" for details.\n\nAsk me anything if you need help understanding or fixing an issue.");
        setStep("done");
      },1000);
    },STEPS.length*1200+800);
  };

  const send=()=>{
    const el=inputRef.current;if(!el||!el.value.trim())return;
    const text=el.value.trim();el.value="";add("u",text);

    if(step==="url"){
      const v=valUrl(text);if(!v.ok){bot(v.e);return;}
      setPageUrl(v.url);sTyp(true);setStep("parsing");
      setTimeout(()=>{sTyp(false);
        const kw=MOCK.keywords.map(k=>k.keyword||k);setExtractedKw(kw);
        bot(<div>
          <div style={{marginBottom:8}}>This summary reflects how search engines are likely to interpret your page based on visible content, structure, and text signals.</div>
          <div style={{marginBottom:6}}>Primary search queries people might use to find your page:</div>
          <div style={{marginBottom:10}}>{kw.map((k,i)=><div key={i} style={{fontSize:13,color:C.dark,padding:"2px 0"}}>• {k}</div>)}</div>
          <div>If you want this page to rank highly for these keyword phrases, please confirm that they are relevant.</div>
        </div>);
        setStep("keywords");
      },2500);
      return;
    }

    if(step==="own_keywords"){
      const parts=text.split(",").map(s=>s.trim()).filter(Boolean).slice(0,3);
      if(parts.length===0){bot("Please enter at least one keyword phrase, separated by commas.");return;}
      setUserKw(parts);setStep("running");runAudit(pageUrl,parts);return;
    }

    if(step==="done"||showR){
      sTyp(true);setTimeout(()=>{sTyp(false);
        const answers=["To improve your title, add your primary keyword near the beginning and aim for 30–60 characters total.","Your body text has individual keyword words but no exact phrases. Try adding the full phrase naturally in a sentence.","A short FAQ section (3–5 questions) can improve your E-E-A-T signals and help you appear in Google's 'People Also Ask'.","Adding social profile links to your footer is a quick win — it strengthens trust and brand recognition.","Keyword cannibalization means multiple pages compete for the same keyword. Pick one primary page per keyword and differentiate the rest.","Semantic expansion topics are real Google queries related to your keywords. Adding them to headings or body text broadens your reach.","Body content is the main text visitors read on your page — paragraphs, descriptions, explanations. Google scans this text for your keywords.","Trust signals like testimonials, FAQ sections, and contact info help both users and Google feel confident about your page."];
        bot(answers[Math.floor(Math.random()*answers.length)]);
      },2000);return;
    }
  };

  const lastBotIdx=msgs.reduce((acc,m,i)=>m.f==="b"?i:acc,-1);
  const chatMessages=<React.Fragment>
    <style>{`.cb-past-msg{opacity:0.75}.cb-past-msg button:not(.bot-tip-expand){pointer-events:none!important;cursor:default!important;opacity:0.5}`}</style>
    {msgs.map((m,i)=>m.f==="b"?<div key={m.id} className={i<lastBotIdx?"cb-past-msg":undefined}><BB>{typeof m.c==="string"?m.c.split("\n").map((line,j)=><span key={j}>{j>0&&<br/>}{line}</span>):m.c}</BB></div>:<UB key={m.id} n={mn}>{m.c}</UB>)}
    {loadStep>=0&&<div style={{maxWidth:"95%",alignSelf:"flex-start"}}><LBar step={loadStep} total={STEPS.length} text={STEPS[loadStep]}/></div>}
    {typ&&<div style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><div style={{marginBottom:3,marginLeft:2}}><BL s={16}/></div><div style={{padding:"10px 14px",borderRadius:"4px 12px 12px 12px",background:C.surface,border:`1px solid ${C.border}`}}><div className="typing-dots"><span/><span/><span/></div></div></div>}
    {step==="keywords"&&extractedKw&&<div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}><Btn text="Use These Keywords" onClick={()=>{add("u","Use these keywords");setUserKw(extractedKw);setStep("running");runAudit(pageUrl,extractedKw);}}/><Btn text="Write My Own" onClick={()=>{setStep("own_keywords");bot("Type your target keywords below. Max 3 phrases, 2–3 words each, separated by commas.");}}/></div>}
  </React.Fragment>;

  const panelContent=<React.Fragment>{pLoad?<LoadingPanel text={pLoad}/>:showR&&auditData?<div style={{animation:"fadeIn 0.5s ease",minHeight:"calc(100vh - 130px)"}}><CoverageReport data={auditData}/></div>:<CoveragePlaceholder/>}</React.Fragment>;
  const placeholder=step==="url"?"Paste your URL here...":step==="own_keywords"?"Type your keywords separated by commas...":"Ask me anything about your coverage...";
  const inputDisabled=step==="keywords"||step==="parsing"||step==="running";

  return(<div style={{fontFamily:"'DM Sans',sans-serif",flex:1,display:"flex",flexDirection:"column"}}>
    <div style={{padding:isMobile?"0 12px 6px":"0 24px 10px",display:"flex",alignItems:"center",gap:6,maxWidth:1224,margin:"0 auto",width:"100%"}}>
      <button onClick={onHome} style={{background:"none",border:"none",cursor:"pointer",padding:2,color:C.muted,display:"flex"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg></button>
      <span style={{fontSize:13,fontWeight:500,color:C.muted}}>Content Coverage Audit</span>
      {showR&&<span style={{fontSize:10,fontWeight:600,color:"#9B7AE6",background:"rgba(155,122,230,0.08)",padding:"3px 8px",borderRadius:10,marginLeft:4}}>Done</span>}
    </div>

    {!isMobile&&<div style={{display:"flex",padding:"0 24px 24px",maxWidth:1224,margin:"0 auto",width:"100%",alignItems:"flex-start",gap:12}}>
      <div style={{width:"35%",maxWidth:420,position:"sticky",top:12,display:"flex",flexDirection:"column",flexShrink:0,minWidth:280,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.card,height:"calc(100vh - 130px)"}}>
        <div ref={chatRef} className="iva-scroll-inner" style={{flex:1,padding:"16px 12px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>{chatMessages}</div>
        <div style={{padding:"8px 12px 12px",flexShrink:0,borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",gap:8}}>
            <input ref={inputRef} disabled={inputDisabled} defaultValue="" onKeyDown={e=>e.key==="Enter"&&send()} placeholder={placeholder} style={{flex:1,height:44,borderRadius:10,border:`1px solid ${C.border}`,padding:"0 14px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",background:inputDisabled?"#f8f7f9":C.surface,opacity:inputDisabled?0.6:1}} onFocus={e=>{if(!inputDisabled){e.target.style.borderColor=C.hoverBorder;e.target.style.boxShadow=C.hoverShadow;}}} onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>
            <button onClick={send} disabled={inputDisabled} style={{width:44,height:44,borderRadius:10,border:`1px solid ${C.borderMid}`,background:C.surface,cursor:inputDisabled?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:inputDisabled?0.4:1}} onMouseEnter={e=>{if(!inputDisabled)e.currentTarget.style.background=C.accentLight;}} onMouseLeave={e=>e.currentTarget.style.background=C.surface}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
          </div>
        </div>
      </div>
      <div style={{flex:1,borderRadius:12,border:`1px solid ${C.border}`,position:"relative",background:C.surface,minHeight:"calc(100vh - 130px)"}}>{panelContent}{showR&&<div style={{position:"sticky",bottom:0,left:0,right:0,height:48,background:"linear-gradient(transparent, #ffffff)",borderRadius:"0 0 12px 12px",pointerEvents:"none"}}/>}</div>
    </div>}

    {isMobile&&<div style={{display:"flex",flexDirection:"column",padding:"0 12px 16px",gap:12}}>
      <MobileTab active={mTab} onSwitch={sMTab} hasReport={showR}/>
      <div style={{display:mTab==="chat"?"flex":"none",flexDirection:"column",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",background:C.card,maxHeight:"70vh"}}>
        <div ref={mTab==="chat"?chatRef:null} className="iva-scroll-inner" style={{flex:1,padding:"12px 10px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>{chatMessages}</div>
        <div style={{padding:"8px 10px 10px",flexShrink:0,borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",gap:6}}>
            <input ref={isMobile?inputRef:null} disabled={inputDisabled} defaultValue="" onKeyDown={e=>e.key==="Enter"&&send()} placeholder={placeholder} style={{flex:1,height:42,borderRadius:10,border:`1px solid ${C.border}`,padding:"0 12px",fontSize:13,fontFamily:"'DM Sans',sans-serif",color:C.dark,outline:"none",background:inputDisabled?"#f8f7f9":C.surface,opacity:inputDisabled?0.6:1}} onFocus={e=>{if(!inputDisabled){e.target.style.borderColor=C.hoverBorder;e.target.style.boxShadow=C.hoverShadow;}}} onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>
            <button onClick={send} disabled={inputDisabled} style={{width:42,height:42,borderRadius:10,border:`1px solid ${C.borderMid}`,background:C.surface,cursor:inputDisabled?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:inputDisabled?0.4:1}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dark} strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
          </div>
        </div>
      </div>
      <div style={{display:mTab==="report"?"block":"none",background:C.surface,borderRadius:12,border:`1px solid ${C.border}`}}>{panelContent}</div>
    </div>}

    {showR&&<div style={{display:"flex",gap:8,flexWrap:"wrap",padding:isMobile?"8px 12px 16px":"8px 24px 16px",maxWidth:isMobile?"100%":1224,margin:"0 auto",width:"100%",alignItems:"center"}}>
      <button onClick={()=>{setSR(false);sMsgs([]);setLS(-1);setAuditData(null);sPLoad(null);sMTab("chat");setStep("init");setExtractedKw(null);setUserKw(null);setPageUrl(null);sTyp(true);setTimeout(()=>{sTyp(false);add("b",mn?`Hey, ${mn}! Let's audit another page.\n\nPaste your URL below.`:"Hey! Let's audit another page.\n\nPaste your URL below.");setStep("url");},1000);}} style={{height:40,padding:"0 20px",borderRadius:10,background:C.accent,border:"none",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}} onMouseEnter={e=>e.currentTarget.style.background="#5a22d9"} onMouseLeave={e=>e.currentTarget.style.background=C.accent}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>New Audit</button>
      {!isMobile&&<button onClick={onHome} style={{height:40,padding:"0 20px",borderRadius:10,background:C.surface,border:`1px solid ${C.borderMid}`,color:C.dark,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}} onMouseEnter={e=>e.currentTarget.style.background=C.accentLight} onMouseLeave={e=>e.currentTarget.style.background=C.surface}>Try Other Tools</button>}
    </div>}
  </div>);
}

window.ContentCoverage=ContentCoverage;
