'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-ghost text-xs px-2.5 py-1.5"
      disabled={pending}
      onClick={() => start(async () => {
        await createClient().auth.signOut();
        router.replace('/login');
        router.refresh();
      })}
    >
      {pending ? '…' : 'Wyloguj'}
    </button>
  );
}
