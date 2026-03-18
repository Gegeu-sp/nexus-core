import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  calculateTonnage,
  calculateINOL,
  calculateACWR,
  computeSessionTotals,
  validateSession,
  calculateINOLByPattern,
  parseWorkoutText,
  safeCalc,
  type WorkoutSessionInput,
} from '@/lib/math-engine';

// GET - Listar sessões de treino (INALTERADO)
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

// POST - Criar nova sessão de treino com cálculos completos do Motor Matemático
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
      exercises:   rawExercises,  // Array estruturado (prioridade)
      workoutText,                 // Texto livre alternativo (novo)
      perceivedEffort,
      perceivedRecovery,
      sessionNotes,
      completed
    } = body;

    // Resolver exercícios: estruturado ou texto livre
    let exercises = rawExercises;
    if ((!exercises || !Array.isArray(exercises) || exercises.length === 0) && workoutText) {
      exercises = parseWorkoutText(workoutText);
    }

    if (!exercises || !Array.isArray(exercises) || exercises.length === 0) {
      return NextResponse.json(
        { error: 'Informe "exercises" (array) ou "workoutText" (texto livre) com ao menos 1 exercício' },
        { status: 400 }
      );
    }

    // ─── Validação Formal (Regra de Negócio) ──────────────────────────────────
    const sessionInput: WorkoutSessionInput = {
      userId: id,
      sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      sessionType: sessionType ?? 'strength',
      exercises,
      notes: sessionNotes,
    };

    const validation = validateSession(sessionInput);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Dados de treino inválidos',
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
        },
        { status: 400 }
      );
    }

    // ─── Motor Matemático — Regra de Ouro ─────────────────────────────────────
    // Todos os totais são recalculados aqui, independente do front-end
    const sessionTotals  = computeSessionTotals(exercises);
    const totalTonnage   = sessionTotals.volumeTotal;  // mesmo que calculateTonnage mas via safeCalc
    const inolResult     = calculateINOL(exercises);
    const inolByPattern  = calculateINOLByPattern(exercises);

    // ─── Índice de Progressão de Carga (IPC) ──────────────────────────────────
    // Buscar última sessão do mesmo tipo para calcular variação percentual
    let ipcPercent: number | null = null;
    if (sessionType) {
      const lastSameType = await db.trainingSession.findFirst({
        where: { userId: id, sessionType },
        orderBy: { sessionDate: 'desc' },
        select: { totalTonnage: true }
      });
      if (lastSameType?.totalTonnage && lastSameType.totalTonnage > 0) {
        ipcPercent = safeCalc(
          ((totalTonnage - lastSameType.totalTonnage) / lastSameType.totalTonnage) * 100,
          2
        );
      }
    }

    // ─── ACWR ─────────────────────────────────────────────────────────────────
    const previousSessions = await db.trainingSession.findMany({
      where: {
        userId: id,
        sessionDate: { lte: new Date(sessionDate || Date.now()) }
      },
      orderBy: { sessionDate: 'desc' },
      take: 28 // ~4 semanas
    });

    const weeklyTonnage: Record<number, number> = {};
    previousSessions.forEach(session => {
      const weekNumber = getWeekNumber(new Date(session.sessionDate));
      weeklyTonnage[weekNumber] = (weeklyTonnage[weekNumber] || 0) + (session.totalTonnage || 0);
    });

    const currentWeek = getWeekNumber(new Date(sessionDate || Date.now()));
    const currentWeekTonnage = weeklyTonnage[currentWeek] || 0;

    const previousWeeksKeys = Object.keys(weeklyTonnage)
      .map(Number)
      .filter(week => week < currentWeek)
      .sort((a, b) => b - a)
      .slice(0, 4);

    const previousWeeksTonnage = previousWeeksKeys.map(week => weeklyTonnage[week]);
    const acwrResult = calculateACWR(currentWeekTonnage + totalTonnage, previousWeeksTonnage);

    // ─── Persistência ─────────────────────────────────────────────────────────
    const session = await db.trainingSession.create({
      data: {
        userId: id,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        sessionType,
        modality,
        // Métricas calculadas (Regra de Ouro — recalculadas no backend)
        totalTonnage,
        totalSeries:  sessionTotals.totalSeries,
        totalReps:    sessionTotals.totalReps,
        avgLoadPerSet: sessionTotals.avgLoadPerSet,
        ipcPercent,
        inolScore: inolResult.total,
        acwrRatio: acwrResult.ratio,
        // Snapshot detalhado dos exercícios
        exercisesData: JSON.stringify({
          exercises,
          sessionTotals,
          inolBreakdown: inolResult.byExercise,
          inolByPattern: inolByPattern.byPattern,
        }),
        perceivedEffort:  perceivedEffort  ? parseInt(perceivedEffort)  : null,
        perceivedRecovery: perceivedRecovery ? parseInt(perceivedRecovery) : null,
        sessionNotes,
        completed: completed ?? true
      }
    });

    return NextResponse.json({
      session,
      metrics: {
        sessionTotals,
        inol: inolResult,
        inolByPattern,
        acwr: acwrResult,
        ipcPercent,
      },
      // Warnings não bloqueiam — apenas informam
      validationWarnings: validation.warnings,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating training session:', error);
    return NextResponse.json(
      { error: 'Failed to create training session' },
      { status: 500 }
    );
  }
}

// Função auxiliar para obter número da semana (mantida idêntica)
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
