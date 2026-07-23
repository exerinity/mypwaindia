function decodeEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

function clean(value) {
  return decodeEntities(stripTags(value)).replace(/\s+/g, " ").trim();
}

function idText(html, id) {
  const match = html.match(new RegExp(`id=["']${id}["'][^>]*>([\\s\\S]*?)<`, "i"));
  return match ? clean(match[1]) : "";
}

function cellText(rowHtml, className) {
  const match = rowHtml.match(
    new RegExp(`class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, "i")
  );
  return match ? clean(match[1]) : "";
}

function userText(rowHtml) {
  const cell = rowHtml.match(/class=["'][^"']*\buser-col\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/i);
  if (!cell) return "";
  const leading = clean(cell[1].split("<")[0]);
  return leading || clean(cell[1]);
}

export function parseLeaderboard(html) {
  if (!html) return { globalClicks: "", entries: [] };
  const global = html.match(/Global clicks:\s*([\d,]+)/i);
  const globalClicks = global ? global[1].trim() : "";
  const entries = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowPattern.exec(html))) {
    const cells = row[1];
    const rank = cellText(cells, "rank-col");
    const user = userText(cells);
    const clicks = cellText(cells, "balance-col");
    if (rank && user && clicks) entries.push({ rank, user, clicks });
  }
  return { globalClicks, entries };
}

export function parseButtonPage(html) {
  return {
    balance: idText(html, "balance-amount") || "0",
    clicks: parseInt(idText(html, "click_counter") || "0", 10) || 0,
    payout_in: parseInt(idText(html, "payout_counter") || "0", 10) || 0,
    leaderboard: parseLeaderboard(html)
  };
}
