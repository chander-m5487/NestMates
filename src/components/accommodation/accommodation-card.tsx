'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatRelativeTime, formatPropertyType, getDaysUntil, truncate } from '@/lib/utils';
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
} from 'lucide-react';

interface AccommodationPost {
  id: string;
  title?: string;
  propertyType: string;
  formattedAddress: string;
  city: string;
  zipCode: string;
  rent?: number;
  description: string;
  createdAt: string;
  expiresAt: string;
  user: {
    uniqueUserId: string;
    displayName: string | null;
    email: string;
  };
  state?: {
    country: {
      code: string;
    };
  };
}

// Currency symbols by country code
const currencyByCountry: Record<string, string> = {
  US: '$',
  CA: 'C$',
  GB: '£',
  DE: '€',
  AU: 'A$',
};

interface AccommodationCardProps {
  post: AccommodationPost;
}

const propertyTypeIcons: Record<string, React.ReactNode> = {
  APARTMENT: <Building2 className="w-4 h-4" />,
  SINGLE_HOME: <Home className="w-4 h-4" />,
  SHARED_HOME: <Users className="w-4 h-4" />,
  TOWNHOME: <Warehouse className="w-4 h-4" />,
  CONDO: <Building className="w-4 h-4" />,
};

const propertyTypeColors: Record<string, string> = {
  APARTMENT: 'bg-blue-100 text-blue-700',
  SINGLE_HOME: 'bg-green-100 text-green-700',
  SHARED_HOME: 'bg-purple-100 text-purple-700',
  TOWNHOME: 'bg-orange-100 text-orange-700',
  CONDO: 'bg-cyan-100 text-cyan-700',
};

export function AccommodationCard({ post }: AccommodationCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const daysUntilExpiry = getDaysUntil(post.expiresAt);
  const isExpiringSoon = daysUntilExpiry <= 7;
  
  // Get currency symbol based on country
  const currencySymbol = currencyByCountry[post.state?.country?.code || 'US'] || '$';

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          {/* Property type badge and rent */}
          <div className="flex items-center justify-between mb-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${propertyTypeColors[post.propertyType]}`}>
              {propertyTypeIcons[post.propertyType]}
              {formatPropertyType(post.propertyType)}
            </span>
            {post.rent ? (
              <span className="text-lg font-bold text-primary-600">
                {currencySymbol}{post.rent.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
              </span>
            ) : isExpiringSoon ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                <Clock className="w-3 h-3" />
                {daysUntilExpiry}d left
              </span>
            ) : null}
          </div>

          {/* Title */}
          {post.title && (
            <h3 className="font-semibold text-lg text-foreground mb-2">
              {post.title}
            </h3>
          )}

          {/* Address */}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground">
                {truncate(post.formattedAddress, 40)}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.city}{post.zipCode ? `, ${post.zipCode}` : ''}
              </p>
            </div>
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
              <AvatarFallback className="text-xs bg-primary-100 text-primary-700">
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
          <Link href={`/accommodation/${post.id}`}>
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

