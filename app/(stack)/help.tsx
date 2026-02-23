import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  useColorScheme,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Image as ImageIcon,
  Shield,
  Mail,
  ChevronRight,
  PlusCircle,
  Users,
  Camera,
  Layers,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';

export default function HelpCenterScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const handleContactSupport = () => {
    Linking.openURL('mailto:planejejasuporte@gmail.com');
  };

  const HelpSection = ({ 
    icon: Icon, 
    title, 
    description, 
    items 
  }: { 
    icon: any, 
    title: string, 
    description: string, 
    items: string[] 
  }) => (
    <View style={[styles.sectionCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
          <Icon size={22} color={colors.primary} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
      <View style={styles.itemsContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.itemRow}>
            <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
            <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={colors.gradients} style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Centro de Ajuda',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerTitleStyle: {
            fontFamily: Fonts.bold,
            color: colors.text,
          }
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introContainer}>
          <Text style={[styles.welcomeText, { color: colors.text }]}>Como podemos ajudar?</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Explore as funcionalidades do Plannix e tire o máximo proveito da sua experiência em eventos.
          </Text>
        </View>

        <HelpSection
          icon={Calendar}
          title="Gestão de Eventos"
          description="Crie e organize seus eventos de forma centralizada e eficiente."
          items={[
            "Criação de novos eventos com nome, data e local.",
            "Visualização da lista completa de eventos que você organiza ou participa.",
            "Edição de detalhes em tempo real para manter todos informados.",
            "Exclusão segura de eventos com limpeza automática de dados."
          ]}
        />

        <HelpSection
          icon={Layers}
          title="Cronograma e Atividades"
          description="Divida seu evento em dias e programas com atividades específicas."
          items={[
            "Organize seu evento por programas (ex: Manhã, Tarde, Dia 1).",
            "Adicione atividades detalhadas dentro de cada programa.",
            "Defina horários e locais para cada momento do evento.",
            "Mantenha os convidados atualizados sobre a próxima atração."
          ]}
        />

        <HelpSection
          icon={ImageIcon}
          title="Galeria e Fotos"
          description="Capture e compartilhe os melhores momentos diretamente no app."
          items={[
            "Upload de fotos por atividade para manter as memórias organizadas.",
            "Visualização em tela cheia com suporte a zoom e deslize.",
            "Limites inteligentes: 3 fotos por convidado, 5 por administrador.",
            "Gestão de fotos: apague o que não for mais necessário."
          ]}
        />

        <HelpSection
          icon={Shield}
          title="Níveis de Acesso e Segurança"
          description="Controle quem pode fazer o quê no seu evento."
          items={[
            "Criador: Controle total sobre o evento, fotos e permissões.",
            "Admin: Pode gerenciar cronogramas e moderar conteúdo.",
            "Convidado: Acessa o cronograma e contribui com fotos limitadas.",
            "Segurança de dados com Firestore e Cloudinary."
          ]}
        />

        <View style={[styles.contactCard, { backgroundColor: colors.primary }]}>
          <View style={styles.contactInfo}>
            <Mail size={32} color="white" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactTitle}>Ainda tem dúvidas?</Text>
              <Text style={styles.contactSubtitle}>Nossa equipe está pronta para ajudar.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
            <Text style={[styles.contactButtonText, { color: colors.primary }]}>Enviar E-mail</Text>
            <ChevronRight size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Plannix - Organização Inteligente de Eventos
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerButton: { 
    padding: 8, 
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  scrollContent: { 
    padding: 20, 
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) + 70 : 100,
    paddingBottom: 40 
  },
  
  introContainer: { marginBottom: 24 },
  welcomeText: { fontSize: 28, fontFamily: Fonts.bold, marginBottom: 8 },
  introText: { fontSize: 16, fontFamily: Fonts.regular, lineHeight: 22 },

  sectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: { padding: 10, borderRadius: 12, marginRight: 12 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold },
  sectionDescription: { fontSize: 14, fontFamily: Fonts.medium, marginBottom: 16, lineHeight: 20 },
  
  itemsContainer: { gap: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 8, marginRight: 10 },
  itemText: { flex: 1, fontSize: 14, fontFamily: Fonts.regular, lineHeight: 20 },

  contactCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  contactInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  contactTextContainer: { marginLeft: 16 },
  contactTitle: { color: 'white', fontSize: 18, fontFamily: Fonts.bold },
  contactSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: Fonts.regular },
  contactButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  contactButtonText: { fontSize: 16, fontFamily: Fonts.bold },

  footerText: { textAlign: 'center', fontSize: 12, fontFamily: Fonts.medium, opacity: 0.7 },
});
