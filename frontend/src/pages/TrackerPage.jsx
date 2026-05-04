import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getTrackerGaps, updateGapStatus } from '../api/client';
import { TrackerSkeleton } from '../components/LoadingSkeleton';

const TrackerPage = ({ user }) => {
  const [data, setData] = useState({ companies: [], totals: { total: 0, todo: 0, in_progress: 0, resolved: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [selectedCompanies, setSelectedCompanies] = useState([]); // Empty = all
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('unified'); // 'unified' or 'by_company'

  // Fetch data with single API call
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userEmail = user?.userDetails || user?.userId || 'demo-user';
        const response = await getTrackerGaps(userEmail);
        setData(response.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch tracker data:', err);
        setError('Failed to load tracker data');
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Handle status change with optimistic update
  const handleStatusChange = async (gap, newStatus) => {
    const oldStatus = gap.remediation_status || 'todo';

    // Optimistic update
    setData(prev => {
      const newData = { ...prev };
      newData.companies = prev.companies.map(company => {
        if (company.report_id !== gap.report_id) return company;

        const newGaps = { ...company.gaps };
        // Remove from old column
        newGaps[oldStatus] = newGaps[oldStatus].filter(
          g => g.requirement_id !== gap.requirement_id
        );
        // Add to new column
        newGaps[newStatus] = [...newGaps[newStatus], { ...gap, remediation_status: newStatus }];
        newGaps[newStatus].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

        return {
          ...company,
          gaps: newGaps,
          stats: {
            ...company.stats,
            [oldStatus]: company.stats[oldStatus] - 1,
            [newStatus]: company.stats[newStatus] + 1,
          }
        };
      });

      // Update totals
      newData.totals = {
        ...prev.totals,
        [oldStatus]: prev.totals[oldStatus] - 1,
        [newStatus]: prev.totals[newStatus] + 1,
      };

      return newData;
    });

    // API call
    try {
      await updateGapStatus(gap.report_id, gap.requirement_id, newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
      // Revert on failure (could implement proper rollback)
    }
  };

  // Filter gaps
  const filterGap = (gap) => {
    // Company filter
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(gap.company_name)) {
      return false;
    }
    // Risk filter
    if (riskFilter !== 'all' && gap.risk_rating !== riskFilter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches =
        gap.requirement_id?.toLowerCase().includes(query) ||
        gap.gap_description?.toLowerCase().includes(query) ||
        gap.company_name?.toLowerCase().includes(query);
      if (!matches) return false;
    }
    return true;
  };

  // Get all gaps flattened and filtered
  const getAllGaps = useMemo(() => {
    const all = { todo: [], in_progress: [], resolved: [] };

    data.companies.forEach(company => {
      ['todo', 'in_progress', 'resolved'].forEach(status => {
        company.gaps[status]?.forEach(gap => {
          if (filterGap(gap)) {
            all[status].push(gap);
          }
        });
      });
    });

    // Sort each column by priority
    Object.keys(all).forEach(key => {
      all[key].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    });

    return all;
  }, [data, selectedCompanies, riskFilter, searchQuery]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => ({
    total: getAllGaps.todo.length + getAllGaps.in_progress.length + getAllGaps.resolved.length,
    todo: getAllGaps.todo.length,
    in_progress: getAllGaps.in_progress.length,
    resolved: getAllGaps.resolved.length,
  }), [getAllGaps]);

  // Company colors for badges
  const getCompanyColor = (companyName) => {
    const colors = [
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'bg-green-500/20 text-green-400 border-green-500/30',
    ];
    const index = data.companies.findIndex(c => c.company_name === companyName);
    return colors[index % colors.length];
  };

  const getDomainName = (code) => {
    const names = {
      SG: 'Security Governance',
      PS: 'Personnel Security',
      PH: 'Physical Security',
      IC: 'Info & Cyber',
      AC: 'Application Control',
      PA: 'Patch Applications',
      MFA: 'Multi-Factor Auth',
      UAH: 'User App Hardening',
      RAP: 'Restrict Admin',
      PO: 'Patch OS',
      ROM: 'Office Macros',
      RB: 'Regular Backups',
    };
    return names[code] || code;
  };

  const getRiskBadge = (risk) => {
    const styles = {
      high: 'bg-clearance-fail/20 text-clearance-fail border border-clearance-fail/30',
      medium: 'bg-clearance-partial/20 text-clearance-partial border border-clearance-partial/30',
      low: 'bg-clearance-pass/20 text-clearance-pass border border-clearance-pass/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[risk] || ''}`}>
        {risk?.charAt(0).toUpperCase() + risk?.slice(1)}
      </span>
    );
  };

  const toggleCompanyFilter = (companyName) => {
    setSelectedCompanies(prev => {
      if (prev.includes(companyName)) {
        return prev.filter(c => c !== companyName);
      }
      return [...prev, companyName];
    });
  };

  if (loading) {
    return <TrackerSkeleton />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-clearance-fail mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  const columns = [
    { id: 'todo', title: 'To Do', color: 'border-t-clearance-fail', icon: '○' },
    { id: 'in_progress', title: 'In Progress', color: 'border-t-clearance-partial', icon: '◐' },
    { id: 'resolved', title: 'Resolved', color: 'border-t-clearance-pass', icon: '●' },
  ];

  const progressPercent = filteredTotals.total > 0
    ? Math.round((filteredTotals.resolved / filteredTotals.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-clearance-text">Remediation Tracker</h1>
          <p className="text-clearance-text-muted">
            {data.companies.length} {data.companies.length === 1 ? 'company' : 'companies'} • {data.totals.total} gaps tracked
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-clearance-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('unified')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'unified'
                ? 'bg-clearance-pass text-white'
                : 'text-clearance-text-muted hover:text-clearance-text'
            }`}
          >
            Unified
          </button>
          <button
            onClick={() => setViewMode('by_company')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              viewMode === 'by_company'
                ? 'bg-clearance-pass text-white'
                : 'text-clearance-text-muted hover:text-clearance-text'
            }`}
          >
            By Company
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-clearance-text-muted text-sm">Overall Progress</span>
          <span className="text-clearance-text font-bold">{progressPercent}% Complete</span>
        </div>
        <div className="h-3 bg-clearance-border rounded-full overflow-hidden flex">
          <div
            className="bg-clearance-pass transition-all duration-500"
            style={{ width: `${(filteredTotals.resolved / Math.max(filteredTotals.total, 1)) * 100}%` }}
          />
          <div
            className="bg-clearance-partial transition-all duration-500"
            style={{ width: `${(filteredTotals.in_progress / Math.max(filteredTotals.total, 1)) * 100}%` }}
          />
          <div
            className="bg-clearance-fail/50 transition-all duration-500"
            style={{ width: `${(filteredTotals.todo / Math.max(filteredTotals.total, 1)) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-6 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-clearance-fail/50" />
            <span className="text-clearance-text">{filteredTotals.todo} To Do</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-clearance-partial" />
            <span className="text-clearance-text">{filteredTotals.in_progress} In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-clearance-pass" />
            <span className="text-clearance-text">{filteredTotals.resolved} Resolved</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        {/* Company pills */}
        {data.companies.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-clearance-text-muted text-sm mr-2">Companies:</span>
            <button
              onClick={() => setSelectedCompanies([])}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                selectedCompanies.length === 0
                  ? 'bg-clearance-pass text-white border-clearance-pass'
                  : 'bg-clearance-bg-secondary text-clearance-text-muted border-clearance-border hover:border-clearance-text-muted'
              }`}
            >
              All
            </button>
            {data.companies.map(company => (
              <button
                key={company.report_id}
                onClick={() => toggleCompanyFilter(company.company_name)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-2 ${
                  selectedCompanies.includes(company.company_name)
                    ? getCompanyColor(company.company_name)
                    : 'bg-clearance-bg-secondary text-clearance-text-muted border-clearance-border hover:border-clearance-text-muted'
                }`}
              >
                {company.company_name}
                <span className="opacity-60">({company.stats.total})</span>
                {selectedCompanies.includes(company.company_name) && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Risk filters and search */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-clearance-text-muted text-sm">Risk:</span>
            {['all', 'high', 'medium', 'low'].map(risk => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  riskFilter === risk
                    ? risk === 'high' ? 'bg-clearance-fail/20 text-clearance-fail' :
                      risk === 'medium' ? 'bg-clearance-partial/20 text-clearance-partial' :
                      risk === 'low' ? 'bg-clearance-pass/20 text-clearance-pass' :
                      'bg-clearance-bg-secondary text-clearance-text'
                    : 'text-clearance-text-muted hover:text-clearance-text'
                }`}
              >
                {risk === 'all' ? 'All' : risk.charAt(0).toUpperCase() + risk.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-clearance-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search gaps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-clearance-bg-secondary border border-clearance-border rounded-lg text-clearance-text text-sm focus:outline-none focus:border-clearance-pass"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-clearance-text-muted hover:text-clearance-text"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board - Unified View */}
      {viewMode === 'unified' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map(column => (
            <div key={column.id} className="space-y-3">
              {/* Column header */}
              <div className={`flex items-center justify-between p-3 bg-clearance-card rounded-lg border-t-4 ${column.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{column.icon}</span>
                  <h3 className="font-semibold text-clearance-text">{column.title}</h3>
                </div>
                <span className="bg-clearance-bg px-2.5 py-1 rounded-full text-sm font-medium text-clearance-text-muted">
                  {getAllGaps[column.id].length}
                </span>
              </div>

              {/* Gap cards */}
              <div className="space-y-3 min-h-[200px]">
                {getAllGaps[column.id].map(gap => (
                  <GapCard
                    key={`${gap.report_id}-${gap.requirement_id}`}
                    gap={gap}
                    column={column.id}
                    onStatusChange={handleStatusChange}
                    getCompanyColor={getCompanyColor}
                    getDomainName={getDomainName}
                    getRiskBadge={getRiskBadge}
                    showCompany={data.companies.length > 1}
                  />
                ))}
                {getAllGaps[column.id].length === 0 && (
                  <div className="text-center py-12 text-clearance-text-muted text-sm border border-dashed border-clearance-border rounded-lg">
                    No gaps
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board - By Company View */}
      {viewMode === 'by_company' && (
        <div className="space-y-8">
          {data.companies
            .filter(company => selectedCompanies.length === 0 || selectedCompanies.includes(company.company_name))
            .map(company => {
              const companyGaps = {
                todo: company.gaps.todo.filter(filterGap),
                in_progress: company.gaps.in_progress.filter(filterGap),
                resolved: company.gaps.resolved.filter(filterGap),
              };
              const companyTotal = companyGaps.todo.length + companyGaps.in_progress.length + companyGaps.resolved.length;

              if (companyTotal === 0) return null;

              return (
                <div key={company.report_id} className="space-y-4">
                  {/* Company header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getCompanyColor(company.company_name).split(' ')[0].replace('/20', '')}`} />
                      <h2 className="text-lg font-semibold text-clearance-text">{company.company_name}</h2>
                      <span className="text-clearance-text-muted text-sm">
                        {companyTotal} gaps • Score: {company.overall_score}%
                      </span>
                    </div>
                    <Link
                      to={`/report/${company.report_id}`}
                      className="text-clearance-pass text-sm hover:underline flex items-center gap-1"
                    >
                      View Report
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>

                  {/* Company Kanban */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {columns.map(column => (
                      <div key={column.id} className="space-y-2">
                        <div className={`flex items-center justify-between p-2 bg-clearance-bg-secondary rounded border-t-2 ${column.color}`}>
                          <span className="text-sm font-medium text-clearance-text">{column.title}</span>
                          <span className="text-xs text-clearance-text-muted">{companyGaps[column.id].length}</span>
                        </div>
                        <div className="space-y-2 min-h-[100px]">
                          {companyGaps[column.id].map(gap => (
                            <GapCard
                              key={`${gap.report_id}-${gap.requirement_id}`}
                              gap={gap}
                              column={column.id}
                              onStatusChange={handleStatusChange}
                              getCompanyColor={getCompanyColor}
                              getDomainName={getDomainName}
                              getRiskBadge={getRiskBadge}
                              showCompany={false}
                              compact
                            />
                          ))}
                          {companyGaps[column.id].length === 0 && (
                            <div className="text-center py-6 text-clearance-text-muted text-xs border border-dashed border-clearance-border rounded">
                              Empty
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Empty state */}
      {data.companies.length === 0 && (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto mb-4 text-clearance-text-muted opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-clearance-text text-lg font-medium mb-2">No assessments yet</h3>
          <p className="text-clearance-text-muted mb-4">Run your first compliance assessment to start tracking gaps</p>
          <Link to="/upload" className="btn-primary">
            New Assessment
          </Link>
        </div>
      )}
    </div>
  );
};

// Gap Card Component
const GapCard = ({ gap, column, onStatusChange, getCompanyColor, getDomainName, getRiskBadge, showCompany = true, compact = false }) => {
  const domainCode = gap.requirement_id?.split('-')[1] || '';

  return (
    <div className={`card hover:border-clearance-text-muted/50 transition-all ${compact ? 'p-3' : 'p-4'}`}>
      {/* Company badge */}
      {showCompany && (
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium mb-2 border ${getCompanyColor(gap.company_name)}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          {gap.company_name}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`font-mono text-clearance-pass ${compact ? 'text-xs' : 'text-sm'} font-semibold`}>
          {gap.requirement_id}
        </span>
        {getRiskBadge(gap.risk_rating)}
      </div>

      {/* Domain */}
      <p className={`text-clearance-text-muted ${compact ? 'text-xs' : 'text-sm'} mb-2`}>
        {getDomainName(domainCode)}
      </p>

      {/* Gap description */}
      {!compact && (
        <p className="text-clearance-text text-sm mb-3 line-clamp-2">
          {gap.gap_description}
        </p>
      )}

      {/* v2.0 Metadata */}
      {!compact && (gap.estimated_effort || gap.has_template) && (
        <div className="flex items-center gap-3 mb-3 text-xs text-clearance-text-muted">
          {gap.estimated_effort && gap.estimated_effort !== 'unknown' && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {gap.estimated_effort}
            </span>
          )}
          {gap.has_template && (
            <span className="flex items-center gap-1 text-clearance-pass">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Template
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={`flex items-center gap-2 ${compact ? 'pt-2' : 'pt-3'} border-t border-clearance-border`}>
        {column === 'todo' && (
          <button
            onClick={() => onStatusChange(gap, 'in_progress')}
            className="flex items-center gap-1 text-xs text-clearance-partial hover:text-clearance-partial/80 font-medium"
          >
            Start
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        {column === 'in_progress' && (
          <>
            <button
              onClick={() => onStatusChange(gap, 'todo')}
              className="flex items-center gap-1 text-xs text-clearance-text-muted hover:text-clearance-text font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => onStatusChange(gap, 'resolved')}
              className="flex items-center gap-1 text-xs text-clearance-pass hover:text-clearance-pass/80 font-medium ml-auto"
            >
              Complete
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </>
        )}
        {column === 'resolved' && (
          <button
            onClick={() => onStatusChange(gap, 'in_progress')}
            className="flex items-center gap-1 text-xs text-clearance-text-muted hover:text-clearance-text font-medium"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reopen
          </button>
        )}
      </div>
    </div>
  );
};

export default TrackerPage;
