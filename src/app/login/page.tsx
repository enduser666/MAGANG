'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LoginForm = dynamic(() => import('./LoginForm'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex justify-center items-center bg-[#F8FAFC] dark:bg-[#0B0F19]">
      <Loader2 className="h-8 w-8 animate-spin text-[#1D4ED8]" />
    </div>
  )
});

export default function Page() {
  return <LoginForm />;
}
