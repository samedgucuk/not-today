-- NOT TODAY v1: run in Supabase SQL Editor (new, empty project).
-- The only trusted currency operations are SECURITY DEFINER RPCs.
-- No user can update another user's data or directly edit wallet balance.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  buddy_name text not null default 'Mimo',
  quit_at timestamptz not null default now(),
  source_type text not null default 'heated' check (source_type in ('heated','cigarette','both','other')),
  daily_count integer not null default 20 check (daily_count between 0 and 100),
  pack_price numeric(10,2) not null default 0 check (pack_price between 0 and 100000),
  onboarding_done boolean not null default false,
  consent_at timestamptz,
  consent_version text,
  layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint display_name_length check (char_length(display_name) <= 60),
  constraint buddy_name_length check (char_length(buddy_name) between 1 and 40)
);

create table if not exists public.game_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  coins integer not null default 20 check (coins >= 0),
  total_earned integer not null default 20 check (total_earned >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_catalog (
  item_id text primary key,
  title text not null,
  description text not null,
  price integer not null check(price >= 0),
  emoji text not null,
  category text not null check(category in ('room','nature','places','buddy')),
  zone text not null check(zone in ('room','garden','terrace')),
  level integer not null check(level between 1 and 3),
  sort_order integer not null default 0
);

create table if not exists public.purchases (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.shop_catalog(item_id),
  purchased_at timestamptz not null default now(),
  primary key(user_id,item_id)
);

create table if not exists public.moment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('breathe','music','memory','bubbles','jar')),
  trigger_name text not null check(trigger_name in ('habit','tea','stress','restless','bored','other')),
  intensity_before integer not null check (intensity_before between 1 and 5),
  intensity_after integer not null check (intensity_after between 1 and 5),
  result text not null check(result in ('passed','ongoing')),
  seconds_spent integer not null check (seconds_spent between 0 and 3600),
  reward integer not null default 0,
  ended_at timestamptz not null default now()
);
create index if not exists moment_events_user_ended_idx on public.moment_events(user_id,ended_at desc);

create table if not exists public.jar_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'reason' check (category in ('reason','memory','promise')),
  body text not null check (char_length(body) between 1 and 800),
  created_at timestamptz not null default now()
);
create index if not exists jar_notes_user_created_idx on public.jar_notes(user_id,created_at desc);

create table if not exists public.lapse_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_quit_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

-- Explicit RLS: ownership for every exposed user table.
alter table public.profiles enable row level security;
alter table public.game_states enable row level security;
alter table public.shop_catalog enable row level security;
alter table public.purchases enable row level security;
alter table public.moment_events enable row level security;
alter table public.jar_notes enable row level security;
alter table public.lapse_events enable row level security;

revoke all on public.profiles, public.game_states, public.shop_catalog,
  public.purchases, public.moment_events, public.jar_notes,
  public.lapse_events from anon, authenticated;

grant select on public.profiles, public.game_states, public.shop_catalog,
  public.purchases, public.moment_events, public.jar_notes,
  public.lapse_events to authenticated;
grant update(display_name,buddy_name,quit_at,source_type,daily_count,pack_price,onboarding_done,consent_at,consent_version,layout,updated_at)
  on public.profiles to authenticated;
grant insert, delete on public.jar_notes to authenticated;

drop policy if exists profiles_read_self on public.profiles;
create policy profiles_read_self on public.profiles for select to authenticated
  using ((select auth.uid())=user_id);
drop policy if exists profiles_edit_self on public.profiles;
create policy profiles_edit_self on public.profiles for update to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists game_read_self on public.game_states;
create policy game_read_self on public.game_states for select to authenticated
  using ((select auth.uid())=user_id);
drop policy if exists catalog_read on public.shop_catalog;
create policy catalog_read on public.shop_catalog for select to authenticated using (true);
drop policy if exists purchases_read_self on public.purchases;
create policy purchases_read_self on public.purchases for select to authenticated
  using ((select auth.uid())=user_id);
drop policy if exists moments_read_self on public.moment_events;
create policy moments_read_self on public.moment_events for select to authenticated
  using ((select auth.uid())=user_id);
drop policy if exists jar_read_self on public.jar_notes;
create policy jar_read_self on public.jar_notes for select to authenticated
  using ((select auth.uid())=user_id);
drop policy if exists jar_add_self on public.jar_notes;
create policy jar_add_self on public.jar_notes for insert to authenticated
  with check ((select auth.uid())=user_id);
drop policy if exists jar_delete_self on public.jar_notes;
create policy jar_delete_self on public.jar_notes for delete to authenticated
  using ((select auth.uid())=user_id);
drop policy if exists lapses_read_self on public.lapse_events;
create policy lapses_read_self on public.lapse_events for select to authenticated
  using ((select auth.uid())=user_id);

-- Automatically create the player and starter coins on first login.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.game_states(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists not_today_new_user on auth.users;
create trigger not_today_new_user after insert on auth.users
for each row execute function public.handle_new_user();
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Trusted shop: transactions, ownership, unlock requirements, and balance are server checked.
create or replace function public.buy_item(p_item_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_catalog%rowtype;
  v_wallet public.game_states%rowtype;
  v_has_garden boolean;
  v_has_terrace boolean;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_item from public.shop_catalog where item_id=p_item_id;
  if not found then raise exception 'Item not found'; end if;
  select * into v_wallet from public.game_states where user_id=v_uid for update;
  if not found then raise exception 'Player data not ready'; end if;
  if exists(select 1 from public.purchases where user_id=v_uid and item_id=p_item_id) then
    raise exception 'Already owned';
  end if;
  select exists(select 1 from public.purchases where user_id=v_uid and item_id='garden_key') into v_has_garden;
  select exists(select 1 from public.purchases where user_id=v_uid and item_id='terrace_key') into v_has_terrace;
  if v_item.level=2 and not v_has_garden then raise exception 'Open the garden first'; end if;
  if v_item.level=3 and not v_has_terrace then raise exception 'Open the terrace first'; end if;
  if v_item.item_id='terrace_key' and not v_has_garden then raise exception 'Open the garden first'; end if;
  if v_wallet.coins < v_item.price then raise exception 'Not enough stars'; end if;
  update public.game_states set coins=coins-v_item.price,updated_at=now() where user_id=v_uid;
  insert into public.purchases(user_id,item_id) values(v_uid,p_item_id);
  return jsonb_build_object('ok',true,'coins',v_wallet.coins-v_item.price,'item_id',p_item_id);
end;
$$;

-- Recording an urge never deletes progress. Rewards are throttled on the server.
create or replace function public.complete_moment(
  p_kind text, p_trigger text, p_before integer,
  p_after integer, p_seconds integer, p_result text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.game_states%rowtype;
  v_last timestamptz;
  v_reward integer := 0;
  v_new_coins integer;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('breathe','music','memory','bubbles','jar')
     or p_trigger not in ('habit','tea','stress','restless','bored','other')
     or p_result not in ('passed','ongoing')
     or p_before not between 1 and 5 or p_after not between 1 and 5
     or p_seconds not between 0 and 3600 then
       raise exception 'Invalid activity';
  end if;
  select * into v_wallet from public.game_states where user_id=v_uid for update;
  if not found then raise exception 'Player data not ready'; end if;
  select max(ended_at) into v_last from public.moment_events where user_id=v_uid;
  if v_last is null or v_last < now()-interval '90 seconds' then
    v_reward := case when p_result='passed' then 12 else 6 end;
  end if;
  insert into public.moment_events(user_id,kind,trigger_name,intensity_before,
    intensity_after,seconds_spent,result,reward)
    values(v_uid,p_kind,p_trigger,p_before,p_after,p_seconds,p_result,v_reward);
  update public.game_states set coins=coins+v_reward,
    total_earned=total_earned+v_reward,updated_at=now()
    where user_id=v_uid returning coins into v_new_coins;
  return jsonb_build_object('ok',true,'earned',v_reward,'coins',v_new_coins);
end;
$$;

-- A lapse changes only the *current* streak, not the world, memories, or achievements.
create or replace function public.record_lapse()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_previous timestamptz;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select quit_at into v_previous from public.profiles where user_id=v_uid for update;
  if v_previous is null then raise exception 'Profile not found'; end if;
  insert into public.lapse_events(user_id,previous_quit_at) values(v_uid,v_previous);
  update public.profiles set quit_at=now(),updated_at=now() where user_id=v_uid;
  return jsonb_build_object('ok',true,'quit_at',now());
end;
$$;

-- Account deletion, including all app data by cascading foreign keys.
-- Should be invoked only after a second confirmation in the user interface.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  delete from auth.users where id=v_uid;
end;
$$;
revoke all on function public.buy_item(text),
  public.complete_moment(text,text,integer,integer,integer,text),
  public.record_lapse(), public.delete_my_account()
  from public, anon, authenticated;
grant execute on function public.buy_item(text),
  public.complete_moment(text,text,integer,integer,integer,text),
  public.record_lapse(), public.delete_my_account() to authenticated;

-- Seed the curated catalog below. App display data is also defined in src/catalog.js
-- for the offline design demo; logged-in users fetch these authoritative rows.

insert into public.shop_catalog(item_id,title,description,price,emoji,category,zone,level,sort_order) values
  ('plant','Mutlu saksı','Pencere önünde minik bir dost.',12,'🪴','room','room',1,1),
  ('lamp','Akşam lambası','Odanı sıcak bir ışıkla doldurur.',18,'🛋️','room','room',1,2),
  ('books','Kitap köşesi','Dostun bazen burada okur.',22,'📚','room','room',1,3),
  ('rug','Yumuşak halı','Minik patiler için.',16,'🧶','room','room',1,4),
  ('teacup','Çay köşesi','Çay artık yeni bir ritüel.',20,'🍵','room','room',1,5),
  ('window','Güneşli pencere','Yeni sabahlar için.',30,'🪟','room','room',1,6),
  ('radio','Minik radyo','Evin kendi melodisi.',27,'📻','room','room',1,7),
  ('pillow','Bulut minder','Biraz dinlenme vakti.',14,'☁️','room','room',1,8),
  ('garden_key','Bahçe kapısı','Dışarıda yeni bir dünya açılır.',55,'🌿','places','garden',1,9),
  ('sunflower','Ayçiçeği','Güneşe dönen bir çiçek.',17,'🌻','nature','garden',2,10),
  ('tree','Minik ağaç','Bahçenin gölgeli köşesi.',26,'🌳','nature','garden',2,11),
  ('bench','Bahçe bankı','Beraber oturmalık.',21,'🪑','nature','garden',2,12),
  ('pond','Küçük gölet','Su sesi, sakin bir dünya.',38,'🪷','nature','garden',2,13),
  ('butterflies','Kelebekler','Bahçeye hayat geliyor.',24,'🦋','nature','garden',2,14),
  ('terrace_key','Teras kapısı','Biraz daha gökyüzü.',100,'🌤️','places','terrace',2,15),
  ('telescope','Teleskop','Yıldızları izleme zamanı.',44,'🔭','nature','terrace',3,16),
  ('lantern','Fenerler','Akşam ışıkları.',31,'🏮','nature','terrace',3,17),
  ('cloud','Bulut salıncak','Hayal kurma köşesi.',48,'🌥️','nature','terrace',3,18),
  ('scarf','Mercan atkı','Dostuna minik bir dokunuş.',20,'🧣','buddy','room',1,19),
  ('cap','Küçük bere','Birlikte sıcacık.',23,'🧢','buddy','room',1,20),
  ('bow','Pembe kurdele','Neşeli bir aksesuar.',18,'🎀','buddy','room',1,21),
  ('star','Yıldız rozeti','Küçük bir kutlama.',30,'⭐','buddy','room',1,22)
on conflict(item_id) do update set title=excluded.title,description=excluded.description,price=excluded.price,emoji=excluded.emoji,category=excluded.category,zone=excluded.zone,level=excluded.level,sort_order=excluded.sort_order;
