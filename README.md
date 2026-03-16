# 🧬 Nexus Core
**Motor Clínico e Orquestrador Cibernético de Carga de Treinamento**

Sistema completo de orquestração de treinamento físico que integra engenharia de software e ciência de dados para individualização extrema do treinamento.

## 🎯 Visão Geral

O Nexus Core é um sistema que atua como um orquestrador de fisiologia, quantificando o estresse mecânico (treino), cruzando com a farmacocinética (dosagem de medicamentos) e validando a resposta fisiológica através de biomarcadores objetivos (exames de sangue e bioimpedância).

## ✨ Funcionalidades Principais

### 1. 🏋️ Motor Matemático de Treinamento
- **Volume Load (Tonagem):** Σ (Séries × Repetições × Carga em kg)
- **ACWR (Acute:Chronic Workload Ratio):** Análise de risco de lesão com alertas automáticos
- **INOL (Intensity Number of Lifts):** Quantificação da fadiga do Sistema Nervoso Central

### 2. 💊 Farmacocinética em Tempo Real
- Cálculo de concentração plasmática baseado em meia-vida
- Avaliação de impacto na performance física
- Recomendações para treinos de força máxima

### 3. 🧪 Análise de Biomarcadores
- **CPK (Creatinofosfoquinase):** Dano muscular
- **Ângulo de Fase:** Integridade da membrana celular
- **HbA1c:** Controle glicêmico
- **Cortisol:** Nível de estresse
- Sistema automático de alertas e recomendações

### 4. 😊 Prontidão Diária
- Monitoramento de sono e qualidade do descanso
- Avaliação de dor muscular e energia
- Wellness Score calculado automaticamente

### 5. 📊 Dashboard Inteligente
- Métricas consolidadas em tempo real
- Parser automático para linguagem natural (WhatsApp)
- Sistema de alertas por nível de risco

## 🛠️ Stack Tecnológico

### Core
- **Framework:** Next.js 16 com App Router
- **Linguagem:** TypeScript 5
- **Banco de Dados:** SQLite com Prisma ORM
- **Styling:** Tailwind CSS 4
- **UI Components:** shadcn/ui (New York style)

### Bibliotecas
- **State Management:** React Hooks (useState, useEffect)
- **Formulários:** Formulários nativos HTML
- **Ícones:** Lucide React

## 📁 Estrutura do Projeto

```
nexus-core/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── users/
│   │   │       ├── [id]/
│   │   │       │   ├── conditions/
│   │   │       │   ├── pharmacology/
│   │   │       │   ├── training/
│   │   │       │   ├── biomarkers/
│   │   │       │   ├── readiness/
│   │   │       │   └── dashboard/
│   │   │       └── route.ts
│   │   ├── page.tsx            # Dashboard principal
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/                 # Componentes shadcn/ui
│   └── lib/
│       ├── db.ts               # Cliente Prisma
│       └── math-engine.ts      # Motor matemático
└── db/
    └── custom.db               # Banco de dados SQLite
```

## 🗄️ Modelo de Dados

### Tabelas Principais

1. **User:** Dados biométricos e histórico base
2. **UserCondition:** Patologias e restrições (Constraints)
3. **PharmacologyLog:** Registros de administração química
4. **TrainingSession:** Sessões de treino com cálculos automáticos
5. **BiomarkerLog:** Exames de sangue e bioimpedância
6. **DailyReadiness:** Leituras diárias de prontidão

## 🚀 Como Usar

### 1. Criar um Usuário
1. Clique em "Novo Usuário"
2. Preencha os dados biométricos básicos (nome, email, altura, peso, etc.)
3. Defina o nível de treinamento

### 2. Registrar Sessão de Treino
1. Selecione a aba "Treinos"
2. Clique em "Nova Sessão"
3. Preencha:
   - Data e tipo de sessão
   - Exercícios (nome, séries, repetições, carga)
   - % 1RM (opcional para cálculo de INOL)
   - Esforço percebido

**O sistema calculará automaticamente:**
- Tonagem total
- INOL por exercício e total
- ACWR com análise de risco

### 3. Monitorar Farmacologia
1. Selecione a aba "Farmacologia"
2. Clique em "Novo Log"
3. Informe:
   - Nome da substância
   - Dosagem em mg
   - Meia-vida em horas
   - Data/hora de administração

**O sistema calculará:**
- Concentração plasmática atual
- Porcentagem remanescente
- Nível de impacto na performance
- Recomendações para treinos de força

### 4. Registrar Exames (Biomarcadores)
1. Selecione a aba "Biomarcadores"
2. Clique em "Novo Exame"
3. Informe:
   - Data e tipo de exame
   - Valores dos biomarcadores (CPK, Ângulo de Fase, etc.)
   - Condições do teste (jejum, hidratação, etc.)

**O sistema analisará:**
- Nível de cada biomarcador
- Alertas automáticos para valores fora da faixa normal
- Recomendações baseadas na literatura científica
- Score de confiabilidade do exame

### 5. Monitorar Prontidão Diária
1. Selecione a aba "Prontidão"
2. Clique em "Novo Registro"
3. Avalie:
   - Horas e qualidade do sono
   - Nível de energia
   - Estado mental
   - Nível de estresse
   - Dor muscular

**O sistema calculará:**
- Wellness Score (média ponderada das métricas)
- Tendência de recuperação

## 📐 Fórmulas do Motor Matemático

### Volume Load (Tonagem)
```
Tonagem = Σ (Séries × Repetições × Carga em kg)
```

### INOL (Fadiga Neural)
```
INOL = Repetições / (100 - %1RM)
```
- Valores diários > 1.0 acionam mitigação de volume

### ACWR (Acute:Chronic Workload Ratio)
```
ACWR = Carga da Semana Atual / Média de Carga das 4 Semanas Anteriores
```
- **> 1.5:** Risco exponencial de ruptura/overtraining
- **1.0 - 1.5:** Risco moderado
- **0.8 - 1.0:** Zona segura
- **< 0.8:** Possível destreinamento

### Farmacocinética
```
C(t) = C0 × (1/2)^(t / t_meia)
```
Onde:
- C(t) = Concentração atual
- C0 = Dose inicial (mg)
- t = Tempo decorrido
- t_meia = Meia-vida

### Wellness Score
```
Wellness = Média das métricas (sono, energia, mental)
          - Média inversa de (dor, estresse)
```

## 🔧 API Endpoints

### Usuários
- `GET /api/users` - Listar todos os usuários
- `POST /api/users` - Criar novo usuário
- `GET /api/users/[id]` - Obter usuário por ID
- `PUT /api/users/[id]` - Atualizar usuário
- `DELETE /api/users/[id]` - Deletar usuário

### Condições Médicas
- `GET /api/users/[id]/conditions` - Listar condições
- `POST /api/users/[id]/conditions` - Criar condição

### Treinos
- `GET /api/users/[id]/training` - Listar sessões
- `POST /api/users/[id]/training` - Criar sessão com cálculos

### Farmacologia
- `GET /api/users/[id]/pharmacology` - Listar logs + farmacocinética
- `POST /api/users/[id]/pharmacology` - Criar log

### Biomarcadores
- `GET /api/users/[id]/biomarkers` - Listar exames
- `POST /api/users/[id]/biomarkers` - Criar exame com análise

### Prontidão
- `GET /api/users/[id]/readiness` - Listar registros
- `POST /api/users/[id]/readiness` - Criar registro

### Dashboard
- `GET /api/users/[id]/dashboard` - Métricas consolidadas

## 🎨 Interface do Usuário

### Status Indicadores
- 🟢 **Ótimo (Optimal):** Todas as métricas dentro da faixa normal
- 🟡 **Atenção (Attention):** Um ou mais fatores de risco moderados
- 🔴 **Preocupante (Concern):** Múltiplos fatores de risco ou críticos

### Níveis de Risco ACWR
- **Safe:** < 0.8 ou 0.8 - 1.0
- **Moderate:** 1.0 - 1.3
- **High:** 1.3 - 1.5
- **Very High:** > 1.5

## 📱 Parser de Saída (WhatsApp)

O sistema gera automaticamente resumos em linguagem natural:

```
📊 Tonagem total: 14,500 kg (+4.0%)
⚖️ ACWR em 1.1 (Zona Segura)
🧬 Ângulo de fase: 6.8° (Integridade Celular Excelente)
💪 CPK: 250 U/L (Normal)
😊 Wellness Score: 7.5/10 (Bom)
```

## 🔬 Tratamento de Viéses

### 1. Viés da Subjetividade
Se biomarcadores objetivos contradizem relatos subjetivos, o sistema aplica:
- 80% peso para dados objetivos
- 20% peso para dados subjetivos

### 2. Viés de Hidratação
Para bioimpedância, o sistema valida:
- Status de jejum
- Ausência de treino nas últimas 24h
- Nível de hidratação
- Ajusta score de confiabilidade automaticamente

### 3. Metabolização Individual
O sistema recalibra a meia-vida específica para cada usuário baseado em exames seriados.

## 🚀 Desenvolvimento

### Instalar Dependências
```bash
bun install
```

### Executar Servidor de Desenvolvimento
```bash
bun run dev
```

### Push do Schema do Banco
```bash
bun run db:push
```

### Lint
```bash
bun run lint
```

## 📊 Próximos Passos

- [ ] Integração com WhatsApp API para notificações
- [ ] Gráficos de tendência temporal
- [ ] Exportação de relatórios em PDF
- [ ] Sistema de metas e progresso
- [ ] Integração com wearables
- [ ] Machine Learning para previsão de performance

## 📄 Licença

Este projeto é desenvolvido como parte do Nexus Core - Sistema de Orquestração de Treinamento Físico.

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou pull request para melhorias.

---

**Nexus Core** - Engenharia de Software a Serviço da Performance Humana
