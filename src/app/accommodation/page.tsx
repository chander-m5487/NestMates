'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccommodationCard } from '@/components/accommodation/accommodation-card';
import { CreatePostDialog } from '@/components/accommodation/create-post-dialog';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Search, Plus, Home, Building2, Users, Warehouse, Building, MapPin } from 'lucide-react';

interface AccommodationPost {
  id: string;
  propertyType: string;
  title?: string;
  formattedAddress: string;
  city: string;
  zipCode: string;
  description: string;
  rent?: number;
  createdAt: string;
  expiresAt: string;
  user: {
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
  state?: {
    name: string;
    country: { name: string; flag: string };
  };
}

const propertyTypeIcons: Record<string, React.ReactNode> = {
  APARTMENT: <Building2 className="w-4 h-4" />,
  SINGLE_HOME: <Home className="w-4 h-4" />,
  SHARED_HOME: <Users className="w-4 h-4" />,
  TOWNHOME: <Warehouse className="w-4 h-4" />,
  CONDO: <Building className="w-4 h-4" />,
};

export default function AccommodationPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<AccommodationPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [location, setLocation] = useState<{ stateId: string; country: { name: string; flag: string }; stateName?: string } | null>(null);

  useEffect(() => {
    // Get selected location from localStorage
    const stored = localStorage.getItem('selectedLocation');
    if (stored) {
      const loc = JSON.parse(stored);
      setLocation(loc);
    }
  }, []);

  useEffect(() => {
    if (location?.stateId) {
      fetchPosts();
    }
  }, [cityFilter, propertyTypeFilter, location?.stateId]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (cityFilter) params.append('city', cityFilter);
      if (propertyTypeFilter) params.append('propertyType', propertyTypeFilter);
      if (location?.stateId) params.append('stateId', location.stateId);

      const response = await fetch(`/api/accommodation?${params.toString()}`);
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
    post.formattedAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePostCreated = () => {
    setShowCreateDialog(false);
    fetchPosts();
  };

  return (
    <DashboardLayout activeService="accommodation">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Accommodation</h1>
            <p className="text-base text-gray-600 flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {location ? (
                <>Showing posts in {location.country.flag} {location.stateName || location.country.name}</>
              ) : (
                'Select a location to see posts'
              )}
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Create Post
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by address, city, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
              className="h-11 text-base"
            />
          </div>
          <Select value={propertyTypeFilter || "all"} onValueChange={(val) => setPropertyTypeFilter(val === "all" ? "" : val)}>
            <SelectTrigger className="w-full sm:w-48 h-11 text-base">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="APARTMENT">Apartment</SelectItem>
              <SelectItem value="SINGLE_HOME">Single Home</SelectItem>
              <SelectItem value="SHARED_HOME">Shared Home</SelectItem>
              <SelectItem value="TOWNHOME">Townhome</SelectItem>
              <SelectItem value="CONDO">Condo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property type quick filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(propertyTypeIcons).map(([type, icon]) => (
            <button
              key={type}
              onClick={() => setPropertyTypeFilter(propertyTypeFilter === type ? '' : type)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${propertyTypeFilter === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {icon}
              {type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                <div className="h-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <AccommodationCard post={post} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-base text-gray-500 mb-6">
              {searchQuery || propertyTypeFilter
                ? 'Try adjusting your filters'
                : location
                  ? 'Be the first to post an accommodation listing in this area'
                  : 'Select a location to see posts'}
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create First Post
            </Button>
          </div>
        )}
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handlePostCreated}
      />
    </DashboardLayout>
  );
}
