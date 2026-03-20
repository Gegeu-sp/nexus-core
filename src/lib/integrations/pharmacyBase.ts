// Nexus Core - Pharmacy Integration Base

export interface PharmacodynamicsData {
  rxcui?: string;
  targetReceptors: string[];
  clearanceRoute: 'renally' | 'hepatically' | 'both' | 'unknown';
  mechanismOfAction: string;
}

export interface DrugDictionaryCacheInput {
  drugBankId?: string;
  rxcui?: string;
  name: string;
  targetReceptors?: string[];
  clearanceRoute?: string;
  pharmacodynamics?: string;
}

export interface PharmacyIntegrationProvider {
  /**
   * Fetches the clinical pharmacodynamics details of a drug by its generic or commercial name.
   */
  fetchDrugDetails(drugName: string): Promise<PharmacodynamicsData | null>;
}
