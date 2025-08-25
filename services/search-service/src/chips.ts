// Chips round-trip: chips → query → results → chips reconstructed
export function chipsToQuery(chips: string[]): string {
  // Example: convert chips to query string
  return chips.map(chip => `chip:${chip}`).join(' ');
}

export function queryToChips(query: string): string[] {
  // Example: extract chips from query string
  return (query.match(/chip:([\w-]+)/g) || []).map(s => s.replace('chip:', ''));
}

export function reconstructChipsFromResults(results: any[]): string[] {
  // Example: reconstruct chips from search results
  const chips = new Set<string>();
  for (const result of results) {
    if (result._source?.chips) {
      for (const chip of result._source.chips) chips.add(chip);
    }
  }
  return Array.from(chips);
}

export function extractHighlightSnippets(hit: any): string[] {
  // Extract highlight snippets from OpenSearch hit
  return hit.highlight?.content || [];
}
