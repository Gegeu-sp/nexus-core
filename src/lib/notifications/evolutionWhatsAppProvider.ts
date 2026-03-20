import { PredictiveSyndromeAlert } from '@prisma/client';
import { IAlertDispatcher } from './IAlertDispatcher';

export class EvolutionWhatsAppProvider implements IAlertDispatcher {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || '';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || '';
  }

  /**
   * Templates the WhatsApp message utilizing Medical Copywriting best practices.
   */
  private formatClinicalAlertMessage(alert: PredictiveSyndromeAlert): string {
    let factors: string[] = [];
    try {
      factors = JSON.parse(alert.contributingFactors || '[]');
    } catch (e) {
      factors = [];
    }
    
    const severityMap: Record<string, string> = {
      'critical': 'CRÍTICA 🔴',
      'high': 'ALTA 🟠',
      'moderate': 'MODERADA 🟡',
      'low': 'BAIXA 🟢'
    };

    return `🚨 *ALERTA CLÍNICO NEXUS CORE* 🚨

👤 *Paciente ID:* ${alert.userId}
🧬 *Síndrome Detectada:* ${alert.syndromeName}
📊 *Probabilidade:* ${alert.probability.toFixed(1)}% | *Severidade:* ${severityMap[alert.severity] || alert.severity.toUpperCase()}
${alert.snomedCode ? `🔖 *SNOMED-CT:* ${alert.snomedCode}\n` : ''}
⚠️ *Gatilhos Fisiológicos (XAI):*
${factors.map((f: string) => `• ${f}`).join('\n')}

🩺 *Ação Recomendada:* Avaliação imediata e mitigação de carga recomendada.
⏳ *Registrado em:* ${new Date(alert.timestamp).toLocaleString('pt-BR')}

_Mensagem automática do Motor Preditivo de Triagem Cibernética._`;
  }

  async dispatch(alertData: PredictiveSyndromeAlert, phone: string): Promise<boolean> {
    if (!this.apiUrl || !this.apiKey || !this.instanceName) {
      console.warn('[EvolutionAPI] Configurações ausentes no .env. (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME). Omitindo envio.');
      return false; // Failing gracefully
    }

    const message = this.formatClinicalAlertMessage(alertData);
    const endpoint = `${this.apiUrl}/message/sendText/${this.instanceName}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey
        },
        body: JSON.stringify({
          number: phone,
          options: {
            delay: 1200,
            presence: 'composing' // Creates natural 'typing' effect
          },
          textMessage: {
            text: message
          }
        })
      });

      if (!response.ok) {
        console.error(`[EvolutionAPI] Erro HTTP: ${response.status} - ${response.statusText}`);
        return false;
      }

      console.log(`[EvolutionAPI] Alerta clínico despachado com sucesso para ${phone}.`);
      return true;
    } catch (error) {
      // Extensive try/catch around network boundary to prevent bleeding into the main app lifecycle
      console.error('[EvolutionAPI] Falha de rede ao disparar webhook do WhatsApp:', error);
      return false;
    }
  }
}

export const whatsAppDispatcher = new EvolutionWhatsAppProvider();
