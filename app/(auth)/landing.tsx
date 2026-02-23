import React, {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar as RNStatusBar,
  Pressable,
  Dimensions,
  Image,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/config/firebase';

import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { Check, Users, DollarSign, Camera, Calendar, ArrowRight, Sparkles, ClipboardList, FileDown, MessageCircle } from 'lucide-react-native';
import LottieView from 'lottie-react-native';

import { useAuthListener } from '@/hooks/useAuthListener';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.65;
const SPACING = 12;

const benefits = [
    {
        id: '1',
        title: 'Lista de Convidados',
        description: 'Saiba exatamente quem confirmou presença. Tudo em tempo real, sem planilhas chatas.',
        icon: Users,
        color: '#4ECDC4'
    },
    {
        id: '2',
        title: 'Financeiro',
        description: 'Seu orçamento sob controle. Registre gastos e evite surpresas no final.',
        icon: DollarSign,
        color: '#FF6B6B'
    },
    {
        id: '3',
        title: 'Tarefas & Notas',
        description: 'Não esqueça de nada. Checklists e anotações para organizar cada detalhe.',
        icon: ClipboardList,
        color: '#A06CD5'
    },
    {
        id: '4',
        title: 'Relatórios em PDF',
        description: 'Exporte e compartilhe o controle financeiro do seu evento com um clique.',
        icon: FileDown,
        color: '#FF9F1C'
    },
    {
        id: '5',
        title: 'Galeria Interativa',
        description: 'Um álbum privado onde convidados podem enviar fotos e comentar em tempo real.',
        icon: Camera,
        color: '#E056FD'
    }
];

export default function LandingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user } = useAuthListener();
  const [guestLoading, setGuestLoading] = useState(false);

  // Gradiente "Premium Night"
  const gradientColors: [string, string, ...string[]] = useMemo(
    () =>
      colorScheme === 'dark'
      ? ['#0F0F1A', '#1A1129', '#2D1B4E'] 
      : ['#FFFFFF', '#F0F4FF', '#E2E8FF'],
    [colorScheme],
  );

  const handleNavigateLogin = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);
  
  const handleNavigateRegister = useCallback(() => {
    router.push('/(auth)/register');
  }, [router]);

  const handleGuest = useCallback(async () => {
    try {
      if (guestLoading) return;
      if (user) {
        router.replace('/(tabs)');
        return;
      }
      setGuestLoading(true);
      await signInAnonymously(auth);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Tente novamente.');
    } finally {
      setGuestLoading(false);
    }
  }, [guestLoading, router, user]);

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <StatusBar translucent style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          Platform.OS === 'android' && {
            paddingTop: RNStatusBar.currentHeight ?? 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* --- HEADER / HERO --- */}
        <Animated.View
          entering={FadeInDown.duration(800).delay(200)}
          style={styles.heroSection}
        >
            <View style={styles.badge}>
                <Sparkles size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>Eventos reinventados</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>
                Celebre momentos,{'\n'}
                <Text style={{ color: colors.primary }}>não preocupações.</Text>
            </Text>

            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                O jeito mais fácil e elegante de gerenciar listas, finanças e memórias do seu evento.
            </Text>
        </Animated.View>

        {/* --- ILLUSTRATION --- */}
        <Animated.View
            entering={ZoomIn.duration(800).delay(400)}
            style={styles.illustrationContainer}
        >
             <LottieView
                source={require('@/assets/images/start.json')}
                autoPlay
                loop
                style={styles.lottie}
             />
        </Animated.View>

        {/* --- CAROUSEL DE BENEFÍCIOS --- */}
        <Animated.View
            entering={FadeInDown.duration(800).delay(600)}
            style={styles.carouselSection}
        >
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 20 }}
                snapToInterval={CARD_WIDTH + SPACING}
                decelerationRate="fast"
            >
                {benefits.map((item, index) => (
                    <View 
                        key={item.id} 
                        style={[
                            styles.benefitCard, 
                            { 
                                backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
                                borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#eee',
                                marginRight: index === benefits.length - 1 ? 0 : SPACING
                            }
                        ]}
                    >
                        <View style={[styles.iconBox, { backgroundColor: item.color + '20' }]}>
                            <item.icon size={28} color={item.color} />
                        </View>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                    </View>
                ))}
            </ScrollView>
        </Animated.View>

        {/* --- ACTIONS --- */}
        <Animated.View
            entering={FadeInDown.duration(800).delay(800)}
            style={styles.actionSection}
        >
             <Pressable
                onPress={handleNavigateRegister}
                style={({ pressed }) => [
                    styles.primaryBtn,
                    { 
                        backgroundColor: colors.primary,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        opacity: pressed ? 0.9 : 1
                    }
                ]}
             >
                 <Text style={styles.primaryBtnText}>Criar meu Evento</Text>
                 <ArrowRight size={20} color="#fff" />
             </Pressable>

             <Pressable
                onPress={handleNavigateLogin}
                style={({ pressed }) => [
                    styles.secondaryBtn,
                    { 
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.backgroundSecondary : 'transparent'
                    }
                ]}
             >
                 <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Já tenho conta</Text>
             </Pressable>
             
             <Pressable onPress={handleGuest} disabled={guestLoading} style={{ marginTop: 16 }}>
                 <Text style={{ fontFamily: Fonts.medium, color: colors.textSecondary, fontSize: 13, textDecorationLine: 'underline' }}>
                    {guestLoading ? 'Entrando...' : 'Apenas dar uma olhadinha (Visitante)'}
                 </Text>
             </Pressable>

        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flexGrow: 1,
  },
  
  // Hero
  heroSection: {
      paddingHorizontal: 24,
      alignItems: 'center',
      marginTop: 20, // Reduced from 40
      marginBottom: 10, // Reduced from 20
  },
  badge: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 6,
     backgroundColor: 'rgba(110, 86, 207, 0.15)', 
     paddingHorizontal: 10, // Reduced from 12
     paddingVertical: 4,  // Reduced from 6
     borderRadius: 16,
     marginBottom: 12, // Reduced from 16
  },
  badgeText: {
      fontSize: 11, // Reduced from 12
      fontFamily: Fonts.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
  },
  heroTitle: {
      fontSize: 28, // Reduced from 36
      fontFamily: Fonts.bold, 
      textAlign: 'center',
      lineHeight: 34, // Reduced from 42
      letterSpacing: -0.5, // Reduced from -1
      marginBottom: 8, // Reduced from 12
  },
  heroSubtitle: {
      fontSize: 14, // Reduced from 16
      fontFamily: Fonts.regular,
      textAlign: 'center',
      lineHeight: 20, // Reduced from 24
      maxWidth: '90%', // Increased width to prevent wrapping
  },

  // Illustration
  illustrationContainer: {
      alignItems: 'center',
      marginBottom: 10, // Reduced from 20
      height: 160, // Reduced from 200
      justifyContent: 'center',
  },
  lottie: {
      width: 180, // Reduced from 250
      height: 180,
  },

  // Carousel
  carouselSection: {
      marginBottom: 24, // Reduced from 40
  },
  benefitCard: {
      width: CARD_WIDTH,
      padding: 16, // Reduced from 24
      borderRadius: 16, // Reduced from 24
      borderWidth: 1,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
  },
  iconBox: {
      width: 44, // Reduced from 56
      height: 44,
      borderRadius: 16, // Reduced from 18
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12, // Reduced from 16
  },
  cardTitle: {
      fontSize: 16, // Reduced from 20
      fontFamily: Fonts.bold,
      marginBottom: 6, // Reduced from 8
  },
  cardDesc: {
      fontSize: 13, // Reduced from 15
      fontFamily: Fonts.regular,
      lineHeight: 18, // Reduced from 22
  },

  // Actions
  actionSection: {
      paddingHorizontal: 24,
      alignItems: 'center',
      gap: 10, // Reduced from 12
  },
  primaryBtn: {
      width: '100%',
      height: 48, // Reduced from 56
      borderRadius: 16, // Reduced from 28
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      shadowColor: '#6e56cf',
      shadowOffset: { width: 0, height: 4 }, // Reduced shadow
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
  },
  primaryBtnText: {
      fontSize: 16, // Reduced from 18
      fontFamily: Fonts.bold,
      color: '#fff',
  },
  secondaryBtn: {
      width: '100%',
      height: 48, // Reduced from 56
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
  },
  secondaryBtnText: {
      fontSize: 15, // Reduced from 16
      fontFamily: Fonts.bold,
  },
});
