import express, { Request, Response } from 'express';
import multer from 'multer';
import { CDRService } from '../cdr.js';
import { z } from 'zod';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Validation schemas
const policySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  fileTypes: z.array(z.string()),
  actions: z.array(z.object({
    type: z.enum(['sanitize', 'extract', 'convert', 'block', 'quarantine']),
    parameters: z.record(z.any()).optional(),
  })),
  maxFileSize: z.number().min(0),
  allowedElements: z.array(z.string()).optional(),
  dangerousElements: z.array(z.string()).optional(),
});

export function createCDRRouter(cdrService: CDRService) {
  // Process single attachment
  router.post('/process', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const attachmentInfo = {
        filename: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        content: req.file.buffer,
        metadata: {
          createdDate: new Date(),
        },
      };

      const result = await cdrService.processAttachment(attachmentInfo);
      
      // Don't send the actual content in the response for security
      const responseResult = {
        ...result,
        processedFile: result.processedFile ? {
          ...result.processedFile,
          content: undefined, // Remove content from response
          contentAvailable: true,
        } : undefined,
      };

      res.json(responseResult);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    }
  });

  // Process multiple attachments
  router.post('/process/batch', upload.array('files', 10), async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const results = [];
      
      for (const file of req.files) {
        const attachmentInfo = {
          filename: file.originalname,
          originalSize: file.size,
          mimeType: file.mimetype,
          content: file.buffer,
          metadata: {
            createdDate: new Date(),
          },
        };

        const result = await cdrService.processAttachment(attachmentInfo);
        
        // Remove content from response
        results.push({
          ...result,
          processedFile: result.processedFile ? {
            ...result.processedFile,
            content: undefined,
            contentAvailable: true,
          } : undefined,
        });
      }

      res.json({
        totalFiles: req.files.length,
        results,
        summary: {
          clean: results.filter(r => r.status === 'clean').length,
          sanitized: results.filter(r => r.status === 'sanitized').length,
          blocked: results.filter(r => r.status === 'blocked').length,
          failed: results.filter(r => r.status === 'failed').length,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Batch processing failed',
      });
    }
  });

  // Download processed file
  router.get('/result/:resultId/download', (req: Request, res: Response) => {
    try {
      const { resultId } = req.params;
      
      // In production, retrieve the processed file from storage
      res.status(404).json({
        error: 'File not found - implement file storage retrieval',
        resultId,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  });

  // Get all CDR policies
  router.get('/policies', (req: Request, res: Response) => {
    try {
      const policies = cdrService.getPolicies();
      res.json(policies);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get policies',
      });
    }
  });

  // Get specific CDR policy
  router.get('/policies/:policyId', (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const policy = cdrService.getPolicy(policyId);
      
      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(policy);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get policy',
      });
    }
  });

  // Add new CDR policy
  router.post('/policies', (req: Request, res: Response) => {
    try {
      const policy = policySchema.parse(req.body);
      cdrService.addPolicy(policy);
      
      res.status(201).json({
        success: true,
        policyId: policy.id,
        message: 'Policy created successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create policy',
      });
    }
  });

  // Update CDR policy
  router.put('/policies/:policyId', (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      const updates = req.body;
      
      cdrService.updatePolicy(policyId, updates);
      
      res.json({
        success: true,
        policyId,
        message: 'Policy updated successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update policy',
      });
    }
  });

  // Test file against specific policy
  router.post('/policies/:policyId/test', upload.single('file'), async (req: Request, res: Response) => {
    try {
      const { policyId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded for testing' });
      }

      const policy = cdrService.getPolicy(policyId);
      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const attachmentInfo = {
        filename: req.file.originalname,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        content: req.file.buffer,
        metadata: {
          createdDate: new Date(),
        },
      };

      const result = await cdrService.processAttachment(attachmentInfo);
      
      res.json({
        policyId,
        policyName: policy.name,
        testResult: {
          ...result,
          processedFile: result.processedFile ? {
            ...result.processedFile,
            content: undefined,
            contentAvailable: true,
          } : undefined,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Policy test failed',
      });
    }
  });

  // Generate CDR report
  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      const report = await cdrService.generateReport(
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

  // Get CDR statistics
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const policies = cdrService.getPolicies();
      
      const stats = {
        totalPolicies: policies.length,
        enabledPolicies: policies.filter(p => p.enabled).length,
        policiesByType: policies.reduce((acc, policy) => {
          policy.fileTypes.forEach(fileType => {
            acc[fileType] = (acc[fileType] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
        supportedFileTypes: [...new Set(policies.flatMap(p => p.fileTypes))],
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get statistics',
      });
    }
  });

  // Check if file type is supported
  router.post('/check-support', (req: Request, res: Response) => {
    try {
      const { mimeType, filename } = req.body;
      
      if (!mimeType && !filename) {
        return res.status(400).json({ error: 'Either mimeType or filename is required' });
      }

      const policies = cdrService.getPolicies();
      const supportedPolicies = policies.filter(policy => {
        if (mimeType && policy.fileTypes.includes(mimeType)) {
          return true;
        }
        
        if (filename) {
          const extension = filename.split('.').pop()?.toLowerCase();
          return extension && policy.fileTypes.includes(`.${extension}`);
        }
        
        return false;
      });

      res.json({
        supported: supportedPolicies.length > 0,
        applicablePolicies: supportedPolicies.map(p => ({
          id: p.id,
          name: p.name,
          enabled: p.enabled,
        })),
        mimeType,
        filename,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Support check failed',
      });
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    const policies = cdrService.getPolicies();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cdr-service',
      policiesLoaded: policies.length,
      enabledPolicies: policies.filter(p => p.enabled).length,
    });
  });

  return router;
}
