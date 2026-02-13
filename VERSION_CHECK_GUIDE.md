# Sistema de Verificação de Versão do App

## 📋 Visão Geral

Sistema que verifica se o app instalado está atualizado comparando com a versão mínima configurada no Firestore.

---

## 🚀 Como Usar

### 1. Configurar Firestore

Crie o documento `config/appVersion` no Firestore:

```javascript
// Firestore: config/appVersion
{
  minVersion: "1.0.0",           // Versão mínima aceita
  currentVersion: "1.0.0",       // Versão atual na loja
  forceUpdate: false,            // Se true, força atualização (não permite "Depois")
  updateMessage: "Nova versão com melhorias de performance!", // Mensagem customizada
  playStoreUrl: "https://play.google.com/store/apps/details?id=com.luciano_dev_2025.gerenciadordeeventos",
  appStoreUrl: "https://apps.apple.com/app/id123456789"
}
```

### 2. Adicionar ao App

#### Opção A: Usar o Componente Wrapper (Recomendado)

```typescript
// app/_layout.tsx
import { VersionChecker } from '@/components/VersionChecker';

export default function RootLayout() {
  return (
    <VersionChecker enableInDev={true}> {/* enableInDev para testar em dev */}
      {/* Seu app aqui */}
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </VersionChecker>
  );
}
```

#### Opção B: Usar o Hook Diretamente

```typescript
// app/_layout.tsx
import { useVersionCheck } from '@/hooks/useVersionCheck';

export default function RootLayout() {
  const { isChecking, needsUpdate } = useVersionCheck(true); // true = habilita em dev

  if (isChecking) {
    return <LoadingScreen />;
  }

  return (
    // Seu app
  );
}
```

---

## 🧪 Como Testar em Desenvolvimento

### 1. Criar Documento no Firestore

No Firebase Console, crie:
- Collection: `config`
- Document ID: `appVersion`
- Campos:
  ```json
  {
    "minVersion": "2.0.0",
    "currentVersion": "2.0.0",
    "forceUpdate": false,
    "updateMessage": "Teste de atualização!"
  }
  ```

### 2. Habilitar Verificação em Dev

```typescript
<VersionChecker enableInDev={true}>
  <App />
</VersionChecker>
```

### 3. Testar Cenários

#### Cenário 1: App Desatualizado (Opcional)
```json
{
  "minVersion": "2.0.0",
  "forceUpdate": false
}
```
- App versão 1.0.0 mostra alerta com botões "Depois" e "Atualizar"

#### Cenário 2: App Desatualizado (Obrigatório)
```json
{
  "minVersion": "2.0.0",
  "forceUpdate": true
}
```
- App versão 1.0.0 mostra alerta apenas com botão "Atualizar"
- Usuário não pode fechar o alerta

#### Cenário 3: App Atualizado
```json
{
  "minVersion": "1.0.0"
}
```
- Nenhum alerta é mostrado

---

## 📝 Regras de Firestore

Adicione estas regras para permitir leitura pública da configuração:

```javascript
// firestore.rules
match /config/{document} {
  allow read: if true; // Todos podem ler
  allow write: if false; // Apenas via console/admin
}
```

---

## 🔄 Fluxo de Atualização

1. **App abre** → Verifica versão no Firestore
2. **Se desatualizado** → Mostra alerta
3. **Usuário clica "Atualizar"** → Abre loja (Play Store/App Store)
4. **Usuário atualiza** → Nova versão instalada
5. **Próxima abertura** → Verificação passa ✅

---

## 🎯 Quando Usar

### Atualização Opcional (`forceUpdate: false`)
- Melhorias de UI/UX
- Novas features não críticas
- Correções de bugs menores

### Atualização Obrigatória (`forceUpdate: true`)
- Mudanças críticas de segurança
- Alterações incompatíveis de API
- Bugs graves que impedem uso do app

---

## 📊 Logs de Debug

O sistema usa o logger para debug. Você verá logs como:

```
[VersionCheck] Versão atual do app: 1.0.0
[VersionCheck] Versão mínima: 2.0.0, Force update: true
[VersionCheck] App desatualizado. Atual: 1.0.0, Mínima: 2.0.0
```

---

## 🔗 Arquivos Criados

- `hooks/useVersionCheck.ts` - Hook principal
- `components/VersionChecker.tsx` - Componente wrapper
- `VERSION_CHECK_GUIDE.md` - Este guia

---

## ⚙️ Configuração de Produção

Para produção, remova `enableInDev`:

```typescript
<VersionChecker> {/* Sem enableInDev */}
  <App />
</VersionChecker>
```

Assim, a verificação só acontece em builds de produção.
