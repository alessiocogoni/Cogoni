-- Da incollare in Supabase > SQL Editor > Run
create table if not exists public.richieste (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null check (char_length(nome) between 1 and 100),
  email text not null check (char_length(email) between 3 and 150),
  tipo text check (char_length(tipo) <= 100),
  messaggio text not null check (char_length(messaggio) between 1 and 3000),
  stato text not null default 'nuova' check (stato in ('nuova','letta','archiviata'))
);

alter table public.richieste enable row level security;

-- Chiunque (dal sito) può solo INVIARE una richiesta nuova, mai leggerla.
create policy "il sito puo inviare" on public.richieste
  for insert to anon with check (stato = 'nuova');

-- Solo tu, dopo l'accesso, puoi leggere, aggiornare ed eliminare.
create policy "admin legge" on public.richieste for select to authenticated using (true);
create policy "admin aggiorna" on public.richieste for update to authenticated using (true) with check (true);
create policy "admin elimina" on public.richieste for delete to authenticated using (true);
