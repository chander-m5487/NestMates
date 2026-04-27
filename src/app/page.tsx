'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Globe, Search, MapPin, Shield } from 'lucide-react';
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
          router.replace('/select-location');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
      setIsChecking(false);
    };
    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #3b82f6 70%, #93c5fd 100%)' }}>
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #3b82f6 70%, #93c5fd 100%)' }}
    >
      {/* Subtle radial glow effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-blue-300/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-12 py-8 lg:py-6 gap-8 lg:gap-12 xl:gap-16 max-w-7xl mx-auto">

        {/* Left — Hero Content */}
        <div className="flex-1 max-w-lg xl:max-w-xl">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 lg:mb-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 lg:w-13 lg:h-13 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
                <Home className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
              </div>
              <span className="text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">NestMates</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6 lg:mb-8"
          >
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-display font-bold leading-tight mb-4">
              <span className="text-white">Find Your </span>
              <span className="text-blue-200">Perfect Home</span>
              <br />
              <span className="text-white">Wherever You Are</span>
            </h1>

            <p className="text-blue-100 text-base lg:text-lg leading-relaxed mb-2 font-medium">
              The trusted housing platform for immigrants and international students.
            </p>
            <p className="text-blue-200/80 text-sm lg:text-base leading-relaxed">
              Find apartments, shared homes, and roommates in{' '}
              <span className="text-white font-semibold">USA</span>,{' '}
              <span className="text-white font-semibold">Canada</span>,{' '}
              <span className="text-white font-semibold">UK</span>,{' '}
              <span className="text-white font-semibold">Germany</span> &{' '}
              <span className="text-white font-semibold">Australia</span>.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-3"
          >
            <FeatureCard icon={<Search className="w-5 h-5 lg:w-6 lg:h-6" />}   title="Search"    description="Browse listings"  delay={0} />
            <FeatureCard icon={<MapPin className="w-5 h-5 lg:w-6 lg:h-6" />}   title="Location"  description="Find by area"     delay={0.1} />
            <FeatureCard icon={<Shield className="w-5 h-5 lg:w-6 lg:h-6" />}   title="Trusted"   description="Verified users"   delay={0.2} />
          </motion.div>
        </div>

        {/* Right — Auth Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-xs sm:max-w-sm lg:max-w-md flex-shrink-0"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8 border border-blue-100">
            <AuthPanel />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 + delay }}
      className="p-3 lg:p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 text-center"
    >
      <div className="mb-2 text-blue-200 flex justify-center">{icon}</div>
      <h3 className="font-bold text-xs lg:text-sm text-white mb-0.5">{title}</h3>
      <p className="text-[10px] lg:text-xs text-blue-200/80 hidden sm:block">{description}</p>
    </motion.div>
  );
}
