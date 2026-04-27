'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Calendar, Loader2, ArrowDown } from 'lucide-react';

interface CreateRideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRideDialog({ open, onOpenChange, onSuccess }: CreateRideDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stateId, setStateId] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    fromCity: '',
    toCity: '',
    travelDate: '',
    description: '',
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

    if (!formData.title || !formData.fromCity || !formData.toCity || !formData.travelDate || !formData.description) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/rides', {
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
          description: 'Your ride share listing is now live.',
        });
        setFormData({
          title: '',
          fromCity: '',
          toCity: '',
          travelDate: '',
          description: '',
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
          <DialogTitle>Create Ride Share Post</DialogTitle>
          <DialogDescription>
            Share a ride or find travel companions. Your post will be visible for 1 month.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title * <span className="text-sm font-normal text-muted-foreground">({formData.title.length}/50)</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Looking for carpool to LA"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, 50) })}
              maxLength={50}
            />
          </div>

          {/* From City */}
          <div className="space-y-2">
            <Label htmlFor="fromCity" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-green-600" />
              From City *
            </Label>
            <Input
              id="fromCity"
              placeholder="e.g., San Francisco"
              value={formData.fromCity}
              onChange={(e) => setFormData({ ...formData, fromCity: e.target.value })}
            />
          </div>

          <div className="flex justify-center">
            <ArrowDown className="w-5 h-5 text-gray-400" />
          </div>

          {/* To City */}
          <div className="space-y-2">
            <Label htmlFor="toCity" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-600" />
              To City *
            </Label>
            <Input
              id="toCity"
              placeholder="e.g., Los Angeles"
              value={formData.toCity}
              onChange={(e) => setFormData({ ...formData, toCity: e.target.value })}
            />
          </div>

          {/* Travel Date */}
          <div className="space-y-2">
            <Label htmlFor="travelDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Travel Date *
            </Label>
            <Input
              id="travelDate"
              type="date"
              value={formData.travelDate}
              onChange={(e) => setFormData({ ...formData, travelDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your trip - departure time, stops, luggage space, contribution for gas, etc."
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
