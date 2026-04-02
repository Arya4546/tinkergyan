import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  let errorMessage = "SYS_PANIC";
  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0A0A] p-6 text-center font-sans">
      
      <div className="max-w-xl w-full bg-white dark:bg-[#111111] hw-border p-0 flex flex-col relative">
        <div className="h-2 w-full bg-red-500 block absolute top-0 left-0"></div>
        
        <div className="p-8 pb-0 flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 flex items-center justify-center mb-6">
            <AlertTriangle size={32} className="text-red-500" strokeWidth={2} />
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
            CRITICAL_FAILURE
            </h1>
            <p className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-8">
            RUNTIME_ERR: PROCESS_HALTED
            </p>
        </div>
        
        <div className="mx-8 mb-8 bg-red-50 dark:bg-[#1a0505] border border-red-200 dark:border-red-900 p-4">
           <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400 break-words uppercase">
             {errorMessage}
           </p>
        </div>

        <div className="flex border-t border-slate-900 dark:border-slate-800 mt-auto">
          <button 
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 h-14 font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white border-r border-slate-900 dark:border-slate-800 transition-colors"
          >
            <RotateCcw size={16} /> REBOOT_SYS
          </button>
          <Link 
            to="/" 
            className="flex-1 h-14 font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <Home size={16} /> RTN_TO_BASE
          </Link>
        </div>
      </div>

    </div>
  );
}
