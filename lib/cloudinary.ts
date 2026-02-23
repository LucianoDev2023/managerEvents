import { getAuth } from 'firebase/auth';
import { logger } from '@/lib/logger';

const SIGN_BASE_URL = 'https://api.iafast.com.br';

/**
 * Deletes an image from Cloudinary via the backend proxy.
 */
export async function destroyCloudinaryImage(publicId: string | null | undefined) {
  if (!publicId) return;

  try {
    const user = getAuth().currentUser;
    if (!user) throw new Error('Usuário não autenticado');

    const token = await user.getIdToken(true);
    const url = `${SIGN_BASE_URL}/api/cloudinary/destroy`;

    logger.debug(`[Cloudinary] 🗑️ Solicitando exclusão da imagem: ${publicId}`);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ publicId }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      logger.error('[Cloudinary] ❌ Falha ao excluir imagem:', errorData);
      return; // Falha silenciosa para não travar o fluxo de exclusão principal
    }

    logger.debug(`[Cloudinary] ✅ Imagem excluída com sucesso: ${publicId}`);
  } catch (error) {
    logger.error('[Cloudinary] ❌ Erro inesperado ao excluir imagem:', error);
  }
}

/**
 * Cloudinary image optimization utility
 */

type OptimizationOptions = {
  width?: number;
  height?: number;
  quality?: string | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  crop?: 'fill' | 'scale' | 'thumb' | 'fit';
};

/**
 * Injects Cloudinary transformation parameters into a URL.
 * Example: .../image/upload/v1234/path/to/img.jpg 
 *      -> .../image/upload/q_auto,f_auto,w_800/v1234/path/to/img.jpg
 */
export function getOptimizedUrl(url: string | null | undefined, opts: OptimizationOptions = {}) {
  if (!url) return '';
  if (!url.includes('cloudinary.com')) return url;

  // Parameters
  const params: string[] = [];
  
  // Best practice for performance/quality balance
  params.push(`q_${opts.quality ?? 'auto'}`);
  params.push(`f_${opts.format ?? 'auto'}`);

  if (opts.width) params.push(`w_${opts.width}`);
  if (opts.height) params.push(`h_${opts.height}`);
  if (opts.crop) params.push(`c_${opts.crop}`);

  const transformationString = params.join(',');

  // Find the point to inject transformations: /upload/
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  return `${parts[0]}/upload/${transformationString}/${parts[1]}`;
}
