# 🔒 Configurar Regras do Firestore para Verificação de Versão

## ⚠️ Erro: "Missing or insufficient permissions"

Se você está vendo este erro, precisa configurar as regras do Firestore para permitir leitura pública do documento `config/appVersion`.

---

## ✅ Solução

### 1. Acessar Regras do Firestore

Abra: https://console.firebase.google.com/project/wpfg-2025/firestore/rules

### 2. Adicionar Regra para `config/appVersion`

Encontre a seção `rules_version = '2';` e adicione esta regra:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ✅ Permitir leitura pública da configuração de versão
    match /config/appVersion {
      allow read: if true;  // Todos podem ler
      allow write: if false; // Apenas via console/admin
    }
    
    // Suas outras regras existentes abaixo...
    match /events/{eventId} {
      // ...
    }
    
    match /users/{userId} {
      // ...
    }
    
    // etc...
  }
}
```

### 3. Publicar as Regras

Clique em **"Publish"** ou **"Publicar"** no topo da página.

---

## 🧪 Testar

Após publicar as regras:

1. Reinicie o app: `npx expo start --clear`
2. Abra o app
3. Você **não** deve mais ver o erro de permissão
4. Se `minVersion` for `"2.0.0"`, você verá o alerta de atualização

---

## 🔐 Segurança

Esta regra é segura porque:

✅ **Leitura pública**: Qualquer um pode ler a versão mínima (necessário para o app funcionar)  
✅ **Escrita bloqueada**: Apenas você pode alterar via Firebase Console  
✅ **Dados não sensíveis**: A versão mínima não é informação sensível

---

## 📝 Regra Completa Recomendada

Se você quiser permitir leitura de toda a collection `config` (para futuras configurações):

```javascript
match /config/{document} {
  allow read: if true;   // Qualquer um pode ler configurações
  allow write: if false; // Apenas admin pode escrever
}
```

---

## ✅ Pronto!

Depois de publicar as regras, o app funcionará perfeitamente! 🎉
