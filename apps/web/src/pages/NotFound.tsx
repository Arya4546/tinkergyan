import { Link } from 'react-router-dom';
import { Search, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0A0A0A] p-6 text-center font-sans bg-dot-matrix">
      
      <div className="max-w-md w-full bg-white dark:bg-[#111111] hw-border flex flex-col relative">
        <div className="h-2 w-full bg-slate-900 dark:bg-white block absolute top-0 left-0"></div>
        
        <div className="p-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-[#000000] hw-border flex items-center justify-center mx-auto mb-6">
              <Search size={24} strokeWidth={2} className="text-slate-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
              404_NOT_FOUND
            </h1>
            <p className="font-mono text-xs text-slate-500 mb-8 leading-snug uppercase tracking-widest">
              Directory path invalid.<br/>Object does not exist.
            </p>

            <Link 
              to="/" 
              className="hw-key bg-slate-900 text-white dark:bg-white dark:text-slate-900 w-full h-12"
            >
              <ArrowLeft size={16} className="mr-2" />
              CD_ROOT_DIR
            </Link>
        </div>
      </div>
    </div>
  );
}
