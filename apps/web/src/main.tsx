import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore, useIsAuthenticated } from '@/stores/auth.store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader } from '@/components/ui/Loader';
import { EditorToast } from '@/components/ui/EditorToast';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';

// ── Stale chunk auto-recovery ─────────────────────────────────────────────
// After a deployment, browsers with open tabs may try to load old JS chunks
// that no longer exist. Catch these errors and reload once to pick up the
// new build. A sessionStorage flag prevents infinite reload loops (e.g. when
// the server itself is unreachable).
const RELOAD_KEY = '__tg_chunk_reload';

function reloadOnce() {
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  if (Date.now() - lastReload > 10_000) {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
}

// Vite emits this event when a preloaded chunk fails to fetch
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadOnce();
});

// Catch-all for dynamic import() failures (e.g. esptool-js, lazy routes)
window.addEventListener('unhandledrejection', (event) => {
  const msg = String((event.reason as { message?: string })?.message ?? event.reason ?? '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed')
  ) {
    event.preventDefault();
    reloadOnce();
  }
});

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ErrorPage = lazy(() => import('@/pages/ErrorPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const Editor = lazy(() => import('@/pages/Editor'));
const Projects = lazy(() => import('@/pages/Projects'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Courses = lazy(() => import('@/pages/Courses'));
const CourseDetail = lazy(() => import('@/pages/CourseDetail'));
const LessonView = lazy(() => import('@/pages/LessonView'));
const Gallery = lazy(() => import('@/pages/Gallery'));
const Leaderboard = lazy(() => import('@/pages/Leaderboard'));
const Badges = lazy(() => import('@/pages/Badges'));

const queryClient = new QueryClient();

// Toast notifications root component removed in favor of EditorToast

const AuthInit = ({ children }: { children: React.ReactNode }) => {
  const checkAuth = useAuthStore((s: any) => s.checkAuth);
  const isLoading = useAuthStore((s: any) => s.isLoading);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return <Loader fullPage message="Igniting Engines..." />;
  }

  return <>{children}</>;
};

const RootLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 transition-colors duration-200">
      <AuthInit>
        <Suspense fallback={<Loader fullPage message="Calibrating..." />}>
          <Outlet />
        </Suspense>
        <EditorToast />
      </AuthInit>
    </div>
  );
};

// Global ErrorBoundary is mapped in the router directly.

const ProtectedLayout = () => {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  return <Outlet />;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: (
      <Suspense fallback={<div className="h-screen bg-background" />}>
        <ErrorPage />
      </Suspense>
    ),
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      {
        element: <ProtectedLayout />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: 'dashboard', element: <Dashboard /> },
              { path: 'courses', element: <Courses /> },
              { path: 'courses/:slug', element: <CourseDetail /> },
              { path: 'projects', element: <Projects /> },
              { path: 'gallery', element: <Gallery /> },
              { path: 'leaderboard', element: <Leaderboard /> },
              { path: 'badges', element: <Badges /> },
              { path: 'profile', element: <Profile /> },
              { path: 'settings', element: <Settings /> },
            ],
          },
          { path: 'editor', element: <Editor /> },
          { path: 'editor/:id', element: <Editor /> },
          { path: 'courses/:slug/lessons/:lessonId', element: <LessonView /> },
        ],
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<div className="h-screen bg-background" />}>
            <NotFound />
          </Suspense>
        ),
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
