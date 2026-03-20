'use server'

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';

const db = new PrismaClient();

export async function getPatients() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized: Invalid Session.");

  const clinician = await db.user.findUnique({
    where: { id: session.user.id }
  });

  if (!clinician?.clinicId) return [];

  const patients = await db.user.findMany({
    where: {
      role: 'ATHLETE',
      clinicId: clinician.clinicId
    },
    include: {
      dailyReadiness: {
        orderBy: { logDate: 'desc' },
        take: 1
      }
    },
    orderBy: { name: 'asc' }
  });

  return patients;
}

export async function addPatient(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized: Clinic Auth Expected.");

  const clinician = await db.user.findUnique({
    where: { id: session.user.id }
  });

  if (!clinician?.clinicId) {
    throw new Error("Clínico não possui uma clínica vinculada para registrar usuários.");
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const weightKg = Number(formData.get('weightKg'));

  await db.user.create({
    data: {
      name,
      email,
      weightKg,
      role: 'ATHLETE',
      clinicId: clinician.clinicId,
      // Generic temp logic for password management bypassed in early clinical testing setup:
      password: null 
    }
  });

  revalidatePath('/dashboard/clinical/patients');
}
