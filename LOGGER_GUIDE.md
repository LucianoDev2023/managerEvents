# Guia de Uso do Logger

## 📋 Visão Geral

O sistema de logger foi criado para **desabilitar automaticamente logs de debug em produção**, melhorando a performance e segurança do app.

---

## 🚀 Como Usar

### Importar o Logger

```typescript
import { logger } from '@/lib/logger';
```

### Métodos Disponíveis

#### 1. **debug()** - Apenas em Desenvolvimento
Use para informações detalhadas de debugging que não devem aparecer em produção:

```typescript
logger.debug('Usuário clicou no botão', { userId: 123 });
logger.debug('Estado atual:', currentState);
```

#### 2. **info()** - Apenas em Desenvolvimento
Use para informações gerais do fluxo da aplicação:

```typescript
logger.info('Iniciando upload de imagem');
logger.info('Dados carregados com sucesso');
```

#### 3. **warn()** - Todos os Ambientes
Use para situações que merecem atenção mas não são erros:

```typescript
logger.warn('API key não encontrada, usando fallback');
logger.warn('Limite de requisições próximo');
```

#### 4. **error()** - Todos os Ambientes
Use para erros que precisam ser registrados:

```typescript
logger.error('Falha ao fazer upload', error);
logger.error('Erro ao buscar dados da API', apiError);
```

---

## 🔧 Métodos Avançados

### Log Condicional

```typescript
logger.debugIf(user.isAdmin, 'Usuário admin acessou painel');
```

### Agrupar Logs

```typescript
logger.group('Processamento de Imagem', () => {
  logger.debug('Redimensionando...');
  logger.debug('Aplicando filtros...');
  logger.debug('Fazendo upload...');
});
```

### Exibir Tabela

```typescript
logger.table(users);
logger.table({ nome: 'João', idade: 25 });
```

### Medir Tempo de Execução

```typescript
logger.time('Upload');
// ... código que você quer medir
logger.timeEnd('Upload'); // Exibe: Upload: 1234ms
```

---

## ✅ Substituindo console.log

### ❌ Antes:

```typescript
console.log('Dados carregados:', data);
console.log('Erro:', error);
console.warn('Atenção!');
```

### ✅ Depois:

```typescript
logger.debug('Dados carregados:', data);
logger.error('Erro:', error);
logger.warn('Atenção!');
```

---

## 🎯 Benefícios

1. **Performance**: Logs de debug não executam em produção
2. **Segurança**: Informações sensíveis não aparecem em produção
3. **Organização**: Prefixos `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]`
4. **Flexibilidade**: Fácil adicionar integração com serviços de logging (Sentry, etc.)

---

## 🔍 Verificar Modo

```typescript
if (logger.isDevMode) {
  // Código que só deve executar em desenvolvimento
}
```

---

## 📝 Boas Práticas

1. **Use `debug()` para informações técnicas** que ajudam no desenvolvimento
2. **Use `info()` para marcos importantes** do fluxo da aplicação
3. **Use `warn()` para situações anormais** que não são erros
4. **Use `error()` para erros reais** que precisam ser investigados
5. **Evite logs excessivos** - seja seletivo sobre o que logar
6. **Não logue informações sensíveis** como senhas, tokens, etc.

---

## 🚀 Próximos Passos

1. Procure por `console.log` no projeto
2. Substitua por `logger.debug()` ou `logger.info()`
3. Substitua `console.error` por `logger.error()`
4. Substitua `console.warn` por `logger.warn()`
