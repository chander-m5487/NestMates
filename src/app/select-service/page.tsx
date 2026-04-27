'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { Home, Car, Calendar, Globe, ArrowRight, MapPin, ChevronLeft, Loader2 } from 'lucide-react';

interface SelectedLocation {
  country: {
    id: string;
    name: string;
    code: string;
    flag: string;
  };
  stateId: string;
  stateName?: string;
}

const services = [
  {
    id: 'accommodation',
    icon: Home,
    title: 'Accommodation',
    description: 'Find apartments, shared homes, and roommates in your area',
    color: 'from-primary-500 to-primary-600',
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    href: '/accommodation',
  },
  {
    id: 'rides',
    icon: Car,
    title: 'Ride Share & Logistics',
    description: 'Share rides, find carpools, and logistics help for moves',
    color: 'from-secondary-500 to-secondary-600',
    bgColor: 'bg-secondary-50',
    textColor: 'text-secondary-600',
    href: '/rides',
  },
  {
    id: 'events',
    icon: Calendar,
    title: 'Events & Personal Ads',
    description: 'Discover community events, festivals, and post personal ads',
    color: 'from-accent-500 to-accent-600',
    bgColor: 'bg-accent-50',
    textColor: 'text-accent-600',
    href: '/events',
  },
];

export default function SelectServicePage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, signOut } = useAuth();
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const stored = localStorage.getItem('selectedLocation');
    if (stored) {
      setLocation(JSON.parse(stored));
    } else {
      router.replace('/select-location');
    }
  }, [router]);

  const handleServiceSelect = (href: string) => {
    router.push(href);
  };

  const handleChangeLocation = () => {
    router.push('/select-location');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const getEmailUsername = (email: string | undefined) => {
    if (!email) return 'user';
    return email.split('@')[0];
  };

  if (authLoading || !location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-cyan-50/30">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-gray-900">NestMates</span>
          </div>
          
          {/* Location indicator */}
          <button
            onClick={handleChangeLocation}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <span className="text-xl">{location.country.flag}</span>
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{location.stateName || location.country.name}</span>
            <ChevronLeft className="w-4 h-4 rotate-[270deg] text-gray-500" />
          </button>

          {/* User Info & Sign Out */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">@{getEmailUsername(user?.email)}</p>
              </div>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary-100 text-primary-700 font-semibold">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <div className="w-16 h-1 rounded bg-primary-500" />
            <div className="w-3 h-3 rounded-full bg-primary-500" />
            <div className="w-16 h-1 rounded bg-primary-500" />
            <div className="w-3 h-3 rounded-full bg-primary-500 animate-pulse" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-900 mb-4">
              What are you looking for?
            </h1>
            <p className="text-gray-600 text-lg">
              Select a service to browse listings in {location.stateName || location.country.name}
            </p>
          </motion.div>

          {/* Service Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <motion.button
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                onClick={() => handleServiceSelect(service.href)}
                onMouseEnter={() => setHoveredService(service.id)}
                onMouseLeave={() => setHoveredService(null)}
                className="group relative text-left"
              >
                <div className={`
                  relative overflow-hidden rounded-2xl bg-white border-2 p-8 transition-all duration-300
                  ${hoveredService === service.id 
                    ? 'border-transparent shadow-2xl -translate-y-2' 
                    : 'border-transparent shadow-sm hover:shadow-lg'
                  }
                `}>
                  {/* Gradient background on hover */}
                  <div className={`
                    absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 transition-opacity duration-300
                    ${hoveredService === service.id ? 'opacity-100' : ''}
                  `} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className={`
                      w-16 h-16 rounded-2xl mb-6 flex items-center justify-center transition-all duration-300
                      ${hoveredService === service.id 
                        ? 'bg-white/20' 
                        : service.bgColor
                      }
                    `}>
                      <service.icon className={`
                        w-8 h-8 transition-colors duration-300
                        ${hoveredService === service.id 
                          ? 'text-white' 
                          : service.textColor
                        }
                      `} />
                    </div>
                    
                    <h3 className={`
                      text-xl font-display font-bold mb-2 transition-colors duration-300
                      ${hoveredService === service.id ? 'text-white' : 'text-gray-900'}
                    `}>
                      {service.title}
                    </h3>
                    
                    <p className={`
                      text-sm leading-relaxed mb-6 transition-colors duration-300
                      ${hoveredService === service.id ? 'text-white/80' : 'text-gray-500'}
                    `}>
                      {service.description}
                    </p>

                    <div className={`
                      inline-flex items-center gap-2 font-medium text-sm transition-all duration-300
                      ${hoveredService === service.id 
                        ? 'text-white' 
                        : service.textColor
                      }
                    `}>
                      Browse Listings
                      <ArrowRight className={`
                        w-4 h-4 transition-transform duration-300
                        ${hoveredService === service.id ? 'translate-x-1' : ''}
                      `} />
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
