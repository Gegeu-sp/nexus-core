import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateACWR, parseMetricsToNaturalLanguage } from '@/lib/math-engine';

// GET - Obter métricas consolidadas do dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Buscar dados recentes do usuário
    const [
      user,
      recentSessions,
      latestBiomarker,
      latestReadiness,
      recentPharmacology
    ] = await Promise.all([
      db.user.findUnique({
        where: { id },
        include: { conditions: { where: { isActive: true } } }
      }),
      db.trainingSession.findMany({
        where: { userId: id },
        orderBy: { sessionDate: 'desc' },
        take: 28 // ~4 semanas
      }),
      db.biomarkerLog.findFirst({
        where: { userId: id },
        orderBy: { testDate: 'desc' }
      }),
      db.dailyReadiness.findFirst({
        where: { userId: id },
        orderBy: { logDate: 'desc' }
      }),
      db.pharmacologyLog.findMany({
        where: { userId: id },
        orderBy: { administrationDate: 'desc' },
        take: 5
      })
    ]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calcular métricas de treino
    const totalSessions = recentSessions.length;
    const totalTonnage = recentSessions.reduce((sum, s) => sum + (s.totalTonnage || 0), 0);
    const avgINOL = totalSessions > 0
      ? recentSessions.reduce((sum, s) => sum + (s.inolScore || 0), 0) / totalSessions
      : 0;

    // Calcular ACWR
    const weeklyTonnage: Record<number, number> = {};
    recentSessions.forEach(session => {
      const weekNumber = getWeekNumber(new Date(session.sessionDate));
      weeklyTonnage[weekNumber] = (weeklyTonnage[weekNumber] || 0) + (session.totalTonnage || 0);
    });

    const currentWeek = getWeekNumber(new Date());
    const currentWeekTonnage = weeklyTonnage[currentWeek] || 0;

    const previousWeeksKeys = Object.keys(weeklyTonnage)
      .map(Number)
      .filter(week => week < currentWeek)
      .sort((a, b) => b - a)
      .slice(0, 4);

    const previousWeeksTonnage = previousWeeksKeys.map(week => weeklyTonnage[week]);
    const acwrResult = calculateACWR(currentWeekTonnage, previousWeeksTonnage);

    // Parse biomarcadores
    let biomarkersParsed: Record<string, number> | null = null;
    if (latestBiomarker) {
      try {
        biomarkersParsed = JSON.parse(latestBiomarker.biomarkers);
      } catch (e) {
        console.error('Error parsing biomarkers:', e);
      }
    }

    // Calcular tonagem da semana anterior para comparação
    const lastWeekTonnage = weeklyTonnage[currentWeek - 1] || 0;
    const tonnageChangePercent = lastWeekTonnage > 0
      ? ((currentWeekTonnage - lastWeekTonnage) / lastWeekTonnage) * 100
      : 0;

    // Gerar resumo em linguagem natural (Output WhatsApp)
    const naturalLanguageSummary = parseMetricsToNaturalLanguage({
      totalTonnage: currentWeekTonnage,
      tonnageChangePercent,
      acwrRatio: acwrResult.ratio,
      acwrRiskLevel: acwrResult.riskLevel,
      phaseAngle: biomarkersParsed?.Phase_Angle,
      cpkLevel: biomarkersParsed?.CPK_UL,
      wellnessScore: latestReadiness?.wellnessScore ?? undefined
    });

    // Determinar status geral do usuário
    const riskFactors: string[] = [];
    if (acwrResult.riskLevel === 'very_high' || acwrResult.riskLevel === 'high') {
      riskFactors.push(`ACWR ${acwrResult.riskLevel === 'very_high' ? 'crítico' : 'elevado'}`);
    }
    if (latestReadiness && latestReadiness.wellnessScore && latestReadiness.wellnessScore < 5) {
      riskFactors.push('Wellness baixo');
    }
    if (biomarkersParsed?.CPK_UL && biomarkersParsed.CPK_UL > 500) {
      riskFactors.push('CPK elevado');
    }
    if (biomarkersParsed?.Phase_Angle && biomarkersParsed.Phase_Angle < 4.5) {
      riskFactors.push('Ângulo de fase baixo');
    }

    let overallStatus: 'optimal' | 'attention' | 'concern';
    if (riskFactors.length >= 2 || riskFactors.includes('ACWR crítico')) {
      overallStatus = 'concern';
    } else if (riskFactors.length === 1) {
      overallStatus = 'attention';
    } else {
      overallStatus = 'optimal';
    }

    return NextResponse.json({
      user,
      metrics: {
        training: {
          totalSessions,
          totalTonnage: Number(totalTonnage.toFixed(2)),
          currentWeekTonnage: Number(currentWeekTonnage.toFixed(2)),
          avgINOL: Number(avgINOL.toFixed(3)),
          acwr: acwrResult
        },
        biomarkers: latestBiomarker ? {
          ...latestBiomarker,
          biomarkersParsed
        } : null,
        readiness: latestReadiness,
        pharmacology: recentPharmacology
      },
      overallStatus,
      riskFactors,
      naturalLanguageSummary
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

// Função auxiliar para obter número da semana
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
