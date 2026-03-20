// Nexus Core - OpenFDA Integrator
import { PharmacodynamicsData, PharmacyIntegrationProvider } from './pharmacyBase';

export class OpenFDAProvider implements PharmacyIntegrationProvider {
  private readonly baseUrl = 'https://api.fda.gov/drug/label.json';

  async fetchDrugDetails(drugName: string): Promise<PharmacodynamicsData | null> {
    try {
      // Encode drug name and search across active ingredient and generic name fields
      const query = encodeURIComponent(`openfda.generic_name:"${drugName}" OR active_ingredient:"${drugName}"`);
      const response = await fetch(`${this.baseUrl}?search=${query}&limit=1`);

      if (!response.ok) {
        if (response.status === 404) return null; // Not found in FDA database
        console.error(`OpenFDA API error: ${response.status} ${response.statusText}`);
        return null; // Fallback to null on errors to avoid blocking the workflow
      }

      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      const openfda = result.openfda || {};

      // OpenFDA specific heuristic parsers
      const rxcui = openfda.rxcui ? openfda.rxcui[0] : undefined;
      
      // Heuristic parsing for Mechanism of Action and Receptors
      const moaText = result.mechanism_of_action ? result.mechanism_of_action.join(' ') : 'Unknown mechanism.';
      const targetReceptors = this.extractReceptorsFromText(moaText);
      const clearanceRoute = this.determineClearanceRoute(result.pharmacokinetics ? result.pharmacokinetics.join(' ') : '');

      return {
        rxcui,
        targetReceptors,
        clearanceRoute,
        mechanismOfAction: moaText
      };

    } catch (error) {
      console.error('Error fetching data from OpenFDA:', error);
      return null;
    }
  }

  // NLP Heuristic to extract common receptor targets from FDA text
  private extractReceptorsFromText(text: string): string[] {
    const receptors = [];
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('androgen receptor')) receptors.push('AR');
    if (lowerText.includes('beta-2 adrenergic') || lowerText.includes('beta2-adrenergic')) receptors.push('B2AR');
    if (lowerText.includes('gaba')) receptors.push('GABA-A');
    if (lowerText.includes('hmg-coa')) receptors.push('HMG-CoA Reductase');
    if (lowerText.includes('cox-1') || lowerText.includes('cyclooxygenase-1')) receptors.push('COX-1');
    if (lowerText.includes('cox-2') || lowerText.includes('cyclooxygenase-2')) receptors.push('COX-2');
    
    return receptors.length > 0 ? receptors : ['Unknown Target'];
  }

  // NLP Heuristic to determine clearance route from Pharmacokinetics text
  private determineClearanceRoute(text: string): 'renally' | 'hepatically' | 'both' | 'unknown' {
    if (!text) return 'unknown';
    const lowerText = text.toLowerCase();
    
    const renal = lowerText.includes('renal') || lowerText.includes('urine') || lowerText.includes('kidney');
    const hepatic = lowerText.includes('hepatic') || lowerText.includes('liver') || lowerText.includes('cyp');
    
    if (renal && hepatic) return 'both';
    if (renal) return 'renally';
    if (hepatic) return 'hepatically';
    return 'unknown';
  }
}

export const openFDA = new OpenFDAProvider();
