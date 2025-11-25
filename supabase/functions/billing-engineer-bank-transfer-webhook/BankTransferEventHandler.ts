import type { SupabaseClient } from "supabase"
import { BillingBatchGroupStoreSupabase } from '../_shared/stores/BillingBatchGroup/BillingBatchGroupStoreSupabase.ts'
import { BillingBatchGroupItemStoreSupabase } from '../_shared/stores/BillingBatchGroupItem/BillingBatchGroupItemStoreSupabase.ts'
import { BillingEngineerTransferStoreSupabase } from '../_shared/stores/BillingEngineerTransfer/BillingEngineerTransferStoreSupabase.ts'
import { TicketStoreSupabase } from '../_shared/stores/Ticket/TicketStoreSupabase.ts'

/**
 * Airwallex webhook event payload structure
 */
interface AirwallexWebhookEvent {
  id: string
  name: string
  account_id: string
  data: unknown
  created_at: string
}

/**
 * Payload for payout transfer webhook events
 */
interface PayoutTransferData {
  request_id: string
  status: string
  beneficiary_id: string
  amount_beneficiary_receives: number
  // ... other fields from the webhook payload
}

/**
 * Payload for batch transfer webhook events
 */
interface BatchTransferData {
  id: string
  status: string
  name: string
  funding?: {
    status: string
    failure_reason?: string
  }
  // ... other fields from the webhook payload
}

/**
 * Status ordering for Airwallex transfer lifecycle
 * Higher numbers indicate later stages in the process
 * Failed and cancelled are terminal states with highest priority
 */
const STATUS_ORDER: Record<string, number> = {
  'pending': 0,
  'processing': 1,
  'sent': 2,
  'paid': 3,
  'failed': 4,
  'cancelled': 4
}

/**
 * Status ordering for Airwallex batch transfer lifecycle
 * Based on https://www.airwallex.com/docs/payouts/batch-transfers/create-a-batch-transfer/batch-transfer-statuses
 * Higher numbers indicate later stages in the process
 * Terminal states have highest priority
 */
const BATCH_STATUS_ORDER: Record<string, number> = {
  'drafting': 0,
  'in_approval': 1,
  'approval_recalled': 2,
  'approval_rejected': 2,
  'approval_blocked': 2,
  'scheduled': 3,
  'overdue': 4,
  'booking': 5,
  'partially_booked': 6,
  'booked': 7,
  'failed': 8,
  'cancellation_requested': 8,
  'cancelled': 8
}

/**
 * Maps Airwallex transfer statuses to batch group item statuses
 */
function mapAirwallexStatusToBatchStatus(airwallexStatus: string): string {
  const statusMap: Record<string, string> = {
    'PROCESSING': 'processing',
    'SENT': 'sent',
    'PAID': 'paid',
    'FAILED': 'failed',
    'CANCELLED': 'cancelled'
  }
  return statusMap[airwallexStatus] || airwallexStatus.toLowerCase()
}

/**
 * Maps Airwallex batch transfer statuses to our internal statuses
 */
function mapAirwallexBatchStatus(airwallexStatus: string): string {
  // Airwallex sends statuses in UPPERCASE, we store them in lowercase
  return airwallexStatus.toLowerCase()
}

/**
 * BankTransferEventHandler handles Airwallex webhook events by verifying HMAC-SHA256 signatures
 * and logging payloads for analysis.
 *
 * Signature verification follows Airwallex's webhook guide:
 * https://www.airwallex.com/docs/developer-tools/webhooks/listen-for-webhook-events
 */
export class BankTransferEventHandler {
  private readonly webhookSecret: string
  private readonly supabase: SupabaseClient

  constructor(webhookSecret: string, supabase: SupabaseClient) {
    this.webhookSecret = webhookSecret
    this.supabase = supabase
  }

  /**
   * Handles an Airwallex webhook event by verifying signature and logging the payload
   * @param body - The raw request body as a string (must be unmodified)
   * @param signature - The x-signature header value (HMAC-SHA256 hex digest)
   * @param timestamp - The x-timestamp header value (Unix timestamp in milliseconds)
   * @returns Promise that resolves on success or rejects with error
   */
  async handleEvent(
    body: string,
    signature: string,
    timestamp: string
  ): Promise<void> {
    console.info('[BankTransferEventHandler] Handling Airwallex webhook event', {
      timestamp,
      bodyLength: body.length
    })

    // Verify the signature before any parsing
    await this.verifySignature(body, signature, timestamp)

    // Parse the event payload after signature verification
    let payload: AirwallexWebhookEvent
    try {
      payload = JSON.parse(body)
    } catch (error) {
      throw new Error(`Failed to parse webhook payload: ${error}`)
    }

    // Log the complete payload for analysis
    console.info('[BankTransferEventHandler] Airwallex webhook payload:', {
      eventId: payload.id,
      eventName: payload.name,
      accountId: payload.account_id,
      createdAt: payload.created_at,
      data: JSON.stringify(payload.data, null, 2)
    })

    // Store the raw event in the database for future analysis
    await this.storeRawEvent(body, timestamp, payload)

    // Handle specific event types
    await this.handleSpecificEvent(payload)

    console.info('[BankTransferEventHandler] Successfully handled Airwallex webhook event', {
      eventId: payload.id,
      eventName: payload.name
    })
  }

  /**
   * Handles specific Airwallex event types
   * @param payload - The parsed webhook event
   */
  private async handleSpecificEvent(payload: AirwallexWebhookEvent): Promise<void> {
    switch (payload.name) {
      // Individual transfer events
      case 'payout.transfer.processing':
      case 'payout.transfer.sent':
      case 'payout.transfer.paid':
      case 'payout.transfer.failed':
      case 'payout.transfer.cancelled':
        await this.handlePayoutTransferStatusUpdate(payload)
        break

      // Batch transfer status events
      case 'payout.batch_transfers.drafting':
      case 'payout.batch_transfers.in_approval':
      case 'payout.batch_transfers.approval_recalled':
      case 'payout.batch_transfers.approval_rejected':
      case 'payout.batch_transfers.approval_blocked':
      case 'payout.batch_transfers.scheduled':
      case 'payout.batch_transfers.overdue':
      case 'payout.batch_transfers.booking':
      case 'payout.batch_transfers.partially_booked':
      case 'payout.batch_transfers.booked':
      case 'payout.batch_transfers.failed':
      case 'payout.batch_transfers.cancellation_requested':
      case 'payout.batch_transfers.cancelled':
        await this.handleBatchTransferStatusUpdate(payload)
        break

      // Batch transfer funding events
      case 'payout.batch_transfers.funding.scheduled':
      case 'payout.batch_transfers.funding.processing':
      case 'payout.batch_transfers.funding.funded':
      case 'payout.batch_transfers.funding.cancelled':
      case 'payout.batch_transfers.funding.failed':
      case 'payout.batch_transfers.funding.reversed':
        await this.handleBatchTransferFundingUpdate(payload)
        break

      default:
        console.info(`[BankTransferEventHandler] No specific handler for event type: ${payload.name}`)
    }
  }

  /**
   * Handles payout transfer status update events
   * Supports: processing, sent, paid, failed, cancelled
   *
   * Status flow: pending -> processing -> sent -> paid (success)
   *                                           -> failed/cancelled (failure)
   *
   * IMPORTANT: Webhooks can arrive out of order. This method prevents backward status transitions
   * by comparing status order values. Only updates if the new status has a higher order value.
   *
   * For failed/cancelled statuses:
   * - Updates batch group item status to 'failed' or 'cancelled'
   * - Updates engineer_transfers to 'failed'
   * - Updates tickets to 'payment-failed'
   *
   * For paid status:
   * - Updates batch group item status to 'paid'
   * - Updates engineer_transfers to 'completed'
   * - Updates tickets to 'completed'
   *
   * @param payload - The webhook event payload
   */
  private async handlePayoutTransferStatusUpdate(payload: AirwallexWebhookEvent): Promise<void> {
    console.info(`[BankTransferEventHandler] Handling ${payload.name} event`)

    const data = payload.data as PayoutTransferData
    const externalBatchItemId = data.request_id
    const airwallexStatus = data.status
    const newStatus = mapAirwallexStatusToBatchStatus(airwallexStatus)

    console.info(`[BankTransferEventHandler] Transfer status: ${airwallexStatus} -> ${newStatus}`)

    // Initialize stores
    const batchGroupItemStore = new BillingBatchGroupItemStoreSupabase(this.supabase)
    const engineerTransferStore = new BillingEngineerTransferStoreSupabase(this.supabase)
    const ticketStore = new TicketStoreSupabase(this.supabase)

    // Fetch the batch group item by external ID
    const batchGroupItem = await batchGroupItemStore.fetchByExternalBatchItemId(externalBatchItemId)

    if (!batchGroupItem) {
      console.warn(`[BankTransferEventHandler] Batch group item not found for external ID: ${externalBatchItemId}`)
      return
    }

    console.info(`[BankTransferEventHandler] Found batch group item: ${batchGroupItem.id}, current status: ${batchGroupItem.status}`)

    // Check if this is a backward status transition (out-of-order webhook)
    const currentStatusOrder = STATUS_ORDER[batchGroupItem.status] || 0
    const newStatusOrder = STATUS_ORDER[newStatus] || 0

    if (newStatusOrder < currentStatusOrder) {
      console.warn(
        `[BankTransferEventHandler] Ignoring out-of-order status update from ${batchGroupItem.status} (order ${currentStatusOrder}) to ${newStatus} (order ${newStatusOrder})`
      )
      return
    }

    if (newStatusOrder === currentStatusOrder) {
      console.info(`[BankTransferEventHandler] Status already at ${batchGroupItem.status}, no update needed`)
      return
    }

    // Update the batch group item status
    await batchGroupItemStore.update(batchGroupItem.id, { status: newStatus })
    console.info(`[BankTransferEventHandler] Updated batch group item ${batchGroupItem.id} to ${newStatus}`)

    // Fetch all engineer transfers linked to this batch group item
    const engineerTransfers = await engineerTransferStore.fetchByBatchGroupItemId(batchGroupItem.id)
    console.info(`[BankTransferEventHandler] Found ${engineerTransfers.length} engineer transfers for batch group item ${batchGroupItem.id}`)

    // Handle status transitions for engineer transfers and tickets
    if (newStatus === 'failed' || newStatus === 'cancelled') {
      // For failed/cancelled, mark engineer transfers as failed and tickets as payment-failed
      for (const transfer of engineerTransfers) {
        await engineerTransferStore.update(transfer.id, { status: 'failed' })
        console.info(`[BankTransferEventHandler] Updated engineer transfer ${transfer.id} to failed`)

        await ticketStore.updateStatus(transfer.ticketId, 'payment-failed')
        console.info(`[BankTransferEventHandler] Updated ticket ${transfer.ticketId} to payment-failed`)
      }
      console.info(`[BankTransferEventHandler] Successfully processed ${newStatus} status for batch item ${batchGroupItem.id}`)
    } else if (newStatus === 'sent' || newStatus === 'paid') {
      // For 'sent' or 'paid' status, mark engineer transfers and tickets as completed
      // 'sent' means the transfer has been sent from Airwallex to the recipient
      // 'paid' means the transfer has been successfully processed by the banking partner
      for (const transfer of engineerTransfers) {
        await engineerTransferStore.update(transfer.id, { status: 'completed' })
        console.info(`[BankTransferEventHandler] Updated engineer transfer ${transfer.id} to completed`)

        await ticketStore.updateStatus(transfer.ticketId, 'completed')
        console.info(`[BankTransferEventHandler] Updated ticket ${transfer.ticketId} to completed`)
      }
      console.info(`[BankTransferEventHandler] Successfully processed ${newStatus} status for batch item ${batchGroupItem.id}`)
    } else if (newStatus === 'processing') {
      // For 'processing' status, update engineer transfers to 'pending_funds' and tickets to 'pending-payment'
      // This ensures consistency even if webhooks arrive out of order
      for (const transfer of engineerTransfers) {
        // Only update if the transfer is in 'pending' state (to avoid backward transitions)
        if (transfer.status === 'pending') {
          await engineerTransferStore.update(transfer.id, { status: 'pending_funds' })
          console.info(`[BankTransferEventHandler] Updated engineer transfer ${transfer.id} to pending_funds`)

          await ticketStore.updateStatus(transfer.ticketId, 'pending-payment')
          console.info(`[BankTransferEventHandler] Updated ticket ${transfer.ticketId} to pending-payment`)
        }
      }
      console.info(`[BankTransferEventHandler] Successfully updated batch item ${batchGroupItem.id} to processing status`)
    }
  }

  /**
   * Handles batch transfer status update events
   *
   * Status flow: drafting -> in_approval -> scheduled -> booking -> booked (success)
   *                                                             -> failed/cancelled (failure)
   *
   * IMPORTANT: Webhooks can arrive out of order. This method prevents backward status transitions
   * by comparing status order values. Only updates if the new status has a higher order value.
   *
   * @param payload - The webhook event payload
   */
  private async handleBatchTransferStatusUpdate(payload: AirwallexWebhookEvent): Promise<void> {
    console.info(`[BankTransferEventHandler] Handling ${payload.name} event`)

    const data = payload.data as BatchTransferData
    const externalBatchGroupId = data.id
    const airwallexStatus = data.status
    const newStatus = mapAirwallexBatchStatus(airwallexStatus)

    console.info(`[BankTransferEventHandler] Batch transfer status: ${airwallexStatus} -> ${newStatus}`)

    // Initialize store
    const batchGroupStore = new BillingBatchGroupStoreSupabase(this.supabase)

    // Fetch the batch group by external ID
    const batchGroup = await batchGroupStore.fetchByExternalBatchGroupId(externalBatchGroupId)

    if (!batchGroup) {
      console.warn(`[BankTransferEventHandler] Batch group not found for external ID: ${externalBatchGroupId}`)
      return
    }

    console.info(`[BankTransferEventHandler] Found batch group: ${batchGroup.id}, current status: ${batchGroup.status}`)

    // Check if this is a backward status transition (out-of-order webhook)
    const currentStatusOrder = BATCH_STATUS_ORDER[batchGroup.status] || 0
    const newStatusOrder = BATCH_STATUS_ORDER[newStatus] || 0

    if (newStatusOrder < currentStatusOrder) {
      console.warn(
        `[BankTransferEventHandler] Ignoring out-of-order batch status update from ${batchGroup.status} (order ${currentStatusOrder}) to ${newStatus} (order ${newStatusOrder})`
      )
      return
    }

    if (newStatusOrder === currentStatusOrder) {
      console.info(`[BankTransferEventHandler] Batch status already at ${batchGroup.status}, no update needed`)
      return
    }

    // Update the batch group status
    const updates: any = { status: newStatus }

    // Set completion/cancellation timestamps for terminal states
    if (newStatus === 'booked') {
      updates.completedAt = new Date()
    } else if (newStatus === 'cancelled' || newStatus === 'failed') {
      updates.cancelledAt = new Date()
    }

    await batchGroupStore.update(batchGroup.id, updates)
    console.info(`[BankTransferEventHandler] Updated batch group ${batchGroup.id} to ${newStatus}`)
  }

  /**
   * Handles batch transfer funding status update events
   *
   * Funding events are informational and logged but don't trigger status changes
   * to the batch group itself. The main batch status events drive the workflow.
   *
   * @param payload - The webhook event payload
   */
  private async handleBatchTransferFundingUpdate(payload: AirwallexWebhookEvent): Promise<void> {
    console.info(`[BankTransferEventHandler] Handling ${payload.name} event`)

    const data = payload.data as BatchTransferData
    const externalBatchGroupId = data.id
    const fundingStatus = data.funding?.status || 'UNKNOWN'
    const failureReason = data.funding?.failure_reason

    console.info(`[BankTransferEventHandler] Batch funding status for ${externalBatchGroupId}: ${fundingStatus}`)

    if (failureReason) {
      console.warn(`[BankTransferEventHandler] Batch funding failure reason: ${failureReason}`)
    }

    // Initialize store
    const batchGroupStore = new BillingBatchGroupStoreSupabase(this.supabase)

    // Fetch the batch group by external ID
    const batchGroup = await batchGroupStore.fetchByExternalBatchGroupId(externalBatchGroupId)

    if (!batchGroup) {
      console.warn(`[BankTransferEventHandler] Batch group not found for external ID: ${externalBatchGroupId}`)
      return
    }

    console.info(`[BankTransferEventHandler] Batch funding event recorded for batch group: ${batchGroup.id}`)
  }

  /**
   * Verifies the HMAC-SHA256 signature of the Airwallex webhook request
   *
   * Signature verification steps (per Airwallex docs):
   * 1. Concatenate x-timestamp + raw JSON payload body
   * 2. Compute HMAC-SHA256 using the webhook secret as the key
   * 3. Compare the computed hex digest with x-signature header
   *
   * @param body - The raw request body (must be unmodified/unparsed)
   * @param signature - The x-signature header value (expected HMAC hex digest)
   * @param timestamp - The x-timestamp header value
   */
  private async verifySignature(body: string, signature: string, timestamp: string): Promise<void> {
    try {
      // Prepare the value to digest: timestamp + raw body (in that exact order)
      const valueToDigest = timestamp + body

      // Import the secret key for HMAC-SHA256
      const encoder = new TextEncoder()
      const keyData = encoder.encode(this.webhookSecret)
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )

      // Compute HMAC-SHA256
      const messageData = encoder.encode(valueToDigest)
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, messageData)

      // Convert to hex string
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Compare signatures (case-insensitive comparison for hex)
      if (computedSignature.toLowerCase() !== signature.toLowerCase()) {
        throw new Error('Invalid webhook signature')
      }

      console.info('[BankTransferEventHandler] Signature verification successful')
    } catch (error) {
      console.error('[BankTransferEventHandler] Signature verification failed:', error)
      throw new Error(`Signature verification failed: ${error}`)
    }
  }

  /**
   * Stores the raw webhook event in the database for future analysis
   * @param body - The raw request body
   * @param timestamp - The timestamp from headers
   * @param payload - The parsed payload object
   */
  private async storeRawEvent(
    body: string,
    timestamp: string,
    payload: AirwallexWebhookEvent
  ): Promise<void> {
    try {
      // TODO: Create a table to store raw Airwallex webhook events
      // For now, just log that we would store it
      console.info('[BankTransferEventHandler] Would store raw event in database:', {
        eventId: payload.id,
        eventName: payload.name,
        accountId: payload.account_id,
        timestamp,
        createdAt: payload.created_at
      })
    } catch (error) {
      console.error('[BankTransferEventHandler] Failed to store raw event:', error)
      // Don't throw - we still want to acknowledge receipt even if storage fails
    }
  }
}
