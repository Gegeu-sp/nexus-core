import { PrismaClient } from '@prisma/client';
import { whatsAppDispatcher } from '../notifications/evolutionWhatsAppProvider';

const db = new PrismaClient();

export class PredictiveEngine {
  /**
   * Main Sweeper: Executes the heuristic evaluation rules across all domains.
   * Can be triggered by Background Workers or directly on new Log inserts (Server Actions).
   */
  async runSyllabusSweep(userId: string) {
    try {
      const activeAlerts = await Promise.all([
        this.evaluateRhabdomyolysisRisk(userId),
        this.evaluateEndocrineExhaustion(userId)
      ]);

      const newAlerts = activeAlerts.filter(a => a !== null);
      
      // Upsert rules or Insert new ones
      for (const alert of newAlerts) {
        if (!alert) continue;

        // Check if an existing ACTIVE alert exists to update or just insert new
        const createdAlert = await db.predictiveSyndromeAlert.create({
          data: {
            userId: userId,
            syndromeName: alert.syndromeName,
            snomedCode: alert.snomedCode,
            probability: alert.probability,
            severity: alert.severity,
            contributingFactors: JSON.stringify(alert.contributingFactors),
            isActive: true
          }
        });
        
        console.log(`[PREDICTIVE ENGINE] New Alert Dispatched: ${alert.syndromeName} for User ${userId}`);

        // Phase 5: Trigger Proactive WhatsApp Notification on Elevated Risk
        if (alert.severity === 'critical' || alert.severity === 'high') {
          // Assume the target phone is read from an env var, or a physician directory
          const targetPhone = process.env.CLINICAL_TEAM_PHONE || '5511999999999';
          
          // Fire and Forget (Async Background Process)
          whatsAppDispatcher.dispatch(createdAlert, targetPhone).catch(err => {
            console.error('[WhatsApp Webhook] Falha silenciosa no envio do alerta:', err);
          });
        }
      }

    } catch (e) {
      console.error('[PREDICTIVE ENGINE] Fatal error during syllabus sweep: ', e);
    }
  }

  /**
   * Rhabdomyolysis Matriz:
   * Crosses high Acute workload (ACWR) with Statin usage and marginal CPK levels.
   */
  private async evaluateRhabdomyolysisRisk(userId: string) {
    const contributingFactors: string[] = [];
    let probability = 0;

    // 1. Fetch recent training load (Last 7 days vs 28 days ACWR roughly)
    const recentSessions = await db.trainingSession.findMany({
      where: { userId, sessionDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { sessionDate: 'desc' },
      take: 1
    });

    const latestACWR = recentSessions.length > 0 ? (recentSessions[0].acwrRatio || 0) : 0;
    if (latestACWR > 1.5) {
      probability += 30;
      contributingFactors.push(`High ACWR Detected (${latestACWR.toFixed(2)})`);
    }

    // 2. Fetch active pharmacology for statins
    const recentDrugs = await db.pharmacologyLog.findMany({
      where: { userId, administrationDate: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } },
      include: { drugDictionary: true }
    });

    const hasStatin = recentDrugs.some(d => d.substanceName.toLowerCase().includes('statin') || 
                                          d.drugDictionary?.pharmacodynamics?.toLowerCase().includes('hmg-coa'));
    if (hasStatin) {
      probability += 40;
      contributingFactors.push('Active Statin Administration Found (HMG-CoA Reductase Inhibitor)');
    }

    // 3. Fetch latest CPK Biomarker
    const recentLabs = await db.biomarkerObservation.findMany({
      where: { userId, biomarkerName: 'CPK', logDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
      orderBy: { logDate: 'desc' },
      take: 1
    });

    if (recentLabs[0] && recentLabs[0].value > 250) {
      probability += 30;
      contributingFactors.push(`Elevated CPK levels: ${recentLabs[0].value} U/L`);
    }

    if (probability >= 70) {
      return {
        syndromeName: 'Subclinical Rhabdomyolysis Risk',
        snomedCode: '24338002', // Rhabdomyolysis
        probability: probability,
        severity: probability > 85 ? 'critical' : 'high',
        contributingFactors
      };
    }

    return null;
  }

  /**
   * Endocrine Exhaustion Matriz:
   * Crosses high INOL with lack of recovery / subjective readiness. 
   * Ideally crosses with Testosterone/Cortisol later if available.
   */
  private async evaluateEndocrineExhaustion(userId: string) {
    const contributingFactors: string[] = [];
    let probability = 0;

    const recentSessions = await db.trainingSession.findMany({
      where: { userId, sessionDate: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
    });

    const avgINOL = recentSessions.reduce((acc, s) => acc + (s.inolScore || 0), 0) / (recentSessions.length || 1);
    
    if (avgINOL > 1.5) {
      probability += 50;
      contributingFactors.push(`Extremely High 14-day Average INOL (${avgINOL.toFixed(2)})`);
    } else if (avgINOL > 1.0) {
      probability += 30;
      contributingFactors.push(`High 14-day Average INOL (${avgINOL.toFixed(2)})`);
    }

    const recentReadiness = await db.dailyReadiness.findMany({
      where: { userId, logDate: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } }
    });

    // Check sleep
    const avgSleep = recentReadiness.reduce((acc, r) => acc + (r.sleepHours || 8), 0) / (recentReadiness.length || 1);
    if (avgSleep < 5.5) {
      probability += 30;
      contributingFactors.push(`Severe Sleep Deprivation (<5.5h average)`);
    }

    if (probability >= 60) {
      return {
        syndromeName: 'Endocrine/CNS Exhaustion',
        snomedCode: '18501000', // Exhaustion
        probability: probability,
        severity: probability >= 80 ? 'critical' : 'high',
        contributingFactors
      };
    }

    return null;
  }
}

export const predictiveEngine = new PredictiveEngine();
