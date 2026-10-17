/**
 * TextTrainerModal.tsx
 *
 * UI panel for training the text classification (NLP) model.
 * Students type example sentences per class, click "Train", then
 * use the `classify text [...]` Blockly block to categorise any text.
 *
 * Uses Universal Sentence Encoder + KNN internally (text-ai-engine.ts).
 */
import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Brain, Loader2, CheckCircle2, X } from 'lucide-react';
import { textAIEngine } from '../../lib/text-ai-engine';
import { useAIStore } from '../../stores/ai.store';

export function TextTrainerModal() {
  const [classes, setClasses] = useState<{ name: string; sentences: string[] }[]>([
    { name: 'Class 1', sentences: [] },
    { name: 'Class 2', sentences: [] },
  ]);
  const [newClassName, setNewClassName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTrained, setIsTrained] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateTrainingState } = useAIStore();

  // Sync class names into AI store so blocks can see them
  useEffect(() => {
    const labels = classes.map((c) => `text:${c.name}`);
    const counts: Record<string, number> = {};
    for (const cls of classes) counts[`text:${cls.name}`] = cls.sentences.length;
    updateTrainingState(labels, counts);
  }, [classes, updateTrainingState]);

  const handleAddClass = useCallback(() => {
    const name = newClassName.trim() || `Class ${classes.length + 1}`;
    if (classes.find((c) => c.name === name)) return;
    setClasses((prev) => [...prev, { name, sentences: [] }]);
    setNewClassName('');
    setIsTrained(false);
  }, [newClassName, classes]);

  const handleRenameClass = useCallback((idx: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setClasses((prev) => prev.map((c, i) => (i === idx ? { ...c, name: trimmed } : c)));
    setIsTrained(false);
  }, []);

  const handleRemoveClass = useCallback((idx: number) => {
    setClasses((prev) => prev.filter((_, i) => i !== idx));
    setIsTrained(false);
  }, []);

  const handleAddSentence = useCallback((classIdx: number, sentence: string) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    setClasses((prev) =>
      prev.map((c, i) => (i === classIdx ? { ...c, sentences: [...c.sentences, trimmed] } : c)),
    );
    setIsTrained(false);
  }, []);

  const handleRemoveSentence = useCallback((classIdx: number, sentIdx: number) => {
    setClasses((prev) =>
      prev.map((c, i) =>
        i === classIdx ? { ...c, sentences: c.sentences.filter((_, si) => si !== sentIdx) } : c,
      ),
    );
    setIsTrained(false);
  }, []);

  const handleTrain = useCallback(async () => {
    const validClasses = classes.filter((c) => c.sentences.length > 0);
    if (validClasses.length < 2) {
      setError('Add at least 2 classes with at least 1 sentence each.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsTrained(false);

    try {
      if (!textAIEngine.isInitialised) await textAIEngine.init();

      textAIEngine.clearAll();
      for (const cls of classes) {
        for (const sentence of cls.sentences) {
          textAIEngine.addTextExample(sentence, cls.name);
        }
      }

      await textAIEngine.trainModel();
      setIsTrained(true);
    } catch (err) {
      setError(`Training failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [classes]);

  const handleTest = useCallback(async () => {
    if (!testInput.trim() || !isTrained) return;
    setTestLoading(true);
    try {
      const result = await textAIEngine.classifyText(testInput);
      setTestResult(`"${result.label}" (${result.confidence}% confidence)`);
    } catch {
      setTestResult('Error classifying text');
    } finally {
      setTestLoading(false);
    }
  }, [testInput, isTrained]);

  const totalSamples = classes.reduce((sum, c) => sum + c.sentences.length, 0);

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white dark:bg-[#1b1b33] shadow-[0_2px_12px_rgba(20,20,40,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-slate-800 dark:text-white font-bold text-sm">Text Classifier</h3>
          <p className="text-slate-500 dark:text-white/40 text-xs">
            Type example sentences to train AI on text
          </p>
        </div>
        <span className="text-slate-400 dark:text-white/30 text-xs font-mono">
          {totalSamples} sentences
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Class Cards */}
      <div className="flex flex-col gap-3">
        {classes.map((cls, classIdx) => (
          <ClassCard
            key={classIdx}
            cls={cls}
            onRename={(name) => handleRenameClass(classIdx, name)}
            onRemove={classes.length > 2 ? () => handleRemoveClass(classIdx) : undefined}
            onAddSentence={(s) => handleAddSentence(classIdx, s)}
            onRemoveSentence={(si) => handleRemoveSentence(classIdx, si)}
          />
        ))}
      </div>

      {/* Add Class — deliberately low-key (dashed "ghost" card, muted button):
          this is a secondary, occasional action and shouldn't compete with
          Train below for attention. */}
      <div className="flex gap-2 p-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-[#FF6F61]/30 transition-colors">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
          placeholder={`New class, e.g. "Class ${classes.length + 1}"`}
          className="flex-1 min-w-0 px-2 py-1.5 bg-transparent text-slate-700 dark:text-white/80 text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none"
        />
        <button
          onClick={handleAddClass}
          title="Add class"
          aria-label="Add class"
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/15 text-xs font-semibold transition-colors"
        >
          <Plus size={14} /> Add class
        </button>
      </div>

      {/* Train Button — the primary action on this page, so it gets the app's
          strong gradient CTA treatment once there's enough data to train. */}
      <button
        onClick={() => void handleTrain()}
        disabled={isLoading || totalSamples < 2}
        title={totalSamples < 2 ? 'Add at least 2 sentences to train' : 'Train the text model'}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed ${
          isTrained
            ? 'bg-emerald-500 text-white shadow-[0_3px_10px_-2px_rgba(16,185,129,0.5)]'
            : totalSamples >= 2
              ? 'bg-gradient-to-b from-[#FF7A6D] to-[#FF6F61] text-white shadow-[0_3px_10px_-2px_rgba(255,111,97,0.55)] hover:shadow-[0_5px_16px_-2px_rgba(255,111,97,0.65)] hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Training model...
          </>
        ) : isTrained ? (
          <>
            <CheckCircle2 size={16} /> Model Trained! ✓
          </>
        ) : (
          <>
            <Brain size={16} /> Train Text Model
          </>
        )}
      </button>

      {/* Live Test */}
      {isTrained && (
        <div className="rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 space-y-3">
          <span className="text-slate-600 dark:text-white/60 text-xs font-bold uppercase tracking-widest">
            Test your model
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleTest()}
              placeholder="Type a sentence..."
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-white/30 outline-none focus:border-[#FF6F61]/50"
            />
            <button
              onClick={() => void handleTest()}
              disabled={testLoading || !testInput.trim()}
              title="Test the trained model"
              aria-label="Test"
              className="shrink-0 px-4 py-2 rounded-lg bg-[#FF6F61]/20 text-[#FF6F61] text-sm font-bold hover:bg-[#FF6F61]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {testLoading ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
          </div>
          {testResult && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                Result: {testResult}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Class Card sub-component ─────────────────────────────────────────────────

interface ClassCardProps {
  cls: { name: string; sentences: string[] };
  onRename: (name: string) => void;
  onRemove?: (() => void) | undefined;
  onAddSentence: (s: string) => void;
  onRemoveSentence: (idx: number) => void;
}

function ClassCard({ cls, onRename, onRemove, onAddSentence, onRemoveSentence }: ClassCardProps) {
  const [inputVal, setInputVal] = useState('');

  const submit = () => {
    onAddSentence(inputVal);
    setInputVal('');
  };

  return (
    <div className="rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          defaultValue={cls.name}
          onBlur={(e) => onRename(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          title="Rename class"
          className="flex-1 min-w-0 text-slate-800 dark:text-white font-bold text-sm bg-transparent outline-none border-b border-transparent focus:border-[#FF6F61]/50 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
        />
        <span className="shrink-0 text-slate-400 dark:text-white/30 text-xs font-mono">
          {cls.sentences.length}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            title="Remove class"
            aria-label="Remove class"
            className="shrink-0 p-1.5 rounded-md text-slate-400 dark:text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Existing sentences */}
      {cls.sentences.length > 0 && (
        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5">
          {cls.sentences.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] pl-2.5 pr-1 py-1.5"
            >
              <span className="flex-1 min-w-0 text-slate-600 dark:text-white/70 text-xs truncate">
                {s}
              </span>
              <button
                onClick={() => onRemoveSentence(i)}
                title="Remove example"
                aria-label="Remove example"
                className="shrink-0 p-1 rounded-md text-slate-400 dark:text-white/40 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add sentence input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Example for "${cls.name}"...`}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white text-xs placeholder:text-slate-400 dark:placeholder:text-white/20 outline-none focus:border-[#FF6F61]/40"
        />
        <button
          onClick={submit}
          disabled={!inputVal.trim()}
          title="Add example"
          aria-label="Add example"
          className="shrink-0 px-2.5 py-2 rounded-lg bg-[#FF6F61]/10 text-[#FF6F61] hover:bg-[#FF6F61]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
