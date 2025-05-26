export async function uploadImageToCloudinary(uri: string) {
  console.log('[uploadImageToCloudinary] URI original:', uri);

  const isVideo = uri.toLowerCase().endsWith('.mp4');

  const type = isVideo ? 'video/mp4' : 'image/jpeg';
  const name = isVideo ? 'upload.mp4' : 'upload.jpg';
  const resourceType = isVideo ? 'video' : 'image';
  const preset = isVideo ? 'wpfg2025app2' : 'wpfg2025app'; // ✅ usa o preset correto

  const data = new FormData();
  data.append('file', {
    uri,
    type,
    name,
  } as any);
  data.append('upload_preset', preset); // ✅ apenas 1 preset
  data.append('cloud_name', 'djxmv3lkq');

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/djxmv3lkq/${resourceType}/upload`,
    {
      method: 'POST',
      body: data,
    }
  );

  const json = await res.json();
  console.log('[Cloudinary response]', json);

  if (!res.ok) {
    throw new Error(
      json?.error?.message || 'Erro ao enviar arquivo para Cloudinary'
    );
  }

  return {
    uri: json.secure_url,
    publicId: json.public_id,
    type: resourceType,
  };
}
