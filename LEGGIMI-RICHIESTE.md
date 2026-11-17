# Richieste dal sito: come attivare l'area admin

Le richieste del modulo contatti vengono salvate in un database Supabase (gratuito) e lette dalla pagina `admin.html`.
Il messaggio continua ad arrivarti anche per email.

1. Crea un account su https://supabase.com e un nuovo progetto (regione Europa, es. Frankfurt).
2. Apri **SQL Editor**, incolla il contenuto di `richieste.sql` e premi **Run**.
3. Apri **Authentication > Users > Add user** e crea il tuo utente (email e password, spunta "Auto Confirm User").
   In **Authentication > Sign In / Providers** disattiva "Allow new users to sign up".
4. Apri **Project Settings > API** e copia *Project URL* e la chiave *anon public*.
5. Incollali in `supabase-config.js` (oppure mandali a Claude).
6. Apri `https://alessiocogoni.github.io/Cogoni/admin.html` e accedi.
