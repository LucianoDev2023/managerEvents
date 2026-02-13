# 🔧 Correção: Documento Criado Incorretamente

## ❌ Problema Identificado

Você criou o documento como `config/config` mas deveria ser `config/appVersion`.

Na sua screenshot, vejo:
```
config/
  └── config  ❌ ERRADO
      ├── minVersion: "2.0.0"
      ├── currentVersion: "1.0.0"
      └── ...
```

Deveria ser:
```
config/
  └── appVersion  ✅ CORRETO
      ├── minVersion: "2.0.0"
      ├── currentVersion: "1.0.0"
      └── ...
```

---

## ✅ Solução Rápida

### Opção 1: Renomear o Documento (Mais Fácil)

**Infelizmente, o Firestore não permite renomear documentos.** Você precisa:

1. **Deletar** o documento `config/config`
2. **Criar** um novo documento `config/appVersion`

### Opção 2: Passo a Passo Completo

#### 1. Acessar Firestore

https://console.firebase.google.com/project/wpfg-2025/firestore/data/config/config

#### 2. Deletar o Documento Errado

- Clique no documento `config/config`
- Clique nos 3 pontinhos (⋮) no canto superior direito
- Clique em **"Delete document"** ou **"Excluir documento"**
- Confirme

#### 3. Criar o Documento Correto

- Clique em **"Add document"** ou **"Adicionar documento"**
- **Document ID**: `appVersion` (não `config`!)
- Adicione os campos:

| Campo | Tipo | Valor |
|-------|------|-------|
| `minVersion` | string | `2.0.0` |
| `currentVersion` | string | `1.0.0` |
| `forceUpdate` | boolean | `false` |
| `updateMessage` | string | `Nova versão disponível!` |

- Clique em **"Save"**

#### 4. Verificar

A estrutura final deve ser:
```
config/
  └── appVersion  ✅
      ├── minVersion: "2.0.0"
      ├── currentVersion: "1.0.0"
      ├── forceUpdate: false
      └── updateMessage: "Nova versão disponível!"
```

#### 5. Testar

Reinicie o app:
```powershell
npx expo start --clear
```

Você deverá ver:
```
[DEBUG] [VersionCheck] Versão atual do app: 1.0.0
[DEBUG] [VersionCheck] Versão mínima: 2.0.0
[INFO] [VersionCheck] App desatualizado
```

E o alerta de atualização! 🎉

---

## 🎯 Resumo

**IMPORTANTE**: O Document ID deve ser `appVersion`, não `config`!

```
Collection: config
Document ID: appVersion  ← ESTE É O NOME DO DOCUMENTO
```

---

## 📝 Checklist

- [ ] Deletar documento `config/config`
- [ ] Criar documento `config/appVersion`
- [ ] Adicionar campos (minVersion, currentVersion, forceUpdate, updateMessage)
- [ ] Salvar
- [ ] Reiniciar app
- [ ] Ver alerta de atualização! 🎉
