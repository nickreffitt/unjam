create extension IF NOT EXISTS "pgmq";

-- Create pgmq_public schema for PostgREST-accessible functions
create schema if not exists pgmq_public;
grant usage on schema pgmq_public to postgres, service_role;

-- Drop existing queues if they exist (to handle partial migrations)
select pgmq.drop_queue('ticket_payments', true);
select pgmq.drop_queue('ticket_payments_error', true);

-- Create queues
select pgmq.create('ticket_payments');
select pgmq.create('ticket_payments_error');

-- Enable RLS on queue tables
alter table pgmq.q_ticket_payments enable row level security;
alter table pgmq.q_ticket_payments_error enable row level security;

-- Wrapper functions for pgmq operations
create or replace function pgmq_public.pop(
  queue_name text
) returns setof pgmq.message_record
language plpgsql
set search_path = ''
as $$
begin
  return query select * from pgmq.pop(queue_name := queue_name);
end;
$$;
comment on function pgmq_public.pop(queue_name text) is 'Retrieves and locks the next message from the specified queue.';

create or replace function pgmq_public.send(
  queue_name text,
  message jsonb,
  sleep_seconds integer default 0
) returns setof bigint
language plpgsql
set search_path = ''
as $$
begin
  return query select * from pgmq.send(queue_name := queue_name, msg := message, delay := sleep_seconds);
end;
$$;
comment on function pgmq_public.send(queue_name text, message jsonb, sleep_seconds integer) is 'Sends a message to the specified queue, optionally delaying its availability by a number of seconds.';

create or replace function pgmq_public.send_batch(
  queue_name text,
  messages jsonb[],
  sleep_seconds integer default 0
) returns setof bigint
language plpgsql
set search_path = ''
as $$
begin
  return query select * from pgmq.send_batch(queue_name := queue_name, msgs := messages, delay := sleep_seconds);
end;
$$;
comment on function pgmq_public.send_batch(queue_name text, messages jsonb[], sleep_seconds integer) is 'Sends a batch of messages to the specified queue, optionally delaying their availability by a number of seconds.';

create or replace function pgmq_public.archive(
  queue_name text,
  message_id bigint
) returns boolean
language plpgsql
set search_path = ''
as $$
begin
  return pgmq.archive(queue_name := queue_name, msg_id := message_id);
end;
$$;
comment on function pgmq_public.archive(queue_name text, message_id bigint) is 'Archives a message by moving it from the queue to a permanent archive.';

create or replace function pgmq_public.delete(
  queue_name text,
  message_id bigint
) returns boolean
language plpgsql
set search_path = ''
as $$
begin
  return pgmq.delete(queue_name := queue_name, msg_id := message_id);
end;
$$;
comment on function pgmq_public.delete(queue_name text, message_id bigint) is 'Permanently deletes a message from the specified queue.';

create or replace function pgmq_public.read(
  queue_name text,
  sleep_seconds integer,
  n integer
) returns setof pgmq.message_record
language plpgsql
set search_path = ''
as $$
begin
  return query select * from pgmq.read(queue_name := queue_name, vt := sleep_seconds, qty := n);
end;
$$;
comment on function pgmq_public.read(queue_name text, sleep_seconds integer, n integer) is 'Reads up to "n" messages from the specified queue with an optional "sleep_seconds" (visibility timeout).';

-- Grant execute permissions on pgmq_public functions (only postgres and service_role)
grant execute on function pgmq_public.pop(text) to postgres, service_role;
grant execute on function pgmq_public.send(text, jsonb, integer) to postgres, service_role;
grant execute on function pgmq_public.send_batch(text, jsonb[], integer) to postgres, service_role;
grant execute on function pgmq_public.archive(text, bigint) to postgres, service_role;
grant execute on function pgmq_public.delete(text, bigint) to postgres, service_role;
grant execute on function pgmq_public.read(text, integer, integer) to postgres, service_role;

-- Grant privileges on pgmq schema (only postgres and service_role)
grant all privileges on all tables in schema pgmq to postgres, service_role;
alter default privileges in schema pgmq grant all privileges on tables to postgres, service_role;
grant usage on schema pgmq to postgres, service_role;
grant usage, select, update on all sequences in schema pgmq to service_role;
alter default privileges in schema pgmq grant usage, select, update on sequences to service_role;

-- Create RLS policies for postgres and service_role
create policy "postgres and service_role full access on ticket_payments"
  on pgmq.q_ticket_payments
  for all
  to postgres, service_role
  using (true)
  with check (true);

create policy "postgres and service_role full access on ticket_payments_error"
  on pgmq.q_ticket_payments_error
  for all
  to postgres, service_role
  using (true)
  with check (true);
