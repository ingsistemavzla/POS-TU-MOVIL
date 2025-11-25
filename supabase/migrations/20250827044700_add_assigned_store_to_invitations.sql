-- Add assigned_store_id to invitations so admin assigns a store at invite time
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id);

CREATE INDEX IF NOT EXISTS invitations_assigned_store_id_idx ON public.invitations(assigned_store_id);

-- Optional: ensure the store belongs to the same company via trigger
CREATE OR REPLACE FUNCTION public.validate_invitation_store_company()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_store_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = NEW.assigned_store_id AND s.company_id = NEW.company_id
    ) THEN
      RAISE EXCEPTION 'Assigned store does not belong to the same company';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invitation_store_company ON public.invitations;
CREATE TRIGGER trg_validate_invitation_store_company
  BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invitation_store_company();
