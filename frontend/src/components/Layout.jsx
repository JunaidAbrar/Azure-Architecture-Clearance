import { Link, useLocation } from 'react-router-dom';

// Navigation Icons
const DashboardIcon = ({ active }) => (
  <svg className={`w-4 h-4 transition-colors ${active ? 'text-clearance-pass' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
);

const AssessmentIcon = ({ active }) => (
  <svg className={`w-4 h-4 transition-colors ${active ? 'text-clearance-pass' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v4m2-2h-4" />
  </svg>
);

const RemediationIcon = ({ active }) => (
  <svg className={`w-4 h-4 transition-colors ${active ? 'text-clearance-pass' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const navItems = [
  { path: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { path: '/upload', label: 'New Assessment', Icon: AssessmentIcon },
  { path: '/tracker', label: 'Remediation', Icon: RemediationIcon },
];

const Layout = ({ children, user }) => {
  const location = useLocation();

  // Get user initials for avatar
  const getUserInitials = () => {
    const name = user?.userDetails || 'Demo User';
    if (name.includes('@')) {
      return name.charAt(0).toUpperCase();
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-clearance-bg">
      {/* Header */}
      <header className="bg-clearance-bg-secondary border-b border-clearance-border sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <img src="/logo.svg" alt="Clearance" className="w-8 h-8 transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-clearance-pass/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-clearance-text font-semibold text-xl">
                Clearance
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.Icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                      transition-all duration-200 group
                      ${isActive
                        ? 'text-clearance-pass'
                        : 'text-clearance-text-muted hover:text-clearance-text'
                      }
                    `}
                  >
                    {/* Active background */}
                    <span className={`
                      absolute inset-0 rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-clearance-pass/10'
                        : 'bg-transparent group-hover:bg-clearance-bg'
                      }
                    `} />

                    {/* Active indicator line */}
                    <span className={`
                      absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-clearance-pass rounded-full
                      transition-all duration-300
                      ${isActive ? 'w-6 opacity-100' : 'w-0 opacity-0'}
                    `} />

                    <span className="relative z-10 flex items-center gap-2">
                      <Icon active={isActive} />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-clearance-bg transition-colors">
                <div className="w-8 h-8 rounded-full bg-clearance-pass flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">{getUserInitials()}</span>
                </div>
                <span className="text-clearance-text-muted text-sm hidden lg:block max-w-[150px] truncate">
                  {user?.userDetails || 'Demo User'}
                </span>
              </div>
              <a
                href="/.auth/logout"
                className="flex items-center gap-1.5 text-clearance-text-muted hover:text-clearance-fail text-sm transition-colors px-3 py-2 rounded-lg hover:bg-clearance-fail/10"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Footer - hidden on mobile */}
      <footer className="hidden md:block bg-clearance-bg-secondary border-t border-clearance-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-clearance-text-muted text-sm">
            Clearance — DISP Readiness Intelligence for Australian Defence SMEs
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-clearance-bg-secondary border-t border-clearance-border z-50 safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.Icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center flex-1 h-full py-2
                  transition-colors duration-200
                  ${isActive
                    ? 'text-clearance-pass'
                    : 'text-clearance-text-muted'
                  }
                `}
              >
                <div className={`
                  p-2 rounded-xl transition-all duration-200
                  ${isActive ? 'bg-clearance-pass/10' : ''}
                `}>
                  <Icon active={isActive} />
                </div>
                <span className={`text-xs mt-1 font-medium ${isActive ? 'text-clearance-pass' : ''}`}>
                  {item.label.split(' ')[0]}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-clearance-pass" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
