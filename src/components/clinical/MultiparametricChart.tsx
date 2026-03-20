"use client"

import React from 'react';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { ClinicalTimeSeriesData } from '@/lib/data-aggregation/fetchClinicalTimeSeries';

interface MultiparametricChartProps {
  data: ClinicalTimeSeriesData[];
}

/**
 * XAI Tooltip displaying the clinical mini-prontuário.
 */
const CustomClinicalTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as ClinicalTimeSeriesData;
    
    // Dynamic Clinical Correlation Rule (Explainable AI)
    const isCriticalRisk = data.acwr > 1.5 && data.cpk > 300;
    const isPharmacologyWarning = data.pharmacologyActive && data.tonnage > 10000;
    
    return (
      <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl shadow-2xl min-w-[280px]">
        <h4 className="text-gray-200 font-bold mb-3 border-b border-gray-800 pb-2 flex justify-between">
          <span>{label}</span>
          <span className="text-gray-500 font-mono text-xs">LOG</span>
        </h4>
        
        <div className="space-y-1.5 text-sm mb-4">
          <p className="flex justify-between">
            <span className="text-blue-400">Volume Load:</span> 
            <span className="font-semibold text-gray-200">{data.tonnage.toLocaleString()} kg</span>
          </p>
          <p className="flex justify-between">
            <span className="text-emerald-400">Recovery/Wellness:</span> 
            <span className="font-semibold text-gray-200">{data.wellness ? `${data.wellness}/10` : 'N/A'}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-amber-400">ACWR (Risco):</span> 
            <span className="font-semibold text-gray-200">{data.acwr.toFixed(2)}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-rose-400">CPK (Marcador):</span> 
            <span className="font-semibold text-gray-200">{data.cpk > 0 ? `${data.cpk} U/L` : 'Sem Coleta'}</span>
          </p>
          <p className="flex justify-between">
            <span className="text-purple-400">Fármacos Ativos:</span> 
            <span className="font-semibold text-gray-200">{data.pharmacologyActive ? 'Sim' : 'Não'}</span>
          </p>
        </div>

        {/* Dynamic Correlations (XAI) */}
        <div className="space-y-2 mt-3 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Inferência Clínica:</p>
          {isCriticalRisk && (
            <div className="bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs px-2 py-1.5 rounded flex items-start gap-1.5 leading-tight">
              <span>🚨</span>
              <span><strong>Alerta Crítico:</strong> Carga excessiva aguda vs Dano Celular alto. Sugere rabdomiólise silenciosa.</span>
            </div>
          )}
          {isPharmacologyWarning && !isCriticalRisk && (
            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs px-2 py-1.5 rounded flex items-start gap-1.5 leading-tight">
              <span>⚠️</span>
              <span><strong>Atenção:</strong> Volume de treino alto com interações medicamentosas ativas no plasma.</span>
            </div>
          )}
          {!isCriticalRisk && !isPharmacologyWarning && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] px-2 py-1 rounded">
              Homeostase orgânica preservada.
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function MultiparametricChart({ data }: MultiparametricChartProps) {
  
  const handleChartClick = (state: any) => {
    if (state && state.activePayload && state.activePayload.length > 0) {
      const clickedData = state.activePayload[0].payload as ClinicalTimeSeriesData;
      console.log(`Solicitando drill-down dos dados do dia ${clickedData.date}`);
    }
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
          onClick={handleChartClick}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => value.substring(5)} // Show MM-DD
            stroke="#4a5568" 
            tick={{ fill: '#a0aec0', fontSize: 12 }} 
            dy={10}
          />
          
          {/* Left Y Axis for Ratios and Scores (0 - 10 typically) */}
          <YAxis 
            yAxisId="left" 
            orientation="left" 
            stroke="#a0aec0"
            domain={[0, 10]}
            tick={{ fontSize: 12 }}
          />

          {/* Right Y Axis for Absolute values like Tonnage and CPK */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#4a5568"
            tick={{ fill: '#718096', fontSize: 12 }}
            // Hide the axis line, only show labels
            axisLine={false}
          />

          <Tooltip content={<CustomClinicalTooltip />} cursor={{ fill: '#2d3748', opacity: 0.4 }} />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: '#cbd5e0' }} />

          {/* Background Area: Wellness / Recovery capacity */}
          <Area 
            yAxisId="left"
            type="monotone" 
            dataKey="wellness" 
            fill="#10b981" 
            stroke="#10b981" 
            fillOpacity={0.15} 
            name="Readiness (1-10)" 
          />
          
          {/* Bar: Mechanical Load */}
          <Bar 
            yAxisId="right"
            dataKey="tonnage" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]}
            barSize={12}
            name="Volume Load (kg)" 
          />

          {/* Line: Acute:Chronic Workload Ratio */}
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="acwr" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} 
            activeDot={{ r: 6, strokeWidth: 0 }}
            name="ACWR (Risco)" 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
