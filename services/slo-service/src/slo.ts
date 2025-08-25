import winston from 'winston';
import * as cron from 'node-cron';
import { register, Histogram, Counter, Gauge } from 'prom-client';

export interface SLI {
  name: string;
  description: string;
  query: string;
  threshold: number;
  unit: 'ms' | 'percent' | 'count' | 'ratio';
}

export interface SLO {
  id: string;
  name: string;
  description: string;
  service: string;
  sli: SLI;
  target: number; // e.g., 99.9 for 99.9%
  timeWindow: '1h' | '1d' | '7d' | '30d';
  errorBudget: number; // calculated based on target
  enabled: boolean;
  alerts: Array<{
    type: 'burnRate' | 'errorBudget' | 'absolute';
    threshold: number;
    severity: 'warning' | 'critical';
    channels: string[];
  }>;
}

export interface SLOStatus {
  sloId: string;
  currentValue: number;
  target: number;
  errorBudgetRemaining: number;
  errorBudgetUsed: number;
  status: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: 'latency' | 'error' | 'network' | 'resource' | 'dependency';
  target: {
    service: string;
    component?: string;
    percentage: number; // % of traffic to affect
  };
  parameters: Record<string, any>;
  duration: number; // seconds
  schedule?: string; // cron expression
  enabled: boolean;
  safetyChecks: Array<{
    type: 'slo' | 'metric' | 'health';
    condition: string;
    action: 'abort' | 'reduce' | 'continue';
  }>;
}

export class SLOService {
  private slos: Map<string, SLO> = new Map();
  private sloStatus: Map<string, SLOStatus> = new Map();
  private experiments: Map<string, ChaosExperiment> = new Map();
  private logger: winston.Logger;

  // Prometheus metrics
  private sloValueGauge: Gauge<string>;
  private errorBudgetGauge: Gauge<string>;
  private sloViolationCounter: Counter<string>;
  private chaosExperimentHistogram: Histogram<string>;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'slo.log' }),
      ],
    });

    this.initializeMetrics();
    this.initializeDefaultSLOs();
    this.startMonitoring();
  }

  private initializeMetrics() {
    this.sloValueGauge = new Gauge({
      name: 'slo_current_value',
      help: 'Current SLO value',
      labelNames: ['slo_id', 'service', 'slo_name'],
      registers: [register],
    });

    this.errorBudgetGauge = new Gauge({
      name: 'slo_error_budget_remaining',
      help: 'Remaining error budget percentage',
      labelNames: ['slo_id', 'service', 'slo_name'],
      registers: [register],
    });

    this.sloViolationCounter = new Counter({
      name: 'slo_violations_total',
      help: 'Total number of SLO violations',
      labelNames: ['slo_id', 'service', 'severity'],
      registers: [register],
    });

    this.chaosExperimentHistogram = new Histogram({
      name: 'chaos_experiment_duration_seconds',
      help: 'Duration of chaos experiments',
      labelNames: ['experiment_id', 'type', 'status'],
      buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
      registers: [register],
    });
  }

  private initializeDefaultSLOs() {
    // Email delivery latency SLO
    this.addSLO({
      id: 'email-delivery-latency',
      name: 'Email Delivery Latency',
      description: 'P95 email delivery time should be under 5 seconds',
      service: 'backend',
      sli: {
        name: 'delivery_latency_p95',
        description: '95th percentile of email delivery time',
        query: 'histogram_quantile(0.95, rate(email_delivery_duration_seconds_bucket[5m]))',
        threshold: 5.0,
        unit: 'ms',
      },
      target: 99.0, // 99% of deliveries under 5s
      timeWindow: '1h',
      errorBudget: 1.0, // 1% error budget
      enabled: true,
      alerts: [
        {
          type: 'burnRate',
          threshold: 5.0, // 5x burn rate
          severity: 'warning',
          channels: ['slack', 'email'],
        },
        {
          type: 'errorBudget',
          threshold: 10.0, // 10% budget remaining
          severity: 'critical',
          channels: ['slack', 'pagerduty'],
        },
      ],
    });

    // API availability SLO
    this.addSLO({
      id: 'api-availability',
      name: 'API Availability',
      description: 'API should return successful responses',
      service: 'backend',
      sli: {
        name: 'api_success_rate',
        description: 'Percentage of successful API requests',
        query: '(sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100',
        threshold: 99.9,
        unit: 'percent',
      },
      target: 99.9,
      timeWindow: '30d',
      errorBudget: 0.1,
      enabled: true,
      alerts: [
        {
          type: 'absolute',
          threshold: 99.0, // Below 99%
          severity: 'critical',
          channels: ['slack', 'pagerduty'],
        },
      ],
    });

    // WebMail responsiveness SLO
    this.addSLO({
      id: 'webmail-responsiveness',
      name: 'WebMail Responsiveness',
      description: 'WebMail should load within 2 seconds',
      service: 'webmail',
      sli: {
        name: 'page_load_time_p95',
        description: '95th percentile page load time',
        query: 'histogram_quantile(0.95, rate(page_load_duration_seconds_bucket[5m]))',
        threshold: 2.0,
        unit: 'ms',
      },
      target: 95.0,
      timeWindow: '7d',
      errorBudget: 5.0,
      enabled: true,
      alerts: [
        {
          type: 'burnRate',
          threshold: 3.0,
          severity: 'warning',
          channels: ['slack'],
        },
      ],
    });

    // Search performance SLO
    this.addSLO({
      id: 'search-performance',
      name: 'Search Performance',
      description: 'Search queries should complete within 200ms',
      service: 'search-service',
      sli: {
        name: 'search_latency_p95',
        description: '95th percentile search query time',
        query: 'histogram_quantile(0.95, rate(search_duration_seconds_bucket[5m]))',
        threshold: 0.2,
        unit: 'ms',
      },
      target: 99.0,
      timeWindow: '1d',
      errorBudget: 1.0,
      enabled: true,
      alerts: [
        {
          type: 'burnRate',
          threshold: 4.0,
          severity: 'warning',
          channels: ['slack'],
        },
      ],
    });

    // Auth service reliability SLO
    this.addSLO({
      id: 'auth-reliability',
      name: 'Authentication Reliability',
      description: 'Authentication requests should succeed',
      service: 'auth-service',
      sli: {
        name: 'auth_success_rate',
        description: 'Percentage of successful auth requests',
        query: '(sum(rate(auth_requests_total{status="success"}[5m])) / sum(rate(auth_requests_total[5m]))) * 100',
        threshold: 99.95,
        unit: 'percent',
      },
      target: 99.95,
      timeWindow: '30d',
      errorBudget: 0.05,
      enabled: true,
      alerts: [
        {
          type: 'absolute',
          threshold: 99.0,
          severity: 'critical',
          channels: ['slack', 'pagerduty'],
        },
      ],
    });

    this.initializeChaosExperiments();
  }

  private initializeChaosExperiments() {
    // Latency injection experiment
    this.addExperiment({
      id: 'latency-injection',
      name: 'API Latency Injection',
      description: 'Inject 500ms latency to 10% of API requests',
      type: 'latency',
      target: {
        service: 'backend',
        component: 'api',
        percentage: 10,
      },
      parameters: {
        delay: 500, // ms
        jitter: 100, // ms
      },
      duration: 300, // 5 minutes
      schedule: '0 2 * * 1', // Monday 2 AM
      enabled: false, // Enable manually
      safetyChecks: [
        {
          type: 'slo',
          condition: 'api-availability > 99.0',
          action: 'abort',
        },
        {
          type: 'metric',
          condition: 'error_rate < 0.1',
          action: 'continue',
        },
      ],
    });

    // Error injection experiment
    this.addExperiment({
      id: 'error-injection',
      name: 'API Error Injection',
      description: 'Return 5xx errors for 5% of requests',
      type: 'error',
      target: {
        service: 'backend',
        component: 'api',
        percentage: 5,
      },
      parameters: {
        errorRate: 0.05,
        errorCodes: [500, 502, 503],
      },
      duration: 180, // 3 minutes
      enabled: false,
      safetyChecks: [
        {
          type: 'slo',
          condition: 'api-availability > 98.0',
          action: 'abort',
        },
      ],
    });

    // Network partition experiment
    this.addExperiment({
      id: 'network-partition',
      name: 'Database Network Partition',
      description: 'Simulate network partition to database',
      type: 'network',
      target: {
        service: 'backend',
        component: 'database',
        percentage: 100,
      },
      parameters: {
        duration: 30, // 30 seconds
        type: 'partition',
      },
      duration: 60,
      enabled: false,
      safetyChecks: [
        {
          type: 'health',
          condition: 'database_replica_available',
          action: 'continue',
        },
      ],
    });
  }

  addSLO(slo: SLO): void {
    this.slos.set(slo.id, slo);
    
    // Initialize status
    this.sloStatus.set(slo.id, {
      sloId: slo.id,
      currentValue: 0,
      target: slo.target,
      errorBudgetRemaining: slo.errorBudget,
      errorBudgetUsed: 0,
      status: 'healthy',
      lastUpdated: new Date(),
      trend: 'stable',
    });

    this.logger.info('SLO added', { sloId: slo.id, name: slo.name });
  }

  addExperiment(experiment: ChaosExperiment): void {
    this.experiments.set(experiment.id, experiment);
    
    if (experiment.schedule && experiment.enabled) {
      cron.schedule(experiment.schedule, () => {
        this.runExperiment(experiment.id);
      });
    }

    this.logger.info('Chaos experiment added', { 
      experimentId: experiment.id, 
      name: experiment.name 
    });
  }

  private startMonitoring(): void {
    // Update SLO metrics every minute
    cron.schedule('* * * * *', () => {
      this.updateSLOMetrics();
    });

    // Check error budgets every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.checkErrorBudgets();
    });

    // Generate reports every hour
    cron.schedule('0 * * * *', () => {
      this.generateHourlyReport();
    });
  }

  private async updateSLOMetrics(): Promise<void> {
    for (const [sloId, slo] of this.slos) {
      if (!slo.enabled) continue;

      try {
        // In production, query actual metrics from Prometheus
        const currentValue = await this.querySLI(slo.sli);
        const previousStatus = this.sloStatus.get(sloId)!;
        
        // Calculate error budget usage
        const errorBudgetUsed = Math.max(0, slo.target - currentValue);
        const errorBudgetRemaining = Math.max(0, slo.errorBudget - errorBudgetUsed);
        
        // Determine status
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (errorBudgetRemaining < slo.errorBudget * 0.1) {
          status = 'critical';
        } else if (errorBudgetRemaining < slo.errorBudget * 0.25) {
          status = 'warning';
        }

        // Determine trend
        let trend: 'improving' | 'stable' | 'degrading' = 'stable';
        const valueDiff = currentValue - previousStatus.currentValue;
        if (Math.abs(valueDiff) > 0.1) {
          trend = valueDiff > 0 ? 'improving' : 'degrading';
        }

        const newStatus: SLOStatus = {
          sloId,
          currentValue,
          target: slo.target,
          errorBudgetRemaining,
          errorBudgetUsed,
          status,
          lastUpdated: new Date(),
          trend,
        };

        this.sloStatus.set(sloId, newStatus);

        // Update Prometheus metrics
        this.sloValueGauge.set(
          { slo_id: sloId, service: slo.service, slo_name: slo.name },
          currentValue
        );

        this.errorBudgetGauge.set(
          { slo_id: sloId, service: slo.service, slo_name: slo.name },
          errorBudgetRemaining
        );

        // Check for violations
        if (status !== previousStatus.status && status !== 'healthy') {
          this.sloViolationCounter.inc({
            slo_id: sloId,
            service: slo.service,
            severity: status,
          });

          await this.handleSLOViolation(slo, newStatus);
        }

      } catch (error) {
        this.logger.error('Failed to update SLO metrics', {
          sloId,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  }

  private async querySLI(sli: SLI): Promise<number> {
    // Mock implementation - in production, query Prometheus
    // Return simulated values based on SLI type
    switch (sli.name) {
      case 'delivery_latency_p95':
        return Math.random() * 10; // 0-10 seconds
      case 'api_success_rate':
        return 99.5 + Math.random() * 0.5; // 99.5-100%
      case 'page_load_time_p95':
        return 1.5 + Math.random() * 1.0; // 1.5-2.5 seconds
      case 'search_latency_p95':
        return 0.15 + Math.random() * 0.1; // 150-250ms
      case 'auth_success_rate':
        return 99.9 + Math.random() * 0.1; // 99.9-100%
      default:
        return Math.random() * 100;
    }
  }

  private async checkErrorBudgets(): Promise<void> {
    for (const [sloId, status] of this.sloStatus) {
      const slo = this.slos.get(sloId);
      if (!slo) continue;

      // Check alert conditions
      for (const alert of slo.alerts) {
        if (this.shouldTriggerAlert(alert, status, slo)) {
          await this.sendAlert(alert, slo, status);
        }
      }
    }
  }

  private shouldTriggerAlert(
    alert: any,
    status: SLOStatus,
    slo: SLO
  ): boolean {
    switch (alert.type) {
      case 'burnRate':
        // Calculate burn rate (simplified)
        const burnRate = status.errorBudgetUsed / slo.errorBudget;
        return burnRate > alert.threshold;
        
      case 'errorBudget':
        return status.errorBudgetRemaining < alert.threshold;
        
      case 'absolute':
        return status.currentValue < alert.threshold;
        
      default:
        return false;
    }
  }

  private async sendAlert(alert: any, slo: SLO, status: SLOStatus): Promise<void> {
    const message = `SLO Alert: ${slo.name} - ${alert.severity.toUpperCase()}
Current: ${status.currentValue.toFixed(2)}${slo.sli.unit}
Target: ${slo.target}${slo.sli.unit}
Error Budget Remaining: ${status.errorBudgetRemaining.toFixed(2)}%
Status: ${status.status}`;

    this.logger.warn('SLO alert triggered', {
      sloId: slo.id,
      severity: alert.severity,
      currentValue: status.currentValue,
      target: slo.target,
      errorBudgetRemaining: status.errorBudgetRemaining,
    });

    // In production, send to actual alert channels
    for (const channel of alert.channels) {
      switch (channel) {
        case 'slack':
          // Send Slack notification
          break;
        case 'email':
          // Send email notification
          break;
        case 'pagerduty':
          // Trigger PagerDuty incident
          break;
      }
    }
  }

  private async handleSLOViolation(slo: SLO, status: SLOStatus): Promise<void> {
    this.logger.warn('SLO violation detected', {
      sloId: slo.id,
      name: slo.name,
      currentValue: status.currentValue,
      target: slo.target,
      status: status.status,
    });

    // Auto-disable chaos experiments if SLO is violated
    if (status.status === 'critical') {
      await this.pauseChaosExperiments(slo.service);
    }
  }

  async runExperiment(experimentId: string): Promise<void> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || !experiment.enabled) {
      throw new Error('Experiment not found or disabled');
    }

    // Check safety conditions
    const safetyPassed = await this.checkSafetyConditions(experiment);
    if (!safetyPassed) {
      this.logger.warn('Chaos experiment aborted due to safety checks', {
        experimentId,
      });
      return;
    }

    const startTime = Date.now();
    
    try {
      this.logger.info('Starting chaos experiment', {
        experimentId,
        name: experiment.name,
        duration: experiment.duration,
      });

      // Execute experiment based on type
      await this.executeExperiment(experiment);

      // Wait for duration
      await new Promise(resolve => setTimeout(resolve, experiment.duration * 1000));

      // Stop experiment
      await this.stopExperiment(experiment);

      const duration = (Date.now() - startTime) / 1000;
      
      this.chaosExperimentHistogram.observe(
        {
          experiment_id: experimentId,
          type: experiment.type,
          status: 'completed',
        },
        duration
      );

      this.logger.info('Chaos experiment completed', {
        experimentId,
        duration,
      });

    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      
      this.chaosExperimentHistogram.observe(
        {
          experiment_id: experimentId,
          type: experiment.type,
          status: 'failed',
        },
        duration
      );

      this.logger.error('Chaos experiment failed', {
        experimentId,
        error: error instanceof Error ? error.message : error,
        duration,
      });
      
      throw error;
    }
  }

  private async checkSafetyConditions(experiment: ChaosExperiment): Promise<boolean> {
    for (const check of experiment.safetyChecks) {
      const passed = await this.evaluateSafetyCheck(check);
      if (!passed && check.action === 'abort') {
        return false;
      }
    }
    return true;
  }

  private async evaluateSafetyCheck(check: any): Promise<boolean> {
    switch (check.type) {
      case 'slo':
        // Parse condition like "api-availability > 99.0"
        const [sloId, operator, threshold] = check.condition.split(' ');
        const status = this.sloStatus.get(sloId.trim());
        if (!status) return false;
        
        const value = status.currentValue;
        const thresholdValue = parseFloat(threshold);
        
        switch (operator.trim()) {
          case '>': return value > thresholdValue;
          case '<': return value < thresholdValue;
          case '>=': return value >= thresholdValue;
          case '<=': return value <= thresholdValue;
          default: return false;
        }
        
      case 'metric':
        // In production, query actual metrics
        return true;
        
      case 'health':
        // In production, check health endpoints
        return true;
        
      default:
        return false;
    }
  }

  private async executeExperiment(experiment: ChaosExperiment): Promise<void> {
    // Mock implementation - in production, integrate with chaos engineering tools
    switch (experiment.type) {
      case 'latency':
        this.logger.info('Injecting latency', {
          service: experiment.target.service,
          delay: experiment.parameters.delay,
          percentage: experiment.target.percentage,
        });
        break;
        
      case 'error':
        this.logger.info('Injecting errors', {
          service: experiment.target.service,
          errorRate: experiment.parameters.errorRate,
          percentage: experiment.target.percentage,
        });
        break;
        
      case 'network':
        this.logger.info('Creating network partition', {
          service: experiment.target.service,
          component: experiment.target.component,
        });
        break;
        
      case 'resource':
        this.logger.info('Limiting resources', {
          service: experiment.target.service,
          parameters: experiment.parameters,
        });
        break;
        
      case 'dependency':
        this.logger.info('Disrupting dependency', {
          service: experiment.target.service,
          component: experiment.target.component,
        });
        break;
    }
  }

  private async stopExperiment(experiment: ChaosExperiment): Promise<void> {
    this.logger.info('Stopping chaos experiment', {
      experimentId: experiment.id,
      type: experiment.type,
    });
  }

  private async pauseChaosExperiments(service: string): Promise<void> {
    for (const [id, experiment] of this.experiments) {
      if (experiment.target.service === service && experiment.enabled) {
        experiment.enabled = false;
        this.logger.info('Paused chaos experiment due to SLO violation', {
          experimentId: id,
          service,
        });
      }
    }
  }

  private generateHourlyReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      slos: Array.from(this.sloStatus.values()),
      summary: {
        healthy: 0,
        warning: 0,
        critical: 0,
      },
    };

    for (const status of this.sloStatus.values()) {
      report.summary[status.status]++;
    }

    this.logger.info('Hourly SLO report', report);
  }

  getSLOStatus(sloId?: string): SLOStatus | SLOStatus[] {
    if (sloId) {
      const status = this.sloStatus.get(sloId);
      if (!status) throw new Error('SLO not found');
      return status;
    }
    return Array.from(this.sloStatus.values());
  }

  getSLOs(): SLO[] {
    return Array.from(this.slos.values());
  }

  getExperiments(): ChaosExperiment[] {
    return Array.from(this.experiments.values());
  }

  async generateReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    period: { start: Date; end: Date };
    sloSummary: Record<string, {
      availability: number;
      errorBudgetUsed: number;
      violations: number;
    }>;
    chaosExperiments: {
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
    };
    recommendations: string[];
  }> {
    // In production, query historical data
    return {
      period: { start: startDate, end: endDate },
      sloSummary: {
        'api-availability': {
          availability: 99.95,
          errorBudgetUsed: 0.05,
          violations: 0,
        },
        'email-delivery-latency': {
          availability: 98.8,
          errorBudgetUsed: 1.2,
          violations: 2,
        },
      },
      chaosExperiments: {
        total: 12,
        successful: 10,
        failed: 2,
        avgDuration: 285,
      },
      recommendations: [
        'Consider tightening SLO for email delivery latency',
        'Increase chaos experiment frequency for better resilience',
        'Review error budget allocation for API availability',
      ],
    };
  }
}
