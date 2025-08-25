import express, { Request, Response } from 'express';
import { SLOService } from '../slo.js';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const sloSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  service: z.string(),
  sli: z.object({
    name: z.string(),
    description: z.string(),
    query: z.string(),
    threshold: z.number(),
    unit: z.enum(['ms', 'percent', 'count', 'ratio']),
  }),
  target: z.number(),
  timeWindow: z.enum(['1h', '1d', '7d', '30d']),
  errorBudget: z.number(),
  enabled: z.boolean(),
  alerts: z.array(z.object({
    type: z.enum(['burnRate', 'errorBudget', 'absolute']),
    threshold: z.number(),
    severity: z.enum(['warning', 'critical']),
    channels: z.array(z.string()),
  })),
});

const chaosExperimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['latency', 'error', 'network', 'resource', 'dependency']),
  target: z.object({
    service: z.string(),
    component: z.string().optional(),
    percentage: z.number().min(0).max(100),
  }),
  parameters: z.record(z.any()),
  duration: z.number().positive(),
  schedule: z.string().optional(),
  enabled: z.boolean(),
  safetyChecks: z.array(z.object({
    type: z.enum(['slo', 'metric', 'health']),
    condition: z.string(),
    action: z.enum(['abort', 'reduce', 'continue']),
  })),
});

export function createSLORouter(sloService: SLOService) {
  // Get all SLOs
  router.get('/slos', (req: Request, res: Response) => {
    try {
      const slos = sloService.getSLOs();
      res.json(slos);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get SLOs',
      });
    }
  });

  // Get SLO status
  router.get('/slos/:sloId/status', (req: Request, res: Response) => {
    try {
      const { sloId } = req.params;
      const status = sloService.getSLOStatus(sloId);
      res.json(status);
    } catch (error) {
      res.status(404).json({
        error: error instanceof Error ? error.message : 'SLO not found',
      });
    }
  });

  // Get all SLO statuses
  router.get('/status', (req: Request, res: Response) => {
    try {
      const statuses = sloService.getSLOStatus();
      res.json(statuses);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get SLO statuses',
      });
    }
  });

  // Add new SLO
  router.post('/slos', (req: Request, res: Response) => {
    try {
      const slo = sloSchema.parse(req.body);
      sloService.addSLO(slo);
      
      res.status(201).json({
        success: true,
        sloId: slo.id,
        message: 'SLO created successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create SLO',
      });
    }
  });

  // Get all chaos experiments
  router.get('/experiments', (req: Request, res: Response) => {
    try {
      const experiments = sloService.getExperiments();
      res.json(experiments);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get experiments',
      });
    }
  });

  // Add new chaos experiment
  router.post('/experiments', (req: Request, res: Response) => {
    try {
      const experiment = chaosExperimentSchema.parse(req.body);
      sloService.addExperiment(experiment);
      
      res.status(201).json({
        success: true,
        experimentId: experiment.id,
        message: 'Chaos experiment created successfully',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create experiment',
      });
    }
  });

  // Run chaos experiment
  router.post('/experiments/:experimentId/run', async (req: Request, res: Response) => {
    try {
      const { experimentId } = req.params;
      
      // Run experiment asynchronously
      sloService.runExperiment(experimentId).catch(error => {
        console.error(`Experiment ${experimentId} failed:`, error);
      });
      
      res.json({
        success: true,
        experimentId,
        message: 'Chaos experiment started',
        status: 'running',
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to run experiment',
      });
    }
  });

  // Generate SLO report
  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
      }

      const report = await sloService.generateReport(
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

  // Get SLO metrics for Prometheus
  router.get('/metrics', (req: Request, res: Response) => {
    try {
      // In production, this would return Prometheus metrics
      res.set('Content-Type', 'text/plain');
      res.send('# SLO metrics endpoint\n# Prometheus metrics would be here');
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get metrics',
      });
    }
  });

  // Dashboard data endpoint
  router.get('/dashboard', (req: Request, res: Response) => {
    try {
      const statuses = sloService.getSLOStatus() as any[];
      const experiments = sloService.getExperiments();
      
      const dashboard = {
        summary: {
          totalSLOs: statuses.length,
          healthySLOs: statuses.filter(s => s.status === 'healthy').length,
          warningSLOs: statuses.filter(s => s.status === 'warning').length,
          criticalSLOs: statuses.filter(s => s.status === 'critical').length,
        },
        worstSLOs: statuses
          .filter(s => s.status !== 'healthy')
          .sort((a, b) => a.errorBudgetRemaining - b.errorBudgetRemaining)
          .slice(0, 5),
        recentExperiments: experiments
          .filter(e => e.enabled)
          .slice(0, 10),
        alertsSummary: {
          active: 0, // Would calculate from actual alerts
          warning: 0,
          critical: 0,
        },
      };

      res.json(dashboard);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get dashboard data',
      });
    }
  });

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    const slos = sloService.getSLOs();
    const experiments = sloService.getExperiments();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'slo-service',
      slosLoaded: slos.length,
      experimentsLoaded: experiments.length,
      monitoring: 'active',
    });
  });

  return router;
}
