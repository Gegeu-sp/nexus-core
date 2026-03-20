# 🧬 Nexus Core
**Motor Clínico Preditivo e Digital Twin de Performance Biomecânica**

O **Nexus Core** transcende os rastreadores tradicionais de fitness. É uma plataforma *Deep HealthTech* desenhada para orquestrar a carga de treinamento, recuperação fisiológica e vigilância sindrômica de atletas de alto rendimento. Operando em uma arquitetura *Closed-Loop*, o sistema cruza estresse mecânico, farmacodinâmica e biomarcadores para fornecer **Explainable AI (XAI)** aos profissionais de saúde.

---

## 🚀 Proposta de Valor (Business & Clinical)

- **Prevenção Preditiva (Syndrome Sweeper):** Algoritmos rodam em background cruzando Carga Aguda vs Crônica (ACWR), Biomarcadores (ex: CPK) e Fármacos para prever patologias (ex: Rabdomiólise Subclínica).
- **Explainable AI (XAI):** Eliminação do efeito "caixa-preta". Gráficos multiparamétricos de eixos duplos correlacionam visualmente picos de treinamento com risco de lesão tecidual.
- **Atuação Ciber-Preventiva (Closed-Loop):** Integração Event-Driven via Webhooks (Evolution API) para notificar o corpo clínico via WhatsApp no exato milissegundo em que uma síndrome crítica é detectada.
- **Conformidade B2B2C (Tenant Isolation):** Arquitetura Multi-Tenant com Role-Based Access Control (RBAC), isolando rigorosamente os dados de pacientes por clínica.

---

## 🛠️ Stack Tecnológico (Enterprise-Grade)

- **Core & Routing:** Next.js 16.1 (App Router, Turbopack, Server Actions)
- **Database:** PostgreSQL (Neon DB / Supabase) tolerante a ACID.
- **ORM & Type Safety:** Prisma ORM + TypeScript estrito.
- **Autenticação & RBAC:** Auth.js v5 (NextAuth) com Prisma Adapter integrado na Borda (Middleware).
- **Data Visualization:** Recharts (ComposedCharts com Tooltips Clínicos Dinâmicos).
- **Styling & UI:** Tailwind CSS 4 + shadcn/ui (Dark Mode Native / Mobile-First PWA).
- **Integrações Externas:** OpenFDA (Farmacodinâmica) e Evolution API (Mensageria).

---

## ✨ Módulos e Funcionalidades

### 1. 📱 Morning Check-In (PWA de Ingestão)
Interface Mobile-First de atrito zero para registro diário de Prontidão (Wellness Score) e Farmacologia. Inclui o recurso "1-Click Refill" para replicar prescrições crônicas via Prisma Transactions.

### 2. 🏥 Dashboard de Gestão Clínica (B2B)
Ambiente restrito via Middleware para Médicos e Fisiologistas. Listagem real-time de atletas vinculados à franquia, alimentada por Server Actions atômicas.

### 3. 🔍 Drill-Down Clínico Singular (Prontuário XAI)
Página dinâmica de telemetria individual. Renderiza o `MultiparametricChart` cruzando Tonagem, Nível de Recuperação e Concentração Plasmática no mesmo eixo temporal, validando os alertas do Motor Preditivo.

---

## 📐 Motor Matemático & Biomédico (Core Engine)

O sistema utiliza modelagem matemática avançada para inferir a degradação fisiológica:

**1. Carga Mecânica e Fadiga Neural:**
* **Tonagem:** $$\Sigma (\text{Séries} \times \text{Repetições} \times \text{Carga em kg})$$
* **INOL (Intensity Number of Lifts):** $$\frac{\text{Repetições}}{100 - \%1\text{RM}}$$
* **ACWR (Acute:Chronic Workload Ratio):** $$\frac{\text{Carga da Semana Atual}}{\text{Média de Carga das 4 Semanas Anteriores}}$$ (Threshold de risco crítico em $> 1.5$).

**2. Farmacocinética Exponencial:**
* **Concentração Plasmática:** $$C(t) = C_0 \times \left(\frac{1}{2}\right)^{\frac{t}{t_{meia}}}$$

---

## 🚀 Como Executar (Ambiente de Produção Local)

O projeto está otimizado para deploy Serverless (Vercel), mas pode ser rodado localmente com fidelidade total:

```bash
# 1. Clone o repositório e instale as dependências
npm install

# 2. Configure as variáveis de ambiente (.env)
# Necessário: DATABASE_URL (Postgres), DIRECT_URL, AUTH_SECRET

# 3. Construa a tipagem do ORM e aplique o schema no banco
npx prisma generate
npx prisma db push

# 4. Gere a Build de Produção (Teste de Fogo)
npm run build

# 5. Inicie o servidor otimizado
npm run start

## 📈 Roadmap Arquitetural (Próximas Fases)

O desenvolvimento do Nexus Core segue uma esteira de *Continuous Planning*. As próximas fases visam a maturidade do ecossistema e a integração com o mercado global de HealthTech.

### Fase 11: Ecossistema IoT e Ingestão Passiva
- [ ] **Integração Wearables API:** Conexão nativa com Oura Ring, Whoop e Apple HealthKit.
- [ ] **Coleta Invisível:** Ingestão passiva e automática de dados críticos de recuperação (VFC - Variabilidade da Frequência Cardíaca, arquitetura de sono e temperatura basal) direto para o Motor Preditivo, reduzindo ainda mais o atrito do usuário.

### Fase 12: Interoperabilidade Clínica Global (HL7 FHIR)
- [ ] **Mapeamento Semântico:** Tradução das entidades do Prisma (`BiomarkerObservation`, `PharmacologyLog`) para recursos estritos do padrão internacional FHIR v4.
- [ ] **EHR Integration:** Criação de endpoints seguros para que sistemas de gestão hospitalar (HIS) possam consumir os alertas preditivos de risco e o dossiê do atleta gerados pelo Nexus Core.

### Fase 13: Geração Documental e Validade Jurídica
- [ ] **Laudos Dinâmicos (SSR PDF):** Geração server-side de prontuários eletrônicos e relatórios de mitigação de risco em formato PDF utilizando renderização em borda.
- [ ] **Trilha de Auditoria:** Assinatura digital criptografada e logs de acesso (*Audit Trails*) rigorosos para garantir validade jurídica aos alertas disparados ao corpo clínico.

### Fase 14: Evolução para Machine Learning (ML)
- [ ] **Modelagem Dinâmica:** Transição parcial de heurísticas estáticas (fórmulas matemáticas fixas) para modelos de *Machine Learning* (Redes Neurais/Regressão).
- [ ] **Treinamento Contínuo:** O algoritmo passará a aprender os limiares de tolerância à carga específicos de cada paciente (*Patient-Specific Baselines*), personalizando ainda mais o acionamento dos alertas preditivos.

```
---

### 👨‍💻 Autor & Arquiteto Principal

**Argeu Rodrigues** *Graduando em Análise e Desenvolvimento de Sistemas | Especialista em LPO (Weightlifting) & Performance Humana*

> *"Engenharia de Software aplicada ao limite da Fisiologia Humana."*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Conectar-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/SEU_LINKEDIN_AQUI)
[![Instagram](https://img.shields.io/badge/Instagram-@argeurodrigueslpo-E4405F?style=for-the-badge&logo=instagram)](https://instagram.com/argeurodrigueslpo)
[![GitHub](https://img.shields.io/badge/GitHub-Portfólio-181717?style=for-the-badge&logo=github)](https://github.com/SEU_GITHUB_AQUI)

---
<p align="center">
  <small>Nexus Core © 2026 - Construído com rigor científico e código escalável.</small>
</p>
