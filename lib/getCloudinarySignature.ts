import { getAuth } from 'firebase/auth';

const SIGN_BASE_URL = 'https://api.iafast.com.br';

type SignInput = {
  eventId: string;
  kind: 'cover' | 'photo';
};

type SignResponse = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  transformation: string; // "e_strip"
  overwrite: boolean; // ou "false" se você mudar no backend
};

export async function getCloudinarySignature(input: SignInput) {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Usuário não autenticado');

  const token = await user.getIdToken(true);

  const url = `${SIGN_BASE_URL}/api/cloudinary/sign`;

  console.log(`[Signature] ⏳ Solicitando assinatura para ${input.kind} (evento: ${input.eventId})`);
  const tStart = Date.now();
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  }).catch(err => {
    console.log('[Signature] ❌ Falha na requisição de rede:', err.message);
    throw new Error('Falha de conexão ao obter assinatura. Verifique sua internet.');
  });

  const duration = Date.now() - tStart;
  console.log(`[Signature] ✅ Resposta recebida em ${duration}ms (status: ${res.status})`);

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!res.ok) {
    throw new Error(
      json?.error ||
        json?.detail ||
        json?.message ||
        `Falha ao obter assinatura (${res.status})`,
    );
  }

  return json as SignResponse;
}
