import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckSquare, ArrowRight, AlertCircle } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import Fonts from '@/constants/Fonts';
import { EventVM } from '@/types/eventView';

interface MyTasksCardProps {
  events: EventVM[];
}

export default function MyTasksCard({ events }: MyTasksCardProps) {
  const router = useRouter();

  const { pendingCount, urgentCount } = useMemo(() => {
    let pending = 0;
    let urgent = 0;
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    events.forEach(event => {
      // Only count tasks for events where user is owner or admin
      // Assuming if they see the event tasks, they can manage them.
      // Adjust logic if needed based on permissions.
      if (event.tasks) {
        event.tasks.forEach(task => {
          if (!task.completed) {
            pending++;
            if (task.deadline) {
                const deadline = new Date(task.deadline);
                if (deadline <= threeDaysFromNow) {
                    urgent++;
                }
            }
          }
        });
      }
    });
    return { pendingCount: pending, urgentCount: urgent };
  }, [events]);

  // if (pendingCount === 0) return null; // AGORA SEMPRE VISÍVEL

  const handlePress = () => {
    if (pendingCount === 0) return;

    // Encontrar eventos com tarefas pendentes
    const eventsWithPendingTasks = events.filter(e => e.tasks?.some(t => !t.completed));

    if (eventsWithPendingTasks.length === 1) {
        // Redirecionar direto para a gestão de tarefas desse evento
        router.push(`/(stack)/events/${eventsWithPendingTasks[0].id}/tasks`);
    } else {
        // Múltiplos eventos ou fallback, vai para a lista de eventos
        router.push('/(stack)/myevents');
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(600).delay(250)}>
      <TouchableOpacity
        activeOpacity={pendingCount > 0 ? 0.9 : 1}
        onPress={handlePress} 
        style={styles.container}
      >
        <LinearGradient
          colors={pendingCount > 0 ? ['#3A1C71', '#D76D77'] : ['#11998e', '#38ef7d']} // Roxo/Rosa se pendente, Verde se tudo ok
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
            <View style={styles.iconContainer}>
                <CheckSquare size={24} color="#FFF" />
            </View>
            
            <View style={styles.contentContainer}>
                <Text style={styles.label}>Minhas Tarefas</Text>
                {pendingCount > 0 ? (
                    <>
                        <Text style={styles.countText}>
                            {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
                        </Text>
                        {urgentCount > 0 && (
                            <View style={styles.urgentContainer}>
                                <AlertCircle size={12} color="#FFD700" />
                                <Text style={styles.urgentText}>{urgentCount} urgentes</Text>
                            </View>
                        )}
                    </>
                ) : (
                     <Text style={styles.countText}>Tudo em dia! 🎉</Text>
                )}
            </View>

            {pendingCount > 0 && (
                <View style={styles.arrowContainer}>
                    <ArrowRight size={20} color="rgba(255,255,255,0.8)" />
                </View>
            )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  countText: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: '#FFF',
  },
  urgentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      backgroundColor: 'rgba(0,0,0,0.2)',
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      gap: 4
  },
  urgentText: {
      fontFamily: Fonts.medium,
      fontSize: 12,
      color: '#FFD700'
  },
  arrowContainer: {
      paddingLeft: 8
  }
});
