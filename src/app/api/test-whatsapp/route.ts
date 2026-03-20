import { NextResponse } from 'next/server';
import { whatsAppDispatcher } from '@/lib/notifications/evolutionWhatsAppProvider';
import { PredictiveSyndromeAlert } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone') || process.env.CLINICAL_TEAM_PHONE || '5511999999999';

  // Gerar um alerta mockado estritamente para propósitos de teste da interconexão da Fase 5
  // (A aplicação principal jamais usa mock data conforme requisitado)
  const fakeAlert: PredictiveSyndromeAlert = {
    id: 'test-webhook-123',
    userId: 'user-id-test-01',
    syndromeName: 'Resistência Insulínica / Fadiga Aguda (TESTE)',
    snomedCode: '123456',
    probability: 92.5,
    severity: 'critical',
    contributingFactors: JSON.stringify([
      'ACWR > 1.8 nas últimas 72h',
      'Readiness Score Sub-ótimo (Sleep < 5.5h)',
      'Possível interação farmacológica ativa'
    ]),
    isActive: true,
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const success = await whatsAppDispatcher.dispatch(fakeAlert, phone);

  if (success) {
    return NextResponse.json({ 
      status: 'success',
      message: `Alerta clínico de teste disparado com sucesso para ${phone}`,
      evolutionEndpointConnected: true
    });
  } else {
    return NextResponse.json({ 
      status: 'error',
      message: 'Falha ao enviar alerta de teste para a Evolution API. Valide EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE_NAME.',
      evolutionEndpointConnected: false
    }, { status: 500 });
  }
}
