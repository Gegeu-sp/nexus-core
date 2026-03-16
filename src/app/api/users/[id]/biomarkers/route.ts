import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { analyzeBiomarkers } from '@/lib/math-engine';

// GET - Listar logs de biomarcadores
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    const logs = await db.biomarkerLog.findMany({
      where: { userId: id },
      orderBy: { testDate: 'desc' },
      take: limit
    });

    // Parse JSON biomarkers
    const enrichedLogs = logs.map(log => ({
      ...log,
      biomarkersParsed: JSON.parse(log.biomarkers)
    }));

    return NextResponse.json(enrichedLogs);
  } catch (error) {
    console.error('Error fetching biomarker logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch biomarker logs' },
      { status: 500 }
    );
  }
}

// POST - Criar novo log de biomarcadores com análise automática
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      testDate,
      testType,
      biomarkers, // Objeto com biomarcadores: { CPK_UL: 350, Phase_Angle: 5.8, ... }
      fastingStatus,
      postWorkout,
      hydrationLevel
    } = body;

    if (!biomarkers || typeof biomarkers !== 'object') {
      return NextResponse.json(
        { error: 'Biomarkers object is required' },
        { status: 400 }
      );
    }

    // Calcular score de confiabilidade baseado nas condições do teste
    let reliabilityScore = 1.0;

    // Viés de hidratação na bioimpedância
    if (testType === 'bioimpedance' || testType === 'combined') {
      if (!fastingStatus || postWorkout) {
        reliabilityScore -= 0.3;
      }
      if (hydrationLevel === 'dehydrated') {
        reliabilityScore -= 0.2;
      }
    }

    reliabilityScore = Math.max(0, Math.min(1, reliabilityScore));

    // Analisar biomarcadores
    const analysis = analyzeBiomarkers(biomarkers);

    // Gerar interpretação e recomendações
    const interpretation = `Status: ${analysis.overallStatus === 'optimal' ? 'Ótimo' : analysis.overallStatus === 'attention' ? 'Atenção' : 'Preocupante'}`;
    const recommendations = analysis.recommendations.join('. ');

    const log = await db.biomarkerLog.create({
      data: {
        userId: id,
        testDate: testDate ? new Date(testDate) : new Date(),
        testType,
        biomarkers: JSON.stringify(biomarkers),
        fastingStatus: fastingStatus ?? false,
        postWorkout: postWorkout ?? false,
        hydrationLevel,
        reliabilityScore,
        interpretation,
        recommendations
      }
    });

    return NextResponse.json({
      log: {
        ...log,
        biomarkersParsed: biomarkers
      },
      analysis
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating biomarker log:', error);
    return NextResponse.json(
      { error: 'Failed to create biomarker log' },
      { status: 500 }
    );
  }
}
