import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { useUIStore } from '../stores/ui.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { z } from 'zod';
import { Terminal } from 'lucide-react';


const baseRegisterSchema = z.object({
  name: z.string().min(2, 'MIN_LENGTH_2').max(50),
  email: z.string().email('INVALID_EMAIL_FORMAT'),
  password: z.string()
    .min(8, 'MIN_LENGTH_8')
    .regex(/[A-Z]/, 'REQ_UPPERCASE')
    .regex(/[0-9]/, 'REQ_NUMBER'),
  confirmPassword: z.string()
});

const registerSchema = baseRegisterSchema.refine((data: any) => data.password === data.confirmPassword, {
  message: "MISMATCH",
  path: ["confirmPassword"],
});

export default function Register() {
  const navigate = useNavigate();
  const register = useAuthStore((s: any) => s.register);
  const addToast = useUIStore((s: any) => s.addToast);
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validFields, setValidFields] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  const validateField = (name: string, value: string) => {
    try {
      if (name !== 'confirmPassword') {
        const fieldSchema = (baseRegisterSchema.shape as any)[name];
        if (fieldSchema) fieldSchema.parse(value);
      } else {
        if (formData.password !== value && value) {
          throw new z.ZodError([{ 
            code: 'custom', 
            message: "MISMATCH", 
            path: ['confirmPassword'] 
          }]);
        }
      }
      
      setErrors((prev) => ({ ...prev, [name]: '' }));
      setValidFields((prev) => ({ ...prev, [name]: true }));
    } catch (err) {
      const error = err as any;
      if (error instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [name]: error.errors[0]?.message || 'INVALID' }));
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

  const isFormValid = 
    formData.name && formData.email && formData.password && formData.confirmPassword &&
    !errors.name && !errors.email && !errors.password && !errors.confirmPassword &&
    formData.password === formData.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      setIsSubmitting(true);
      await register({ name: formData.name, email: formData.email, password: formData.password });
      addToast({ type: 'success', title: 'USER_CREATED', message: 'Welcome to the system.' });
      navigate('/dashboard');
    } catch (err) {
      const error = err as any;
      const message = error.response?.data?.error?.message || 'REGISTRATION_FAILED';
      setShake(true);
      setTimeout(() => setShake(false), 500);
      addToast({ type: 'error', title: 'SYS_ERROR', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0A0A0A] font-sans overflow-hidden">
      
      <div className="flex w-full max-w-[1400px] mx-auto hw-border-x hw-panel border-t-0 border-b-0 min-h-screen flex-row-reverse">
         
         {/* Registration Module */}
         <div className="flex w-full flex-col justify-center px-6 lg:w-[600px] border-l border-slate-900 dark:border-slate-800 shrink-0 bg-white dark:bg-[#111111] py-12">
            <div className="w-full max-w-sm mx-auto">
               
               <div className="flex items-center gap-3 mb-10">
                  <div className="w-12 h-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                     <Terminal size={24} strokeWidth={2} />
                  </div>
                  <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-slate-900 dark:text-white">Tinker_SYS</h1>
               </div>

               <div className="mb-8">
                  <span className="inline-block px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase tracking-widest mb-4">
                     CREATE_NEW_ID
                  </span>
                  <h2 className="text-4xl font-bold uppercase tracking-tighter text-slate-900 dark:text-white mb-2">
                     Join Console
                  </h2>
                  <p className="font-mono text-xs text-slate-500 uppercase tracking-widest">
                     HAS_ACCOUNT? <Link to="/login" className="text-emerald-500 hover:text-emerald-600 underline underline-offset-4 font-bold">INIT_LOGIN</Link>
                  </p>
               </div>

               <form onSubmit={handleSubmit} className={`space-y-5 ${shake ? 'animate-shake' : ''}`}>
                  <Input
                    label="USER_STRING / NAME"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.name}
                    isValid={validFields.name}
                    placeholder="Ada Lovelace"
                    className="font-mono text-sm hw-border rounded-none shadow-none h-12"
                  />
                  <Input
                    label="COM_ADDRESS / EMAIL"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.email}
                    isValid={validFields.email}
                    placeholder="maker@local.host"
                    className="font-mono text-sm hw-border rounded-none shadow-none h-12"
                  />
                  <Input
                    label="ACCESS_KEY / PASS"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.password}
                    isValid={validFields.password}
                    placeholder="••••••••"
                    className="font-mono text-sm hw-border rounded-none shadow-none h-12"
                  />
                  <Input
                    label="VERIFY_KEY"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.confirmPassword}
                    isValid={validFields.confirmPassword}
                    placeholder="••••••••"
                    className="font-mono text-sm hw-border rounded-none shadow-none h-12"
                  />

                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full mt-6 bg-emerald-500"
                    isLoading={isSubmitting}
                    disabled={isSubmitting || !isFormValid}
                  >
                    GENERATE_ID
                  </Button>
               </form>
            </div>
         </div>

         {/* Left Schematic Visual */}
         <div className="hidden lg:flex flex-1 flex-col bg-dot-matrix p-10 justify-start items-start relative overflow-hidden">
            <div className="font-mono text-[10px] text-slate-400 uppercase tracking-widest text-left mb-auto">
               [ BUILD_ENV_INIT ]<br/>SYSTEM_READY: AWAITING_USER
            </div>
            
            <div className="max-w-md bg-white dark:bg-[#111111] hw-border p-8 relative">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
               <div className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-6">
                  TUTORIAL_START
               </div>
               <h2 className="text-3xl font-bold uppercase tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
                  Welcome to the<br/>Playground.
               </h2>
               <div className="w-16 h-16 bg-slate-100 dark:bg-[#000000] border border-slate-300 dark:border-slate-800 flex items-center justify-center p-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
