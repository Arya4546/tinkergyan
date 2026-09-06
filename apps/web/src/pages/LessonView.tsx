/**
 * LessonView.tsx
 *
 * Lesson viewer with:
 *   - Markdown content rendering
 *   - Embedded code editor for CODING lessons
 *   - "Mark Complete" button with XP award
 *   - Navigation to next/prev lessons
 */
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Play,
  Loader2,
  Zap,
  Code2,
  Award,
} from 'lucide-react';

import { courseService, type LessonDetail, type CourseDetail } from '../services/course.service';
import { useUIStore } from '../stores/ui.store';
import { api } from '../services/api';
import { Loader } from '../components/ui/Loader';

// ─── Simple Markdown Renderer ─────────────────────────────────────────────────
// Supports: headers, bold, inline code, code blocks, tables, lists, paragraphs

function renderMarkdown(md: string): string {
  const html = md
    // Code blocks (``` ... ```)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      return `<pre class="md-code-block"><code class="language-${lang || 'text'}">${escapeHtml(code.trim())}</code></pre>`;
    })
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    // Tables
    .replace(/^\|(.+)\|$/gm, (line) => {
      const cells = line
        .split('|')
        .filter(Boolean)
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) return ''; // separator row
      const tag = 'td';
      return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
    })
    // Wrap consecutive table rows
    .replace(/((<tr>.*<\/tr>\n?)+)/g, '<table class="md-table"><tbody>$1</tbody></table>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/((<li>.*<\/li>\n?)+)/g, '<ul class="md-list">$1</ul>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (lines not already wrapped)
    .replace(/^(?!<[huptl]|<\/)((?!<).+)$/gm, '<p class="md-p">$1</p>')
    // Clean up empty lines
    .replace(/\n{3,}/g, '\n\n');

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LessonView() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const addToast = useUIStore((s: any) => s.addToast);

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isCompleting, setCompleting] = useState(false);
  const [isCompiling, setCompiling] = useState(false);
  const [code, setCode] = useState('');
  const [compileOutput, setCompileOutput] = useState<string | null>(null);

  // Fetch lesson + course in parallel
  useEffect(() => {
    if (!lessonId || !slug) return;
    setLoading(true);
    setCompileOutput(null);

    Promise.all([courseService.getLesson(lessonId), courseService.get(slug)])
      .then(([lessonData, courseData]) => {
        setLesson(lessonData);
        setCourse(courseData);
        setCode(lessonData.starterCode || '');
      })
      .catch(() => {
        addToast({ type: 'error', title: 'LOAD_FAILED', message: 'Lesson not found.' });
        navigate(`/courses/${slug}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [lessonId, slug, navigate, addToast]);

  // ── Navigation helpers ──────────────────────────────────────────────────
  const allLessons =
    course?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) ?? [];
  const currentIdx = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLessonItem = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  // ── Complete lesson ─────────────────────────────────────────────────────
  const handleComplete = useCallback(async () => {
    if (!lessonId) return;
    setCompleting(true);
    try {
      const result = await courseService.completeLesson(lessonId);
      setLesson((prev) => (prev ? { ...prev, completed: true } : null));
      if (!result.alreadyCompleted && result.xpAwarded > 0) {
        addToast({
          type: 'success',
          title: 'XP_AWARDED',
          message: `+${result.xpAwarded} XP earned!`,
        });
      } else {
        addToast({
          type: 'info',
          title: 'ALREADY_COMPLETE',
          message: 'Lesson was already completed.',
        });
      }
    } catch {
      addToast({ type: 'error', title: 'ERROR', message: 'Could not mark complete.' });
    } finally {
      setCompleting(false);
    }
  }, [lessonId, addToast]);

  // ── Compile code (for CODING lessons) ───────────────────────────────────
  const handleCompile = useCallback(async () => {
    if (!code.trim()) return;
    setCompiling(true);
    setCompileOutput(null);
    try {
      const { data } = await api.post('/compile', { code, board: 'arduino:avr:uno' });
      const result = data.data.result;
      if (result.success) {
        setCompileOutput(result.stdout || 'Compilation successful!');
      } else {
        setCompileOutput(
          result.stderr || result.errors.map((e: any) => `Line ${e.line}: ${e.message}`).join('\n'),
        );
      }
    } catch {
      setCompileOutput('Compilation failed. Try again.');
    } finally {
      setCompiling(false);
    }
  }, [code]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader message="LOADING_LESSON..." />
      </div>
    );
  }

  if (!lesson || !course) return null;

  const isCoding = lesson.type === 'CODING';

  return (
    <div className="w-full h-full flex flex-col font-playful overflow-hidden bg-transparent">
      {/* Top bar */}
      <div className="border-b border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-6 py-4 flex items-center gap-3 shrink-0 shadow-2xs z-10">
        <Link
          to={`/courses/${course.slug}`}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-playful-primary dark:hover:text-playful-highlight transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />{' '}
          {course.title}
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="font-heading font-black text-sm text-tg-dark dark:text-white truncate">
          {lesson.title}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {lesson.completed && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-playful-primary dark:text-playful-highlight border border-purple-200/80 dark:border-purple-800/60 text-xs font-black tracking-wide">
              <CheckCircle2 size={12} /> Done
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 px-3 py-1 rounded-full">
            <Zap size={12} className="fill-current" /> {lesson.xpReward} XP
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex ${isCoding ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        {/* Lesson content (markdown) */}
        <div
          className={`${isCoding ? 'w-1/2 border-r border-slate-200/80 dark:border-white/10' : 'flex-1 max-w-4xl mx-auto'} overflow-y-auto p-6 lg:p-10 bg-transparent`}
        >
          <div
            className="lesson-content prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content) }}
          />
        </div>

        {/* Code editor panel (CODING lessons only) */}
        {isCoding && (
          <div className="w-1/2 flex flex-col bg-[#141824]">
            {/* Editor toolbar */}
            <div className="h-12 border-b border-slate-800 bg-[#0B1121] flex items-center px-4 gap-3 shrink-0">
              <Code2 size={16} className="text-playful-primary dark:text-playful-highlight" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-1">
                Sketch Editor
              </span>
              <button
                className="h-8 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5"
                onClick={handleCompile}
                disabled={isCompiling}
              >
                {isCompiling ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : (
                  <Play size={13} className="fill-current" />
                )}
                <span>{isCompiling ? 'Running...' : 'Run Code'}</span>
              </button>
            </div>

            {/* Code textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full bg-[#141824] text-emerald-400 font-mono text-sm p-4 outline-none resize-none border-none leading-relaxed"
              placeholder="// Write your code here..."
            />

            {/* Output panel */}
            {compileOutput !== null && (
              <div className="h-48 border-t border-slate-800 bg-[#070B12] overflow-y-auto p-5 shrink-0">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Output Console
                </div>
                <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {compileOutput}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation + complete */}
      <div className="border-t border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0B1121]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        {/* Prev */}
        {prevLesson ? (
          <Link
            to={`/courses/${course.slug}/lessons/${prevLesson.id}`}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-playful-primary dark:hover:text-playful-highlight transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />{' '}
            Previous: {prevLesson.title}
          </Link>
        ) : (
          <div />
        )}

        {/* Complete + Next */}
        <div className="flex items-center gap-3">
          {!lesson.completed && (
            <button
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-playful-primary to-purple-600 hover:from-purple-600 hover:to-playful-primary text-white font-black text-xs transition-all shadow-[0_4px_16px_rgba(108,92,231,0.35)] flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <Loader2 size={16} className="animate-spin mr-1" />
              ) : (
                <Award size={16} />
              )}
              <span>Mark Complete</span>
            </button>
          )}

          {nextLessonItem && (
            <Link
              to={`/courses/${course.slug}/lessons/${nextLessonItem.id}`}
              className="h-10 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 flex items-center gap-2 font-black text-xs transition-all hover:-translate-y-0.5"
            >
              <span>Next Lesson</span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
