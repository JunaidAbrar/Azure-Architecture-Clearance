import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport, updateGapStatus, submitSurvey, getAccessStatus, requestPilotAccess } from '../api/client';
import ScoreGauge from '../components/ScoreGauge';
import { generatePDF } from '../utils/generatePDF';
import { ReportSkeleton } from '../components/LoadingSkeleton';
import { ErrorMessage } from '../components/ErrorBoundary';
import FeedbackSurvey, { PilotSignupModal } from '../components/FeedbackSurvey';

const ReportPage = ({ user }) => {
  const { reportId } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedFindings, setExpandedFindings] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Survey and pilot signup state
  const [showSurvey, setShowSurvey] = useState(false);
  const [showPilotSignup, setShowPilotSignup] = useState(false);
  const [accessInfo, setAccessInfo] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await getReport(reportId);
        setReport(response.data);
        // Set first domain as active tab
        if (response.data.domain_summary?.length > 0) {
          setActiveTab(response.data.domain_summary[0].domain);
        }

        // Check if we should show survey or pilot signup
        const userEmail = user?.userDetails || user?.userId || 'demo-user';
        try {
          const accessResponse = await getAccessStatus(userEmail);
          setAccessInfo(accessResponse.data);

          // Check localStorage to see if user has already completed survey for this report
          const surveyKey = `survey_completed_${reportId}`;
          const surveyCompleted = localStorage.getItem(surveyKey);

          // Show survey after first scan (if not completed)
          if (!surveyCompleted && accessResponse.data.scans_used === 1) {
            // Delay survey popup to let user see the report first
            setTimeout(() => setShowSurvey(true), 3000);
          }

          // Show pilot signup if they've hit the limit
          if (accessResponse.data.scans_remaining === 0 && accessResponse.data.pilot_status !== 'pilot_active') {
            const pilotKey = `pilot_dismissed_${accessResponse.data.domain}`;
            if (!localStorage.getItem(pilotKey)) {
              setTimeout(() => setShowPilotSignup(true), 2000);
            }
          }
        } catch (accessErr) {
          console.log('Access status check skipped:', accessErr);
        }
      } catch (err) {
        setError('Failed to load report');
        console.error(err);
      }
      setLoading(false);
    };
    fetchReport();
  }, [reportId, user]);

  const toggleFinding = (findingId) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [findingId]: !prev[findingId],
    }));
  };

  const handleMarkResolved = async (gapId) => {
    try {
      await updateGapStatus(reportId, gapId, 'resolved');
      // Update local state
      setReport((prev) => ({
        ...prev,
        findings: prev.findings.map((f) =>
          f.requirement_id === gapId ? { ...f, status: 'resolved' } : f
        ),
      }));
    } catch (err) {
      console.error('Failed to update gap status:', err);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;

    setGeneratingPDF(true);
    try {
      await generatePDF(report);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    }
    setGeneratingPDF(false);
  };

  const handleSurveySubmit = async (responses) => {
    const userEmail = user?.userDetails || user?.userId || 'demo-user';
    await submitSurvey({
      report_id: reportId,
      user_email: userEmail,
      ...responses,
    });
    // Mark survey as completed in localStorage
    localStorage.setItem(`survey_completed_${reportId}`, 'true');
  };

  const handlePilotDismiss = () => {
    setShowPilotSignup(false);
    // Remember they dismissed it
    if (accessInfo?.domain) {
      localStorage.setItem(`pilot_dismissed_${accessInfo.domain}`, 'true');
    }
  };

  if (loading) {
    return <ReportSkeleton />;
  }

  if (error || !report) {
    return (
      <div className="space-y-6">
        <ErrorMessage
          message={error || 'Report not found'}
          onRetry={() => window.location.reload()}
        />
        <Link to="/dashboard" className="btn-secondary mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pass':
        return <span className="badge-pass">Pass</span>;
      case 'partial':
        return <span className="badge-partial">Partial</span>;
      case 'fail':
        return <span className="badge-fail">Fail</span>;
      case 'resolved':
        return <span className="badge-pass">Resolved</span>;
      default:
        return <span className="badge-medium">{status}</span>;
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'high':
        return <span className="badge-high">High</span>;
      case 'medium':
        return <span className="badge-medium">Medium</span>;
      case 'low':
        return <span className="badge-low">Low</span>;
      default:
        return null;
    }
  };

  // v2.0 Confidence tier badge
  const getConfidenceBadge = (tier, confidence) => {
    const configs = {
      high: { bg: 'bg-clearance-pass/20', text: 'text-clearance-pass', label: 'High Confidence' },
      moderate: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Moderate' },
      low: { bg: 'bg-clearance-partial/20', text: 'text-clearance-partial', label: 'Low Confidence' },
      review: { bg: 'bg-clearance-fail/20', text: 'text-clearance-fail', label: 'Needs Review' },
    };
    const config = configs[tier] || configs.review;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {tier === 'review' && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {config.label} ({Math.round(confidence * 100)}%)
      </span>
    );
  };

  // v2.0 Validation indicator
  const getValidationIndicator = (finding) => {
    if (!finding.evidence_validated && finding.evidence_quote) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-clearance-partial/20 text-clearance-partial">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Quote Unverified
        </span>
      );
    }
    if (finding.evidence_validated) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-clearance-pass/20 text-clearance-pass">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Verified
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-clearance-text">
            {report.company_name}
          </h1>
          <p className="text-clearance-text-muted">
            {report.framework} Assessment •{' '}
            {new Date(report.assessment_date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPDF ? 'Generating...' : 'Download PDF'}
          </button>
          <Link to="/tracker" className="btn-primary">
            Remediation Tracker
          </Link>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Score */}
        <div className="card flex flex-col items-center">
          <h3 className="text-clearance-text-muted text-sm mb-4">
            Overall Compliance Score
          </h3>
          <ScoreGauge score={report.overall_score} size={140} />
        </div>

        {/* Domain Breakdown */}
        <div className="card col-span-2">
          <h3 className="text-clearance-text-muted text-sm mb-4">
            Domain Risk Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-clearance-border">
                  <th className="text-left py-2 text-clearance-text-muted text-sm font-medium">
                    Domain
                  </th>
                  <th className="text-center py-2 text-clearance-pass text-sm font-medium">
                    Pass
                  </th>
                  <th className="text-center py-2 text-clearance-partial text-sm font-medium">
                    Partial
                  </th>
                  <th className="text-center py-2 text-clearance-fail text-sm font-medium">
                    Fail
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.domain_summary.map((domain) => (
                  <tr
                    key={domain.domain}
                    className="border-b border-clearance-border"
                  >
                    <td className="py-2 text-clearance-text">{domain.domain}</td>
                    <td className="py-2 text-center font-mono text-clearance-pass">
                      {domain.passed}
                    </td>
                    <td className="py-2 text-center font-mono text-clearance-partial">
                      {domain.partial}
                    </td>
                    <td className="py-2 text-center font-mono text-clearance-fail">
                      {domain.fail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* v2.0 Confidence & Delta Summary */}
      {(report.confidence_summary || report.assessment_delta) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Confidence Summary */}
          {report.confidence_summary && (
            <div className="card">
              <h3 className="text-clearance-text-muted text-sm mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Assessment Confidence
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-clearance-text text-sm">Average Confidence</span>
                  <span className="font-mono text-clearance-text font-semibold">
                    {Math.round(report.confidence_summary.average_confidence * 100)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-clearance-text text-sm">Evidence Validation Rate</span>
                  <span className="font-mono text-clearance-pass font-semibold">
                    {report.confidence_summary.evidence_validation_rate}%
                  </span>
                </div>
                <div className="border-t border-clearance-border pt-3 mt-3">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <div className="text-xl font-bold text-clearance-pass">{report.confidence_summary.high_confidence}</div>
                      <div className="text-xs text-clearance-text-muted">High</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-blue-400">{report.confidence_summary.moderate_confidence}</div>
                      <div className="text-xs text-clearance-text-muted">Moderate</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-clearance-partial">{report.confidence_summary.low_confidence}</div>
                      <div className="text-xs text-clearance-text-muted">Low</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-clearance-fail">{report.confidence_summary.needs_review}</div>
                      <div className="text-xs text-clearance-text-muted">Review</div>
                    </div>
                  </div>
                </div>
                {report.findings_needing_review > 0 && (
                  <div className="mt-3 p-2 bg-clearance-fail/10 rounded-lg border border-clearance-fail/20">
                    <p className="text-clearance-fail text-xs flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {report.findings_needing_review} findings require manual review
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assessment Delta */}
          {report.assessment_delta && (
            <div className="card">
              <h3 className="text-clearance-text-muted text-sm mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Progress Since Last Assessment
              </h3>
              {report.assessment_delta.trend === 'first_assessment' ? (
                <div className="text-center py-4">
                  <p className="text-clearance-text-muted">First assessment for this company</p>
                  <p className="text-xs text-clearance-text-muted mt-1">Future assessments will show progress comparison</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-clearance-text text-sm">Score Change</span>
                    <span className={`font-mono font-bold ${
                      report.assessment_delta.score_change > 0 ? 'text-clearance-pass' :
                      report.assessment_delta.score_change < 0 ? 'text-clearance-fail' : 'text-clearance-text-muted'
                    }`}>
                      {report.assessment_delta.score_change > 0 ? '+' : ''}{report.assessment_delta.score_change}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-clearance-text text-sm">Gaps Closed</span>
                    <span className="font-mono text-clearance-pass font-semibold">{report.assessment_delta.gaps_closed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-clearance-text text-sm">New Gaps</span>
                    <span className={`font-mono font-semibold ${report.assessment_delta.new_gaps > 0 ? 'text-clearance-fail' : 'text-clearance-text-muted'}`}>
                      {report.assessment_delta.new_gaps}
                    </span>
                  </div>
                  <div className="border-t border-clearance-border pt-3 mt-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      report.assessment_delta.trend === 'improving' ? 'bg-clearance-pass/20 text-clearance-pass' :
                      report.assessment_delta.trend === 'declining' ? 'bg-clearance-fail/20 text-clearance-fail' :
                      'bg-clearance-border text-clearance-text-muted'
                    }`}>
                      {report.assessment_delta.trend === 'improving' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                      {report.assessment_delta.trend === 'declining' && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      )}
                      Trend: {report.assessment_delta.trend.charAt(0).toUpperCase() + report.assessment_delta.trend.slice(1)}
                    </div>
                    {report.assessment_delta.previous_date && (
                      <p className="text-xs text-clearance-text-muted mt-2">
                        vs {new Date(report.assessment_delta.previous_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Executive Summary */}
      {report.executive_summary && (
        <div className="card">
          <h2 className="text-lg font-semibold text-clearance-text mb-4">
            Executive Summary
          </h2>
          <p className="text-clearance-text-muted whitespace-pre-line">
            {report.executive_summary}
          </p>
          {/* v2.0 Disclaimer */}
          {report.disclaimer && (
            <div className="mt-4 p-3 bg-clearance-bg rounded-lg border border-clearance-border">
              <p className="text-xs text-clearance-text-muted flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {report.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Findings */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-clearance-text">
            Detailed Findings
          </h2>
        </div>

        {/* Progress Summary Bar */}
        {(() => {
          const passCount = report.findings.filter(f => f.status === 'pass').length;
          const partialCount = report.findings.filter(f => f.status === 'partial').length;
          const failCount = report.findings.filter(f => f.status === 'fail').length;
          const resolvedCount = report.findings.filter(f => f.status === 'resolved').length;
          const totalCount = report.findings.length;
          const gapsRemaining = partialCount + failCount;

          return (
            <div className="bg-clearance-bg rounded-lg p-4 mb-6">
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-clearance-pass"></div>
                  <span className="text-clearance-text">{passCount} passing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-clearance-partial"></div>
                  <span className="text-clearance-text">{partialCount} partial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-clearance-fail"></div>
                  <span className="text-clearance-text">{failCount} failing</span>
                </div>
                {resolvedCount > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-clearance-text">{resolvedCount} resolved</span>
                  </div>
                )}
                <div className="ml-auto text-clearance-text-muted">
                  {gapsRemaining > 0 ? `${gapsRemaining} gaps to address` : 'All requirements met!'}
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-clearance-border rounded-full overflow-hidden flex">
                <div
                  className="bg-clearance-pass transition-all duration-300"
                  style={{ width: `${(passCount / totalCount) * 100}%` }}
                ></div>
                <div
                  className="bg-blue-500 transition-all duration-300"
                  style={{ width: `${(resolvedCount / totalCount) * 100}%` }}
                ></div>
                <div
                  className="bg-clearance-partial transition-all duration-300"
                  style={{ width: `${(partialCount / totalCount) * 100}%` }}
                ></div>
                <div
                  className="bg-clearance-fail transition-all duration-300"
                  style={{ width: `${(failCount / totalCount) * 100}%` }}
                ></div>
              </div>
            </div>
          );
        })()}

        {/* Domain tabs with status indicators */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab(null)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !activeTab
                ? 'bg-clearance-pass text-white'
                : 'bg-clearance-bg text-clearance-text-muted hover:text-clearance-text hover:bg-clearance-bg-secondary'
            }`}
          >
            <span>All</span>
            <span className="ml-2 opacity-75">({report.findings.length})</span>
          </button>
          {report.domain_summary.map((domain) => (
            <button
              key={domain.domain}
              onClick={() => setActiveTab(domain.domain)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === domain.domain
                  ? 'bg-clearance-pass text-white'
                  : 'bg-clearance-bg text-clearance-text-muted hover:text-clearance-text hover:bg-clearance-bg-secondary'
              }`}
            >
              <span>{domain.domain}</span>
              {/* Status dots */}
              <span className="flex items-center gap-0.5 ml-1">
                {domain.passed > 0 && <span className="w-2 h-2 rounded-full bg-clearance-pass" title={`${domain.passed} pass`}></span>}
                {domain.partial > 0 && <span className="w-2 h-2 rounded-full bg-clearance-partial" title={`${domain.partial} partial`}></span>}
                {domain.fail > 0 && <span className="w-2 h-2 rounded-full bg-clearance-fail" title={`${domain.fail} fail`}></span>}
              </span>
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-clearance-border">
          <span className="text-clearance-text-muted text-sm mr-2">Filter:</span>
          {[
            { key: 'all', label: 'All', icon: null },
            { key: 'pass', label: 'Pass', icon: '✓', color: 'text-clearance-pass' },
            { key: 'partial', label: 'Partial', icon: '◐', color: 'text-clearance-partial' },
            { key: 'fail', label: 'Fail', icon: '✗', color: 'text-clearance-fail' },
            { key: 'resolved', label: 'Resolved', icon: '✓', color: 'text-blue-500' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                statusFilter === filter.key
                  ? 'bg-clearance-bg-secondary text-clearance-text'
                  : 'text-clearance-text-muted hover:text-clearance-text'
              }`}
            >
              {filter.icon && <span className={`mr-1 ${filter.color}`}>{filter.icon}</span>}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Findings list */}
        <div className="space-y-3">
          {report.findings
            .filter((f) => {
              // Domain filter
              if (activeTab) {
                const domainMatch = f.domain === activeTab ||
                  (f.requirement_id && f.requirement_id.toLowerCase().includes(activeTab.toLowerCase().slice(0, 2)));
                if (!domainMatch) return false;
              }
              // Status filter
              if (statusFilter !== 'all' && f.status !== statusFilter) return false;
              return true;
            })
            .sort((a, b) => {
              // Sort by status priority (fail > partial > pass > resolved), then by priority_score
              const statusOrder = { fail: 0, partial: 1, pass: 2, resolved: 3 };
              const statusDiff = (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
              if (statusDiff !== 0) return statusDiff;
              return (b.priority_score || 0) - (a.priority_score || 0);
            })
            .map((finding) => {
              const borderColor = {
                pass: 'border-l-clearance-pass',
                partial: 'border-l-clearance-partial',
                fail: 'border-l-clearance-fail',
                resolved: 'border-l-blue-500',
              }[finding.status] || 'border-l-clearance-border';

              const maxPriority = 100;
              const priorityPercent = Math.min(((finding.priority_score || 0) / maxPriority) * 100, 100);
              const priorityColor = finding.priority_score >= 70 ? 'bg-clearance-fail' :
                                   finding.priority_score >= 40 ? 'bg-clearance-partial' : 'bg-clearance-pass';

              return (
                <div
                  key={finding.requirement_id}
                  className={`border border-clearance-border border-l-4 ${borderColor} rounded-lg overflow-hidden bg-clearance-bg-secondary/30 hover:bg-clearance-bg-secondary/50 transition-colors`}
                >
                  {/* Finding header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleFinding(finding.requirement_id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* ID and badges row */}
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span className="font-mono text-clearance-pass text-sm font-semibold">
                            {finding.requirement_id}
                          </span>
                          {getStatusBadge(finding.status)}
                          {finding.status !== 'pass' && finding.status !== 'resolved' && getRiskBadge(finding.risk_rating)}
                          {/* v2.0 Confidence tier badge */}
                          {finding.confidence_tier && getConfidenceBadge(finding.confidence_tier, finding.confidence)}
                          {/* v2.0 Validation indicator */}
                          {getValidationIndicator(finding)}
                          {/* v2.0 Cross-reference indicator */}
                          {finding.cross_references?.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400" title={`Related: ${finding.cross_references.join(', ')}`}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              {finding.cross_references.length} related
                            </span>
                          )}
                        </div>
                        {/* Requirement text */}
                        {finding.requirement_text && (
                          <p className="text-clearance-text text-sm leading-relaxed line-clamp-2">
                            {finding.requirement_text}
                          </p>
                        )}
                        {!finding.requirement_text && finding.gap_description && (
                          <p className="text-clearance-text-muted text-sm leading-relaxed line-clamp-2">
                            {finding.gap_description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {/* Priority indicator */}
                        {finding.priority_score !== undefined && finding.status !== 'pass' && finding.status !== 'resolved' && (
                          <div className="hidden sm:flex flex-col items-end gap-1">
                            <span className="text-clearance-text-muted text-xs">Priority</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-clearance-border rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${priorityColor} transition-all duration-300`}
                                  style={{ width: `${priorityPercent}%` }}
                                ></div>
                              </div>
                              <span className="text-clearance-text text-xs font-mono w-6">{finding.priority_score}</span>
                            </div>
                          </div>
                        )}
                        {/* Expand icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          expandedFindings[finding.requirement_id]
                            ? 'bg-clearance-pass/20 text-clearance-pass rotate-180'
                            : 'bg-clearance-bg text-clearance-text-muted'
                        }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finding details - expanded */}
                  {expandedFindings[finding.requirement_id] && (
                    <div className="px-4 pb-4 border-t border-clearance-border pt-4 space-y-4">
                      {/* Requirement text if not shown above */}
                      {finding.requirement_text && (
                        <div className="bg-clearance-bg rounded-lg p-3">
                          <h4 className="text-clearance-text-muted text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Requirement
                          </h4>
                          <p className="text-clearance-text text-sm">{finding.requirement_text}</p>
                        </div>
                      )}

                      {/* v2.0 Structured Gap Analysis */}
                      {finding.gap_description && (
                        <div className="space-y-3">
                          <h4 className="text-clearance-text-muted text-xs font-medium uppercase tracking-wide flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Gap Analysis
                          </h4>

                          {/* Completion percentage bar */}
                          {finding.completion_percentage !== undefined && finding.status !== 'pass' && (
                            <div className="bg-clearance-bg rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-clearance-text-muted text-xs">Compliance Progress</span>
                                <span className="font-mono text-sm text-clearance-text">{finding.completion_percentage}%</span>
                              </div>
                              <div className="h-2 bg-clearance-border rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    finding.completion_percentage >= 70 ? 'bg-clearance-partial' :
                                    finding.completion_percentage >= 30 ? 'bg-clearance-partial' : 'bg-clearance-fail'
                                  }`}
                                  style={{ width: `${finding.completion_percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )}

                          {/* What's found vs What's missing */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {finding.whats_found && (
                              <div className="bg-clearance-pass/10 rounded-lg p-3 border border-clearance-pass/20">
                                <h5 className="text-clearance-pass text-xs font-medium mb-1 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  What's Found
                                </h5>
                                <p className="text-clearance-text text-sm">{finding.whats_found}</p>
                              </div>
                            )}
                            <div className={`bg-clearance-fail/10 rounded-lg p-3 border border-clearance-fail/20 ${!finding.whats_found ? 'md:col-span-2' : ''}`}>
                              <h5 className="text-clearance-fail text-xs font-medium mb-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                What's Missing
                              </h5>
                              <p className="text-clearance-text text-sm">{finding.gap_description}</p>
                            </div>
                          </div>

                          {/* Missing elements list */}
                          {finding.missing_elements?.length > 0 && (
                            <div className="bg-clearance-bg rounded-lg p-3">
                              <h5 className="text-clearance-text-muted text-xs font-medium mb-2">Key Missing Elements</h5>
                              <ul className="space-y-1">
                                {finding.missing_elements.map((element, idx) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-clearance-text">
                                    <span className="text-clearance-fail mt-1">-</span>
                                    {element}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Effort estimate */}
                          {finding.estimated_effort && finding.estimated_effort !== 'unknown' && (
                            <div className="inline-flex items-center gap-2 text-xs text-clearance-text-muted">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Estimated effort: <span className="text-clearance-text font-medium">{finding.estimated_effort}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Evidence */}
                      {finding.evidence_quote && (
                        <div>
                          <h4 className="text-clearance-text-muted text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Evidence Found
                          </h4>
                          <blockquote className="bg-clearance-bg rounded-lg p-3 border-l-2 border-clearance-pass">
                            <p className="text-clearance-text-muted text-sm italic">"{finding.evidence_quote}"</p>
                            {finding.page_reference && (
                              <p className="text-clearance-pass text-xs mt-2 font-medium">
                                Page {finding.page_reference}
                              </p>
                            )}
                          </blockquote>
                        </div>
                      )}

                      {/* Recommended action */}
                      {finding.recommended_action && (
                        <div>
                          <h4 className="text-clearance-text-muted text-xs font-medium uppercase tracking-wide mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Recommended Action
                          </h4>
                          <div className="bg-clearance-pass/10 rounded-lg p-3 border border-clearance-pass/20">
                            <p className="text-clearance-text text-sm leading-relaxed">{finding.recommended_action}</p>
                          </div>

                          {/* v2.0 Efficiency note - cross-reference benefit */}
                          {finding.efficiency_note && (
                            <div className="mt-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                              <p className="text-blue-400 text-xs flex items-start gap-2">
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span><strong>Efficiency:</strong> {finding.efficiency_note}</span>
                              </p>
                            </div>
                          )}

                          {/* v2.0 Template available indicator */}
                          {finding.has_template && (
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-clearance-pass/10 rounded-lg text-clearance-pass text-xs">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Step-by-step remediation template available
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {finding.status !== 'pass' && finding.status !== 'resolved' && (
                        <div className="pt-2 flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkResolved(finding.requirement_id);
                            }}
                            className="btn-primary text-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Mark as Resolved
                          </button>
                          <Link
                            to="/tracker"
                            className="btn-secondary text-sm flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Track in Kanban
                          </Link>
                        </div>
                      )}

                      {finding.status === 'resolved' && (
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-2 text-blue-500 text-sm bg-blue-500/10 px-3 py-1.5 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            This gap has been resolved
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Empty state */}
          {report.findings.filter((f) => {
            if (activeTab) {
              const domainMatch = f.domain === activeTab ||
                (f.requirement_id && f.requirement_id.toLowerCase().includes(activeTab.toLowerCase().slice(0, 2)));
              if (!domainMatch) return false;
            }
            if (statusFilter !== 'all' && f.status !== statusFilter) return false;
            return true;
          }).length === 0 && (
            <div className="text-center py-12 text-clearance-text-muted">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No findings match the current filters</p>
              <button
                onClick={() => { setActiveTab(null); setStatusFilter('all'); }}
                className="text-clearance-pass hover:underline mt-2"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Survey Modal */}
      <FeedbackSurvey
        isOpen={showSurvey}
        onClose={() => setShowSurvey(false)}
        onSubmit={handleSurveySubmit}
        reportId={reportId}
      />

      {/* Pilot Signup Modal */}
      <PilotSignupModal
        isOpen={showPilotSignup}
        onClose={handlePilotDismiss}
        onSubmit={async (formData) => {
          await requestPilotAccess(formData.email, formData.company, formData.message);
        }}
        domain={accessInfo?.domain}
        scansUsed={accessInfo?.scans_used || 2}
      />
    </div>
  );
};

export default ReportPage;
