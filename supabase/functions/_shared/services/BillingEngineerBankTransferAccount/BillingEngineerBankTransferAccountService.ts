import type { BeneficiaryFormValue, BankTransferRecipient } from '@types'

/**
 * Service for managing bank transfer API operations for engineer payouts
 * Handles quote creation and dynamic form requirements fetching
 */
export interface BillingEngineerBankTransferAccountService {
  /**
   * Generates an authorization code for embedded components
   * Uses PKCE flow (RFC 7636) for secure authorization
   * @param engineerId - The engineer profile ID to authorize
   * @param codeChallenge - The PKCE code challenge (SHA256 hash of code_verifier)
   * @returns The authorization code valid for 30 seconds
   * @throws Error if authorization code generation fails
   */
  generateAuthorizationCode(
    engineerId: string,
    codeChallenge: string
  ): Promise<string>

  /**
   * Creates a beneficiary for bank transfers
   * @param beneficiaryData - The beneficiary form data
   * @returns The created beneficiary account
   * @throws Error if beneficiary creation fails
   */
  createBeneficiary(
    beneficiaryData: BeneficiaryFormValue
  ): Promise<BankTransferRecipient>

  /**
   * Deletes a beneficiary
   * @param beneficiaryId - The beneficiary ID to delete
   * @throws Error if beneficiary deletion fails
   */
  deleteBeneficiary(beneficiaryId: string): Promise<void>
}
