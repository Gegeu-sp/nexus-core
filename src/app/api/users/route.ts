import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar todos os usuários
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        conditions: {
          where: { isActive: true }
        },
        _count: {
          select: {
            trainingSessions: true,
            biomarkerLogs: true,
            pharmacologyLogs: true
          }
        }
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Criar novo usuário
export async function POST(request: NextRequest) {
  try {
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

    // Validar campos obrigatórios
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        bodyFatPercent: bodyFatPercent ? parseFloat(bodyFatPercent) : null,
        muscleMassKg: muscleMassKg ? parseFloat(muscleMassKg) : null,
        restingHR: restingHR ? parseInt(restingHR) : null,
        maxHR: maxHR ? parseInt(maxHR) : null,
        trainingLevel,
        goals: goals ? JSON.stringify(goals) : null,
        notes
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
