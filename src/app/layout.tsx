import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth';

const navItems = [
  { to: '/app', label: 'דשבורד', short: 'בית' },
  { to: '/app/invitations', label: 'הזמנות', short: 'הזמנות' },
  { to: '/app/guests', label: 'אורחים', short: 'אורחים' },
  { to: '/app/seating', label: 'סידורי ישיבה', short: 'ישיבה' },
  { to: '/app/tasks', label: 'משימות', short: 'משימות' },
  { to: '/app/budget', label: 'תקציב', short: 'תקציב' },
  { to: '/app/tools', label: 'כלים חכמים', short: 'כלים' },
];

export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function AppShell() {
  const { wedding, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f7ebcb,transparent_30%),linear-gradient(180deg,#f5f1e8_0%,#f8f6f1_55%,#f2eee5_100%)] text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col md:flex-row">
        <aside className="border-b border-white/60 bg-white/75 p-4 shadow-warm backdrop-blur-xl md:min-h-screen md:w-[280px] md:border-b-0 md:border-l">
          <div className="rounded-[28px] border border-[#ebe3d2] bg-stone-950 px-5 py-6 text-white shadow-warm-lg">
            <p className="text-xs uppercase tracking-[0.35em] text-stone-300">WeddHelp</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight">{wedding?.coupleName || 'Wedding OS'}</h1>
            <p className="mt-2 text-sm text-stone-300">{wedding?.venue || 'טרם הוגדר אולם'}</p>
          </div>

          <nav className="mt-6 grid grid-cols-3 gap-2 md:grid-cols-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) => `rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${isActive ? 'bg-stone-900 text-white shadow-warm' : 'bg-white/70 text-stone-600 hover:bg-white hover:text-stone-900'}`}
              >
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.short}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-6 rounded-[26px] border border-[#e9dfcc] bg-white/80 p-4 text-sm text-stone-600 shadow-warm-sm">
            <p className="font-semibold text-stone-900">מקום לנשום</p>
            <p className="mt-2 leading-6">המערכת מחברת בין RSVP, הושבה, תקציב ולוגיסטיקה דרך flow אחד מסודר.</p>
          </div>

          <button className="btn btn-secondary mt-4 w-full justify-center" onClick={logout}>התנתקות</button>
          <p className="mt-4 hidden text-xs text-stone-400 md:block">מסך פעיל: {navItems.find((item) => location.pathname === item.to)?.label || 'ניהול'}</p>
        </aside>

        <main className="flex-1 p-4 md:p-7">
          <div className="rounded-[32px] border border-white/70 bg-white/75 p-4 shadow-warm-lg backdrop-blur-xl md:p-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
