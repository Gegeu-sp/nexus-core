// Nexus Core - Motor Matemático
// Conversão da biologia em dados matemáticos puros para leitura pela IA

/**
 * Interface para os dados de um exercício
 */
export interface ExerciseData {
  name: string;
  sets: number;
  reps: number;
  loadKg: number;
  percentageOf1RM?: number; // Porcentagem do 1RM para cálculo de INOL
}

/**
 * Interface para dados de farmacocinética
 */
export interface PharmacokineticsParams {
  initialDoseMg: number;      // C0 - Dose inicial em mg
  halfLifeHours: number;      // t_meia - Meia-vida em horas
  elapsedTimeHours: number;   // t - Tempo decorrido desde a administração
}

/**
 * Interface para dados de carga de treino
 */
export interface WorkloadData {
  totalTonnage: number;
  sessionCount: number;
  sessionDates: Date[];
}

/**
 * Calcula o Volume Load (Tonagem)
 * Σ (Séries × Repetições × Carga em kg)
 */
export function calculateTonnage(exercises: ExerciseData[]): number {
  return exercises.reduce((total, exercise) => {
    return total + (exercise.sets * exercise.reps * exercise.loadKg);
  }, 0);
}

/**
 * Calcula o INOL (Intensity Number of Lifts)
 * Quantifica o desgaste do Sistema Nervoso Central
 * Fórmula: Repetições / (100 - %1RM)
 *
 * Regra de negócio: Valores diários > 1.0 por padrão de movimento acionam mitigação de volume
 */
export function calculateINOL(exercises: ExerciseData[]): { total: number; byExercise: Array<{ name: string; inol: number }> } {
  const byExercise: Array<{ name: string; inol: number }> = [];

  for (const exercise of exercises) {
    if (exercise.percentageOf1RM && exercise.percentageOf1RM < 100) {
      const inol = (exercise.sets * exercise.reps) / (100 - exercise.percentageOf1RM);
      byExercise.push({
        name: exercise.name,
        inol: Number(inol.toFixed(3))
      });
    }
  }

  const total = byExercise.reduce((sum, ex) => sum + ex.inol, 0);

  return {
    total: Number(total.toFixed(3)),
    byExercise
  };
}

/**
 * Calcula o ACWR (Acute:Chronic Workload Ratio)
 * Carga da Semana Atual / Média de Carga das 4 Semanas Anteriores
 *
 * Regra de negócio (Hardcoded):
 * - Valores > 1.5 ativam alerta vermelho para risco exponencial de ruptura de tendão ou overtraining sistêmico
 * - Valores entre 1.0 e 1.5 indicam risco moderado
 * - Valores entre 0.8 e 1.0 são considerados zona segura
 * - Valores < 0.8 podem indicar destreinamento
 */
export function calculateACWR(
  currentWeekTonnage: number,
  previousWeeksTonnage: number[]
): {
  ratio: number;
  riskLevel: 'safe' | 'moderate' | 'high' | 'very_high' | 'undertraining';
  interpretation: string;
} {
  // Média das 4 semanas anteriores (ou menos se não tiver dados suficientes)
  const chronicWorkload = previousWeeksTonnage.length > 0
    ? previousWeeksTonnage.reduce((sum, week) => sum + week, 0) / previousWeeksTonnage.length
    : currentWeekTonnage;

  // Evitar divisão por zero
  const ratio = chronicWorkload > 0
    ? Number((currentWeekTonnage / chronicWorkload).toFixed(2))
    : 1.0;

  let riskLevel: 'safe' | 'moderate' | 'high' | 'very_high' | 'undertraining';
  let interpretation: string;

  if (ratio > 1.5) {
    riskLevel = 'very_high';
    interpretation = 'RISCO EXPONENCIAL de ruptura de tendão ou overtraining sistêmico. Redução imediata de carga recomendada.';
  } else if (ratio > 1.3) {
    riskLevel = 'high';
    interpretation = 'Risco elevado de lesão. Considere reduzir a carga em 10-15%.';
  } else if (ratio > 1.0) {
    riskLevel = 'moderate';
    interpretation = 'Aumento moderado de carga. Monitorar resposta do atleta.';
  } else if (ratio >= 0.8) {
    riskLevel = 'safe';
    interpretation = 'Zona Segura. Carga está em equilíbrio com a preparação crônica.';
  } else {
    riskLevel = 'undertraining';
    interpretation = 'Possível destreinamento. Considerar aumento progressivo de carga.';
  }

  return { ratio, riskLevel, interpretation };
}

/**
 * Calcula a concentração atual de uma substância baseado na farmacocinética
 * Fórmula de decaimento exponencial: C(t) = C0 * (1/2)^(t / t_meia)
 *
 * Aplicação: Cruza o pico plasmático calculado com a prescrição do treino,
 * evitando alocar blocos de força máxima em janelas de letargia medicamentosa.
 */
export function calculatePlasmaConcentration(params: PharmacokineticsParams): {
  currentConcentration: number;
  remainingPercentage: number;
  timeToClear: number; // Tempo para completamente eliminar (5 meias-vidas)
  peakImpactLevel: 'high' | 'moderate' | 'low' | 'negligible';
} {
  const { initialDoseMg, halfLifeHours, elapsedTimeHours } = params;

  // C(t) = C0 * (1/2)^(t / t_meia)
  const currentConcentration = initialDoseMg * Math.pow(0.5, elapsedTimeHours / halfLifeHours);
  const remainingPercentage = (currentConcentration / initialDoseMg) * 100;

  // Tempo para eliminação completa (~5 meias-vidas)
  const timeToClear = (5 * halfLifeHours) - elapsedTimeHours;

  // Determinar nível de impacto na performance
  let peakImpactLevel: 'high' | 'moderate' | 'low' | 'negligible';
  if (remainingPercentage > 75) {
    peakImpactLevel = 'high';
  } else if (remainingPercentage > 50) {
    peakImpactLevel = 'moderate';
  } else if (remainingPercentage > 25) {
    peakImpactLevel = 'low';
  } else {
    peakImpactLevel = 'negligible';
  }

  return {
    currentConcentration: Number(currentConcentration.toFixed(2)),
    remainingPercentage: Number(remainingPercentage.toFixed(2)),
    timeToClear: Math.max(0, Number(timeToClear.toFixed(2))),
    peakImpactLevel
  };
}

/**
 * Determina se é seguro realizar treino de força máxima baseado na medicação ativa
 */
export function canPerformMaxStrengthWork(pharmacokineticsResults: Array<{
  substanceName: string;
  peakImpactLevel: 'high' | 'moderate' | 'low' | 'negligible';
  substanceType?: string;
}>): {
  canPerform: boolean;
  reason: string;
  recommendations: string[];
} {
  const sedatingSubstances = pharmacokineticsResults.filter(
    p => p.peakImpactLevel === 'high' && p.substanceType === 'medication'
  );

  if (sedatingSubstances.length > 0) {
    return {
      canPerform: false,
      reason: `Substância(s) sedativa(s) detectada(s) com impacto alto: ${sedatingSubstances.map(s => s.substanceName).join(', ')}`,
      recommendations: [
        'Evitar blocos de força máxima',
        'Priorizar treinamento submáximo',
        'Focar em mobilidade e técnica',
        'Aguardar eliminação da substância para treinos intensos'
      ]
    };
  }

  const moderateImpact = pharmacokineticsResults.filter(
    p => p.peakImpactLevel === 'moderate' && p.substanceType === 'medication'
  );

  if (moderateImpact.length > 0) {
    return {
      canPerform: true,
      reason: 'Substância(s) com impacto moderado detectada(s). Monitorar resposta.',
      recommendations: [
        'Reduzir intensidade em 10-15%',
        'Monitorar frequência cardíaca e fadiga',
        'Ter parâmetros de emergência definidos'
      ]
    };
  }

  return {
    canPerform: true,
    reason: 'Nenhuma contraindicação medicamentosa detectada.',
    recommendations: [
      'Proceder com treino conforme planejado',
      'Manter monitoramento normal'
    ]
  };
}

/**
 * Calcula o Wellness Score baseado em métricas subjetivas diárias
 */
export function calculateWellnessScore(metrics: {
  sleepQuality?: number;
  muscleSoreness?: number;
  jointPain?: number;
  energyLevel?: number;
  mentalState?: number;
  stressLevel?: number;
}): {
  score: number;
  level: 'excellent' | 'good' | 'moderate' | 'poor';
} {
  const values = Object.values(metrics).filter((v): v is number => v !== undefined);

  if (values.length === 0) {
    return { score: 0, level: 'moderate' };
  }

  // Inverter escalas negativas (soreness, pain, stress)
  const normalizedValues = values.map((v, i) => {
    const keys = Object.keys(metrics);
    const key = keys[i];
    if (key === 'muscleSoreness' || key === 'jointPain' || key === 'stressLevel') {
      return 10 - v; // Inverter para que maior seja melhor
    }
    return v;
  });

  const average = normalizedValues.reduce((sum, v) => sum + v, 0) / normalizedValues.length;

  let level: 'excellent' | 'good' | 'moderate' | 'poor';
  if (average >= 8) {
    level = 'excellent';
  } else if (average >= 6) {
    level = 'good';
  } else if (average >= 4) {
    level = 'moderate';
  } else {
    level = 'poor';
  }

  return {
    score: Number(average.toFixed(1)),
    level
  };
}

/**
 * Analisa biomarcadores e fornece interpretação clínica
 */
export function analyzeBiomarkers(biomarkers: Record<string, number>): {
  overallStatus: 'optimal' | 'attention' | 'concern';
  alerts: Array<{ biomarker: string; value: number; message: string; severity: 'info' | 'warning' | 'critical' }>;
  recommendations: string[];
} {
  const alerts: Array<{ biomarker: string; value: number; message: string; severity: 'info' | 'warning' | 'critical' }> = [];
  const recommendations: string[] = [];

  // CPK (Creatinofosfoquinase) - Dano muscular
  // Valores normais: 10-200 U/L (varia por gênero)
  if ('CPK_UL' in biomarkers) {
    const cpk = biomarkers['CPK_UL'];
    if (cpk > 1000) {
      alerts.push({
        biomarker: 'CPK',
        value: cpk,
        message: 'RABDOMIÓLISE POTENCIAL: Nível crítico de CPK detectado.',
        severity: 'critical'
      });
      recommendations.push('PROCURE ATENDIMENTO MÉDICO IMEDIATAMENTE');
      recommendations.push('Hidratação intensiva recomendada');
      recommendations.push('SUSPENDER treinamento até avaliação médica');
    } else if (cpk > 500) {
      alerts.push({
        biomarker: 'CPK',
        value: cpk,
        message: 'DANO MUSCULAR SIGNIFICATIVO: CPK elevado indica estresse muscular excessivo.',
        severity: 'warning'
      });
      recommendations.push('Reduzir volume de treinamento por 3-5 dias');
      recommendations.push('Priorizar recuperação ativa e hidratação');
    } else if (cpk > 300) {
      alerts.push({
        biomarker: 'CPK',
        value: cpk,
        message: 'DANO MUSCULAR MODERADO: CPK levemente elevado.',
        severity: 'info'
      });
      recommendations.push('Monitorar evolução nos próximos dias');
    }
  }

  // Ângulo de Fase - Integridade da membrana celular
  // Valores normais: 5-7 graus (varia por idade e gênero)
  if ('Phase_Angle' in biomarkers) {
    const phaseAngle = biomarkers['Phase_Angle'];
    if (phaseAngle < 4.5) {
      alerts.push({
        biomarker: 'Ângulo de Fase',
        value: phaseAngle,
        message: 'DEGRADAÇÃO CELULAR: Ângulo de fase muito baixo indica possível sarcopenia ou comprometimento imunológico.',
        severity: 'critical'
      });
      recommendations.push('Converta sessões hipertróficas em regenerativas');
      recommendations.push('Avaliar ingestão proteica e estado nutricional');
      recommendations.push('Considerar reavaliação médica completa');
    } else if (phaseAngle < 5.0) {
      alerts.push({
        biomarker: 'Ângulo de Fase',
        value: phaseAngle,
        message: 'INTEGRIDADE CELULAR REDUZIDA: Atenção necessária.',
        severity: 'warning'
      });
      recommendations.push('Aumentar ingestão proteica');
      recommendations.push('Focar em recuperação e sono');
    } else if (phaseAngle >= 6.5) {
      alerts.push({
        biomarker: 'Ângulo de Fase',
        value: phaseAngle,
        message: 'INTEGRIDADE CELULAR EXCELENTE: Ótimo estado de saúde.',
        severity: 'info'
      });
      recommendations.push('Manter estratégias atuais');
    }
  }

  // HbA1c - Controle glicêmico
  // Normal: < 5.7%, Pré-diabetes: 5.7-6.4%, Diabetes: ≥ 6.5%
  if ('HbA1c_percent' in biomarkers) {
    const hba1c = biomarkers['HbA1c_percent'];
    if (hba1c >= 6.5) {
      alerts.push({
        biomarker: 'HbA1c',
        value: hba1c,
        message: 'CONTROLE GLICÊMICO COMPROMETIDO: Valores indicativos de diabetes.',
        severity: 'critical'
      });
      recommendations.push('Avaliação médica urgente recomendada');
    } else if (hba1c >= 5.7) {
      alerts.push({
        biomarker: 'HbA1c',
        value: hba1c,
        message: 'PRÉ-DIABETES: Atenção à alimentação e exercícios.',
        severity: 'warning'
      });
      recommendations.push('Revisar estratégia nutricional');
      recommendations.push('Aumentar frequência de treinos aeróbicos');
    }
  }

  // Cortisol - Estresse
  // Normal matinal: 6-23 mcg/dL
  if ('Cortisol_mcg_dL' in biomarkers) {
    const cortisol = biomarkers['Cortisol_mcg_dL'];
    if (cortisol > 25) {
      alerts.push({
        biomarker: 'Cortisol',
        value: cortisol,
        message: 'ESTRESSE ELEVADO: Cortisol acima do normal.',
        severity: 'warning'
      });
      recommendations.push('Incluir práticas de recuperação e manejo de estresse');
      recommendations.push('Reduzir volume de treinamento temporariamente');
    }
  }

  // Determinar status geral
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

  let overallStatus: 'optimal' | 'attention' | 'concern';
  if (criticalAlerts > 0) {
    overallStatus = 'concern';
  } else if (warningAlerts > 0) {
    overallStatus = 'attention';
  } else {
    overallStatus = 'optimal';
  }

  return { overallStatus, alerts, recommendations };
}

/**
 * Parser de métricas para linguagem natural (Output WhatsApp)
 */
export function parseMetricsToNaturalLanguage(metrics: {
  totalTonnage?: number;
  tonnageChangePercent?: number;
  acwrRatio?: number;
  acwrRiskLevel?: string;
  phaseAngle?: number;
  cpkLevel?: number;
  wellnessScore?: number;
}): string {
  const parts: string[] = [];

  if (metrics.totalTonnage !== undefined) {
    const changeText = metrics.tonnageChangePercent
      ? ` (${metrics.tonnageChangePercent >= 0 ? '+' : ''}${metrics.tonnageChangePercent.toFixed(1)}%)`
      : '';
    parts.push(`📊 Tonagem total: ${metrics.totalTonnage.toLocaleString()} kg${changeText}`);
  }

  if (metrics.acwrRatio !== undefined) {
    const riskText = metrics.acwrRiskLevel === 'safe' ? '(Zona Segura)' : `(${metrics.acwrRiskLevel})`;
    parts.push(`⚖️ ACWR em ${metrics.acwrRatio.toFixed(1)} ${riskText}`);
  }

  if (metrics.phaseAngle !== undefined) {
    const phaseStatus = metrics.phaseAngle >= 6.0 ? '(Integridade Celular Excelente)' :
                       metrics.phaseAngle >= 5.0 ? '(Integridade Celular Adequada)' :
                       '(Atenção Necessária)';
    parts.push(`🧬 Ângulo de fase: ${metrics.phaseAngle.toFixed(1)}° ${phaseStatus}`);
  }

  if (metrics.cpkLevel !== undefined) {
    const cpkStatus = metrics.cpkLevel > 500 ? '(ALTO - Atenção)' :
                     metrics.cpkLevel > 300 ? '(Moderado)' :
                     '(Normal)';
    parts.push(`💪 CPK: ${metrics.cpkLevel} U/L ${cpkStatus}`);
  }

  if (metrics.wellnessScore !== undefined) {
    const wellnessStatus = metrics.wellnessScore >= 8 ? '(Excelente)' :
                          metrics.wellnessScore >= 6 ? '(Bom)' :
                          metrics.wellnessScore >= 4 ? '(Moderado)' :
                          '(Baixo)';
    parts.push(`😊 Wellness Score: ${metrics.wellnessScore.toFixed(1)}/10 ${wellnessStatus}`);
  }

  return parts.join('\n') || 'Nenhuma métrica disponível.';
}
