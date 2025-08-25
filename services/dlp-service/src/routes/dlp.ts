import express, { Request, Response } from 'express';
import multer from 'multer';
import { DLPService } from '../dlp.js';
import { z } from 'zod';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Validation schemas
const scanMessageSchema = z.object({
  messageId: z.string(),
  content: z.object({
    subject: z.string().optional(),
    body: z.string().optional(),
    attachments: z.array(z.object({
      name: z.string(),
      content: z.string(),
      mimeType: z.string(),
    })).optional(),
  }),
  metadata: z.object({
    sender: z.string().optional(),
    recipients: z.array(z.string()).optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.enum(['pii', 'pci', 'phi', 'financial', 'intellectual-property', 'custom']),
  patterns: z.array(z.object({
    type: z.enum(['regex', 'keyword', 'dictionary', 'ml-model']),
    value: z.string(),
    confidence: z.number().min(0).max(1).optional(),
    context: z.array(z.string()).optional(),
  })),
  actions: z.array(z.object({
    type: z.enum(['block', 'quarantine', 'encrypt', 'warn', 'log', 'redact']),
    parameters: z.record(z.any()).optional(),
  })),
  exceptions: z.array(z.object({
    type: z.enum(['sender', 'recipient', 'domain', 'subject']),
    value: z.string(),
  })),
});

export function createDLPRouter(dlpService: DLPService) {
  // Scan message content
  router.post('/scan', async (req: Request, res: Response) => {
    try {
      const { messageId, content, metadata } = scanMessageSchema.parse(req.body);
      
      const parsedMetadata = {
        ...metadata,
        timestamp: metadata?.timestamp ? new Date(metadata.timestamp) : undefined,
      };

      const result = await dlpService.scanMessage(messageId, content, parsedMetadata);
      
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Scan failed',
      });
    }
  });

  // Scan file upload
  router.post('/scan/file', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const messageId = req.body.messageId || `file-${Date.now()}`;
      const content = {
        attachments: [{
          name: req.file.originalname,
          content: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype,
        }],
      };

      const result = await dlpService.scanMessage(messageId, content);
      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'File scan failed',
      });
    }
  });

  // Get all DLP rules
  router.get('/rules', (req: Request, res: Response) => {
    try {
      const rules = dlpService.getRules();
      res.json(rules);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get rules',
      });
    }
  });

  // Get specific DLP rule
  router.get('/rules/:ruleId', (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const rule = dlpService.getRule(ruleId);
      
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      res.json(rule);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get rule',
      });
    }
  });

  // Add new DLP rule
  router.post('/rules', (req: Request, res: Response) => {
    try {
      const rule = ruleSchema.parse(req.body);
      dlpService.addRule(rule);
      
      res.status(201).json({
        success: true,
        ruleId: rule.id,
        message: 'Rule created successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create rule',
      });
    }
  });

  // Update DLP rule
  router.put('/rules/:ruleId', (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      
      dlpService.updateRule(ruleId, updates);
      
      res.json({
        success: true,
        ruleId,
        message: 'Rule updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update rule',
      });
    }
  });

  // Delete DLP rule
  router.delete('/rules/:ruleId', (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      dlpService.removeRule(ruleId);
      
      res.json({
        success: true,
        ruleId,
        message: 'Rule deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to delete rule',
      });
    }
  });

  // Generate DLP report
  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      const report = await dlpService.generateReport(
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(report);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Report generation failed',
      });
    }
  });

  // Test DLP rule against sample text
  router.post('/rules/:ruleId/test', (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required for testing' });
      }

      const rule = dlpService.getRule(ruleId);
      if (!rule) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      // Test the rule against sample text
      const testResult = {
        ruleId,
        ruleName: rule.name,
        testText: text,
        matches: [], // Would implement actual testing logic
        timestamp: new Date().toISOString(),
      };

      res.json(testResult);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Rule test failed',
      });
    }
  });

  // Get DLP statistics
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const stats = {
        totalRules: dlpService.getRules().length,
        enabledRules: dlpService.getRules().filter(r => r.enabled).length,
        rulesByCategory: dlpService.getRules().reduce((acc, rule) => {
          acc[rule.category] = (acc[rule.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        rulesBySeverity: dlpService.getRules().reduce((acc, rule) => {
          acc[rule.severity] = (acc[rule.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get statistics',
      });
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'dlp-service',
      rulesLoaded: dlpService.getRules().length,
    });
  });

  return router;
}
