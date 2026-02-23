import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar as RNStatusBar,
  BackHandler,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { CalendarPlus, CalendarDays, QrCode, ChevronRight, User } from 'lucide-react-native';
import Fonts from '@/constants/Fonts';
import Colors from '@/constants/Colors';
import { auth } from '@/config/firebase';
import DashboardCard from '@/components/DashboardCard';
import NextEventCard from '@/components/NextEventCard';
import MyTasksCard from '@/components/MyTasksCard';
import { EventsContext } from '@/context/EventsContext';
import { EventVM } from '@/types/eventView';
import { useContext, useMemo } from 'react';

// Componente de Cartão Reutilizável - Removido (Extraído para components/DashboardCard.tsx)

import { Skeleton } from '@/components/ui/Skeleton';

const HomeSkeleton = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.skeletonContainer}>
      <View style={styles.header}>
        <View style={styles.logoGreetingContainer}>
          <Skeleton width={40} height={40} borderRadius={12} />
          <View style={{ marginLeft: 12 }}>
            <Skeleton width={40} height={16} style={{ marginBottom: 4 }} />
            <Skeleton width={100} height={24} />
          </View>
        </View>
        <Skeleton width={48} height={48} borderRadius={24} />
      </View>

      <Skeleton width="100%" height={220} borderRadius={24} style={{ marginBottom: 24 }} />
      <Skeleton width="100%" height={80} borderRadius={20} style={{ marginBottom: 24 }} />

      <Skeleton width={140} height={22} style={{ marginBottom: 16 }} />

      <View style={styles.grid}>
        <Skeleton width="48%" height={160} borderRadius={16} />
        <Skeleton width="48%" height={160} borderRadius={16} />
      </View>

      <Skeleton width="100%" height={160} borderRadius={16} style={{ marginTop: 16 }} />
    </View>
  );
};

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme]; // Note: Dashboard cards are optimized for dark/vivid look, but accessible
  const router = useRouter();
  
  const user = auth.currentUser;
  const userName = user?.displayName?.split(' ')[0] || 'Visitante';

  const eventsContext = useContext(EventsContext);
  const events = eventsContext?.state.events || [];
  const loading = eventsContext?.state.loading || false;

  const nextEvent = useMemo(() => {
    const now = new Date();
    // Filtra eventos futuros
    const futureEvents = events.filter(e => {
        const eventDate = new Date(e.startDate);
        return eventDate >= now || (eventDate.getTime() + 86400000) > now.getTime(); // Inclui eventos de hoje/ontem recente
    });
    
    // Ordena do mais próximo para o mais distante
    return futureEvents.sort((a, b) => {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    })[0];
  }, [events]);

  // Animação de entrada da tela
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert('Sair do App', 'Deseja realmente sair?', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
        return true;
      };
      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [])
  );

  return (
    <LinearGradient
      colors={
        colorScheme === 'dark'
          ? ['#0b0b0f', '#1b0033', '#3e1d73']
          : ['#ffffff', '#f0f0ff', '#e9e6ff']
      }
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} translucent />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {loading ? (
              <HomeSkeleton />
            ) : (
              <>
                {/* Header com Saudação */}
                <Animated.View 
                    entering={FadeInDown.duration(600).delay(100)}
                    style={styles.header}
                >
                    <View style={styles.logoGreetingContainer}>
                        <View style={[styles.logoBadge, { backgroundColor: colors.backgroundSecondary }]}>
                            <Image 
                                source={require('@/assets/images/loguinho.png')} 
                                style={styles.logoIcon}
                            />
                        </View>
                        <View>
                            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Olá,</Text>
                            <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.profileButton, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => router.push('/(tabs)/profile')}
                    >
                        {user?.photoURL ? (
                             // Se tiver foto, poderíamos usar <Image /> aqui.
                             // Por enquanto, placeholder icon.
                             <User size={24} color={colors.primary} />
                        ) : (
                            <User size={24} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Next Event Card */}
                {nextEvent && (
                    <View style={{ marginBottom: 12 }}>
                        <NextEventCard event={nextEvent} />
                    </View>
                )}

                {/* My Tasks Card */}
                <View style={{ marginBottom: 4 }}>
                    <MyTasksCard events={events} />
                </View>

                <Animated.View 
                    entering={FadeInDown.duration(600).delay(200)}
                    style={styles.sectionTitleContainer}
                >
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Painel Principal</Text>
                </Animated.View>

                {/* Grid de Ações */}
                <View style={styles.grid}>
                     {/* Card 1: Novo Evento */}
                     <DashboardCard 
                        title="Novo Evento"
                        subtitle="Criar do zero"
                        icon={CalendarPlus}
                        color="#FF6B6B" // Vermelho/Laranja vibrante
                        onPress={() => router.push('/events/new?mode=create')}
                        delay={300}
                     />

                     {/* Card 2: Meus Eventos */}
                     <DashboardCard 
                        title="Meus Eventos"
                        subtitle="Gerenciar tudo"
                        icon={CalendarDays}
                        color="#4ECDC4" // Turquesa
                        onPress={() => router.push('/(stack)/myevents')}
                        delay={400}
                     />
                </View>

                {/* Card Wide: Ler QR Code */}
                <View style={{ marginTop: 16 }}>
                    <DashboardCard 
                        title="Ler Convite"
                        subtitle="Escanear QR Code recebido"
                        icon={QrCode}
                        color="#FFE66D" // Amarelo
                        onPress={() => router.push('/(stack)/qr-scanner')}
                        delay={500}
                        fullWidth
                     />
                </View>
              </>
            )}

            {/* Espaço extra no final */}
            <View style={{ height: 100 }} />

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 20) + 4 : 4,
  },
  
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  greeting: {
      fontSize: 14,
      fontFamily: Fonts.regular,
  },
  userName: {
      fontSize: 22,
      fontFamily: Fonts.bold,
  },
  profileButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
  },
  logoGreetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  logoIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },

  sectionTitleContainer: { marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontFamily: Fonts.bold },

  grid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
  },
  skeletonContainer: {
    width: '100%',
  },

  // Estilos do Card - Removidos (Extraídos)

});
