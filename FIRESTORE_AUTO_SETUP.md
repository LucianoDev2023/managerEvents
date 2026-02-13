# 🚀 Criar Coleção Automaticamente no Firestore

## Opção 1: Usando o Script (Recomendado)

### 1. Instalar Dependências

```powershell
cd scripts
npm install
```

### 2. Executar o Script

```powershell
npm run setup-version
```

Ou diretamente:

```powershell
npx tsx scripts/setup-version-config.ts
```

### 3. Verificar

O script criará automaticamente o documento `config/appVersion` no Firestore com todos os campos necessários.

Você verá uma mensagem de sucesso:
```
✅ Documento criado com sucesso!
```

---

## Opção 2: Usando Firebase Admin SDK (Para Projetos Grandes)

Se você tiver muitas configurações para criar, pode usar o Firebase Admin SDK:

### 1. Instalar Firebase Admin

```powershell
npm install firebase-admin
```

### 2. Baixar Service Account Key

1. Acesse: https://console.firebase.google.com/project/wpfg-2025/settings/serviceaccounts/adminsdk
2. Clique em **"Generate new private key"**
3. Salve o arquivo JSON como `scripts/serviceAccountKey.json`
4. **IMPORTANTE**: Adicione ao `.gitignore`:
   ```
   scripts/serviceAccountKey.json
   ```

### 3. Criar Script Admin

```typescript
// scripts/setup-version-admin.ts
import * as admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any)
});

const db = admin.firestore();

async function setup() {
  await db.collection('config').doc('appVersion').set({
    minVersion: "1.0.0",
    currentVersion: "1.0.0",
    forceUpdate: false,
    updateMessage: "Nova versão disponível!",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.luciano_dev_2025.gerenciadordeeventos",
    appStoreUrl: "https://apps.apple.com/app/id123456789"
  });
  
  console.log('✅ Configuração criada!');
  process.exit(0);
}

setup();
```

---

## Opção 3: Via Firebase CLI

### 1. Instalar Firebase CLI

```powershell
npm install -g firebase-tools
```

### 2. Login

```powershell
firebase login
```

### 3. Criar Arquivo de Dados

Crie `scripts/version-data.json`:

```json
{
  "config": {
    "appVersion": {
      "minVersion": "1.0.0",
      "currentVersion": "1.0.0",
      "forceUpdate": false,
      "updateMessage": "Nova versão disponível!",
      "playStoreUrl": "https://play.google.com/store/apps/details?id=com.luciano_dev_2025.gerenciadordeeventos",
      "appStoreUrl": "https://apps.apple.com/app/id123456789"
    }
  }
}
```

### 4. Importar para Firestore

```powershell
firebase firestore:import scripts/version-data.json --project wpfg-2025
```

---

## ⚠️ Importante: Regras do Firestore

Para o script funcionar, você precisa permitir escrita temporariamente:

```javascript
// Firestore Rules (temporário para setup)
match /config/{document} {
  allow read: if true;
  allow write: if true; // ⚠️ APENAS DURANTE O SETUP
}
```

**Depois do setup, mude para:**

```javascript
match /config/{document} {
  allow read: if true;
  allow write: if false; // ✅ Apenas via console/admin
}
```

---

## ✅ Verificar se Funcionou

Após executar o script, acesse:
https://console.firebase.google.com/project/wpfg-2025/firestore/data/config/appVersion

Você deve ver o documento criado com todos os campos! 🎉

---

## 🐛 Troubleshooting

### Erro: "Permission denied"
- Verifique as regras do Firestore
- Permita escrita temporariamente em `config/{document}`

### Erro: "Module not found"
- Execute `npm install` na pasta `scripts/`

### Erro: "Firebase not initialized"
- Verifique se a configuração do Firebase está correta
- Confirme que o projeto `wpfg-2025` existe

---

## 📝 Recomendação

Use a **Opção 1** (script simples) para configuração inicial. É a mais fácil e rápida! 🚀
