-- Fix handle_new_user to be idempotent and handle email conflicts
-- This prevents "duplicate key value violates unique constraint profile_email_key"
-- by updating the existing profile's ID when a new auth user is created with the same email.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invitation_record record;
  existing_profile_id uuid;
begin
  -- 1. Check for pending invitation
  select * into invitation_record
  from "UserInvitation"
  where email = new.email
  and "acceptedAt" is null
  and "expiresAt" > now()
  order by "createdAt" desc
  limit 1;

  -- 2. Check if a profile already exists with this email
  select id into existing_profile_id from public."Profile" where email = new.email;

  if found then
    -- CASE: Profile already exists (Ghost profile or re-invitation after auth deletion)
    -- We update the existing profile to match the new Auth ID.
    -- Because of ON UPDATE CASCADE, this will sync all related tables (AuditLog, OrganizationMember, etc.)
    
    update public."Profile"
    set 
      id = new.id, -- Update PK to sync with new auth.users.id
      name = coalesce(new.raw_user_meta_data->>'full_name', name, new.email),
      "organizationId" = coalesce(invitation_record."organizationId", "organizationId"),
      role = coalesce(invitation_record.role, role, 'MEMBER'),
      "updatedAt" = now()
    where email = new.email;

    -- 3. If there was an invitation, ensure membership exists
    if invitation_record.id is not null then
        insert into public."OrganizationMember" ("id", "organizationId", "userId", "role")
        values (
          gen_random_uuid(),
          invitation_record."organizationId",
          new.id,
          invitation_record.role
        )
        on conflict ("organizationId", "userId") do update
        set role = excluded.role, status = 'ACTIVE';

        -- Mark invitation as accepted
        update "UserInvitation"
        set "acceptedAt" = now()
        where id = invitation_record.id;
    end if;

    return new;
  end if;

  -- CASE: Normal flow (No existing profile)
  if invitation_record.id is not null then
    -- Create Profile linked to Organization from Invitation
    insert into public."Profile" (id, email, name, role, "organizationId", "createdAt", "updatedAt")
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      invitation_record.role,
      invitation_record."organizationId",
      now(),
      now()
    );

    -- Create OrganizationMember entry
    insert into public."OrganizationMember" ("id", "organizationId", "userId", "role")
    values (
      gen_random_uuid(),
      invitation_record."organizationId",
      new.id,
      invitation_record.role
    );

    -- Mark invitation as accepted
    update "UserInvitation"
    set "acceptedAt" = now()
    where id = invitation_record.id;
  else
    -- Fallback for non-invited users
    insert into public."Profile" (id, email, name, role, "createdAt", "updatedAt")
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      'MEMBER',
      now(),
      now()
    );
  end if;

  return new;
end;
$$;
