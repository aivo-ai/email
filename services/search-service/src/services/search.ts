import { OpenSearchClient } from '../lib/opensearch.js';
import { config } from '../config.js';

export interface SearchChip {
  type: 'from' | 'to' | 'subject' | 'date' | 'has' | 'in' | 'text';
  value: string;
  label: string;
  operator?: 'AND' | 'OR' | 'NOT';
}

export interface SearchQuery {
  chips: SearchChip[];
  text?: string;
  userId: string;
  indices?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  index: string;
  score: number;
  highlight: Record<string, string[]>;
  source: any;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number;
  chips: SearchChip[];
  aggregations?: Record<string, any>;
}

export class SearchService {
  private openSearch: OpenSearchClient;
  
  constructor(openSearch: OpenSearchClient) {
    this.openSearch = openSearch;
  }
  
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    // Build OpenSearch query from chips and text
    const opensearchQuery = this.buildQuery(query);
    
    // Add ACL filters for user access
    opensearchQuery.query = {
      bool: {
        must: opensearchQuery.query,
        filter: [
          { term: { userId: query.userId } }
        ]
      }
    };
    
    // Add highlighting
    opensearchQuery.highlight = {
      fields: {
        subject: { fragment_size: config.search.highlightLength },
        body: { fragment_size: config.search.highlightLength },
        'attachments.extractedText': { fragment_size: config.search.highlightLength }
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>']
    };
    
    // Add pagination
    opensearchQuery.from = query.offset || 0;
    opensearchQuery.size = Math.min(query.limit || 20, config.search.maxResults);
    
    // Execute search across specified indices
    const indices = query.indices || ['emails', 'calendar', 'contacts'];
    const response = await this.openSearch.search(indices.join(','), opensearchQuery);
    
    const took = Date.now() - startTime;
    
    // Map results
    const results: SearchResult[] = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      index: hit._index,
      score: hit._score,
      highlight: hit.highlight || {},
      source: hit._source
    }));
    
    // Reconstruct chips from query for round-trip verification
    const reconstructedChips = this.reconstructChips(opensearchQuery, query.text);
    
    return {
      results,
      total: response.hits.total.value,
      took,
      chips: reconstructedChips,
      aggregations: response.aggregations
    };
  }
  
  private buildQuery(query: SearchQuery): any {
    const mustClauses: any[] = [];
    
    // Process chips
    query.chips.forEach(chip => {
      switch (chip.type) {
        case 'from':
          mustClauses.push({
            term: { 'headers.from': chip.value }
          });
          break;
          
        case 'to':
          mustClauses.push({
            bool: {
              should: [
                { term: { 'headers.to': chip.value } },
                { term: { 'headers.cc': chip.value } }
              ]
            }
          });
          break;
          
        case 'subject':
          mustClauses.push({
            match: { subject: chip.value }
          });
          break;
          
        case 'date':
          mustClauses.push({
            range: { timestamp: this.parseDateRange(chip.value) }
          });
          break;
          
        case 'has':
          if (chip.value === 'attachment') {
            mustClauses.push({
              exists: { field: 'attachments' }
            });
          }
          break;
          
        case 'in':
          mustClauses.push({
            term: { folderId: chip.value }
          });
          break;
          
        case 'text':
          mustClauses.push({
            multi_match: {
              query: chip.value,
              fields: ['subject^2', 'body', 'attachments.extractedText']
            }
          });
          break;
      }
    });
    
    // Add free text search if provided
    if (query.text) {
      mustClauses.push({
        multi_match: {
          query: query.text,
          fields: ['subject^2', 'body', 'attachments.extractedText'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }
    
    return {
      query: {
        bool: {
          must: mustClauses.length > 0 ? mustClauses : [{ match_all: {} }]
        }
      },
      sort: [
        { _score: { order: 'desc' } },
        { timestamp: { order: 'desc' } }
      ]
    };
  }
  
  private parseDateRange(dateStr: string): any {
    // Parse common date formats: "today", "yesterday", "last week", "2024-01-01", etc.
    const now = new Date();
    
    switch (dateStr.toLowerCase()) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return { gte: today.toISOString() };
        
      case 'yesterday':
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return {
          gte: yesterday.toISOString(),
          lte: yesterdayEnd.toISOString()
        };
        
      case 'last week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { gte: weekAgo.toISOString() };
        
      default:
        // Try to parse as ISO date
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return { gte: date.toISOString() };
          }
        } catch {
          // Fall back to match_all
        }
        return {};
    }
  }
  
  private reconstructChips(opensearchQuery: any, originalText?: string): SearchChip[] {
    const chips: SearchChip[] = [];
    
    // This is a simplified reconstruction - in practice, you'd need to
    // map back from the OpenSearch query structure to chips
    if (opensearchQuery.query?.bool?.must) {
      opensearchQuery.query.bool.must.forEach((clause: any) => {
        if (clause.term?.['headers.from']) {
          chips.push({
            type: 'from',
            value: clause.term['headers.from'],
            label: `From: ${clause.term['headers.from']}`
          });
        }
        // Add more chip reconstruction logic...
      });
    }
    
    if (originalText) {
      chips.push({
        type: 'text',
        value: originalText,
        label: originalText
      });
    }
    
    return chips;
  }
  
  async suggestChips(userId: string, query: string): Promise<SearchChip[]> {
    // Provide autocomplete suggestions for chips based on user's data
    const suggestions: SearchChip[] = [];
    
    // Get frequent contacts for from/to suggestions
    const contactsQuery = {
      query: {
        bool: {
          must: [
            { term: { userId } },
            { prefix: { email: query } }
          ]
        }
      },
      size: 5
    };
    
    try {
      const response = await this.openSearch.search('contacts', contactsQuery);
      response.hits.hits.forEach((hit: any) => {
        suggestions.push({
          type: 'from',
          value: hit._source.email,
          label: `From: ${hit._source.name} <${hit._source.email}>`
        });
      });
    } catch (error) {
      console.error('Error getting chip suggestions:', error);
    }
    
    return suggestions;
  }
}
