import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { Chrome } from 'lucide-react-native';
import GoogleIcon from './GoogleIcon';

interface GoogleLoginButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled?: boolean;
}

export function GoogleLoginButton({
  onPress,
  loading,
  disabled,
}: GoogleLoginButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#000" />
      ) : (
        <View style={styles.content}>
          <GoogleIcon size={20} />
          <Text style={styles.text}>Continuar com Google</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabled: {
    opacity: 0.7,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
});
