'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const eventTypes = [
  { value: 'COMMUNITY_EVENT', label: 'Community Event' },
  { value: 'CULTURAL_FESTIVAL', label: 'Cultural Festival' },
  { value: 'MEETUP', label: 'Meetup' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'PERSONAL_AD', label: 'Personal Ad' },
  { value: 'OTHER', label: 'Other' },
];

export function CreateEventDialog({ open, onOpenChange, onSuccess }: CreateEventDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stateId, setStateId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: '',
  });

  useEffect(() => {
    const stored = localStorage.getItem('selectedLocation');
    if (stored) {
      const location = JSON.parse(stored);
      setStateId(location.stateId);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.eventType) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          stateId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Post created!',
          description: 'Your event is now live.',
        });
        setFormData({
          title: '',
          description: '',
          eventType: '',
        });
        onSuccess();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create post');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Event / Ad</DialogTitle>
          <DialogDescription>
            Post a community event, workshop, or personal ad.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="eventType">Post Type *</Label>
            <Select
              value={formData.eventType}
              onValueChange={(value) => setFormData({ ...formData, eventType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Diwali Celebration 2024"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your event or ad in detail..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[100px]"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Post'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
