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
