const query = "animation studios";
const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

async function run() {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  const html = await res.text();
  
  // Test multiple regex patterns to see which one matches
  const patterns = {
    'class="result__a"': /class="result__a"/g,
    'rel="nofollow" class="result__a"': /rel="nofollow"\s+class="result__a"/g,
    'result__a': /result__a/g,
    'result__snippet': /result__snippet/g,
    'result__url': /result__url/g,
    'result result--': /result result--/g,
    'class="result__': /class="result__/g,
    'web-result': /web-result/g,
    'result__body': /result__body/g,
  };

  console.log("HTML length:", html.length);
  console.log("\n--- PATTERN MATCH COUNTS ---");
  for (const [name, regex] of Object.entries(patterns)) {
    const matches = html.match(regex);
    console.log(`${name}: ${matches ? matches.length : 0} matches`);
  }

  // Extract a full result block to see the actual structure
  const resultBlockRegex = /(<div[^>]*class="[^"]*result[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
  const block = html.match(resultBlockRegex);
  if (block) {
    console.log("\n--- FIRST RESULT BLOCK (raw) ---");
    console.log(block[1].substring(0, 1500));
  }

  // Try to find the ACTUAL link pattern
  const linkSample = /(<a[^>]*result__a[^>]*>[\s\S]*?<\/a>)/g;
  let count = 0;
  let match;
  console.log("\n--- ALL result__a LINKS ---");
  while ((match = linkSample.exec(html)) !== null && count < 5) {
    console.log(`\nLink ${count + 1}:`, match[1].substring(0, 500));
    count++;
  }

  // Try snippet pattern
  const snippetSample = /(<a[^>]*result__snippet[^>]*>[\s\S]*?<\/a>)/g;
  count = 0;
  console.log("\n--- ALL result__snippet LINKS ---");
  while ((match = snippetSample.exec(html)) !== null && count < 3) {
    console.log(`\nSnippet ${count + 1}:`, match[1].substring(0, 400));
    count++;
  }
}

run().catch(console.error);
