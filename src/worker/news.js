const FEED_URL = "https://mypayindia.com/news/feed";
const FEED_BASE = "https://mypayindia.com/news";

function decode_ent(v) {
  return v
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function res_url(v) {
  try {
    return new URL(v, FEED_BASE).href;
  } catch (_) {
    return v;
  }
}

function res_htm_url(htm) {
  return htm.replace(/((?:src|href)=["'])([^"']*)(["'])/gi, (f, pr, u, po) => {
    if (!u || /^([a-z][a-z0-9+.-]*:)?\/\//i.test(u) || /^(data|mailto|tel):/i.test(u) || u.startsWith("#")) {
      return f;
    }
    return `${pr}${res_url(u)}${po}`;
  });
}

function tag_txt(xml, tg) {
  const m = xml.match(new RegExp(`<${tg}[^>]*>([\\s\\S]*?)<\\/${tg}>`, "i"));
  if (!m) return "";
  const raw = m[1].trim();
  const cd = raw.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return cd ? cd[1].trim() : decode_ent(raw);
}

const TAGS = new Set([
  "p", "a", "br", "strong", "em", "b", "i", "u", "s",
  "ul", "ol", "li", "blockquote", "code", "pre",
  "img", "h1", "h2", "h3", "h4", "h5", "h6", "hr",
  "span", "div", "table", "thead", "tbody", "tr", "th", "td"
]);

const ATTRS = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"])
};

function safe(v) {
  try {
    return ["http:", "https:"].includes(new URL(v, FEED_BASE).protocol);
  } catch (_) {
    return false;
  }
}

function esc_attr(v) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

async function san_htm(htm) {
  if (!htm) return htm;
  const rw = new HTMLRewriter()
    .on("script, style, iframe, object, embed, link, meta, base, form, svg, math, noscript, template", {
      element(el) { el.remove(); }
    })
    .on("*", {
      element(el) {
        const tg = el.tagName.toLowerCase();
        if (!TAGS.has(tg)) {
          el.removeAndKeepContent();
          return;
        }
        const ok = ATTRS[tg] || new Set();
        for (const [nm] of [...el.attributes]) {
          const lo = nm.toLowerCase();
          if (!ok.has(lo)) {
            el.removeAttribute(nm);
            continue;
          }
          if ((lo === "href" || lo === "src") && !safe(el.getAttribute(nm) || "")) {
            el.removeAttribute(nm);
          }
        }
        if (tg === "a") {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }
        if (tg === "img") {
          const src = el.getAttribute("src");
          if (src) {
            el.before(`<a href="${esc_attr(src)}" target="_blank" rel="noopener noreferrer">`, { html: true });
            el.after("</a>", { html: true });
          }
        }
      }
    });

  return await rw.transform(new Response(htm)).text();
}

async function parse_itm(itm) {
  return {
    title: tag_txt(itm, "title"),
    link: tag_txt(itm, "link"),
    guid: tag_txt(itm, "guid"),
    pubDate: tag_txt(itm, "pubDate"),
    description: await san_htm(res_htm_url(tag_txt(itm, "description")))
  };
}

export async function parse_feed(xml) {
  const ch_m = xml.match(/<channel>([\s\S]*)<\/channel>/i);
  const ch = ch_m ? ch_m[1] : xml;

  const itms = [];
  const itm_pat = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itm_pat.exec(ch))) {
    itms.push(m[1]);
  }

  return {
    title: tag_txt(ch, "title"),
    link: tag_txt(ch, "link"),
    description: tag_txt(ch, "description"),
    lastBuildDate: tag_txt(ch, "lastBuildDate"),
    items: await Promise.all(itms.map(parse_itm))
  };
}

function json_res(b, st) {
  return new Response(JSON.stringify(b), {
    status: st,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export async function handle_news() {
  let xml;
  try {
    const up = await fetch(FEED_URL, {
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }
    });
    if (!up.ok) {
      return json_res({ success: false, message: `Fuck ${up.status}` }, 502);
    }
    xml = await up.text();
  } catch (_) {
    return json_res({ success: false, message: "No news returned..." }, 502);
  }

  return json_res({ success: true, data: await parse_feed(xml) }, 200);
}
