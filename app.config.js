export default ({ config }) => {
  return {
    ...config,
    expo: {
      name: "Plannix",
      slug: "gerenciador-de-eventos",
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/images/icon.png",
      scheme: "planejeja",
      userInterfaceStyle: "automatic",
      newArchEnabled: false,
      splash: {
        image: "./assets/images/splash.png",
        resizeMode: "contain",
        backgroundColor: "#503581"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.planejeja.plannix",
        infoPlist: {},
        associatedDomains: ["applinks:planejeja.com.br"]
      },
      android: {
        package: "com.luciano_dev_2025.gerenciadordeeventos",
        intentFilters: [
          {
            action: "VIEW",
            data: {
              scheme: "https",
              host: "planejeja.com.br",
              pathPrefix: "/"
            },
            category: ["BROWSABLE", "DEFAULT"]
          },
          {
            action: "VIEW",
            data: [{ scheme: "planejeja" }],
            category: ["BROWSABLE", "DEFAULT"]
          }
        ],
        config: {
          googleMaps: {
            // Usa variável de ambiente ao invés de hardcoded
            apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
          }
        },
        backgroundColor: "#3e1d73"
      },
      web: {
        bundler: "metro",
        output: "single",
        favicon: "./assets/images/favicon.png"
      },
      plugins: [
        "expo-router",
        "expo-barcode-scanner",
        [
          "expo-camera",
          {
            cameraPermission: "Permissão para acessar a câmera é necessária",
            recordAudioAndroid: false
          }
        ],
        "expo-font"
      ],
      experiments: {
        typedRoutes: true
      },
      extra: {
        router: {
          origin: false
        },
        eas: {
          projectId: "0b93c50d-c72a-4fe0-aefd-d4cafb8f6583"
        },
        // Expõe variáveis de ambiente para o app via Constants.expoConfig.extra
        cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
        cloudinaryPreset: process.env.EXPO_PUBLIC_CLOUDINARY_PRESET_IMAGE,
        googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
        firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
        firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
        firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
        firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
        firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
      }
    }
  };
};
