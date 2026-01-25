// utils/shareKey.ts
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function generateShareKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = 'plx-';
  for (let i = 0; i < 6; i++)
    key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

export async function pickUniqueShareKey() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const shareKey = generateShareKey();
    const ref = doc(db, 'eventShareKeys', shareKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) return shareKey;
  }
  throw new Error('Não foi possível gerar um shareKey único. Tente novamente.');
}
