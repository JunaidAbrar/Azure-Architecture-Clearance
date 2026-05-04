/**
 * Loading Skeleton Components
 * Provides visual placeholders during data fetching
 */

// Base skeleton pulse animation class
const pulseClass = "animate-pulse bg-clearance-bg-secondary rounded";

/**
 * Generic skeleton box
 */
export const SkeletonBox = ({ className = "" }) => (
  <div className={`${pulseClass} ${className}`} />
);

/**
 * Skeleton for text lines
 */
export const SkeletonText = ({ lines = 3, className = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`${pulseClass} h-4`}
        style={{ width: i === lines - 1 ? "60%" : "100%" }}
      />
    ))}
  </div>
);

/**
 * Skeleton for the score gauge on dashboard
 */
export const SkeletonGauge = () => (
  <div className="flex flex-col items-center">
    <div className={`${pulseClass} w-32 h-32 rounded-full`} />
    <div className={`${pulseClass} w-24 h-4 mt-4`} />
  </div>
);

/**
 * Skeleton for stats cards
 */
export const SkeletonStatsCard = () => (
  <div className="card">
    <div className={`${pulseClass} w-24 h-4 mb-4`} />
    <div className={`${pulseClass} w-16 h-10 mb-2`} />
    <div className={`${pulseClass} w-32 h-4`} />
  </div>
);

/**
 * Skeleton for table rows
 */
export const SkeletonTableRow = ({ columns = 5 }) => (
  <tr className="border-b border-clearance-border">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <div className={`${pulseClass} h-4 w-full`} />
      </td>
    ))}
  </tr>
);

/**
 * Skeleton for assessment table
 */
export const SkeletonTable = ({ rows = 3 }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="border-b border-clearance-border">
          {["Company", "Framework", "Date", "Score", "Status", ""].map((h, i) => (
            <th
              key={i}
              className="text-left py-3 px-4 text-clearance-text-muted font-medium text-sm"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} columns={6} />
        ))}
      </tbody>
    </table>
  </div>
);

/**
 * Skeleton for dashboard page
 */
export const DashboardSkeleton = () => (
  <div className="space-y-8">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <div className={`${pulseClass} w-32 h-8 mb-2`} />
        <div className={`${pulseClass} w-48 h-4`} />
      </div>
      <div className={`${pulseClass} w-36 h-10 rounded-lg`} />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card flex flex-col items-center">
        <SkeletonGauge />
      </div>
      <SkeletonStatsCard />
      <SkeletonStatsCard />
    </div>

    {/* Recent Assessments */}
    <div className="card">
      <div className={`${pulseClass} w-40 h-6 mb-4`} />
      <SkeletonTable rows={3} />
    </div>
  </div>
);

/**
 * Skeleton for report page
 */
export const ReportSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="card">
      <div className="flex justify-between items-start">
        <div>
          <div className={`${pulseClass} w-64 h-8 mb-2`} />
          <div className={`${pulseClass} w-48 h-4`} />
        </div>
        <div className={`${pulseClass} w-32 h-10 rounded-lg`} />
      </div>
    </div>

    {/* Score and Summary */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card flex flex-col items-center">
        <SkeletonGauge />
      </div>
      <div className="card md:col-span-2">
        <div className={`${pulseClass} w-40 h-6 mb-4`} />
        <SkeletonText lines={5} />
      </div>
    </div>

    {/* Domain Summary */}
    <div className="card">
      <div className={`${pulseClass} w-48 h-6 mb-4`} />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className={`${pulseClass} w-40 h-4`} />
            <div className={`${pulseClass} flex-1 h-6 rounded-full`} />
          </div>
        ))}
      </div>
    </div>

    {/* Findings */}
    <div className="card">
      <div className={`${pulseClass} w-32 h-6 mb-4`} />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border-b border-clearance-border py-4">
          <div className="flex justify-between mb-2">
            <div className={`${pulseClass} w-24 h-5`} />
            <div className={`${pulseClass} w-16 h-5`} />
          </div>
          <SkeletonText lines={2} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Skeleton for tracker page (Kanban)
 */
export const TrackerSkeleton = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <div>
        <div className={`${pulseClass} w-48 h-8 mb-2`} />
        <div className={`${pulseClass} w-64 h-4`} />
      </div>
    </div>

    {/* Kanban Columns */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {["To Do", "In Progress", "Resolved"].map((title) => (
        <div key={title} className="card">
          <div className="flex items-center justify-between mb-4">
            <div className={`${pulseClass} w-20 h-6`} />
            <div className={`${pulseClass} w-8 h-6 rounded-full`} />
          </div>
          <div className="space-y-3">
            {Array.from({ length: title === "To Do" ? 4 : 2 }).map((_, i) => (
              <div key={i} className="p-3 bg-clearance-bg rounded-lg">
                <div className="flex justify-between mb-2">
                  <div className={`${pulseClass} w-20 h-4`} />
                  <div className={`${pulseClass} w-12 h-4`} />
                </div>
                <div className={`${pulseClass} w-full h-4 mb-1`} />
                <div className={`${pulseClass} w-3/4 h-4`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default {
  SkeletonBox,
  SkeletonText,
  SkeletonGauge,
  SkeletonStatsCard,
  SkeletonTable,
  DashboardSkeleton,
  ReportSkeleton,
  TrackerSkeleton,
};
