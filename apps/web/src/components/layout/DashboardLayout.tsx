import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout() {
  return (
    <div className="h-screen w-screen bg-slate-50 dark:bg-[#0A0A0A] flex flex-col font-sans text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
      <Navbar />

      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        <Sidebar />

        <main className="flex-1 overflow-y-auto shrink-0 relative bg-white dark:bg-[#111111] flex rounded-tl-2xl shadow-sm border-t border-l border-slate-200 dark:border-slate-800">
          <div className="flex-1 h-full w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
