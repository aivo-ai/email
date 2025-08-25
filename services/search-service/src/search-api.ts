import { searchMessages } from './opensearch';
import { chipsToQuery, reconstructChipsFromResults, extractHighlightSnippets } from './chips';

export async function searchWebmail({ userId, chips, aclFilter }: { userId: string; chips: string[]; aclFilter: object }) {
  // Chips → query
  const query = chipsToQuery(chips);
  // Query → results
  const results = await searchMessages({ userId, query, aclFilter, chips });
  // Results → chips reconstructed
  const reconstructedChips = reconstructChipsFromResults(results.hits.hits);
  // Highlight snippets
  const highlights = results.hits.hits.map(extractHighlightSnippets);
  return {
    results: results.hits.hits,
    chips: reconstructedChips,
    highlights,
  };
}
