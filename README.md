# Aktiediagram (PHP)

PHP-version av aktieappen för ett delat webbhotell (one.com): jämför aktiekurser i ett interaktivt diagram, registrera köp, sälj och utdelningar och följ portföljresultat. Beteendet beskrivs i [OpenSpec](openspec/specs/aktiediagram/spec.md).

Den ursprungliga lokala Python-versionen finns i [mattihjelm/aktiediagram](https://github.com/mattihjelm/aktiediagram). PHP-versionen läser samma datafiler och har sedan dess fått bland annat konton per transaktion, borttagning av transaktioner, minutdiagram med arkiv, flera skal- och mätlägen, orealiserat resultat och telefonlayout.

Appen kräver PHP 8.1 eller senare med curl och mbstring, Apache med `.htaccess` och utgående HTTPS mot Yahoo Finance. Ingen Python, databas eller skalåtkomst behövs.

## Katalogstruktur

```
public/    webbroten: sidor, API och JavaScript
private/   programkod, konfiguration och data; ska inte kunna nås från webben
  data/    aktier.csv, aktiekop.csv, aktievy.json och kurscache
```

## Driftsättning på one.com

I one.com:s filhanterare är översta nivån webbroten: allt där kan nås med en webbadress. Mappen `_private` på samma nivå stänger one.com för webben ("Forbidden"), men PHP kan läsa den. Appen läggs därför så här:

```
(översta nivån = webbroten)
├── aktier/          innehållet i public/   → https://<din-domän>/aktier/
└── _private/
    └── aktier/      innehållet i private/  (src/, data/, config.php …)
```

`public/paths.php` hittar den privata katalogen själv: först `../_private/aktier` (one.com), sedan `../private` (lokalt) och sist `private/` inuti appmappen. Den behöver inte ändras.

1. **Lösenordshash.** Kör lokalt `php private/bin/hash-password.php` och kopiera raden som skrivs ut.
2. **Konfiguration.** Kopiera `private/config.example.php` till `private/config.php` och klistra in `password_hash`.
3. **Data.** Kopiera `aktier.csv`, `aktiekop.csv` och `aktievy.json` oförändrade från Python-versionen till `private/data/`. Formaten är desamma. Utan `aktier.csv` skapas den från `aktier.example.csv`.
4. **Ladda upp.** Skapa mappen `aktier` på översta nivån och ladda upp *innehållet* i `public/` dit (inklusive den dolda filen `.htaccess`). Skapa `_private/aktier` och ladda upp *innehållet* i `private/` dit (inklusive `.htaccess`, men inte `tests/` eller `bin/`, som bara används lokalt). Se [Uppladdning med SFTP](#uppladdning-med-sftp).
5. **Kontrollera skyddet.** Öppna `https://<din-domän>/_private/aktier/data/aktiekop.csv` och `https://<din-domän>/_private/aktier/config.php`. Båda ska ge Forbidden, 403 eller 404 och aldrig visa innehållet.
6. **Logga in** på `https://<din-domän>/aktier/`. Första inläsningen hämtar kurshistorik från 2010 i omgångar och tar några sekunder.

Om `_private` inte finns: lägg `private/` inuti appmappen (`aktier/private/`). Då skyddar `.htaccess`-filerna katalogen.

Glömt lösenord: skapa en ny hash enligt steg 1 och ersätt den i `private/config.php` via SFTP.

### Uppladdning med SFTP

Ett gratis grafiskt SFTP-program räcker, till exempel [Cyberduck](https://cyberduck.io/) (macOS/Windows) eller [FileZilla](https://filezilla-project.org/) (alla plattformar). one.com:s filhanterare i webbläsaren fungerar också, men visar inte alltid dolda filer som `.htaccess`.

1. **Uppgifter.** Logga in i one.com:s kontrollpanel och öppna inställningen för SFTP/SSH. Där finns server, port (22), användarnamn och möjlighet att sätta ett SFTP-lösenord. Det lösenordet hör till webbhotellet och är inte appens inloggningslösenord.
2. **Anslut.** I Cyberduck: **Öppna anslutning**, välj **SFTP (SSH File Transfer Protocol)** och fyll i uppgifterna. I FileZilla: fyll i fälten överst med `sftp://` före servernamnet och port 22. Godkänn serverns nyckel första gången. Du hamnar på samma översta nivå som i filhanteraren, med `_private` bland mapparna.
3. **Visa dolda filer.** Cyberduck: **Visa → Visa dolda filer**. FileZilla: **Server → Tvinga visning av dolda filer**. Annars syns och laddas `.htaccess` inte alltid upp.
4. **Ladda upp.** Dra *innehållet* i den lokala `public/` till mappen `aktier/` och *innehållet* i `private/` till `_private/aktier/`, utom `tests/` och `bin/`. Kontrollera efteråt att `.htaccess` finns i `aktier/`, `_private/aktier/` och `_private/aktier/data/`.
5. **Uppdateringar.** Vid nya versioner laddar du bara upp ändrade programfiler och skriver över. På macOS/Linux kan `./deploy.sh` göra det: det laddar upp filer som ändrats sedan förra uppladdningen (`--alla` för alla, `-n` för att bara visa listan) och läser server, användare och webbrotens sökväg (`REMOTE_ROOT=webroots/www` hos one.com) från `.deploy.env`, se början av skriptet. Skriv aldrig över `_private/aktier/data/` eller `_private/aktier/config.php` på servern: där finns dina transaktioner och ditt lösenord. Ladda gärna ner `data/` som säkerhetskopia ibland.

## Import av mäklartransaktioner

Välj exportfilen (UTF-16, tabbseparerad) bredvid **Importera transaktioner**. Appen visar först en förhandsgranskning och sparar inget förrän du klickar **Bekräfta import**. Exportens transaktions-ID gör att samma fil kan importeras igen utan dubbletter. Mappningen från värdepappersnamn till ticker finns i `private/import-mapping.php`.

## Lokal utveckling och tester

```sh
php private/tests/run.php
AKTIER_CONFIG=/sökväg/till/dev-config.php php -S 127.0.0.1:8000 -t public
```

En dev-konfiguration sätter `require_https` till `false` och kan peka `data_dir` på en kopia av datan.

### Tester i webbläsaren (Playwright)

Tester för inloggning, diagram, aktielegend, utloggning och telefonbredd (`e2e/smoke.spec.js`) samt solo och minutdiagrammet: solo-val, sparat solo-val, nollpunkt, markeringar, `Vecka`/`Månad`, låst punkt, CSV-arkiv och filtrerade listor (`e2e/solo.spec.js`), och att registrera köp, sälj och utdelningar med förslag, felmeddelanden och uppdaterade listor (`e2e/transactions.spec.js`), skalvalets kryssrutor, axlar, måttkurvor och sparade läge (`e2e/scale.spec.js`) samt jämförelser mellan två klickade punkter och att de tas bort när kurvan döljs (`e2e/comparison.spec.js`). Testdatan återställs före varje test, så testerna kan köras i valfri ordning. Kräver Node.js och PHP. Första gången:

```sh
npm install
npx playwright install chromium
```

Kör sedan:

```sh
npm run test:e2e
```

Med `npm run test:e2e:ui` öppnas Playwrights testfönster, där testerna kan köras ett i taget och varje steg visas med skärmbild.

Testerna skapar egen syntetisk testdata och ett testlösenord i en tillfällig katalog, startar `php -S 127.0.0.1:8766 -t public` mot den och tar bort katalogen efteråt. De läser aldrig `private/data` eller `private/config.php` och anropar inte Yahoo. `deploy.sh` laddar inte upp testerna eller `node_modules/`.

## Licens

[MIT](LICENSE)
