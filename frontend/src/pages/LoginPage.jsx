import { ShieldDocumentIcon, RadarScanIcon, TacticalGridIcon } from '../components/icons/DefenceIcons';

const LoginPage = () => {
  const handleMicrosoftLogin = () => {
    // Azure Static Web Apps authentication with explicit redirect to dashboard
    window.location.href = '/.auth/login/aad?post_login_redirect_uri=/dashboard';
  };

  return (
    <div className="min-h-screen bg-clearance-bg flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <img src="/logo.svg" alt="Clearance" className="w-16 h-16" />
          <div>
            <h1 className="text-3xl font-bold text-clearance-text">Clearance</h1>
            <p className="text-clearance-text-muted">Defence Compliance Platform</p>
          </div>
        </div>
      </div>

      {/* Login card */}
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-semibold text-clearance-text mb-2">
          Welcome back
        </h2>
        <p className="text-clearance-text-muted mb-8">
          DISP Readiness Intelligence for Australian Defence SMEs.
        </p>

        {/* Microsoft login button */}
        <button
          onClick={handleMicrosoftLogin}
          className="w-full flex items-center justify-center space-x-3 px-6 py-4
                     bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white font-medium rounded-lg
                     transition-colors duration-200"
        >
          {/* Microsoft logo */}
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
            <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
          </svg>
          <span>Sign in with Microsoft</span>
        </button>

        <p className="text-clearance-text-muted text-sm mt-6 text-center">
          Use your existing Microsoft 365 work account
        </p>
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div className="text-center group">
          <div className="inline-flex mb-4 p-4 rounded-xl bg-clearance-card/50
                          border border-clearance-border/50
                          group-hover:border-clearance-pass/30
                          group-hover:shadow-lg group-hover:shadow-clearance-pass/10
                          transition-all duration-300">
            <ShieldDocumentIcon className="w-8 h-8 text-clearance-text-muted
                                           group-hover:text-clearance-pass transition-colors duration-300" />
          </div>
          <h3 className="text-clearance-text font-medium mb-1">Secure Upload</h3>
          <p className="text-clearance-text-muted text-sm">
            Drag & drop your security policies and procedures
          </p>
        </div>
        <div className="text-center group">
          <div className="inline-flex mb-4 p-4 rounded-xl bg-clearance-card/50
                          border border-clearance-border/50
                          group-hover:border-clearance-pass/30
                          group-hover:shadow-lg group-hover:shadow-clearance-pass/10
                          transition-all duration-300">
            <RadarScanIcon className="w-8 h-8 text-clearance-text-muted
                                      group-hover:text-clearance-pass transition-colors duration-300" />
          </div>
          <h3 className="text-clearance-text font-medium mb-1">AI Analysis</h3>
          <p className="text-clearance-text-muted text-sm">
            GPT-4o scans against DISP & E8 requirements
          </p>
        </div>
        <div className="text-center group">
          <div className="inline-flex mb-4 p-4 rounded-xl bg-clearance-card/50
                          border border-clearance-border/50
                          group-hover:border-clearance-pass/30
                          group-hover:shadow-lg group-hover:shadow-clearance-pass/10
                          transition-all duration-300">
            <TacticalGridIcon className="w-8 h-8 text-clearance-text-muted
                                         group-hover:text-clearance-pass transition-colors duration-300" />
          </div>
          <h3 className="text-clearance-text font-medium mb-1">Gap Reports</h3>
          <p className="text-clearance-text-muted text-sm">
            Detailed findings with remediation steps
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-clearance-text-muted text-sm mt-12">
        All data remains within Azure Australia East.
        <span className="text-clearance-pass ml-1">Data Sovereignty Guaranteed.</span>
      </p>
    </div>
  );
};

export default LoginPage;
