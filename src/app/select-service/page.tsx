'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Only housing is available — redirect straight to accommodation
export default function SelectServicePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/accommodation');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}
