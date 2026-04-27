'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RideCard } from '@/components/rides/ride-card';
import { CreateRideDialog } from '@/components/rides/create-ride-dialog';
import { Search, Plus, Car, MapPin } from 'lucide-react';

interface RidePost {
  id: string;
  title?: string;
  fromCity: string;
  fromAddress: string;
  toCity: string;
  toAddress: string;
  travelDate: string;
  description: string;
  seatsAvailable: number | null;
  createdAt: string;
  expiresAt: string;
  user: {
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
}

export default function RidesPage() {
  const [posts, setPosts] = useState<RidePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
  }, [location?.stateId]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (location?.stateId) params.append('stateId', location.stateId);
      
      const response = await fetch(`/api/rides?${params.toString()}`);
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
    post.fromCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.toCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePostCreated = () => {
    setShowCreateDialog(false);
    fetchPosts();
  };

  return (
    <DashboardLayout activeService="rides">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ride Share</h1>
            <p className="text-gray-600 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {location ? (
                <>Showing rides in {location.country.flag} {location.stateName || location.country.name}</>
              ) : (
                'Select a location to see rides'
              )}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Create Post
          </Button>
        </div>

        {/* Search */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by city or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                  <div className="h-6 bg-gray-200 rounded w-6" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-16 bg-gray-200 rounded" />
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
                <RideCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Car className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No rides found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? 'Try adjusting your search'
                : location
                  ? 'Be the first to post a ride share in this area'
                  : 'Select a location to see rides'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create First Post
            </Button>
          </div>
        )}
      </div>

      {/* Create Post Dialog */}
      <CreateRideDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handlePostCreated}
      />
    </DashboardLayout>
  );
}
