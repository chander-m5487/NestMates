'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Home, Building2, Users, Warehouse, Building, Loader2, DollarSign } from 'lucide-react';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const propertyTypes = [
  { value: 'APARTMENT', label: 'Apartment', icon: Building2, description: 'Standard apartment unit' },
  { value: 'SINGLE_HOME', label: 'Single Home', icon: Home, description: 'Standalone house' },
  { value: 'SHARED_HOME', label: 'Shared Home', icon: Users, description: 'Room in shared house' },
  { value: 'TOWNHOME', label: 'Townhome', icon: Warehouse, description: 'Multi-floor townhouse' },
  { value: 'CONDO', label: 'Condo', icon: Building, description: 'Condominium unit' },
];

// Currency symbols by country code
const currencyByCountry: Record<string, { symbol: string; code: string }> = {
  US: { symbol: '$', code: 'USD' },
  CA: { symbol: 'C$', code: 'CAD' },
  GB: { symbol: '£', code: 'GBP' },
  DE: { symbol: '€', code: 'EUR' },
  AU: { symbol: 'A$', code: 'AUD' },
};

export function CreatePostDialog({ open, onOpenChange, onSuccess }: CreatePostDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [stateId, setStateId] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('US');
  const [formData, setFormData] = useState({
    title: '',
    propertyType: '',
    address: '',
    city: '',
    zipCode: '',
    rent: '',
    description: '',
  });

  useEffect(() => {
    // Get selected location from localStorage
    const stored = localStorage.getItem('selectedLocation');
    if (stored) {
      const location = JSON.parse(stored);
      setStateId(location.stateId);
      setCountryCode(location.country?.code || 'US');
    }
  }, [open]);

  const currency = currencyByCountry[countryCode] || currencyByCountry.US;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.propertyType || !formData.address || !formData.city || !formData.description) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/accommodation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rent: formData.rent ? parseFloat(formData.rent) : null,
          stateId,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Post created!',
          description: 'Your accommodation listing is now live.',
        });
        setFormData({
          title: '',
          propertyType: '',
          address: '',
          city: '',
          zipCode: '',
          rent: '',
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-display">Create Accommodation Post</DialogTitle>
          <DialogDescription>
            List your property to help community members find housing. Your post will be visible for 3 months.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Title * <span className="text-sm font-normal text-muted-foreground">({formData.title.length}/50)</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Cozy 2BR near downtown"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, 50) })}
              maxLength={50}
            />
          </div>

          {/* Property Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Property Type *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {propertyTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, propertyType: type.value })}
                  className={`
                    relative p-4 rounded-xl border-2 text-left transition-all
                    ${formData.propertyType === type.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-200 hover:border-surface-300'
                    }
                  `}
                >
                  <type.icon className={`w-6 h-6 mb-2 ${
                    formData.propertyType === type.value ? 'text-primary-600' : 'text-muted-foreground'
                  }`} />
                  <p className={`font-medium text-sm ${
                    formData.propertyType === type.value ? 'text-primary-700' : ''
                  }`}>
                    {type.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address" className="text-base font-semibold">
              Address *
            </Label>
            <Input
              id="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              icon={<MapPin className="w-4 h-4" />}
            />
            <p className="text-xs text-muted-foreground">
              Enter your property address
            </p>
          </div>

          {/* City, ZIP, and Rent */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-base font-semibold">City *</Label>
              <Input
                id="city"
                placeholder="e.g., San Francisco"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-base font-semibold">ZIP Code</Label>
              <Input
                id="zipCode"
                placeholder="e.g., 94102"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rent" className="text-base font-semibold">Monthly Rent ({currency.code})</Label>
              <Input
                id="rent"
                type="number"
                placeholder={`e.g., 1500`}
                value={formData.rent}
                onChange={(e) => setFormData({ ...formData, rent: e.target.value })}
                icon={<DollarSign className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your property, availability, rules, and any other relevant details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground">
              Include details like rent, utilities, move-in date, house rules, etc.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
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
