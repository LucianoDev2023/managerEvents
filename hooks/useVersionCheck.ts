import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Constants from 'expo-constants';
import { Alert, Linking, Platform } from 'react-native';
import { logger } from '@/lib/logger';

type VersionConfig = {
  minVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateMessage?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
};

/**
 * Hook para verificar se o app precisa ser atualizado
 *
 * Compara a versão atual do app com a versão mínima configurada no Firestore.
 * Se estiver desatualizado, mostra um alerta para o usuário.
 *
 * @param enableInDev - Se true, verifica versão mesmo em desenvolvimento (útil para testes)
 */
export function useVersionCheck(enableInDev = true) {
  const [isChecking, setIsChecking] = useState(true);
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      // Em desenvolvimento, só verifica se enableInDev for true
      if (__DEV__ && !enableInDev) {
        logger.debug('[VersionCheck] Pulando verificação em desenvolvimento');
        setIsChecking(false);
        return;
      }

      Linking.addEventListener('url', (event) => {
        // Log deep links only in debug if needed
      });

      try {
        const appVersion = Constants.expoConfig?.version || '1.0.0';
        logger.debug(`[VersionCheck] Versão atual do app: ${appVersion}`);

        // Busca configuração de versão do Firestore
        const versionDoc = await getDoc(doc(db, 'config', 'appVersion'));

        if (!versionDoc.exists()) {
          logger.warn(
            '[VersionCheck] Documento de versão não encontrado no Firestore',
          );
          setIsChecking(false);
          return;
        }

        const config = versionDoc.data() as VersionConfig;
        const minVersion = config.minVersion || '1.0.0';
        const forceUpdate = config.forceUpdate || false;
        const updateMessage =
          config.updateMessage || 'Uma nova versão está disponível.';

        logger.debug(
          `[VersionCheck] Versão mínima: ${minVersion}, Force update: ${forceUpdate}`,
        );

        // Compara versões
        const comparison = compareVersions(appVersion, minVersion);

        if (comparison < 0) {
          logger.info(
            `[VersionCheck] App desatualizado. Atual: ${appVersion}, Mínima: ${minVersion}`,
          );
          setNeedsUpdate(true);

          // Determina URL da loja
          const storeUrl =
            Platform.OS === 'ios'
              ? config.appStoreUrl || 'https://apps.apple.com/app/id123456789'
              : config.playStoreUrl ||
                'https://play.google.com/store/apps/details?id=com.luciano_dev_2025.gerenciadordeeventos';

          // Mostra alerta
          Alert.alert(
            'Atualização Necessária',
            forceUpdate
              ? `${updateMessage}\n\nPor favor, atualize o app para continuar usando.`
              : `${updateMessage}\n\nRecomendamos atualizar para a melhor experiência.`,
            [
              !forceUpdate && {
                text: 'Depois',
                style: 'cancel',
                onPress: () => setNeedsUpdate(false),
              },
              {
                text: 'Atualizar',
                onPress: () => {
                  Linking.openURL(storeUrl).catch((err) => {
                    logger.error('[VersionCheck] Erro ao abrir loja:', err);
                    Alert.alert(
                      'Erro',
                      'Não foi possível abrir a loja de aplicativos.',
                    );
                  });
                },
              },
            ].filter(Boolean) as any,
            { cancelable: !forceUpdate },
          );
        } else {
          logger.debug('[VersionCheck] App está atualizado');
        }
      } catch (error: any) {
        logger.error('[VersionCheck] Erro ao verificar versão:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkVersion();
  }, [enableInDev]);

  return { isChecking, needsUpdate };
}

/**
 * Compara duas versões no formato semver (X.Y.Z)
 *
 * @returns -1 se v1 < v2, 0 se v1 === v2, 1 se v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}
