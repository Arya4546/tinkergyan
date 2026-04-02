import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BlocklyWorkspace } from '../components/editor/BlocklyWorkspace';
import { Terminal, Save, Play, ChevronLeft, LayoutGrid } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useUIStore } from '../stores/ui.store';

export default function Editor() {
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const addToast = useUIStore((s: any) => s.addToast);

  const handleManualRun = () => {
    addToast({ type: 'info', title: 'COMPILING', message: 'Sending logic to sandbox engine...' });
    // Simulate compilation
    setTimeout(() => {
      addToast({ type: 'success', title: 'COMPILE_OK', message: 'Logic executed successfully.' });
    }, 1500);
  };

  const handleSave = () => {
    addToast({ type: 'info', title: 'SYS_SAVE', message: 'Workspace snapshot saved to db.' });
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans overflow-hidden bg-dot-matrix">
      
      {/* Main Hardware Container */}
      <div className="flex w-full h-full p-2 sm:p-4">
        
        {/* Editor Sub-Chassis */}
        <div className="flex w-full h-full hw-panel border shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
          
          {/* Top Control Bar */}
          <div className="absolute top-0 left-0 w-full h-14 hw-border-b bg-white dark:bg-[#000000] flex justify-between items-center z-10 px-4">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="w-8 h-8 flex items-center justify-center hw-key bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 border border-slate-900 dark:border-slate-800">
                <ChevronLeft size={16} strokeWidth={3} />
              </Link>
              <div className="flex items-center gap-2 px-3 h-8 border border-slate-900 dark:border-slate-800 bg-yellow-400">
                <LayoutGrid size={14} className="text-slate-900" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-900">
                  New_Project.sys
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 h-8">
              <Button variant="outline" className="h-full px-4 rounded-none border border-slate-900" onClick={handleSave}>
                <Save size={14} className="mr-2" /> 
                <span className="font-mono text-[10px] font-bold uppercase">Save_State</span>
              </Button>
              <Button variant="primary" className="h-full px-6 rounded-none bg-emerald-500 border-emerald-600" onClick={handleManualRun}>
                <Play size={14} className="mr-2" />
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest">Execute</span>
              </Button>
            </div>
          </div>

          <div className="flex w-full h-full pt-14">
            {/* Blockly Canvas Pane */}
            <div className="flex-1 relative bg-white dark:bg-[#1A1A1A]">
              <BlocklyWorkspace onCodeChange={setGeneratedCode} className="w-full h-full" />
            </div>

            {/* Hardware Code Terminal Pane */}
            <div className="w-[350px] lg:w-[450px] hw-border-l bg-[#050505] flex flex-col shrink-0 relative">
              <div className="h-10 hw-border-b bg-[#111111] flex items-center px-4 gap-3">
                <Terminal size={14} className="text-emerald-500" />
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">Live_Compiler_Out</h3>
                <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto">
                {generatedCode ? (
                  <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre-wrap">
                    {generatedCode}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-700">
                    <Terminal size={48} className="mb-4 opacity-20" />
                    <p className="font-mono text-xs uppercase tracking-widest text-center">
                      AWAITING_LOGIC_BLOCKS<br/>
                      Insert modules into canvas to compile pseudo-code.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
