/* IvaBot AI Readiness Module v3
   Parses HTML for AI/GEO (Generative Engine Optimization) signals.
   10 checks total: 5 base + 5 advanced.
   Adaptive scoring by page type: homepage, about, article, product, pricing, docs, contact, other.
   Use: window.AIReadiness.parse(rawHtml, pageUrl, robotsTxt, llmsTxt, pageType) → returns { checks, score, summary, weights_used }
   pageType is optional — falls back to "other" weights if not provided or unknown.
   Loaded BEFORE content-coverage.js. Exposes window.AIReadiness namespace.
*/
(function() {
"use strict";

console.log("[IvaBot] ai-readiness.js v3 loaded");

/* ═══ ADAPTIVE WEIGHTS BY PAGE TYPE ═══
   Each row sums to exactly 100. Used by calculateScore() based on pageType param.
   Order: schema, faq, llms, bots, qa, og, author, dates, citations, statistics
*/
const WEIGHTS_BY_TYPE = {
  homepage: { schema: 18, faq: 15, llms: 18, bots: 13, qa: 6,  og: 12, author: 5,  dates: 0,  citations: 5,  statistics: 8  },
  about:    { schema: 15, faq: 0,  llms: 12, bots: 13, qa: 5,  og: 15, author: 22, dates: 5,  citations: 5,  statistics: 8  },
  article:  { schema: 18, faq: 0,  llms: 5,  bots: 8,  qa: 8,  og: 15, author: 18, dates: 12, citations: 8,  statistics: 8  },
  product:  { schema: 22, faq: 8,  llms: 8,  bots: 10, qa: 5,  og: 18, author: 5,  dates: 8,  citations: 8,  statistics: 8  },
  pricing:  { schema: 20, faq: 18, llms: 10, bots: 10, qa: 8,  og: 12, author: 5,  dates: 0,  citations: 7,  statistics: 10 },
  docs:     { schema: 12, faq: 8,  llms: 12, bots: 10, qa: 22, og: 8,  author: 8,  dates: 7,  citations: 8,  statistics: 5  },
  contact:  { schema: 22, faq: 0,  llms: 8,  bots: 10, qa: 5,  og: 15, author: 12, dates: 5,  citations: 0,  statistics: 23 },
  other:    { schema: 18, faq: 12, llms: 14, bots: 13, qa: 10, og: 8,  author: 6,  dates: 5,  citations: 5,  statistics: 9  },
};

/* Verify all rows sum to 100 — assert at load time */
Object.keys(WEIGHTS_BY_TYPE).forEach(type => {
  const w = WEIGHTS_BY_TYPE[type];
  const sum = w.schema + w.faq + w.llms + w.bots + w.qa + w.og + w.author + w.dates + w.citations + w.statistics;
  if (sum !== 100) console.warn("[IvaBot] AI Readiness weights for", type, "sum to", sum, "expected 100");
});

/* Map common page type aliases to canonical types */
function normalizePageType(rawType) {
  if (!rawType || typeof rawType !== "string") return "other";
  const t = rawType.toLowerCase().trim();
  if (t === "homepage" || t === "home" || t === "landing" || t === "landing_page") return "homepage";
  if (t === "about" || t === "about_us" || t === "team") return "about";
  if (t === "article" || t === "blog" || t === "blog_post" || t === "news" || t === "post") return "article";
  if (t === "product" || t === "shop" || t === "store" || t === "category") return "product";
  if (t === "pricing" || t === "plans" || t === "subscription") return "pricing";
  if (t === "docs" || t === "documentation" || t === "guide" || t === "tutorial" || t === "howto" || t === "help") return "docs";
  if (t === "contact" || t === "contact_us") return "contact";
  return "other";
}

/* ═══ HELPER: extract all JSON-LD blocks from HTML ═══ */
function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const text = m[1].trim();
      if (!text) continue;
      const parsed = JSON.parse(text);
      blocks.push(parsed);
    } catch(e) {
      /* malformed JSON-LD — record raw */
      blocks.push({ _malformed: true, _raw: m[1].slice(0, 200) });
    }
  }
  return blocks;
}

/* ═══ HELPER: collect all @type values from a JSON-LD block (handles arrays + nested) ═══ */
function collectTypes(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach(n => collectTypes(n, out)); return; }
  if (node["@type"]) {
    const t = node["@type"];
    if (Array.isArray(t)) t.forEach(x => out.add(String(x)));
    else out.add(String(t));
  }
  for (const k in node) {
    if (k === "@type" || k === "@context") continue;
    if (node[k] && typeof node[k] === "object") collectTypes(node[k], out);
  }
}

/* ═══ HELPER: extract FAQ questions from FAQPage schema ═══ */
function extractFaqSchemaQuestions(blocks) {
  const questions = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node["@type"] === "Question" && node.name) {
      questions.push(String(node.name).trim().toLowerCase());
    }
    for (const k in node) {
      if (node[k] && typeof node[k] === "object") walk(node[k]);
    }
  };
  blocks.forEach(walk);
  return questions;
}

/* ═══ HELPER: extract FAQ questions from visible HTML ═══ */
function extractFaqHtmlQuestions(html) {
  const questions = [];
  /* Common patterns: .faq-q, .faq-question, dt elements, summary elements */
  const patterns = [
    /<(?:div|p|h[2-5]|dt|summary|button)[^>]*class=["'][^"']*(?:faq-q|faq-question|question)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p|h[2-5]|dt|summary|button)>/gi,
    /<dt[^>]*>([\s\S]*?)<\/dt>/gi,
    /<summary[^>]*>([\s\S]*?)<\/summary>/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const txt = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (txt.length > 5 && txt.length < 250 && /\?/.test(txt)) {
        questions.push(txt.toLowerCase());
      }
    }
  }
  return [...new Set(questions)];
}

/* ═══ CHECK 1: Schema.org JSON-LD ═══ */
function checkSchemaOrg(html) {
  const blocks = extractJsonLd(html);
  const types = new Set();
  blocks.forEach(b => collectTypes(b, types));
  const malformed = blocks.filter(b => b._malformed).length;
  const valid = blocks.length - malformed;

  return {
    found: blocks.length > 0,
    valid_blocks: valid,
    malformed_blocks: malformed,
    types: [...types],
    has_organization: types.has("Organization"),
    has_software: types.has("SoftwareApplication") || types.has("WebApplication") || types.has("MobileApplication"),
    has_product: types.has("Product"),
    has_article: types.has("Article") || types.has("BlogPosting") || types.has("NewsArticle"),
    has_website: types.has("WebSite"),
    has_breadcrumb: types.has("BreadcrumbList"),
    has_howto: types.has("HowTo"),
    has_recipe: types.has("Recipe"),
    has_video: types.has("VideoObject"),
    has_local_business: types.has("LocalBusiness"),
  };
}

/* ═══ CHECK 2: FAQ schema vs visible FAQ ═══ */
function checkFaqSchema(html) {
  const blocks = extractJsonLd(html);
  const types = new Set();
  blocks.forEach(b => collectTypes(b, types));
  const has_faq_schema = types.has("FAQPage");

  const schemaQuestions = extractFaqSchemaQuestions(blocks);
  const htmlQuestions = extractFaqHtmlQuestions(html);

  /* Detect FAQ section in HTML by class/id */
  const has_faq_section = /<(section|div)[^>]*(?:id|class)=["'][^"']*faq[^"']*["']/i.test(html)
    || /<h[2-3][^>]*>\s*(?:FAQ|Frequently Asked|Questions|Got questions)/i.test(html);

  /* How well do they match? */
  let matched = 0;
  if (schemaQuestions.length > 0 && htmlQuestions.length > 0) {
    htmlQuestions.forEach(hq => {
      const hqNorm = hq.replace(/[^\w\s]/g, "").trim();
      if (schemaQuestions.some(sq => {
        const sqNorm = sq.replace(/[^\w\s]/g, "").trim();
        return sqNorm.includes(hqNorm.slice(0, 30)) || hqNorm.includes(sqNorm.slice(0, 30));
      })) matched++;
    });
  }

  return {
    has_faq_schema,
    has_faq_section,
    schema_questions_count: schemaQuestions.length,
    html_questions_count: htmlQuestions.length,
    matched_questions: matched,
    /* Status */
    status: !has_faq_section && !has_faq_schema ? "no_faq" :
            has_faq_section && !has_faq_schema ? "section_no_schema" :
            !has_faq_section && has_faq_schema ? "schema_no_section" :
            matched === 0 ? "mismatched" :
            matched < htmlQuestions.length ? "partial_match" :
            "good"
  };
}

/* ═══ CHECK 3: llms.txt in root (caller must fetch and pass response) ═══ */
function checkLlmsTxt(llmsContent) {
  if (!llmsContent || typeof llmsContent !== "string") {
    return { found: false, valid: false, has_h1: false, has_quote: false, length: 0 };
  }
  const trimmed = llmsContent.trim();
  /* Sanity check — not an HTML 404 page */
  if (/<html|<!doctype/i.test(trimmed.slice(0, 200))) {
    return { found: false, valid: false, has_h1: false, has_quote: false, length: 0, note: "served HTML, not text" };
  }
  return {
    found: true,
    valid: trimmed.length > 50,
    has_h1: /^#\s+\w/m.test(trimmed),
    has_quote: /^>\s+\w/m.test(trimmed),
    has_sections: (trimmed.match(/^##\s+/gm) || []).length,
    length: trimmed.length,
  };
}

/* ═══ CHECK 4: AI bots in robots.txt (caller fetches, passes content) ═══ */
function checkAiBotsRobots(robotsContent) {
  if (!robotsContent || typeof robotsContent !== "string") {
    /* No robots.txt = all bots allowed by default */
    return { robots_exists: false, note: "no robots.txt — all bots allowed by default", all_allowed: true };
  }

  const r = robotsContent.toLowerCase();
  /* Sanity check — not HTML 404 page */
  if (/<html|<!doctype/i.test(r.slice(0, 200))) {
    return { robots_exists: false, note: "robots.txt returns HTML (likely 404)", all_allowed: true };
  }

  const bots = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended", "anthropic-ai", "ChatGPT-User", "OAI-SearchBot", "CCBot"];
  const result = { robots_exists: true, bots: {} };

  for (const bot of bots) {
    const botL = bot.toLowerCase();
    /* Find user-agent block for this bot */
    const re = new RegExp("user-agent:\\s*" + botL.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&") + "\\s*\\n([\\s\\S]*?)(?=\\n\\s*user-agent:|$)", "i");
    const m = r.match(re);
    if (m) {
      const block = m[1];
      const hasDisallowAll = /disallow:\s*\/\s*$/m.test(block);
      result.bots[bot] = hasDisallowAll ? "blocked" : "allowed_explicit";
    } else {
      /* Check for catch-all user-agent: * with disallow: / */
      const allRe = /user-agent:\s*\*\s*\n([\s\S]*?)(?=\n\s*user-agent:|$)/i;
      const am = r.match(allRe);
      if (am && /disallow:\s*\/\s*$/m.test(am[1])) {
        result.bots[bot] = "blocked_by_wildcard";
      } else {
        result.bots[bot] = "allowed_default";
      }
    }
  }

  const blockedCount = Object.values(result.bots).filter(v => v.startsWith("blocked")).length;
  result.blocked_count = blockedCount;
  result.all_allowed = blockedCount === 0;
  return result;
}

/* ═══ CHECK 5: Q&A patterns in content ═══ */
function checkQaPatterns(html) {
  /* Strip scripts/styles/svg, get visible text */
  const visible = html
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  /* Patterns AI loves to cite */
  const patterns = {
    what_is: (visible.match(/\b(?:What|what)\s+(?:is|are)\s+[A-Za-z][\w\s-]{2,40}\?/g) || []).length,
    how_to: (visible.match(/\b(?:How|how)\s+(?:to|do|does|can|should)\s+[\w\s-]{2,40}\?/g) || []).length,
    why: (visible.match(/\b(?:Why|why)\s+(?:do|does|is|are|should)\s+[\w\s-]{2,40}\?/g) || []).length,
    when: (visible.match(/\b(?:When|when)\s+(?:do|does|is|are|should)\s+[\w\s-]{2,40}\?/g) || []).length,
  };

  const total = patterns.what_is + patterns.how_to + patterns.why + patterns.when;

  /* Heading-based questions (h2/h3 ending in ?) */
  const headingQuestions = (html.match(/<h[2-3][^>]*>[^<]{5,200}\?[^<]{0,30}<\/h[2-3]>/gi) || []).length;

  return {
    total,
    patterns,
    heading_questions: headingQuestions,
    status: total + headingQuestions === 0 ? "none" :
            total + headingQuestions < 3 ? "few" :
            total + headingQuestions < 8 ? "moderate" :
            "good"
  };
}

/* ═══ ADVANCED CHECK 6: Open Graph + Twitter Cards ═══ */
function checkOpenGraph(html) {
  const ogTags = {};
  const re = /<meta[^>]*property=["']og:([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    ogTags[m[1]] = m[2];
  }
  /* Reverse order: content before property */
  const re2 = /<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:([^"']+)["']/gi;
  while ((m = re2.exec(html)) !== null) {
    if (!ogTags[m[2]]) ogTags[m[2]] = m[1];
  }

  const twitterTags = {};
  const reT = /<meta[^>]*name=["']twitter:([^"']+)["'][^>]*content=["']([^"']*)["']/gi;
  while ((m = reT.exec(html)) !== null) {
    twitterTags[m[1]] = m[2];
  }

  const has_og_title = !!ogTags.title;
  const has_og_description = !!ogTags.description;
  const has_og_image = !!ogTags.image;
  const has_og_type = !!ogTags.type;
  const has_og_url = !!ogTags.url;

  const has_twitter_card = !!twitterTags.card;

  const og_count = Object.keys(ogTags).length;
  const tw_count = Object.keys(twitterTags).length;

  return {
    found: og_count > 0 || tw_count > 0,
    og_tags: ogTags,
    twitter_tags: twitterTags,
    og_count,
    twitter_count: tw_count,
    has_og_title,
    has_og_description,
    has_og_image,
    has_og_type,
    has_og_url,
    has_twitter_card,
    /* Status: complete = all 5 essential OG tags present */
    status: (has_og_title && has_og_description && has_og_image && has_og_type && has_og_url) ? "complete" :
            (has_og_title && has_og_description && has_og_image) ? "good" :
            og_count > 0 ? "partial" : "missing"
  };
}

/* ═══ ADVANCED CHECK 7: Author / Person markup ═══ */
function checkAuthorMarkup(html) {
  const blocks = extractJsonLd(html);
  const types = new Set();
  blocks.forEach(b => collectTypes(b, types));

  /* Look for Person/Author in JSON-LD */
  let person_found = false;
  let author_found = false;
  let author_name = null;
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node["@type"] === "Person") {
      person_found = true;
      if (node.name && !author_name) author_name = String(node.name);
    }
    if (node.author) {
      author_found = true;
      if (typeof node.author === "object" && node.author.name && !author_name) {
        author_name = String(node.author.name);
      } else if (typeof node.author === "string" && !author_name) {
        author_name = node.author;
      }
    }
    for (const k in node) {
      if (node[k] && typeof node[k] === "object") walk(node[k]);
    }
  };
  blocks.forEach(walk);

  /* Also check for visible author bylines */
  const has_byline = /<[^>]*(?:class|id)=["'][^"']*(?:author|byline|by-line)[^"']*["']/i.test(html)
    || /\b(?:by|written by|authored by)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(html.replace(/<[^>]+>/g, ' '));

  /* rel="author" link */
  const has_rel_author = /<a[^>]*rel=["'][^"']*author[^"']*["']/i.test(html);

  return {
    has_person_schema: person_found,
    has_author_property: author_found,
    has_byline,
    has_rel_author,
    author_name,
    has_organization: types.has("Organization"),
    /* Status */
    status: (person_found || author_found) ? "good" :
            has_byline ? "partial" :
            types.has("Organization") ? "org_only" :
            "missing"
  };
}

/* ═══ ADVANCED CHECK 8: Last updated / dateModified ═══ */
function checkDateSignals(html) {
  const blocks = extractJsonLd(html);

  let datePublished = null;
  let dateModified = null;

  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.datePublished && !datePublished) datePublished = String(node.datePublished);
    if (node.dateModified && !dateModified) dateModified = String(node.dateModified);
    for (const k in node) {
      if (node[k] && typeof node[k] === "object") walk(node[k]);
    }
  };
  blocks.forEach(walk);

  /* Check meta tags */
  const metaModified = html.match(/<meta[^>]*property=["']article:modified_time["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:modified_time["']/i);
  const metaPublished = html.match(/<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']article:published_time["']/i);

  if (!dateModified && metaModified) dateModified = metaModified[1];
  if (!datePublished && metaPublished) datePublished = metaPublished[1];

  /* Check visible "Last updated" / "Updated on" text */
  const visible = html.replace(/<svg[\s\S]*?<\/svg>/gi, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  const has_visible_date = /(?:last\s+updated|updated\s+on|updated:|modified:|last\s+revision)\s*:?\s*[A-Za-z0-9,\s\-\/]{3,30}/i.test(visible);

  /* Calculate freshness */
  let freshness_days = null;
  let is_fresh = null;
  if (dateModified) {
    const d = new Date(dateModified);
    if (!isNaN(d.getTime())) {
      freshness_days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
      is_fresh = freshness_days < 365;
    }
  }

  return {
    date_published: datePublished,
    date_modified: dateModified,
    has_visible_date,
    freshness_days,
    is_fresh,
    /* Status */
    status: dateModified && is_fresh ? "fresh" :
            dateModified ? "stale" :
            has_visible_date ? "visible_only" :
            "missing"
  };
}

/* ═══ ADVANCED CHECK 9: Citations / external links to authority sources ═══ */
function checkCitations(html, pageUrl) {
  let pageHost = "";
  try { pageHost = new URL(pageUrl).hostname.replace(/^www\./, ""); } catch(e) {}

  /* Authority domain patterns (TLDs and known authoritative domains) */
  const authorityTlds = [".gov", ".edu", ".org"];
  const authorityDomains = [
    "wikipedia.org", "google.com", "developer.mozilla.org", "w3.org", "schema.org",
    "github.com", "stackoverflow.com", "nytimes.com", "wsj.com", "bbc.com", "bbc.co.uk",
    "reuters.com", "forbes.com", "harvard.edu", "mit.edu", "stanford.edu", "nature.com",
    "sciencedirect.com", "researchgate.net", "ieee.org", "acm.org", "arxiv.org",
    "techcrunch.com", "wired.com", "theverge.com", "ars-technica.com",
    "huggingface.co", "openai.com", "anthropic.com", "deepmind.com",
    "moz.com", "ahrefs.com", "semrush.com", "searchengineland.com", "searchenginejournal.com",
    "hubspot.com", "backlinko.com",
  ];

  const authorityLinks = [];
  const allLinks = [...html.matchAll(/<a[^>]*href=["']([^"']+)["']/gi)].map(m => m[1]);

  for (const href of allLinks) {
    if (!/^https?:\/\//i.test(href)) continue;
    let host = "";
    try { host = new URL(href).hostname.replace(/^www\./, ""); } catch(e) { continue; }
    if (host === pageHost) continue;

    /* Authority TLD check */
    const isAuthorityTld = authorityTlds.some(tld => host.endsWith(tld));
    /* Authority domain check */
    const isAuthorityDomain = authorityDomains.some(d => host === d || host.endsWith("." + d));

    if (isAuthorityTld || isAuthorityDomain) {
      authorityLinks.push({ href, host, type: isAuthorityTld ? "tld" : "domain" });
    }
  }

  /* Dedup by host */
  const uniqueHosts = [...new Set(authorityLinks.map(l => l.host))];

  return {
    count: authorityLinks.length,
    unique_hosts: uniqueHosts.length,
    hosts: uniqueHosts.slice(0, 10),
    /* Status */
    status: uniqueHosts.length >= 3 ? "good" :
            uniqueHosts.length >= 1 ? "few" :
            "none"
  };
}

/* ═══ ADVANCED CHECK 10: Statistics / numbers in content ═══ */
function checkStatistics(html) {
  /* Strip non-content */
  const visible = html
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  /* Patterns AI loves to cite */
  /* Percentages: "70%", "70 percent" */
  const percentages = (visible.match(/\b\d{1,3}(?:\.\d+)?\s*(?:%|percent)\b/gi) || []).length;

  /* Money: "$1,000", "$5", "$5M" */
  const money = (visible.match(/\$\s?\d{1,3}(?:[,.]?\d{3})*(?:[KMB]|\s*(?:million|billion|thousand))?/gi) || []).length;

  /* Years: "in 2024", "2025" */
  const years = (visible.match(/\b(?:19|20)\d{2}\b/g) || []).length;

  /* Multipliers: "3x", "2x faster" */
  const multipliers = (visible.match(/\b\d+(?:\.\d+)?[xX]\b/g) || []).length;

  /* Big numbers with units: "100K users", "1M downloads" */
  const big_numbers = (visible.match(/\b\d{1,3}(?:[,.]?\d{3})*\s*(?:K|M|B|users|customers|downloads|installs|companies|countries|languages)\b/gi) || []).length;

  /* Time durations: "5 minutes", "2 hours", "10 days" */
  const durations = (visible.match(/\b\d+\s*(?:second|minute|hour|day|week|month|year)s?\b/gi) || []).length;

  const total = percentages + money + years + multipliers + big_numbers + durations;

  return {
    total,
    percentages,
    money,
    years,
    multipliers,
    big_numbers,
    durations,
    /* Status */
    status: total >= 10 ? "good" :
            total >= 5 ? "moderate" :
            total >= 1 ? "few" :
            "none"
  };
}

/* ═══ SCORE: 0-100 based on page type weights ═══
   Each check returns 0..1 quality fraction, multiplied by its weight for the given page type.
*/
function calculateCheckQuality(checkName, check) {
  /* Returns 0..1 representing how well this check passes */
  switch (checkName) {
    case "schema":
      if (!check.found) return 0;
      let s = 0.4; // base for any schema
      if (check.has_organization) s += 0.2;
      if (check.has_software || check.has_product || check.has_article) s += 0.25;
      if (check.malformed_blocks === 0) s += 0.15;
      return Math.min(s, 1);

    case "faq":
      if (check.status === "good") return 1;
      if (check.status === "partial_match") return 0.7;
      if (check.has_faq_schema) return 0.5;
      if (check.has_faq_section) return 0.2;
      return 0;

    case "llms":
      if (!check.found) return 0;
      if (!check.valid) return 0.4;
      let l = 0.6;
      if (check.has_quote) l += 0.2;
      if (check.has_sections >= 3) l += 0.2;
      return Math.min(l, 1);

    case "bots":
      if (check.all_allowed) return 1;
      const blocked = check.blocked_count || 0;
      return Math.max(0, 1 - blocked * 0.2);

    case "qa":
      if (check.status === "good") return 1;
      if (check.status === "moderate") return 0.7;
      if (check.status === "few") return 0.3;
      return 0;

    case "og":
      if (check.status === "complete") return 1;
      if (check.status === "good") return 0.75;
      if (check.status === "partial") return 0.4;
      return 0;

    case "author":
      if (check.status === "good") return 1;
      if (check.status === "partial") return 0.5;
      if (check.status === "org_only") return 0.3;
      return 0;

    case "dates":
      if (check.status === "fresh") return 1;
      if (check.status === "stale") return 0.5;
      if (check.status === "visible_only") return 0.2;
      return 0;

    case "citations":
      if (check.status === "good") return 1;
      if (check.status === "few") return 0.4;
      return 0;

    case "statistics":
      if (check.status === "good") return 1;
      if (check.status === "moderate") return 0.6;
      if (check.status === "few") return 0.2;
      return 0;
  }
  return 0;
}

function calculateScore(checks, pageType) {
  const type = normalizePageType(pageType);
  const weights = WEIGHTS_BY_TYPE[type] || WEIGHTS_BY_TYPE.other;

  /* Map check name → checks key */
  const checkKeys = {
    schema: "schema",
    faq: "faq_schema",
    llms: "llms_txt",
    bots: "ai_bots",
    qa: "qa_patterns",
    og: "open_graph",
    author: "author",
    dates: "dates",
    citations: "citations",
    statistics: "statistics",
  };

  let score = 0;
  const breakdown = {};
  for (const checkName in weights) {
    const check = checks[checkKeys[checkName]];
    const quality = calculateCheckQuality(checkName, check);
    const weighted = quality * weights[checkName];
    breakdown[checkName] = { quality: Math.round(quality * 100) / 100, weight: weights[checkName], earned: Math.round(weighted * 10) / 10 };
    score += weighted;
  }

  return {
    score: Math.min(Math.round(score), 100),
    type_used: type,
    weights: weights,
    breakdown: breakdown,
  };
}

/* ═══ MAIN PARSE FUNCTION ═══ */
function parse(rawHtml, pageUrl, robotsContent, llmsContent, pageType) {
  const checks = {
    /* Base 5 */
    schema: checkSchemaOrg(rawHtml),
    faq_schema: checkFaqSchema(rawHtml),
    llms_txt: checkLlmsTxt(llmsContent),
    ai_bots: checkAiBotsRobots(robotsContent),
    qa_patterns: checkQaPatterns(rawHtml),
    /* Advanced 5 */
    open_graph: checkOpenGraph(rawHtml),
    author: checkAuthorMarkup(rawHtml),
    dates: checkDateSignals(rawHtml),
    citations: checkCitations(rawHtml, pageUrl),
    statistics: checkStatistics(rawHtml),
  };

  const scoreResult = calculateScore(checks, pageType);
  const score = scoreResult.score;

  /* Status label */
  const status = score >= 80 ? "excellent" :
                 score >= 60 ? "good" :
                 score >= 40 ? "moderate" :
                 score >= 20 ? "weak" : "poor";

  return {
    url: pageUrl,
    score,
    status,
    page_type: scoreResult.type_used,
    page_type_provided: pageType || null,
    weights_used: scoreResult.weights,
    breakdown: scoreResult.breakdown,
    checks,
    summary: {
      schema_found: checks.schema.found,
      schema_types: checks.schema.types,
      faq_status: checks.faq_schema.status,
      llms_txt_found: checks.llms_txt.found,
      ai_bots_blocked: checks.ai_bots.blocked_count || 0,
      qa_patterns: checks.qa_patterns.total + checks.qa_patterns.heading_questions,
      og_status: checks.open_graph.status,
      author_status: checks.author.status,
      date_status: checks.dates.status,
      citations: checks.citations.unique_hosts,
      statistics_count: checks.statistics.total,
    }
  };
}

/* ═══ EXPORT ═══ */
window.AIReadiness = {
  parse,
  /* Expose individual checks for debugging */
  checkSchemaOrg,
  checkFaqSchema,
  checkLlmsTxt,
  checkAiBotsRobots,
  checkQaPatterns,
  checkOpenGraph,
  checkAuthorMarkup,
  checkDateSignals,
  checkCitations,
  checkStatistics,
  calculateScore,
  /* Adaptive weights */
  WEIGHTS_BY_TYPE,
  normalizePageType,
  version: 3
};

})();
