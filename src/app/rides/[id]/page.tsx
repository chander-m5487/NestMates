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
import { formatRelativeTime, formatDate, getDaysUntil } from '@/lib/utils';
import {
  MapPin,
  Clock,
  Car,
  Calendar,
  Users,
  ArrowLeft,
  ArrowRight,
  MessageCircle,
  Flag,
  Share2,
} from 'lucide-react';

interface RideDetail {
  id: string;
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

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const isOwner = session?.user?.id === ride?.user.id;

  useEffect(() => {
    fetchRide();
  }, [params.id]);

  const fetchRide = async () => {
    try {
      const response = await fetch(`/api/rides/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setRide(data.post);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load ride details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch ride:', error);
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
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: params.id,
          postType: 'logistics',
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
      <DashboardLayout activeService="rides">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-200 rounded w-1/4" />
          <div className="h-64 bg-surface-200 rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!ride) {
    return (
      <DashboardLayout activeService="rides">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Ride not found</h2>
          <p className="text-muted-foreground mb-4">
            This listing may have been removed or expired.
          </p>
          <Button onClick={() => router.push('/rides')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Rides
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const daysUntilExpiry = getDaysUntil(ride.expiresAt);
  const travelDate = new Date(ride.travelDate);
  const isUpcoming = travelDate > new Date();

  return (
    <DashboardLayout activeService="rides">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/rides')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Rides
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
                  {/* Route visualization */}
                  <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-secondary-50 to-primary-50 rounded-xl mb-4">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">From</p>
                      <p className="text-xl font-bold text-secondary-700">{ride.fromCity}</p>
                      <p className="text-sm text-muted-foreground">{ride.fromAddress}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-16 h-0.5 bg-gradient-to-r from-secondary-500 to-primary-500 relative">
                        <Car className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-secondary-600 bg-white p-0.5 rounded" />
                      </div>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">To</p>
                      <p className="text-xl font-bold text-primary-700">{ride.toCity}</p>
                      <p className="text-sm text-muted-foreground">{ride.toAddress}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    {!isOwner && (
                      <Button variant="ghost" size="icon">
                        <Flag className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Trip details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-secondary-500" />
                      <div>
                        <p className="text-xs text-muted-foreground">Travel Date</p>
                        <p className="font-semibold">
                          {formatDate(ride.travelDate, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    {ride.seatsAvailable && (
                      <div className="flex items-center gap-3 p-4 bg-surface-50 rounded-lg">
                        <Users className="w-5 h-5 text-primary-500" />
                        <div>
                          <p className="text-xs text-muted-foreground">Seats Available</p>
                          <p className="font-semibold">{ride.seatsAvailable}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>Posted {formatRelativeTime(ride.createdAt)}</span>
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
                      {ride.description}
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
                      <AvatarFallback className="text-lg bg-secondary-100 text-secondary-700">
                        {(ride.user.displayName || ride.user.email.split('@')[0]).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <h3 className="font-semibold">
                      {ride.user.displayName || ride.user.email.split('@')[0]}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      @{ride.user.email.split('@')[0]}
                    </p>

                    {!isOwner && (
                      <Button onClick={handleRespond} className="w-full gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Send Message
                      </Button>
                    )}

                    {isOwner && (
                      <div className="p-3 bg-secondary-50 rounded-lg text-sm text-secondary-700">
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
                    <li>• Verify the driver's identity before the trip</li>
                    <li>• Share your trip details with someone</li>
                    <li>• Meet at a public location</li>
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
          recipientName={ride.user.displayName || ride.user.email.split('@')[0]}
        />
      )}
    </DashboardLayout>
  );
}

