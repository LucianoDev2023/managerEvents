import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';

/**
 * Hook para navegação inteligente que respeita a origem da navegação.
 * Usado para garantir que o botão "voltar" retorne para a aba correta.
 *
 * @param from - Parâmetro indicando de onde o usuário veio ('calendar', 'seguidos', 'profile')
 * @returns handleGoBack - Função que executa a navegação de volta inteligente
 */
export function useSmartNavigation(from?: string) {
  const handleGoBack = useCallback(() => {
    // eslint-disable-next-line no-console

    // 1. Se temos o parâmetro 'from', usamos ele (mais confiável)
    if (from === 'calendar') {
      router.push('/(tabs)/calendar');
      return;
    }
    if (from === 'seguidos') {
      router.push('/(tabs)/seguidos');
      return;
    }
    if (from === 'profile') {
      router.push('/(tabs)/profile');
      return;
    }

    // 2. Se não tem 'from', tenta o back nativo
    if (router.canGoBack()) {
      router.back();
      return;
    }

    // 3. Último recurso: Home
    router.replace('/(tabs)');
  }, [from]);

  // ✅ Intercepta o botão físico do Android automaticamente
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // eslint-disable-next-line no-console
        handleGoBack();
        return true; // Impede o comportamento padrão
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () =>
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [handleGoBack]),
  );

  return { handleGoBack };
}
