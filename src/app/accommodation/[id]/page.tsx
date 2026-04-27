'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useToast } from '@/components/ui/use-toast';
import { formatRelativeTime, formatPropertyType, formatDate, getDaysUntil } from '@/lib/utils';
import {
  MapPin,
  Clock,
  Home,
  Building2,
  Users,
  Warehouse,
  Building,
  MessageCircle,
  Calendar,
  ArrowLeft,
  Flag,
  Share2,
} from 'lucide-react';

interface PostDetail {
  id: string;
  propertyType: string;
  formattedAddress: string;
  city: string;
  zipCode: string | null;
  description: string;
  createdAt: string;
  expiresAt: string;
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

const propertyTypeIcons: Record<string, React.ReactNode> = {
  APARTMENT: <Building2 className="w-5 h-5" />,
  SINGLE_HOME: <Home className="w-5 h-5" />,
  SHARED_HOME: <Users className="w-5 h-5" />,
  TOWNHOME: <Warehouse className="w-5 h-5" />,
  CONDO: <Building className="w-5 h-5" />,
};

export default function AccommodationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const isOwner = session?.user?.id === post?.user.id;

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
    if (!session) {
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
      <DashboardLayout activeService="accommodation">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-200 rounded w-1/4" />
          <div className="h-64 bg-surface-200 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!post) {
    return (
      <DashboardLayout activeService="accommodation">
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
      </DashboardLayout>
    );
  }

  const daysUntilExpiry = getDaysUntil(post.expiresAt);

  return (
    <DashboardLayout activeService="accommodation">
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
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>
                          {post.city}, {post.state.name}, {post.state.country.name} {post.state.country.flag}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Share2 className="w-4 h-4" />
                      </Button>
                      {!isOwner && (
                        <Button variant="ghost" size="icon">
                          <Flag className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Posted {formatRelativeTime(post.createdAt)}</span>
                    </div>
                    <div className={`flex items-center gap-2 ${daysUntilExpiry <= 7 ? 'text-warning' : 'text-muted-foreground'}`}>
                      <Clock className="w-4 h-4" />
                      <span>
                        {daysUntilExpiry > 0
                          ? `Expires in ${daysUntilExpiry} days`
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
                    <Avatar className="w-16 h-16 mx-auto mb-3">
                      <AvatarFallback className="text-lg bg-primary-100 text-primary-700">
                        {(post.user.displayName || post.user.email.split('@')[0]).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">
                      {post.user.displayName || post.user.email.split('@')[0]}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      @{post.user.email.split('@')[0]}
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
          chatId={chatId}
          onClose={() => setShowChat(false)}
          recipientName={post.user.displayName || post.user.email.split('@')[0]}
        />
      )}
    </DashboardLayout>
  );
}

