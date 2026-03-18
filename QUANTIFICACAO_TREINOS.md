# Quantificação de Treinos (Flexi-Train)

Este documento explica como o Flexi-Train interpreta um treino em texto e como calcula as métricas de quantificação (séries, repetições e volume).

## 1. Conceitos e Métricas

- **Exercício**: um bloco nomeado (ex.: “Agachamento livre”) contendo uma ou mais linhas de séries.
- **Série (sets)**: quantidade de séries executadas em um “set” descrito (ex.: `3x12x20kg` → `sets = 3`).
- **Repetições (reps)**: repetições por série. Pode ser numérica (`12`) ou composta (`10/10`) para padrões unilaterais.
- **Carga (weight)**: peso informado (em kg). Aceita `57,5` e `57.5`.
- **Volume (tonelagem)**: métrica de carga total movimentada.
  - Fórmula base: `volume = sets * repsNum * weight`
  - Onde `repsNum` é o número de repetições convertido para número (ver regras do `10/10` abaixo).

## 2. Interpretação do Treino em Texto (Parser)

A interpretação do treino em texto é feita por [parseWorkoutTextModel](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L23-L174).

### 2.1. Pipeline de Leitura

1. **Normalização**: o texto é dividido por linhas e linhas vazias são removidas.
2. **Estado do “exercício atual”**: o parser mantém um `currentExercise` (nome + detalhes).  
   - Quando encontra um nome de exercício, inicia/atualiza `currentExercise`.
   - Quando encontra uma linha de séries, adiciona um detalhe ao `currentExercise`.
3. **Fechamento do exercício**: ao iniciar um novo exercício (ou ao finalizar o texto), o exercício anterior é “fechado” e tem seus totais calculados.

### 2.2. Formatos de Entrada Aceitos

O parser suporta dois estilos principais:

#### A) Nome do exercício em uma linha + séries nas linhas seguintes

Exemplo:

```txt
Agachamento livre
1x12x40kg
1x10x50kg
1x8x60kg
```

As linhas de séries são reconhecidas por uma regex que aceita variações como:

- `1x12x40kg`
- `1x12 40kg`
- `1x12 - 40kg`
- `1x12 com 40kg`

Referência: [workoutParserModel.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L31-L61)

#### B) Nome do exercício + séries na mesma linha

Exemplos:

```txt
Supino 3x12 com 80kg
Remada 4 séries de 10 com 60kg
Supino inclinado: 3x12x20kg, 1x10x20kg, 1x8x20kg
```

Esse modo é útil quando você recebe o treino já “compactado”, com múltiplas séries separadas por vírgula/`;`.

Referência: [workoutParserModel.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L63-L138)

### 2.3. Regra de Reps Compostas (`10/10`)

Quando `reps` contém `/` (ex.: `10/10`), o parser interpreta como soma:

- `10/10` → `repsNum = 10 + 10 = 20`
- Volume do detalhe: `volume = sets * 20 * weight`

Isso é aplicado tanto para o cálculo de volume por detalhe quanto para o total de repetições do treino.

Referências:
- Volume por detalhe: [workoutParserModel.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L43-L60)
- Total de reps do treino: [workoutParserModel.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L158-L165)

## 3. Cálculos (Exercício e Treino)

### 3.1. Cálculo por “detalhe” (linha de série)

Para cada linha de série interpretada:

- `sets`: parte antes do primeiro `x`
- `reps`: parte entre os `x` (pode ser `10/10`)
- `weight`: parte final (kg), aceitando vírgula como decimal
- `volume`: `sets * repsNum * weight`

Exemplo:

```txt
3x12x20kg
```

- `sets = 3`
- `repsNum = 12`
- `weight = 20`
- `volume = 3 * 12 * 20 = 720 kg`

### 3.2. Totais por Exercício

Ao “fechar” um exercício, o parser calcula:

- `totalSets`: soma dos `sets` de cada detalhe
- `totalVolume`: soma dos `volume` de cada detalhe

Referência: [workoutParserModel.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L142-L156)

Observação importante: o modelo `ParsedWorkout` não mantém `totalReps` por exercício (somente no nível do treino). Para exibição no card/preview, o total de reps por exercício é recalculado na UI.

Referências:
- Reps por exercício no preview/card: [ReferenceWorkoutCard](file:///d:/Projetos/treino_volume/flexi-train-reports/src/components/ReferenceWorkoutCard.tsx#L11-L52)
- Reps por exercício em outros trechos de UI: [WorkoutParser.tsx](file:///d:/Projetos/treino_volume/flexi-train-reports/src/components/WorkoutParser.tsx#L484-L492)

### 3.3. Totais do Treino

O retorno do parser inclui:

- `totalSets`: soma dos `totalSets` de cada exercício
- `totalReps`: soma de `detail.sets * repsNum` para todos os detalhes
- `totalVolume`: soma dos `totalVolume` de cada exercício
- `summary`: string pronta para exibir um resumo do treino

Referência: [workoutParserModel.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/lib/workoutParserModel.ts#L158-L173)

## 4. Persistência: Como os Totais São Gravados no Banco

Quando você clica em “Salvar”, o front-end converte `ParsedWorkout` para o payload da API e salva via Supabase.

### 4.1. Conversão do Parser para Payload

O payload enviado para persistência segue o formato de `CreateWorkoutData` (exercícios + sets com `series`, `repeticoes`, `peso`, `volume` e `ordem`).

Referência da conversão: [handleSaveWorkout](file:///d:/Projetos/treino_volume/flexi-train-reports/src/components/WorkoutParser.tsx#L1189-L1247)

### 4.2. Recalcular Totais no Backend (Regra de Ouro)

Mesmo recebendo `volume` por set, a camada de persistência recalcula os totais do treino ao criar/atualizar:

- `total_exercicios` = quantidade de exercícios
- `total_series` = soma de `series` de todos os sets
- `total_repeticoes` = soma de `series * repsNum` de todos os sets (com `10/10` somado)
- `volume_total` = soma do `volume` de todos os sets

Isso é uma boa prática de integridade: evita divergência entre o que o front calculou e o que fica salvo.

Referências:
- Criação: [createWorkout](file:///d:/Projetos/treino_volume/flexi-train-reports/src/services/apiWorkouts.ts#L142-L181)
- Atualização: [updateWorkout](file:///d:/Projetos/treino_volume/flexi-train-reports/src/services/apiWorkouts.ts#L265-L304)

## 5. Como os Relatórios Usam a Quantificação

Os relatórios e indicadores (Dashboard/Reports) se baseiam principalmente nos campos agregados gravados na tabela `workouts` (`volume_total`, `total_series`, `total_exercicios`, etc.), porque são rápidos de consultar e já vêm pré-calculados.

Exemplo:

- Somatórios no relatório: [WorkoutReports.tsx](file:///d:/Projetos/treino_volume/flexi-train-reports/src/components/WorkoutReports.tsx#L70-L99)
- Métricas no dashboard: [useMetrics.ts](file:///d:/Projetos/treino_volume/flexi-train-reports/src/hooks/useMetrics.ts#L68-L93)

## 6. Exemplos de Cálculo (Para Conferência Manual)

### Exemplo 1 — Série simples

Entrada:

```txt
Supino
3x10x20kg
```

Cálculo:

- `volume = 3 * 10 * 20 = 600 kg`
- `totalSets (exercício) = 3`
- `totalReps (treino) = 3 * 10 = 30`

### Exemplo 2 — Unilateral `10/10`

Entrada:

```txt
Rosca direta unil.
2x10/10x8kg
```

Cálculo:

- `repsNum = 10 + 10 = 20`
- `volume = 2 * 20 * 8 = 320 kg`
- `totalReps (treino) = 2 * 20 = 40`

## 7. Limitações Conhecidas (Intencionais)

- O parser ignora linhas que não encaixam nos padrões (para evitar “inventar” dados).
- `10/10` é tratado como soma de reps (boa aproximação para volume total). Se você quiser registrar por lado separadamente, a modelagem e os cálculos precisam mudar (sem alterar a lógica atual sem um motivo claro, para não quebrar compatibilidade).

