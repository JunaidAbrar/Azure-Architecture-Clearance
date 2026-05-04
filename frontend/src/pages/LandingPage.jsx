import { useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7071';
      await fetch(`${API_URL}/request-pilot-access?user_email=${encodeURIComponent(email)}&company_name=${encodeURIComponent(company)}&message=Landing page signup`, {
        method: 'POST',
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit:', err);
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-clearance-bg">
      {/* Navigation */}
      <nav className="border-b border-clearance-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Clearance" className="w-8 h-8" />
            <span className="text-clearance-text font-semibold text-xl">Clearance</span>
          </div>
          <Link
            to="/login"
            className="btn-primary text-sm"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1 bg-clearance-pass/10 border border-clearance-pass/30 rounded-full text-clearance-pass text-sm mb-6">
            Now accepting pilot applications
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-clearance-text mb-6 leading-tight">
            DISP Compliance Assessment<br />
            <span className="text-clearance-pass">in Minutes, Not Months</span>
          </h1>
          <p className="text-xl text-clearance-text-muted mb-8 max-w-2xl mx-auto">
            AI-powered gap analysis for Australian defence SMEs.
            Get the same assessment quality consultants charge $10,000+ for — delivered instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#request-access" className="btn-primary text-lg px-8 py-3">
              Request Pilot Access
            </a>
            <a href="#how-it-works" className="btn-secondary text-lg px-8 py-3">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 px-4 bg-clearance-bg-secondary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-clearance-text text-center mb-12">
            The $10,000 Barrier to Defence Contracts
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-fail/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-clearance-fail" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-clearance-text mb-2">Too Expensive</h3>
              <p className="text-clearance-text-muted">
                Consultants charge $5,000–$20,000 per DISP assessment. Most SMEs can't justify the cost.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-partial/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-clearance-partial" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-clearance-text mb-2">Too Slow</h3>
              <p className="text-clearance-text-muted">
                4–8 weeks for a single assessment. Another engagement after you remediate.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-text-muted/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-clearance-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-clearance-text mb-2">Too Static</h3>
              <p className="text-clearance-text-muted">
                A PDF report that's outdated the moment you receive it. No workflow, no tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-clearance-text text-center mb-12">
            How Clearance Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Upload', desc: 'Drop your security policies and procedures (PDF)' },
              { step: 2, title: 'Analyse', desc: 'AI evaluates against 36 DISP + E8 requirements' },
              { step: 3, title: 'Review', desc: 'Get detailed gaps with evidence citations' },
              { step: 4, title: 'Remediate', desc: 'Track progress with Kanban board' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-clearance-pass text-white flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-clearance-text mb-2">{item.title}</h3>
                <p className="text-clearance-text-muted text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Demo Video */}
          <div className="mt-12 bg-clearance-bg-secondary rounded-xl p-4 md:p-8 border border-clearance-border">
            <div className="aspect-video max-w-3xl mx-auto rounded-lg overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/9nBL6Jwghn0?rel=0&modestbranding=1"
                title="Clearance Demo - DISP Compliance Assessment Platform"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Why Clearance */}
      <section className="py-16 px-4 bg-clearance-bg-secondary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-clearance-text text-center mb-12">
            Why Clearance?
          </h2>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-clearance-border">
                  <th className="text-left py-4 px-4 text-clearance-text-muted font-medium">Feature</th>
                  <th className="text-center py-4 px-4 text-clearance-text-muted font-medium">Consultants</th>
                  <th className="text-center py-4 px-4 text-clearance-text-muted font-medium">Generic GRC</th>
                  <th className="text-center py-4 px-4 text-clearance-pass font-semibold">Clearance</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Delivery Time', consultant: '4-8 weeks', grc: 'Manual setup', clearance: 'Minutes' },
                  { feature: 'Cost', consultant: '$5K-$20K', grc: '$10K+/year', clearance: '$299/month' },
                  { feature: 'DISP Framework', consultant: 'Yes', grc: 'Manual config', clearance: 'Pre-built' },
                  { feature: 'AI Analysis', consultant: 'No', grc: 'No', clearance: 'GPT-4o' },
                  { feature: 'Evidence Citations', consultant: 'Manual', grc: 'Manual', clearance: 'Automatic' },
                  { feature: 'Re-assessment', consultant: 'Pay again', grc: 'Manual', clearance: 'Unlimited' },
                  { feature: 'Progress Tracking', consultant: 'None', grc: 'Basic', clearance: 'Kanban board' },
                  { feature: 'Data Location', consultant: 'Unknown', grc: 'US servers', clearance: 'Australia only' },
                ].map((row) => (
                  <tr key={row.feature} className="border-b border-clearance-border">
                    <td className="py-3 px-4 text-clearance-text font-medium">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-clearance-text-muted">{row.consultant}</td>
                    <td className="py-3 px-4 text-center text-clearance-text-muted">{row.grc}</td>
                    <td className="py-3 px-4 text-center text-clearance-pass font-medium">{row.clearance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Request Access Form */}
      <section id="request-access" className="py-16 px-4 bg-clearance-bg-secondary">
        <div className="max-w-lg mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-clearance-text text-center mb-2">
              Request Pilot Access
            </h2>
            <p className="text-clearance-text-muted text-center mb-8">
              Get 2 free assessments. No credit card required.
            </p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-clearance-pass/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-clearance-pass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-clearance-text mb-2">
                  You're on the list!
                </h3>
                <p className="text-clearance-text-muted">
                  We'll be in touch within 24 hours to set up your pilot access.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-clearance-text text-sm font-medium mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com.au"
                    className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-3 text-clearance-text focus:border-clearance-pass focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-clearance-text text-sm font-medium mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Your Company Pty Ltd"
                    className="w-full bg-clearance-bg border border-clearance-border rounded-lg px-4 py-3 text-clearance-text focus:border-clearance-pass focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn-primary py-3 text-lg disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Request Access'}
                </button>
                <p className="text-clearance-text-muted text-xs text-center">
                  By requesting access, you agree to be contacted about Clearance.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-clearance-border">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="/logo.svg" alt="Clearance" className="w-6 h-6" />
            <span className="text-clearance-text font-semibold">Clearance</span>
          </div>
          <p className="text-clearance-text-muted text-sm mb-4">
            AI-powered DISP compliance assessment for Australian defence SMEs.
          </p>
          <p className="text-clearance-text-muted text-xs">
            All data stored in Azure Australia East. Built in Adelaide.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
