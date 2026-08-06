'use client';

import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center px-3 py-2 text-sm text-slate-500 rounded-lg hover:bg-slate-800 hover:text-slate-300 transition-colors text-left"
    >
      Sign out
    </button>
  );
}
