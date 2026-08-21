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
import { Button } from '../components/ui/Button';
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
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#000000] px-6 py-4 flex items-center gap-3 shrink-0 shadow-sm z-10">
        <Link
          to={`/courses/${course.slug}`}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft size={16} /> {course.title}
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
          {lesson.title}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {lesson.completed && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 size={12} /> Done
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-md">
            <Zap size={12} className="fill-current" /> {lesson.xpReward} XP
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex ${isCoding ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        {/* Lesson content (markdown) */}
        <div
          className={`${isCoding ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'flex-1 max-w-4xl mx-auto'} overflow-y-auto p-6 lg:p-10 bg-white dark:bg-[#0A0A0A]`}
        >
          <div
            className="lesson-content prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(lesson.content) }}
          />
        </div>

        {/* Code editor panel (CODING lessons only) */}
        {isCoding && (
          <div className="w-1/2 flex flex-col bg-[#1e1e1e]">
            {/* Editor toolbar */}
            <div className="h-12 border-b border-slate-800 bg-[#111111] flex items-center px-4 gap-3 shrink-0">
              <Code2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex-1">
                Sketch Editor
              </span>
              <Button
                variant="primary"
                className="h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                onClick={handleCompile}
                disabled={isCompiling}
              >
                {isCompiling ? (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Play size={14} className="mr-1.5" />
                )}
                <span>{isCompiling ? 'Running' : 'Run Code'}</span>
              </Button>
            </div>

            {/* Code textarea */}
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full bg-[#1e1e1e] text-emerald-400 font-mono text-sm p-4 outline-none resize-none border-none leading-relaxed"
              placeholder="// Write your code here..."
            />

            {/* Output panel */}
            {compileOutput !== null && (
              <div className="h-48 border-t border-slate-800 bg-[#0a0a0a] overflow-y-auto p-5 shrink-0">
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
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#000000] px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        {/* Prev */}
        {prevLesson ? (
          <Link
            to={`/courses/${course.slug}/lessons/${prevLesson.id}`}
            className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ChevronLeft size={16} /> Previous: {prevLesson.title}
          </Link>
        ) : (
          <div />
        )}

        {/* Complete + Next */}
        <div className="flex items-center gap-3">
          {!lesson.completed && (
            <Button
              variant="primary"
              className="h-10 px-5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <Loader2 size={16} className="animate-spin mr-2" />
              ) : (
                <Award size={16} className="mr-2" />
              )}
              <span>Mark Complete</span>
            </Button>
          )}

          {nextLessonItem && (
            <Link
              to={`/courses/${course.slug}/lessons/${nextLessonItem.id}`}
              className="h-10 px-5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 flex items-center gap-2 font-bold transition-colors"
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
