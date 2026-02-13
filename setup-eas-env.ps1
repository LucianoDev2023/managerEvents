# Script para configurar EAS Environment Variables
# Execute este script para adicionar todas as variaveis de ambiente ao EAS Build
# Uso: .\setup-eas-env.ps1

Write-Host "Configurando EAS Environment Variables para o projeto..." -ForegroundColor Cyan
Write-Host ""

# Cloudinary Configuration
Write-Host "Configurando Cloudinary..." -ForegroundColor Yellow
eas env:create production --name CLOUDINARY_CLOUD_NAME --value "djxmv3lkq" --visibility secret --non-interactive
eas env:create preview --name CLOUDINARY_CLOUD_NAME --value "djxmv3lkq" --visibility secret --non-interactive
eas env:create production --name CLOUDINARY_API_KEY --value "719221955329617" --visibility secret --non-interactive
eas env:create preview --name CLOUDINARY_API_KEY --value "719221955329617" --visibility secret --non-interactive
eas env:create production --name CLOUDINARY_API_SECRET --value "bQRbN0FCYOcx7ypWWA-LHZKHM0c" --visibility secret --non-interactive
eas env:create preview --name CLOUDINARY_API_SECRET --value "bQRbN0FCYOcx7ypWWA-LHZKHM0c" --visibility secret --non-interactive
eas env:create production --name EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME --value "djxmv3lkq" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME --value "djxmv3lkq" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_CLOUDINARY_PRESET_IMAGE --value "wpfg2025app" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_CLOUDINARY_PRESET_IMAGE --value "wpfg2025app" --visibility plaintext --non-interactive

# Google Configuration
Write-Host "Configurando Google APIs..." -ForegroundColor Yellow
eas env:create production --name GOOGLE_CLIENT_ID --value "1036526058558-68f3itdn0gccjii0ag0dvada4ljgaheid.apps.googleusercontent.com" --visibility secret --non-interactive
eas env:create preview --name GOOGLE_CLIENT_ID --value "1036526058558-68f3itdn0gccjii0ag0dvada4ljgaheid.apps.googleusercontent.com" --visibility secret --non-interactive
# EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ja existe, pulando...

# Firebase Configuration
Write-Host "Configurando Firebase..." -ForegroundColor Yellow
eas env:create production --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyD_UKirzoq-kOOBaxo63sct1QbH-46zvTs" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "wpfg-2025.firebaseapp.com" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "wpfg-2025.firebaseapp.com" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "wpfg-2025" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "wpfg-2025" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "wpfg-2025.firebasestorage.app" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "wpfg-2025.firebasestorage.app" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "1036526058558" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "1036526058558" --visibility plaintext --non-interactive
eas env:create production --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:1036526058558:web:37897f3d04ec1efd30e56f" --visibility plaintext --non-interactive
eas env:create preview --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:1036526058558:web:37897f3d04ec1efd30e56f" --visibility plaintext --non-interactive

Write-Host ""
Write-Host "Todas as variaveis de ambiente foram configuradas!" -ForegroundColor Green
Write-Host ""
Write-Host "Para verificar as variaveis configuradas, execute:" -ForegroundColor Cyan
Write-Host "   eas env:list --environment production" -ForegroundColor White
Write-Host "   eas env:list --environment preview" -ForegroundColor White
