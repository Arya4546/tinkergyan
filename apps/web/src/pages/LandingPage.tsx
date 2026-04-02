import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../stores/ui.store';
import { Moon, Sun, Terminal, Cpu, Zap, Activity } from 'lucide-react';

export default function LandingPage() {
  const theme = useUIStore((s: any) => s.theme);
  const setTheme = useUIStore((s: any) => s.setTheme);
  const [powerOn, setPowerOn] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`min-h-screen font-sans bg-slate-50 dark:bg-[#0A0A0A] text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 sm:p-8 bg-dot-matrix ${powerOn ? '' : 'grayscale-[50%]'}`}>
      
      {/* Main Hardware Chassis */}
      <div className="w-full max-w-[1200px] hw-panel border-b-0 flex flex-col overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.1)]" style={{ height: 'calc(100vh - 64px)', maxHeight: '850px' }}>
        
        {/* Top Control Bar */}
        <div className="h-16 shrink-0 hw-border-b bg-white dark:bg-[#000000] flex justify-between items-stretch">
           <div className="flex items-center px-6 gap-4 hw-border-r">
              <Terminal size={20} className={powerOn ? 'text-primary-500' : 'text-slate-500'} />
              <span className="font-mono text-sm font-bold uppercase tracking-widest">
                TINKERGYAN_LABS_OS
              </span>
           </div>
           
           <div className="flex">
              <button 
                onClick={toggleTheme}
                className="w-16 h-full flex items-center justify-center hw-border-l hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link to="/login" className="h-full px-6 flex items-center justify-center font-mono font-bold text-xs uppercase tracking-widest hw-border-l hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors">
                 INIT_LOGIN
              </Link>
           </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
           
           {/* Left Hero Panel */}
           <div className="flex-1 p-8 md:p-14 flex flex-col justify-center overflow-y-auto">
              <div className="inline-block px-2 py-1 bg-yellow-400 text-slate-900 font-mono text-[10px] font-bold uppercase tracking-widest self-start mb-6 border border-slate-900">
                 SYS_STATUS: {powerOn ? 'ONLINE_AND_READY' : 'STANDBY_MODE'}
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter mb-4 leading-none">
                 The ultimate <br/>maker <br/>console.
              </h1>

              <div className="border-l-2 border-slate-900 dark:border-white pl-4 mb-10">
                 <p className="font-mono text-sm md:text-base text-slate-700 dark:text-slate-300 max-w-lg leading-relaxed mb-4 font-bold">
                   Tinkergyan is an interactive hardware simulator & learning platform for embedded systems.
                 </p>
                 <p className="font-mono text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed uppercase tracking-widest">
                   Code circuits. Build robots. Master logic.<br/>
                   Don't just use technology - Engineer it.
                 </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 mt-auto">
                 {/* Giant Interactive Switch */}
                 <div className="flex flex-col items-center">
                    <button 
                      onClick={() => setPowerOn(!powerOn)}
                      className={`w-20 h-40 border-2 border-slate-900 dark:border-slate-700 p-2 flex flex-col transition-colors ${powerOn ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                      aria-label="Power Switch"
                    >
                       <div className={`w-full h-1/2 border-2 border-slate-900 dark:border-slate-700 bg-white dark:bg-[#222222] transition-transform duration-100 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1)] ${powerOn ? 'translate-y-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]' : ''}`}></div>
                    </button>
                    <span className="font-mono text-[10px] uppercase font-bold mt-3 text-slate-600 dark:text-slate-400">{powerOn ? 'POWER_ON' : 'TOGGLE_SYS'}</span>
                 </div>

                 <div className="flex-1 w-full max-w-sm flex flex-col gap-3">
                    <Link to="/register" className={`h-16 px-6 sm:px-8 font-mono text-base font-bold tracking-widest uppercase flex items-center justify-center border border-slate-900 dark:border-slate-700 transition-colors ${powerOn ? 'bg-primary-500 text-white border-primary-600 hover:bg-primary-600 shadow-[4px_4px_0_theme(colors.slate.900)] dark:shadow-[4px_4px_0_theme(colors.white)] active:shadow-none active:translate-x-1 active:translate-y-1' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 pointer-events-none'}`}>
                       GENERATE_ROOT_ID
                    </Link>
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest text-center">
                      *Requires System Power
                    </span>
                 </div>
              </div>
           </div>

           {/* Right Spec Grid */}
           <div className="w-full md:w-[350px] lg:w-[400px] hw-border-l bg-slate-50 dark:bg-[#111111] flex flex-col shrink-0 overflow-y-auto">
               
               {/* Feature 1 */}
               <div className="flex-1 p-6 lg:p-8 border-b border-slate-900 dark:border-slate-800 flex flex-col group hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                     <span className="font-mono font-bold text-xl sm:text-2xl text-slate-800 dark:text-slate-200 group-hover:text-white dark:group-hover:text-slate-900">01</span>
                     <Cpu size={28} className={`transition-colors ${powerOn ? 'text-primary-500' : 'text-slate-400 dark:text-slate-600'}`} />
                  </div>
                  <div>
                    <h2 className="font-bold uppercase tracking-tight text-lg mb-2 text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-900">Simulated Engine</h2>
                    <p className="font-mono text-[10px] sm:text-xs uppercase text-slate-600 dark:text-slate-400 tracking-widest group-hover:text-slate-300 dark:group-hover:text-slate-600 leading-relaxed">
                      Code logic blocks and C++ inside your browser. Test virtual circuits before wiring the real hardware.
                    </p>
                  </div>
               </div>

               {/* Feature 2 */}
               <div className="flex-1 p-6 lg:p-8 border-b border-slate-900 dark:border-slate-800 flex flex-col group hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                     <span className="font-mono font-bold text-xl sm:text-2xl text-slate-800 dark:text-slate-200 group-hover:text-white dark:group-hover:text-slate-900">02</span>
                     <Activity size={28} className={`transition-colors ${powerOn ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-600'}`} />
                  </div>
                  <div>
                    <h2 className="font-bold uppercase tracking-tight text-lg mb-2 text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-900">Quest Log</h2>
                    <p className="font-mono text-[10px] sm:text-xs uppercase text-slate-600 dark:text-slate-400 tracking-widest group-hover:text-slate-300 dark:group-hover:text-slate-600 leading-relaxed">
                      Step-by-step interactive missions. Connect wires, spin motors, and earn XP for every logic loop mastered.
                    </p>
                  </div>
               </div>

               {/* Feature 3 */}
               <div className="flex-1 p-6 lg:p-8 border-none flex flex-col group hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                     <span className="font-mono font-bold text-xl sm:text-2xl text-slate-800 dark:text-slate-200 group-hover:text-white dark:group-hover:text-slate-900">03</span>
                     <Zap size={28} className={`transition-colors ${powerOn ? 'text-yellow-400' : 'text-slate-400 dark:text-slate-600'}`} />
                  </div>
                  <div>
                     <h2 className="font-bold uppercase tracking-tight text-lg mb-2 text-slate-900 dark:text-white group-hover:text-white dark:group-hover:text-slate-900">Hardware Toybox</h2>
                    <p className="font-mono text-[10px] sm:text-xs uppercase text-slate-600 dark:text-slate-400 tracking-widest group-hover:text-slate-300 dark:group-hover:text-slate-600 leading-relaxed">
                      Save custom configurations. Share your blueprints. Never lose a brilliant hardware idea again.
                    </p>
                  </div>
               </div>

           </div>
        </div>
      </div>
    </div>
  );
}
