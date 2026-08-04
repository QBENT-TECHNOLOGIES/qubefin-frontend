import { Component } from '@angular/core';

@Component({
  selector: 'qfin-profile',
  imports: [],
  templateUrl: './profile.html',
  styles: `
    .animate-fade-in {
      animation: fadeIn 0.6s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `,
})
export class Profile {
  user = {
    name: 'Eleanor Pena',
    role: 'Premium Investor',
    location: 'San Francisco, CA',
    email: 'eleanor.pena@example.com',
    phone: '+1 (555) 123-4567',
    joinDate: 'September 2024',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=387&q=80',
    bio: 'Experienced investor focusing on tech stocks and crypto assets. Exploring decentralized finance and emerging market trends.'
  };

  stats = [
    {
      label: 'Total Balance',
      value: '$124,500.00',
      trend: 12.5,
      colorClass: 'from-primary-400 to-primary-600',
      iconColorClass: 'text-primary-500',
      svgIcon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    },
    {
      label: 'Active Investments',
      value: '24',
      trend: 4.2,
      colorClass: 'from-secondary-400 to-secondary-600',
      iconColorClass: 'text-secondary-500',
      svgIcon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>'
    }
  ];

  recentActivities = [
    {
      id: 1,
      type: 'deposit',
      title: 'Deposit',
      description: 'From Chase Bank',
      date: 'Today, 10:23 AM',
      amount: '+$5,000.00',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path></svg>'
    },
    {
      id: 2,
      type: 'trade',
      title: 'Bought AAPL',
      description: '10 Shares @ $150.23',
      date: 'Yesterday, 2:45 PM',
      amount: '$1,502.30',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>'
    },
    {
      id: 3,
      type: 'withdrawal',
      title: 'Withdrawal',
      description: 'To PayPal Account',
      date: 'Oct 24, 2025',
      amount: '-$850.00',
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path></svg>'
    }
  ];
}
