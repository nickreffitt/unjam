import { type Ticket, type TicketStatus, type CustomerProfile, type EngineerProfile } from '@common/types';

/**
 * Utility class for mapping Supabase database rows to Ticket objects
 * Handles conversion between database snake_case and TypeScript camelCase
 */
export class TicketSupabaseRowMapper {
  /**
   * Maps a database row to a Ticket object
   * Note: This requires profile data to be joined or fetched separately
   * The row should include nested profile objects for created_by and assigned_to
   */
  static mapRowToTicket(row: Record<string, any>): Ticket {
    // Map the customer profile (required)
    const createdBy: CustomerProfile = {
      id: row.created_by.id,
      name: row.created_by.name,
      type: 'customer',
      email: row.created_by.email,
      authId: row.created_by.auth_id,
      extensionInstalledAt: row.created_by.extension_installed_at
        ? new Date(row.created_by.extension_installed_at)
        : undefined,
      extensionInstalledVersion: row.created_by.extension_installed_version,
    };

    // Map the engineer profile (optional)
    let assignedTo: EngineerProfile | undefined = undefined;
    if (row.assigned_to) {
      assignedTo = {
        id: row.assigned_to.id,
        name: row.assigned_to.name,
        type: 'engineer',
        email: row.assigned_to.email,
        authId: row.assigned_to.auth_id,
        githubUsername: row.assigned_to.github_username,
        specialties: row.assigned_to.specialties || [],
        extensionInstalledAt: row.assigned_to.extension_installed_at
          ? new Date(row.assigned_to.extension_installed_at)
          : undefined,
        extensionInstalledVersion: row.assigned_to.extension_installed_version,
      };
    }

    // Calculate elapsed time
    const now = new Date();
    const startTime = row.claimed_at ? new Date(row.claimed_at) : new Date(row.created_at);
    const elapsedTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);

    return {
      id: row.id,
      status: row.status as TicketStatus,
      summary: row.summary,
      estimatedTime: row.estimated_time,
      problemDescription: row.problem_description,
      createdBy,
      assignedTo,
      createdAt: new Date(row.created_at),
      claimedAt: row.claimed_at ? new Date(row.claimed_at) : undefined,
      abandonedAt: row.abandoned_at ? new Date(row.abandoned_at) : undefined,
      markedAsFixedAt: row.marked_as_fixed_at ? new Date(row.marked_as_fixed_at) : undefined,
      autoCompleteTimeoutAt: row.auto_complete_timeout_at ? new Date(row.auto_complete_timeout_at) : undefined,
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
      elapsedTime,
      consoleLogs: row.console_logs || undefined,
      screenshot: row.screenshot || undefined,
    };
  }

  /**
   * Maps a Ticket object to a database row for insert/update operations
   * Note: This only includes the ticket's own fields, not the nested profile objects
   */
  static mapTicketToRow(ticket: Ticket): Record<string, any> {
    return {
      id: ticket.id,
      status: ticket.status,
      summary: ticket.summary,
      estimated_time: ticket.estimatedTime,
      problem_description: ticket.problemDescription,
      created_by: ticket.createdBy.id,
      assigned_to: ticket.assignedTo?.id || null,
      created_at: ticket.createdAt.toISOString(),
      claimed_at: ticket.claimedAt?.toISOString() || null,
      abandoned_at: ticket.abandonedAt?.toISOString() || null,
      marked_as_fixed_at: ticket.markedAsFixedAt?.toISOString() || null,
      auto_complete_timeout_at: ticket.autoCompleteTimeoutAt?.toISOString() || null,
      resolved_at: ticket.resolvedAt?.toISOString() || null,
      console_logs: ticket.consoleLogs || null,
      screenshot: ticket.screenshot || null,
    };
  }
}
