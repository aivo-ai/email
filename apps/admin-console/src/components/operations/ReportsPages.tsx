import { useState, useEffect } from 'react';

interface DMARCReportSummary {
  id: string;
  orgName: string;
  domain: string;
  reportDate: string;
  totalMessages: number;
  passRate: number;
  failureCount: number;
}

interface TLSRPTSummary {
  id: string;
  organizationName: string;
  domain: string;
  reportDate: string;
  successfulSessions: number;
  failedSessions: number;
  failureRate: number;
}

export function DMARCReportsPage() {
  const [reports, setReports] = useState<DMARCReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');

  useEffect(() => {
    fetchDMARCReports();
  }, [selectedTimeRange]);

  const fetchDMARCReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operations/dmarc/reports?range=${selectedTimeRange}`);
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error('Failed to fetch DMARC reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">DMARC Reports</h1>
        <p className="text-gray-600">Monitor DMARC authentication results and failures</p>
      </div>

      <div className="mb-4">
        <select 
          value={selectedTimeRange} 
          onChange={(e) => setSelectedTimeRange(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="1d">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {report.orgName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Domain: {report.domain}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <p className="text-sm text-gray-900">
                        {report.totalMessages} messages
                      </p>
                      <p className={`text-sm ${report.passRate >= 95 ? 'text-green-600' : report.passRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {report.passRate.toFixed(1)}% pass rate
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Report Date: {report.reportDate}</span>
                      {report.failureCount > 0 && (
                        <span className="text-red-600">
                          {report.failureCount} failures
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TLSRPTReportsPage() {
  const [reports, setReports] = useState<TLSRPTSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTLSRPTReports();
  }, []);

  const fetchTLSRPTReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operations/tls-rpt/reports');
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error('Failed to fetch TLS-RPT reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">TLS-RPT Reports</h1>
        <p className="text-gray-600">Monitor TLS connection failures and security issues</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">
                      {report.organizationName}
                    </h3>
                    <p className="text-sm text-gray-500">Domain: {report.domain}</p>
                  </div>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    report.failureRate < 5 ? 'bg-green-100' : report.failureRate < 15 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <span className={`text-sm font-medium ${
                      report.failureRate < 5 ? 'text-green-800' : report.failureRate < 15 ? 'text-yellow-800' : 'text-red-800'
                    }`}>
                      !
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Successful Sessions</p>
                      <p className="text-lg font-semibold text-green-600">
                        {report.successfulSessions.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Failed Sessions</p>
                      <p className="text-lg font-semibold text-red-600">
                        {report.failedSessions.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-gray-500">Failure Rate</p>
                    <p className={`text-lg font-semibold ${
                      report.failureRate < 5 ? 'text-green-600' : report.failureRate < 15 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {report.failureRate.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
