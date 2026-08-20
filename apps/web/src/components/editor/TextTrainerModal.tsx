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
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Text Classifier</h3>
          <p className="text-white/40 text-xs">Type example sentences to train AI on text</p>
        </div>
        <span className="text-white/30 text-xs font-mono">{totalSamples} sentences</span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
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

      {/* Add Class */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newClassName}
          onChange={(e) => setNewClassName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
          placeholder={`Class ${classes.length + 1}`}
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-[#FF6F61]/50"
        />
        <button
          onClick={handleAddClass}
          className="px-3 py-2 rounded-lg bg-[#FF6F61]/20 text-[#FF6F61] hover:bg-[#FF6F61]/30 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Train Button */}
      <button
        onClick={() => void handleTrain()}
        disabled={isLoading || totalSamples < 2}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
          isTrained
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : totalSamples >= 2
              ? 'bg-[#FF6F61]/20 text-[#FF6F61] border border-[#FF6F61]/30 hover:bg-[#FF6F61]/30'
              : 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
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
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
          <span className="text-white/60 text-xs font-bold uppercase tracking-widest">
            Test your model
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleTest()}
              placeholder="Type a sentence..."
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 outline-none focus:border-[#FF6F61]/50"
            />
            <button
              onClick={() => void handleTest()}
              disabled={testLoading}
              className="px-4 py-2 rounded-lg bg-[#FF6F61]/20 text-[#FF6F61] text-sm font-bold hover:bg-[#FF6F61]/30 transition-colors"
            >
              {testLoading ? <Loader2 size={14} className="animate-spin" /> : 'Test'}
            </button>
          </div>
          {testResult && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-400 text-sm font-bold">Result: {testResult}</p>
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
    <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          defaultValue={cls.name}
          onBlur={(e) => onRename(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="flex-1 text-white font-bold text-sm bg-transparent outline-none border-b border-transparent focus:border-[#FF6F61]/50 hover:border-white/20 transition-colors"
        />
        <span className="text-white/30 text-xs font-mono">{cls.sentences.length}</span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded text-white/30 hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Existing sentences */}
      <div className="space-y-1 max-h-[120px] overflow-y-auto">
        {cls.sentences.map((s, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <span className="flex-1 text-white/60 text-xs truncate">{s}</span>
            <button
              onClick={() => onRemoveSentence(i)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-white/30 hover:text-red-400 transition-all"
            >
              <X size={10} />
            </button>
          </div>
        ))}
      </div>

      {/* Add sentence input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`Example for "${cls.name}"...`}
          className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/20 outline-none focus:border-[#FF6F61]/40"
        />
        <button
          onClick={submit}
          disabled={!inputVal.trim()}
          className="px-2 py-1.5 rounded-lg bg-[#FF6F61]/10 text-[#FF6F61] text-xs hover:bg-[#FF6F61]/20 transition-colors disabled:opacity-30"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
}
