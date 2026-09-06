import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Eye, EyeOff, Sparkles, ArrowLeft, Mail, Lock, Sun, Moon, Check } from 'lucide-react';
import {
  CartoonRocket,
  RobotMascot,
  SpeechBubble,
  DroneSVG,
  ControllerBoardSVG,
  MicrochipIC_SVG,
  UltrasonicSensorSVG,
  ElectronicLedSVG,
} from '@/components/illustrations';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const addToast = useUIStore((s) => s.addToast);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [activeField, setActiveField] = useState<string | null>(null);

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
    setActiveField(null);
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
        navigate(searchParams.get('returnTo') || '/dashboard');
      } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: { message?: string } } } };
        const message = error.response?.data?.error?.message || 'Invalid email or password.';
        addToast({ type: 'error', title: 'Login failed', message });
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  // Interactive Mascot speech reaction based on user interaction
  const getSpeechText = () => {
    if (isSubmitting) return 'Launching workbench... 🚀';
    if (errors.email || errors.password) return 'Oops! Check your details 🧐';
    if (activeField === 'email') return "Who's coding today? 🤖";
    if (activeField === 'password') return "I won't peek, promise! 🙈";
    return 'Ready to code? 🚀';
  };

  return (
    <div className="min-h-screen bg-playful-light-bg dark:bg-[#050B14] font-playful text-tg-dark dark:text-white flex flex-col justify-between relative overflow-hidden transition-colors duration-500 select-none sm:select-auto">
      {/* Decorative ambient background glows */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-gradient-to-tr from-playful-primary/20 via-playful-secondary/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-gradient-to-bl from-playful-highlight/15 via-playful-secondary/15 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Ambient outer hardware illustrations positioned safely on far margins */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* 1. Quadcopter Drone - Far top-right sky */}
        <div className="absolute top-[10%] right-[4%] md:right-[6%] w-20 h-20 md:w-26 md:h-26 opacity-75 animate-float-slow">
          <DroneSVG className="w-full h-full" />
        </div>

        {/* 2. Microcontroller Board - Far top-left */}
        <div
          className="absolute top-[12%] left-[3%] md:left-[5%] w-18 h-15 md:w-22 md:h-18 opacity-70 animate-float"
          style={{ animationDelay: '1s' }}
        >
          <ControllerBoardSVG className="w-full h-full" />
        </div>

        {/* 3. Ultrasonic Sensor - Far bottom-left */}
        <div
          className="absolute bottom-[14%] left-[2%] md:left-[4%] w-16 h-12 md:w-20 md:h-15 opacity-70 animate-float-fast"
          style={{ animationDelay: '1.6s' }}
        >
          <UltrasonicSensorSVG className="w-full h-full" />
        </div>

        {/* 4. Electronic LED - Far bottom-right */}
        <div
          className="absolute bottom-[15%] right-[3%] md:right-[5%] w-12 h-16 md:w-14 md:h-18 opacity-70 animate-float-slow"
          style={{ animationDelay: '2.2s' }}
        >
          <ElectronicLedSVG className="w-full h-full" />
        </div>

        {/* 5. Microchip IC - Upper middle sky */}
        <div className="absolute top-[6%] left-[32%] w-10 h-10 opacity-40 animate-drift">
          <MicrochipIC_SVG className="w-full h-full" />
        </div>

        {/* Tech sparks / stars */}
        <svg
          className="absolute top-[15%] left-[12%] w-6 h-6 text-amber-400/35 dark:text-playful-highlight/40 animate-float"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <svg
          className="absolute top-[28%] right-[14%] w-5 h-5 text-purple-400/30 dark:text-purple-300/35 animate-float-slow"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>

        {/* Ambient subtle PCB circuit traces */}
        <svg
          className="absolute inset-0 w-full h-full text-slate-300/25 dark:text-white/5 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,80 H70 L100,110 V160"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="70" cy="80" r="3.5" fill="currentColor" />
          <circle cx="100" cy="160" r="4" fill="#4FC3F7" className="animate-ping" />

          <path
            d="M1100,600 H1170 L1200,630 V680"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="1170" cy="600" r="3.5" fill="currentColor" />
          <circle cx="1200" cy="680" r="4" fill="#FBBF24" className="animate-ping" />
        </svg>
      </div>

      {/* Top Navbar */}
      <header className="relative z-30 max-w-7xl w-full mx-auto px-6 pt-6 pb-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <CartoonRocket className="w-10 h-10 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 drop-shadow-md" />
          <span className="font-heading font-black text-2xl tracking-tight text-playful-primary dark:text-playful-highlight pt-1 drop-shadow-sm">
            Code - Tinkergyan
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-playful-highlight hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shadow-sm"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-6 py-6 md:py-10 flex-1 flex items-center justify-center relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full">
          {/* Left Column: Form Card */}
          <div className="lg:col-span-6 xl:col-span-6 flex justify-center lg:justify-end">
            <div className="bg-white/90 dark:bg-[#0B1121]/85 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] w-full max-w-md relative overflow-hidden">
              {/* Top gradient edge accent */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-playful-primary via-purple-500 to-playful-highlight" />

              {/* Card Top Left: Home Button */}
              <div className="mb-5">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 hover:bg-purple-50/80 dark:hover:bg-purple-950/30 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-playful-primary dark:hover:text-playful-highlight hover:border-playful-primary/40 transition-all duration-200 shadow-2xs group"
                >
                  <ArrowLeft
                    size={14}
                    className="group-hover:-translate-x-0.5 transition-transform duration-200"
                  />
                  <span>Home</span>
                </Link>
              </div>

              {/* Mobile Mascot Greeting Banner (< lg screens) */}
              <div className="lg:hidden flex items-center gap-3 p-3 mb-6 bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/50 rounded-2xl">
                <div className="w-11 h-11 shrink-0">
                  <RobotMascot className="w-full h-full" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-heading font-black text-xs text-tg-dark dark:text-white truncate">
                    {getSpeechText()}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Your companion is ready!
                  </p>
                </div>
              </div>

              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/60 text-purple-700 dark:text-playful-highlight text-xs font-extrabold tracking-wide mb-3">
                <Sparkles size={13} className="text-playful-highlight animate-spin-slow" />
                <span>WELCOME BACK, MAKER!</span>
              </div>

              <h1 className="font-heading font-black text-3xl sm:text-4xl text-tg-dark dark:text-white tracking-tight mb-2">
                Sign In
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-7">
                New to Tinkergyan?{' '}
                <Link
                  to="/register"
                  className="font-bold text-playful-primary dark:text-playful-highlight hover:underline decoration-2 underline-offset-4 transition-colors"
                >
                  Create an account
                </Link>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div
                    className={`relative rounded-2xl transition-all duration-200 ${
                      activeField === 'email' ? 'ring-4 ring-purple-500/15' : ''
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                        activeField === 'email'
                          ? 'text-playful-primary dark:text-playful-highlight'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Mail size={18} />
                    </div>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setActiveField('email')}
                      onBlur={handleBlur}
                      placeholder="you@example.com"
                      className={`w-full h-12 pl-10 pr-4 rounded-2xl border font-medium text-sm bg-slate-50/80 dark:bg-[#070D18]/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all duration-200 ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-slate-200 dark:border-slate-800 focus:border-playful-primary dark:focus:border-playful-highlight'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                  </div>
                  <div
                    className={`relative rounded-2xl transition-all duration-200 ${
                      activeField === 'password' ? 'ring-4 ring-purple-500/15' : ''
                    }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors ${
                        activeField === 'password'
                          ? 'text-playful-primary dark:text-playful-highlight'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Lock size={18} />
                    </div>
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setActiveField('password')}
                      onBlur={handleBlur}
                      placeholder="Enter your password"
                      className={`w-full h-12 pl-10 pr-12 rounded-2xl border font-medium text-sm bg-slate-50/80 dark:bg-[#070D18]/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none transition-all duration-200 ${
                        errors.password
                          ? 'border-red-500 focus:border-red-500'
                          : 'border-slate-200 dark:border-slate-800 focus:border-playful-primary dark:focus:border-playful-highlight'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                        rememberMe
                          ? 'bg-playful-secondary text-white'
                          : 'border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {rememberMe && <Check size={12} strokeWidth={3} />}
                    </button>
                    <span className="font-medium">Remember me</span>
                  </label>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="w-full h-13 py-3.5 px-6 mt-2 bg-gradient-to-r from-playful-primary via-blue-600 to-playful-secondary hover:from-blue-600 hover:to-purple-700 text-white font-heading font-black text-base rounded-2xl shadow-[0_10px_25px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_30px_rgba(59,130,246,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <Sparkles size={18} className="text-playful-highlight animate-spin-slow" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Visual Showcase (Robot & Speech Bubble) */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-6 flex-col items-center justify-center relative">
            <div className="relative flex flex-col items-center max-w-sm w-full">
              {/* Central Mascot with Speech Bubble at Top-Right */}
              <div className="relative w-[300px] xl:w-[340px] transform hover:-translate-y-2 transition-transform duration-500">
                <RobotMascot className="w-full h-auto drop-shadow-2xl" />
                <SpeechBubble
                  text={getSpeechText()}
                  key={getSpeechText()}
                  className="absolute -top-10 -right-4 xl:-right-10 scale-95 xl:scale-105 animate-pop-in drop-shadow-[0_10px_20px_rgba(0,0,0,0.15)] z-20"
                />
              </div>

              {/* Minimalist Feature Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-8 z-10">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  ESP32 Simulator
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/40 text-purple-700 dark:text-playful-highlight text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                  Block Coding
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Real Hardware
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full px-6 py-4 text-center text-xs font-medium text-slate-400 dark:text-slate-500 relative z-20">
        © 2026 Tinkergyan • Empowering young creators to invent the future
      </footer>
    </div>
  );
}
