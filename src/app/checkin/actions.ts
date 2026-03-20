'use server'

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

const db = new PrismaClient();

export async function submitMorningCheckin(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Não autorizado. Sessão Web Inválida ou Expirada.');
  }
  const userId = session.user.id;

  // -- Readiness Data Extraction --
  const sleepHours = Number(formData.get('sleepHours'));
  const sleepQuality = Number(formData.get('sleepQuality'));
  const energyLevel = Number(formData.get('energyLevel'));
  
  // Pain mapping (Zero: 1, Leve: 3, Moderada: 6, Severa: 9)
  const muscleSorenessRaw = formData.get('muscleSoreness') as string;
  const sorenessMap: Record<string, number> = {
    'Zero': 1,
    'Leve': 3,
    'Moderada': 6,
    'Severa': 9
  };
  const muscleSoreness = sorenessMap[muscleSorenessRaw] || 1;

  // HRV integration
  const hrvRaw = formData.get('hrv');
  const hrv = hrvRaw ? Number(hrvRaw) : null; // Reserved for specific model or notes

  const wellnessScore = (sleepQuality + energyLevel + (10 - muscleSoreness)) / 3;

  // -- Pharmacology Data Extraction --
  const dictionaryId = formData.get('dictionaryId') as string;
  const dosageMg = formData.get('dosageMg') ? Number(formData.get('dosageMg')) : null;
  const repeatYesterday = formData.get('repeatYesterday') === 'true';

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await db.$transaction(async (tx) => {
      // 1. Upsert Daily Readiness (Garanta que só há 1 por dia)
      const existingReadiness = await tx.dailyReadiness.findFirst({
        where: { userId, logDate: { gte: today } }
      });

      if (existingReadiness) {
        await tx.dailyReadiness.update({
          where: { id: existingReadiness.id },
          data: { sleepHours, sleepQuality, energyLevel, muscleSoreness, wellnessScore, notes: hrv ? `HRV: ${hrv}` : null }
        });
      } else {
        await tx.dailyReadiness.create({
          data: {
            userId,
            logDate: new Date(),
            sleepHours,
            sleepQuality,
            energyLevel,
            muscleSoreness,
            wellnessScore,
            notes: hrv ? `HRV: ${hrv}` : null
          }
        });
      }

      // 2. Insert Pharmacology if applicable
      if (repeatYesterday) {
        // Clone doses from yesterday
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const yesterdayLogs = await tx.pharmacologyLog.findMany({
          where: {
             userId,
             administrationDate: { gte: yesterday, lt: today }
          }
        });

        for (const log of yesterdayLogs) {
          await tx.pharmacologyLog.create({
            data: {
              userId,
              dictionaryId: log.dictionaryId,
              substanceName: log.substanceName,
              substanceType: log.substanceType,
              dosageMg: log.dosageMg,
              halfLifeHours: log.halfLifeHours,
              administrationDate: new Date()
            }
          });
        }
      } else if (dictionaryId && dosageMg) {
        // Fetch clinical dictionary info
        const drug = await tx.clinicalDrugDictionary.findUnique({ where: { id: dictionaryId } });
        if (drug) {
          await tx.pharmacologyLog.create({
            data: {
              userId,
              dictionaryId: drug.id,
              substanceName: drug.name,
              dosageMg,
              halfLifeHours: 12, // Default or heuristic if not set
              administrationDate: new Date()
            }
          });
        }
      }
    });

  } catch (error) {
    console.error('Falha na transação do Check-in Matinal:', error);
    throw new Error('Falha ao processar Sincronização Matinal.');
  }

  // Trigger cache invalidation so Next.js UI updates everywhere
  revalidatePath('/dashboard/clinical');
  revalidatePath('/checkin');

  // Sucesso
  redirect('/checkin?success=true');
}
