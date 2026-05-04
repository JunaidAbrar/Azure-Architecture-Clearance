import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFrameworks, uploadDocument, extractDocument, analyseDocument } from '../api/client';
import AnalysisProgress from '../components/AnalysisProgress';

const STAGES = {
  IDLE: 'idle',
  UPLOADING: 'uploading',
  EXTRACTING: 'extracting',
  ANALYSING: 'analysing',
  COMPLETE: 'complete',
  ERROR: 'error',
};

const UploadPage = ({ user }) => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState('');
  const [framework, setFramework] = useState('disp-entry-level');
  const [frameworks, setFrameworks] = useState([]);
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState(STAGES.IDLE);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Load frameworks on mount
  useEffect(() => {
    const loadFrameworks = async () => {
      try {
        const response = await getFrameworks();
        setFrameworks(response.data.frameworks || []);
      } catch (err) {
        console.error('Failed to load frameworks:', err);
      }
    };
    loadFrameworks();
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Only PDF files are supported');
      }
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file || !companyName.trim()) {
      setError('Please provide company name and upload a document');
      return;
    }

    setError(null);

    try {
      // Stage 1: Upload
      setStage(STAGES.UPLOADING);
      const uploadResponse = await uploadDocument(file);
      const uploadId = uploadResponse.data.upload_id;

      // Stage 2: Extract
      setStage(STAGES.EXTRACTING);
      await extractDocument(uploadId);

      // Stage 3: Analyse
      setStage(STAGES.ANALYSING);
      // Use userDetails (email) for domain-based access control, not userId (hash)
      const userEmail = user?.userDetails || user?.userId || 'anonymous';
      const analyseResponse = await analyseDocument(uploadId, companyName, framework, userEmail);
      const reportId = analyseResponse.data.report_id;

      // Complete
      setStage(STAGES.COMPLETE);

      // Navigate to report after short delay
      setTimeout(() => {
        navigate(`/report/${reportId}`);
      }, 1500);

    } catch (err) {
      setStage(STAGES.ERROR);
      console.error(err);

      // Parse the error response
      const errorDetail = err.response?.data?.detail;

      if (typeof errorDetail === 'object' && errorDetail !== null) {
        // Structured error from backend
        setError(errorDetail);
      } else if (typeof errorDetail === 'string') {
        setError({ message: errorDetail, action: 'generic' });
      } else {
        setError({ message: 'Analysis failed. Please try again.', action: 'generic' });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-clearance-text">New Assessment</h1>
        <p className="text-clearance-text-muted">
          Upload your security documentation for compliance analysis
        </p>
      </div>

      {/* Progress indicator */}
      {stage !== STAGES.IDLE && stage !== STAGES.ERROR && (
        <AnalysisProgress stage={stage} fileName={file?.name || 'document.pdf'} />
      )}

      {/* Form */}
      {(stage === STAGES.IDLE || stage === STAGES.ERROR) && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Name */}
          <div>
            <label className="block text-clearance-text text-sm font-medium mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Adelaide Precision Manufacturing Pty Ltd"
              className="input"
              required
            />
          </div>

          {/* Framework Selection */}
          <div>
            <label className="block text-clearance-text text-sm font-medium mb-2">
              Assessment Framework
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="input"
            >
              {frameworks.map((fw) => (
                <option key={fw.framework_id} value={fw.framework_id}>
                  {fw.framework_name} ({fw.total_requirements} requirements)
                </option>
              ))}
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-clearance-text text-sm font-medium mb-2">
              Upload Document
            </label>
            <div
              className={`group border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-clearance-cyan bg-clearance-cyan/5 scale-[1.02]'
                  : 'border-clearance-border hover:border-clearance-text-muted'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-clearance-pass/20 border border-clearance-pass/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-clearance-pass" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-clearance-text font-medium">{file.name}</p>
                  <p className="text-clearance-text-muted text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-clearance-fail text-sm hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-xl bg-clearance-bg border border-clearance-border flex items-center justify-center group-hover:border-clearance-text-muted transition-colors">
                    <svg className="w-7 h-7 text-clearance-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-clearance-text">
                    Drag and drop your PDF here
                  </p>
                  <p className="text-clearance-text-muted text-sm">or</p>
                  <label className="cursor-pointer">
                    <span className="btn-secondary inline-block">
                      Browse Files
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
            <p className="text-clearance-text-muted text-sm mt-2">
              Supported: PDF files up to 10MB
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className={`rounded-xl p-4 ${
              error.action === 'pilot_signup'
                ? 'bg-clearance-partial/10 border border-clearance-partial/30'
                : error.action === 'use_work_email'
                ? 'bg-blue-500/10 border border-blue-500/30'
                : 'bg-clearance-fail/10 border border-clearance-fail/30'
            }`}>
              {error.action === 'pilot_signup' ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-clearance-partial/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-clearance-partial" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-clearance-text font-semibold">Free Assessments Used</h3>
                      <p className="text-clearance-text-muted text-sm mt-1">
                        {error.message}
                      </p>
                    </div>
                  </div>
                  <div className="bg-clearance-bg rounded-lg p-3 text-sm">
                    <p className="text-clearance-text-muted">
                      <strong className="text-clearance-text">Already requested pilot access?</strong><br />
                      We'll be in touch within 24 hours. Check your email for confirmation.
                    </p>
                  </div>
                  <a
                    href="/#request-access"
                    className="btn-primary inline-block text-center"
                  >
                    Request Pilot Access
                  </a>
                </div>
              ) : error.action === 'use_work_email' ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-clearance-text font-semibold">Work Email Required</h3>
                      <p className="text-clearance-text-muted text-sm mt-1">
                        {error.message}
                      </p>
                    </div>
                  </div>
                  <p className="text-blue-400 text-sm pl-[52px]">
                    Please sign out and sign in with your company email (e.g., you@company.com.au)
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-clearance-fail/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-clearance-fail" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-clearance-fail font-semibold">Error</h3>
                    <p className="text-clearance-text-muted text-sm mt-1">{error.message || 'An error occurred'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!file || !companyName.trim()}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Assessment
          </button>
        </form>
      )}
    </div>
  );
};

export default UploadPage;
