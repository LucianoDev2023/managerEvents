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
} = process.env;

if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET || !CLOUDINARY_CLOUD_NAME) {
  throw new Error('Missing Cloudinary env vars');
}

if (!admin.apps.length) admin.initializeApp();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ALLOWED_CORS_ORIGIN ? [ALLOWED_CORS_ORIGIN] : true,
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

app.get('/health', (_, res) => res.json({ ok: true }));

async function cloudinarySignHandler(req, res) {
  try {
    const token = getBearerToken(req);
    if (!token)
      return res.status(401).json({ error: { message: 'Missing token' } });

    await admin.auth().verifyIdToken(token);

    const parsed = SignSchema.safeParse(req.body ?? {});
    if (!parsed.success)
      return res.status(400).json({ error: { message: 'Invalid body' } });

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
    return res.status(500).json({ error: { message: 'Sign failed' } });
  }
}

app.post('/cloudinary/sign', cloudinarySignHandler);
app.post('/api/cloudinary/sign', cloudinarySignHandler);

app.listen(Number(PORT), () => console.log(`plannix-sign running on :${PORT}`));
