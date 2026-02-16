-- Create UserInvitation table
create table "public"."UserInvitation" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "role" text not null default 'USER'::text,
    "organizationId" uuid not null,
    "token" text not null,
    "expiresAt" timestamp with time zone not null,
    "createdAt" timestamp with time zone default now(),
    "acceptedAt" timestamp with time zone,
    constraint "UserInvitation_pkey" primary key ("id"),
    constraint "UserInvitation_email_organizationId_key" unique ("email", "organizationId"),
    constraint "UserInvitation_organizationId_fkey" foreign key ("organizationId") references "public"."Organization"("id") on delete cascade
);

-- Enable RLS
alter table "public"."UserInvitation" enable row level security;

-- Policies
create policy "Admins can view invitations"
on "public"."UserInvitation"
for select
using (
  auth.uid() in (
    select "userId" from "OrganizationMember"
    where "organizationId" = "UserInvitation"."organizationId"
    and "role" = 'ADMIN'
  )
);

create policy "Admins can insert invitations"
on "public"."UserInvitation"
for insert
with check (
  auth.uid() in (
    select "userId" from "OrganizationMember"
    where "organizationId" = "UserInvitation"."organizationId"
    and "role" = 'ADMIN'
  )
);

create policy "Admins can delete invitations"
on "public"."UserInvitation"
for delete
using (
  auth.uid() in (
    select "userId" from "OrganizationMember"
    where "organizationId" = "UserInvitation"."organizationId"
    and "role" = 'ADMIN'
  )
);

-- Update handle_new_user to process invitations
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invitation_record record;
begin
  -- Check for pending invitation
  select * into invitation_record
  from "UserInvitation"
  where email = new.email
  and "acceptedAt" is null
  and "expiresAt" > now()
  order by "createdAt" desc
  limit 1;

  if found then
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

    return new;
  else
    -- Fallback for non-invited users (e.g. initial admin setup or open registration if allowed)
    -- In this closed system, maybe we just create a profile without org?
    -- For now, let's keep the basic profile creation if no invite found, but with no Org.
    
    insert into public."Profile" (id, email, name, role, "createdAt", "updatedAt")
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', new.email),
      'USER',
      now(),
      now()
    );
    
    return new;
  end if;
end;
$$;
