import { AlertTriangle, Activity, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SyndromeAlertCardProps {
  alert: {
    id: string;
    syndromeName: string;
    snomedCode: string | null;
    probability: number;
    severity: string;
    contributingFactors: string;
    timestamp: Date;
  }
}

export function SyndromeAlertCard({ alert }: SyndromeAlertCardProps) {
  let factors: string[] = [];
  try {
    factors = JSON.parse(alert.contributingFactors || '[]');
  } catch (e) {
    factors = [];
  }
  
  const severityColors: Record<string, string> = {
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const colorClass = severityColors[alert.severity] || severityColors.low;

  return (
    <Card className="border-border/50 bg-black/40 backdrop-blur-xl mb-4 overflow-hidden border border-gray-800 rounded-xl">
      <CardHeader className="pb-3 border-b border-border/10 p-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${colorClass}`}>
                Risco: {alert.probability}%
              </span>
              {alert.snomedCode && (
                <span className="text-[10px] text-gray-500 font-mono">
                  SNOMED: {alert.snomedCode}
                </span>
              )}
            </div>
            <CardTitle className="text-base text-gray-200 leading-tight">{alert.syndromeName}</CardTitle>
          </div>
          <AlertTriangle className={`h-5 w-5 mt-1 ${alert.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 p-5">
        <div className="mb-2">
          <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wider">Explainable AI (Fatores Contribuintes):</p>
          <div className="flex flex-col gap-2">
            {factors.map((factor, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-gray-800/50 border border-gray-700/50 rounded-md text-xs px-2.5 py-1.5 text-gray-300">
                <Activity className="h-3 w-3 text-blue-400 shrink-0" />
                <span className="leading-snug">{factor}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-800/50 flex justify-end">
          <button className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center transition-colors uppercase tracking-wide">
            Ver Mitigação Clínica <ChevronRight className="h-3 w-3 ml-1" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
