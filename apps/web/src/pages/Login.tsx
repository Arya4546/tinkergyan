import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { z } from 'zod';
import { Terminal, Zap } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('INVALID_EMAIL_FORMAT'),
  password: z.string().min(1, 'PASSWORD_REQUIRED'),
});

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const addToast = useUIStore((s) => s.addToast);
  
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validFields, setValidFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const validateField = (name: string, value: string) => {
    try {
      const field = (loginSchema.shape as any)[name];
      if (field) field.parse(value);
      
      setErrors((prev) => ({ ...prev, [name]: '' }));
      setValidFields((prev) => ({ ...prev, [name]: true }));
    } catch (err) {
      if (err instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [name]: err.errors?.[0]?.message || 'VALIDATION_ERROR' }));
        setValidFields((prev) => ({ ...prev, [name]: false }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateField(e.target.name, e.target.value);
  };

  const isFormValid = formData.email && formData.password && !errors.email && !errors.password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsSubmitting(true);
      await login(formData);
      addToast({ type: 'success', title: 'AUTH_SUCCESS', message: 'Connection established.' });
      navigate('/dashboard');
    } catch (err) {
      const error = err as any;
      const message = error.response?.data?.error?.message || 'AUTH_FAILED';
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setErrors({ email: message, password: message });
      setValidFields({ email: false, password: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans overflow-hidden">
      
      <div className="flex w-full max-w-[1400px] mx-auto hw-border-x hw-panel border-t-0 border-b-0 min-h-screen">
         
         {/* Left Auth Module */}
         <div className="flex w-full flex-col justify-center px-6 lg:w-[600px] border-r border-slate-900 dark:border-slate-800 shrink-0 bg-white dark:bg-[#111111]">
            <div className="w-full max-w-sm mx-auto">
               
               <div className="flex items-center gap-3 mb-12">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                     <Terminal size={24} strokeWidth={2} />
                  </div>
                  <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-slate-900 dark:text-white">Tinker_SYS</h1>
               </div>

               <div className="mb-10">
                  <span className="inline-block px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/30 font-mono text-[10px] font-bold uppercase tracking-widest mb-4">
                     LOGIN_SEQUENCE
                  </span>
                  <h2 className="text-4xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                     Init Session
                  </h2>
                  <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                     NO_ID? <Link to="/register" className="text-primary-500 hover:text-primary-600 underline underline-offset-4 font-bold">CREATE_ACCOUNT</Link>
                  </p>
               </div>

               <form onSubmit={handleSubmit} className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
                  <div className="space-y-4">
                     <Input
                        label="USER_IDENTIFIER"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.email}
                        isValid={validFields.email}
                        placeholder="maker@local.host"
                        className="font-mono text-sm hw-border rounded-none shadow-none focus:ring-0 focus:border-primary-500 h-12"
                     />
                     <Input
                        label="ACCESS_CODE"
                        name="password"
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.password}
                        isValid={validFields.password}
                        placeholder="••••••••"
                        className="font-mono text-sm hw-border rounded-none shadow-none focus:ring-0 focus:border-primary-500 h-12"
                     />
                  </div>

                  <div className="flex justify-end pt-2">
                     <a href="#" className="font-mono text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white">
                        FORGOT_CODE?
                     </a>
                  </div>

                  <Button
                     type="submit"
                     variant="primary"
                     className="w-full mt-4"
                     isLoading={isSubmitting}
                     disabled={isSubmitting || !isFormValid}
                  >
                     EXECUTE_LOGIN
                  </Button>
               </form>

            </div>
         </div>

         {/* Right Schematic Visual */}
         <div className="hidden lg:flex flex-1 flex-col bg-dot-matrix p-10 justify-between items-end relative overflow-hidden">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest text-right">
               [ T-SYS_v2.1_BETA ]<br/>SECURE_CONNECTION: TRUE
            </div>
            
            <div className="max-w-md bg-white dark:bg-[#111111] hw-border p-8 relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400"></div>
               <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-6">
                  TERMINAL_MSG
               </div>
               <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
                  Connection<br/>Established.
               </h2>
               <div className="w-16 h-16 bg-slate-100 dark:bg-[#000000] border border-slate-300 dark:border-slate-800 flex flex-col justify-end p-2">
                  <div className="w-full h-1/2 bg-yellow-400"></div>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
