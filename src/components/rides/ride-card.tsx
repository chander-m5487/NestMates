'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, formatDate, getDaysUntil, truncate } from '@/lib/utils';
import { MapPin, ArrowRight, Calendar, Users, Clock, MessageCircle } from 'lucide-react';

interface RidePost {
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
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
}

interface RideCardProps {
  post: RidePost;
}

export function RideCard({ post }: RideCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const travelDate = new Date(post.travelDate);
  const isUpcoming = travelDate > new Date();

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          {/* Route */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">From</p>
              <p className="font-semibold text-foreground">{post.fromCity}</p>
            </div>
            <div className="flex-shrink-0 w-12 flex items-center justify-center">
              <div className="w-full h-px bg-secondary-500 relative">
                <ArrowRight className="w-4 h-4 text-secondary-500 absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white" />
              </div>
            </div>
            <div className="flex-1 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">To</p>
              <p className="font-semibold text-foreground">{post.toCity}</p>
            </div>
          </div>

          {/* Date and seats */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.travelDate, { month: 'short', day: 'numeric' })}</span>
            </div>
            {post.seatsAvailable && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-secondary-500" />
                <span className="text-secondary-600 font-medium">
                  {post.seatsAvailable} seat{post.seatsAvailable > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.description}
          </p>
        </CardContent>

        <CardFooter className="pt-4 border-t flex items-center justify-between">
          {/* User info */}
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs bg-secondary-100 text-secondary-700">
                {(post.user.displayName || post.user.email.split('@')[0]).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-medium">
                {post.user.displayName || post.user.email.split('@')[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(post.createdAt)}
              </p>
            </div>
          </div>

          {/* Action button */}
          <Link href={`/rides/${post.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <MessageCircle className="w-4 h-4" />
              Respond
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

