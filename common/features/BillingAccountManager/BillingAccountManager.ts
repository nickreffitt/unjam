import type { EngineerAccount, EngineerProfile, BankTransferRecipientFormData, BankTransferRecipient, BankTransferRecipientDetails, BeneficiaryFormValue } from '@common/types';
import type { BillingAccountStore } from './store/BillingAccountStore';
import type { BillingBankTransferAccountStore } from './store/BillingBankTransferAccountStore';
import type { ApiManager } from '@common/features/ApiManager';

/**
 * BillingAccountManager handles engineer billing account operations
 * Manages retrieval and updates of engineer Stripe Connect accounts and bank transfer recipients
 */
export class BillingAccountManager {
  private readonly billingAccountStore: BillingAccountStore;
  private readonly billingBankTransferAccountStore: BillingBankTransferAccountStore;
  private readonly apiManager: ApiManager;
  private readonly engineerProfile: EngineerProfile;

  constructor(
    billingAccountStore: BillingAccountStore,
    billingBankTransferAccountStore: BillingBankTransferAccountStore,
    apiManager: ApiManager,
    engineerProfile: EngineerProfile
  ) {

    if (!billingAccountStore) {
      throw new Error('BillingAccountManager: billingAccountStore is required');
    }
    if (!billingBankTransferAccountStore) {
      throw new Error('BillingAccountManager: billingBankTransferAccountStore is required');
    }
    if (!apiManager) {
      throw new Error('BillingAccountManager: apiManager is required');
    }
    if (!engineerProfile) {
      throw new Error('BillingAccountManager: engineerProfile is required');
    }

    this.billingAccountStore = billingAccountStore;
    this.billingBankTransferAccountStore = billingBankTransferAccountStore;
    this.apiManager = apiManager;
    this.engineerProfile = engineerProfile
  }

  /**
   * Gets an engineer's billing account
   * @returns The engineer's billing account if found, null otherwise
   */
  async getAccount(): Promise<EngineerAccount | null> {
    return await this.billingAccountStore.getByProfileId(this.engineerProfile.id);
  }

  /**
   * Gets an engineer's bank transfer recipient account
   * @returns The engineer's bank transfer recipient if found, null otherwise
   */
  async getBankTransferAccount(): Promise<BankTransferRecipient | null> {
    return await this.billingBankTransferAccountStore.getByProfileId(this.engineerProfile.id);
  }

  /**
   * Creates a Stripe Connect account link for engineer onboarding
   * @param engineerProfile - The engineer profile
   * @returns The account link URL where the engineer can complete onboarding
   * @throws Error if the request fails or engineer email is missing
   */
  async createAccountLink(engineerProfile: EngineerProfile): Promise<string> {
    return await this.apiManager.createEngineerAccountLink(engineerProfile);
  }

  /**
   * Creates a Stripe Express Dashboard login link for an engineer
   * @returns The login URL where the engineer can access their Stripe dashboard
   * @throws Error if the request fails or no engineer account exists
   */
  async createLoginLink(): Promise<string> {
    return await this.apiManager.createEngineerLoginLink(this.engineerProfile.id);
  }

  /**
   * Creates a dynamic recipient form for bank transfer payouts
   * @param targetCurrency - The target currency code (e.g., 'EUR', 'GBP')
   * @param targetCountry - The target country ISO code (e.g., 'DE', 'GB')
   * @param sourceAmount - The amount to send in source currency
   * @returns The recipient form data with quote ID and dynamic requirements
   * @throws Error if the request fails
   */
  async createRecipientForm(
    targetCurrency: string,
    targetCountry: string,
    sourceAmount: number
  ): Promise<BankTransferRecipientFormData> {
    return await this.apiManager.createEngineerRecipientForm(
      this.engineerProfile.id,
      targetCurrency,
      targetCountry,
      sourceAmount
    );
  }

  /**
   * Creates a recipient account for bank transfer payouts
   * @param accountHolderName - The full name of the account holder
   * @param currency - The target currency code
   * @param type - The account type from account requirements
   * @param details - The filled form details
   * @returns The created recipient account
   * @throws Error if the request fails
   */
  async createRecipient(
    accountHolderName: string,
    currency: string,
    type: string,
    details: BankTransferRecipientDetails
  ): Promise<BankTransferRecipient> {
    return await this.apiManager.createEngineerRecipient(
      this.engineerProfile.id,
      accountHolderName,
      currency,
      type,
      details
    );
  }

  /**
   * Generates an authorization code for Airwallex embedded beneficiary component
   * @param codeChallenge - The PKCE code challenge (SHA256 hash of code_verifier)
   * @returns The authorization code valid for 30 seconds
   * @throws Error if the request fails
   */
  async createBeneficiaryAuthCode(codeChallenge: string): Promise<string> {
    return await this.apiManager.createEngineerBeneficiaryAuthCode(
      this.engineerProfile.id,
      codeChallenge
    );
  }

  /**
   * Creates a beneficiary account in Airwallex for bank transfer payouts
   * @param beneficiaryData - The beneficiary form data from Airwallex embedded component
   * @returns The created beneficiary account
   * @throws Error if the request fails
   */
  async createBeneficiary(beneficiaryData: BeneficiaryFormValue): Promise<BankTransferRecipient> {
    return await this.apiManager.createEngineerBeneficiary(
      this.engineerProfile.id,
      beneficiaryData
    );
  }

  /**
   * Deletes the beneficiary account in Airwallex for the engineer
   * @throws Error if the request fails or no beneficiary exists
   */
  async deleteBankTransferAccount(): Promise<void> {
    return await this.apiManager.deleteEngineerBeneficiary(this.engineerProfile.id);
  }
}
