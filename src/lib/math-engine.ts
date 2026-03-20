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
 * Estima o %1RM com base nas repetições realizadas, assumindo um esforço próximo à falha (RIR ~2)
 * Utiliza a fórmula de Epley invertida.
 */
export function estimate1RMPercentage(reps: number): number {
  const estimatedMaxReps = reps > 0 ? reps + 2 : 1; 
  return 100 / (1 + 0.0333 * estimatedMaxReps);
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
    let p1RM = exercise.percentageOf1RM;
    if (!p1RM || p1RM <= 0) {
      p1RM = estimate1RMPercentage(exercise.reps);
    }

    if (p1RM > 0 && p1RM < 100) {
      const inol = (exercise.sets * exercise.reps) / (100 - p1RM);
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

// ============================================================
// EXTENSÕES DO MOTOR MATEMÁTICO — Spec v1.0 (2026-03-18)
// Todas as adições abaixo são NOVAS. Nenhuma função existente
// foi alterada.
// ============================================================

/**
 * Utilitário anti-NaN/Infinity para todos os cálculos numéricos.
 * Garante que nunca persistimos valores inválidos no banco.
 */
export function safeCalc(value: number, decimals: number = 2): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  return Number(value.toFixed(decimals));
}

// ----- Interfaces de Validação -----

export type ValidationErrorCode =
  | 'REQUIRED'
  | 'OUT_OF_RANGE'
  | 'INVALID_FORMAT'
  | 'LOGIC_ERROR';

export type ValidationWarningCode =
  | 'ASYMMETRY'
  | 'HIGH_VOLUME'
  | 'HIGH_INTENSITY'
  | 'SUSPICIOUS_LOAD';

export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: ValidationWarningCode;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ----- Interfaces de Sessão e Totais -----

export interface WorkoutSessionInput {
  userId: string;
  sessionDate: Date;
  sessionType: 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'recovery';
  exercises: ExerciseData[];
  notes?: string;
}

export interface SessionTotals {
  totalExercicios: number;
  totalSeries: number;
  totalReps: number;
  volumeTotal: number;     // kg (2 decimais)
  avgLoadPerSet: number;   // kg/série (2 decimais)
}

// ----- Parser de Texto Livre -----

/**
 * Tipo interno para um detalhe de série parseado
 */
interface ParsedSetDetail {
  sets: number;
  reps: number;   // já resolvido para bilateral (10/10 → 20)
  weight: number;
  volume: number;
}

/**
 * Resolve reps compostas do tipo "10/10" somando os lados
 */
function resolveReps(repsStr: string): number {
  if (repsStr.includes('/')) {
    return repsStr.split('/').reduce((sum, part) => sum + parseInt(part.trim(), 10), 0);
  }
  return parseInt(repsStr.trim(), 10);
}

/**
 * Resolve peso aceitando tanto ponto quanto vírgula como separador decimal
 */
function resolveWeight(weightStr: string): number {
  if (!weightStr) return 0;
  // Substituir vírgula por ponto e remover caracteres não numéricos exceto ponto
  const normalized = weightStr.replace(',', '.').replace(/[^0-9.]/g, '');
  return parseFloat(normalized) || 0;
}

/**
 * Regex mestre para reconhecimento de linhas de série.
 * Suporta:
 *   - "3x12x20kg"
 *   - "3x12 20kg"
 *   - "3x12 - 20kg"
 *   - "3x12 com 20kg"
 *   - "3x10/10x8kg"  (bilateral)
 *   - "3 séries de 12 com 40kg"
 */
const SET_LINE_REGEX =
  /(\d+)\s*(?:x|[xX×]|séries?\s+de)\s*(\d+(?:\/\d+)?)\s*(?:[xX×]|-|com\s+)?\s*(\d+(?:[,\.]\d+)?)\s*(?:kg)?/i;

/**
 * Tenta parsear uma única linha de série.
 * Retorna null se a linha não for reconhecida.
 */
function parseSetLine(line: string): ParsedSetDetail | null {
  const match = line.match(SET_LINE_REGEX);
  if (!match) return null;

  const sets = parseInt(match[1], 10);
  const reps = resolveReps(match[2]);
  const weight = resolveWeight(match[3]);

  if (isNaN(sets) || isNaN(reps) || isNaN(weight)) return null;

  return {
    sets,
    reps,
    weight,
    volume: safeCalc(sets * reps * weight, 2),
  };
}

/**
 * Verifica se uma linha parece ser um nome de exercício
 * (não contém o padrão NxNxNkg e tem conteúdo textual relevante)
 */
function isExerciseName(line: string): boolean {
  return !SET_LINE_REGEX.test(line) && line.trim().length >= 3;
}

/**
 * Parseia texto livre de treino e retorna array de ExerciseData.
 *
 * Suporta dois formatos (Estilo A e B conforme QUANTIFICACAO_TREINOS.md):
 *
 * Estilo A — nome em linha separada:
 *   Agachamento livre
 *   1x12x40kg
 *   1x10x50kg
 *
 * Estilo B — nome e séries na mesma linha:
 *   Supino 3x12 com 80kg
 *   Supino inclinado: 3x12x20kg, 1x10x20kg
 */
export function parseWorkoutText(rawText: string): ExerciseData[] {
  const lines = rawText
    .split(/\r?\n|;/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const exercises: ExerciseData[] = [];
  let currentName = '';
  const currentDetails: ParsedSetDetail[] = [];

  const flushExercise = () => {
    if (!currentName || currentDetails.length === 0) return;

    // Agregar detalhes em um ExerciseData único (compatível com ExerciseData existente)
    const totalSets = currentDetails.reduce((s, d) => s + d.sets, 0);
    const totalRepsAll = currentDetails.reduce((s, d) => s + d.sets * d.reps, 0);
    const totalVol = currentDetails.reduce((s, d) => s + d.volume, 0);

    // reps médias por série (para compatibilidade com ExerciseData.reps)
    const avgReps = totalSets > 0 ? Math.round(totalRepsAll / totalSets) : 0;
    const avgWeight = totalSets > 0 ? safeCalc(totalVol / totalRepsAll, 2) : 0;

    exercises.push({
      name: currentName,
      sets: totalSets,
      reps: avgReps,
      loadKg: avgWeight,
    });

    currentDetails.length = 0;
  };

  for (const line of lines) {
    // Verificar se a linha contém pelo menos uma série embutida (Estilo B)
    const inlineMatches = [...line.matchAll(
      /(\d+)\s*(?:x|[xX×])\s*(\d+(?:\/\d+)?)\s*(?:[xX×]|-|com\s+)?\s*(\d+(?:[,\.]\d+)?)\s*(?:kg)?/gi
    )];

    if (inlineMatches.length > 0) {
      // Extrair nome do exercício antes do primeiro match numérico
      const firstMatchIndex = line.search(SET_LINE_REGEX);
      const possibleName = line.substring(0, firstMatchIndex).replace(/[:,-]$/, '').trim();

      if (possibleName.length >= 3) {
        flushExercise();
        currentName = possibleName;
      }

      for (const m of inlineMatches) {
        const sets = parseInt(m[1], 10);
        const reps = resolveReps(m[2]);
        const weight = resolveWeight(m[3]);
        if (!isNaN(sets) && !isNaN(reps) && !isNaN(weight)) {
          currentDetails.push({
            sets, reps, weight,
            volume: safeCalc(sets * reps * weight, 2)
          });
        }
      }
    } else {
      // Tenta parsear como linha de série pura (Estilo A — séries abaixo do nome)
      const detail = parseSetLine(line);
      if (detail) {
        currentDetails.push(detail);
      } else if (isExerciseName(line)) {
        // É o nome de um novo exercício
        flushExercise();
        currentName = line.replace(/[:,-]$/, '').trim();
      }
      // Linhas não reconhecidas são silenciosamente ignoradas (comportamento intencional)
    }
  }

  // Fechar o último exercício
  flushExercise();

  return exercises;
}

// ----- Validações de Consistência -----

/**
 * Valida um único exercício.
 * Retorna ValidationResult com erros (bloqueiam) e warnings (informam).
 */
export function validateExerciseData(ex: ExerciseData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // --- Erros Críticos ---
  if (!ex.name || ex.name.trim().length < 3) {
    errors.push({
      field: 'name',
      code: 'REQUIRED',
      message: 'Nome do exercício é obrigatório (mínimo 3 caracteres)',
    });
  }

  if (!Number.isInteger(ex.sets) || ex.sets < 1 || ex.sets > 20) {
    errors.push({
      field: 'sets',
      code: 'OUT_OF_RANGE',
      message: `Séries devem ser um inteiro entre 1 e 20 (recebido: ${ex.sets})`,
    });
  }

  if (!Number.isInteger(ex.reps) || ex.reps < 1 || ex.reps > 200) {
    errors.push({
      field: 'reps',
      code: 'OUT_OF_RANGE',
      message: `Repetições devem ser um inteiro entre 1 e 200 (recebido: ${ex.reps})`,
    });
  }

  if (typeof ex.loadKg !== 'number' || ex.loadKg < 0 || ex.loadKg > 1000) {
    errors.push({
      field: 'loadKg',
      code: 'OUT_OF_RANGE',
      message: `Carga deve estar entre 0 e 1000 kg (recebido: ${ex.loadKg})`,
    });
  }

  if (
    ex.percentageOf1RM !== undefined &&
    (ex.percentageOf1RM <= 0 || ex.percentageOf1RM >= 100)
  ) {
    errors.push({
      field: 'percentageOf1RM',
      code: 'OUT_OF_RANGE',
      message: `%1RM deve estar entre 1 e 99 (recebido: ${ex.percentageOf1RM})`,
    });
  }

  // --- Warnings ---
  if (ex.loadKg > 300) {
    warnings.push({
      field: 'loadKg',
      code: 'SUSPICIOUS_LOAD',
      message: `Carga de ${ex.loadKg} kg é muito alta. Confirme o valor informado.`,
    });
  }

  const volume = ex.sets * ex.reps * ex.loadKg;
  if (isFinite(volume) && volume > 10000) {
    warnings.push({
      field: 'volume',
      code: 'HIGH_VOLUME',
      message: `Volume por exercício (${volume.toFixed(0)} kg) muito alto. Confirme os dados.`,
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Valida uma sessão de treino completa.
 * Agrega validações de cada exercício e valida a sessão como um todo.
 */
export function validateSession(session: WorkoutSessionInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Validação de data (máximo 24h no futuro)
  const now = new Date();
  const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (session.sessionDate > futureLimit) {
    errors.push({
      field: 'sessionDate',
      code: 'LOGIC_ERROR',
      message: 'Data da sessão não pode ser mais de 24h no futuro',
    });
  }

  // Validação de exercícios
  if (!session.exercises || session.exercises.length === 0) {
    errors.push({
      field: 'exercises',
      code: 'REQUIRED',
      message: 'A sessão deve ter ao menos 1 exercício',
    });
  } else if (session.exercises.length > 30) {
    errors.push({
      field: 'exercises',
      code: 'OUT_OF_RANGE',
      message: `Máximo de 30 exercícios por sessão (recebido: ${session.exercises.length})`,
    });
  } else {
    // Validar cada exercício individualmente
    session.exercises.forEach((ex, idx) => {
      const result = validateExerciseData(ex);
      result.errors.forEach(err => errors.push({ ...err, field: `exercises[${idx}].${err.field}` }));
      result.warnings.forEach(w => warnings.push({ ...w, field: `exercises[${idx}].${w.field}` }));
    });
  }

  // Warnings de sessão
  const totalSeries = session.exercises.reduce((s, ex) => s + ex.sets, 0);
  if (totalSeries > 50) {
    warnings.push({
      field: 'totalSeries',
      code: 'HIGH_VOLUME',
      message: `${totalSeries} séries detectadas. Sessão muito longa? Verifique os dados.`,
    });
  }

  const totalVolume = session.exercises.reduce(
    (s, ex) => s + ex.sets * ex.reps * ex.loadKg, 0
  );
  if (totalVolume > 50000) {
    warnings.push({
      field: 'volumeTotal',
      code: 'HIGH_VOLUME',
      message: `Volume total (${totalVolume.toFixed(0)} kg) extremamente alto. Confirme os dados.`,
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

// ----- Regra de Ouro do Backend -----

/**
 * Recalcula os totais de uma sessão no backend, independentemente
 * de qualquer cálculo feito no front-end.
 *
 * Esta é a "Regra de Ouro" do Motor Matemático:
 * os totais persistidos são SEMPRE recalculados aqui.
 */
export function computeSessionTotals(exercises: ExerciseData[]): SessionTotals {
  let totalSeries = 0;
  let totalReps = 0;
  let volumeTotal = 0;

  for (const ex of exercises) {
    totalSeries += ex.sets;
    totalReps   += ex.sets * ex.reps;
    volumeTotal += ex.sets * ex.reps * ex.loadKg;
  }

  const avgLoadPerSet = totalSeries > 0 ? volumeTotal / totalSeries : 0;

  return {
    totalExercicios: exercises.length,
    totalSeries,
    totalReps,
    volumeTotal: safeCalc(volumeTotal, 2),
    avgLoadPerSet: safeCalc(avgLoadPerSet, 2),
  };
}

// ----- Agrupamento por Padrão de Movimento -----

export type MovementPattern = 'squat' | 'hinge' | 'push' | 'pull' | 'carry' | 'other';

const MOVEMENT_KEYWORDS: Record<MovementPattern, string[]> = {
  squat:  ['agachamento', 'leg press', 'hack squat', 'búlgaro', 'lunge', 'afundo', 'cadeira extensora'],
  hinge:  ['levantamento terra', 'stiff', 'hip thrust', 'deadlift', 'rdl', 'glúteo', 'cadeira flexora', 'mesa flexora'],
  push:   ['supino', 'desenvolvimento', 'pushup', 'flexão', 'triceps', 'tríceps', 'arnold', 'elevação frontal', 'elevação lateral'],
  pull:   ['remada', 'pull-up', 'pulldown', 'puxada', 'rosca', 'bíceps', 'biceps', 'face pull', 'crucifixo reto'],
  carry:  ['farmer', 'carry', 'prancha', 'plank', 'farmer walk'],
  other:  [],
};

/**
 * Classifica o nome de um exercício em um padrão de movimento
 * para agrupamento do INOL por grupo muscular.
 */
export function getMovementPattern(exerciseName: string): MovementPattern {
  const lower = exerciseName.toLowerCase();
  for (const [pattern, keywords] of Object.entries(MOVEMENT_KEYWORDS) as [MovementPattern, string[]][]) {
    if (pattern === 'other') continue;
    if (keywords.some(kw => lower.includes(kw))) return pattern;
  }
  return 'other';
}

/**
 * Calcula o INOL agrupado por padrão de movimento.
 * Permite identificar qual grupo muscular está mais sobrecarregado.
 *
 * Regra de negócio: INOL > 1.5 por padrão de movimento aciona alerta de mitigação.
 * INOL > 2.0 por padrão é nível crítico.
 */
export function calculateINOLByPattern(exercises: ExerciseData[]): {
  byPattern: Record<MovementPattern, number>;
  alerts: Array<{ pattern: MovementPattern; inol: number; level: 'warning' | 'critical' }>;
} {
  const byPattern: Record<MovementPattern, number> = {
    squat: 0, hinge: 0, push: 0, pull: 0, carry: 0, other: 0,
  };

  for (const ex of exercises) {
    let p1RM = ex.percentageOf1RM;
    if (!p1RM || p1RM <= 0) {
      p1RM = estimate1RMPercentage(ex.reps);
    }

    if (p1RM > 0 && p1RM < 100) {
      const inol = (ex.sets * ex.reps) / (100 - p1RM);
      const pattern = getMovementPattern(ex.name);
      byPattern[pattern] = safeCalc(byPattern[pattern] + inol, 3);
    }
  }

  const alerts: Array<{ pattern: MovementPattern; inol: number; level: 'warning' | 'critical' }> = [];
  for (const [pattern, inol] of Object.entries(byPattern) as [MovementPattern, number][]) {
    if (inol > 2.0) {
      alerts.push({ pattern, inol, level: 'critical' });
    } else if (inol > 1.5) {
      alerts.push({ pattern, inol, level: 'warning' });
    }
  }

  return { byPattern, alerts };
}

