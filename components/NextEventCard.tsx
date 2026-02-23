import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, MapPin, Clock } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { EventVM } from '@/types/eventView';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NextEventCardProps {
  event: EventVM;
}

export default function NextEventCard({ event }: NextEventCardProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const eventDate = new Date(event.startDate);
      const diff = eventDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Acontecendo agora!');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        setTimeLeft(`Faltam ${days} dia${days > 1 ? 's' : ''}`);
      } else {
        setTimeLeft(`Faltam ${hours} hora${hours > 1 ? 's' : ''}`);
      }
    };

    calculateTimeLeft();
    // Atualiza a cada minuto se estiver muito próximo, ou só roda uma vez se for dias.
    // Para simplificar, rodamos uma vez na montagem e deixamos estático por enquanto, 
    // ou poderíamos usar um interval se fosse crítico.
  }, [event.startDate]);

  const formattedDate = format(new Date(event.startDate), "EEEE, d 'de' MMMM", { locale: ptBR });
  const formattedTime = format(new Date(event.startDate), 'HH:mm');

  return (
    <Animated.View entering={FadeInDown.duration(600).delay(200)}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/(stack)/events/${event.id}`)}
        style={styles.container}
      >
        <ImageBackground
          source={event.coverImage ? { uri: event.coverImage } : require('@/assets/images/adaptive-icon.png')} // Fallback image needed? Or just gradient?
          style={styles.backgroundImage}
          imageStyle={{ borderRadius: 24, opacity: 0.6 }}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.overlay}
          >
            <View style={styles.header}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Próximo Evento</Text>
              </View>
              <View style={styles.countdown}>
                <Clock size={14} color="#FF9F1C" />
                <Text style={styles.countdownText}>{timeLeft}</Text>
              </View>
            </View>

            <View style={styles.content}>
              <Text style={styles.title} numberOfLines={2}>
                {event.title}
              </Text>
              
              <View style={styles.row}>
                <Calendar size={16} color="#ddd" />
                <Text style={styles.infoText}>
                  {formattedDate} às {formattedTime}
                </Text>
              </View>

              {event.location && (
                <View style={styles.row}>
                  <MapPin size={16} color="#ddd" />
                  <Text style={styles.infoText} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 190,
    borderRadius: 24,
    marginBottom: 0,
    backgroundColor: '#2A2A2A', // Fallback color
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    borderRadius: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: Colors.light.primary, // Using primary color
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    color: '#fff',
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countdownText: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    color: '#FF9F1C',
  },
  content: {
    gap: 8,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 24,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: '#ddd',
  },
});
