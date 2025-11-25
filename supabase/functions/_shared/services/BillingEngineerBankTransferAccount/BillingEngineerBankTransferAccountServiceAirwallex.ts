import type { BankTransferRecipient, BeneficiaryFormValue, BeneficiaryResponse } from '@types'
import type { BillingEngineerBankTransferAccountService } from './BillingEngineerBankTransferAccountService.ts'

/**
 * Implementation of BillingEngineerBankTransferAccountService using Airwallex API
 * Handles authorization code generation for embedded components
 */
export class BillingEngineerBankTransferAccountServiceAirwallex implements BillingEngineerBankTransferAccountService {
  private readonly apiUrl: string
  private readonly clientId: string
  private readonly apiKey: string

  constructor(apiUrl: string, clientId: string, apiKey: string) {
    this.apiUrl = apiUrl
    this.clientId = clientId
    this.apiKey = apiKey
  }

  /**
   * Generates an authorization code for Airwallex embedded components
   * Uses PKCE flow (RFC 7636) for secure authorization
   *
   * Note: We use the platform's main account (not connected accounts per engineer)
   * because beneficiaries are created under the platform's account for payouts
   */
  async generateAuthorizationCode(
    engineerId: string,
    codeChallenge: string
  ): Promise<string> {
    console.info(
      `[BillingEngineerBankTransferAccountServiceAirwallex] Generating authorization code for engineer: ${engineerId}`
    )

    try {
      const accessToken = await this.getAccessToken()

      // Generate authorization code for embedded components
      // Note: We do NOT use x-on-behalf-of header because beneficiaries are created
      // under the platform's main account, not per-engineer connected accounts
      const authorizeResponse = await fetch(`${this.apiUrl}/api/v1/authentication/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_challenge: codeChallenge,
          identity: engineerId, // Platform's identifier for this user (for tracking/audit)
          scope: ['w:awx_action:transfers_edit'], // Scope for beneficiary component
        }),
      })

      if (!authorizeResponse.ok) {
        const errorText = await authorizeResponse.text()
        console.error(
          `[BillingEngineerBankTransferAccountServiceAirwallex] Authorization code generation failed: ${authorizeResponse.status} - ${errorText}`
        )
        throw new Error(`Failed to generate authorization code: ${authorizeResponse.status} - ${errorText}`)
      }

      const authorizeData = await authorizeResponse.json()
      const authorizationCode = authorizeData.authorization_code

      console.info(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Successfully generated authorization code`
      )

      return authorizationCode
    } catch (err) {
      const error = err as Error
      console.error(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Error generating authorization code: ${error.message}`
      )
      throw new Error(`Failed to generate authorization code: ${error.message}`)
    }
  }

  /**
   * Creates a beneficiary in Airwallex
   * @param beneficiaryData - The beneficiary form data from Airwallex embedded component
   * @returns The created beneficiary account
   * @throws Error if beneficiary creation fails
   */
  async createBeneficiary(beneficiaryData: BeneficiaryFormValue): Promise<BankTransferRecipient> {
    console.info(`[BillingEngineerBankTransferAccountServiceAirwallex] Creating beneficiary`)

    try {
      const accessToken = await this.getAccessToken()

      // Create beneficiary via Airwallex API
      const createResponse = await fetch(`${this.apiUrl}/api/v1/beneficiaries/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(beneficiaryData),
      })

      if (!createResponse.ok) {
        const errorText = await createResponse.text()
        console.error(
          `[BillingEngineerBankTransferAccountServiceAirwallex] Beneficiary creation failed: ${createResponse.status} - ${errorText}`
        )
        throw new Error(`Failed to create beneficiary: ${createResponse.status} - ${errorText}`)
      }

      const responseData: BeneficiaryResponse = await createResponse.json()

      console.info(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Successfully created beneficiary: ${responseData.id}`
      )

      // Extract name from beneficiary data
      const name = responseData.beneficiary.bank_details?.account_name
      // Extract country code
      const country = responseData.beneficiary.bank_details?.bank_country_code
      const accountNumber = responseData.beneficiary.bank_details?.account_number
      const summary = accountNumber ? `Account No. ****${accountNumber.slice(-4)}` : undefined

      // Map Airwallex response to BankTransferRecipient
      return {
        external_id: responseData.id,
        name,
        country,
        summary,
        active: true
      }
    } catch (err) {
      const error = err as Error
      console.error(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Error creating beneficiary: ${error.message}`
      )
      throw new Error(`Failed to create beneficiary: ${error.message}`)
    }
  }

  /**
   * Deletes a beneficiary from Airwallex
   * @param beneficiaryId - The Airwallex beneficiary ID to delete
   * @throws Error if beneficiary deletion fails
   */
  async deleteBeneficiary(beneficiaryId: string): Promise<void> {
    console.info(`[BillingEngineerBankTransferAccountServiceAirwallex] Deleting beneficiary: ${beneficiaryId}`)

    try {
      const accessToken = await this.getAccessToken()

      // Delete beneficiary via Airwallex API
      const deleteResponse = await fetch(`${this.apiUrl}/api/v1/beneficiaries/${beneficiaryId}/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text()
        console.error(
          `[BillingEngineerBankTransferAccountServiceAirwallex] Beneficiary deletion failed: ${deleteResponse.status} - ${errorText}`
        )
        throw new Error(`Failed to delete beneficiary: ${deleteResponse.status} - ${errorText}`)
      }

      console.info(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Successfully deleted beneficiary: ${beneficiaryId}`
      )
    } catch (err) {
      const error = err as Error
      console.error(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Error deleting beneficiary: ${error.message}`
      )
      throw new Error(`Failed to delete beneficiary: ${error.message}`)
    }
  }


  /**
   * Authenticates with Airwallex API and returns an access token
   * @returns The access token for subsequent API calls
   * @throws Error if authentication fails
   */
  private async getAccessToken(): Promise<string> {
    const authResponse = await fetch(`${this.apiUrl}/api/v1/authentication/login`, {
      method: 'POST',
      headers: {
        'x-client-id': this.clientId,
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error(
        `[BillingEngineerBankTransferAccountServiceAirwallex] Authentication failed: ${authResponse.status} - ${errorText}`
      )
      throw new Error(`Failed to authenticate: ${authResponse.status} - ${errorText}`)
    }

    const authData = await authResponse.json()
    console.info(`[BillingEngineerBankTransferAccountServiceAirwallex] Successfully authenticated`)
    return authData.token
  }

}
