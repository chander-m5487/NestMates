'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow, isPast } from 'date-fns';
import {
  Home,
  MapPin,
  Clock,
  AlertCircle,
  Trash2,
  Eye,
  Loader2,
  X,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface Post {
  id: string;
  type: 'accommodation';
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
  propertyType?: string;
  formattedAddress?: string;
  city?: string;
  state?: string | null;
  country?: string | null;
  description?: string;
}

export default function MyPostsPage() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/my-posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data.accommodation || []);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/accommodation/${postId}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: 'Post deleted', description: 'Your listing has been deleted successfully.' });
        setPosts(prev => prev.filter(p => p.id !== postId));
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

  return (
    <>
      <div className="space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your housing posts</p>
          </div>
          <Link href="/accommodation">
            <Button size="sm" className="gap-1.5 bg-sky-500 hover:bg-sky-600">
              <Plus className="w-4 h-4" />
              New Listing
            </Button>
          </Link>
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post, index) => {
              const isExpired = post.expiresAt && isPast(new Date(post.expiresAt));
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${isExpired ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-sky-100 text-sky-600 flex-shrink-0">
                      <Home className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {post.formattedAddress || post.city || 'Housing Listing'}
                          </h3>
                          <p className="text-gray-500 text-sm">
                            {post.propertyType?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        {isExpired ? (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium whitespace-nowrap">
                            <AlertCircle className="w-3.5 h-3.5" /> Expired
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 text-xs font-medium whitespace-nowrap">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                        {(post.state || post.country) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {[post.state, post.country].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                        </span>
                        {post.expiresAt && !isExpired && (
                          <span className="text-amber-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Expires {formatDistanceToNow(new Date(post.expiresAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Link href={`/accommodation/${post.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                          <Eye className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteConfirm(post.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-sky-50 flex items-center justify-center">
              <Home className="w-7 h-7 text-sky-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No listings yet</h3>
            <p className="text-gray-500 text-sm mb-6">Post your first housing listing to get started</p>
            <Link href="/accommodation">
              <Button className="bg-sky-500 hover:bg-sky-600 gap-2">
                <Plus className="w-4 h-4" />
                Post a Listing
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => !isDeleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Delete Listing?</h3>
                <button onClick={() => !isDeleting && setDeleteConfirm(null)} disabled={isDeleting}
                  className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-gray-600 text-sm mb-1">
                Are you sure you want to delete this listing? This cannot be undone.
              </p>
              <p className="text-amber-600 text-xs mb-4">
                All related chats will be automatically deleted within 48 hours.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-500 hover:bg-red-600"
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Deleting...</> : <><Trash2 className="w-4 h-4 mr-1.5" />Delete</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
