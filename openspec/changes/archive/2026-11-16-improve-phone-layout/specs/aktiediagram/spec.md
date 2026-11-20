## ADDED Requirements

### Requirement: Senast valda solo-aktie

Appen SHALL spara den senast solo-valda aktien i `aktievy.json` som `last_solo` varje gång användaren markerar solo för en aktie. Att avmarkera solo SHALL inte ändra `last_solo`. Ett sparat värde som inte är en aktie i `aktier.csv` SHALL ignoreras. Övriga inställningar i `aktievy.json` SHALL behållas när `last_solo` sparas.

#### Scenario: Spara solo-val

- **WHEN** användaren markerar solo för Saab
- **THEN** `aktievy.json` innehåller `last_solo` med värdet `SAAB-B.ST`
- **AND** datumintervall och skala i `aktievy.json` är oförändrade

#### Scenario: Avmarkera solo

- **WHEN** användaren avmarkerar solo
- **THEN** `last_solo` är oförändrat

#### Scenario: Borttagen aktie

- **WHEN** `last_solo` anger en aktie som inte längre finns i `aktier.csv`
- **THEN** värdet ignoreras och ingen aktie väljs automatiskt

### Requirement: Layout på telefon

Appen SHALL visa en telefonlayout när sidans bredd är högst 600 CSS-pixlar, och även när enheten styrs med pekskärm och sidans höjd är högst 500 CSS-pixlar, så att en telefon i liggande läge behåller telefonlayouten. När sidan öppnas i telefonlayout och `last_solo` anger en aktie i `aktier.csv` SHALL den aktien väljas som solo automatiskt, så att minutdiagrammet visas. Minutdiagrammet SHALL i telefonlayout ligga först på sidan, före huvuddiagrammet, och huvuddiagrammet, aktielegenden, formuläret `Registrera aktiehändelse`, `Resultat` och `Transaktioner` SHALL följa nedanför. Text i telefonlayout SHALL vara mindre än på bred skärm, med brödtext och tabeller i 13 pixlar, och panelernas och tabellernas vänsterindrag SHALL tas bort. I telefonlayout SHALL rubrikerna ovanför diagrammen, sidans rubrik `Aktiernas utveckling …` och minutdiagrammets rubrik `<aktie> – minutkurser`, vara hälften så stora som övriga rubriker i telefonlayout. I telefonlayout SHALL minutdiagrammets y-axelrubrik, till exempel `Kurs (SEK)`, inte visas, och skalvärdena på x- och y-axlarna i både huvuddiagrammet och minutdiagrammet SHALL visas i 30 % av den vanliga storleken. När telefonen vrids SHALL axlarnas rubriker och skalvärden anpassas till den nya layouten utan att sidan laddas om. Sidan SHALL inte rulla i sidled; tabeller SHALL rulla i sidled inom sin egen yta. På bredare skärmar SHALL ordning, textstorlekar och solo-läget vid sidladdning vara oförändrade.

#### Scenario: Öppna appen på telefon

- **WHEN** användaren öppnar appen på en telefon och `last_solo` är `SAAB-B.ST`
- **THEN** Saab väljs som solo och Saabs minutdiagram visas överst på sidan
- **AND** huvuddiagrammet och övriga delar visas nedanför

#### Scenario: Telefon i liggande läge

- **WHEN** användaren vrider telefonen till liggande läge
- **THEN** minutdiagrammet ligger fortfarande först på sidan och texterna är fortfarande små

#### Scenario: Axlar i telefonlayout

- **WHEN** telefonlayouten visas
- **THEN** minutdiagrammet saknar texten `Kurs (SEK)` vid y-axeln
- **AND** skalvärdena på båda diagrammens axlar är 30 % av den vanliga storleken

#### Scenario: Ingen sparad solo-aktie

- **WHEN** användaren öppnar appen på en telefon och `last_solo` saknas
- **THEN** ingen aktie väljs som solo och sidan visas i telefonlayoutens ordning utan minutdiagram

#### Scenario: Bred skärm

- **WHEN** användaren öppnar appen på en dator med bred skärm
- **THEN** ingen aktie väljs automatiskt som solo och sidans ordning och textstorlekar är som tidigare

### Requirement: Senaste kurs i minutdiagrammets statusrad

Minutdiagrammets statusrad SHALL visa tiden för den senaste minutkursen följd av själva kursen med två decimaler och valuta, i formen `Senaste kurs <tid>: <kurs> <valuta>`, där kronor visas som `kr`. Eventuella varningar om ofullständig hämtning SHALL visas efter.

#### Scenario: Senaste kurs med pris

- **WHEN** minutkurserna för Saab har hämtats och den senaste minuten är 2026-11-16 15:42 med kursen 641,4 kr
- **THEN** statusraden visar `Senaste kurs 2026-11-16 15:42: 641,40 kr`

### Requirement: Kurvetiketter inne i huvuddiagrammet

Huvuddiagrammets kurvnamn vid kurvornas slut SHALL placeras inne i diagramytan, till vänster om respektive kurvas sista synliga punkt, med tunna ledarlinjer och utan att etiketterna överlappar varandra. Diagrammets högermarginal SHALL inte reserveras för etiketterna. Y-axelns rubrik SHALL inte visas med linjär skala; rubrikerna för logaritmisk skala och för måtten SHALL visas som tidigare.

#### Scenario: Etiketter inne i diagrammet

- **WHEN** huvuddiagrammet visar flera aktier
- **THEN** varje kurvnamn visas inne i diagramytan vid kurvans slut med en ledarlinje till slutpunkten
- **AND** diagramytan sträcker sig nästan ända till diagrammets högra kant

#### Scenario: Ingen indexrubrik

- **WHEN** linjär skala är vald
- **THEN** texten `Index (100 = synligt startdatum)` visas inte vid y-axeln

## MODIFIED Requirements

### Requirement: Arkiv med minutkurser

När minutkurser hämtas för den solo-valda aktien SHALL de även sparas i en CSV-fil för just den aktien på webbservern. Filen SHALL vara semikolonseparerad med rubrikraden `time;close;currency`, en rad per minut med tid i svensk tid i formatet `YYYY-MM-DD HH:MM`, kurs i aktiens handelsvaluta med decimalkomma och valutakod, sorterad i tidsordning. Om filen redan finns SHALL endast minuter som är senare än filens sista rad läggas till; befintliga rader SHALL aldrig ändras eller tas bort, och ingen minut SHALL förekomma två gånger. Den pågående minuten, vars kurs ännu kan ändras, SHALL inte sparas. Om hämtningen från Yahoo Finance bara delvis lyckades SHALL arkivet inte uppdateras. Arkivets första och sista tid samt hur många minuter som lades till SHALL visas på samma rad som länken `Ladda ner CSV`, direkt efter den, i formen `Arkiv: <första tid> – <sista tid>, <antal> nya.`; antalet minuter i arkivet SHALL inte visas. Om arkivet inte kan sparas SHALL ett felmeddelande visas på samma plats medan minutdiagrammet fungerar som vanligt. Minutdiagrammet SHALL ha en länk `Ladda ner CSV` som laddar ner aktiens arkivfil när filen finns. Arkivfilerna SHALL endast kunna laddas ner av inloggad användare, för aktier i `aktier.csv`, via appens nedladdning; de SHALL inte kunna hämtas, listas eller skrivas direkt över HTTP. Minutdiagrammet SHALL fortfarande endast visa minutkurser från Yahoo Finance för de senaste 30 dagarna.

#### Scenario: Första hämtningen för en aktie

- **WHEN** användaren väljer solo för en aktie som saknar arkivfil och hämtningen lyckas
- **THEN** en arkivfil skapas med rubrikraden och alla hämtade minuter utom den pågående minuten
- **AND** texten bredvid `Ladda ner CSV` visar arkivets tidsintervall och antalet nya minuter

#### Scenario: Påfyllning av befintligt arkiv

- **WHEN** arkivfilen slutar 2026-11-11 17:29 och användaren väljer solo för aktien dagen efter
- **THEN** endast minuter efter 2026-11-11 17:29 läggs till i slutet av filen
- **AND** raderna fram till 2026-11-11 17:29 är oförändrade

#### Scenario: Inget nytt att spara

- **WHEN** användaren väljer solo igen innan någon ny minut har tillkommit
- **THEN** filen är oförändrad och texten bredvid `Ladda ner CSV` visar att 0 minuter lades till

#### Scenario: Ofullständig hämtning

- **WHEN** några tidsperioder inte kunde hämtas från Yahoo Finance
- **THEN** arkivfilen ändras inte och texten bredvid `Ladda ner CSV` visar att arkivet inte uppdaterades

#### Scenario: Ladda ner arkivet

- **WHEN** användaren klickar på `Ladda ner CSV` i minutdiagrammet
- **THEN** webbläsaren laddar ner aktiens arkivfil med ett filnamn som innehåller aktiens symbol

#### Scenario: Nedladdning utan inloggning

- **WHEN** någon som inte är inloggad begär nedladdning av ett arkiv eller begär arkivfilen direkt via dess sökväg
- **THEN** begäran avvisas utan filens innehåll

#### Scenario: Diagrammet påverkas inte av arkivet

- **WHEN** arkivet innehåller minutkurser som är äldre än 30 dagar
- **THEN** minutdiagrammet visar fortfarande bara de senaste 30 dagarna
