-- Candor Database Migration
-- Run this in the Supabase SQL Editor for project: ofrrtnkousbcqkxkzgom

-- TABLES

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  traits jsonb default '{}',
  match_ready boolean default false,
  analysis_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('ai', 'user')) not null,
  participant_ids uuid[] not null,
  last_message text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id text not null,
  content text not null,
  role text check (role in ('user', 'assistant')) not null,
  created_at timestamptz default now()
);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid references auth.users(id),
  user_b_id uuid references auth.users(id),
  compatibility_score real default 0,
  match_reason text,
  conversation_id uuid references conversations(id),
  created_at timestamptz default now(),
  unique(user_a_id, user_b_id)
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

alter table profiles add column if not exists match_ready boolean default false;
alter table profiles add column if not exists analysis_count integer default 0;
alter table matches add column if not exists match_reason text;

-- INDEXES

create index if not exists idx_messages_conversation
  on messages(conversation_id, created_at);

create index if not exists idx_matches_users
  on matches(user_a_id, user_b_id);

create index if not exists idx_conversations_participants
  on conversations using gin(participant_ids);

-- ROW LEVEL SECURITY

alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table matches enable row level security;
alter table waitlist enable row level security;

drop policy if exists "Users manage own profile" on profiles;
create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Participants access conversations" on conversations;
create policy "Participants access conversations"
  on conversations for all
  using (auth.uid() = any(participant_ids))
  with check (auth.uid() = any(participant_ids));

drop policy if exists "Participants access messages" on messages;
create policy "Participants access messages"
  on messages for all
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and auth.uid() = any(conversations.participant_ids)
    )
  )
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and auth.uid() = any(conversations.participant_ids)
    )
  );

drop policy if exists "Users read own matches" on matches;
create policy "Users read own matches"
  on matches for select using (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  );

drop policy if exists "Users create own matches" on matches;
create policy "Users create own matches"
  on matches for insert with check (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  );

drop policy if exists "Users update own matches" on matches;
create policy "Users update own matches"
  on matches for update
  using (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  )
  with check (
    auth.uid() = user_a_id or auth.uid() = user_b_id
  );

drop policy if exists "Anyone can join waitlist" on waitlist;
create policy "Anyone can join waitlist"
  on waitlist for insert with check (true);

-- REALTIME

do $$
begin
  begin
    alter publication supabase_realtime add table messages;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table profiles;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table matches;
  exception
    when duplicate_object then null;
  end;
end
$$;

-- AUTO-CREATE PROFILE ON SIGNUP

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
