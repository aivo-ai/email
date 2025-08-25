export interface TLSRPTReport {
  organizationName: string;
  dateRange: {
    startDatetime: string;
    endDatetime: string;
  };
  contactInfo: string;
  reportId: string;
  policies: TLSRPTPolicy[];
}

export interface TLSRPTPolicy {
  domain: string;
  mxHost: string[];
  totalSuccessfulSessionCount: number;
  totalFailureSessionCount: number;
  failureDetails: TLSRPTFailure[];
}

export interface TLSRPTFailure {
  resultType: string;
  sendingMtaIp: string;
  receivingMxHostname: string;
  receivingMxHelo: string;
  receivingIp: string;
  failedSessionCount: number;
  additionalInformation: string;
  failureReasonCode: string;
}

export async function parseTLSRPTReport(data: Buffer): Promise<TLSRPTReport> {
  try {
    const jsonData = JSON.parse(data.toString('utf-8'));
    
    return {
      organizationName: jsonData['organization-name'],
      dateRange: {
        startDatetime: jsonData['date-range']['start-datetime'],
        endDatetime: jsonData['date-range']['end-datetime'],
      },
      contactInfo: jsonData['contact-info'],
      reportId: jsonData['report-id'],
      policies: jsonData.policies?.map((policy: any) => ({
        domain: policy.policy.domain,
        mxHost: policy.policy['mx-host'],
        totalSuccessfulSessionCount: policy.summary['total-successful-session-count'],
        totalFailureSessionCount: policy.summary['total-failure-session-count'],
        failureDetails: policy['failure-details']?.map((failure: any) => ({
          resultType: failure['result-type'],
          sendingMtaIp: failure['sending-mta-ip'],
          receivingMxHostname: failure['receiving-mx-hostname'],
          receivingMxHelo: failure['receiving-mx-helo'],
          receivingIp: failure['receiving-ip'],
          failedSessionCount: failure['failed-session-count'],
          additionalInformation: failure['additional-information'],
          failureReasonCode: failure['failure-reason-code'],
        })) || [],
      })) || [],
    };
  } catch (error) {
    throw new Error(`Failed to parse TLS-RPT report: ${error}`);
  }
}

export async function parseMTASTSReport(data: Buffer): Promise<any> {
  // Parse MTA-STS reports (similar to TLS-RPT but for MTA-STS policy violations)
  try {
    const jsonData = JSON.parse(data.toString('utf-8'));
    
    return {
      version: jsonData.version,
      mode: jsonData.mode,
      mx: jsonData.mx,
      maxAge: jsonData.max_age,
      policyDomain: jsonData.policy_domain,
      violations: jsonData.violations || [],
    };
  } catch (error) {
    throw new Error(`Failed to parse MTA-STS report: ${error}`);
  }
}
