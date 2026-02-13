# ⚡ Guia Rápido: Configurar Verificação de Versão

## 🎯 Método Mais Simples (Recomendado)

### 1. Acessar Firestore Console

Abra este link no seu navegador:
```
https://console.firebase.google.com/project/wpfg-2025/firestore/data
```

### 2. Criar Collection e Document

1. Clique em **"Start collection"** (ou "Iniciar coleção")
2. **Collection ID**: `config`
3. Clique em **"Next"**
4. **Document ID**: `appVersion`
5. Adicione estes campos (clicando em "Add field"):

| Campo | Tipo | Valor |
|-------|------|-------|
| `minVersion` | string | `1.0.0` |
| `currentVersion` | string | `1.0.0` |
| `forceUpdate` | boolean | `false` |
| `updateMessage` | string | `Nova versão disponível!` |

6. Clique em **"Save"**

### 3. Pronto! ✅

Agora você pode testar:
- Altere `minVersion` para `"2.0.0"`
- Abra o app
- Você verá o alerta!

---

## 🧪 Como Testar

### Teste 1: Atualização Opcional
```
minVersion: "2.0.0"
forceUpdate: false
```
→ Mostra alerta com botões "Depois" e "Atualizar"

### Teste 2: Atualização Obrigatória
```
minVersion: "2.0.0"
forceUpdate: true
```
→ Mostra alerta apenas com "Atualizar" (não pode fechar)

### Voltar ao Normal
```
minVersion: "1.0.0"
```
→ Sem alertas

---

## 📸 Como Deve Ficar

```
Firestore Database
└── config/
    └── appVersion
        ├── minVersion: "1.0.0"
        ├── currentVersion: "1.0.0"
        ├── forceUpdate: false
        └── updateMessage: "Nova versão disponível!"
```

---

## ⚙️ Usar no App

Adicione no `app/_layout.tsx`:

```typescript
import { VersionChecker } from '@/components/VersionChecker';

export default function RootLayout() {
  return (
    <VersionChecker enableInDev={true}>
      {/* Seu app */}
    </VersionChecker>
  );
}
```

---

## ❓ Por Que o Script Não Funcionou?

O script automático precisa de permissões especiais no Firestore. Para setup inicial, é mais rápido fazer manualmente pelo console (leva 2 minutos).

Se quiser usar o script, você precisa:
1. Permitir escrita temporariamente nas regras do Firestore
2. Executar o script
3. Voltar as regras para somente leitura

Mas fazer manual é mais simples! 😊
