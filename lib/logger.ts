/**
 * Logger condicional para desenvolvimento
 * Em produção, os logs são silenciados
 */

const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  }
};
