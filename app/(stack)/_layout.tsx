import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme, View, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

export default function StackLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack
        screenOptions={{
          headerShown: true,
          animation: 'fade',
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontFamily: 'Inter-Bold',
            fontSize: 18,
            color: colors.primary,
          },
          headerTintColor: colors.text,
          headerTitleAlign: 'center',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {/* Todas as telas devem estar dentro do componente Stack */}
        <Stack.Screen
          name="events/[id]/edit_event"
          options={{
            title: '',
            // Para título dinâmico:
            // headerTitle: ({ route }) => route.params?.eventTitle || 'Editar Evento'
          }}
        />

        <Stack.Screen
          name="myevents"
          options={{
            title: 'Lista de eventos',
            headerShown: true,
            // Para título dinâmico:
            // headerTitle: ({ route }) => route.params?.eventTitle || 'Editar Evento'
          }}
        />
        <Stack.Screen
          name="permission-confirmation/[id]"
          options={{
            title: 'Administrar permissões',
            headerShown: true,
            // Para título dinâmico:
            // headerTitle: ({ route }) => route.params?.eventTitle || 'Editar Evento'
          }}
        />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
