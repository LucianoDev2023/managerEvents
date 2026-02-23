import React, { useCallback, useEffect } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useColorScheme, TouchableOpacity, BackHandler } from 'react-native';
import Colors from '../../constants/Colors';
import { ArrowLeft } from 'lucide-react-native';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

export default function StackLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { from } = useLocalSearchParams<{ from?: string }>();

  const { handleGoBack } = useSmartNavigation(from);


  const HeaderBack = () => (
    <TouchableOpacity onPress={handleGoBack} style={{ paddingHorizontal: 16 }}>
      <ArrowLeft size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  const SimpleBack = () => (
    <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 16 }}>
      <ArrowLeft size={24} color={colors.primary} />
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          fontFamily: 'Inter-Bold',
          fontSize: 18,
          color: colors.primary,
        },
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.background },
        headerLeft: HeaderBack,
      }}
    >
      {/* ✅ telas reais existentes em app/(stack) */}
      <Stack.Screen name="myevents" options={{ title: 'Lista de eventos' }} />
      <Stack.Screen name="donate" options={{ title: 'Doação' }} />
      <Stack.Screen name="qr-scanner" options={{ title: 'Ler convite' }} />
      <Stack.Screen name="help" options={{ title: 'Centro de Ajuda' }} />

      {/* ✅ telas reais dentro de events */}
      <Stack.Screen name="events/new" options={{ title: 'Novo evento' }} />
      <Stack.Screen name="events/[id]" options={{ headerShown: false }} />

      {/* ✅ rotas existentes dentro de events/[id]/... */}
      <Stack.Screen
        name="events/[id]/permissions"
        options={{ title: 'Administrar permissões', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/confirmed-guests"
        options={{
          title: 'Lista de convidados',
          headerLeft: SimpleBack,
        }}
      />

      <Stack.Screen
        name="events/[id]/edit-my-participation"
        options={{ title: 'Editar minha participação', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/edit-participation/[guestId]"
        options={{ title: 'Editar acompanhantes', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/eventOrganizerNoteViewScreen"
        options={{ title: 'Anotações', headerLeft: SimpleBack }}
      />
      <Stack.Screen
        name="events/[id]/eventOrganizerNoteScreen"
        options={{ title: 'Nova anotação', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/add-guest"
        options={{ title: 'Adicionar convidado', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/add-guest-manual"
        options={{ title: 'Adicionar manualmente', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/financials"
        options={{ title: 'Financeiro', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/tasks"
        options={{ title: 'Tarefas', headerLeft: SimpleBack }}
      />

      <Stack.Screen
        name="events/[id]/program/[programId]/activity/[activityId]/photos"
        options={{
          title: 'Fotos',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
            >
              <ArrowLeft size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <Stack.Screen 
        name="events/[id]/dashboard" 
        options={{ title: 'Painel de Gestão', headerLeft: SimpleBack }} 
      />
    </Stack>
  );
}
