import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout() {
  return (
    <div className="h-screen w-screen bg-playful-light-bg dark:bg-[#050B14] flex flex-col font-playful text-tg-dark dark:text-white overflow-hidden transition-colors duration-300">
      <Navbar />

      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 overflow-y-auto shrink-0 relative bg-slate-50/60 dark:bg-[#0B1121]/95 flex rounded-tl-3xl shadow-sm border-t border-l border-slate-200/80 dark:border-slate-800/80">
          <div className="flex-1 h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
