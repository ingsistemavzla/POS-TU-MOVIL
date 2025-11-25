-- Create invitations table for role-based magic-link invites
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','manager','cashier')),
  invited_by uuid,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists invitations_company_id_idx on public.invitations(company_id);
create index if not exists invitations_email_idx on public.invitations(email);

-- Enable RLS
alter table public.invitations enable row level security;

-- Policies
-- Allow company admins to manage invitations for their company
create policy if not exists "invitations_admin_select" on public.invitations
  for select using (
    exists (
      select 1 from public.users u
      where u.auth_user_id = auth.uid()
        and u.company_id = invitations.company_id
        and u.role = 'admin'
    )
  );

create policy if not exists "invitations_admin_insert" on public.invitations
  for insert with check (
    exists (
      select 1 from public.users u
      where u.auth_user_id = auth.uid()
        and u.company_id = company_id
        and u.role = 'admin'
    )
  );

create policy if not exists "invitations_admin_update" on public.invitations
  for update using (
    exists (
      select 1 from public.users u
      where u.auth_user_id = auth.uid()
        and u.company_id = invitations.company_id
        and u.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.users u
      where u.auth_user_id = auth.uid()
        and u.company_id = invitations.company_id
        and u.role = 'admin'
    )
  );

-- Allow the invited user to read their own invitations by email (after login)
create policy if not exists "invitations_self_by_email" on public.invitations
  for select using (
    lower(email) = lower(coalesce(
      (select email from auth.users au where au.id = auth.uid()), ''
    ))
  );
