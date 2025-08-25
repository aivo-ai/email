import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SearchService, SearchChip } from '../src/services/search.js';
import { OpenSearchClient } from '../src/lib/opensearch.js';

describe('Search Service', () => {
  let searchService: SearchService;
  let openSearchClient: OpenSearchClient;
  
  beforeAll(async () => {
    // Setup test OpenSearch client
    openSearchClient = new OpenSearchClient({
      node: 'http://localhost:9200',
      auth: { username: 'admin', password: 'admin' },
      ssl: { rejectUnauthorized: false }
    });
    
    searchService = new SearchService(openSearchClient);
    
    // Setup test data
    await setupTestData();
  });
  
  afterAll(async () => {
    // Cleanup test indices
    await cleanupTestData();
  });
  
  describe('Chip Round-trip Tests', () => {
    it('should reconstruct chips from search query', async () => {
      const originalChips: SearchChip[] = [
        { type: 'from', value: 'test@example.com', label: 'From: test@example.com' },
        { type: 'subject', value: 'urgent', label: 'Subject: urgent' },
        { type: 'has', value: 'attachment', label: 'Has: attachment' }
      ];
      
      const searchQuery = {
        chips: originalChips,
        userId: 'test-user',
        limit: 10
      };
      
      const result = await searchService.search(searchQuery);
      
      // Verify chips are reconstructed correctly
      expect(result.chips).toHaveLength(originalChips.length);
      
      originalChips.forEach((originalChip, index) => {
        expect(result.chips[index]).toMatchObject({
          type: originalChip.type,
          value: originalChip.value,
          label: originalChip.label
        });
      });
    });
    
    it('should handle complex chip combinations', async () => {
      const complexChips: SearchChip[] = [
        { type: 'from', value: 'boss@company.com', label: 'From: boss@company.com' },
        { type: 'date', value: 'last week', label: 'Date: last week' },
        { type: 'in', value: 'inbox', label: 'In: inbox' },
        { type: 'text', value: 'project update', label: 'project update' }
      ];
      
      const searchQuery = {
        chips: complexChips,
        text: 'meeting',
        userId: 'test-user'
      };
      
      const result = await searchService.search(searchQuery);
      
      // Verify all chips are preserved
      expect(result.chips.length).toBeGreaterThanOrEqual(complexChips.length);
      
      // Verify free text is included
      const textChip = result.chips.find(chip => chip.type === 'text' && chip.value === 'meeting');
      expect(textChip).toBeDefined();
    });
  });
  
  describe('Performance Tests', () => {
    it('should complete search in under 200ms for 10k messages', async () => {
      // This test assumes 10k test messages are indexed
      const startTime = Date.now();
      
      const result = await searchService.search({
        chips: [
          { type: 'text', value: 'important', label: 'important' }
        ],
        userId: 'test-user',
        limit: 50
      });
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(200);
      expect(result.took).toBeLessThan(200);
    });
    
    it('should handle concurrent searches efficiently', async () => {
      const searchPromises = Array(10).fill(null).map((_, i) => 
        searchService.search({
          chips: [
            { type: 'text', value: `query-${i}`, label: `query-${i}` }
          ],
          userId: 'test-user'
        })
      );
      
      const startTime = Date.now();
      const results = await Promise.all(searchPromises);
      const totalDuration = Date.now() - startTime;
      
      // All searches should complete within reasonable time
      expect(totalDuration).toBeLessThan(1000);
      
      // Each search should be reasonably fast
      results.forEach(result => {
        expect(result.took).toBeLessThan(200);
      });
    });
  });
  
  describe('Highlight Accuracy Tests', () => {
    it('should provide accurate highlights for search terms', async () => {
      const searchQuery = {
        chips: [
          { type: 'text', value: 'project deadline', label: 'project deadline' }
        ],
        userId: 'test-user'
      };
      
      const result = await searchService.search(searchQuery);
      
      // Check that highlights are present and accurate
      const resultsWithHighlights = result.results.filter(r => 
        Object.keys(r.highlight).length > 0
      );
      
      expect(resultsWithHighlights.length).toBeGreaterThan(0);
      
      // Verify highlight formatting
      resultsWithHighlights.forEach(result => {
        Object.values(result.highlight).forEach(highlightArray => {
          highlightArray.forEach(highlight => {
            expect(highlight).toContain('<mark>');
            expect(highlight).toContain('</mark>');
          });
        });
      });
    });
    
    it('should highlight terms in subject and body correctly', async () => {
      const result = await searchService.search({
        chips: [
          { type: 'subject', value: 'meeting', label: 'Subject: meeting' }
        ],
        userId: 'test-user'
      });
      
      const subjectHighlights = result.results.filter(r => r.highlight.subject);
      expect(subjectHighlights.length).toBeGreaterThan(0);
      
      subjectHighlights.forEach(result => {
        const highlights = result.highlight.subject;
        expect(highlights.some(h => h.includes('<mark>meeting</mark>'))).toBe(true);
      });
    });
  });
  
  describe('ACL Filter Tests', () => {
    it('should only return results for the specified user', async () => {
      const result = await searchService.search({
        chips: [],
        userId: 'test-user',
        limit: 100
      });
      
      // All results should belong to the test user
      result.results.forEach(result => {
        expect(result.source.userId).toBe('test-user');
      });
    });
    
    it('should not return results from other users', async () => {
      // Search as different user
      const result = await searchService.search({
        chips: [],
        userId: 'other-user',
        limit: 100
      });
      
      // Should not find any results meant for test-user
      const testUserResults = result.results.filter(r => 
        r.source.userId === 'test-user'
      );
      
      expect(testUserResults).toHaveLength(0);
    });
  });
  
  describe('Chip Suggestions', () => {
    it('should provide relevant chip suggestions', async () => {
      const suggestions = await searchService.suggestChips('test-user', 'proj');
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.value.includes('proj'))).toBe(true);
    });
  });
});

async function setupTestData() {
  // This would populate OpenSearch with test data
  // For brevity, this is a placeholder
  console.log('Setting up test data...');
}

async function cleanupTestData() {
  // This would clean up test indices
  console.log('Cleaning up test data...');
}
