# Zapnutí synchronizace PC ↔ iPhone

OS v2.0 má synchronizační vrstvu připravenou přes Supabase.

1. V Supabase vytvoř nový projekt.
2. V SQL Editoru spusť celý obsah `supabase/schema.sql`.
3. V kořeni OS zkopíruj `.env.example` jako `.env`.
4. Do `.env` vlož URL projektu a publishable/anon key.
5. Spusť `npm install` a `npm run dev`.
6. V OS klikni nahoře na ikonu cloudu a vytvoř si účet.
7. Na iPhonu otevři stejnou nasazenou HTTPS verzi OS a přihlas se stejným účtem.

Data úkolů, projektů a workflow se synchronizují automaticky po změně a každou minutu.
Přílohy do 8 MB se při přidání odešlou také do cloudové tabulky. Lokální kopie zůstává v IndexedDB.

Důležité: aby iPhone mohl OS otevřít mimo pracovní PC, musí být aplikace nasazená na veřejné HTTPS adrese.
