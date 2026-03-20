import { PrismaClient } from '@prisma/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const db = new PrismaClient();

export interface ClinicalTimeSeriesData {
  date: string;         // 'YYYY-MM-DD'
  acwr: number;
  tonnage: number;
  wellness: number;
  cpk: number;
  pharmacologyActive: boolean;
  inolScore: number;
}

/**
 * Aggregates multi-domain clinical data into a time-series array for Recharts.
 * Eliminates mock data by querying actual Prisma records from the last 30 days.
 */
export async function fetchClinicalTimeSeries(userId?: string): Promise<ClinicalTimeSeriesData[]> {
  // Determine user to fetch: if no userId is provided, grab the first user in DB (MVP assumption)
  let targetUserId = userId;
  if (!targetUserId) {
    const firstUser = await db.user.findFirst();
    if (!firstUser) return []; // No data available
    targetUserId = firstUser.id;
  }

  const endDate = new Date();
  const startDate = subDays(endDate, 30); // Last 30 days

  // Parallel fetch to optimize Server-Side rendering
  const [sessions, readiness, biomarkers, pharma] = await Promise.all([
    db.trainingSession.findMany({
      where: { userId: targetUserId, sessionDate: { gte: startDate, lte: endDate } },
      select: { sessionDate: true, totalTonnage: true, acwrRatio: true, inolScore: true }
    }),
    db.dailyReadiness.findMany({
      where: { userId: targetUserId, logDate: { gte: startDate, lte: endDate } },
      select: { logDate: true, wellnessScore: true }
    }),
    db.biomarkerObservation.findMany({
      where: { userId: targetUserId, logDate: { gte: startDate, lte: endDate }, biomarkerName: 'CPK' },
      select: { logDate: true, value: true }
    }),
    db.pharmacologyLog.findMany({
      where: { userId: targetUserId, administrationDate: { gte: startDate, lte: endDate } },
      select: { administrationDate: true, substanceName: true }
    })
  ]);

  // Generate an array of the last 30 days
  const timeSeriesMap = new Map<string, ClinicalTimeSeriesData>();
  
  for (let i = 30; i >= 0; i--) {
    const d = subDays(endDate, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    timeSeriesMap.set(dateStr, {
      date: dateStr,
      acwr: 0,
      tonnage: 0,
      wellness: 0,
      cpk: 0,
      pharmacologyActive: false,
      inolScore: 0
    });
  }

  // Aggregate Training Sessions
  sessions.forEach(s => {
    const d = format(s.sessionDate, 'yyyy-MM-dd');
    if (timeSeriesMap.has(d)) {
      const entry = timeSeriesMap.get(d)!;
      entry.tonnage += s.totalTonnage || 0;
      entry.acwr = Math.max(entry.acwr, s.acwrRatio || 0); // take max ACWR of the day
      entry.inolScore += s.inolScore || 0;
    }
  });

  // Aggregate Readiness / Wellness
  readiness.forEach(r => {
    const d = format(r.logDate, 'yyyy-MM-dd');
    if (timeSeriesMap.has(d)) {
      const entry = timeSeriesMap.get(d)!;
      entry.wellness = r.wellnessScore || entry.wellness;
    }
  });

  // Aggregate Biomarkers (CPK)
  biomarkers.forEach(b => {
    const d = format(b.logDate, 'yyyy-MM-dd');
    if (timeSeriesMap.has(d)) {
      const entry = timeSeriesMap.get(d)!;
      entry.cpk = Math.max(entry.cpk, b.value); // Take highest CPK reading of the day
    }
  });

  // Aggregate Pharmacology
  pharma.forEach(p => {
    const d = format(p.administrationDate, 'yyyy-MM-dd');
    if (timeSeriesMap.has(d)) {
      const entry = timeSeriesMap.get(d)!;
      entry.pharmacologyActive = true;
    }
  });

  // Convert map back to array sorted by date
  return Array.from(timeSeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}
