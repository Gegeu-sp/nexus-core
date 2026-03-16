import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculatePlasmaConcentration, canPerformMaxStrengthWork } from '@/lib/math-engine';

// GET - Listar logs farmacológicos e calcular concentração atual
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const logs = await db.pharmacologyLog.findMany({
      where: { userId: id },
      orderBy: { administrationDate: 'desc' }
    });

    // Calcular concentração atual para cada substância
    const enrichedLogs = logs.map(log => {
      const hoursElapsed = (Date.now() - new Date(log.administrationDate).getTime()) / (1000 * 60 * 60);

      const pharmacokinetics = calculatePlasmaConcentration({
        initialDoseMg: log.dosageMg,
        halfLifeHours: log.halfLifeHours,
        elapsedTimeHours: hoursElapsed
      });

      return {
        ...log,
        pharmacokinetics
      };
    });

    // Avaliar se pode realizar treino de força máxima
    const recentSubstances = enrichedLogs
      .filter(log => log.pharmacokinetics.remainingPercentage > 0)
      .map(log => ({
        substanceName: log.substanceName,
        peakImpactLevel: log.pharmacokinetics.peakImpactLevel,
        substanceType: log.substanceType ?? undefined
      }));

    const strengthWorkAssessment = canPerformMaxStrengthWork(recentSubstances);

    return NextResponse.json({
      logs: enrichedLogs,
      assessment: strengthWorkAssessment
    });
  } catch (error) {
    console.error('Error fetching pharmacology logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pharmacology logs' },
      { status: 500 }
    );
  }
}

// POST - Criar novo log farmacológico
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      substanceName,
      substanceType,
      dosageMg,
      administrationDate,
      halfLifeHours,
      notes
    } = body;

    if (!substanceName || !dosageMg || !halfLifeHours) {
      return NextResponse.json(
        { error: 'Substance name, dosage, and half-life are required' },
        { status: 400 }
      );
    }

    const log = await db.pharmacologyLog.create({
      data: {
        userId: id,
        substanceName,
        substanceType,
        dosageMg: parseFloat(dosageMg),
        administrationDate: administrationDate ? new Date(administrationDate) : new Date(),
        halfLifeHours: parseFloat(halfLifeHours),
        notes
      }
    });

    // Calcular concentração inicial
    const pharmacokinetics = calculatePlasmaConcentration({
      initialDoseMg: log.dosageMg,
      halfLifeHours: log.halfLifeHours,
      elapsedTimeHours: 0
    });

    return NextResponse.json({ ...log, pharmacokinetics }, { status: 201 });
  } catch (error) {
    console.error('Error creating pharmacology log:', error);
    return NextResponse.json(
      { error: 'Failed to create pharmacology log' },
      { status: 500 }
    );
  }
}
// Force recompile
