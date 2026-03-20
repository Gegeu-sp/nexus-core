import { PrismaClient } from '@prisma/client';
import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { fetchClinicalTimeSeries } from '@/lib/data-aggregation/fetchClinicalTimeSeries';
import { MultiparametricChart } from '@/components/clinical/MultiparametricChart';
import { SyndromeAlertCard } from '@/components/clinical/SyndromeAlertCard';
import { ArrowLeft, CheckCircle2, User, Activity } from 'lucide-react';
import Link from 'next/link';

const db = new PrismaClient();
export const revalidate = 0;

export default async function PatientRecordPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/api/auth/signin');
  
  const clinician = await db.user.findUnique({ where: { id: session.user.id } });
  if (!clinician?.clinicId) return <div className="p-8 text-rose-500 font-bold">Sem credencial corporativa B2B. Acesso Negado.</div>;

  const patientId = params.id;

  // 1. RBAC Isolation and Alert Fetching (Optimized with Promise.all)
  const [patient, activeAlerts] = await Promise.all([
    db.user.findUnique({
      where: { id: patientId, role: 'ATHLETE' },
      select: { id: true, name: true, weightKg: true, dateOfBirth: true, clinicId: true, email: true }
    }),
    db.predictiveSyndromeAlert.findMany({
      where: { userId: patientId, isActive: true },
      orderBy: { probability: 'desc' },
      include: { user: true }
    })
  ]);

  if (!patient || patient.clinicId !== clinician.clinicId) {
    notFound(); // Deep-Security 404/403: Hide patient payload if ClinicID doesn't logically match
  }

  // Idade do Atleta (Heurística baseada no DB)
  const age = patient.dateOfBirth 
    ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / 3.15576e+10) 
    : 'N/I';

  // 2. Tying Back the Physiology Context Engine (Phase 4 integration)
  const timeSeriesData = await fetchClinicalTimeSeries(patient.id);

  return (
    <div className="flex flex-col min-h-[100dvh] bg-black text-zinc-100 p-6 md:p-8 font-sans max-w-[1400px] mx-auto w-full">
      {/* HEADER DO PACIENTE */}
      <header className="mb-8 border-b border-zinc-900 pb-6 flex justify-between items-start animate-in slide-in-from-top-4 duration-500">
        <div className="flex gap-6 items-center">
          <Link href="/dashboard/clinical/patients" className="w-11 h-11 rounded-lg bg-zinc-900 hover:bg-zinc-800 flex items-center justify-center border border-zinc-800 transition-colors shadow-black shadow-lg">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-inner">
               <User className="w-8 h-8 text-zinc-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight leading-tight">{patient.name}</h1>
              <div className="flex gap-4 text-sm text-zinc-400 font-mono mt-1.5 items-center">
                 <span className="bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">ID: {patient.id.substring(0,8).toUpperCase()}</span>
                 <span className="text-zinc-700 font-bold">•</span>
                 <span>P. BASE: {patient.weightKg ? `${patient.weightKg} kg` : 'N/D'}</span>
                 <span className="text-zinc-700 font-bold">•</span>
                 <span>IDADE: {age}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">
        {/* COLUNA ESQUERDA: GRÁFICO (70%) */}
        <div className="xl:col-span-8 flex flex-col gap-6 animate-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Traçado Fisiológico Multiparamétrico (EHR)</h2>
          </div>
          
          <div className="rounded-2xl bg-[#0c0c0e] border border-zinc-800 shadow-2xl p-6 h-[500px]">
             {/* O Gráfico é magicamente reutilizado injetando OS DADOS DESTE PACIENTE */}
             <MultiparametricChart data={timeSeriesData} />
          </div>
        </div>

        {/* COLUNA DIREITA: ALERTAS (30%) */}
        <div className="xl:col-span-4 flex flex-col gap-6 animate-in slide-in-from-right-8 duration-700 delay-200 fill-mode-both">
          <div className="flex items-center gap-2 mb-2 px-1">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Triagem Preditiva Focada</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            {activeAlerts.length > 0 ? (
              activeAlerts.map(alert => (
                <div key={alert.id} className="shadow-2xl shadow-rose-900/10">
                  <SyndromeAlertCard alert={alert as any} />
                </div>
              ))
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                 <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                 </div>
                 <h3 className="text-emerald-400 font-bold mb-2 tracking-tight text-lg">Fisiologia Estável</h3>
                 <p className="text-emerald-500/80 text-sm leading-relaxed">
                   O fluxo sistêmico deste atleta encontra-se verde. Nenhum risco de exaustão endócrina ou lise muscular mapeado pelos cálculos de Volume e Carga Neural (INOL).
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
