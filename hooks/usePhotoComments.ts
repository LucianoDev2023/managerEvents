import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { db } from '@/config/firebase';

export interface PhotoComment {
  id: string;
  text: string;
  createdAt: any;

  // ✅ novo padrão
  uid: string; // autor do comentário (UID)
  name?: string;

  // ♻️ legado (não usar mais / só leitura)
  userId?: string; // antigo
  email?: string; // antigo
}

interface UsePhotoCommentsParams {
  eventId: string;
  programId: string;
  activityId: string;
  photoId: string;

  currentUser: {
    uid: string;
    isSuperAdmin: boolean;
    name?: string;
  };

  // ✅ Moderadores (UID)
  eventCreatorId: string; // event.userId (UID)
  photoCreatorId: string; // photo.createdByUid (UID)
}

export function usePhotoComments({
  eventId,
  programId,
  activityId,
  photoId,
  currentUser,
  eventCreatorId,
  photoCreatorId,
}: UsePhotoCommentsParams) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isDeletingCommentIds, setIsDeletingCommentIds] = useState<string[]>(
    [],
  );

  useEffect(() => {
    if (!eventId || !programId || !activityId || !photoId) return;

    const commentsRef = collection(
      db,
      'events',
      eventId,
      'programs',
      programId,
      'activities',
      activityId,
      'photos',
      photoId,
      'comments',
    );

    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: PhotoComment[] = snapshot.docs.map((d) => {
        const raw = d.data() as any;

        // ✅ tentar extrair UID do novo padrão; fallback pro legado
        const uid =
          raw.uid ??
          raw.userId ?? // legado
          raw.createdByUid ?? // se algum lugar usou isso
          '';

        return {
          id: d.id,
          text: raw.text ?? '',
          createdAt: raw.createdAt ?? null,

          uid,
          name: raw.name ?? raw.displayName ?? undefined,

          // ♻️ legado (só leitura)
          userId: raw.userId ?? undefined,
          email: raw.email ?? undefined,
        };
      });

      setComments(data);
    });

    return () => unsubscribe();
  }, [eventId, programId, activityId, photoId]);

  const canDeleteComment = useMemo(() => {
    return (comment: PhotoComment) => {
      const myUid = currentUser.uid;

      // ✅ authorUid robusto (novo + legado)
      const authorUid = comment.uid || comment.userId || '';

      const isAuthor = !!authorUid && authorUid === myUid;
      const isEventCreator = myUid === eventCreatorId;
      const isPhotoCreator = myUid === photoCreatorId;
      const isSuperAdmin = currentUser.isSuperAdmin;

      return isAuthor || isEventCreator || isPhotoCreator || isSuperAdmin;
    };
  }, [
    currentUser.uid,
    currentUser.isSuperAdmin,
    eventCreatorId,
    photoCreatorId,
  ]);

  const MAX_COMMENT_LENGTH = 50;

  const addComment = async () => {
    if (!newComment.trim() || isAddingComment) return;

    if (newComment.trim().length > MAX_COMMENT_LENGTH) {
      Alert.alert('Comentário muito longo', `Máximo de ${MAX_COMMENT_LENGTH} caracteres.`);
      return;
    }

    if (!currentUser.uid) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }

    setIsAddingComment(true);
    try {
      const commentRef = collection(
        db,
        'events',
        eventId,
        'programs',
        programId,
        'activities',
        activityId,
        'photos',
        photoId,
        'comments',
      );

      // ✅ NÃO grava email (compatibilidade PlayStore/LGPD)
      await addDoc(commentRef, {
        text: newComment.trim(),
        uid: currentUser.uid,
        name: currentUser.name ?? 'Usuário',
        createdAt: serverTimestamp(),
      });

      setNewComment('');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o comentário.');
    } finally {
      setIsAddingComment(false);
    }
  };

  const deleteComment = async (comment: PhotoComment) => {
    if (!canDeleteComment(comment)) {
      return;
    }

    if (isDeletingCommentIds.includes(comment.id)) return;

    setIsDeletingCommentIds((prev) => [...prev, comment.id]);

    try {
      const ref = doc(
        db,
        'events',
        eventId,
        'programs',
        programId,
        'activities',
        activityId,
        'photos',
        photoId,
        'comments',
        comment.id,
      );

      await deleteDoc(ref);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir o comentário.');
    } finally {
      setIsDeletingCommentIds((prev) => prev.filter((id) => id !== comment.id));
    }
  };

  const confirmDeleteComment = (comment: PhotoComment) => {
    if (!canDeleteComment(comment)) {
      Alert.alert(
        'Acesso negado',
        'Você não tem permissão para excluir este comentário.',
      );
      return;
    }

    Alert.alert(
      'Excluir comentário',
      'Tem certeza que deseja excluir este comentário?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          onPress: () => deleteComment(comment),
          style: 'destructive',
        },
      ],
    );
  };

  return {
    comments,
    newComment,
    setNewComment,
    addComment,
    deleteComment,
    confirmDeleteComment,
    canDeleteComment,
    isAddingComment,
    isDeletingCommentIds,
  };
}
