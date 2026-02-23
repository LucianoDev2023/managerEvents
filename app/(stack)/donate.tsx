import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import Button from '@/components/ui/Button';
import { StatusBar } from 'expo-status-bar';
import {
  Heart,
  Coffee,
  Pizza,
  Rocket,
  ShieldCheck,
  Sparkles,
  Copy,
  CheckCircle2,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function DonateScreen() {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [copied, setCopied] = useState(false);

  const gradientColors: [string, string, string] =
    scheme === 'dark'
      ? ['#0b0b0f', '#1b0033', '#3e1d73']
      : ['#ffffff', '#f0f0ff', '#e9e6ff'];

  const cpfPix = '1eb4b8aa-4a6b-459a-bbcf-a2208b1815fd';

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(cpfPix);
    setCopied(true);
    Alert.alert(
      'Copiado!',
      'Chave PIX copiada para a área de transferência. Use a opção "Pix Copia e Cola" no seu banco.',
    );
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const DonationTier = ({ icon: Icon, title, value, description }: any) => (
    <View
      style={[
        styles.tierCard,
        {
          backgroundColor:
            scheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.tierIconContainer,
          { backgroundColor: colors.primary + '20' },
        ]}
      >
        <Icon size={24} color={colors.primary} />
      </View>
      <View style={styles.tierInfo}>
        <Text style={[styles.tierTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.tierValue, { color: colors.primary }]}>
          {value}
        </Text>
        <Text style={[styles.tierDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.container}
      locations={[0, 0.7, 1]}
    >
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} translucent />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.delay(100).duration(600)}
          style={styles.heroSection}
        >
          <View
            style={[
              styles.heroIconContainer,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            <Heart size={48} color={colors.primary} fill={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Apoie o Plannix
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ajude a manter este projeto independente e gratuito para todos os
            usuários.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).duration(600)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Como sua ajuda é usada?
          </Text>
          <View style={styles.valueRow}>
            <View style={styles.valueItem}>
              <Rocket size={20} color={colors.primary} />
              <Text style={[styles.valueText, { color: colors.text }]}>
                Novas Funções
              </Text>
            </View>
            <View style={styles.valueItem}>
              <ShieldCheck size={20} color={colors.primary} />
              <Text style={[styles.valueText, { color: colors.text }]}>
                Servidores
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.valueText, { color: colors.text }]}>
                Manutenção
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(500).duration(600)}
          style={styles.pixSection}
        >
          <LinearGradient
            colors={[colors.primary, '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pixCard}
          >
            <Text style={styles.pixCardTitle}>Chave PIX (Aleatória)</Text>
            <Text selectable style={styles.pixKey}>
              {cpfPix}
            </Text>

            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => [
                styles.copyBtn,
                { backgroundColor: pressed ? 'rgba(255,255,255,0.9)' : '#fff' },
              ]}
            >
              {copied ? (
                <>
                  <CheckCircle2 size={18} color="#10b981" />
                  <Text style={[styles.copyBtnText, { color: '#10b981' }]}>
                    Copiado!
                  </Text>
                </>
              ) : (
                <>
                  <Copy size={18} color={colors.primary} />
                  <Text style={[styles.copyBtnText, { color: colors.primary }]}>
                    Copiar Chave
                  </Text>
                </>
              )}
            </Pressable>
          </LinearGradient>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(700).duration(600)}
          style={styles.tiersSection}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Sugestões de Apoio
          </Text>

          <DonationTier
            icon={Coffee}
            title="Um Cafezinho"
            value="R$ 5,00"
            description="Um incentivo simbólico para alegrar o dia do desenvolvedor."
          />

          <DonationTier
            icon={Pizza}
            title="Um Lanche"
            value="R$ 25,00"
            description="Ajuda a cobrir os custos básicos de infraestrutura do mês."
          />

          <DonationTier
            icon={Rocket}
            title="Super Apoio"
            value="R$ 50,00+"
            description="Contribui diretamente para o desenvolvimento de novas funcionalidades."
          />
        </Animated.View>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Obrigado por acreditar no Plannix! ❤️
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 16,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  valueItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  valueText: {
    fontSize: 12,
    marginTop: 8,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  pixSection: {
    marginBottom: 32,
  },
  pixCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  pixCardTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  pixKey: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  copyBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  tiersSection: {
    gap: 12,
    marginBottom: 32,
  },
  tierCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  tierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tierInfo: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  tierValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginVertical: 2,
  },
  tierDescription: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 16,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 10,
  },
});
