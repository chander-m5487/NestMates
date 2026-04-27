'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, formatEventType, formatDate } from '@/lib/utils';
import { MapPin, Calendar, Clock, Users, PartyPopper, Briefcase, Mic, Sparkles, ExternalLink } from 'lucide-react';

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

interface EventCardProps {
  post: EventPost;
}

const eventTypeIcons: Record<string, React.ReactNode> = {
  COMMUNITY_EVENT: <Users className="w-4 h-4" />,
  CULTURAL_FESTIVAL: <PartyPopper className="w-4 h-4" />,
  MEETUP: <Users className="w-4 h-4" />,
  WORKSHOP: <Mic className="w-4 h-4" />,
  SERVICE: <Briefcase className="w-4 h-4" />,
  PERSONAL_AD: <Sparkles className="w-4 h-4" />,
  OTHER: <Calendar className="w-4 h-4" />,
};

const eventTypeColors: Record<string, string> = {
  COMMUNITY_EVENT: 'bg-blue-100 text-blue-700',
  CULTURAL_FESTIVAL: 'bg-pink-100 text-pink-700',
  MEETUP: 'bg-green-100 text-green-700',
  WORKSHOP: 'bg-yellow-100 text-yellow-700',
  SERVICE: 'bg-purple-100 text-purple-700',
  PERSONAL_AD: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

export function EventCard({ post }: EventCardProps) {
  return (
    <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        {/* Event type badge */}
        <div className="flex items-center justify-between mb-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${eventTypeColors[post.eventType]}`}>
            {eventTypeIcons[post.eventType]}
            {formatEventType(post.eventType)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg text-foreground leading-tight line-clamp-2">
          {post.title}
        </h3>
      </CardHeader>

      <CardContent className="pb-4 space-y-3">
        {/* Event details */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          {post.eventDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.eventDate, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}
          {post.city && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>{post.city}</span>
            </div>
          )}
        </div>

        {/* Venue */}
        {post.venue && (
          <p className="text-sm text-muted-foreground">
            📍 {post.venue}
          </p>
        )}

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {post.description}
        </p>

        {/* Contact */}
        {post.contactInfo && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Contact:</span> {post.contactInfo}
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-4 border-t flex items-center justify-between">
        {/* User info */}
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs bg-accent-100 text-accent-700">
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
      </CardFooter>
    </Card>
  );
}

