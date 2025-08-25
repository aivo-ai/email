import express, { Request, Response } from 'express';
import { JournalingService } from '../journaling.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const journalMessageSchema = z.object({
  rawMessage: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  metadata: z.object({
    messageId: z.string().optional(),
    sender: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
    tags: z.record(z.string()).optional(),
    compliance: z.object({
      sox: z.boolean().optional(),
      hipaa: z.boolean().optional(),
      gdpr: z.boolean().optional(),
      finra: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

const searchQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sender: z.string().optional(),
  recipient: z.string().optional(),
  subject: z.string().optional(),
  messageId: z.string().optional(),
  contentHash: z.string().optional(),
  tags: z.record(z.string()).optional(),
  compliance: z.array(z.string()).optional(),
  legalHold: z.boolean().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
});

const legalHoldSchema = z.object({
  hold: z.boolean(),
  reason: z.string().optional(),
});

export function createJournalingRouter(journalingService: JournalingService) {
  // Journal a message
  router.post('/journal', async (req: Request, res: Response) => {
    try {
      const { rawMessage, direction, metadata } = journalMessageSchema.parse(req.body);
      
      const parsedMetadata = {
        ...metadata,
        timestamp: metadata?.timestamp ? new Date(metadata.timestamp) : undefined,
      };

      const entry = await journalingService.journalMessage(
        rawMessage,
        direction,
        parsedMetadata
      );

      res.json({
        success: true,
        entryId: entry.id,
        s3Key: entry.s3Key,
        retentionUntil: entry.retentionUntil,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Journal operation failed',
      });
    }
  });

  // Search journal entries
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const query = searchQuerySchema.parse(req.body);
      
      const searchQuery = {
        ...query,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };

      const results = await journalingService.searchJournal(searchQuery);
      res.json(results);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Search failed',
      });
    }
  });

  // Retrieve a specific message
  router.get('/message/:entryId', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const result = await journalingService.retrieveMessage(entryId);
      
      res.json({
        entry: result.entry,
        hasContent: !!result.content,
        contentSize: result.content?.length || 0,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Glacier retrieval')) {
        res.status(202).json({
          status: 'retrieving',
          message: error.message,
        });
      } else {
        res.status(404).json({
          error: error instanceof Error ? error.message : 'Message not found',
        });
      }
    }
  });

  // Download message content
  router.get('/message/:entryId/content', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const result = await journalingService.retrieveMessage(entryId);
      
      res.setHeader('Content-Type', 'message/rfc822');
      res.setHeader('Content-Disposition', `attachment; filename="${result.entry.messageId}.eml"`);
      res.send(result.content);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'Message content not available',
      });
    }
  });

  // Set/remove legal hold
  router.put('/message/:entryId/legal-hold', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const { hold, reason } = legalHoldSchema.parse(req.body);
      
      await journalingService.setLegalHold(entryId, hold, reason);
      
      res.json({
        success: true,
        entryId,
        legalHold: hold,
        reason,
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Legal hold operation failed',
      });
    }
  });

  // Generate eDiscovery export
  router.post('/export', async (req: Request, res: Response) => {
    try {
      const query = searchQuerySchema.parse(req.body);
      const format = req.body.format || 'eml';
      
      if (!['pst', 'mbox', 'eml'].includes(format)) {
        return res.status(400).json({ error: 'Invalid export format' });
      }

      const searchQuery = {
        ...query,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };

      const exportResult = await journalingService.generateEDiscoveryExport(
        searchQuery,
        format as 'pst' | 'mbox' | 'eml'
      );

      res.json(exportResult);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Export generation failed',
      });
    }
  });

  // Get compliance report
  router.get('/reports/compliance', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, complianceType } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      const report = await journalingService.getComplianceReport(
        new Date(startDate as string),
        new Date(endDate as string),
        complianceType as string
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Report generation failed',
      });
    }
  });

  // Validate message integrity
  router.get('/message/:entryId/integrity', async (req: Request, res: Response) => {
    try {
      const { entryId } = req.params;
      const validation = await journalingService.validateIntegrity(entryId);
      
      res.json(validation);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Integrity validation failed',
      });
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'journaling-service',
    });
  });

  return router;
}
