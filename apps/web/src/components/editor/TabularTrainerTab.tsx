/**
 * TabularTrainerTab.tsx
 *
 * UI for the tabular / numbers training tab in AI Model Studio.
 * Students upload a CSV, pick the target column, tune hyperparameters,
 * watch a live training loss/accuracy chart, then test predictions.
 */
import { useState, useCallback, useRef } from 'react';
import { Upload, Brain, Loader2, CheckCircle2, Download, Play, BarChart3 } from 'lucide-react';
import {
  tabularAIEngine,
  type TabularDataset,
  type TrainingProgress,
  DEFAULT_TABULAR_CONFIG,
} from '../../lib/tabular-ai-engine';

const COLOR = '#FF6F61';

export function TabularTrainerTab() {
  const [dataset, setDataset] = useState<TabularDataset | null>(null);
  const [targetColumn, setTargetColumn] = useState('');
  const [epochs, setEpochs] = useState(DEFAULT_TABULAR_CONFIG.epochs);
  const [batchSize, setBatchSize] = useState(DEFAULT_TABULAR_CONFIG.batchSize);
  const [learningRate, setLearningRate] = useState(DEFAULT_TABULAR_CONFIG.learningRate);
  const [isTraining, setIsTraining] = useState(false);
  const [isTrained, setIsTrained] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [history, setHistory] = useState<TrainingProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testRow, setTestRow] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{
    label: string;
    confidence: number;
    allConfidences: Record<string, number>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setDataset(null);
    setIsTrained(false);
    setProgress(null);
    setHistory([]);
    setTestResult(null);
    tabularAIEngine.reset();
    try {
      const parsed = await tabularAIEngine.parseCSV(file);
      setDataset(parsed);
      // Auto-select last column as target
      setTargetColumn(parsed.headers[parsed.headers.length - 1] ?? '');
      // Initialise test row with empty strings
      const row: Record<string, string> = {};
      for (const h of parsed.numericHeaders) row[h] = '';
      setTestRow(row);
    } catch (e) {
      setError(`CSV parse error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const handleTrain = useCallback(async () => {
    if (!dataset || !targetColumn) return;
    setIsTraining(true);
    setError(null);
    setIsTrained(false);
    setHistory([]);
    setProgress(null);
    tabularAIEngine.reset();
    try {
      await tabularAIEngine.train(
        dataset,
        { targetColumn, epochs, batchSize, learningRate },
        (p) => {
          setProgress(p);
          setHistory((h) => [...h, p]);
        },
      );
      setIsTrained(true);
    } catch (e) {
      setError(`Training failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsTraining(false);
    }
  }, [dataset, targetColumn, epochs, batchSize, learningRate]);

  const handleTest = useCallback(() => {
    const result = tabularAIEngine.predict(testRow);
    setTestResult(result);
  }, [testRow]);

  const handleExportModel = useCallback(async () => {
    try {
      await tabularAIEngine.exportModel();
    } catch (e) {
      setError(`Export error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  const featureColumns = dataset?.numericHeaders.filter((h) => h !== targetColumn) ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Upload + Train */}
      <div className="flex-1 flex flex-col p-6 gap-4 border-r border-white/10 overflow-y-auto">
        {/* CSV Upload */}
        {!dataset ? (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-4 border-2 border-dashed border-white/20 rounded-2xl hover:border-[#FF6F61]/50 transition-colors cursor-pointer p-10"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) void handleFileUpload(f);
            }}
          >
            <Upload size={36} className="text-white/30" />
            <div className="text-center">
              <p className="text-white/60 font-bold text-sm">Drop a CSV file here</p>
              <p className="text-white/30 text-xs mt-1">
                or click to browse — all processing stays in your browser
              </p>
            </div>
            <button className="px-4 py-2 rounded-lg bg-[#FF6F61]/20 text-[#FF6F61] text-sm font-bold hover:bg-[#FF6F61]/30 transition-colors">
              Choose CSV File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void handleFileUpload(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
        ) : (
          <>
            {/* Dataset summary */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold text-sm">📊 Dataset Loaded</span>
                <button
                  onClick={() => {
                    setDataset(null);
                    tabularAIEngine.reset();
                    setIsTrained(false);
                  }}
                  className="text-white/30 hover:text-red-400 text-xs transition-colors"
                >
                  ✕ Clear
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-[#FF6F61] font-bold text-lg">{dataset.rows.length}</p>
                  <p className="text-white/40 text-[10px]">rows</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-[#FF6F61] font-bold text-lg">{dataset.headers.length}</p>
                  <p className="text-white/40 text-[10px]">columns</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2">
                  <p className="text-[#FF6F61] font-bold text-lg">
                    {dataset.numericHeaders.length}
                  </p>
                  <p className="text-white/40 text-[10px]">numeric</p>
                </div>
              </div>
            </div>

            {/* Target column picker */}
            <div>
              <label className="text-white/60 text-xs font-bold uppercase tracking-widest block mb-2">
                Target Column (what to predict)
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#FF6F61]/50"
              >
                {dataset.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <p className="text-white/30 text-[10px] mt-1">
                Features used: {featureColumns.join(', ') || 'none (pick a target above)'}
              </p>
            </div>

            {/* Hyperparameters */}
            <div className="space-y-3">
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                Hyperparameters
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-white/40 text-[10px] block mb-1">Epochs</label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#FF6F61]/50 text-center"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] block mb-1">Batch Size</label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#FF6F61]/50"
                  >
                    {[8, 16, 32, 64, 128].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-[10px] block mb-1">Learning Rate</label>
                  <select
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#FF6F61]/50"
                  >
                    {[0.01, 0.001, 0.0001].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Train button */}
            <button
              onClick={() => void handleTrain()}
              disabled={isTraining || featureColumns.length === 0}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isTrained
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : featureColumns.length > 0
                    ? 'bg-[#FF6F61]/20 text-[#FF6F61] border border-[#FF6F61]/30 hover:bg-[#FF6F61]/30'
                    : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isTraining ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Training epoch{' '}
                  {progress?.epoch ?? 0} / {epochs}...
                </>
              ) : isTrained ? (
                <>
                  <CheckCircle2 size={16} /> Model Trained ✓
                </>
              ) : (
                <>
                  <Play size={16} /> Train Model
                </>
              )}
            </button>

            {/* Live training chart (simple bar) */}
            {history.length > 0 && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} className="text-white/50" />
                  <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
                    Training Progress
                  </span>
                  {progress && (
                    <span className="text-white/40 text-xs ml-auto">
                      Loss: {progress.loss} · Acc: {progress.accuracy}%
                    </span>
                  )}
                </div>
                {/* Simple SVG spark line for accuracy */}
                <div className="h-16 bg-black/20 rounded-lg overflow-hidden relative">
                  <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${history.length} 100`}
                    preserveAspectRatio="none"
                  >
                    <polyline
                      fill="none"
                      stroke={COLOR}
                      strokeWidth="2"
                      points={history.map((p, i) => `${i},${100 - p.accuracy}`).join(' ')}
                    />
                  </svg>
                  <span className="absolute bottom-1 right-2 text-[10px] text-white/30">
                    accuracy %
                  </span>
                </div>
              </div>
            )}

            {isTrained && (
              <button
                onClick={() => void handleExportModel()}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white/5 text-white/50 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                <Download size={13} /> Export Model (.json + .bin)
              </button>
            )}
          </>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Right: Test predictions */}
      <div className="w-[320px] flex flex-col p-6 gap-4 overflow-y-auto">
        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
          Test Prediction
        </span>

        {!isTrained ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <Brain size={32} className="text-white/20" />
            <p className="text-white/30 text-sm">Train a model first to test predictions here</p>
          </div>
        ) : (
          <>
            <p className="text-white/40 text-xs">
              Enter feature values to predict the{' '}
              <span className="text-[#FF6F61]">{targetColumn}</span> column:
            </p>
            <div className="space-y-2">
              {featureColumns.map((col) => (
                <div key={col}>
                  <label className="text-white/50 text-[11px] block mb-0.5">{col}</label>
                  <input
                    type="number"
                    value={testRow[col] ?? ''}
                    onChange={(e) => setTestRow((r) => ({ ...r, [col]: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-[#FF6F61]/50"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleTest}
              className="w-full py-2.5 rounded-xl bg-[#FF6F61]/20 text-[#FF6F61] font-bold text-sm hover:bg-[#FF6F61]/30 transition-colors flex items-center justify-center gap-2"
            >
              <Brain size={14} /> Predict
            </button>

            {testResult && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className="text-white font-bold text-sm">
                    Result: <span className="text-[#FF6F61]">{testResult.label}</span>
                  </span>
                </div>
                {Object.entries(testResult.allConfidences)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, conf]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="text-white/60 text-xs w-24 truncate">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${conf}%`,
                            backgroundColor:
                              label === testResult.label ? COLOR : 'rgba(255,255,255,0.2)',
                          }}
                        />
                      </div>
                      <span className="text-white/50 text-xs font-mono w-8 text-right">
                        {conf}%
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
