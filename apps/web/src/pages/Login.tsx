import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Eye, EyeOff, Rocket } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const addToast = useUIStore((s) => s.addToast);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name: 'email' | 'password', value: string) => {
    try {
      loginSchema.shape[name]?.parse(value);
      setErrors((prev) => ({ ...prev, [name]: '' }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [name]: err.errors[0]?.message || 'Invalid' }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateField(e.target.name as 'email' | 'password', e.target.value);
  };

  const isFormValid = formData.email && formData.password && !errors.email && !errors.password;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    void (async () => {
      try {
        await login({ email: formData.email, password: formData.password });
        addToast({ type: 'success', title: 'Welcome back!', message: 'Logged in successfully.' });
        navigate('/dashboard');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        const message = error.response?.data?.error?.message || 'Invalid email or password.';
        addToast({ type: 'error', title: 'Login failed', message });
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans flex">
      {/* Left: Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Rocket size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Tinkergyan
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Sign up
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@example.com"
                className={`w-full h-11 px-4 rounded-xl border text-sm font-medium bg-white dark:bg-[#111111] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  errors.email
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter your password"
                  className={`w-full h-11 px-4 pr-11 rounded-xl border text-sm font-medium bg-white dark:bg-[#111111] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                    errors.password
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full h-11 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-sm rounded-xl hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {/* Right: Visual Panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 bg-slate-900 dark:bg-[#111111] items-center justify-center p-16 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,#059669,#0f172a)] opacity-80"></div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-sm text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Rocket size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Build the future with code
          </h2>
          <p className="text-emerald-200/80 text-base leading-relaxed">
            From beginner to maker. Learn hardware programming through hands-on projects and guided
            lessons.
          </p>
        </div>
      </div>
    </div>
  );
}
