// app/(auth)/invite.tsx
import { useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthListener } from '@/hooks/useAuthListener';

export default function InviteEntry() {
  const { k } = useLocalSearchParams<{ k?: string }>();

  const resolvedKey = useMemo(() => {
    return typeof k === 'string' ? k.trim() : '';
  }, [k]);

  // ✅ use o seu hook reativo
  const { user, authLoading } = useAuthListener();
  const uid = user?.uid ?? '';

  // ✅ trava por chave (evita reexecutar em remount / re-render)
  const redirectedForKey = useRef<string | null>(null);

  useEffect(() => {
    // 1) espera auth estabilizar
    if (authLoading) return;

    // 2) evita repetir redirect pra mesma key
    if (redirectedForKey.current === resolvedKey) return;

    // 3) key inválida -> landing
    if (!resolvedKey) {
      redirectedForKey.current = resolvedKey;
      router.replace('/(auth)/landing');
      return;
    }

    // 4) sem login -> gate (login/signup)
    if (!uid) {
      redirectedForKey.current = resolvedKey;
      router.replace({
        pathname: '/(auth)/invite-gate',
        params: { k: resolvedKey },
      } as any);
      return;
    }

    // 5) logado -> preview
    redirectedForKey.current = resolvedKey;
    router.replace({
      pathname: '/(auth)/invite-preview',
      params: { k: resolvedKey },
    } as any);
  }, [resolvedKey, uid, authLoading]);

  return null;
}
