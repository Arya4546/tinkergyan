import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUIStore } from '../stores/ui.store';
import { Moon, Sun, ChevronRight } from 'lucide-react';
import {
  DoodleBackground,
  RobotMascot,
  SpeechBubble,
  CartoonRocket,
  BlockCodeIcon,
  SimulatorIcon,
  CourseIcon,
} from '@/components/illustrations';

export default function LandingPage() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="min-h-screen bg-playful-light-bg dark:bg-[#050B14] font-playful text-tg-dark dark:text-white flex flex-col overflow-x-hidden transition-colors duration-500">
      {/* Navbar - Floating Glass Pill */}
      <div className="pt-6 px-4 md:px-8 w-full mx-auto absolute top-0 left-0 right-0 z-50">
        <header className="h-16 max-w-7xl mx-auto flex items-center justify-between px-6 bg-white/80 dark:bg-[#0B1121]/70 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition-all">
          <div className="flex items-center gap-3">
            <CartoonRocket className="w-10 h-10" />
            <span className="font-heading font-black text-2xl tracking-tight text-playful-primary dark:text-playful-highlight pt-1 drop-shadow-sm">
              Code - Tinkergyan
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 dark:text-playful-highlight hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Link
              to="/login"
              className="text-base font-bold text-slate-500 dark:text-slate-300 hover:text-playful-primary dark:hover:text-white transition-colors px-4 py-2 hidden md:block"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="group flex items-center gap-2 text-base font-bold bg-gradient-to-r from-playful-primary to-[#A855F7] hover:from-playful-primary-hover hover:to-[#9333EA] dark:from-playful-highlight dark:to-amber-500 dark:text-playful-dark-bg text-white px-6 py-2.5 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_6px_0_#7C3AED] dark:shadow-[0_6px_0_#D97706] hover:translate-y-[2px] hover:shadow-[0_4px_0_#6D28D9] dark:hover:shadow-[0_4px_0_#B45309]"
            >
              Get Started!
            </Link>
          </div>
        </header>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 md:pt-44 md:pb-36 flex-1 flex items-center bg-gradient-to-br from-[#A855F7] via-[#8B5CF6] to-[#6366F1] dark:from-[#0B1121] dark:via-[#1e1b4b] dark:to-[#0B1121] overflow-hidden rounded-b-[40px] md:rounded-b-[80px] shadow-2xl transition-colors duration-500">
        <DoodleBackground />

        {/* Floating decorative hardware code snippets */}
        <div className="absolute top-[22%] left-[4%] text-white/15 dark:text-playful-highlight/15 font-mono text-3xl md:text-5xl font-bold animate-float-slow select-none drop-shadow-lg hidden sm:block">
          &#123; pinMode(13, OUTPUT) &#125;
        </div>
        <div className="absolute bottom-[24%] right-[4%] text-white/15 dark:text-playful-highlight/15 font-mono text-3xl md:text-5xl font-bold animate-float select-none drop-shadow-lg hidden sm:block">
          &lt;drone.takeoff() /&gt;
        </div>

        <div className="max-w-7xl mx-auto w-full px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
          {/* Left Column */}
          <div className="text-center lg:text-left z-20">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/20 dark:bg-black/40 backdrop-blur-xl text-white text-sm font-bold rounded-full border border-white/40 dark:border-white/20 mb-8 shadow-[0_8px_32px_rgba(0,0,0,0.12)] animate-fade-in transition-all hover:bg-white/30 dark:hover:bg-black/50 cursor-default">
              <span className="w-3 h-3 bg-playful-highlight rounded-full animate-pulse shadow-[0_0_10px_#FBBF24]"></span>
              <span className="tracking-wider uppercase text-xs sm:text-sm">
                Interactive Hardware & Drone Simulator
              </span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading font-extrabold tracking-tight leading-[1.05] mb-6 text-white">
              Welcome to
              <br />
              <span className="text-playful-highlight inline-block mt-2">Tinkergyan!</span>
            </h1>

            <p className="text-xl md:text-2xl text-white/95 font-medium leading-relaxed mb-6 max-w-lg mx-auto lg:mx-0 drop-shadow-sm">
              Code educational drones, program microcontrollers, build smart robots, and bring real
              circuits to life.
            </p>

            {/* Platform Hardware Feature Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-2.5 mb-10 max-w-lg mx-auto lg:mx-0">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/15 dark:bg-white/10 text-white backdrop-blur-md border border-white/25 flex items-center gap-1.5 shadow-sm">
                🚁 Quadcopter Drones
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/15 dark:bg-white/10 text-white backdrop-blur-md border border-white/25 flex items-center gap-1.5 shadow-sm">
                ⚡ Arduino & ESP32
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/15 dark:bg-white/10 text-white backdrop-blur-md border border-white/25 flex items-center gap-1.5 shadow-sm">
                📡 Ultrasonic Sensors
              </span>
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/15 dark:bg-white/10 text-white backdrop-blur-md border border-white/25 flex items-center gap-1.5 shadow-sm">
                🦾 Servos & Robotics
              </span>
            </div>

            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 sm:gap-6">
              <Link
                to="/register"
                className="group flex items-center justify-center gap-2 bg-gradient-to-r from-playful-highlight to-amber-300 text-tg-dark font-black text-lg md:text-xl px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-[0_8px_0_#D97706] hover:shadow-[0_4px_0_#B45309] hover:translate-y-[4px] border-2 border-white/30"
              >
                Start Playing{' '}
                <ChevronRight
                  size={24}
                  strokeWidth={4}
                  className="group-hover:translate-x-1.5 transition-transform"
                />
              </Link>
              <Link
                to="/dashboard?new=true"
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-lg md:text-xl px-8 py-4 rounded-full backdrop-blur-xl transition-all border border-white/30 hover:scale-105 active:scale-95 shadow-[0_8px_32px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.15)]"
              >
                Try Editor 🎮
              </Link>
            </div>
          </div>

          {/* Right Column: Mascot with Glowing Background */}
          <div className="relative flex justify-center items-center mt-12 lg:mt-0 lg:h-[500px]">
            {/* Glowing Orbit Rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 dark:opacity-40">
              <div className="w-[300px] h-[300px] md:w-[420px] md:h-[420px] rounded-full border-[3px] border-dashed border-white/40 animate-[spin_35s_linear_infinite] shadow-[0_0_35px_rgba(255,255,255,0.2)]"></div>
              <div className="absolute w-[220px] h-[220px] md:w-[310px] md:h-[310px] rounded-full border-[3px] border-white/30 animate-[spin_25s_linear_infinite_reverse]"></div>
            </div>

            {/* Central Robot Mascot */}
            <div className="relative w-[280px] sm:w-[350px] md:w-[420px] z-10 transform hover:-translate-y-3 transition-transform duration-700 ease-out">
              <RobotMascot className="w-full h-auto drop-shadow-2xl filter" />
              <SpeechBubble
                text="Hi! Let's Build! 🚀"
                className="absolute -top-12 -right-4 sm:-top-8 sm:-right-8 md:-right-12 md:-top-12 scale-100 md:scale-110 animate-pop-in drop-shadow-[0_10px_20px_rgba(0,0,0,0.25)]"
                style={{ animationDelay: '0.8s', animationFillMode: 'both' }}
              />
            </div>
          </div>
        </div>

        {/* Curved bottom separator SVG */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none text-playful-light-bg dark:text-[#050B14] transition-colors duration-500">
          <svg
            className="relative block w-full h-[60px] md:h-[90px]"
            data-name="Layer 1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,119.93,193.36,108.99,237.5,101.32,280.4,85.25,321.39,56.44Z"
              fill="currentColor"
            ></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative z-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-black text-tg-dark dark:text-white mb-4 transition-colors">
              Everything you need to{' '}
              <span className="text-playful-secondary dark:text-playful-highlight relative inline-block">
                learn!
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-playful-highlight/40"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 10 Q 50 20 100 10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                </svg>
              </span>
            </h2>
            <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
              Master electronics, coding logic, and robotics through fun visual blocks and real-time
              simulators.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {/* Feature 1 */}
            <div className="bg-white/80 dark:bg-[#0B1121]/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 hover:border-[#4FC3F7] dark:hover:border-[#4FC3F7] transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_30px_60px_rgba(79,195,247,0.15)] dark:hover:shadow-[0_30px_60px_rgba(79,195,247,0.25)] group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#4FC3F7] to-[#0284C7] opacity-80 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 mb-6 bg-gradient-to-br from-[#E1F5FE] to-[#B3E5FC] dark:from-[#4FC3F7]/20 dark:to-[#0284C7]/20 rounded-2xl flex items-center justify-center shadow-inner">
                <BlockCodeIcon className="w-12 h-12 group-hover:animate-wobble drop-shadow-md" />
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-tg-dark dark:text-white mb-3">
                Snap & Code
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                Drag colorful blocks and snap them together to build programs. Perfect for beginners
                to learn logic!
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/80 dark:bg-[#0B1121]/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 hover:border-[#AB47BC] dark:hover:border-[#AB47BC] transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_30px_60px_rgba(171,71,188,0.15)] dark:hover:shadow-[0_30px_60px_rgba(171,71,188,0.25)] group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#AB47BC] to-[#7B1FA2] opacity-80 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 mb-6 bg-gradient-to-br from-[#F3E5F5] to-[#E1BEE7] dark:from-[#AB47BC]/20 dark:to-[#7B1FA2]/20 rounded-2xl flex items-center justify-center shadow-inner">
                <SimulatorIcon className="w-12 h-12 group-hover:animate-wobble drop-shadow-md" />
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-tg-dark dark:text-white mb-3">
                Virtual World
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                Test your code instantly in our cool virtual simulator before trying it on real
                hardware.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/80 dark:bg-[#0B1121]/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 hover:border-[#FBBF24] dark:hover:border-[#FBBF24] transition-all duration-300 hover:-translate-y-3 hover:shadow-[0_30px_60px_rgba(251,191,36,0.15)] dark:hover:shadow-[0_30px_60px_rgba(251,191,36,0.25)] group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] opacity-80 group-hover:opacity-100 transition-opacity"></div>
              <div className="w-20 h-20 mb-6 bg-gradient-to-br from-[#FFF8E1] to-[#FFECB3] dark:from-[#FBBF24]/20 dark:to-[#F59E0B]/20 rounded-2xl flex items-center justify-center shadow-inner">
                <CourseIcon className="w-12 h-12 group-hover:animate-wobble drop-shadow-md" />
              </div>
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-tg-dark dark:text-white mb-3">
                Fun Courses
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed">
                Follow awesome guided adventures from making a blinking light to building an entire
                robot!
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
