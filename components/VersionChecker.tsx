import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

type VersionCheckerProps = {
  children: React.ReactNode;
  /**
   * Se true, verifica versão mesmo em desenvolvimento (útil para testes)
   * @default false
   */
  enableInDev?: boolean;
};

/**
 * Componente que verifica a versão do app ao montar
 * e mostra um loading enquanto verifica.
 * 
 * Uso:
 * ```tsx
 * <VersionChecker>
 *   <App />
 * </VersionChecker>
 * ```
 * 
 * Para testar em desenvolvimento:
 * ```tsx
 * <VersionChecker enableInDev={true}>
 *   <App />
 * </VersionChecker>
 * ```
 */
/**
 * Componente que verifica a versão do app ao montar.
 * Não bloqueia a renderização - verifica em background.
 * 
 * Uso:
 * ```tsx
 * <VersionChecker enableInDev={true}>
 *   <App />
 * </VersionChecker>
 * ```
 */
export function VersionChecker({ children, enableInDev = false }: VersionCheckerProps) {
  // Apenas inicia a verificação, não bloqueia renderização
  useVersionCheck(enableInDev);

  // Sempre renderiza os children imediatamente
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
});
