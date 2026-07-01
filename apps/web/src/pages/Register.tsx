import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Eye, EyeOff, Rocket } from 'lucide-react';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Needs an uppercase letter')
    .regex(/[0-9]/, 'Needs a number'),
  confirmPassword: z.string(),
});

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const addToast = useUIStore((s) => s.addToast);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validateField = (
    name: 'name' | 'email' | 'password' | 'confirmPassword',
    value: string,
  ) => {
    try {
      if (name === 'confirmPassword') {
        if (value && formData.password !== value) {
          throw new z.ZodError([{ code: 'custom', message: "Passwords don't match", path: [] }]);
        }
      } else {
        schema.shape[name]?.parse(value);
      }
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) =>
    validateField(
      e.target.name as 'name' | 'email' | 'password' | 'confirmPassword',
      e.target.value,
    );

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    !errors.name &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword &&
    formData.password === formData.confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    void (async () => {
      try {
        await register({ name: formData.name, email: formData.email, password: formData.password });
        addToast({ type: 'success', title: 'Account created!', message: 'Welcome to Tinkergyan.' });
        navigate('/dashboard');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        addToast({
          type: 'error',
          title: 'Registration failed',
          message: error.response?.data?.error?.message || 'Something went wrong.',
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  const inputClass = (field: string) =>
    `w-full h-11 px-4 rounded-xl border text-sm font-medium bg-white dark:bg-[#111111] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
      errors[field]
        ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
        : 'border-slate-200 dark:border-slate-700'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans flex">
      {/* Left: Visual Panel */}
      <div className="hidden lg:flex flex-1 bg-slate-900 dark:bg-[#111111] items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom_right,#7c3aed,#0f172a)] opacity-80"></div>
        <div className="absolute top-0 left-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
        <div className="relative z-10 max-w-sm text-center">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Rocket size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Start your journey today
          </h2>
          <p className="text-purple-200/80 text-base leading-relaxed">
            Join learners who are building real hardware projects with code. Your first circuit is
            one signup away.
          </p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="w-full max-w-sm mx-auto">
          <Link to="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Rocket size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Tinkergyan
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Create an account
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Full name
              </label>
              <input
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Ada Lovelace"
                className={inputClass('name')}
              />
              {errors.name && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.name}</p>
              )}
            </div>

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
                className={inputClass('email')}
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
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className={`${inputClass('password')} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Repeat your password"
                  className={`${inputClass('confirmPassword')} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
