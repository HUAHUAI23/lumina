import { Image, LayoutDashboard, Library, Settings, Video, Wallet } from 'lucide-react';

import { ChartDataPoint, CreditPackage, Transaction } from './types';

export const APP_NAME = "Lumina";

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create', label: 'Video Studio', icon: Video },
  { id: 'image-studio', label: 'Image Studio', icon: Image },
  { id: 'assets', label: 'Assets', icon: Library },
  { id: 'billing', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    credits: 500,
    price: 10,
    description: 'Perfect for trying out basic video generation.'
  },
  {
    id: 'creator',
    credits: 1200,
    price: 20,
    originalPrice: 24,
    popular: true,
    description: 'Most popular for content creators. +20% Bonus.'
  },
  {
    id: 'pro',
    credits: 3500,
    price: 50,
    originalPrice: 70,
    description: 'For heavy usage and high-quality 4K rendering. +40% Bonus.'
  },
  {
    id: 'agency',
    credits: 8000,
    price: 100,
    originalPrice: 160,
    description: 'Best value for agencies and teams. Double credits.'
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'tx_1', date: '2024-03-10', description: 'Credit Top-up (Creator Pack)', amount: 20, credits: 1200, status: 'completed' },
  { id: 'tx_2', date: '2024-03-08', description: 'Video Generation (Project Alpha)', amount: 0, credits: -45, status: 'completed' },
  { id: 'tx_3', date: '2024-03-05', description: 'Video Generation (Marketing Clip)', amount: 0, credits: -120, status: 'completed' },
  { id: 'tx_4', date: '2024-03-01', description: 'Credit Top-up (Starter Pack)', amount: 10, credits: 500, status: 'completed' },
];

export const MOCK_USAGE_HISTORY: ChartDataPoint[] = [
  { label: 'Mon', value: 120 },
  { label: 'Tue', value: 250 },
  { label: 'Wed', value: 180 },
  { label: 'Thu', value: 320 },
  { label: 'Fri', value: 450 },
  { label: 'Sat', value: 150 },
  { label: 'Sun', value: 80 },
];

export const MOCK_RECHARGE_HISTORY: ChartDataPoint[] = [
  { label: 'Jan', value: 50 },
  { label: 'Feb', value: 0 },
  { label: 'Mar', value: 100 },
  { label: 'Apr', value: 20 },
  { label: 'May', value: 200 },
  { label: 'Jun', value: 50 },
  { label: 'Jul', value: 100 },
];