import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

/**
 * Shared chrome for every authenticated app route — header, sidebar, country
 * selector, message indicator. Living in a route-group `layout.tsx` means it
 * persists across client-side navigation between /accommodation, /my-posts,
 * /messages, etc., so we no longer flicker as the layout unmounts/remounts on
 * each route change.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
