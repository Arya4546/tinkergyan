import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Eye, EyeOff, Rocket, Sparkles, Check, ArrowLeft } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
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

  const meetsLength = formData.password.length >= 8;
  const meetsUppercase = /[A-Z]/.test(formData.password);
  const meetsNumber = /[0-9]/.test(formData.password);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const isFormValid =
    formData.name &&
    formData.email &&
    formData.password &&
    formData.confirmPassword &&
    meetsLength &&
    meetsUppercase &&
    meetsNumber &&
    passwordsMatch &&
    !errors.name &&
    !errors.email &&
    !errors.password &&
    !errors.confirmPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setIsSubmitting(true);
    void (async () => {
      try {
        await register({ name: formData.name, email: formData.email, password: formData.password });
        addToast({ type: 'success', title: 'Account created!', message: 'Welcome to Tinkergyan.' });
        navigate(searchParams.get('returnTo') || '/dashboard');
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
    `w-full h-12 px-4 rounded-xl border text-sm font-medium bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all duration-300 focus:ring-4 focus:ring-purple-500/10 ${
      errors[field]
        ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
        : 'border-slate-200 dark:border-slate-800 focus:border-purple-500/80'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030407] font-sans flex relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s]" />

      {/* Left: Visual Panel */}
      <div className="hidden lg:flex flex-1 bg-slate-100 dark:bg-slate-950/80 items-center justify-center p-16 relative overflow-hidden border-l border-slate-200 dark:border-slate-900">
        {/* Futuristic circuit grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

        {/* Cyber glow elements */}
        <div className="absolute w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px] animate-pulse" />

        <div className="relative z-10 max-w-md text-center flex flex-col items-center">
          {/* Animated Breadboard/Potentiometer Widget */}
          <div className="relative w-64 h-64 bg-slate-200 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-3xl p-6 shadow-2xl mb-10 flex flex-col items-center justify-between group overflow-hidden">
            {/* PCB Traces */}
            <div className="absolute top-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            <div className="absolute bottom-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

            {/* Breadboard SVG Visual */}
            <div className="w-48 h-20 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-slate-300 dark:border-slate-700 p-2 flex flex-col justify-between shadow-inner relative z-10">
              <div className="flex justify-between">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-950" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-950" />
                  </div>
                ))}
              </div>

              {/* Mounted IC Chip */}
              <div className="w-24 h-6 bg-slate-300 dark:bg-slate-950 border border-slate-400 dark:border-slate-800 rounded mx-auto flex items-center justify-center text-[8px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest relative">
                <span>TINKER</span>
                <div className="absolute -left-1 w-1 h-3 bg-slate-400 dark:bg-slate-700 rounded-r" />
              </div>

              <div className="flex justify-between">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-950" />
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-950" />
                  </div>
                ))}
              </div>
            </div>

            {/* Glowing potentiometer dial representation */}
            <div className="flex flex-col items-center z-10 group-hover:scale-105 transition-transform duration-300">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 border border-purple-400 flex items-center justify-center relative shadow-lg shadow-purple-500/30">
                <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-800 relative flex items-center justify-center">
                  <div className="w-0.5 h-3 bg-purple-400 absolute top-0.5 rounded-full animate-pulse" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-purple-600 dark:text-purple-400 mt-2 uppercase tracking-wider">
                ANALOG INPUT
              </span>
            </div>

            {/* Connection Wire */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <path
                d="M 96 110 Q 128 170 128 190"
                fill="none"
                stroke="#7c3aed"
                strokeWidth="2.5"
                strokeDasharray="4 2"
                className="animate-[dash_2s_linear_infinite]"
              />
            </svg>
          </div>

          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4 leading-tight">
            Learn, Build, and Create
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
            Join thousands of student makers building interactive projects. Your first coding
            experiment is just a few keystrokes away.
          </p>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative z-10">
        <div className="w-full max-w-md mx-auto">
          {/* Glass Card Container */}
          <div className="bg-white/80 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl shadow-purple-500/5 relative overflow-hidden">
            {/* Edge reflection */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

            {/* Back Button */}
            <Link
              to="/"
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} /> Back to Home
            </Link>

            <Link to="/" className="flex items-center gap-3 mb-8 group w-fit">
              <div className="w-10 h-10 bg-gradient-to-tr from-purple-500 to-indigo-400 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
                <Rocket size={18} className="text-white font-bold" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                Tinkergyan
              </span>
            </Link>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              Create an Account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors underline decoration-purple-500/30 underline-offset-4 hover:decoration-purple-400"
              >
                Sign in
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 dark:bg-red-400 rounded-full" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 dark:bg-red-400 rounded-full" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                    placeholder="Create a strong password"
                    className={`${inputClass('password')} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Password Criteria checklist */}
                {formData.password && (
                  <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${meetsLength ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span
                        className={
                          meetsLength ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'
                        }
                      >
                        At least 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${meetsUppercase ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span
                        className={
                          meetsUppercase ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'
                        }
                      >
                        Contains an uppercase letter
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${meetsNumber ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                      <span
                        className={
                          meetsNumber ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500'
                        }
                      >
                        Contains a number
                      </span>
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 dark:bg-red-400 rounded-full" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
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
                    className={`${inputClass('confirmPassword')} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {formData.confirmPassword && (
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <div
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${passwordsMatch ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}
                    >
                      <Check size={10} strokeWidth={3} />
                    </div>
                    <span
                      className={
                        passwordsMatch
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-red-600 dark:text-red-400 font-semibold'
                      }
                    >
                      {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                    </span>
                  </div>
                )}
                {errors.confirmPassword && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 dark:bg-red-400 rounded-full" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none mt-6 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
