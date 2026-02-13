/**
 * Script para criar automaticamente o documento de configuração de versão no Firestore
 * 
 * Execute: npx tsx scripts/setup-version-config.ts
 * 
 * Ou se não tiver tsx instalado: npm install -g tsx
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuração do Firebase (mesma do app)
const firebaseConfig = {
  apiKey: "AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs",
  authDomain: "wpfg-2025.firebaseapp.com",
  projectId: "wpfg-2025",
  storageBucket: "wpfg-2025.firebasestorage.app",
  messagingSenderId: "1036526058558",
  appId: "1:1036526058558:web:37897f3d04ec1efd30e56f"
};

async function setupVersionConfig() {
  console.log('🔥 Inicializando Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    console.log('📝 Criando documento config/appVersion no Firestore...');

    await setDoc(doc(db, 'config', 'appVersion'), {
      minVersion: "1.0.0",
      currentVersion: "1.0.0",
      forceUpdate: false,
      updateMessage: "Nova versão disponível com melhorias!",
      playStoreUrl: "https://play.google.com/store/apps/details?id=com.luciano_dev_2025.gerenciadordeeventos",
      appStoreUrl: "https://apps.apple.com/app/id123456789"
    });

    console.log('✅ Documento criado com sucesso!\n');
    console.log('📋 Configuração criada:');
    console.log('  Collection: config');
    console.log('  Document: appVersion');
    console.log('  Campos:');
    console.log('    - minVersion: "1.0.0"');
    console.log('    - currentVersion: "1.0.0"');
    console.log('    - forceUpdate: false');
    console.log('    - updateMessage: "Nova versão disponível com melhorias!"');
    console.log('    - playStoreUrl: https://play.google.com/...');
    console.log('    - appStoreUrl: https://apps.apple.com/...\n');
    
    console.log('🧪 Para testar a verificação de versão:');
    console.log('  1. Acesse: https://console.firebase.google.com/project/wpfg-2025/firestore/data/config/appVersion');
    console.log('  2. Altere minVersion para "2.0.0"');
    console.log('  3. Abra o app');
    console.log('  4. Você verá o alerta de atualização!\n');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Erro ao criar documento:', error.message);
    console.error('\n💡 Possíveis soluções:');
    console.error('  1. Verifique se as regras do Firestore permitem escrita');
    console.error('  2. Tente criar manualmente seguindo: FIRESTORE_VERSION_SETUP.md');
    console.error('  3. Verifique sua conexão com a internet\n');
    process.exit(1);
  }
}

setupVersionConfig();
