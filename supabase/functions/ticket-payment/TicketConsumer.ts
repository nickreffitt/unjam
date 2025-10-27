import type { SupabaseClient } from "supabase";
import { PaymentHandler } from "./PaymentHandler.ts";

interface QueueMessage {
  msg_id: bigint
  read_ct: number
  vt: string
  enqueued_at: string
  message: {
    ticket_id: string // The ticket ID
    assigned_to: string // The UUID of the engineer's profile ID
    created_by: string // The UUID of the customer's profile ID
    marked_as_fixed_at: string | null // The timestamp of when the engineer marked the ticket as fixed
    auto_complete_timeout_at: string | null // The timestamp of when the ticket will be auto completed and a payment will be processed unless the customer confirms that the ticket is still broken, or it has been fixed
    retry_count?: number // Set internally by TicketConsumer
  }
}

interface ProcessResult {
  processed: number
  errors: number
}

/**
 * Consumer for processing ticket auto-complete messages from the queue
 * Handles reading, processing, and error handling for delayed ticket completion tasks
 */
export class TicketConsumer {
  private supabaseClient: SupabaseClient
  private paymentHandler: PaymentHandler
  private queueName: string = 'ticket_payments'
  private errorQueueName: string = 'ticket_payments_errors'
  private retrySleepSeconds: number = 1800
  private maxRetries: number = 3

  constructor(
    supabaseClient: SupabaseClient,
    paymentHandler: PaymentHandler,
    queueName: string,
    errorQueueName: string,
    retrySleepSeconds: number,
    maxRetries: number
  ) {
    this.supabaseClient = supabaseClient
    this.paymentHandler = paymentHandler
    this.queueName = queueName
    this.errorQueueName = errorQueueName
    this.retrySleepSeconds = retrySleepSeconds
    this.maxRetries = maxRetries
    console.debug('TicketConsumer: Initialized')
  }

  /**
   * Processes all ready messages in the queue
   * Continues processing until queue is empty or only delayed messages remain
   * @returns Object containing count of processed messages and errors
   */
  async processAllReadyMessages(): Promise<ProcessResult> {
    let processedCount = 0
    let errorCount = 0

    console.info('[TicketConsumer] Starting to process all ready messages')

    // Process messages until queue is empty or no more ready messages
    let message = await this.readOneMessage()

    while (message) {
      try {
        await this.processMessage(message)
        processedCount++
      } catch (error) {
        // Log error and continue to next message
        console.error('[TicketConsumer] Error processing message, continuing to next:', error)
        errorCount++
      }

      // Read next message
      message = await this.readOneMessage()
    }

    console.debug('[TicketConsumer] No more ready messages in queue')
    console.info(`[TicketConsumer] Processed ${processedCount} message(s), ${errorCount} error(s)`)
    return { processed: processedCount, errors: errorCount }
  }

  /**
   * Processes a single ticket auto-complete message
   * This is a no-op placeholder that will be replaced with actual logic
   * @param ticketId - The ID of the ticket to auto-complete
   */
  private async handleMessage(message: QueueMessage["message"]): Promise<void> {
    await this.paymentHandler.processPayment(message.ticket_id, message.created_by)
  }

  /**
   * Reads a single message from the queue
   * @returns The message if one is available, null if queue is empty
   */
  private async readOneMessage(): Promise<QueueMessage | null> {
    const { data: messages, error } = await this.supabaseClient.schema('pgmq_public').rpc('read', {
      queue_name: this.queueName,
      sleep_seconds: 30, // Visibility timeout in seconds (if processing fails, message becomes visible again)
      n: 1  // Process one message at a time
    }) as { data: QueueMessage[] | null, error: any }

    if (error) {
      console.error(`[TicketConsumer] Error reading from ${this.queueName} queue:`, error)
      throw error
    }

    if (!messages || messages.length === 0) {
      return null // Queue is empty (or no ready messages)
    }

    return messages[0]
  }

  /**
   * Processes a single message from the queue
   * Dequeues immediately to prevent duplicate processing
   * @param message - The message to process
   */
  private async processMessage(message: QueueMessage): Promise<void> {
    console.info(`[TicketConsumer] Raw message structure:`, JSON.stringify(message, null, 2))

    const {
      ticket_id,
    } = message.message

    console.info(`[TicketConsumer] Processing message ${message.msg_id} for ticket ${ticket_id}`)

    // Delete the message immediately to prevent duplicate processing
    const { error: deleteError } = await this.supabaseClient.schema('pgmq_public').rpc('delete', {
      queue_name: this.queueName,
      message_id: message.msg_id,
    })

    if (deleteError) {
      console.error(`[TicketConsumer] Failed to delete message ${message.msg_id}:`, deleteError)
      throw deleteError
    }

    console.info(`[TicketConsumer] Message ${message.msg_id} dequeued from queue`)

    try {
      await this.handleMessage(message.message)
      console.info(`[TicketConsumer] Successfully processed ticket ${ticket_id}`)

    } catch (processingError) {
      const error = processingError as Error
      console.error(`[TicketConsumer] Error processing ticket ${ticket_id}:`, error.message)

      await this.handleProcessingFailure(message, error)
      throw error
    }
  }

  /**
   * Handles processing failures by either re-queueing or sending to error queue
   * @param message - The message that failed to process
   * @param error - The error that occurred during processing
   */
  private async handleProcessingFailure(message: QueueMessage, error: Error): Promise<void> {
    const { ticket_id, retry_count } = message.message
    const currentRetryCount = retry_count || 0

    if (currentRetryCount < this.maxRetries) {
      // Re-queue the message with another 30-minute delay for retry
      const { error: requeueError } = await this.supabaseClient.schema('pgmq_public').rpc('send', {
        queue_name: this.queueName,
        message: {
          ...message.message,
          retry_count: currentRetryCount + 1 },
        sleep_seconds: this.retrySleepSeconds // 30 minutes in seconds
      })

      if (requeueError) {
        console.error(`[TicketConsumer] Failed to re-queue message for ticket ${ticket_id}:`, requeueError)
      } else {
        console.info(`[TicketConsumer] Re-queued ticket ${ticket_id} for retry ${currentRetryCount + 1}/${this.maxRetries} in 30 minutes`)
      }
    } else {
      // Max retries exceeded - send to error queue
      console.error(`[TicketConsumer] Max retries (${this.maxRetries}) exceeded for ticket ${ticket_id}, sending to error queue`)

      const { error: errorQueueError } = await this.supabaseClient.schema('pgmq_public').rpc('send', {
        queue_name: this.errorQueueName,
        message: {
          ticket_id,
          retry_count: currentRetryCount,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        sleep_seconds: 0
      })

      if (errorQueueError) {
        console.error(`[TicketConsumer] Failed to send to error queue for ticket ${ticket_id}:`, errorQueueError)
      }
    }
  }
}
