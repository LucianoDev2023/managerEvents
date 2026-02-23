import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { z } from 'zod';
import crypto from 'crypto';

const {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  ALLOWED_CORS_ORIGIN,
  DEFAULT_FOLDER = 'plannix/events',
  PORT = '3333',
  NODE_ENV = 'development',
} = process.env;

if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
  throw new Error('Missing Cloudinary env vars');
}

// ⚠️ CORS: nunca usar '*' com credentials: true (viola spec + risco de segurança)
if (!ALLOWED_CORS_ORIGIN && NODE_ENV === 'production') {
  throw new Error(
    '[CORS] ALLOWED_CORS_ORIGIN é obrigatório em produção. ' +
    'Defina a variável de ambiente com a origem do seu app (ex: https://seusite.com).'
  );
}

const CORS_ORIGIN = ALLOWED_CORS_ORIGIN ?? 'http://localhost:8081';


if (!admin.apps.length) admin.initializeApp();

const app = express();

// 📝 Logger de Requisições (Mover para o topo total)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json());
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);

function getBearerToken(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer (.+)$/i);
  return m ? m[1] : null;
}

function cloudinarySign(params, apiSecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(sorted + apiSecret)
    .digest('hex');
}

const SignSchema = z.object({
  eventId: z.string().min(1).max(64).optional(),
  kind: z.enum(['cover', 'photo']).optional().default('photo'),
});

const ALLOWED_PUBLIC_ID_PATTERN =
  /^plannix\/events\/[a-zA-Z0-9_-]{1,64}\/(cover|photos)\/[a-zA-Z0-9_./-]{1,150}$/;

const DestroySchema = z.object({
  publicId: z
    .string()
    .min(1)
    .max(300)
    .regex(
      ALLOWED_PUBLIC_ID_PATTERN,
      'publicId fora do escopo permitido (plannix/events/{eventId}/cover|photos/...)',
    ),
});

app.get('/health', (_, res) => res.json({ ok: true }));

async function cloudinarySignHandler(req, res) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      console.log('[Sign] ❌ Missing token');
      return res.status(401).json({ error: { message: 'Missing token' } });
    }

    console.log('[Sign] ⏳ Verifying token...');
    await admin.auth().verifyIdToken(token);
    console.log('[Sign] ✅ Token verified');

    const parsed = SignSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      console.log('[Sign] ❌ Invalid body:', parsed.error);
      return res.status(400).json({ error: { message: 'Invalid body' } });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    const safeEventId = parsed.data.eventId
      ? parsed.data.eventId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
      : null;

    const kind = parsed.data.kind ?? 'photo';

    const folder = safeEventId
      ? `${DEFAULT_FOLDER}/${safeEventId}/${kind === 'cover' ? 'cover' : 'photos'}`
      : DEFAULT_FOLDER;

    const paramsToSign = {
      timestamp,
      folder,
      overwrite: 'false',
    };

    const signature = cloudinarySign(paramsToSign, CLOUDINARY_API_SECRET);

    return res.json({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      timestamp,
      folder,
      overwrite: false,
      signature,
    });
  } catch (err) {
    console.error('[Sign] Error detail:', err);
    const detail = NODE_ENV === 'development' ? err.message : undefined;
    return res.status(500).json({ error: { message: 'Sign failed', detail } });
  }
}

async function cloudinaryDestroyHandler(req, res) {
  try {
    const token = getBearerToken(req);
    if (!token)
      return res.status(401).json({ error: { message: 'Missing token' } });

    await admin.auth().verifyIdToken(token);

    const parsed = DestroySchema.safeParse(req.body ?? {});
    if (!parsed.success)
      return res.status(400).json({ error: { message: 'Invalid body (publicId required)' } });

    const { publicId } = parsed.data;
    const timestamp = Math.floor(Date.now() / 1000);

    const paramsToSign = {
      public_id: publicId,
      timestamp,
    };

    const signature = cloudinarySign(paramsToSign, CLOUDINARY_API_SECRET);

    const formData = new URLSearchParams();
    formData.append('public_id', publicId);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;

    const response = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.result === 'ok' || result.result === 'not found') {
      return res.json({ ok: true, result: result.result });
    } else {
      return res.status(400).json({ error: { message: 'Cloudinary destroy failed' } });
    }
  } catch (err) {
    console.error('[Destroy] Error:', err);
    return res.status(500).json({ error: { message: 'Destroy failed' } });
  }
}

app.post('/cloudinary/sign', cloudinarySignHandler);
app.post('/api/cloudinary/sign', cloudinarySignHandler);
app.post('/cloudinary/destroy', cloudinaryDestroyHandler);
app.post('/api/cloudinary/destroy', cloudinaryDestroyHandler);

app.listen(Number(PORT), () => console.log(`plannix-sign running on :${PORT}`));
