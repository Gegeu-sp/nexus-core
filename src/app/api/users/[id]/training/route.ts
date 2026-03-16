import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateTonnage, calculateINOL, calculateACWR } from '@/lib/math-engine';

// GET - Listar sessões de treino
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const sessions = await db.trainingSession.findMany({
      where: { userId: id },
      orderBy: { sessionDate: 'desc' },
      take: limit
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching training sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training sessions' },
      { status: 500 }
    );
  }
}

// POST - Criar nova sessão de treino com cálculos automáticos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      sessionDate,
      sessionType,
      modality,
      exercises, // Array de exercícios para cálculo
      perceivedEffort,
      perceivedRecovery,
      sessionNotes,
      completed
    } = body;

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Exercises array is required' },
        { status: 400 }
      );
    }

    // Calcular métricas do motor matemático
    const totalTonnage = calculateTonnage(exercises);
    const inolResult = calculateINOL(exercises);

    // Buscar sessões anteriores para calcular ACWR
    const previousSessions = await db.trainingSession.findMany({
      where: {
        userId: id,
        sessionDate: {
          lte: new Date(sessionDate || Date.now())
        }
      },
      orderBy: { sessionDate: 'desc' },
      take: 28 // ~4 semanas
    });

    // Agrupar tonagem por semana
    const weeklyTonnage: Record<number, number> = {};
    previousSessions.forEach(session => {
      const weekNumber = getWeekNumber(new Date(session.sessionDate));
      weeklyTonnage[weekNumber] = (weeklyTonnage[weekNumber] || 0) + (session.totalTonnage || 0);
    });

    const currentWeek = getWeekNumber(new Date(sessionDate || Date.now()));
    const currentWeekTonnage = weeklyTonnage[currentWeek] || 0;

    // Obter tonagem das semanas anteriores
    const previousWeeksKeys = Object.keys(weeklyTonnage)
      .map(Number)
      .filter(week => week < currentWeek)
      .sort((a, b) => b - a)
      .slice(0, 4);

    const previousWeeksTonnage = previousWeeksKeys.map(week => weeklyTonnage[week]);

    // Calcular ACWR
    const acwrResult = calculateACWR(currentWeekTonnage + totalTonnage, previousWeeksTonnage);

    const session = await db.trainingSession.create({
      data: {
        userId: id,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        sessionType,
        modality,
        totalTonnage,
        inolScore: inolResult.total,
        acwrRatio: acwrResult.ratio,
        exercisesData: JSON.stringify({
          exercises,
          inolBreakdown: inolResult.byExercise
        }),
        perceivedEffort: perceivedEffort ? parseInt(perceivedEffort) : null,
        perceivedRecovery: perceivedRecovery ? parseInt(perceivedRecovery) : null,
        sessionNotes,
        completed: completed ?? true
      }
    });

    return NextResponse.json({
      session,
      metrics: {
        totalTonnage,
        inol: inolResult,
        acwr: acwrResult
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating training session:', error);
    return NextResponse.json(
      { error: 'Failed to create training session' },
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
