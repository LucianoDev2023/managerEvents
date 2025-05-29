import { z } from 'zod';

export const eventFormSchema = z
  .object({
    title: z.string().min(3, 'O título deve ter pelo menos 5 caracteres.'),
    location: z.string().min(3, 'Localização obrigatória.'),
    startDate: z.date(),
    endDate: z.date(),
    description: z.string().min(1, 'Descrição obrigatória'),

    accessCode: z
      .string()
      .min(3, 'Código de acesso deve ter pelo menos 3 caracteres.'),
    coverImage: z.string().url('Imagem do evento é obrigatória.'),
    userId: z.string(),
    createdBy: z.string(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data de fim não pode ser anterior à de início.',
    path: ['endDate'],
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
