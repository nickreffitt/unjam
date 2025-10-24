-- Add engineer-specific broadcast channels for repository collaborators and project repositories
-- This ensures engineers only receive notifications about their own collaborations, not all customer activity

-- Update the repository collaborator broadcast function to also broadcast to the engineer's channel
CREATE OR REPLACE FUNCTION public.broadcast_repository_collaborator_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID;
  v_engineer_id UUID;
BEGIN
  -- Get customer_id from the repository and engineer_id from the collaborator
  IF TG_OP = 'DELETE' THEN
    SELECT customer_id INTO v_customer_id
    FROM project_repositories
    WHERE id = OLD.repository_id;
    v_engineer_id := OLD.engineer_id;
  ELSE
    SELECT customer_id INTO v_customer_id
    FROM project_repositories
    WHERE id = NEW.repository_id;
    v_engineer_id := NEW.engineer_id;
  END IF;

  -- Handle INSERT events
  IF TG_OP = 'INSERT' THEN
    -- Broadcast to customer's channel (for customer's UI)
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    -- Broadcast to engineer's channel (for engineer's UI)
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_engineer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    RETURN NEW;
  END IF;

  -- Handle UPDATE events
  IF TG_OP = 'UPDATE' THEN
    -- Broadcast to customer's channel
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    -- Broadcast to engineer's channel
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_engineer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    RETURN NEW;
  END IF;

  -- Handle DELETE events
  IF TG_OP = 'DELETE' THEN
    -- Broadcast to customer's channel
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    -- Broadcast to engineer's channel
    PERFORM realtime.broadcast_changes(
      'repository-collaborators-' || v_engineer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Update the project repository broadcast function to also broadcast to engineers who are collaborators
CREATE OR REPLACE FUNCTION public.broadcast_project_repository_changes()
RETURNS trigger
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_customer_id UUID;
  v_repository_id UUID;
  v_collaborator RECORD;
BEGIN
  -- Get customer_id and repository_id
  IF TG_OP = 'DELETE' THEN
    v_customer_id := OLD.customer_id;
    v_repository_id := OLD.id;
  ELSE
    v_customer_id := NEW.customer_id;
    v_repository_id := NEW.id;
  END IF;

  -- Handle INSERT events
  IF TG_OP = 'INSERT' THEN
    -- Broadcast to customer's channel
    PERFORM realtime.broadcast_changes(
      'project-repositories-' || v_customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    -- Broadcast to all engineer collaborators for this repository
    FOR v_collaborator IN
      SELECT engineer_id
      FROM repository_collaborators
      WHERE repository_id = v_repository_id
      AND removed_at IS NULL
    LOOP
      PERFORM realtime.broadcast_changes(
        'project-repositories-' || v_collaborator.engineer_id::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Handle UPDATE events
  IF TG_OP = 'UPDATE' THEN
    -- Broadcast to customer's channel
    PERFORM realtime.broadcast_changes(
      'project-repositories-' || v_customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    -- Broadcast to all engineer collaborators for this repository
    FOR v_collaborator IN
      SELECT engineer_id
      FROM repository_collaborators
      WHERE repository_id = v_repository_id
      AND removed_at IS NULL
    LOOP
      PERFORM realtime.broadcast_changes(
        'project-repositories-' || v_collaborator.engineer_id::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Handle DELETE events
  IF TG_OP = 'DELETE' THEN
    -- Broadcast to customer's channel
    PERFORM realtime.broadcast_changes(
      'project-repositories-' || v_customer_id::text,
      TG_OP,
      TG_OP,
      TG_TABLE_NAME,
      TG_TABLE_SCHEMA,
      NEW,
      OLD
    );

    -- Broadcast to all engineer collaborators for this repository
    FOR v_collaborator IN
      SELECT engineer_id
      FROM repository_collaborators
      WHERE repository_id = v_repository_id
      AND removed_at IS NULL
    LOOP
      PERFORM realtime.broadcast_changes(
        'project-repositories-' || v_collaborator.engineer_id::text,
        TG_OP,
        TG_OP,
        TG_TABLE_NAME,
        TG_TABLE_SCHEMA,
        NEW,
        OLD
      );
    END LOOP;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;
