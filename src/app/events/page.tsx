'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { EventCard } from '@/components/events/event-card';
import { CreateEventDialog } from '@/components/events/create-event-dialog';
import { Search, Plus, Calendar, PartyPopper, Briefcase, Users, Mic, Sparkles, MapPin, MoreHorizontal } from 'lucide-react';

interface EventPost {
  id: string;
  title: string;
  description: string;
  eventType: string;
  eventDate: string | null;
  city: string | null;
  venue: string | null;
  contactInfo: string | null;
  createdAt: string;
  user: {
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
}

const eventTypeFilters = [
  { value: 'all', label: 'All Events', icon: Calendar },
  { value: 'COMMUNITY_EVENT', label: 'Community', icon: Users },
  { value: 'CULTURAL_FESTIVAL', label: 'Festival', icon: PartyPopper },
  { value: 'MEETUP', label: 'Meetup', icon: Users },
  { value: 'WORKSHOP', label: 'Workshop', icon: Mic },
  { value: 'SERVICE', label: 'Service', icon: Briefcase },
  { value: 'PERSONAL_AD', label: 'Personal', icon: Sparkles },
  { value: 'OTHER', label: 'Other', icon: MoreHorizontal },
];

export default function EventsPage() {
  const [posts, setPosts] = useState<EventPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [location, setLocation] = useState<{ stateId: string; country: { name: string; flag: string }; stateName?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('selectedLocation');
    if (stored) {
      setLocation(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (location?.stateId) {
      fetchPosts();
    }
  }, [eventTypeFilter, location?.stateId]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventTypeFilter) params.append('eventType', eventTypeFilter);
      if (location?.stateId) params.append('stateId', location.stateId);

      const response = await fetch(`/api/events?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.city && post.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePostCreated = () => {
    setShowCreateDialog(false);
    fetchPosts();
  };

  return (
    <DashboardLayout activeService="events">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events & Personal Ads</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {location ? (
                <>Showing events in {location.country.flag} {location.stateName || location.country.name}</>
              ) : (
                'Select a location to see events'
              )}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Create Post
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
          <Select value={eventTypeFilter || "all"} onValueChange={(val) => setEventTypeFilter(val === "all" ? "" : val)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {eventTypeFilters.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Event type quick filters */}
        <div className="flex flex-wrap gap-2">
          {eventTypeFilters.slice(1).map((type) => (
            <button
              key={type.value}
              onClick={() => setEventTypeFilter(eventTypeFilter === type.value ? '' : type.value)}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-base font-medium transition-all
                ${eventTypeFilter === type.value
                  ? 'bg-accent-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              <type.icon className="w-4 h-4" />
              {type.label}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-16 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EventCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || eventTypeFilter
                ? 'Try adjusting your filters'
                : location
                  ? 'Be the first to post an event in this area'
                  : 'Select a location to see events'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create First Post
            </Button>
          </div>
        )}
      </div>

      {/* Create Post Dialog */}
      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handlePostCreated}
      />
    </DashboardLayout>
  );
}
