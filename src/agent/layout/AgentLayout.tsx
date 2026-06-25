import { Outlet, Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AgentLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/agent' || location.pathname === '/agent/';

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] flex flex-col max-w-lg mx-auto w-full">
      <header className="sticky top-0 z-20 h-12 border-b border-[#1A1A1A]/10 bg-[#FDFCFB]/95 backdrop-blur flex items-center px-4 shrink-0">
        {!isHome ? (
          <Link
            to="/agent"
            className="p-1.5 -ml-1 hover:bg-black/5 rounded-sm flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Link>
        ) : (
          <Link to="/status" className="text-[10px] font-mono text-neutral-400 hover:text-neutral-600">
            Health Link 档案 →
          </Link>
        )}
        <h1 className="flex-1 text-center text-sm font-serif font-semibold tracking-tight pr-8">
          健康解读 Agent
        </h1>
      </header>

      <main className="flex-1 flex flex-col min-h-0 pb-[env(safe-area-inset-bottom)]">
        <Outlet />
      </main>
    </div>
  );
}
