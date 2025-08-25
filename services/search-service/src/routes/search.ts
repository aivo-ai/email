import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const SearchChipSchema = z.object({
  type: z.enum(['from', 'to', 'subject', 'date', 'has', 'in', 'text']),
  value: z.string(),
  label: z.string(),
  operator: z.enum(['AND', 'OR', 'NOT']).optional()
});

const SearchQuerySchema = z.object({
  chips: z.array(SearchChipSchema).default([]),
  text: z.string().optional(),
  userId: z.string(),
  indices: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // Main search endpoint
  fastify.post('/query', {
    schema: {
      body: SearchQuerySchema,
      response: {
        200: z.object({
          results: z.array(z.object({
            id: z.string(),
            index: z.string(),
            score: z.number(),
            highlight: z.record(z.array(z.string())),
            source: z.any()
          })),
          total: z.number(),
          took: z.number(),
          chips: z.array(SearchChipSchema),
          aggregations: z.record(z.any()).optional()
        })
      }
    }
  }, async (request, reply) => {
    const query = request.body;
    
    try {
      const result = await fastify.search.search(query);
      
      // Track performance metrics
      if (result.took > 200) {
        fastify.log.warn(`Slow search query: ${result.took}ms`, { query, took: result.took });
      }
      
      return result;
    } catch (error) {
      fastify.log.error(error, 'Search query failed');
      throw fastify.httpErrors.internalServerError('Search failed');
    }
  });
  
  // Chip suggestions endpoint
  fastify.get('/suggest', {
    schema: {
      querystring: z.object({
        userId: z.string(),
        query: z.string(),
        limit: z.number().min(1).max(20).default(10)
      }),
      response: {
        200: z.object({
          suggestions: z.array(SearchChipSchema)
        })
      }
    }
  }, async (request, reply) => {
    const { userId, query } = request.query;
    
    try {
      const suggestions = await fastify.search.suggestChips(userId, query);
      return { suggestions };
    } catch (error) {
      fastify.log.error(error, 'Chip suggestions failed');
      throw fastify.httpErrors.internalServerError('Suggestions failed');
    }
  });
  
  // Search analytics endpoint
  fastify.get('/analytics/:userId', {
    schema: {
      params: z.object({
        userId: z.string()
      }),
      response: {
        200: z.object({
          totalSearches: z.number(),
          avgResponseTime: z.number(),
          popularChips: z.array(z.object({
            type: z.string(),
            value: z.string(),
            count: z.number()
          })),
          slowQueries: z.number()
        })
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params;
    
    // This would typically come from a metrics store
    return {
      totalSearches: 1542,
      avgResponseTime: 156,
      popularChips: [
        { type: 'from', value: 'important@company.com', count: 45 },
        { type: 'has', value: 'attachment', count: 32 },
        { type: 'in', value: 'inbox', count: 89 }
      ],
      slowQueries: 12
    };
  });
};
