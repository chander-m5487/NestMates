'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useToast } from '@/components/ui/use-toast';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  Share2,
  Users,
  Tag,
  Mail,
  Sparkles,
  PartyPopper,
  Briefcase,
  Mic,
} from 'lucide-react';

interface EventDetail {
  id: string;
  title: string;
  description: string;
  eventType: string;
  eventDate: string | null;
  city: string | null;
  venue: string | null;
  contactInfo: string | null;
  createdAt: string;
  expiresAt: string | null;
  user: {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
  state: {
    name: string;
    country: {
      name: string;
      flag: string;
    };
  };
}

const eventTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  COMMUNITY_EVENT:    { label: 'Community Event',    icon: Users,        color: 'text-blue-600',   bg: 'bg-blue-50' },
  CULTURAL_FESTIVAL:  { label: 'Cultural Festival',  icon: PartyPopper,  color: 'text-purple-600', bg: 'bg-purple-50' },
  MEETUP:             { label: 'Meetup',             icon: Users,        color: 'text-green-600',  bg: 'bg-green-50' },
  WORKSHOP:           { label: 'Workshop',           icon: Briefcase,    color: 'text-orange-600', bg: 'bg-orange-50' },
  PERSONAL_AD:        { label: 'Personal Ad',        icon: Sparkles,     color: 'text-pink-600',   bg: 'bg-pink-50' },
  SERVICE:            { label: 'Service',            icon: Briefcase,    color: 'text-cyan-600',   bg: 'bg-cyan-50' },
  OTHER:              { label: 'Other',              icon: Mic,          color: 'text-gray-600',   bg: 'bg-gray-50' },
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data.post);
      } else {
        toast({ title: 'Error', description: 'Failed to load event details', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Copied!', description: 'Link copied to clipboard' });
    } catch {
      toast({ title: 'Share', description: window.location.href });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout activeService="events">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!event) {
    return (
      <DashboardLayout activeService="events">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Event not found</h2>
          <p className="text-gray-500 mb-4">This event may have been removed or expired.</p>
          <Button onClick={() => router.push('/events')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const typeConfig = eventTypeConfig[event.eventType] || eventTypeConfig.OTHER;
  const TypeIcon = typeConfig.icon;
  const posterName = event.user.displayName || event.user.email.split('@')[0];

  return (
    <DashboardLayout activeService="events">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => router.push('/events')} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="pt-6 space-y-6">
                  {/* Event type badge + title */}
                  <div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${typeConfig.bg} ${typeConfig.color} mb-3`}>
                      <TypeIcon className="w-3.5 h-3.5" />
                      {typeConfig.label}
                    </span>
                    <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
                  </div>

                  {/* Meta grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.eventDate && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-primary-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Event Date</p>
                          <p className="font-semibold text-sm">
                            {formatDate(event.eventDate, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    )}
                    {(event.city || event.venue) && (
                      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-accent-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="font-semibold text-sm">
                            {event.venue ? `${event.venue}${event.city ? `, ${event.city}` : ''}` : event.city}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-secondary-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Region</p>
                        <p className="font-semibold text-sm">
                          {event.state.country.flag} {event.state.name}, {event.state.country.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Posted</p>
                        <p className="font-semibold text-sm">{formatRelativeTime(event.createdAt)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="font-semibold text-gray-900 mb-3">Details</h2>
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {event.description}
                    </p>
                  </div>

                  {/* Contact */}
                  {event.contactInfo && (
                    <div className="flex items-start gap-3 p-4 bg-primary-50 rounded-lg border border-primary-100">
                      <Mail className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-primary-700 font-semibold mb-1">Contact Information</p>
                        <p className="text-sm text-primary-800 break-all">{event.contactInfo}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Poster card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="text-lg bg-accent-100 text-accent-700 font-bold">
                      {posterName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-gray-900">{posterName}</h3>
                  <p className="text-sm text-gray-500 mb-4">@{event.user.email.split('@')[0]}</p>
                  <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Share Event
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Event type info */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gray-50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Category
                  </h3>
                  <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${typeConfig.bg} ${typeConfig.color}`}>
                    <TypeIcon className="w-4 h-4" />
                    {typeConfig.label}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
