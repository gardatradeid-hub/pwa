import { Outlet } from 'react-router-dom';
import { LandingNavbar } from './LandingNavbar';
import { LandingFooter } from './LandingFooter';

export function LandingLayout() {
  return (
    <div className="min-h-screen bg-garda-bg text-garda-text">
      <LandingNavbar />
      <main>
        <Outlet />
      </main>
      <LandingFooter />
    </div>
  );
}
