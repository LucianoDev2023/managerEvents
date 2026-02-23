// app/(auth)/termos.tsx
import React from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermosScreen() {
  const router = useRouter();

  const NOME_APP = 'Plannix';
  const NOME_CONTROLE = 'Equipe Plannix';
  const EMAIL_SUPORTE = 'planejejasuporte@gmail.com';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Termos de Uso</Text>
        <Text style={styles.subtitle}>
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </Text>

        <Text style={styles.h2}>1. Aceite dos Termos</Text>
        <Text style={styles.p}>
          Ao acessar e utilizar o aplicativo {NOME_APP}, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se não concordar com qualquer parte destes termos, você deve descontinuar o uso do App imediatamente.
        </Text>

        <Text style={styles.h2}>2. Responsabilidade do Usuário</Text>
        <Text style={styles.p}>
          Você é o único responsável pelo conteúdo (fotos, nomes, comentários) que envia ao App. Ao utilizar o serviço, você garante que possui os direitos necessários sobre tais conteúdos.
        </Text>

        <Text style={styles.h2}>3. Diretrizes e Conteúdo Proibido</Text>
        <Text style={styles.p}>É expressamente proibido enviar qualquer conteúdo que:</Text>
        <Text style={styles.p}>• Seja ofensivo, abusivo, discriminatório ou obsceno;</Text>
        <Text style={styles.p}>• Incite o ódio, violência ou atividades ilegais;</Text>
        <Text style={styles.p}>• Constitua spam ou propaganda não autorizada;</Text>
        <Text style={styles.p}>• Viole a privacidade ou direitos de terceiros.</Text>

        <View style={styles.modBadge}>
          <Text style={styles.modBadgeText}>📌 Requisito Play Store: Política de UGC</Text>
        </View>
        <Text style={styles.h2}>4. Moderação de Conteúdo (UGC)</Text>
        <Text style={styles.p}>
          O {NOME_APP} utiliza ferramentas para manter um ambiente seguro:
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Denúncias:</Text> Todos os usuários podem denunciar fotos ou comentários impróprios.
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Ação Administrativa:</Text> Administradores do evento podem remover imediatamente conteúdos que violem estes termos.
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Bloqueio:</Text> Usuários que violarem repetidamente as diretrizes podem ser bloqueados ou banidos permanentemente.
        </Text>

        <Text style={styles.h2}>5. Licença de Uso</Text>
        <Text style={styles.p}>
          Você concede ao {NOME_APP} uma licença gratuita e não exclusiva para hospedar e exibir o conteúdo que você carrega, estritamente para os fins de prestação do serviço (álbum do evento).
        </Text>

        <Text style={styles.h2}>6. Limitação de Responsabilidade</Text>
        <Text style={styles.p}>
          O {NOME_APP} é fornecido "como está". Não nos responsabilizamos por perdas de dados decorrentes de mau uso ou falhas técnicas de provedores de infraestrutura.
        </Text>

        <Text style={styles.h2}>7. Encerramento de Conta</Text>
        <Text style={styles.p}>
          Você pode encerrar sua conta a qualquer momento em Perfil {'>'} Excluir minha conta. Seus dados pessoais identificáveis serão removidos de nossa base ativa.
        </Text>

        <Text style={styles.h2}>8. Jurisdição</Text>
        <Text style={styles.p}>
          Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer litígio será resolvido no foro da comarca da {NOME_CONTROLE}.
        </Text>

        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Voltar</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { marginTop: 6, fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  h2: { marginTop: 18, fontSize: 15, fontWeight: '700', color: '#fff' },
  p: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.85)',
  },
  bold: { fontWeight: '700', color: '#fff' },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  modBadge: {
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(154, 167, 255, 0.15)',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  modBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9aa7ff',
  },
});
