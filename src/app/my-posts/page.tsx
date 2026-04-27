'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import {
  Home,
  Car,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  Loader2,
  X,
} from 'lucide-react';
import Link from 'next/link';

interface Post {
  id: string;
  type: 'accommodation' | 'rides' | 'events';
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  // Accommodation specific
  propertyType?: string;
  formattedAddress?: string;
  city?: string;
  // Rides specific
  fromCity?: string;
  toCity?: string;
  travelDate?: string;
  // Events specific
  title?: string;
  eventType?: string;
  eventDate?: string;
  // Common
  description?: string;
  state?: {
    name: string;
    country: { name: string; flag: string };
  };
}

const typeIcons = {
  accommodation: Home,
  rides: Car,
  events: Calendar,
};

const typeColors = {
  accommodation: 'bg-blue-100 text-blue-700',
  rides: 'bg-green-100 text-green-700',
  events: 'bg-purple-100 text-purple-700',
};

export default function MyPostsPage() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<{
    accommodation: Post[];
    rides: Post[];
    events: Post[];
  }>({ accommodation: [], rides: [], events: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'accommodation' | 'rides' | 'events'>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/my-posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: string, postType: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/${postType}/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Post deleted',
          description: 'Your post has been deleted successfully.',
        });
        // Remove the post from state
        setPosts(prev => ({
          ...prev,
          [postType]: prev[postType as keyof typeof prev].filter(p => p.id !== postId),
        }));
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete post');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete post',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const getAllPosts = () => {
    const all = [
      ...posts.accommodation,
      ...posts.rides,
      ...posts.events,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return all;
  };

  const getFilteredPosts = () => {
    if (activeTab === 'all') return getAllPosts();
    return posts[activeTab] || [];
  };

  const getPostTitle = (post: Post) => {
    if (post.type === 'accommodation') {
      return post.formattedAddress || post.city || 'Accommodation';
    }
    if (post.type === 'rides') {
      return `${post.fromCity} → ${post.toCity}`;
    }
    return post.title || 'Event';
  };

  const getPostSubtitle = (post: Post) => {
    if (post.type === 'accommodation') {
      return post.propertyType?.replace('_', ' ') || '';
    }
    if (post.type === 'rides') {
      return post.travelDate ? format(new Date(post.travelDate), 'MMM d, yyyy') : '';
    }
    return post.eventType?.replace('_', ' ') || '';
  };

  const filteredPosts = getFilteredPosts();
  const totalPosts = posts.accommodation.length + posts.rides.length + posts.events.length;

  return (
    <DashboardLayout activeService="my-posts">
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">My Posts</h1>
          <p className="text-gray-600 text-sm lg:text-base mt-0.5">
            Manage all your listings in one place
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 lg:gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          {(['all', 'accommodation', 'rides', 'events'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-2.5 lg:px-3 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap
                ${activeTab === tab
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="ml-1 lg:ml-2 text-xs lg:text-sm opacity-75">
                ({tab === 'all' ? totalPosts : posts[tab]?.length || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-10 lg:py-16">
            <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 animate-spin text-primary-500" />
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-2 lg:space-y-3">
            {filteredPosts.map((post, index) => {
              const Icon = typeIcons[post.type];
              const isExpired = post.expiresAt && isPast(new Date(post.expiresAt));
              
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`
                    bg-white rounded-lg lg:rounded-xl border p-3 lg:p-4 transition-all hover:shadow-md
                    ${isExpired ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}
                  `}
                >
                  <div className="flex items-start gap-2 lg:gap-3">
                    {/* Icon */}
                    <div className={`p-2 lg:p-2.5 rounded-lg ${typeColors[post.type]}`}>
                      <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm lg:text-base font-semibold text-gray-900 truncate">
                            {getPostTitle(post)}
                          </h3>
                          <p className="text-gray-500 text-xs lg:text-sm">{getPostSubtitle(post)}</p>
                        </div>
                        
                        {/* Status Badge */}
                        {isExpired ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium whitespace-nowrap">
                            <AlertCircle className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-2 lg:gap-3 mt-2 text-xs lg:text-sm text-gray-500">
                        {post.state && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                            {post.state.country.flag} {post.state.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                        {post.expiresAt && !isExpired && (
                          <span className="text-orange-600">
                            Expires {formatDistanceToNow(new Date(post.expiresAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Link href={`/${post.type}/${post.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 lg:h-8 px-2 lg:px-3 text-xs lg:text-sm">
                          <Eye className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 lg:h-8 px-2 lg:px-3 text-xs lg:text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm({ id: post.id, type: post.type })}
                      >
                        <Trash2 className="w-3 h-3 lg:w-4 lg:h-4 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 lg:py-16 bg-white rounded-lg lg:rounded-xl border border-gray-200">
            <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <Home className="w-6 h-6 lg:w-7 lg:h-7 text-gray-400" />
            </div>
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
            <p className="text-gray-500 text-sm mb-4 lg:mb-6">
              Start by creating your first post
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/accommodation">
                <Button variant="outline" className="text-xs lg:text-sm h-8 lg:h-9">Post Accommodation</Button>
              </Link>
              <Link href="/rides">
                <Button variant="outline" className="text-xs lg:text-sm h-8 lg:h-9">Post Ride Share</Button>
              </Link>
              <Link href="/events">
                <Button variant="outline" className="text-xs lg:text-sm h-8 lg:h-9">Post Event</Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg lg:rounded-xl shadow-xl max-w-sm lg:max-w-md w-full p-4 lg:p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Delete Post?</h3>
                <button
                  onClick={() => !isDeleting && setDeleteConfirm(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                  disabled={isDeleting}
                >
                  <X className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500" />
                </button>
              </div>
              
              <p className="text-gray-600 text-sm lg:text-base mb-4">
                Are you sure you want to delete this post? This action cannot be undone.
                {deleteConfirm.type !== 'events' && (
                  <span className="block mt-1.5 text-xs lg:text-sm text-orange-600">
                    Note: All related chats will be automatically deleted after 1 week.
                  </span>
                )}
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-8 lg:h-9 text-xs lg:text-sm"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 h-8 lg:h-9 text-xs lg:text-sm bg-red-500 hover:bg-red-600"
                  onClick={() => handleDelete(deleteConfirm.id, deleteConfirm.type)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3 lg:w-4 lg:h-4 mr-1.5" />
                      Delete
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

