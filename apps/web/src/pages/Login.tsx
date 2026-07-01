import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Eye, EyeOff, Rocket, Cpu, Sparkles, ShieldCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-[#07090e] dark:bg-[#030407] font-sans flex relative overflow-hidden text-slate-100">
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px] animate-pulse [animation-delay:2s]" />

      {/* Tiny floating particle elements */}
      <div className="absolute top-1/4 left-1/3 w-1 h-1 bg-emerald-400 rounded-full opacity-30 animate-ping" />
      <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-20 animate-bounce" />

      {/* Left: Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative z-10">
        <div className="w-full max-w-md mx-auto">
          {/* Glass Card Container */}
          <div className="bg-slate-900/40 dark:bg-slate-950/40 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-500/5 relative overflow-hidden">
            {/* Edge reflection */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 mb-8 group w-fit">
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                <Rocket size={18} className="text-slate-950 font-bold" />
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Tinkergyan
              </span>
            </Link>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h1>
            <p className="text-sm text-slate-400 mb-8">
              New to Tinkergyan?{' '}
              <Link
                to="/register"
                className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors underline decoration-emerald-500/30 underline-offset-4 hover:decoration-emerald-400"
              >
                Create an account
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="you@example.com"
                    className={`w-full h-12 px-4 rounded-xl border text-sm font-medium bg-slate-950/60 text-white placeholder:text-slate-600 outline-none transition-all duration-300 focus:ring-4 focus:ring-emerald-500/10 ${
                      errors.email
                        ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-slate-800 focus:border-emerald-500/80'
                    }`}
                  />
                  {errors.email && (
                    <p className="mt-2 text-xs text-red-400 font-semibold flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="relative group">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Enter your password"
                    className={`w-full h-12 px-4 pr-12 rounded-xl border text-sm font-medium bg-slate-950/60 text-white placeholder:text-slate-600 outline-none transition-all duration-300 focus:ring-4 focus:ring-emerald-500/10 ${
                      errors.password
                        ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/10'
                        : 'border-slate-800 focus:border-emerald-500/80'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 w-12 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  {errors.password && (
                    <p className="mt-2 text-xs text-red-400 font-semibold flex items-center gap-1">
                      <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
                      {errors.password}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-emerald-500/15 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none mt-4 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right: Visual Panel */}
      <div className="hidden lg:flex flex-1 bg-slate-950/80 items-center justify-center p-16 relative overflow-hidden border-l border-slate-900">
        {/* Futuristic circuit grid backdrop */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

        {/* Cyber glow elements */}
        <div className="absolute w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse" />

        <div className="relative z-10 max-w-md text-center flex flex-col items-center">
          {/* Detailed Animated Circuit Board Widget */}
          <div className="relative w-64 h-64 bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-2xl mb-10 flex flex-col items-center justify-between group overflow-hidden">
            {/* PCB Traces */}
            <div className="absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            <div className="absolute bottom-1/3 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
            <div className="absolute top-0 bottom-0 left-1/3 w-0.5 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent" />

            {/* Microchip */}
            <div className="relative w-24 h-24 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl border-4 border-slate-700 shadow-xl flex items-center justify-center z-10 group-hover:rotate-12 transition-transform duration-500">
              <Cpu size={36} className="text-emerald-400 animate-pulse" />
              {/* Chip Pins */}
              <div className="absolute -left-2 top-2 bottom-2 w-1.5 flex flex-col justify-between py-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-1 bg-slate-600 rounded-r-sm w-full" />
                ))}
              </div>
              <div className="absolute -right-2 top-2 bottom-2 w-1.5 flex flex-col justify-between py-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-1 bg-slate-600 rounded-l-sm w-full" />
                ))}
              </div>
              <div className="absolute -top-2 left-2 right-2 h-1.5 flex justify-between px-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 bg-slate-600 rounded-b-sm h-full" />
                ))}
              </div>
              <div className="absolute -bottom-2 left-2 right-2 h-1.5 flex justify-between px-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 bg-slate-600 rounded-t-sm h-full" />
                ))}
              </div>
            </div>

            {/* Connecting LED node */}
            <div className="flex gap-4 z-10">
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <span className="text-[9px] font-mono text-emerald-400 mt-1 uppercase tracking-wider">
                  PIN 13
                </span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                </div>
                <span className="text-[9px] font-mono text-purple-400 mt-1 uppercase tracking-wider">
                  RX/TX
                </span>
              </div>
            </div>

            {/* Status text */}
            <div className="w-full bg-slate-950/80 rounded-xl py-1 px-3 border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-center gap-1.5 z-10">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>SYSTEM ONLINE</span>
            </div>
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">
            Code and Build Real Hardware
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Learn microcontroller programming through our interactive Scratch stage. Design,
            simulate, and compile C++ code inside a beautiful glass environment.
          </p>
        </div>
      </div>
    </div>
  );
}
