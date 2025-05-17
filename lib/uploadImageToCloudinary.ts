export async function uploadImageToCloudinary(uri: string) {
  console.log('[uploadImageToCloudinary] URI original:', uri);

  const data = new FormData();
  data.append('file', {
    uri,
    type: 'image/jpeg', // ou 'image/png' dependendo da imagem
    name: 'upload.jpg',
  } as any);
  data.append('upload_preset', 'wpfg2025app'); // substitua com o seu preset
  data.append('cloud_name', 'djxmv3lkq'); // substitua com o seu cloud name

  const res = await fetch(
    'https://api.cloudinary.com/v1_1/djxmv3lkq/image/upload',
    {
      method: 'POST',
      body: data,
    }
  );

  const json = await res.json();
  console.log('[Cloudinary response]', json);

  if (!res.ok) {
    throw new Error(
      json?.error?.message || 'Erro ao enviar imagem para Cloudinary'
    );
  }

  return {
    uri: json.secure_url,
    publicId: json.public_id,
  };
}
