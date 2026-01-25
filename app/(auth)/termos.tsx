// app/(auth)/termos.tsx
import React from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function TermosScreen() {
  const router = useRouter();

  // ✅ Ajuste estes 2 campos
  const NOME_APP = 'Plannix';
  const NOME_CONTROLADOR = 'Jociel Luciano';
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
          Ao criar uma conta, acessar ou utilizar o {NOME_APP}, você declara que
          leu e concorda com estes Termos de Uso. Se não concordar, não utilize
          o app.
        </Text>

        <Text style={styles.h2}>2. Quem opera o app</Text>
        <Text style={styles.p}>
          O {NOME_APP} é operado por{' '}
          <Text style={styles.bold}>{NOME_CONTROLADOR}</Text>, pessoa física,
          responsável pela disponibilização do serviço.
        </Text>

        <Text style={styles.h2}>3. Conta e acesso</Text>
        <Text style={styles.p}>
          Para utilizar determinadas funcionalidades, você poderá precisar criar
          uma conta e fornecer informações verdadeiras e atualizadas. Você é
          responsável por manter a confidencialidade das credenciais de acesso e
          por todas as atividades realizadas em sua conta.
        </Text>

        <Text style={styles.h2}>4. Uso permitido</Text>
        <Text style={styles.p}>Você concorda em:</Text>
        <Text style={styles.p}>
          • Não utilizar o app para fins ilegais ou proibidos por estes Termos.
        </Text>
        <Text style={styles.p}>
          • Não tentar acessar áreas restritas, burlar autenticação ou explorar
          falhas.
        </Text>
        <Text style={styles.p}>
          • Não interferir no funcionamento do serviço (ex.: spam, automações
          abusivas).
        </Text>

        <Text style={styles.h2}>5. Conteúdo e dados inseridos por você</Text>
        <Text style={styles.p}>
          Você é responsável pelos dados e conteúdos que inserir no app. Você
          declara possuir os direitos necessários para inserir essas informações
          e autoriza o processamento delas para a execução do serviço.
        </Text>

        <Text style={styles.h2}>6. Privacidade e proteção de dados</Text>
        <Text style={styles.p}>
          O tratamento de dados pessoais é regido pela nossa Política de
          Privacidade. Recomendamos a leitura conjunta destes Termos e da
          Política.
        </Text>

        <Text style={styles.h2}>7. Disponibilidade e alterações</Text>
        <Text style={styles.p}>
          Buscamos manter o serviço disponível, mas pode haver interrupções por
          manutenção, falhas técnicas ou fatores externos. O app pode ser
          atualizado, modificado ou ter funcionalidades ajustadas a qualquer
          momento.
        </Text>

        <Text style={styles.h2}>8. Limitação de responsabilidade</Text>
        <Text style={styles.p}>
          Na medida permitida pela legislação aplicável, o {NOME_APP} não se
          responsabiliza por danos indiretos, lucros cessantes ou perdas
          decorrentes do uso ou da impossibilidade de uso do serviço, incluindo
          problemas causados por terceiros, internet, dispositivos ou serviços
          integrados.
        </Text>

        <Text style={styles.h2}>9. Cancelamento e exclusão de conta</Text>
        <Text style={styles.p}>
          Você pode solicitar a exclusão da sua conta e/ou interromper o uso do
          app a qualquer momento. Alguns dados podem ser mantidos quando
          necessário para cumprir obrigações legais, resolver disputas ou
          garantir segurança.
        </Text>

        <Text style={styles.h2}>10. Contato</Text>
        <Text style={styles.p}>
          Para dúvidas, suporte ou solicitações relacionadas ao app, entre em
          contato pelo e-mail: <Text style={styles.bold}>{EMAIL_SUPORTE}</Text>.
        </Text>

        <Text style={styles.h2}>11. Lei aplicável e foro</Text>
        <Text style={styles.p}>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro do domicílio do usuário, conforme o Código de
          Defesa do Consumidor, quando aplicável.
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
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
