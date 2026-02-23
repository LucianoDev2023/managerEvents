/**
 * Centralized utility to map technical errors to user-friendly messages.
 */

export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return 'Ocorreu um erro inesperado.';

  const code = error?.code || error?.message || '';
  const technicalMessage = error?.message || '';

  // Google Sign-In & General Network Errors
  if (
    code === '7' || 
    code === 'NETWORK_ERROR' || 
    technicalMessage.includes('NETWORK_ERROR') ||
    technicalMessage.includes('Network request failed')
  ) {
    return 'Por favor, verifique sua conexão com a internet.';
  }

  // Firebase Firestore Errors
  if (
    code === 'unavailable' || 
    code === 'deadline-exceeded' ||
    technicalMessage.includes('WebChannelConnection RPC') ||
    technicalMessage.includes('transport errored')
  ) {
    return 'Erro de conexão com o servidor. Verifique sua internet.';
  }

  // Permission Errors
  if (code === 'permission-denied' || code === 'auth/permission-denied') {
    return 'Você não tem permissão para realizar esta ação.';
  }

  // Auth Cancelled (Silent return)
  if (code === 'SIGN_IN_CANCELLED' || code === 'auth/cancelled') {
    return 'cancelled';
  }

  return 'Algo deu errado. Tente novamente em instantes.';
};
