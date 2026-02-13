# 📝 Guia Passo a Passo: Configurar Versão no Firestore

## 🎯 Objetivo
Criar o documento `config/appVersion` no Firestore para ativar a verificação de versão do app.

---

## 📋 Passo a Passo

### 1️⃣ Acessar o Firestore Console

Abra no seu navegador:
```
https://console.firebase.google.com/project/wpfg-2025/firestore/data
```

Você verá a interface do Firestore Database.

---

### 2️⃣ Criar a Collection `config` (se não existir)

**Se você já tem a collection `config`, pule para o passo 3.**

1. Clique no botão **"Start collection"** ou **"Iniciar coleção"**
2. No campo **"Collection ID"**, digite: `config`
3. Clique em **"Next"** ou **"Próximo"**

---

### 3️⃣ Criar o Document `appVersion`

1. No campo **"Document ID"**, digite: `appVersion`
2. Agora vamos adicionar os campos. Clique em **"Add field"** ou **"Adicionar campo"** para cada um:

#### Campo 1: minVersion
- **Field name (Nome do campo)**: `minVersion`
- **Type (Tipo)**: `string`
- **Value (Valor)**: `1.0.0`

#### Campo 2: currentVersion
- **Field name**: `currentVersion`
- **Type**: `string`
- **Value**: `1.0.0`

#### Campo 3: forceUpdate
- **Field name**: `forceUpdate`
- **Type**: `boolean`
- **Value**: `false` (desmarque a caixa)

#### Campo 4: updateMessage
- **Field name**: `updateMessage`
- **Type**: `string`
- **Value**: `Nova versão disponível com melhorias!`

#### Campo 5: playStoreUrl
- **Field name**: `playStoreUrl`
- **Type**: `string`
- **Value**: `https://play.google.com/store/apps/details?id=com.luciano_dev_2025.gerenciadordeeventos`

#### Campo 6: appStoreUrl
- **Field name**: `appStoreUrl`
- **Type**: `string`
- **Value**: `https://apps.apple.com/app/id123456789`

3. Clique em **"Save"** ou **"Salvar"**

---

### 4️⃣ Verificar o Documento Criado

Após salvar, você deve ver algo assim no Firestore:

```
📁 config
  └── 📄 appVersion
      ├── minVersion: "1.0.0"
      ├── currentVersion: "1.0.0"
      ├── forceUpdate: false
      ├── updateMessage: "Nova versão disponível com melhorias!"
      ├── playStoreUrl: "https://play.google.com/store/apps/details?id=..."
      └── appStoreUrl: "https://apps.apple.com/app/id..."
```

---

## 🧪 Como Testar a Atualização

### Testar Atualização Opcional (com botão "Depois")

1. No Firestore, clique no documento `config/appVersion`
2. Clique no campo `minVersion`
3. Altere o valor de `"1.0.0"` para `"2.0.0"`
4. Clique em **"Update"** ou **"Atualizar"**
5. Abra o app no seu celular/emulador
6. Você verá um alerta com opções **"Depois"** e **"Atualizar"**

### Testar Atualização Obrigatória (sem botão "Depois")

1. No Firestore, clique no documento `config/appVersion`
2. Altere `minVersion` para `"2.0.0"`
3. Altere `forceUpdate` para `true` (marque a caixa)
4. Clique em **"Update"**
5. Abra o app
6. Você verá um alerta apenas com **"Atualizar"** (não pode fechar)

---

## 🔄 Voltar ao Normal

Para desativar o alerta de atualização:

1. No Firestore, clique no documento `config/appVersion`
2. Altere `minVersion` de volta para `"1.0.0"`
3. Clique em **"Update"**
4. Abra o app novamente - não haverá mais alerta

---

## 📸 Referência Visual

### Como deve ficar no Firestore Console:

```
┌─────────────────────────────────────────────────┐
│ Firestore Database                              │
├─────────────────────────────────────────────────┤
│ 📁 config                                       │
│   └── 📄 appVersion                             │
│       ├── minVersion: "1.0.0"                   │
│       ├── currentVersion: "1.0.0"               │
│       ├── forceUpdate: false                    │
│       ├── updateMessage: "Nova versão..."       │
│       ├── playStoreUrl: "https://play..."       │
│       └── appStoreUrl: "https://apps..."        │
└─────────────────────────────────────────────────┘
```

---

## ⚠️ Importante

- **Sempre use aspas** nos valores string: `"1.0.0"` (não `1.0.0`)
- **Versão deve ter 3 números**: `"1.0.0"` (não `"1.0"`)
- **forceUpdate é boolean**: `true` ou `false` (sem aspas)

---

## ✅ Pronto!

Agora você pode testar a verificação de versão no seu app! 🎉

Para mais detalhes, consulte: [VERSION_CHECK_GUIDE.md](file:///c:/dev/VERSION_CHECK_GUIDE.md)
