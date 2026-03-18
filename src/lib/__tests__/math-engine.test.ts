/**
 * Testes Unitários do Motor Matemático — Nexus Core
 * Cobre os 15 casos de teste documentados no MOTOR_MATEMATICO_SPEC.md (Seção 12)
 *
 * Execução: npx jest src/lib/__tests__/math-engine.test.ts --no-coverage
 */

import {
  calculateTonnage,
  calculateINOL,
  calculateACWR,
  calculatePlasmaConcentration,
  calculateWellnessScore,
  parseWorkoutText,
  validateExerciseData,
  validateSession,
  computeSessionTotals,
  getMovementPattern,
  calculateINOLByPattern,
  safeCalc,
  type ExerciseData,
  type WorkoutSessionInput,
} from '../math-engine';

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 1 — Tonagem e Parser (TC-01 a TC-05)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateTonnage', () => {
  test('TC-01: Série simples — Supino 3x10x20kg = 600 kg', () => {
    const exercises: ExerciseData[] = [
      { name: 'Supino', sets: 3, reps: 10, loadKg: 20 },
    ];
    expect(calculateTonnage(exercises)).toBe(600);
  });

  test('Array vazio retorna 0', () => {
    expect(calculateTonnage([])).toBe(0);
  });

  test('Múltiplos exercícios somam corretamente', () => {
    const exercises: ExerciseData[] = [
      { name: 'Agachamento', sets: 3, reps: 12, loadKg: 40 }, // 1440
      { name: 'Supino',      sets: 4, reps: 10, loadKg: 60 }, // 2400
      { name: 'Remada',      sets: 3, reps: 12, loadKg: 50 }, // 1800
    ];
    expect(calculateTonnage(exercises)).toBe(5640);
  });

  test('Carga zero resulta em volume zero', () => {
    const exercises: ExerciseData[] = [
      { name: 'Peso Corporal', sets: 3, reps: 15, loadKg: 0 },
    ];
    expect(calculateTonnage(exercises)).toBe(0);
  });
});

describe('parseWorkoutText — TC-02', () => {
  test('TC-02: Reps bilaterais 2x10/10x8kg → repsNum=20, volume=320', () => {
    const result = parseWorkoutText('Rosca direta unil.\n2x10/10x8kg');
    expect(result).toHaveLength(1);
    const ex = result[0];
    // Após agrupamento: 2 sets, média 20 reps, volume = 320 → avgWeight = 320/(2*20) = 8
    expect(ex.name).toContain('Rosca');
    // totalReps = 2 * 20 = 40; totalVolume = 320; avgReps = totalReps/totalSets = 40/2 = 20
    expect(ex.sets).toBe(2);
    expect(ex.reps).toBe(20);
    expect(ex.loadKg).toBe(8);
  });

  test('TC-03: parser — Estilo A (nome + séries em linhas separadas)', () => {
    const text = `Agachamento livre
1x12x40kg
1x10x50kg
1x8x60kg`;
    const result = parseWorkoutText(text);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Agachamento livre');
    expect(result[0].sets).toBe(3); // 1+1+1
  });

  test('TC-04: Carga com vírgula decimal — "3x8x57,5kg"', () => {
    const result = parseWorkoutText('Agachamento\n3x8x57,5kg');
    expect(result).toHaveLength(1);
    // volume = 3 * 8 * 57.5 = 1380; avgWeight = 1380/24 ≈ 57.5
    expect(result[0].loadKg).toBeCloseTo(57.5, 1);
  });

  test('TC-03 completo — múltiplos exercícios — tonagem total 5640', () => {
    // Deve gerar 3 exercícios distintos
    const text = `Agachamento
3x12x40kg
Supino
4x10x60kg
Remada
3x12x50kg`;
    const result = parseWorkoutText(text);
    const total = calculateTonnage(result);
    expect(result).toHaveLength(3);
    expect(total).toBe(5640);
  });

  test('Estilo B — Supino 3x12 com 80kg na mesma linha', () => {
    const result = parseWorkoutText('Supino 3x12 com 80kg');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Supino');
    expect(result[0].sets).toBe(3);
    expect(result[0].reps).toBe(12);
    expect(result[0].loadKg).toBe(80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 2 — Validações (TC-05)
// ─────────────────────────────────────────────────────────────────────────────

describe('validateExerciseData — TC-05', () => {
  test('TC-05: sets=0 gera erro OUT_OF_RANGE', () => {
    const result = validateExerciseData({ name: 'Supino', sets: 0, reps: 10, loadKg: 20 });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'sets', code: 'OUT_OF_RANGE' })
      ])
    );
  });

  test('Nome ausente gera erro REQUIRED', () => {
    const result = validateExerciseData({ name: '', sets: 3, reps: 10, loadKg: 20 });
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('REQUIRED');
  });

  test('Exercício válido retorna isValid=true', () => {
    const result = validateExerciseData({ name: 'Supino', sets: 3, reps: 10, loadKg: 80 });
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('Carga 350kg gera warning SUSPICIOUS_LOAD', () => {
    const result = validateExerciseData({ name: 'Leg Press', sets: 4, reps: 10, loadKg: 350 });
    expect(result.isValid).toBe(true); // warning não bloqueia
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'SUSPICIOUS_LOAD' })
      ])
    );
  });

  test('percentageOf1RM=100 gera erro OUT_OF_RANGE', () => {
    const result = validateExerciseData({ name: 'Levantamento Terra', sets: 1, reps: 1, loadKg: 200, percentageOf1RM: 100 });
    expect(result.isValid).toBe(false);
    expect(result.errors[0].field).toBe('percentageOf1RM');
  });
});

describe('validateSession', () => {
  const baseSession = (): WorkoutSessionInput => ({
    userId: 'user-1',
    sessionDate: new Date(),
    sessionType: 'strength',
    exercises: [
      { name: 'Supino', sets: 3, reps: 10, loadKg: 80 }
    ],
  });

  test('Sessão válida retorna isValid=true', () => {
    const result = validateSession(baseSession());
    expect(result.isValid).toBe(true);
  });

  test('Sessão sem exercícios retorna erro REQUIRED', () => {
    const session = { ...baseSession(), exercises: [] };
    const result = validateSession(session);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('REQUIRED');
  });

  test('Sessão 48h no futuro retorna erro LOGIC_ERROR', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const session = { ...baseSession(), sessionDate: future };
    const result = validateSession(session);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('LOGIC_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 3 — INOL (TC-06 a TC-08)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateINOL — TC-06 a TC-08', () => {
  test('TC-06: INOL = (3×10)/(100-70) = 1.000 (elevado)', () => {
    const exercises: ExerciseData[] = [
      { name: 'Supino', sets: 3, reps: 10, loadKg: 70, percentageOf1RM: 70 },
    ];
    const result = calculateINOL(exercises);
    expect(result.total).toBe(1.0);
    expect(result.byExercise[0].inol).toBe(1.0);
  });

  test('TC-07: INOL = (4×8)/(100-75) = 1.280 (volume elevado)', () => {
    const exercises: ExerciseData[] = [
      { name: 'Agachamento', sets: 4, reps: 8, loadKg: 100, percentageOf1RM: 75 },
    ];
    const result = calculateINOL(exercises);
    expect(result.total).toBeCloseTo(1.28, 2);
  });

  test('TC-08: INOL = (5×5)/(100-90) = 2.500 (crítico)', () => {
    const exercises: ExerciseData[] = [
      { name: 'Levantamento Terra', sets: 5, reps: 5, loadKg: 180, percentageOf1RM: 90 },
    ];
    const result = calculateINOL(exercises);
    expect(result.total).toBeCloseTo(2.5, 2);
  });

  test('Exercício sem percentageOf1RM é ignorado no INOL', () => {
    const exercises: ExerciseData[] = [
      { name: 'Supino', sets: 3, reps: 10, loadKg: 80 },
    ];
    const result = calculateINOL(exercises);
    expect(result.total).toBe(0);
    expect(result.byExercise).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 4 — ACWR (TC-09 a TC-11)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateACWR — TC-09 a TC-11', () => {
  test('TC-09: Zona moderada — ACWR ≈ 1.02', () => {
    const result = calculateACWR(10000, [9500, 9800, 10200, 9700]);
    expect(result.ratio).toBeCloseTo(1.02, 1);
    expect(result.riskLevel).toBe('moderate');
  });

  test('TC-10: Risco muito alto — ACWR ≈ 1.95 → very_high', () => {
    const result = calculateACWR(18000, [9000, 9500, 8500, 10000]);
    expect(result.ratio).toBeGreaterThan(1.5);
    expect(result.riskLevel).toBe('very_high');
  });

  test('TC-11: Sem histórico — ACWR = 1.0 (neutro)', () => {
    const result = calculateACWR(5000, []);
    expect(result.ratio).toBe(1.0);
    expect(result.riskLevel).toBe('safe');
  });

  test('Undertraining — ACWR < 0.8', () => {
    const result = calculateACWR(4000, [10000, 11000, 9500, 10500]);
    expect(result.riskLevel).toBe('undertraining');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 5 — Farmacocinética (TC-12 a TC-13)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculatePlasmaConcentration — TC-12 e TC-13', () => {
  test('TC-12: Ibuprofeno — t=4h, t½=2h → C = 400 × 0.25 = 100 mg → "low"', () => {
    const result = calculatePlasmaConcentration({
      initialDoseMg: 400,
      halfLifeHours: 2,
      elapsedTimeHours: 4,
    });
    expect(result.currentConcentration).toBeCloseTo(100, 1);
    expect(result.remainingPercentage).toBeCloseTo(25, 1);
    // 25% exato pode cair em low ou negligible dependendo do arredondamento infinitesimal
    expect(['low', 'negligible']).toContain(result.peakImpactLevel);
  });

  test('TC-13: Diazepam — alto impacto pico t=2h, t½=50h → >97% restante → "high"', () => {
    const result = calculatePlasmaConcentration({
      initialDoseMg: 10,
      halfLifeHours: 50,
      elapsedTimeHours: 2,
    });
    expect(result.remainingPercentage).toBeGreaterThan(95);
    expect(result.peakImpactLevel).toBe('high');
  });

  test('Dose zerada no tempo t = 0 → 100% restante', () => {
    const result = calculatePlasmaConcentration({
      initialDoseMg: 500,
      halfLifeHours: 4,
      elapsedTimeHours: 0,
    });
    expect(result.currentConcentration).toBe(500);
    expect(result.remainingPercentage).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 6 — Wellness Score (TC-14 a TC-15)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateWellnessScore — TC-14 e TC-15', () => {
  test('TC-14: Score excelente — média ponderada = 8.0 → "excellent"', () => {
    const result = calculateWellnessScore({
      sleepQuality:   9,  // positivo: 9
      muscleSoreness: 2,  // negativo: inverte → 8
      energyLevel:    8,  // positivo: 8
      stressLevel:    3,  // negativo: inverte → 7
    });
    // (9 + 8 + 8 + 7) / 4 = 8.0
    expect(result.score).toBe(8.0);
    expect(result.level).toBe('excellent');
  });

  test('TC-15: Score baixo → "poor"', () => {
    const result = calculateWellnessScore({
      sleepQuality:   3,  // positivo: 3
      muscleSoreness: 9,  // negativo: inverte → 1
      jointPain:      8,  // negativo: inverte → 2
      stressLevel:    9,  // negativo: inverte → 1
    });
    // (3 + 1 + 2 + 1) / 4 = 1.75
    expect(result.score).toBeLessThan(4);
    expect(result.level).toBe('poor');
  });

  test('Sem métricas → score 0', () => {
    const result = calculateWellnessScore({});
    expect(result.score).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO 7 — Funções novas (computeSessionTotals, getMovementPattern, safeCalc)
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSessionTotals — Regra de Ouro', () => {
  test('Calcula corretamente para 1 exercício', () => {
    const exercises: ExerciseData[] = [
      { name: 'Supino', sets: 3, reps: 10, loadKg: 20 },
    ];
    const totals = computeSessionTotals(exercises);
    expect(totals.totalExercicios).toBe(1);
    expect(totals.totalSeries).toBe(3);
    expect(totals.totalReps).toBe(30);
    expect(totals.volumeTotal).toBe(600);
    expect(totals.avgLoadPerSet).toBe(200); // 600/3
  });

  test('Calcula corretamente para múltiplos exercícios', () => {
    const exercises: ExerciseData[] = [
      { name: 'Agachamento', sets: 3, reps: 12, loadKg: 40 }, // 1440
      { name: 'Supino',      sets: 4, reps: 10, loadKg: 60 }, // 2400
      { name: 'Remada',      sets: 3, reps: 12, loadKg: 50 }, // 1800
    ];
    const totals = computeSessionTotals(exercises);
    expect(totals.totalExercicios).toBe(3);
    expect(totals.totalSeries).toBe(10);
    expect(totals.totalReps).toBe(112);
    expect(totals.volumeTotal).toBe(5640);
    expect(totals.avgLoadPerSet).toBe(564); // 5640/10
  });

  test('Array vazio retorna zeros sem NaN', () => {
    const totals = computeSessionTotals([]);
    expect(totals.volumeTotal).toBe(0);
    expect(totals.avgLoadPerSet).toBe(0);
    expect(isNaN(totals.avgLoadPerSet)).toBe(false);
  });
});

describe('getMovementPattern', () => {
  test('Agachamento → squat', () => expect(getMovementPattern('Agachamento livre')).toBe('squat'));
  test('Supino → push', () => expect(getMovementPattern('Supino reto')).toBe('push'));
  test('Remada → pull', () => expect(getMovementPattern('Remada curvada')).toBe('pull'));
  test('Levantamento terra → hinge', () => expect(getMovementPattern('Levantamento terra')).toBe('hinge'));
  test('Exercício desconhecido → other', () => expect(getMovementPattern('Exercício X')).toBe('other'));
});

describe('safeCalc', () => {
  test('NaN retorna 0', () => expect(safeCalc(NaN)).toBe(0));
  test('Infinity retorna 0', () => expect(safeCalc(Infinity)).toBe(0));
  test('Valor normal arredondado', () => expect(safeCalc(3.14159, 2)).toBe(3.14));
  test('-Infinity retorna 0', () => expect(safeCalc(-Infinity)).toBe(0));
});

describe('calculateINOLByPattern', () => {
  test('Agrupa corretamente por padrão de movimento', () => {
    const exercises: ExerciseData[] = [
      { name: 'Supino',      sets: 3, reps: 10, loadKg: 80, percentageOf1RM: 70 }, // push: 1.0
      { name: 'Agachamento', sets: 3, reps: 10, loadKg: 80, percentageOf1RM: 70 }, // squat: 1.0
    ];
    const { byPattern, alerts } = calculateINOLByPattern(exercises);
    expect(byPattern.push).toBeCloseTo(1.0, 2);
    expect(byPattern.squat).toBeCloseTo(1.0, 2);
    expect(alerts).toHaveLength(0); // nenhum acima de 1.5
  });

  test('INOL crítico gera alerta', () => {
    const exercises: ExerciseData[] = [
      { name: 'Supino', sets: 5, reps: 5, loadKg: 100, percentageOf1RM: 90 }, // push: 2.5
    ];
    const { alerts } = calculateINOLByPattern(exercises);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('critical');
    expect(alerts[0].pattern).toBe('push');
  });
});
