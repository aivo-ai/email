import { parseStringPromise } from 'xml2js';
import { gunzipSync } from 'zlib';

export interface DMARCReport {
  reportId: string;
  orgName: string;
  email: string;
  reportingDate: {
    begin: number;
    end: number;
  };
  domain: string;
  records: DMARCRecord[];
}

export interface DMARCRecord {
  sourceIp: string;
  count: number;
  disposition: 'none' | 'quarantine' | 'reject';
  dkim: 'pass' | 'fail';
  spf: 'pass' | 'fail';
  headerFrom: string;
  envelopeFrom?: string;
}

export async function parseDMARCReport(data: Buffer): Promise<DMARCReport> {
  try {
    // Handle gzipped reports
    let xmlData: string;
    try {
      xmlData = gunzipSync(data).toString('utf-8');
    } catch {
      xmlData = data.toString('utf-8');
    }

    const parsed = await parseStringPromise(xmlData);
    const feedback = parsed.feedback;

    return {
      reportId: feedback.report_metadata[0].report_id[0],
      orgName: feedback.report_metadata[0].org_name[0],
      email: feedback.report_metadata[0].email[0],
      reportingDate: {
        begin: parseInt(feedback.report_metadata[0].date_range[0].begin[0]),
        end: parseInt(feedback.report_metadata[0].date_range[0].end[0]),
      },
      domain: feedback.policy_published[0].domain[0],
      records: feedback.record?.map((record: any) => ({
        sourceIp: record.row[0].source_ip[0],
        count: parseInt(record.row[0].count[0]),
        disposition: record.row[0].policy_evaluated[0].disposition[0],
        dkim: record.row[0].policy_evaluated[0].dkim[0],
        spf: record.row[0].policy_evaluated[0].spf[0],
        headerFrom: record.identifiers[0].header_from[0],
        envelopeFrom: record.identifiers[0].envelope_from?.[0],
      })) || [],
    };
  } catch (error) {
    throw new Error(`Failed to parse DMARC report: ${error}`);
  }
}

export async function parseDMARCFailureReport(data: Buffer): Promise<any> {
  // Parse DMARC failure reports (RUF format)
  // This is typically in AFRF (Authentication Failure Reporting Format)
  const content = data.toString('utf-8');
  
  // Extract authentication results and failure details
  const authResults = content.match(/Authentication-Results: (.+)/)?.[1];
  const originalMessage = content.split('\n\n').slice(1).join('\n\n');
  
  return {
    authResults,
    originalMessage,
    failureType: 'dmarc',
    timestamp: new Date(),
  };
}
