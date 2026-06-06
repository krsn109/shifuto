-- Create daily_headcounts table
create table if not exists daily_headcounts (
  date date not null primary key,
  morning integer default 2,
  afternoon integer default 2,
  night integer default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table daily_headcounts enable row level security;

-- Policies
drop policy if exists "Daily headcounts are viewable by everyone." on daily_headcounts;
create policy "Daily headcounts are viewable by everyone." on daily_headcounts
  for select using (true);

drop policy if exists "Only admins can manage daily headcounts." on daily_headcounts;
create policy "Only admins can manage daily headcounts." on daily_headcounts
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
