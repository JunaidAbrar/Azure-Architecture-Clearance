/**
 * Defence-style SVG icons for Clearance platform.
 * Replaces consumer-grade emojis with tactical, security-focused visuals.
 */

// Shield with document overlay - secure upload concept
export const ShieldDocumentIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Shield outline */}
    <path
      d="M12 2L4 6v5c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Document lines inside shield */}
    <path
      d="M9 10h6M9 13h6M9 16h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.7"
    />
    {/* Checkmark accent */}
    <path
      d="M15.5 8l-4 4-2-2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-clearance-pass"
    />
  </svg>
);

// Radar sweep / crosshair scanner - precision analysis concept
export const RadarScanIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer ring */}
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.5"
    />
    {/* Middle ring */}
    <circle
      cx="12"
      cy="12"
      r="6"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.7"
    />
    {/* Center dot */}
    <circle
      cx="12"
      cy="12"
      r="2"
      fill="currentColor"
    />
    {/* Crosshair lines */}
    <path
      d="M12 2v4M12 18v4M2 12h4M18 12h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
    />
    {/* Radar sweep line - accent color */}
    <path
      d="M12 12l5.5-5.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-clearance-pass"
    />
    {/* Detection blip */}
    <circle
      cx="16"
      cy="8"
      r="1.5"
      fill="currentColor"
      className="text-clearance-pass"
    />
  </svg>
);

// Tactical assessment grid - compliance intelligence concept
export const TacticalGridIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Grid squares */}
    <rect
      x="3" y="3" width="7" height="7" rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="14" y="3" width="7" height="7" rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="3" y="14" width="7" height="7" rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <rect
      x="14" y="14" width="7" height="7" rx="1"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    {/* Status indicators - pass */}
    <circle cx="6.5" cy="6.5" r="1.5" fill="currentColor" className="text-clearance-pass" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" className="text-clearance-pass" />
    <circle cx="6.5" cy="17.5" r="1.5" fill="currentColor" className="text-clearance-pass" />
    {/* Status indicator - in progress / warning */}
    <path
      d="M15.5 15.5l4 4M19.5 15.5l-4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-clearance-high"
    />
  </svg>
);

// Classified document icon - alternative secure document
export const ClassifiedDocIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Document body */}
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Folded corner */}
    <path
      d="M14 2v6h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Classification band */}
    <rect
      x="7" y="13" width="10" height="3" rx="0.5"
      fill="currentColor"
      className="text-clearance-pass"
      opacity="0.3"
    />
    <path
      d="M8 14.5h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="text-clearance-pass"
    />
    {/* Lock icon */}
    <circle cx="12" cy="18" r="1" fill="currentColor" opacity="0.5" />
  </svg>
);

// Compliance meter / gauge icon
export const ComplianceMeterIcon = ({ className = "w-8 h-8" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Meter arc */}
    <path
      d="M12 20a8 8 0 110-16 8 8 0 010 16z"
      stroke="currentColor"
      strokeWidth="1.5"
      opacity="0.5"
    />
    {/* Colored arc segments */}
    <path
      d="M4.93 15.07A8 8 0 014 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-clearance-high"
    />
    <path
      d="M4 12a8 8 0 012.34-5.66"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-clearance-medium"
    />
    <path
      d="M6.34 6.34A8 8 0 0120 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-clearance-pass"
    />
    {/* Needle */}
    <path
      d="M12 12l4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Center point */}
    <circle cx="12" cy="12" r="2" fill="currentColor" />
  </svg>
);
