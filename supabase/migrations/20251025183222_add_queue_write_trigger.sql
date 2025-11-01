-- Create lookup table for ticket queue messages
create table if not exists public.ticket_queue_messages (
  ticket_id uuid not null primary key references public.tickets(id) on delete cascade,
  queue_message_id bigint not null,
  created_at timestamp with time zone default now()
);

comment on table public.ticket_queue_messages is 'Lookup table mapping tickets to their queue message IDs for cleanup when status changes';

-- Enable RLS on ticket_queue_messages
alter table public.ticket_queue_messages enable row level security;

-- Restrictive policy to prevent direct access - table should only be accessed via SECURITY DEFINER trigger
-- This policy explicitly denies all direct operations, ensuring all access goes through the trigger function
create policy "No direct access - use trigger only"
on public.ticket_queue_messages
for all
using (false)
with check (false);

-- Create trigger function to write to queue when ticket transitions to 'awaiting-confirmation' or 'pending-payment'
create or replace function public.enqueue_ticket_payments()
returns trigger
security definer
set search_path = public, pgmq
language plpgsql
as $$
declare
  msg_id bigint;
  existing_msg_id bigint;
  seconds_until_timeout integer;
begin
  -- If status transitions TO 'awaiting-confirmation', enqueue the ticket
  if NEW.status = 'awaiting-confirmation' and (OLD.status IS NULL OR OLD.status != 'awaiting-confirmation') then
    -- Send message to queue with ticket details and capture message ID
    -- Calculate delay based on difference between auto_complete_timeout_at and marked_as_fixed_at
    select * into msg_id from pgmq.send(
      queue_name := 'ticket_payments',
      msg := jsonb_build_object(
        'ticket_id', NEW.id,
        'assigned_to', NEW.assigned_to,
        'created_by', NEW.created_by,
        'marked_as_fixed_at', NEW.marked_as_fixed_at,
        'auto_complete_timeout_at', NEW.auto_complete_timeout_at
      ),
      delay := GREATEST(0, EXTRACT(EPOCH FROM (NEW.auto_complete_timeout_at - NEW.marked_as_fixed_at))::integer)
    );

    -- Store the message ID in the lookup table
    insert into public.ticket_queue_messages (ticket_id, queue_message_id)
    values (NEW.id, msg_id)
    on conflict (ticket_id) do update set queue_message_id = msg_id, created_at = now();
  end if;

  -- If status transitions TO 'pending-payment', enqueue immediately (unless coming from 'awaiting-confirmation' with imminent timeout)
  if NEW.status = 'pending-payment' and (OLD.status IS NULL OR OLD.status != 'pending-payment') then
    -- Check if we're transitioning from 'awaiting-confirmation' and if the timeout is within 5 seconds
    if OLD.status = 'awaiting-confirmation' and OLD.auto_complete_timeout_at is not null then
      seconds_until_timeout := EXTRACT(EPOCH FROM (OLD.auto_complete_timeout_at - now()))::integer;

      -- If timeout is within 5 seconds, don't enqueue a new message (let the existing one process)
      if seconds_until_timeout <= 5 then
        -- Update the lookup table to keep the existing message ID
        -- No new message is sent, existing message will handle payment
        return NEW;
      end if;
    end if;

    -- Delete any existing queued message before creating a new one
    select queue_message_id into existing_msg_id
    from public.ticket_queue_messages
    where ticket_id = NEW.id;

    if existing_msg_id is not null then
      perform pgmq.delete(
        queue_name := 'ticket_payments',
        msg_id := existing_msg_id
      );
    end if;

    -- Send immediate message (delay = 0)
    select * into msg_id from pgmq.send(
      queue_name := 'ticket_payments',
      msg := jsonb_build_object(
        'ticket_id', NEW.id,
        'assigned_to', NEW.assigned_to,
        'created_by', NEW.created_by,
        'marked_as_fixed_at', NEW.marked_as_fixed_at,
        'auto_complete_timeout_at', NEW.auto_complete_timeout_at
      ),
      delay := 0
    );

    -- Store the new message ID in the lookup table
    insert into public.ticket_queue_messages (ticket_id, queue_message_id)
    values (NEW.id, msg_id)
    on conflict (ticket_id) do update set queue_message_id = msg_id, created_at = now();
  end if;

  -- If status transitions AWAY from 'awaiting-confirmation' (but not to 'pending-payment'), delete the queued message
  if OLD.status = 'awaiting-confirmation' and NEW.status != 'awaiting-confirmation' and NEW.status != 'pending-payment' then
    -- Get the message ID from the lookup table
    select queue_message_id into existing_msg_id
    from public.ticket_queue_messages
    where ticket_id = NEW.id;

    -- Delete the message from the queue if it exists
    if existing_msg_id is not null then
      perform pgmq.delete(
        queue_name := 'ticket_payments',
        msg_id := existing_msg_id
      );

      -- Remove the lookup entry
      delete from public.ticket_queue_messages where ticket_id = NEW.id;
    end if;
  end if;

  return NEW;
end;
$$;

comment on function public.enqueue_ticket_payments() is 'Trigger function that writes to ticket_payments queue when a ticket status transitions to awaiting-confirmation or pending-payment. Runs with SECURITY DEFINER to bypass RLS.';

-- Create trigger on tickets table
drop trigger if exists enqueue_ticket_payments on public.tickets;
create trigger enqueue_ticket_payments
  after update on public.tickets
  for each row
  execute function public.enqueue_ticket_payments();

comment on trigger enqueue_ticket_payments on public.tickets is 'Automatically enqueues tickets for processing when their status becomes awaiting-confirmation or pending-payment';
