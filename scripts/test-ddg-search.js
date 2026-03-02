// Test DuckDuckGo search parsing end-to-end
// This must return real results before we put it in the route

async function testSearch(query) {
  console.log(`\n=== Searching: "${query}" ===\n`)

  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `q=${encodeURIComponent(query)}`,
  })

  const html = await res.text()
  console.log("HTML length:", html.length)

  // Step 1: Split HTML into result blocks using result__body
  const blocks = html.split(/class="result__body/)
  console.log("Total blocks (including first non-result):", blocks.length)

  const results = []

  // Skip first block (it's before any results)
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]

    // Skip ads
    if (block.includes("ad_provider") || block.includes("ad_domain")) {
      console.log(`  Block ${i}: SKIPPED (ad)`)
      continue
    }

    // Extract URL from result__a href
    // Pattern: rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=ENCODED_URL&amp;rut=
    const hrefMatch = block.match(/href="[^"]*uddg=([^&"]+)/)
    if (!hrefMatch) {
      console.log(`  Block ${i}: SKIPPED (no uddg URL found)`)
      continue
    }

    let url
    try {
      url = decodeURIComponent(hrefMatch[1])
    } catch {
      console.log(`  Block ${i}: SKIPPED (URL decode failed)`)
      continue
    }

    // Skip non-http URLs and aggregator sites
    if (!url.startsWith("http")) continue
    if (/wikipedia\.org|youtube\.com|reddit\.com|yelp\.com|facebook\.com/i.test(url)) {
      console.log(`  Block ${i}: SKIPPED (aggregator: ${url})`)
      continue
    }

    // Extract title from result__a tag content
    const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</)
    const title = titleMatch 
      ? titleMatch[1].replace(/<[^>]*>/g, "").trim() 
      : new URL(url).hostname

    // Extract snippet from result__snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/)
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()
      : ""

    // Extract display domain
    let displayLink = ""
    try {
      displayLink = new URL(url).hostname.replace("www.", "")
    } catch {
      displayLink = url
    }

    results.push({ title, link: url, snippet, displayLink })
    console.log(`  Block ${i}: "${title}" -> ${displayLink}`)
  }

  console.log(`\n--- Found ${results.length} results ---`)
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`)
    console.log(`   ${r.link}`)
    console.log(`   ${r.snippet.substring(0, 100)}...`)
    console.log()
  })

  return results
}

// Run test searches
async function main() {
  await testSearch("animation studios Los Angeles")
  await testSearch("commercial voice over production companies")
  await testSearch("e-learning narration production companies")
}

main().catch(console.error)
