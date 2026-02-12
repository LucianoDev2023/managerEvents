# PLANNIX — Event Management App

PLANNIX é um aplicativo mobile de gerenciamento de eventos privados, desenvolvido em React Native com Expo.  
Ele permite criar eventos, gerenciar convidados, organizar programações, compartilhar convites via QR Code ou link e armazenar fotos privadas de forma segura.

---

## ✨ Principais Funcionalidades

- Criação e gerenciamento de eventos
- Programação por datas e atividades
- Convites via QR Code e link compartilhável
- Controle de presença (confirmado / acompanhando)
- Sistema de permissões com múltiplos administradores
- Galeria privada de fotos por atividade
- Comentários em fotos
- Eventos criados vs eventos seguidos
- Acesso por convite (Invite Gate)
- Modo Visitante (Guest Mode) com conversão de conta

---

## 🧱 Arquitetura & Stack

- **Frontend Mobile:** React Native + Expo SDK 52
- **Navegação:** Expo Router (file-based routing)
- **Backend:** Firebase (Authentication + Firestore)
- **Banco de Dados:** Firestore (NoSQL)
- **Linguagem:** TypeScript
- **Animações & UI:**
  - react-native-reanimated
  - lottie-react-native
  - lucide-react-native
  - react-native-svg
- **Upload de imagens:** Cloudinary
- **Datas:** date-fns

---

## 🗂 Estrutura do Projeto

# PLANNIX — Documentação Técnica Interna

## Visão Geral

Aplicativo mobile de eventos privados com estrutura serverless, usando Firebase diretamente no frontend.

---

## Fluxo de Autenticação

- Firebase Auth (Email/Senha + Anonymous Auth)
- Guest Mode:
  - Usuário entra anonimamente
  - Dados são salvos com UID anônimo
  - Conversão via linkWithCredential mantém UID
- Login com conta existente:
  - Usuário anônimo recebe alerta (risco de perda de dados)

---

## Estrutura de Navegação

- Expo Router
- Grupos:
  - (auth): rotas públicas
  - (tabs): navegação principal
  - (stack): telas de detalhe

Proteção de rotas feita via Auth Listener + layout condicional.

---

## Gerenciamento de Estado

### EventsContext.tsx

Responsável por:

- CRUD de eventos
- Programas
- Atividades
- Fotos
- Permissões
- Re-fetch pontual

⚠️ Arquivo grande (~1000 linhas).  
Candidato a refatoração por domínio:

- useEvents
- usePrograms
- useActivities
- usePhotos
- useGuests

---

## Upload de Imagens

- Cloudinary
- Upload direto do client
- Metadados persistidos no Firestore
- Fotos vinculadas a atividades

---

## Convites e Acesso

- Share Key → Event ID
- Invite Preview
- Invite Gate
- QR Code Scanner
- Participação registrada em guestParticipations

---

## Segurança

- Firestore Rules baseadas em:
  - request.auth.uid
  - owner / subAdmin
- Atenção especial:
  - evitar list() sem filtro
  - sempre validar userId

---

## Pontos de Evolução

- Refatoração de contextos
- Métricas de conversão visitante → conta
- Limites por plano (free / premium)
- App Check
- Performance em queries complexas
