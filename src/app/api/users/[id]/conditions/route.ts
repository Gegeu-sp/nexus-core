import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar condições de um usuário
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conditions = await db.userCondition.findMany({
      where: { userId: id },
      orderBy: { diagnosisDate: 'desc' }
    });

    return NextResponse.json(conditions);
  } catch (error) {
    console.error('Error fetching conditions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conditions' },
      { status: 500 }
    );
  }
}

// POST - Criar nova condição
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      conditionName,
      conditionType,
      severity,
      diagnosisDate,
      resolvedDate,
      isActive,
      maxHeartRate,
      maxLoadPercent,
      restrictedExercises,
      requiredRestDays,
      minPhaseAngle,
      notes
    } = body;

    if (!conditionName) {
      return NextResponse.json(
        { error: 'Condition name is required' },
        { status: 400 }
      );
    }

    const condition = await db.userCondition.create({
      data: {
        userId: id,
        conditionName,
        conditionType,
        severity,
        diagnosisDate: diagnosisDate ? new Date(diagnosisDate) : null,
        resolvedDate: resolvedDate ? new Date(resolvedDate) : null,
        isActive: isActive ?? true,
        maxHeartRate: maxHeartRate ? parseInt(maxHeartRate) : null,
        maxLoadPercent: maxLoadPercent ? parseFloat(maxLoadPercent) : null,
        restrictedExercises: restrictedExercises ? JSON.stringify(restrictedExercises) : null,
        requiredRestDays: requiredRestDays ? parseInt(requiredRestDays) : null,
        minPhaseAngle: minPhaseAngle ? parseFloat(minPhaseAngle) : null,
        notes
      }
    });

    return NextResponse.json(condition, { status: 201 });
  } catch (error) {
    console.error('Error creating condition:', error);
    return NextResponse.json(
      { error: 'Failed to create condition' },
      { status: 500 }
    );
  }
}
