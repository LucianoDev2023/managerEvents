# Script para configurar EAS Environment Variables
# Execute este script para adicionar todas as variáveis de ambiente ao EAS Build
# Uso: .\setup-eas-secrets.ps1

Write-Host "🔐 Configurando EAS Environment Variables para o projeto..." -ForegroundColor Cyan
Write-Host ""

# Cloudinary Configuration
Write-Host "📦 Configurando Cloudinary..." -ForegroundColor Yellow
eas env:create CLOUDINARY_CLOUD_NAME --value "djxmv3lkq" --environment production --environment preview
eas env:create CLOUDINARY_API_KEY --value "719221955329617" --environment production --environment preview
eas env:create CLOUDINARY_API_SECRET --value "bQRbN0FCYOcx7ypWWA-LHZKHM0c" --environment production --environment preview
eas env:create EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME --value "djxmv3lkq" --environment production --environment preview
eas env:create EXPO_PUBLIC_CLOUDINARY_PRESET_IMAGE --value "wpfg2025app" --environment production --environment preview

# Google Configuration
Write-Host "🔑 Configurando Google APIs..." -ForegroundColor Yellow
eas env:create GOOGLE_CLIENT_ID --value "1036526058558-68f3itdn0gccjii0ag0dvada4ljgaheid.apps.googleusercontent.com" --environment production --environment preview
# eas env:create EXPO_PUBLIC_GOOGLE_PLACES_API_KEY --value "AIzaSyAUJ6vHju5u1F6h1Y_nRqx2aUSaRlpC7y4" --environment production --environment preview  # Já existe

# Firebase Configuration
Write-Host "🔥 Configurando Firebase..." -ForegroundColor Yellow
eas env:create EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs" --environment production --environment preview
eas env:create EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "wpfg-2025.firebaseapp.com" --environment production --environment preview
eas env:create EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "wpfg-2025" --environment production --environment preview
eas env:create EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "wpfg-2025.firebasestorage.app" --environment production --environment preview
eas env:create EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "1036526058558" --environment production --environment preview
eas env:create EXPO_PUBLIC_FIREBASE_APP_ID --value "1:1036526058558:web:37897f3d04ec1efd30e56f" --environment production --environment preview

Write-Host ""
Write-Host "✅ Todas as variáveis de ambiente foram configuradas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Para verificar as variáveis configuradas, execute:" -ForegroundColor Cyan
Write-Host "   eas env:list" -ForegroundColor White
Write-Host ""
Write-Host "🔄 Para atualizar uma variável existente, execute:" -ForegroundColor Cyan
Write-Host "   eas env:delete NOME_DA_VARIAVEL" -ForegroundColor White
Write-Host "   eas env:create NOME_DA_VARIAVEL --value `"novo_valor`" --environment production --environment preview" -ForegroundColor White
