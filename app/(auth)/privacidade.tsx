import React from 'react';
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function PrivacidadeScreen() {
  const router = useRouter();

  const NOME_CONTROLE = 'Equipe Plannix';
  const EMAIL_SUPORTE = 'planejejasuporte@gmail.com';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Política de Privacidade</Text>
        <Text style={styles.subtitle}>
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </Text>

        <Text style={styles.h2}>1. Introdução e Controlador</Text>
        <Text style={styles.p}>
          A Plannix está comprometida com a transparência e a segurança dos seus dados, em total conformidade com a <Text style={styles.bold}>LGPD (Lei Geral de Proteção de Dados)</Text>.
          Este aplicativo é operado pela <Text style={styles.bold}>{NOME_CONTROLE}</Text>, com foco em fornecer uma ferramenta eficiente para gerenciamento de eventos.
        </Text>

        <Text style={styles.h2}>2. Coleta de Dados e Finalidade</Text>
        <Text style={styles.p}>Coletamos os dados estritamente necessários para as funcionalidades do App:</Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Identificação:</Text> E-mail, UID e Nome (Cadastro ou Google Login).
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Eventos:</Text> Fotos, comentários e informações de participação inseridas por você.
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Google Sign-In:</Text> Recebemos nome e e-mail para criar seu perfil. Não acessamos sua senha ou outros dados privados da sua conta Google.
        </Text>

        <Text style={styles.h2}>3. Transparência na Resolução de Nomes</Text>
        <Text style={styles.p}>
          Para garantir a identificação no App, utilizamos um sistema de Resolução de Nomes:
        </Text>
        <Text style={styles.p}>
          • Seu nome de perfil é visível para outros participantes apenas nos eventos em que você também participa.
        </Text>
        <Text style={styles.p}>
          • Isso permite que outros convidados identifiquem autores de fotos e comentários.
        </Text>

        <Text style={styles.h2}>4. Compartilhamento com Terceiros</Text>
        <Text style={styles.p}>
          Seus dados não são vendidos. Usamos provedores essenciais:
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Firebase (Google):</Text> Autenticação e banco de dados.
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Cloudinary:</Text> Armazenamento seguro de fotos.
        </Text>

        <Text style={styles.h2}>5. Segurança e Moderação</Text>
        <Text style={styles.p}>
          Implementamos protocolos de segurança modernos e ferramentas de moderação (denúncias) para garantir um ambiente seguro.
        </Text>

        <Text style={styles.h2}>6. Direitos do Usuário (LGPD)</Text>
        <Text style={styles.p}>
          Você pode solicitar acesso, correção, portabilidade ou exclusão de dados.
        </Text>
        <Text style={styles.p}>
          • <Text style={styles.bold}>Google:</Text> Você pode revogar o acesso do Plannix em sua conta Google a qualquer momento.
        </Text>

        <View style={styles.urgentBox}>
          <Text style={styles.urgentTitle}>7. Exclusão Definitiva de Conta e Dados</Text>
          <Text style={styles.urgentText}>
            Em conformidade com a Google Play Store, oferecemos dois caminhos:
          </Text>
          <Text style={styles.urgentText}>
            • <Text style={styles.bold}>Pelo App:</Text> Acesse Perfil {'>'} Excluir minha conta.
          </Text>
          <Text style={styles.urgentText}>
            • <Text style={styles.bold}>Por E-mail:</Text> Solicite via {EMAIL_SUPORTE}.
          </Text>
          <Text style={[styles.urgentText, { fontStyle: 'italic', marginTop: 4 }]}>
            A exclusão é irreversível e remove todos os seus dados pessoais.
          </Text>
        </View>

        <Text style={styles.h2}>8. Alterações</Text>
        <Text style={styles.p}>
          Podemos atualizar esta Política periodicamente. A data será sempre indicada no topo desta tela.
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
  link: { textDecorationLine: 'underline', color: '#9aa7ff' },
  button: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  urgentBox: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderWidth: 1,
    borderColor: '#ff4d4d',
    borderRadius: 16,
  },
  urgentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff4d4d',
    marginBottom: 8,
  },
  urgentText: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
});
