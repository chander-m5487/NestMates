'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Car, Calendar, Globe } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function LandingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.user) {
          // User is logged in, redirect to select-location
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

  // Show nothing while checking auth to prevent flash
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(160deg, #FFB88C 0%, #FFCBA4 12%, #FFE4CC 22%, #FFFFFF 40%, #FFFFFF 60%, #D4EDDA 78%, #A8D5A2 88%, #7BC47F 100%)'
      }}>
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: 'linear-gradient(160deg, #FFB88C 0%, #FFCBA4 12%, #FFE4CC 22%, #FFFFFF 40%, #FFFFFF 60%, #D4EDDA 78%, #A8D5A2 88%, #7BC47F 100%)'
      }}
    >
      {/* Soft watercolor-like blur effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-br from-orange-300/20 via-orange-200/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-tl from-green-400/20 via-green-300/10 to-transparent blur-3xl" />
      </div>
      
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-12 py-4 lg:py-6 gap-6 lg:gap-8 xl:gap-12 max-w-7xl mx-auto">
        {/* Left - Hero Content */}
        <div className="flex-1 max-w-lg xl:max-w-xl">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-2 lg:mb-4"
          >
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-orange-400 to-green-500 flex items-center justify-center shadow-lg">
                <Globe className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
              </div>
              <span className="text-2xl lg:text-3xl font-display font-bold text-gray-800">NestMates</span>
            </div>
          </motion.div>
          
          {/* Main headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-display font-bold leading-tight mb-2 lg:mb-3">
              <span className="text-gray-800">Find Your </span>
              <span className="bg-gradient-to-r from-orange-500 to-green-500 bg-clip-text text-transparent">Home Away</span>
              <br />
              <span className="text-gray-800">From Home</span>
            </h1>
            
            <p className="text-base lg:text-lg xl:text-xl text-gray-700 leading-relaxed mb-1 lg:mb-2 font-semibold">
              Connect with your community wherever life takes you.
            </p>
            
            <p className="text-sm lg:text-base text-gray-600 leading-relaxed mb-4 lg:mb-6">
              Whether you're searching for the perfect roommate, need a ride to the airport, 
              or want to celebrate festivals with people who understand — we've got you covered 
              in <span className="text-orange-500 font-bold">USA</span>, <span className="text-orange-500 font-bold">Canada</span>, <span className="text-green-600 font-bold">UK</span>, <span className="text-green-600 font-bold">Germany</span> & <span className="text-green-600 font-bold">Australia</span>.
            </p>
          </motion.div>
          
          {/* Feature cards - responsive */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-3 gap-2 lg:gap-3"
          >
            <FeatureCard
              icon={<Home className="w-6 h-6 lg:w-8 lg:h-8" />}
              title="Housing"
              description="Find roommates"
              color="orange"
              delay={0}
            />
            <FeatureCard
              icon={<Car className="w-6 h-6 lg:w-8 lg:h-8" />}
              title="Rides"
              description="Share journeys"
              color="neutral"
              delay={0.1}
            />
            <FeatureCard
              icon={<Calendar className="w-6 h-6 lg:w-8 lg:h-8" />}
              title="Events"
              description="Local meetups"
              color="green"
              delay={0.2}
            />
          </motion.div>
        </div>
        
        {/* Right - Auth Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="w-full max-w-xs sm:max-w-sm lg:max-w-md flex-shrink-0"
        >
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-gray-200">
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
  color: 'orange' | 'neutral' | 'green';
  delay: number;
}

function FeatureCard({ icon, title, description, color, delay }: FeatureCardProps) {
  const borderColors = {
    orange: 'border-orange-400 hover:border-orange-500',
    neutral: 'border-gray-300 hover:border-gray-400',
    green: 'border-green-500 hover:border-green-600',
  };

  const iconColors = {
    orange: 'text-orange-500',
    neutral: 'text-gray-600',
    green: 'text-green-600',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6 + delay }}
      className={`p-2 lg:p-4 rounded-lg lg:rounded-xl bg-white/30 backdrop-blur-sm ${borderColors[color]} border-2 hover:scale-105 hover:bg-white/50 transition-all duration-300 text-center`}
    >
      <div className={`mb-1 lg:mb-2 ${iconColors[color]} flex justify-center`}>
        {icon}
      </div>
      <h3 className="font-bold text-xs lg:text-base text-gray-800 mb-0.5 lg:mb-1">{title}</h3>
      <p className="text-[10px] lg:text-sm text-gray-600 hidden sm:block">{description}</p>
    </motion.div>
  );
}
