import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { DashboardLayout } from '@/components/layout';

export const metadata: Metadata = {
  title: 'Dashboard',
};

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
