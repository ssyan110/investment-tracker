/**
 * Parse Bank of Taiwan gold passbook HTML to extract the selling price (本行賣出)
 * in TWD per gram. Extracted for testability.
 *
 * BOT page table structure:
 *   幣別 | 本行買入 (buy) | 本行賣出 (sell)
 *   新臺幣 (TWD) | X,XXX | X,XXX
 */
export function parseBotGoldHtml(html: string): number {
  // Strategy 1: regex for a numeric value immediately following 本行賣出 markup
  const sellPriceRegex = /本行賣出[^<]*<[^>]*>[^<]*?<[^>]*?>([\d,]+(?:\.\d+)?)/;
  const match = sellPriceRegex.exec(html);
  if (match) {
    const price = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(price) && price > 0) return price;
  }

  // Strategy 2: collect all numeric <td> values; if 本行賣出 header exists, the
  // second value is the selling price (buy comes first, sell second)
  const tdRegex = /<td[^>]*>\s*([\d,]+(?:\.\d+)?)\s*<\/td>/g;
  const allPrices: number[] = [];
  let tdMatch;
  while ((tdMatch = tdRegex.exec(html)) !== null) {
    const val = parseFloat(tdMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0) allPrices.push(val);
  }

  if (html.includes('本行賣出') && allPrices.length >= 2) {
    return allPrices[1];
  }

  // Strategy 3: fallback — scan for any number in plausible gold-price range
  const goldPriceRegex = /([\d,]+(?:\.\d+)?)/g;
  let gpMatch;
  const candidates: number[] = [];
  while ((gpMatch = goldPriceRegex.exec(html)) !== null) {
    const val = parseFloat(gpMatch[1].replace(/,/g, ''));
    if (!isNaN(val) && val >= 1000 && val <= 100000) candidates.push(val);
  }

  if (html.includes('本行賣出') && candidates.length >= 2) {
    return candidates[1];
  }
  if (candidates.length > 0) {
    return candidates[0];
  }

  throw new Error('Could not parse gold selling price from HTML');
}
