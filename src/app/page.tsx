'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, CheckCircle2 } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.user) {
          router.replace('/accommodation');
          return;
        }
      } catch {
        // not authenticated — show landing
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #075985 0%, #0284c7 40%, #38bdf8 80%, #e0f2fe 100%)' }}
      >
        <div className="w-9 h-9 border-4 border-white/60 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(145deg, #075985 0%, #0284c7 40%, #38bdf8 80%, #e0f2fe 100%)' }}
    >
      {/* Decorative background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-48 w-[420px] h-[420px] bg-sky-300/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 w-[380px] h-[380px] bg-cyan-200/10 rounded-full blur-3xl" />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center px-5 sm:px-8 lg:px-12 xl:px-20 py-10 lg:py-8 gap-10 lg:gap-16 xl:gap-24 max-w-7xl mx-auto">

        {/* ── Left: Hero ── */}
        <div className="flex-1 max-w-xl xl:max-w-2xl text-center lg:text-left">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="mb-8 lg:mb-10 flex items-center gap-3 justify-center lg:justify-start"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-display font-bold text-white tracking-tight">NestMates</span>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-6"
          >
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-display font-extrabold leading-[1.1] mb-5">
              <span className="text-white drop-shadow-md">Find Your</span>
              <br />
              <span
                className="drop-shadow-md"
                style={{
                  background: 'linear-gradient(90deg, #ffffff 0%, #bae6fd 50%, #ffffff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Next Home
              </span>
              <br />
              <span className="text-white/90 drop-shadow-md">Wherever You Are</span>
            </h1>

            <p className="text-white/75 text-base sm:text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
              A community-driven platform helping people find housing, connect with roommates, and settle in — wherever life takes them.
            </p>
          </motion.div>

          {/* Benefit highlights */}
          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col gap-2 mb-10 text-sm sm:text-base text-white/85 max-w-sm mx-auto lg:mx-0"
          >
            {[
              'Browse housing listings posted by real people in your area',
              'Find roommates and shared spaces that fit your needs',
              'Post your own listing and reach people looking to move',
            ].map((text) => (
              <li key={text} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-200 flex-shrink-0 mt-0.5" />
                <span>{text}</span>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* ── Right: Auth Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.25 }}
          className="w-full max-w-sm sm:max-w-md flex-shrink-0"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-sky-950/25 p-7 sm:p-8 border border-white/60">
            <AuthPanel />
          </div>
        </motion.div>

      </div>
    </div>
  );
}
