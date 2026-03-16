import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateWellnessScore } from '@/lib/math-engine';

// GET - Listar logs de prontidão diária
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 7;

    const logs = await db.dailyReadiness.findMany({
      where: { userId: id },
      orderBy: { logDate: 'desc' },
      take: limit
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching readiness logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch readiness logs' },
      { status: 500 }
    );
  }
}

// POST - Criar novo log de prontidão diária com cálculo automático
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      logDate,
      sleepHours,
      sleepQuality,
      muscleSoreness,
      jointPain,
      energyLevel,
      mentalState,
      stressLevel,
      notes
    } = body;

    // Calcular Wellness Score
    const wellnessResult = calculateWellnessScore({
      sleepQuality: sleepQuality ? parseInt(sleepQuality) : undefined,
      muscleSoreness: muscleSoreness ? parseInt(muscleSoreness) : undefined,
      jointPain: jointPain ? parseInt(jointPain) : undefined,
      energyLevel: energyLevel ? parseInt(energyLevel) : undefined,
      mentalState: mentalState ? parseInt(mentalState) : undefined,
      stressLevel: stressLevel ? parseInt(stressLevel) : undefined
    });

    const log = await db.dailyReadiness.create({
      data: {
        userId: id,
        logDate: logDate ? new Date(logDate) : new Date(),
        sleepHours: sleepHours ? parseFloat(sleepHours) : null,
        sleepQuality: sleepQuality ? parseInt(sleepQuality) : null,
        muscleSoreness: muscleSoreness ? parseInt(muscleSoreness) : null,
        jointPain: jointPain ? parseInt(jointPain) : null,
        energyLevel: energyLevel ? parseInt(energyLevel) : null,
        mentalState: mentalState ? parseInt(mentalState) : null,
        stressLevel: stressLevel ? parseInt(stressLevel) : null,
        wellnessScore: wellnessResult.score,
        notes
      }
    });

    return NextResponse.json({
      log,
      wellness: wellnessResult
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating readiness log:', error);
    return NextResponse.json(
      { error: 'Failed to create readiness log' },
      { status: 500 }
    );
  }
}
