'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useToast } from '@/components/ui/use-toast';
import { formatRelativeTime, formatLocalTimestamp, formatPropertyType, getDaysUntil } from '@/lib/utils';
import {
  MapPin,
  Clock,
  Home,
  Building2,
  Warehouse,
  Building,
  MessageCircle,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { UserProfilePopup } from '@/components/profile/user-profile-popup';

interface PostDetail {
  id: string;
  title?: string;
  propertyType: string;
  formattedAddress: string;
  city: string;
  state?: string | null;
  country?: string | null;
  zipCode: string | null;
  rent?: number | null;
  description: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  manualPin?: boolean;
  user: {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
  };
}

const propertyTypeIcons: Record<string, React.ReactNode> = {
  APARTMENT: <Building2 className="w-5 h-5" />,
  SINGLE_HOME: <Home className="w-5 h-5" />,
  TOWNHOME: <Warehouse className="w-5 h-5" />,
  CONDO: <Building className="w-5 h-5" />,
};

export default function AccommodationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  const isOwner = !!(user && post && user.uniqueUserId === post.user.uniqueUserId);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/accommodation/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setPost(data.post);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load post',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to respond to this post',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create or get existing chat
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: params.id,
          postType: 'accommodation',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setChatId(data.chat.id);
        setShowChat(true);
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-surface-200 rounded w-1/4" />
        <div className="h-64 bg-surface-200 rounded-xl" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold mb-2">Post not found</h2>
        <p className="text-muted-foreground mb-4">
          This listing may have been removed or expired.
        </p>
        <Button onClick={() => router.push('/accommodation')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Listings
        </Button>
      </div>
    );
  }

  const daysUntilExpiry = getDaysUntil(post.expiresAt);

  return (
    <>
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/accommodation')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Listings
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      {/* Property type */}
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        {propertyTypeIcons[post.propertyType]}
                        <span className="font-medium">
                          {formatPropertyType(post.propertyType)}
                        </span>
                      </div>
                      
                      {/* Address */}
                      <h1 className="text-2xl font-display font-bold mb-2">
                        {post.formattedAddress}
                      </h1>
                      {post.manualPin && (
                        <p className="text-sm text-amber-600 mb-3 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 shrink-0" />
                          User manually pinned location on map
                        </p>
                      )}
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {[post.city, post.state, post.country].filter(Boolean).join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* No share/flag actions */}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div
                      className="flex items-center gap-2 text-muted-foreground"
                      title={formatLocalTimestamp(post.createdAt)}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Posted {formatRelativeTime(post.createdAt)}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${daysUntilExpiry <= 7 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                      <Clock className="w-4 h-4" />
                      <span>
                        {daysUntilExpiry > 0
                          ? `Auto expires in ${daysUntilExpiry} days with chats`
                          : 'Expired'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <h2 className="font-semibold mb-3">Description</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Owner card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowProfilePopup(true)}
                      className="block mx-auto mb-3 hover:opacity-75 transition-opacity"
                      title="View profile"
                    >
                      <Avatar className="w-16 h-16 mx-auto">
                        <AvatarFallback className="text-lg bg-primary-100 text-primary-700">
                          {(post.user.displayName || post.user.uniqueUserId).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowProfilePopup(true)}
                      className="font-semibold hover:underline underline-offset-2 transition-colors hover:text-sky-600"
                      title="View profile"
                    >
                      {post.user.displayName || post.user.uniqueUserId}
                    </button>
                    <p className="text-sm text-muted-foreground mb-4">
                      @{post.user.uniqueUserId}
                    </p>

                    {!isOwner && (
                      <Button onClick={handleRespond} className="w-full gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Send Message
                      </Button>
                    )}

                    {isOwner && (
                      <div className="p-3 bg-primary-50 rounded-lg text-sm text-primary-700">
                        This is your listing
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Safety tips */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-surface-50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Safety Tips</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Always meet in a public place first</li>
                    <li>• Visit the property before making any payments</li>
                    <li>• Never wire money to strangers</li>
                    <li>• Trust your instincts</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {showChat && chatId && (
        <ChatPanel
          key={chatId}
          chatId={chatId}
          onClose={() => setShowChat(false)}
          recipientName={post.user.displayName || post.user.uniqueUserId}
          postExpiresAt={post.expiresAt}
          postIsActive={post.isActive}
        />
      )}

      {/* Profile Popup */}
      {showProfilePopup && (
        <UserProfilePopup
          userId={post.user.id}
          onClose={() => setShowProfilePopup(false)}
        />
      )}
    </>
  );
}

