import type { BillingCustomerStore } from '@stores/BillingCustomer/index.ts'
import type { BillingEngineerStore } from '@stores/BillingEngineer/index.ts'
import type { BillingLinksService } from '@services/BillingLinks/index.ts'
import type { BillingEngineerAccountService } from '@services/BillingEngineerAccount/index.ts'
import type { BillingEngineerBankTransferAccountService } from '@services/BillingEngineerBankTransferAccount/index.ts'
import type { BillingEngineerBankTransferAccountStore } from '@stores/BillingEngineerBankTransferAccount/index.ts'
import type { BeneficiaryFormValue, BankTransferRecipient } from '@types'

/**
 * BillingLinksHandler orchestrates the creation of billing portal links
 * Uses dependency injection for store and service
 */
export class BillingLinksHandler {
  private readonly customerStore: BillingCustomerStore
  private readonly engineerStore: BillingEngineerStore
  private readonly linksService: BillingLinksService
  private readonly engineerAccountService: BillingEngineerAccountService
  private readonly bankTransferAccountService: BillingEngineerBankTransferAccountService
  private readonly bankTransferAccountStore: BillingEngineerBankTransferAccountStore

  constructor(
    customerStore: BillingCustomerStore,
    engineerStore: BillingEngineerStore,
    linksService: BillingLinksService,
    engineerAccountService: BillingEngineerAccountService,
    bankTransferAccountService: BillingEngineerBankTransferAccountService,
    bankTransferAccountStore: BillingEngineerBankTransferAccountStore
  ) {
    this.customerStore = customerStore
    this.engineerStore = engineerStore
    this.linksService = linksService
    this.engineerAccountService = engineerAccountService
    this.bankTransferAccountService = bankTransferAccountService
    this.bankTransferAccountStore = bankTransferAccountStore
  }

  /**
   * Creates a billing portal session link for a customer
   * @param payload - Object containing profile_id
   * @param host - The origin host for redirect URLs
   * @returns The billing portal URL
   * @throws Error if customer not found or link creation fails
   */
  async createPortalLink(payload: { profile_id: string }, host: string | null): Promise<string> {
    const { profile_id } = payload
    console.info(`[BillingLinksHandler] Creating portal link for profile: ${profile_id}`)

    // Fetch the billing customer by profile ID
    const stripeCustomerId = await this.customerStore.getByProfileId(profile_id)

    if (!stripeCustomerId) {
      console.error(`[BillingLinksHandler] No billing customer found for profile: ${profile_id}`)
      throw new Error('No billing customer found for this profile')
    }

    // Create billing portal session
    const portalUrl = await this.linksService.createBillingPortalSession(stripeCustomerId, host)

    console.info(`[BillingLinksHandler] Successfully created portal link for profile: ${profile_id}`)
    return portalUrl
  }

  /**
   * Creates a new engineer account and returns an onboarding link
   * @param payload - Object containing engineer_id and email
   * @param host - The origin host for redirect URLs
   * @returns The account onboarding URL
   * @throws Error if account creation or link generation fails
   */
  async createEngineerAccountLink(payload: { engineer_id: string; email: string }, host: string | null): Promise<string> {
    const { engineer_id, email } = payload
    console.info(`[BillingLinksHandler] Creating engineer account link for engineer: ${engineer_id}`)

    // Check if engineer account already exists
    let engineerAccount = await this.engineerStore.getByProfileId(engineer_id)

    if (!engineerAccount) {
      console.info(`[BillingLinksHandler] No existing account found, creating new account for engineer: ${engineer_id}`)

      // Create the Stripe Express Connect account
      engineerAccount = await this.engineerAccountService.create(engineer_id, email)

      // Persist the engineer account to the database
      await this.engineerStore.create(engineerAccount)
    } else {
      console.info(`[BillingLinksHandler] Found existing account for engineer: ${engineer_id}`)
    }

    // Generate account onboarding link
    const accountUrl = await this.linksService.createEngineerAccountLink(engineerAccount, host)

    console.info(`[BillingLinksHandler] Successfully created account link for engineer: ${engineer_id}`)
    return accountUrl
  }

  /**
   * Creates a login link for an engineer to access the Express Dashboard
   * @param payload - Object containing engineer_id
   * @returns The Express Dashboard login URL
   * @throws Error if engineer account not found or link creation fails
   */
  async createEngineerLoginLink(payload: { engineer_id: string }): Promise<string> {
    const { engineer_id } = payload
    console.info(`[BillingLinksHandler] Creating engineer login link for engineer: ${engineer_id}`)

    // Fetch the engineer account by profile ID
    const engineerAccount = await this.engineerStore.getByProfileId(engineer_id)

    if (!engineerAccount) {
      console.error(`[BillingLinksHandler] No engineer account found for engineer: ${engineer_id}`)
      throw new Error('No engineer account found for this profile')
    }

    // Generate login link
    const loginUrl = await this.linksService.createEngineerLoginLink(engineerAccount)

    console.info(`[BillingLinksHandler] Successfully created login link for engineer: ${engineer_id}`)
    return loginUrl
  }

  /**
   * Generates an authorization code for Airwallex embedded beneficiary component
   * @param payload - Object containing engineer_id and code_challenge (PKCE)
   * @returns Object with authorization_code
   * @throws Error if authorization code generation fails
   */
  async createEngineerBeneficiaryAuthCode(payload: {
    engineer_id: string
    code_challenge: string
  }): Promise<{ authorization_code: string }> {
    const { engineer_id, code_challenge } = payload
    console.info(
      `[BillingLinksHandler] Generating beneficiary authorization code for engineer: ${engineer_id}`
    )

    // Generate authorization code using bank transfer service
    const authorizationCode = await this.bankTransferAccountService.generateAuthorizationCode(
      engineer_id,
      code_challenge
    )

    console.info(
      `[BillingLinksHandler] Successfully generated beneficiary authorization code for engineer: ${engineer_id}`
    )

    return { authorization_code: authorizationCode }
  }

  /**
   * Creates a beneficiary account for an engineer using Airwallex
   * @param payload - Object containing engineer_id and beneficiary_data
   * @returns The created beneficiary account
   * @throws Error if beneficiary creation fails
   */
  async createEngineerBeneficiary(payload: {
    engineer_id: string
    beneficiary_data: BeneficiaryFormValue
  }): Promise<BankTransferRecipient> {
    const { engineer_id, beneficiary_data } = payload
    console.info(
      `[BillingLinksHandler] Creating beneficiary for engineer: ${engineer_id}`
    )

    // Create beneficiary using bank transfer service
    const beneficiary = await this.bankTransferAccountService.createBeneficiary(beneficiary_data)

    console.info(
      `[BillingLinksHandler] Successfully created beneficiary ${beneficiary.id} for engineer: ${engineer_id}`
    )

    // Store beneficiary in database
    await this.bankTransferAccountStore.create(engineer_id, beneficiary)

    return beneficiary
  }

  /**
   * Deletes the beneficiary account for an engineer
   * @param payload - Object containing engineer_id
   * @throws Error if beneficiary not found or deletion fails
   */
  async deleteEngineerBeneficiary(payload: { engineer_id: string }): Promise<void> {
    const { engineer_id } = payload
    console.info(
      `[BillingLinksHandler] Deleting beneficiary for engineer: ${engineer_id}`
    )

    // Fetch the existing beneficiary
    const beneficiary = await this.bankTransferAccountStore.getByProfileId(engineer_id)

    if (!beneficiary) {
      console.error(`[BillingLinksHandler] No beneficiary found for engineer: ${engineer_id}`)
      throw new Error('No beneficiary found for this engineer')
    }

    // Delete beneficiary from Airwallex
    await this.bankTransferAccountService.deleteBeneficiary(beneficiary.external_id)

    console.info(
      `[BillingLinksHandler] Successfully deleted beneficiary ${beneficiary.id} from Airwallex for engineer: ${engineer_id}`
    )

    // Delete beneficiary from database
    await this.bankTransferAccountStore.delete(beneficiary.external_id)

    console.info(
      `[BillingLinksHandler] Successfully deleted beneficiary record for engineer: ${engineer_id}`
    )
  }
}
