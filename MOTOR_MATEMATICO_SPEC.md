# Nexus Core — Especificação Técnica do Motor Matemático
**Versão:** 1.0  
**Data:** 2026-03-18  
**Arquivo de implementação:** [`src/lib/math-engine.ts`](src/lib/math-engine.ts)  
**Documento base:** [`QUANTIFICACAO_TREINOS.md`](QUANTIFICACAO_TREINOS.md)

---

## Sumário

1. [Visão Geral e Propósito](#1-visão-geral-e-propósito)
2. [Arquitetura do Motor](#2-arquitetura-do-motor)
3. [Módulo 1 — Registrar Treino (Parser + Métricas)](#3-módulo-1--registrar-treino-parser--métricas)
4. [Módulo 2 — Métricas de Carga (INOL e ACWR)](#4-módulo-2--métricas-de-carga-inol-e-acwr)
5. [Módulo 3 — Farmacocinética (Plasma Engine)](#5-módulo-3--farmacocinética-plasma-engine)
6. [Módulo 4 — Wellness Score](#6-módulo-4--wellness-score)
7. [Módulo 5 — Análise de Biomarcadores](#7-módulo-5--análise-de-biomarcadores)
8. [Módulo 6 — Saída em Linguagem Natural](#8-módulo-6--saída-em-linguagem-natural)
9. [Estrutura de Armazenamento](#9-estrutura-de-armazenamento)
10. [Integração entre Módulos](#10-integração-entre-módulos)
11. [Validações de Consistência](#11-validações-de-consistência)
12. [Casos de Teste e Exemplos Práticos](#12-casos-de-teste-e-exemplos-práticos)
13. [Formatos de Saída Padronizados](#13-formatos-de-saída-padronizados)
14. [Procedimentos de Verificação de Precisão](#14-procedimentos-de-verificação-de-precisão)

---

## 1. Visão Geral e Propósito

O **Motor Matemático** do Nexus Core é o núcleo de computação que traduz dados brutos de treinamento, biomarcadores e farmacocinética em métricas quantitativas interpretáveis por IA clínica e profissionais de saúde.

### Responsabilidades Primárias

| Responsabilidade | Função no Motor |
|---|---|
| Quantificar o treino em texto livre | Parser → Tonagem, Séries, Repetições |
| Medir carga aguda e crônica |算法 INOL + ACWR |
| Modelar efeito medicamentoso | Decaimento Farmacocinético (Plasma Engine) |
| Avaliar prontidão subjetiva | Wellness Score composto |
| Interpretar exames laboratoriais | Análise de Biomarcadores |
| Gerar saídas para IA e WhatsApp | Parser de Linguagem Natural |

### Princípio de Ouro
> **Todos os totais de treino são recalculados pelo backend**, independentemente do cálculo feito no front-end. Isso garante integridade dos dados e elimina divergências entre o que foi exibido e o que foi persistido.

---

## 2. Arquitetura do Motor

```
Entrada de Dados Brutos
    │
    ├── Texto Livre (treino) ──────────────► [Parser de Treino]
    │                                              │
    ├── %1RM por exercício ───────────────► [Calculadora INOL]
    │                                              │
    ├── Tonagem histórica (semanas) ───────► [Calculadora ACWR]
    │                                              │
    ├── Parâmetros de medicação ────────── ► [Plasma Engine]
    │                                              │
    ├── Métricas subjetivas diárias ──────► [Wellness Score]
    │                                              │
    └── Valores laboratoriais ─────────── ► [Analisador de Biomarcadores]
                                                   │
                                         [Agregador de Resultados]
                                                   │
                              ┌────────────────────┤
                              │                    │
                    [Dashboard API]    [Parser Linguagem Natural]
                              │                    │
                        [Supabase DB]          [WhatsApp/IA]
```

---

## 3. Módulo 1 — Registrar Treino (Parser + Métricas)

> **Deficiência identificada no documento base:** A seção "Registrar Treino" estava limitada ao parsing textual, sem especificar métricas derivadas, validações de entrada, estrutura de armazenamento dos resultados calculados ou algoritmos de densidade/intensidade.

### 3.1. Interface de Entrada

```typescript
interface ExerciseData {
  name: string;          // Nome do exercício (obrigatório)
  sets: number;          // Quantidade de séries (int >= 1)
  reps: number;          // Repetições por série (int >= 1)
  loadKg: number;        // Carga em kg (float >= 0)
  percentageOf1RM?: number; // % do 1RM para INOL (0–99.9)
}

interface WorkoutSessionInput {
  userId: string;
  sessionDate: Date;
  sessionType: 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'recovery';
  exercises: ExerciseData[];
  notes?: string;
}
```

### 3.2. Formatos de Texto Aceitos pelo Parser

O parser aceita dois estilos de entrada:

#### Estilo A — Nome em linha separada
```
Agachamento livre
1x12x40kg
1x10x50kg
1x8x60kg
```

#### Estilo B — Nome e séries na mesma linha
```
Supino 3x12 com 80kg
Remada 4 séries de 10 com 60kg
Supino inclinado: 3x12x20kg, 1x10x20kg, 1x8x20kg
```

#### Regex Master para Reconhecimento de Série
```
/(\d+)\s*[xX×]\s*(\d+(?:\/\d+)?)\s*(?:[xX×]|-|com\s+)?\s*(\d+(?:[,\.]\d+)?)\s*kg/i
```

**Grupos capturados:**
- Grupo 1: `sets` (número de séries)
- Grupo 2: `reps` (pode conter `/` para bilateral)
- Grupo 3: `weight` (aceita vírgula e ponto como separador decimal)

### 3.3. Regra de Reps Compostas (Bilateral/Unilateral)

Quando `reps` contém `/`, interpreta-se como **soma dos lados**:

```
"10/10" → repsNum = 10 + 10 = 20
"12/12" → repsNum = 24
"8/6"   → repsNum = 14  (assimétrico — deve ser sinalizado como warning)
```

**Regra de validação:** Se a divisão for muito assimétrica (ratio > 1.5), emitir warning de assimetria muscular.

### 3.4. Fórmulas de Cálculo — Nível de Série (Set Detail)

| Métrica | Fórmula | Unidade |
|---|---|---|
| Volume do Set | `sets × repsNum × loadKg` | kg |
| Repetições do Set | `sets × repsNum` | reps |
| Densidade do Set | `volume / sets` | kg/série |

**Algoritmo em pseudocódigo:**
```
Para cada linha de série reconhecida:
  sets    := parseInt(grupo1)
  reps    := parseReps(grupo2)        # Resolve "10/10" → 20
  weight  := parseFloat(grupo3)       # Resolve "57,5" → 57.5
  volume  := sets * reps * weight
  repsNum := sets * reps              # Para totalReps do treino
```

### 3.5. Fórmulas de Cálculo — Nível de Exercício

```
totalSets (exercício)   = Σ sets de cada detalhe
totalReps (exercício)   = Σ (sets × repsNum) de cada detalhe
totalVolume (exercício) = Σ volume de cada detalhe
avgLoadPerSet           = totalVolume / totalSets
```

### 3.6. Fórmulas de Cálculo — Nível de Sessão (Treino Completo)

```
total_exercicios  = count(exercícios distintos)
total_series      = Σ totalSets de todos os exercícios
total_repeticoes  = Σ totalReps de todos os exercícios
volume_total      = Σ totalVolume de todos os exercícios
avg_load_session  = volume_total / total_series
session_density   = volume_total / duration_minutes  (se duration fornecida)
```

### 3.7. Métricas de Desempenho Derivadas (Novas)

Estas métricas devem ser calculadas no momento do registro e armazenadas na tabela `training_sessions`:

#### Índice de Progressão de Carga (IPC)
```
IPC = (volume_total_sessao_atual - volume_total_ultima_sessao_mesma_categoria) 
      / volume_total_ultima_sessao_mesma_categoria × 100
```
- Positivo: progressão de carga
- Negativo: regressão (pode ser intencional em semana de deload)
- Zero ou nulo: primeira sessão ou sem histórico

#### Índice de Densidade Relativa (IDR)
```
IDR = volume_total / total_series
```
- Representa a carga média por série
- Permite comparar sessões com volumes totais equivalentes mas intensidades diferentes

#### Índice de Fadiga Acumulada (IFA)
```
IFA = ΣINOL_por_padrao_movimento
```
- Agrupa exercícios por padrão de movimento (push, pull, hinge, squat, carry)
- Cada grupo não deve exceder INOL 2.0 por sessão

### 3.8. Validações de Consistência dos Dados de Treino

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: 'REQUIRED' | 'OUT_OF_RANGE' | 'INVALID_FORMAT' | 'LOGIC_ERROR';
}

interface ValidationWarning {
  field: string;
  message: string;
  code: 'ASYMMETRY' | 'HIGH_VOLUME' | 'HIGH_INTENSITY' | 'SUSPICIOUS_LOAD';
}
```

#### Regras de Validação — Nível Crítico (bloqueiam salvamento):

| Campo | Regra | Código |
|---|---|---|
| `sets` | `sets >= 1 AND sets <= 20` | `OUT_OF_RANGE` |
| `reps` | `repsNum >= 1 AND repsNum <= 200` | `OUT_OF_RANGE` |
| `loadKg` | `loadKg >= 0 AND loadKg <= 1000` | `OUT_OF_RANGE` |
| `name` | `name.length >= 3 AND name.length <= 150` | `OUT_OF_RANGE` |
| `percentageOf1RM` | `value > 0 AND value < 100` | `OUT_OF_RANGE` |
| `sessionDate` | `sessionDate <= now() + 24h` | `LOGIC_ERROR` |
| exercícios | `count >= 1 AND count <= 30` | `OUT_OF_RANGE` |

#### Regras de Validação — Nível Warning (alertam mas permitem salvar):

| Condição | Warning | Código |
|---|---|---|
| `volume_total > 50.000 kg` | "Volume extremamente alto. Confirme os dados." | `HIGH_VOLUME` |
| `reps assimetria > 1.5` | "Assimetria unilateral detectada. Verifique o lado fraco." | `ASYMMETRY` |
| `loadKg > 300 kg` por série | "Carga muito alta. Confirme o peso informado." | `SUSPICIOUS_LOAD` |
| `INOLtotal > 2.0` | "INOL elevado. Risco de sobrecarga do SNC." | `HIGH_INTENSITY` |
| `total_series > 50` | "Número de séries alto. Sessão muito longa?" | `HIGH_VOLUME` |

### 3.9. Estrutura de Armazenamento dos Resultados

Os resultados calculados são persistidos na tabela `training_sessions` com a seguinte estrutura de campos computados:

```sql
-- Campos calculados e armazenados na tabela training_sessions
ALTER TABLE training_sessions ADD COLUMN IF NOT EXISTS
  total_exercicios    INTEGER,          -- count dos exercícios
  total_series        INTEGER,          -- Σ sets
  total_repeticoes    INTEGER,          -- Σ (sets × repsNum)
  volume_total        DECIMAL(12,2),    -- Σ (sets × reps × kg)
  inol_score          DECIMAL(8,3),     -- INOL total da sessão
  avg_load_per_set    DECIMAL(8,2),     -- volume_total / total_series
  ipc_percent         DECIMAL(8,2),     -- Índice de Progressão de Carga
  session_density     DECIMAL(8,2),     -- volume/minuto (se duration disponível)
  exercises_json      JSONB             -- snapshot estruturado dos exercícios
```

**Formato do `exercises_json`:**
```json
[
  {
    "name": "Agachamento Livre",
    "movement_pattern": "squat",
    "totalSets": 3,
    "totalReps": 30,
    "totalVolume": 3600,
    "avgLoad": 40.0,
    "inol": 0.6,
    "details": [
      { "sets": 1, "reps": 12, "weight": 40, "volume": 480 },
      { "sets": 1, "reps": 10, "weight": 50, "volume": 500 },
      { "sets": 1, "reps": 8,  "weight": 60, "volume": 480 }
    ]
  }
]
```

---

## 4. Módulo 2 — Métricas de Carga (INOL e ACWR)

### 4.1. INOL — Intensity Number of Lifts

**Propósito:** Quantificar o desgaste do Sistema Nervoso Central (SNC), combinando volume e intensidade relativa ao 1RM.

#### Fórmula

```
INOL (por exercício) = (sets × reps) / (100 - %1RM)
```

**Parâmetros de entrada:**
- `sets`: número de séries (int)
- `reps`: repetições por série (int, já resolvido bilateral)
- `%1RM`: porcentagem do 1RM usado (float, 1–99)

**Parâmetros de saída:**
```typescript
{
  total: number;           // INOL somado de todos os exercícios (3 casas decimais)
  byExercise: Array<{
    name: string;
    inol: number;          // INOL individual (3 casas decimais)
  }>;
}
```

#### Tabela de Interpretação do INOL

| INOL (por padrão de movimento/dia) | Interpretação | Ação Recomendada |
|---|---|---|
| `< 0.4` | Volume muito baixo | Considerar aumento progressivo |
| `0.4 – 0.9` | Zona ótima | Manter — estímulo adequado |
| `1.0 – 1.5` | Volume elevado | Monitorar fadiga |
| `> 1.5` | **Ativar mitigação de volume** | Reduzir volume imediatamente |
| `> 2.0` | **Nível crítico** | Suspender treino pendente do dia |

#### Agrupamento por Padrão de Movimento

```typescript
const movementPatterns: Record<string, string[]> = {
  'squat':  ['agachamento', 'leg press', 'hack squat', 'búlgaro'],
  'hinge':  ['levantamento terra', 'stiff', 'hip thrust', 'deadlift'],
  'push':   ['supino', 'desenvolvimento', 'pushup', 'triceps'],
  'pull':   ['remada', 'pull-up', 'pulldown', 'rosca', 'biceps'],
  'carry':  ['farmer walk', 'loaded carry', 'zercher carry']
};
```

Para validação de INOL, a comparação deve ser feita por **grupo de movimento**, não pelo exercício isolado.

### 4.2. ACWR — Acute:Chronic Workload Ratio

**Propósito:** Monitorar o risco de lesão comparando carga aguda (semana atual) com carga crônica (média das 4 semanas anteriores).

#### Fórmula

```
ACWR = Carga Aguda (semana atual)
       ─────────────────────────────────────────
       Média de Carga das n Semanas Anteriores
       (n = min(4, semanas disponíveis))
```

**Parâmetros de entrada:**
```typescript
calculateACWR(
  currentWeekTonnage: number,      // Tonagem total da semana atual (kg)
  previousWeeksTonnage: number[]   // Array de tonagens das semanas anteriores
): ACWRResult
```

**Parâmetros de saída:**
```typescript
interface ACWRResult {
  ratio: number;                    // Razão agudo:crônico (2 casas decimais)
  riskLevel: ACWRRiskLevel;         // Classificação de risco
  interpretation: string;           // Texto explicativo
}

type ACWRRiskLevel = 
  | 'undertraining'  // ratio < 0.8
  | 'safe'           // 0.8 ≤ ratio ≤ 1.0
  | 'moderate'       // 1.0 < ratio ≤ 1.3
  | 'high'           // 1.3 < ratio ≤ 1.5
  | 'very_high';     // ratio > 1.5
```

#### Tabela de Risco ACWR

| Ratio ACWR | `riskLevel` | Ação do Sistema |
|---|---|---|
| `< 0.8` | `undertraining` | Notificar possível destreinamento |
| `0.8 – 1.0` | `safe` | Nenhuma ação — continuar |
| `1.0 – 1.3` | `moderate` | Alerta amarelo no dashboard |
| `1.3 – 1.5` | `high` | Alerta laranja — reduzir 10–15% |
| `> 1.5` | `very_high` | **ALERTA VERMELHO** — risco exponencial de ruptura de tendão |

#### Tratamento de Edge Cases

```
Se previousWeeksTonnage.length === 0:
  chronicWorkload = currentWeekTonnage  → ratio = 1.0 (neutro)

Se chronicWorkload === 0:
  ratio = 1.0 (evitar divisão por zero)

Se previousWeeksTonnage.length < 4:
  Usar a média com os dados disponíveis (sem penalizar)
  Emitir warning: "ACWR calculado com {n} semana(s) — base crônica insuficiente"
```

---

## 5. Módulo 3 — Farmacocinética (Plasma Engine)

**Propósito:** Modelar a concentração plasmática de substâncias ao longo do tempo para evitar conflitos entre picos medicamentosos e períodos de esforço máximo.

### 5.1. Modelo de Decaimento Exponencial

```
C(t) = C₀ × (½)^(t / t½)
```

Onde:
- `C(t)` = Concentração no tempo `t` (mg)
- `C₀` = Dose inicial (mg)
- `t` = Tempo decorrido desde a administração (horas)
- `t½` = Meia-vida da substância (horas)

### 5.2. Parâmetros de Entrada

```typescript
interface PharmacokineticsParams {
  initialDoseMg: number;      // Dose administrada (mg > 0)
  halfLifeHours: number;      // Meia-vida em horas (h > 0)
  elapsedTimeHours: number;   // Tempo decorrido (h >= 0)
}
```

### 5.3. Parâmetros de Saída

```typescript
interface PlasmaResult {
  currentConcentration: number;    // Concentração atual em mg (2 casas decimais)
  remainingPercentage: number;     // % da dose original ainda ativa (2 casas decimais)
  timeToClear: number;             // Horas para eliminação completa (5 × t½ − t)
  peakImpactLevel: ImpactLevel;    // Classificação do impacto na performance
}

type ImpactLevel = 'high' | 'moderate' | 'low' | 'negligible';
```

### 5.4. Tabela de Classificação de Impacto

| `remainingPercentage` | `peakImpactLevel` | Efeito no Treino |
|---|---|---|
| `> 75%` | `high` | Bloquear treinos de força máxima |
| `50–75%` | `moderate` | Reduzir intensidade em 10–15% |
| `25–50%` | `low` | Monitorar — continuação permitida |
| `< 25%` | `negligible` | Nenhum impacto significativo |

### 5.5. Meia-Vidas de Referência (Tabela de Substâncias)

| Substância | Meia-vida (h) | Tipo | Efeito no treino |
|---|---|---|---|
| Diazepam | 20–100 | Sedativo | Reduz coordenação motora fina |
| Alprazolam | 6–26 | Ansiolítico | Reduz contratilidade |
| Ibuprofeno | 1.8–2 | Anti-inflamatório | Atenção à analgesia (mascara dor) |
| Paracetamol | 2–3 | Analgésico | Baixo impacto motor |
| Metilfenidato | 2–4 | Estimulante | Pode aumentar pressão arterial |
| Betabloqueadores | 6–22 | Anti-hipertensivo | Limita FC máxima |

### 5.6. Decisão de Habilitação de Treino

```typescript
canPerformMaxStrengthWork(pharmacokineticsResults): {
  canPerform: boolean;
  reason: string;
  recommendations: string[];
}
```

**Regra de decisão:**
- Se qualquer substância classificada como `medication` tem `peakImpactLevel === 'high'` → `canPerform = false`
- Se qualquer substância tem `peakImpactLevel === 'moderate'` → `canPerform = true` com recomendações de redução
- Caso contrário → `canPerform = true` sem restrições

---

## 6. Módulo 4 — Wellness Score

**Propósito:** Agregar métricas subjetivas diárias em uma pontuação única de prontidão para o treino.

### 6.1. Parâmetros de Entrada

```typescript
interface WellnessMetrics {
  sleepQuality?: number;      // Qualidade do sono (1–10, maior = melhor)
  muscleSoreness?: number;    // Dor muscular (1–10, maior = pior → INVERTIDO)
  jointPain?: number;         // Dor articular (1–10, maior = pior → INVERTIDO)
  energyLevel?: number;       // Nível de energia (1–10, maior = melhor)
  mentalState?: number;       // Estado mental (1–10, maior = melhor)
  stressLevel?: number;       // Nível de estresse (1–10, maior = pior → INVERTIDO)
}
```

### 6.2. Algoritmo de Cálculo

```
1. Para cada métrica com valor informado:
   - Se campo negativo (muscleSoreness, jointPain, stressLevel):
     valor_normalizado = 10 - valor_original   # Inversão
   - Caso contrário:
     valor_normalizado = valor_original

2. wellness_score = média aritmética dos valores normalizados

3. Classificação:
   score >= 8.0 → 'excellent'
   score >= 6.0 → 'good'
   score >= 4.0 → 'moderate'
   score < 4.0  → 'poor'
```

### 6.3. Parâmetros de Saída

```typescript
interface WellnessResult {
  score: number;                              // Pontuação 0–10 (1 casa decimal)
  level: 'excellent' | 'good' | 'moderate' | 'poor';
}
```

### 6.4. Tabela de Decisão por Wellness Score

| Score | Classificação | Recomendação de Treino |
|---|---|---|
| `8.0–10.0` | `excellent` | Treino de alta intensidade liberado |
| `6.0–7.9` | `good` | Treino normal — monitorar |
| `4.0–5.9` | `moderate` | Reduzir intensidade 15–20% |
| `< 4.0` | `poor` | Sessão regenerativa ou descanso |

---

## 7. Módulo 5 — Análise de Biomarcadores

**Propósito:** Interpretar automaticamente exames laboratoriais e emitir alertas clínicos com recomendações de ajuste de treino.

### 7.1. Parâmetros de Entrada

```typescript
analyzeBiomarkers(biomarkers: Record<string, number>): BiomarkerAnalysis
```

**Chaves esperadas (snake_case):**

| Chave | Descrição | Unidade |
|---|---|---|
| `CPK_UL` | Creatinofosfoquinase | U/L |
| `Phase_Angle` | Ângulo de fase (BIA) | graus |
| `HbA1c_percent` | Hemoglobina glicada | % |
| `Cortisol_mcg_dL` | Cortisol matinal | mcg/dL |
| `Testosterone_ng_dL` | Testosterona total | ng/dL |
| `Ferritin_ng_mL` | Ferritina sérica | ng/mL |
| `VitD_ng_mL` | Vitamina D | ng/mL |

### 7.2. Tabela de Limiares por Biomarcador

#### CPK (Dano Muscular)

| CPK (U/L) | Severidade | Mensagem | Ação |
|---|---|---|---|
| `<= 200` | Normal | — | Nenhuma |
| `201–300` | `info` | Leve elevação pós-treino | Monitorar |
| `301–500` | `info` | Dano moderado | Monitorar evolução |
| `501–1000` | `warning` | Dano significativo | Reduzir volume 3–5 dias |
| `> 1000` | **`critical`** | **RABDOMIÓLISE POTENCIAL** | **Suspender treino + avaliação médica** |

#### Ângulo de Fase (Integridade Celular)

| Fase (graus) | Severidade | Mensagem | Ação |
|---|---|---|---|
| `>= 6.5` | `info` | Integridade celular excelente | Manter estratégia |
| `5.0–6.4` | Normal | — | Nenhuma |
| `4.5–4.9` | `warning` | Integridade reduzida | Aumentar proteína + foco em recuperação |
| `< 4.5` | **`critical`** | **DEGRADAÇÃO CELULAR** | **Sessões regenerativas + avaliação médica** |

#### HbA1c (Controle Glicêmico)

| HbA1c (%) | Severidade | Classificação |
|---|---|---|
| `< 5.7` | Normal | Sem restrições |
| `5.7–6.4` | `warning` | Pré-diabetes |
| `>= 6.5` | **`critical`** | Diabetes — avaliação urgente |

#### Cortisol Matinal

| Cortisol (mcg/dL) | Severidade | Mensagem |
|---|---|---|
| `6–23` | Normal | Nenhuma |
| `> 25` | `warning` | Estresse elevado — reduzir volume |
| `< 5` | `warning` | Possível insuficiência adrenal |

### 7.3. Parâmetros de Saída

```typescript
interface BiomarkerAnalysis {
  overallStatus: 'optimal' | 'attention' | 'concern';
  alerts: Array<{
    biomarker: string;
    value: number;
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  recommendations: string[];
}
```

**Lógica de `overallStatus`:**
```
Se count(critical) > 0  → 'concern'
Se count(warning) > 0   → 'attention'
Caso contrário           → 'optimal'
```

---

## 8. Módulo 6 — Saída em Linguagem Natural

**Propósito:** Converter métricas numéricas em texto humanizado para envio via WhatsApp e consumo pela IA clínica.

### 8.1. Parâmetros de Entrada

```typescript
parseMetricsToNaturalLanguage(metrics: {
  totalTonnage?: number;           // Tonagem total (kg)
  tonnageChangePercent?: number;   // Variação percentual vs. semana anterior
  acwrRatio?: number;              // Ratio ACWR
  acwrRiskLevel?: string;          // Classificação de risco
  phaseAngle?: number;             // Ângulo de fase (graus)
  cpkLevel?: number;               // CPK (U/L)
  wellnessScore?: number;          // Score 0–10
}): string
```

### 8.2. Formato de Saída Padrão

```
📊 Tonagem total: 12.450 kg (+8.3%)
⚖️ ACWR em 1.1 (moderate)
🧬 Ângulo de fase: 6.2° (Integridade Celular Excelente)
💪 CPK: 187 U/L (Normal)
😊 Wellness Score: 7.8/10 (Bom)
```

---

## 9. Estrutura de Armazenamento

### 9.1. Tabela `training_sessions`

```sql
CREATE TABLE training_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id),
  session_date        TIMESTAMPTZ NOT NULL,
  session_type        TEXT CHECK (session_type IN ('strength','hypertrophy','endurance','power','recovery')),
  
  -- Métricas calculadas pelo Motor Matemático
  total_exercicios    INTEGER       DEFAULT 0,
  total_series        INTEGER       DEFAULT 0,
  total_repeticoes    INTEGER       DEFAULT 0,
  volume_total        DECIMAL(12,2) DEFAULT 0,
  inol_score          DECIMAL(8,3),
  avg_load_per_set    DECIMAL(8,2),
  ipc_percent         DECIMAL(8,2),   -- Progressão vs. última sessão
  
  -- Snapshot estruturado
  exercises_json      JSONB,
  
  -- Metadados
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);
```

### 9.2. Regra de Recálculo no Backend (Regra de Ouro)

```typescript
// Na API POST /api/users/[id]/sessions
function computeSessionTotals(exercises: ExerciseData[]): SessionTotals {
  let total_exercicios = exercises.length;
  let total_series = 0;
  let total_repeticoes = 0;
  let volume_total = 0;

  for (const ex of exercises) {
    total_series    += ex.sets;
    total_repeticoes += ex.sets * ex.reps;
    volume_total    += ex.sets * ex.reps * ex.loadKg;
  }

  const avg_load_per_set = total_series > 0 ? volume_total / total_series : 0;

  return {
    total_exercicios,
    total_series,
    total_repeticoes,
    volume_total: Number(volume_total.toFixed(2)),
    avg_load_per_set: Number(avg_load_per_set.toFixed(2))
  };
}
```

---

## 10. Integração entre Módulos

```
POST /api/users/[id]/sessions (Registrar Sessão)
     │
     ├─ [1] Parser de Treino → ExerciseData[]
     │        └─ Validações de consistência
     │
     ├─ [2] calculateTonnage(exercises) → volume_total
     │
     ├─ [3] calculateINOL(exercises) → inol_score, by_exercise
     │
     ├─ [4] Persistência no Supabase (training_sessions)
     │
     └─ [5] Trigger de Atualização ACWR
              └─ Busca histórico das 4 semanas anteriores
              └─ calculateACWR(current, previous[]) → acwr_result
              └─ Atualiza dashboard cache


GET /api/users/[id]/dashboard (Dashboard Consolidado)
     │
     ├─ Dados de training_sessions (últimas 28 sessões)
     ├─ Dados de biomarker_logs (último registro)
     ├─ Dados de daily_readiness (último registro)
     ├─ Dados de pharmacology_logs (últimas 5 administrações)
     │
     ├─ calculateACWR(currentWeek, previousWeeks[])
     ├─ analyzeBiomarkers(biomarkersParsed)
     ├─ calculateWellnessScore(readiness metrics)
     ├─ [Para cada medicação] calculatePlasmaConcentration(params)
     ├─ canPerformMaxStrengthWork(plasmaResults)
     │
     └─ parseMetricsToNaturalLanguage(allMetrics) → WhatsApp/IA output
```

---

## 11. Validações de Consistência

### 11.1. Validações de Entrada — `validateExerciseData()`

```typescript
function validateExerciseData(ex: ExerciseData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // --- Erros Críticos ---
  if (!ex.name || ex.name.trim().length < 3)
    errors.push({ field: 'name', code: 'REQUIRED', message: 'Nome do exercício é obrigatório (min. 3 caracteres)' });

  if (ex.sets < 1 || ex.sets > 20)
    errors.push({ field: 'sets', code: 'OUT_OF_RANGE', message: 'Séries devem estar entre 1 e 20' });

  if (ex.reps < 1 || ex.reps > 200)
    errors.push({ field: 'reps', code: 'OUT_OF_RANGE', message: 'Repetições devem estar entre 1 e 200' });

  if (ex.loadKg < 0 || ex.loadKg > 1000)
    errors.push({ field: 'loadKg', code: 'OUT_OF_RANGE', message: 'Carga deve estar entre 0 e 1000 kg' });

  if (ex.percentageOf1RM !== undefined && (ex.percentageOf1RM <= 0 || ex.percentageOf1RM >= 100))
    errors.push({ field: 'percentageOf1RM', code: 'OUT_OF_RANGE', message: '%1RM deve estar entre 1 e 99' });

  // --- Warnings ---
  if (ex.loadKg > 300)
    warnings.push({ field: 'loadKg', code: 'SUSPICIOUS_LOAD', message: 'Carga superior a 300kg. Confirme o valor.' });

  const volume = ex.sets * ex.reps * ex.loadKg;
  if (volume > 10000)
    warnings.push({ field: 'volume', code: 'HIGH_VOLUME', message: 'Volume por exercício muito alto. Confirme os dados.' });

  return { isValid: errors.length === 0, errors, warnings };
}
```

### 11.2. Validações de Integridade da Sessão

```typescript
function validateSession(session: WorkoutSessionInput): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const now = new Date();
  const futureLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (session.sessionDate > futureLimit)
    errors.push({ field: 'sessionDate', code: 'LOGIC_ERROR', message: 'Data da sessão não pode ser mais de 24h no futuro' });

  if (session.exercises.length === 0)
    errors.push({ field: 'exercises', code: 'REQUIRED', message: 'A sessão deve ter ao menos 1 exercício' });

  if (session.exercises.length > 30)
    errors.push({ field: 'exercises', code: 'OUT_OF_RANGE', message: 'Máximo de 30 exercícios por sessão' });

  const totalSeries = session.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  if (totalSeries > 50)
    warnings.push({ field: 'total_series', code: 'HIGH_VOLUME', message: `${totalSeries} séries detectadas. Sessão muito longa?` });

  return { isValid: errors.length === 0, errors, warnings };
}
```

---

## 12. Casos de Teste e Exemplos Práticos

### 12.1. Casos de Teste — Tonagem e Parser

#### TC-01: Série simples
```
Input:  [{ name: "Supino", sets: 3, reps: 10, loadKg: 20 }]
Output: volume = 3 × 10 × 20 = 600 kg ✓
```

#### TC-02: Reps unilateral bilateral
```
Input:  "2x10/10x8kg"
Parser: sets=2, repsNum=20, weight=8
Output: volume = 2 × 20 × 8 = 320 kg ✓
        totalReps = 2 × 20 = 40 ✓
```

#### TC-03: Múltiplos exercícios — Tonagem Total
```
Agachamento: { sets:3, reps:12, loadKg:40 } → 1440 kg
Supino:      { sets:4, reps:10, loadKg:60 } → 2400 kg
Remada:      { sets:3, reps:12, loadKg:50 } → 1800 kg

volume_total = 1440 + 2400 + 1800 = 5640 kg ✓
total_series = 3 + 4 + 3 = 10 ✓
total_repeticoes = 36 + 40 + 36 = 112 ✓
avg_load_per_set = 5640 / 10 = 564 kg ✓
```

#### TC-04: Carga com vírgula decimal
```
Input:  "3x8x57,5kg"
Parser: weight = 57.5 (vírgula → ponto)
Output: volume = 3 × 8 × 57.5 = 1380 kg ✓
```

#### TC-05: Validação — Sets fora do range
```
Input:  { sets: 0, reps: 10, loadKg: 20 }
Output: ValidationError { field: 'sets', code: 'OUT_OF_RANGE' } ✓
```

### 12.2. Casos de Teste — INOL

#### TC-06: INOL normalidade
```
Input:  { sets: 3, reps: 10, percentageOf1RM: 70 }
INOL    = (3 × 10) / (100 - 70) = 30 / 30 = 1.000
Status:  'elevado — monitorar' ✓
```

#### TC-07: INOL zona ótima
```
Input:  { sets: 4, reps: 8, percentageOf1RM: 75 }
INOL    = (4 × 8) / (100 - 75) = 32 / 25 = 1.280
Status:  'volume elevado' ✓
```

#### TC-08: INOL crítico
```
Input:  { sets: 5, reps: 5, percentageOf1RM: 90 }
INOL    = (5 × 5) / (100 - 90) = 25 / 10 = 2.500
Status:  'nível crítico — suspender pendentes' ✓
```

### 12.3. Casos de Teste — ACWR

#### TC-09: Zona segura
```
currentWeek    = 10000 kg
previousWeeks  = [9500, 9800, 10200, 9700]  → média = 9800
ACWR           = 10000 / 9800 = 1.02
riskLevel      = 'moderate' ✓
```

#### TC-10: Risco muito alto
```
currentWeek    = 18000 kg
previousWeeks  = [9000, 9500, 8500, 10000] → média = 9250
ACWR           = 18000 / 9250 = 1.95
riskLevel      = 'very_high' → ALERTA VERMELHO ✓
```

#### TC-11: Sem histórico
```
currentWeek    = 5000 kg
previousWeeks  = []
chronicWorkload = currentWeekTonnage = 5000
ACWR            = 5000 / 5000 = 1.0
riskLevel       = 'safe' (neutro, sem penalização) ✓
```

### 12.4. Casos de Teste — Farmacocinética

#### TC-12: Decaimento Ibuprofen
```
Params: { initialDoseMg: 400, halfLifeHours: 2, elapsedTimeHours: 4 }
C(t)   = 400 × (0.5)^(4/2) = 400 × 0.25 = 100 mg
remaining = 25%
impact = 'low' ✓
```

#### TC-13: Diazepam pico alto
```
Params: { initialDoseMg: 10, halfLifeHours: 50, elapsedTimeHours: 2 }
C(t)   = 10 × (0.5)^(2/50) = 10 × 0.972 ≈ 9.73 mg
remaining = 97.3%
impact = 'high' → bloquear força máxima ✓
```

### 12.5. Casos de Teste — Wellness Score

#### TC-14: Score excelente
```
Input: { sleepQuality:9, muscleSoreness:2, energyLevel:8, stressLevel:3 }
Normalizados: [9, 8, 8, 7]  (muscleSoreness→8, stressLevel→7)
score = (9 + 8 + 8 + 7) / 4 = 8.0 → 'excellent' ✓
```

#### TC-15: Score baixo
```
Input: { sleepQuality:3, muscleSoreness:9, jointPain:8, stressLevel:9 }
Normalizados: [3, 1, 2, 1]
score = (3 + 1 + 2 + 1) / 4 = 1.75 → 'poor' ✓
```

---

## 13. Formatos de Saída Padronizados

### 13.1. Resposta da API de Dashboard

```json
{
  "user": { "id": "uuid", "name": "João" },
  "metrics": {
    "training": {
      "totalSessions": 12,
      "totalTonnage": 87450.25,
      "currentWeekTonnage": 18200.00,
      "avgINOL": 0.784,
      "acwr": {
        "ratio": 1.15,
        "riskLevel": "moderate",
        "interpretation": "Aumento moderado de carga. Monitorar resposta do atleta."
      }
    },
    "biomarkers": {
      "overallStatus": "attention",
      "alerts": [
        {
          "biomarker": "CPK",
          "value": 420,
          "severity": "info",
          "message": "Dano muscular moderado: CPK levemente elevado."
        }
      ],
      "recommendations": ["Monitorar evolução nos próximos dias"]
    },
    "readiness": {
      "wellnessScore": 7.2,
      "level": "good"
    },
    "plasma": [
      {
        "substanceName": "Ibuprofeno",
        "currentConcentration": 50.5,
        "remainingPercentage": 31.6,
        "peakImpactLevel": "low",
        "timeToClear": 7.5
      }
    ]
  },
  "overallStatus": "attention",
  "riskFactors": ["CPK moderado"],
  "canPerformMaxStrengthWork": true,
  "naturalLanguageSummary": "📊 Tonagem total: 18.200 kg (+4.2%)\n⚖️ ACWR em 1.2 (moderate)\n💪 CPK: 420 U/L (Moderado)\n😊 Wellness Score: 7.2/10 (Bom)"
}
```

### 13.2. Resposta de Validação de Treino

```json
{
  "isValid": false,
  "errors": [
    {
      "field": "sets",
      "code": "OUT_OF_RANGE",
      "message": "Séries devem estar entre 1 e 20"
    }
  ],
  "warnings": [
    {
      "field": "loadKg",
      "code": "SUSPICIOUS_LOAD",
      "message": "Carga superior a 300kg. Confirme o valor."
    }
  ]
}
```

---

## 14. Procedimentos de Verificação de Precisão

### 14.1. Testes Unitários Obrigatórios

Cada função do Motor Matemático deve ter testes unitários cobrindo:

| Função | Casos de Teste Mínimos |
|---|---|
| `calculateTonnage` | Array vazio, 1 exercício, múltiplos, carga zero |
| `calculateINOL` | Sem `%1RM`, valor limite (99%), INOL crítico |
| `calculateACWR` | Sem histórico, histórico parcial (<4 semanas), full |
| `calculatePlasmaConcentration` | t=0 (dose máxima), t>>5t½ (eliminação), C₀ zero |
| `calculateWellnessScore` | Apenas métricas positivas, apenas negativas, misto |
| `analyzeBiomarkers` | Sem biomarcadores, todos normais, todos críticos |
| Parser de reps | Simples, bilateral simétrico, bilateral assimétrico |

### 14.2. Verificação de Precisão Numérica

```typescript
// Todas as funções do Motor devem garantir:
// - Máximo de 3 casas decimais para ratios (INOL, ACWR)
// - Máximo de 2 casas decimais para pesos e volumes
// - Uso de Number().toFixed() antes de persistir
// - Nunca retornar NaN ou Infinity — usar valores de fallback (0, 1.0)

function safeCalc(value: number, decimals: number): number {
  if (!isFinite(value) || isNaN(value)) return 0;
  return Number(value.toFixed(decimals));
}
```

### 14.3. Conferência Manual (Auditoria)

Para conferência manual dos cálculos, execute os exemplos da seção 12 e valide as saídas contra as fórmulas documentadas nas seções 3–7.

**Ferramenta de auditoria sugerida:**
```bash
# Executar casos de teste do Motor Matemático
npx ts-node --project tsconfig.json src/lib/__tests__/math-engine.test.ts
```

---

*Documento gerado em 2026-03-18 — Nexus Core v1.0*
