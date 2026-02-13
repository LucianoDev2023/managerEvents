import Constants from 'expo-constants';

/**
 * Sistema de Logger que desabilita logs de debug em produção
 * 
 * Uso:
 * import logger from '@/lib/logger';
 * 
 * logger.debug('Mensagem de debug');
 * logger.info('Mensagem informativa');
 * logger.warn('Aviso');
 * logger.error('Erro', errorObject);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    // Detecta se está em desenvolvimento
    this.isDevelopment = __DEV__;
  }

  /**
   * Logs de debug - apenas em desenvolvimento
   * Use para informações detalhadas de debugging
   */
  debug(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Logs informativos - apenas em desenvolvimento
   * Use para informações gerais do fluxo da aplicação
   */
  info(message: string, ...args: any[]) {
    if (this.isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Avisos - exibidos em todos os ambientes
   * Use para situações que merecem atenção mas não são erros
   */
  warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * Erros - exibidos em todos os ambientes
   * Use para erros que precisam ser registrados
   */
  error(message: string, error?: any, ...args: any[]) {
    console.error(`[ERROR] ${message}`, error, ...args);
  }

  /**
   * Log condicional - apenas se a condição for verdadeira
   */
  debugIf(condition: boolean, message: string, ...args: any[]) {
    if (condition && this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log de grupo - agrupa logs relacionados
   */
  group(label: string, callback: () => void) {
    if (this.isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Log de tabela - exibe dados em formato de tabela
   */
  table(data: any) {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  /**
   * Mede o tempo de execução de uma função
   */
  time(label: string) {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string) {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Retorna se está em modo de desenvolvimento
   */
  get isDevMode(): boolean {
    return this.isDevelopment;
  }
}

// Exporta uma instância singleton
const logger = new Logger();

export default logger;
