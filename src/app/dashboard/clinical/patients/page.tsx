import { getPatients } from './actions';
import { AddPatientModal } from '@/components/clinical/AddPatientModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, ChevronRight } from 'lucide-react';
import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const db = new PrismaClient();

// Opt out of cache explicitly since clinical dashboards reflect real-time physical conditions
export const revalidate = 0;

export default async function PatientsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;
  
  let patients: any[] = [];
  try {
     patients = await getPatients();
  } catch (e) {
     // Clinical Onboarding Auto-Healing for MVP
     const clinician = await db.user.findUnique({ where: { id: session.user.id }});
     if (clinician && !clinician.clinicId) {
         const newClinic = await db.clinic.create({ data: { name: 'Nexus Clinical Tenant Default' }});
         await db.user.update({ where: { id: clinician.id }, data: { clinicId: newClinic.id }});
     }
     patients = await getPatients();
  }

  return (
    <div className="flex flex-col h-full bg-black min-h-[100dvh] text-zinc-100 p-8 max-w-[1400px] mx-auto w-full">
      <div className="flex justify-between items-center mb-10 pb-6 border-b border-zinc-900">
        <div>
          <h1 className="text-3xl items-center font-bold tracking-tight text-white mb-2 flex gap-3">
             Gestão de Pacientes <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 font-mono tracking-widest bg-emerald-500/10">NEXUS B2B</Badge>
          </h1>
          <p className="text-base text-zinc-400 font-medium">
            Vigilância clínica ativa e cadastramento de atletas da sua organização.
          </p>
        </div>
        <AddPatientModal />
      </div>

      {patients.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-3xl bg-[#0c0c0e] p-12 text-center min-h-[500px]">
          <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
            <Activity className="h-10 w-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-200 mb-3 tracking-tight">O Motor Preditivo aguarda dados</h2>
          <p className="text-zinc-500 max-w-md mb-8 leading-relaxed text-sm">
            Nenhum atleta vinculado à sua clínica de saúde. Comece adicionando o primeiro paciente para ativar a vigilância de síndrome e biometria diária em background.
          </p>
          <AddPatientModal />
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-[#0c0c0e] overflow-hidden shadow-2xl">
          <Table>
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 font-semibold h-12 px-6">Identificação Fisiológica</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Correio Clínico</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Peso Base</TableHead>
                <TableHead className="text-zinc-400 font-semibold h-12">Status de Prontidão (Wellness)</TableHead>
                <TableHead className="text-right text-zinc-400 font-semibold h-12 px-6">Prontuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((patient) => {
                const lastReadiness = patient.dailyReadiness?.[0];
                return (
                  <TableRow key={patient.id} className="border-zinc-800/60 hover:bg-zinc-900/40 transition-colors group">
                    <TableCell className="font-semibold text-zinc-200 px-6 py-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        {patient.name?.substring(0, 2) || 'AT'}
                      </div>
                      <span className="text-[15px]">{patient.name}</span>
                    </TableCell>
                    <TableCell className="text-zinc-400 py-4 font-mono text-[13px]">{patient.email}</TableCell>
                    <TableCell className="text-zinc-400 py-4 font-mono text-[13px]">{patient.weightKg ? `${patient.weightKg.toFixed(1)} kg` : 'Pendente'}</TableCell>
                    <TableCell className="py-4">
                      {lastReadiness && lastReadiness.wellnessScore ? (
                        <Badge className={`${
                          lastReadiness.wellnessScore >= 7 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          lastReadiness.wellnessScore >= 5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        } border shadow-sm px-2.5 py-1 text-[11px] font-bold font-mono tracking-widest`}>
                          SCORE: {lastReadiness.wellnessScore.toFixed(1)}/10
                        </Badge>
                      ) : (
                        <span className="text-zinc-600 text-[11px] font-bold tracking-widest font-mono bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800">NO_DATA_SYNCED</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6 py-4">
                       <Link href={`/dashboard/clinical/patients/${patient.id}`} className="inline-flex justify-end p-2 rounded-lg text-zinc-600 hover:bg-blue-500/10 hover:text-blue-400 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                       </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
