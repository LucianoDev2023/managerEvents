import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

export default function InviteGateScreen() {
  const { k, shareKey } = useLocalSearchParams<{
    k?: string;
    shareKey?: string;
  }>();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const resolvedKey = useMemo(() => {
    const a = typeof k === 'string' ? k.trim() : '';
    const b = typeof shareKey === 'string' ? shareKey.trim() : '';
    return a || b || '';
  }, [k, shareKey]);

  const goLogin = () => {
    router.replace({
      pathname: '/(auth)/login',
      params: resolvedKey ? { k: resolvedKey } : {},
    } as any);
  };

  const goRegister = () => {
    router.replace({
      pathname: '/(auth)/register',
      params: resolvedKey ? { k: resolvedKey } : {},
    } as any);
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 20,
          fontWeight: '800',
          marginBottom: 12,
          textAlign: 'center',
        }}
      >
        Você recebeu um convite
      </Text>

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        Para acessar este convite, é necessário realizar login ou cadastro.
      </Text>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Pressable
          onPress={goLogin}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.primary,
            backgroundColor: colors.primary,
            marginRight: 8,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Fazer login</Text>
        </Pressable>

        <Pressable
          onPress={goRegister}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
            Criar conta
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
