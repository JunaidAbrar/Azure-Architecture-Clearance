import { useState, useEffect } from 'react';

const STAGES = {
  UPLOADING: 'uploading',
  EXTRACTING: 'extracting',
  ANALYSING: 'analysing',
  COMPLETE: 'complete',
};

const STAGE_CONFIG = {
  uploading: { label: 'Upload', activeText: 'Uploading', progress: 25, estimate: 5 },
  extracting: { label: 'Extract', activeText: 'Extracting', progress: 50, estimate: 15 },
  analysing: { label: 'Analyse', activeText: 'Analysing', progress: 75, estimate: 120 },
  complete: { label: 'Complete', activeText: 'Complete', progress: 100, estimate: 0 },
};

// SVG Icons as components
const UploadIcon = ({ active, completed }) => (
  <svg className={`w-5 h-5 ${completed ? 'text-clearance-pass' : active ? 'text-clearance-cyan' : 'text-clearance-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ExtractIcon = ({ active, completed }) => (
  <svg className={`w-5 h-5 ${completed ? 'text-clearance-pass' : active ? 'text-clearance-cyan' : 'text-clearance-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const AnalyseIcon = ({ active, completed }) => (
  <svg className={`w-5 h-5 ${completed ? 'text-clearance-pass' : active ? 'text-clearance-cyan' : 'text-clearance-text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = ({ animate }) => (
  <svg className="w-5 h-5 text-clearance-pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l4 4L19 7"
      className={animate ? 'animate-check-draw' : ''}
      style={animate ? { strokeDasharray: 100, strokeDashoffset: 0 } : {}}
    />
  </svg>
);

const stages = [
  { id: STAGES.UPLOADING, Icon: UploadIcon },
  { id: STAGES.EXTRACTING, Icon: ExtractIcon },
  { id: STAGES.ANALYSING, Icon: AnalyseIcon },
  { id: STAGES.COMPLETE, Icon: ({ completed }) => <CheckIcon animate={completed} /> },
];

const AnalysisProgress = ({ stage, fileName }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Elapsed time counter
  useEffect(() => {
    if (stage === STAGES.COMPLETE) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, stage]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStageIndex = (stageId) => stages.findIndex(s => s.id === stageId);
  const currentIndex = getStageIndex(stage);
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.uploading;

  const getEstimatedRemaining = () => {
    if (stage === STAGES.COMPLETE) return null;
    const totalEstimate = Object.values(STAGE_CONFIG).reduce((acc, s) => acc + s.estimate, 0);
    const completedEstimate = stages
      .slice(0, currentIndex)
      .reduce((acc, s) => acc + STAGE_CONFIG[s.id].estimate, 0);
    const remaining = Math.max(0, totalEstimate - completedEstimate - (elapsedTime % STAGE_CONFIG[stage].estimate));
    return remaining;
  };

  const estimatedRemaining = getEstimatedRemaining();

  return (
    <div className="animate-fade-in">
      {/* Main Scanner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-clearance-border bg-gradient-to-b from-clearance-bg-secondary to-clearance-bg p-6">

        {/* Scanning effect overlay */}
        {stage !== STAGES.COMPLETE && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-clearance-cyan/50 to-transparent animate-scan-line" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${stage === STAGES.COMPLETE ? 'bg-clearance-pass' : 'bg-clearance-cyan animate-pulse'}`} />
            <span className="text-clearance-text font-medium tracking-wide uppercase text-sm">
              {stage === STAGES.COMPLETE ? 'Scan Complete' : 'Scanning Document'}
            </span>
          </div>
          {stage !== STAGES.COMPLETE && (
            <span className="font-mono text-clearance-text-muted text-sm">
              {formatTime(elapsedTime)}
            </span>
          )}
        </div>

        {/* Progress percentage */}
        <div className="text-center mb-6">
          <span className="text-5xl font-bold bg-gradient-to-r from-clearance-teal to-clearance-cyan bg-clip-text text-transparent">
            {config.progress}%
          </span>
          <p className="text-clearance-text-muted text-sm mt-1">
            {stage === STAGES.COMPLETE
              ? 'Analysis complete! Redirecting...'
              : `${config.activeText}...`
            }
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative h-2 bg-clearance-border rounded-full overflow-hidden mb-8">
          {/* Gradient progress fill */}
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
              stage === STAGES.COMPLETE
                ? 'bg-clearance-pass'
                : 'bg-gradient-to-r from-clearance-teal to-clearance-cyan'
            }`}
            style={{ width: `${config.progress}%` }}
          >
            {/* Shimmer effect */}
            {stage !== STAGES.COMPLETE && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            )}
          </div>

          {/* Glow effect */}
          {stage !== STAGES.COMPLETE && (
            <div
              className="absolute inset-y-0 w-4 bg-clearance-cyan/50 blur-md transition-all duration-700"
              style={{ left: `calc(${config.progress}% - 8px)` }}
            />
          )}
        </div>

        {/* Stage pipeline */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-clearance-border" />
          <div
            className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-clearance-teal to-clearance-cyan transition-all duration-700"
            style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
          />

          {/* Stage nodes */}
          <div className="relative flex justify-between">
            {stages.map((stageItem, index) => {
              const isCompleted = index < currentIndex || stage === STAGES.COMPLETE;
              const isActive = index === currentIndex && stage !== STAGES.COMPLETE;
              const Icon = stageItem.Icon;

              return (
                <div key={stageItem.id} className="flex flex-col items-center">
                  {/* Node */}
                  <div
                    className={`
                      relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                      ${isCompleted
                        ? 'bg-clearance-pass/20 border-2 border-clearance-pass'
                        : isActive
                          ? 'bg-clearance-cyan/20 border-2 border-clearance-cyan animate-pulse-glow'
                          : 'bg-clearance-bg-secondary border-2 border-clearance-border'
                      }
                    `}
                  >
                    <Icon active={isActive} completed={isCompleted} />

                    {/* Active indicator dot */}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-clearance-cyan rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`
                    mt-2 text-xs font-medium transition-colors
                    ${isCompleted
                      ? 'text-clearance-pass'
                      : isActive
                        ? 'text-clearance-cyan'
                        : 'text-clearance-text-muted'
                    }
                  `}>
                    {STAGE_CONFIG[stageItem.id].label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-clearance-border flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-clearance-text-muted">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="truncate max-w-[200px]">{fileName}</span>
          </div>
          {estimatedRemaining !== null && stage !== STAGES.COMPLETE && (
            <span className="text-clearance-text-muted">
              ~{Math.ceil(estimatedRemaining / 60)} min remaining
            </span>
          )}
        </div>
      </div>

      {/* Analysis details - shown during analysis phase */}
      {stage === STAGES.ANALYSING && (
        <div className="mt-4 p-4 rounded-xl bg-clearance-bg-secondary border border-clearance-border animate-fade-in">
          <div className="flex items-center gap-2 text-clearance-text-muted text-sm">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-clearance-cyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-clearance-cyan rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-clearance-cyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Checking compliance against DISP requirements...</span>
          </div>
        </div>
      )}

      {/* Success message */}
      {stage === STAGES.COMPLETE && (
        <div className="mt-4 p-4 rounded-xl bg-clearance-pass/10 border border-clearance-pass/30 animate-scale-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-clearance-pass/20 flex items-center justify-center">
              <CheckIcon animate={true} />
            </div>
            <div>
              <p className="text-clearance-pass font-medium">Analysis Complete</p>
              <p className="text-clearance-text-muted text-sm">Redirecting to your report...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgress;
