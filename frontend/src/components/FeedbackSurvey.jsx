import { useState } from 'react';

/**
 * Post-scan feedback survey modal
 * Shown after first assessment to collect customer discovery data
 */
const FeedbackSurvey = ({ isOpen, onClose, onSubmit, reportId }) => {
  const [responses, setResponses] = useState({
    source: '',
    challenge: '',
    nps: 5,
  });
  const [submitting, setSubmitting] = useState(false);

  const sources = [
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'defence_sa', label: 'Defence SA' },
    { value: 'referral', label: 'Referral from colleague' },
    { value: 'search', label: 'Google search' },
    { value: 'thinclab', label: 'ThincLab / University' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit(responses);
      onClose();
    } catch (err) {
      console.error('Failed to submit survey:', err);
    }

    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold text-clearance-text">
              Quick Feedback
            </h2>
            <p className="text-clearance-text-muted text-sm mt-1">
              Help us improve — 30 seconds
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-clearance-text-muted hover:text-clearance-text p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question 1: Source */}
          <div>
            <label className="block text-clearance-text font-medium mb-2">
              How did you hear about Clearance?
            </label>
            <select
              value={responses.source}
              onChange={(e) => setResponses({ ...responses, source: e.target.value })}
              className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-2 text-clearance-text focus:border-clearance-pass focus:outline-none"
              required
            >
              <option value="">Select an option</option>
              {sources.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Question 2: Challenge */}
          <div>
            <label className="block text-clearance-text font-medium mb-2">
              What's your biggest compliance challenge right now?
            </label>
            <textarea
              value={responses.challenge}
              onChange={(e) => setResponses({ ...responses, challenge: e.target.value.slice(0, 200) })}
              placeholder="e.g., Understanding DISP requirements, finding time to prepare documentation..."
              className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-2 text-clearance-text focus:border-clearance-pass focus:outline-none resize-none"
              rows={3}
              maxLength={200}
              required
            />
            <p className="text-clearance-text-muted text-xs mt-1">
              {responses.challenge.length}/200 characters
            </p>
          </div>

          {/* Question 3: NPS */}
          <div>
            <label className="block text-clearance-text font-medium mb-2">
              How likely are you to recommend Clearance to a colleague?
            </label>
            <div className="flex items-center justify-between gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setResponses({ ...responses, nps: n })}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    responses.nps === n
                      ? n <= 6
                        ? 'bg-clearance-fail text-white'
                        : n <= 8
                        ? 'bg-clearance-partial text-black'
                        : 'bg-clearance-pass text-white'
                      : 'bg-clearance-bg border border-clearance-border text-clearance-text-muted hover:border-clearance-pass'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-clearance-text-muted mt-1">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={submitting || !responses.source || !responses.challenge}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Pilot signup CTA modal
 * Shown after user has used all free assessments
 */
export const PilotSignupModal = ({ isOpen, onClose, onSubmit, domain, scansUsed }) => {
  const [formData, setFormData] = useState({
    email: '',
    company: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit(formData);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit pilot request:', err);
    }

    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card max-w-lg w-full">
        {submitted ? (
          // Success state
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-pass/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-clearance-pass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-clearance-text mb-2">
              Request Submitted
            </h2>
            <p className="text-clearance-text-muted mb-6">
              We'll be in touch within 24 hours to discuss your pilot access.
            </p>
            <button onClick={onClose} className="btn-primary">
              Continue
            </button>
          </div>
        ) : (
          // Form state
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-clearance-partial mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">You've used your {scansUsed} free assessments</span>
              </div>
              <h2 className="text-xl font-semibold text-clearance-text">
                Join Our Founding Pilot
              </h2>
              <p className="text-clearance-text-muted text-sm mt-2">
                Get unlimited assessments and help shape the future of defence compliance.
              </p>
            </div>

            <div className="bg-clearance-bg rounded-lg p-4 mb-6">
              <h3 className="text-clearance-text font-medium mb-2">Pilot Benefits:</h3>
              <ul className="text-clearance-text-muted text-sm space-y-1">
                <li>• Unlimited compliance assessments</li>
                <li>• Priority support and feedback channel</li>
                <li>• Influence product roadmap</li>
                <li>• Founding member pricing (locked in)</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-clearance-text text-sm font-medium mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="you@company.com.au"
                  className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-2 text-clearance-text focus:border-clearance-pass focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-clearance-text text-sm font-medium mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Your Company Pty Ltd"
                  className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-2 text-clearance-text focus:border-clearance-pass focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-clearance-text text-sm font-medium mb-1">
                  Anything else? (optional)
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Tell us about your DISP goals..."
                  className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-2 text-clearance-text focus:border-clearance-pass focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary flex-1"
                >
                  Maybe Later
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Request Access'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackSurvey;
