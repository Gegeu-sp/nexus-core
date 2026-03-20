import { PrismaClient } from '@prisma/client';
import { GlobalTriageBanner } from '@/components/clinical/GlobalTriageBanner';
import { SyndromeAlertCard } from '@/components/clinical/SyndromeAlertCard';
import { MultiparametricChart } from '@/components/clinical/MultiparametricChart';
import { fetchClinicalTimeSeries } from '@/lib/data-aggregation/fetchClinicalTimeSeries';
import { Activity, ShieldCheck } from 'lucide-react';
import { auth } from '@/auth';

const db = new PrismaClient();

// Disable caching for this deep-tech dashboard to ensure real-time clinical surveillance
export const revalidate = 0;

export default async function ClinicalDashboard() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen bg-black text-rose-500 flex items-center justify-center font-mono">
        <h1>403 Forbidden - RBAC Clinician Authorization Required</h1>
      </div>
    );
  }

  // Tenant Security Isolation: Fetch Clinician to scope Alerts
  const clinician = await db.user.findUnique({ where: { id: session.user.id }});

  const activeAlerts = await db.predictiveSyndromeAlert.findMany({
    where: { 
      isActive: true,
      user: clinician?.clinicId ? { clinicId: clinician.clinicId } : undefined
    },
    orderBy: { probability: 'desc' },
    include: { user: true }
  });

  let highestSeverity: 'low' | 'moderate' | 'high' | 'critical' | null = null;
  if (activeAlerts.length > 0) {
    if (activeAlerts.some((a: any) => a.severity === 'critical')) highestSeverity = 'critical';
    else if (activeAlerts.some((a: any) => a.severity === 'high')) highestSeverity = 'high';
    else if (activeAlerts.some((a: any) => a.severity === 'moderate')) highestSeverity = 'moderate';
    else highestSeverity = 'low';
  }

  // Phase 4: Server-Side Aggregation
  const timeSeriesData = await fetchClinicalTimeSeries();

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      <GlobalTriageBanner alertsCount={activeAlerts.length} highestSeverity={highestSeverity} />
      
      <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full">
        <div className="mb-8 border-b border-gray-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Triagem e Vigilância Sindrômica</h1>
          <p className="text-sm text-gray-400">
            Monitoramento Preditivo Sistêmico alimentado por Explainable AI (XAI) do Nexus Core Engine.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Contexto (60%) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Contexto Orgânico / Gráfico de Tendência Multiparamétrica</h2>
            <div className="flex-1 rounded-xl bg-gray-900/40 shadow-xl flex items-center justify-center p-6 border border-gray-800 min-h-[500px]">
              <MultiparametricChart data={timeSeriesData} />
            </div>
          </div>

          {/* Coluna Direita: Insights / Feed da IA (40%) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center mb-0">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                Insights Preditivos (XAI)
              </h2>
              {activeAlerts.length > 0 && (
                <span className="text-[10px] font-bold bg-gray-800 px-2.5 py-1 rounded text-gray-300 border border-gray-700">
                  {activeAlerts.length} ANOMALIA(S)
                </span>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {activeAlerts.length === 0 ? (
                <div className="text-center p-8 border border-gray-800 rounded-xl bg-gray-900/30">
                  <ShieldCheck className="w-12 h-12 text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Nenhum risco patológico sistêmico detectado na última varredura.</p>
                </div>
              ) : (
                activeAlerts.map((alert: any) => (
                  <SyndromeAlertCard key={alert.id} alert={alert} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
