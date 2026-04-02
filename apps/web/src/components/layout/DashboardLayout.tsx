import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout() {
  return (
    <div className="h-screen w-screen bg-white dark:bg-[#111111] flex overflow-hidden font-sans hw-border text-slate-900 dark:text-slate-100">
      
      {/* Structural Hardware Grid */}
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <Navbar />
        <main className="flex-1 overflow-y-auto shrink-0 relative bg-dot-matrix flex">
          <div className="flex-1 h-full max-w-[1600px] mx-auto w-full hw-border-x hw-panel bg-transparent border-t-0 border-b-0">
             <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
