import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface TriageBannerProps {
  alertsCount: number;
  highestSeverity: 'low' | 'moderate' | 'high' | 'critical' | null;
}

export function GlobalTriageBanner({ alertsCount, highestSeverity }: TriageBannerProps) {
  if (alertsCount === 0 || !highestSeverity) {
    return (
      <div className="w-full bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-3 flex items-center justify-center gap-3 text-emerald-400">
        <ShieldCheck className="h-5 w-5" />
        <span className="text-sm font-medium">Sistema Estável: Nenhuma anomalia sistêmica detectada na triagem preditiva.</span>
      </div>
    );
  }

  const isCritical = highestSeverity === 'critical' || highestSeverity === 'high';

  return (
    <div className={`w-full px-6 py-3 flex items-center justify-center gap-3 border-b ${isCritical ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
      <AlertTriangle className="h-5 w-5 animate-pulse" />
      <span className="text-sm font-medium">
        Atenção Clínica: {alertsCount} alerta(s) de síndrome preditiva ativo(s). Triagem prioritária recomendada.
      </span>
    </div>
  );
}
