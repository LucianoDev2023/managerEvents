import type { ImagePickerAsset } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { getCloudinarySignature } from '@/lib/getCloudinarySignature';
import { logger } from '@/lib/logger';

type UploadOpts = {
  eventId: string;
  kind: 'cover' | 'photo';
};

export async function uploadPhotoToCloudinary(
  asset: ImagePickerAsset,
  opts: UploadOpts,
) {
  const uri = asset.uri;

  const type = asset.mimeType ?? 'image/jpeg';
  const name =
    asset.fileName ??
    `photo_${Date.now()}.${type.includes('png') ? 'png' : 'jpg'}`;

  const allowed = new Set(['image/jpeg', 'image/png']);
  if (!allowed.has(type)) {
    throw new Error('Formato de imagem não permitido (apenas JPEG/PNG)');
  }

  const info = await FileSystem.getInfoAsync(uri);
  const sizeBytes = (info as any)?.size ?? 0;

  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  if (sizeBytes && sizeBytes > MAX_SIZE) {
    throw new Error('Arquivo muito grande (máx 2MB)');
  }

  const MAX_DIM = 4096;
  const w = asset.width ?? 0;
  const h = asset.height ?? 0;
  if ((w && w > MAX_DIM) || (h && h > MAX_DIM)) {
    throw new Error('Dimensões acima do permitido (máx 4096px)');
  }

  // ✅ pega assinatura do backend (obrigatório: eventId + kind)
  const sig = await getCloudinarySignature({
    eventId: opts.eventId,
    kind: opts.kind,
  });

  const data = new FormData();
  data.append('file', { uri, type, name } as any);

  data.append('api_key', sig.apiKey);
  data.append('timestamp', String(sig.timestamp));
  data.append('signature', sig.signature);

  // ✅ campos assinados: envie exatamente os mesmos
  data.append('folder', sig.folder);

  if (sig.transformation) {
    data.append('transformation', sig.transformation); // "e_strip"
  }

  // ⚠️ crucial: mande overwrite exatamente como o backend devolve
  // (ideal é backend devolver "false" string)
  if (typeof sig.overwrite !== 'undefined') {
    data.append('overwrite', String(sig.overwrite));
  }

  const controller = new AbortController();
  // ⏳ Aumentado para 120s para dar fôlego em conexões lentas (upload de imagem)
  const t = setTimeout(() => controller.abort(), 120_000);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;

  logger.debug(`[Upload] 📤 Iniciando envio para Cloudinary (${(sizeBytes / 1024).toFixed(1)} KB)...`);
  const tUploadStart = Date.now();

  const res = await fetch(uploadUrl, {
    method: 'POST',
    body: data,
    signal: controller.signal,
  }).catch((err: any) => {
    logger.error('[Upload] ❌ Erro de rede ou timeout:', err);
    if (err.name === 'AbortError') {
      throw new Error('Tempo limite de upload excedido. Tente uma conexão mais rápida.');
    }
    throw new Error('Falha de conexão no upload. Verifique sua internet.');
  })
  .finally(() => clearTimeout(t));

  const uploadDuration = Date.now() - tUploadStart;
  logger.debug(`[Upload] ✅ Resposta Cloudinary: status ${res.status} em ${uploadDuration}ms`);

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    logger.error('[Upload] 🚫 Erro retornado pelo Cloudinary:', json?.error?.message);
    throw new Error(
      json?.error?.message || 'Erro ao enviar foto para Cloudinary',
    );
  }

  return {
    uri: json.secure_url as string,
    publicId: json.public_id as string,
    width: json.width as number | undefined,
    height: json.height as number | undefined,
    format: json.format as string | undefined,
  };
}
