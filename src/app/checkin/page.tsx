import { PrismaClient } from '@prisma/client';
import { submitMorningCheckin } from './actions';
import { CheckCircle2, ChevronRight, Activity, Zap, Moon, Battery, Droplet, Repeat } from 'lucide-react';
import Link from 'next/link';

const db = new PrismaClient();

// Deep-Tech Dashboard requires fresh dicts
export const revalidate = 0;

export default async function MorningCheckinPage({
  searchParams
}: {
  searchParams: { success?: string }
}) {
  const isSuccess = searchParams.success === 'true';
  const drugs = await db.clinicalDrugDictionary.findMany({
    orderBy: { name: 'asc' }
  });

  if (isSuccess) {
    return (
      <div className="min-h-[100dvh] bg-black text-gray-100 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-6 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Check-in Sincronizado!</h1>
        <p className="text-gray-400 text-sm mb-10 max-w-[280px]">Seus biomarcadores subjetivos e ingestão farmacológica já estão sendo avaliados pelo Motor Clínico.</p>
        <Link 
          href="/dashboard/clinical"
          className="bg-gray-900 border border-gray-800 text-gray-300 px-8 py-4 rounded-full font-semibold text-sm flex items-center gap-2 hover:bg-gray-800 transition active:scale-95"
        >
          Retornar ao Dashboard <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#09090b] text-zinc-100 font-sans pb-10">
      {/* Header Fixo Mobile-First */}
      <header className="sticky top-0 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/60 p-5 px-6 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bom dia.</h1>
          <p className="text-xs text-zinc-500 font-medium">Sincronização Matinal (Nexus Core)</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Activity className="w-4 h-4 text-blue-400" />
        </div>
      </header>

      <form action={submitMorningCheckin} className="p-6 max-w-md mx-auto space-y-10">
        
        {/* PARTE 1: READINESS */}
        <section className="space-y-8">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
            <Zap className="w-5 h-5 text-zinc-400" />
            <h2 className="text-base font-bold text-zinc-200 tracking-wide uppercase">Readiness Score</h2>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300 flex justify-between">
              <span>Sono (Horas)</span>
            </label>
            <input 
              type="number" 
              name="sleepHours" 
              step="0.5"
              defaultValue={7}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300 flex justify-between items-center">
              <span>Qualidade do Sono</span>
              <span className="text-xs text-zinc-500">1-10</span>
            </label>
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-indigo-400/70" />
              <input 
                type="range" name="sleepQuality" min="1" max="10" defaultValue="7"
                className="w-full accent-indigo-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
              <span className="text-zinc-400 text-sm font-medium">10</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300 flex justify-between items-center">
              <span>Nível de Energia</span>
              <span className="text-xs text-zinc-500">1-10</span>
            </label>
            <div className="flex items-center gap-3">
              <Battery className="w-5 h-5 text-emerald-400/70" />
              <input 
                type="range" name="energyLevel" min="1" max="10" defaultValue="7"
                className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer" 
              />
              <span className="text-zinc-400 text-sm font-medium">10</span>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300 mb-2 block">Dor Muscular (DOMS)</label>
            <div className="grid grid-cols-4 gap-2">
              {['Zero', 'Leve', 'Moderada', 'Severa'].map((level) => (
                <label key={level} className="relative flex align-center justify-center cursor-pointer">
                  <input type="radio" name="muscleSoreness" value={level} defaultChecked={level === 'Zero'} className="peer sr-only" />
                  <div className="w-full text-center text-xs py-3 rounded-lg border border-zinc-800 bg-zinc-900/30 text-zinc-400 peer-checked:bg-rose-500/10 peer-checked:border-rose-500/50 peer-checked:text-rose-400 transition-all font-semibold select-none">
                    {level}
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-zinc-300 flex justify-between">
              <span>HRV (ms) (Opcional)</span>
            </label>
            <input 
              type="number" 
              name="hrv" 
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 outline-none transition" 
              placeholder="Ex: 55"
            />
          </div>
        </section>

        {/* PARTE 2: PHARMACOLOGY */}
        <section className="space-y-6 pt-6 border-t border-zinc-800/60">
          <div className="flex items-center gap-2 pb-2">
            <Droplet className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-zinc-200 tracking-wide uppercase">Farmácia Plasmática</h2>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 space-y-4">
             {/* Repeat Yesterday Option */}
             <label className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition">
               <input type="checkbox" name="repeatYesterday" value="true" className="w-5 h-5 accent-purple-500 bg-zinc-900 border-zinc-700 rounded" />
               <div className="flex items-center gap-2">
                 <Repeat className="w-4 h-4 text-purple-400" />
                 <span className="text-sm font-medium text-zinc-200">Refazer Ingestão de Ontem</span>
               </div>
             </label>

             <div className="text-center text-xs text-zinc-600 font-semibold uppercase tracking-widest my-2">- OU INSERIR NOVO -</div>

             <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Substância</label>
                <select name="dictionaryId" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none appearance-none text-zinc-200">
                  <option value="">Selecione do Dicionário...</option>
                  {drugs.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
             </div>

             <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase">Dosagem (mg/UI)</label>
                <input type="number" name="dosageMg" step="0.1" className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-zinc-200" placeholder="Ex: 50" />
             </div>
          </div>
        </section>

        {/* SUPER BOTÃO DE SUBMIT */}
        <button 
          type="submit" 
          className="w-full bg-zinc-100 text-black font-bold text-lg py-5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all hover:bg-white"
        >
          Sincronizar Nexus
        </button>

      </form>
    </div>
  );
}
