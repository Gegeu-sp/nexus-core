import { PredictiveSyndromeAlert } from '@prisma/client';

export interface IAlertDispatcher {
  /**
   * Dispatches a clinical alert notification to a specified endpoint or phone number.
   * @param alertData The detected syndrome alert data
   * @param recipient The target recipient identifier (e.g. phone number, email address)
   */
  dispatch(alertData: PredictiveSyndromeAlert, recipient: string): Promise<boolean>;
}
