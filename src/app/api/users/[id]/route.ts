import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Obter usuário por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({
      where: { id },
      include: {
        conditions: {
          where: { isActive: true },
          orderBy: { diagnosisDate: 'desc' }
        },
        trainingSessions: {
          orderBy: { sessionDate: 'desc' },
          take: 10
        },
        biomarkerLogs: {
          orderBy: { testDate: 'desc' },
          take: 5
        },
        pharmacologyLogs: {
          orderBy: { administrationDate: 'desc' },
          take: 10
        },
        dailyReadiness: {
          orderBy: { logDate: 'desc' },
          take: 7
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar usuário
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      email,
      dateOfBirth,
      gender,
      heightCm,
      weightKg,
      bodyFatPercent,
      muscleMassKg,
      restingHR,
      maxHR,
      trainingLevel,
      goals,
      notes
    } = body;

    const user = await db.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
        ...(gender !== undefined && { gender }),
        ...(heightCm !== undefined && { heightCm: heightCm ? parseFloat(heightCm) : null }),
        ...(weightKg !== undefined && { weightKg: weightKg ? parseFloat(weightKg) : null }),
        ...(bodyFatPercent !== undefined && { bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : null }),
        ...(muscleMassKg !== undefined && { muscleMassKg: muscleMassKg ? parseFloat(muscleMassKg) : null }),
        ...(restingHR !== undefined && { restingHR: restingHR ? parseInt(restingHR) : null }),
        ...(maxHR !== undefined && { maxHR: maxHR ? parseInt(maxHR) : null }),
        ...(trainingLevel !== undefined && { trainingLevel }),
        ...(goals !== undefined && { goals: goals ? JSON.stringify(goals) : null }),
        ...(notes !== undefined && { notes })
      }
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar usuário
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
