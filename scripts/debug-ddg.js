const res = await fetch("https://html.duckduckgo.com/html/?q=animation+studios+los+angeles", {
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

const html = await res.text();
console.log("[v0] Status:", res.status);
console.log("[v0] HTML length:", html.length);

// Try to find every <a> tag with class containing "result"
const allResultLinks = [...html.matchAll(/<a[^>]*class="[^"]*result[^"]*"[^>]*>/gi)];
console.log("[v0] Links with 'result' class:", allResultLinks.length);
if (allResultLinks.length > 0) {
  console.log("[v0] First 3 result links:");
  allResultLinks.slice(0, 3).forEach((m, i) => console.log(`  [${i}]`, m[0]));
}

// Try to find result__a specifically
const resultA = [...html.matchAll(/class="result__a"[^>]*href="([^"]*)"/gi)];
console.log("[v0] result__a matches (class first):", resultA.length);

const resultA2 = [...html.matchAll(/href="([^"]*)"[^>]*class="result__a"/gi)];
console.log("[v0] result__a matches (href first):", resultA2.length);

// Just find ALL href+class combos near result__a
const resultA3 = [...html.matchAll(/<a[^>]*result__a[^>]*>/gi)];
console.log("[v0] Any <a> with result__a:", resultA3.length);
if (resultA3.length > 0) {
  console.log("[v0] First 3:");
  resultA3.slice(0, 3).forEach((m, i) => console.log(`  [${i}]`, m[0]));
}

// Find result__snippet
const snippets = [...html.matchAll(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];
console.log("[v0] result__snippet matches:", snippets.length);
if (snippets.length > 0) {
  console.log("[v0] First snippet:", snippets[0][1]?.substring(0, 200));
}

// Try finding result blocks by splitting on result class
const resultBlocks = html.split(/class="result /);
console.log("[v0] Result blocks (split by 'class=\"result '):", resultBlocks.length - 1);

// Dump a raw 2000-char chunk around first "result__a" occurrence
const firstIdx = html.indexOf("result__a");
if (firstIdx > -1) {
  console.log("[v0] Raw HTML around first result__a:");
  console.log(html.substring(Math.max(0, firstIdx - 200), firstIdx + 800));
}
