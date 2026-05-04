import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUserReports } from '../api/client';
import ScoreGauge from '../components/ScoreGauge';
import { DashboardSkeleton } from '../components/LoadingSkeleton';
import { ErrorMessage } from '../components/ErrorBoundary';

const DashboardPage = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        // Use userDetails (email) for consistent user identification
        const userEmail = user?.userDetails || user?.userId || 'demo-user';
        const response = await getUserReports(userEmail);
        setReports(response.data.reports || []);
      } catch (err) {
        setError('Failed to load reports');
        console.error(err);
      }
      setLoading(false);
    };
    fetchReports();
  }, [user]);

  // Calculate aggregate stats
  const latestReport = reports[0];
  const avgScore = reports.length
    ? Math.round(reports.reduce((sum, r) => sum + r.overall_score, 0) / reports.length)
    : 0;

  // Show skeleton while loading
  if (loading) {
    return <DashboardSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-clearance-text">Dashboard</h1>
          <p className="text-clearance-text-muted">Overview of your compliance assessments</p>
        </div>
        <ErrorMessage
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-clearance-text flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-clearance-teal to-clearance-cyan flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </span>
            Dashboard
          </h1>
          <p className="text-clearance-text-muted mt-1">
            Overview of your compliance assessments
          </p>
        </div>
        <Link to="/upload" className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Assessment
        </Link>
      </div>

      {/* How it works card (for first-time users) */}
      {reports.length === 0 && !loading && (
        <div className="card-static bg-gradient-to-br from-clearance-bg-secondary via-clearance-bg-secondary to-clearance-pass/5 border-clearance-pass/30">
          <h2 className="text-xl font-semibold text-clearance-text mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-clearance-pass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works
          </h2>
          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-4 left-[2.5rem] right-[2.5rem] h-0.5 bg-gradient-to-r from-clearance-pass/50 via-clearance-cyan/50 to-clearance-pass/50" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger-children">
              {[
                { num: 1, title: 'Upload', desc: 'Upload your security documentation', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
                { num: 2, title: 'Analyse', desc: 'AI analyses against DISP requirements', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                { num: 3, title: 'Review', desc: 'Receive gap report in minutes', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { num: 4, title: 'Remediate', desc: 'Track progress with Kanban board', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              ].map((step) => (
                <div key={step.num} className="relative flex flex-col items-center text-center group">
                  <div className="w-8 h-8 bg-gradient-to-br from-clearance-pass to-clearance-teal rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-clearance-pass/25 group-hover:scale-110 transition-transform z-10">
                    <span className="text-white font-bold text-sm">{step.num}</span>
                  </div>
                  <div className="mt-3">
                    <h3 className="text-clearance-text font-medium">{step.title}</h3>
                    <p className="text-clearance-text-muted text-sm mt-1">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              Start Your First Assessment
            </Link>
          </div>
        </div>
      )}

      {/* Stats grid */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger-children">
          {/* Overall Score */}
          <div className="card-interactive flex flex-col items-center group">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-clearance-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <h3 className="text-clearance-text-muted text-sm">Latest Score</h3>
            </div>
            <div className="group-hover:scale-105 transition-transform">
              <ScoreGauge score={latestReport?.overall_score || 0} />
            </div>
            <p className="text-clearance-text mt-3 font-medium">
              {latestReport?.company_name || 'No assessments'}
            </p>
          </div>

          {/* Assessment Count */}
          <div className="card-interactive group">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-clearance-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-clearance-text-muted text-sm">Total Assessments</h3>
            </div>
            <p className="text-5xl font-bold bg-gradient-to-r from-clearance-text to-clearance-text-muted bg-clip-text text-transparent group-hover:from-clearance-cyan group-hover:to-clearance-teal transition-all">
              {reports.length}
            </p>
            <div className="flex items-center gap-2 mt-3 text-clearance-text-muted text-sm">
              <span className="w-2 h-2 rounded-full bg-clearance-pass" />
              Average score: {avgScore}%
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card-static">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-4 h-4 text-clearance-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-clearance-text-muted text-sm">Quick Actions</h3>
            </div>
            <div className="space-y-2">
              <Link
                to="/upload"
                className="flex items-center justify-center gap-2 w-full btn-secondary text-sm group"
              >
                <svg className="w-4 h-4 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Assessment
              </Link>
              <Link
                to="/tracker"
                className="flex items-center justify-center gap-2 w-full btn-secondary text-sm group"
              >
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                View Remediation Tracker
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Recent Assessments */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-clearance-text flex items-center gap-2">
            <svg className="w-5 h-5 text-clearance-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recent Assessments
          </h2>
          {reports.length > 0 && (
            <span className="text-xs text-clearance-text-muted bg-clearance-bg px-2 py-1 rounded">
              {reports.length} total
            </span>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-clearance-bg flex items-center justify-center">
              <svg className="w-8 h-8 text-clearance-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-clearance-text-muted mb-4">
              No assessments yet. Start your first assessment above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-clearance-border">
                  <th className="text-left py-3 px-4 text-clearance-text-muted font-medium text-sm">
                    Company
                  </th>
                  <th className="text-left py-3 px-4 text-clearance-text-muted font-medium text-sm">
                    Framework
                  </th>
                  <th className="text-left py-3 px-4 text-clearance-text-muted font-medium text-sm">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-clearance-text-muted font-medium text-sm">
                    Score
                  </th>
                  <th className="text-left py-3 px-4 text-clearance-text-muted font-medium text-sm">
                    Status
                  </th>
                  <th className="text-right py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report, index) => (
                  <tr
                    key={report.report_id}
                    className="border-b border-clearance-border table-row-hover group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-clearance-bg flex items-center justify-center">
                          <span className="text-clearance-text-muted text-xs font-medium">
                            {report.company_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-clearance-text font-medium">{report.company_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-clearance-text-muted text-sm px-2 py-1 bg-clearance-bg rounded">
                        {report.framework}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-clearance-text-muted text-sm">
                      {new Date(report.assessment_date).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          report.overall_score >= 70
                            ? 'bg-clearance-pass'
                            : report.overall_score >= 40
                            ? 'bg-clearance-partial'
                            : 'bg-clearance-fail'
                        }`} />
                        <span
                          className={`font-mono font-bold ${
                            report.overall_score >= 70
                              ? 'text-clearance-pass'
                              : report.overall_score >= 40
                              ? 'text-clearance-partial'
                              : 'text-clearance-fail'
                          }`}
                        >
                          {report.overall_score}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="badge-pass">{report.status}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <Link
                        to={`/report/${report.report_id}`}
                        className="inline-flex items-center gap-1 text-clearance-pass hover:text-clearance-cyan text-sm font-medium transition-colors group-hover:gap-2"
                      >
                        View Report
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
