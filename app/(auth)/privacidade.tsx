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

  const NOME_CONTROLADOR = 'Jociel Luciano';
  const EMAIL_PRIVACIDADE = 'planejejasuporte@gmail.com';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Política de Privacidade</Text>
        <Text style={styles.subtitle}>
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </Text>

        <Text style={styles.h2}>1. Quem somos</Text>
        <Text style={styles.p}>
          Este app é operado por{' '}
          <Text style={styles.bold}>{NOME_CONTROLADOR}</Text>, pessoa física,
          responsável pelo tratamento de dados pessoais conforme a LGPD (Lei nº
          13.709/2018).
        </Text>
        <Text style={styles.p}>
          Contato:{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL(`mailto:${EMAIL_PRIVACIDADE}`)}
          >
            {EMAIL_PRIVACIDADE}
          </Text>
        </Text>

        <Text style={styles.h2}>2. Quais dados coletamos</Text>
        <Text style={styles.p}>
          • E-mail e UID (Firebase Auth) para autenticação.
        </Text>
        <Text style={styles.p}>
          • Dados de uso e segurança (ex.: data/hora de acesso e IP aproximado
          quando disponível).
        </Text>
        <Text style={styles.p}>
          • Dados que você cadastrar no app (ex.: eventos, informações do
          evento, etc.).
        </Text>

        <Text style={styles.h2}>3. Para que usamos seus dados</Text>
        <Text style={styles.p}>• Criar e gerenciar sua conta.</Text>
        <Text style={styles.p}>
          • Permitir acesso e uso das funções do app.
        </Text>
        <Text style={styles.p}>• Suporte, segurança e prevenção de abuso.</Text>

        <Text style={styles.h2}>4. Base legal</Text>
        <Text style={styles.p}>
          • Execução de contrato (para operar o serviço).
        </Text>
        <Text style={styles.p}>
          • Consentimento (para itens opcionais, quando houver).
        </Text>

        <Text style={styles.h2}>5. Compartilhamento</Text>
        <Text style={styles.p}>
          Usamos provedores como o{' '}
          <Text style={styles.bold}>Firebase/Google</Text> para autenticação e
          infraestrutura.
        </Text>

        <Text style={styles.h2}>6. Retenção e exclusão</Text>
        <Text style={styles.p}>
          Mantemos os dados enquanto sua conta estiver ativa. Você pode
          solicitar a exclusão da conta e dados a qualquer momento.
        </Text>

        <Text style={styles.h2}>7. Seus direitos</Text>
        <Text style={styles.p}>
          Você pode solicitar acesso, correção e exclusão de dados, além de
          outras solicitações previstas na LGPD, pelo e-mail acima.
        </Text>

        <Text style={styles.h2}>8. Alterações</Text>
        <Text style={styles.p}>
          Podemos atualizar esta Política e indicaremos a data no topo desta
          página.
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
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
