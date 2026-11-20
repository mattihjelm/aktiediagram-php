## ADDED Requirements

### Requirement: Arkiv med minutkurser

När minutkurser hämtas för den solo-valda aktien SHALL de även sparas i en CSV-fil för just den aktien på webbservern. Filen SHALL vara semikolonseparerad med rubrikraden `time;close;currency`, en rad per minut med tid i svensk tid i formatet `YYYY-MM-DD HH:MM`, kurs i aktiens handelsvaluta med decimalkomma och valutakod, sorterad i tidsordning. Om filen redan finns SHALL endast minuter som är senare än filens sista rad läggas till; befintliga rader SHALL aldrig ändras eller tas bort, och ingen minut SHALL förekomma två gånger. Den pågående minuten, vars kurs ännu kan ändras, SHALL inte sparas. Om hämtningen från Yahoo Finance bara delvis lyckades SHALL arkivet inte uppdateras. Minutdiagrammets statusrad SHALL visa hur många minuter arkivet innehåller, dess första och sista tid samt hur många minuter som lades till. Om arkivet inte kan sparas SHALL ett felmeddelande visas i statusraden medan minutdiagrammet fungerar som vanligt. Minutdiagrammet SHALL ha en länk `Ladda ner CSV` som laddar ner aktiens arkivfil när filen finns. Arkivfilerna SHALL endast kunna laddas ner av inloggad användare, för aktier i `aktier.csv`, via appens nedladdning; de SHALL inte kunna hämtas, listas eller skrivas direkt över HTTP. Minutdiagrammet SHALL fortfarande endast visa minutkurser från Yahoo Finance för de senaste 30 dagarna.

#### Scenario: Första hämtningen för en aktie

- **WHEN** användaren väljer solo för en aktie som saknar arkivfil och hämtningen lyckas
- **THEN** en arkivfil skapas med rubrikraden och alla hämtade minuter utom den pågående minuten
- **AND** statusraden visar antal sparade minuter och tidsintervallet

#### Scenario: Påfyllning av befintligt arkiv

- **WHEN** arkivfilen slutar 2026-11-11 17:29 och användaren väljer solo för aktien dagen efter
- **THEN** endast minuter efter 2026-11-11 17:29 läggs till i slutet av filen
- **AND** raderna fram till 2026-11-11 17:29 är oförändrade

#### Scenario: Inget nytt att spara

- **WHEN** användaren väljer solo igen innan någon ny minut har tillkommit
- **THEN** filen är oförändrad och statusraden visar att 0 minuter lades till

#### Scenario: Ofullständig hämtning

- **WHEN** några tidsperioder inte kunde hämtas från Yahoo Finance
- **THEN** arkivfilen ändras inte och statusraden visar att arkivet inte uppdaterades

#### Scenario: Ladda ner arkivet

- **WHEN** användaren klickar på `Ladda ner CSV` i minutdiagrammet
- **THEN** webbläsaren laddar ner aktiens arkivfil med ett filnamn som innehåller aktiens symbol

#### Scenario: Nedladdning utan inloggning

- **WHEN** någon som inte är inloggad begär nedladdning av ett arkiv eller begär arkivfilen direkt via dess sökväg
- **THEN** begäran avvisas utan filens innehåll

#### Scenario: Diagrammet påverkas inte av arkivet

- **WHEN** arkivet innehåller minutkurser som är äldre än 30 dagar
- **THEN** minutdiagrammet visar fortfarande bara de senaste 30 dagarna
