'use client';

import { ReactNode, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import {
  Globe,
  Home,
  Car,
  Calendar,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  MapPin,
  ChevronDown,
  Loader2,
  FileText,
  User,
} from 'lucide-react';
import { MessageIndicator } from '@/components/messages/message-indicator';

interface DashboardLayoutProps {
  children: ReactNode;
  activeService?: 'accommodation' | 'rides' | 'events' | 'my-posts';
}

const navigation = [
  { id: 'accommodation', label: 'Accommodation', icon: Home, href: '/accommodation' },
  { id: 'rides', label: 'Ride Share', icon: Car, href: '/rides' },
  { id: 'events', label: 'Events', icon: Calendar, href: '/events' },
  { id: 'my-posts', label: 'My Posts', icon: FileText, href: '/my-posts' },
];

export function DashboardLayout({ children, activeService }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [location, setLocation] = useState<{ country: { name: string; flag: string }; stateId: string } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedLocation');
    if (stored) {
      setLocation(JSON.parse(stored));
    }
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between h-12 lg:h-14 px-3 lg:px-6">
          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/select-location" className="flex items-center gap-2">
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Globe className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
              </div>
              <span className="text-lg lg:text-xl font-display font-bold text-gray-900 hidden sm:block">NestMates</span>
            </Link>
          </div>

          {/* Location Indicator */}
          {location && (
            <button
              onClick={() => router.push('/select-location')}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <span className="text-base lg:text-lg">{location.country.flag}</span>
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-sm lg:text-base font-medium text-gray-700">{location.country.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Messages */}
            <MessageIndicator />

            {/* User Menu */}
            <div className="relative ml-1 lg:ml-2 pl-2 lg:pl-3 border-l border-gray-200" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm lg:text-base font-semibold text-gray-900 leading-tight">
                    {user?.displayName || user?.name || 'User'}
                  </p>
                  <p className="text-xs lg:text-sm text-gray-500 leading-tight">
                    @{user?.email?.split('@')[0] || 'user'}
                  </p>
                </div>
                <Avatar className="w-8 h-8 lg:w-9 lg:h-9">
                  <AvatarFallback className="bg-primary-100 text-primary-700 text-sm lg:text-base font-semibold">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                  >
                    {/* User Info */}
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {user?.displayName || user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user?.email || 'No email'}
                      </p>
                    </div>

                    {/* Sign Out */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleSignOut();
                        }}
                        className="flex items-center gap-2 px-3 py-2 w-full text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sign Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Service Navigation */}
        <div className="hidden lg:block border-t border-gray-100">
          <nav className="flex items-center gap-1 px-6 h-10 lg:h-11">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    flex items-center gap-1.5 lg:gap-2 px-3 lg:px-4 py-1.5 lg:py-2 rounded-lg text-sm lg:text-base font-medium transition-all
                    ${isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <item.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden shadow-xl"
          >
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-display font-bold text-gray-900">NestMates</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="p-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-all
                      ${isActive
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  href="/messages"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  <MessageSquare className="w-5 h-5" />
                  Messages
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setIsSidebarOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </nav>
          </motion.aside>
        </>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 lg:px-6 py-4 lg:py-6">
        {children}
      </main>
    </div>
  );
}
