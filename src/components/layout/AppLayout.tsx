import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-garda-bg text-garda-text">
      <main className="pb-20 safe-bottom">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
