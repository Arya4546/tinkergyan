import { StrictMode, lazy, Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore, useIsAuthenticated } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Loader } from '@/components/ui/Loader';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import './index.css';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ErrorPage = lazy(() => import('@/pages/ErrorPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const Editor = lazy(() => import('@/pages/Editor'));

const queryClient = new QueryClient();

// Toast notifications root component
const Toaster = () => {
  const toasts = useUIStore((s: any) => s.toasts);
  return (
    <div className="fixed top-24 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t: any) => (
        <div key={t.id} className="hw-border bg-white dark:bg-[#111111] p-4 min-w-[250px] max-w-xs animate-slide-up pointer-events-auto shadow-none">
           <div className="font-mono font-bold uppercase tracking-widest text-xs text-slate-900 dark:text-white border-b border-slate-900 dark:border-slate-800 pb-2 mb-2">{t.title}</div>
           {t.message && <div className="font-mono text-[10px] uppercase text-slate-500">{t.message}</div>}
        </div>
      ))}
    </div>
  );
};

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
        <Toaster />
      </AuthInit>
    </div>
  );
};

// Global ErrorBoundary is mapped in the router directly.

const ProtectedLayout = () => {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
              { path: 'courses', element: <div className="p-10 font-bold text-center">Courses Page (Coming Soon)</div> },
              { path: 'courses/:slug', element: <div className="p-10 font-bold text-center">Course View (Coming Soon)</div> },
              { path: 'projects', element: <div className="p-10 font-bold text-center">Projects Page (Coming Soon)</div> },
              { path: 'profile', element: <div className="p-10 font-bold text-center">Profile Page (Coming Soon)</div> },
              { path: 'settings', element: <div className="p-10 font-bold text-center">Settings (Coming Soon)</div> },
            ]
          },
          { path: 'editor', element: <Editor /> },
          { path: 'editor/:id', element: <Editor /> },
        ],
      },
      { 
        path: '*', 
        element: (
          <Suspense fallback={<div className="h-screen bg-background" />}>
            <NotFound />
          </Suspense>
        ) 
      }
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
