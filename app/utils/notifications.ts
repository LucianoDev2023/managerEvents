import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

export async function requestNotificationPermission() {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    return newStatus === 'granted';
  }
  return true;
}

export async function scheduleNotification(activity: {
  title: string;
  date: string | Date;
  time: string; // Ex: '14:30'
}) {
  const permission = await requestNotificationPermission();
  if (!permission) {
    Alert.alert(
      'Permissão negada',
      'Ative as notificações para ser lembrado da atividade.'
    );
    return;
  }

  // Cria a data da atividade combinando data + hora
  const [hour, minute] = activity.time.split(':').map(Number);
  const date = new Date(activity.date);
  date.setHours(hour, minute, 0, 0);

  // Define 15 minutos antes
  const triggerDate = new Date(date.getTime() - 15 * 60 * 1000);
  const now = new Date();

  // ❌ Se já passou do horário da notificação
  if (triggerDate <= now) {
    Alert.alert(
      'Atividade já passou',
      'Não é possível agendar uma notificação para uma atividade que já ocorreu.'
    );
    return;
  }

  // ✅ Agenda a notificação
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 Lembrete: ${activity.title}`,
      body: `A atividade começa às ${activity.time}.`,
      sound: 'default',
    },
    trigger: triggerDate as unknown as Notifications.NotificationTriggerInput,
  });

  Alert.alert(
    'Notificação agendada!',
    `Você será lembrado às ${triggerDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`
  );
}
