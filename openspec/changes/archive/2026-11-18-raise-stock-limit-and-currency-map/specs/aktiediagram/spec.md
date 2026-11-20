## MODIFIED Requirements

### Requirement: Konfigurerbar aktielista

Appen SHALL läsa aktietickrar, visningsnamn och initial synlighet från `aktier.csv` i appens skyddade datakatalog. Om `aktier.csv` saknas SHALL den skapas som en kopia av `aktier.example.csv`. Rader utan ticker SHALL ignoreras. Listan SHALL stödja högst 100 aktier. Ticker och visningsnamn SHALL vara unika. Initial synlighet SHALL kunna anges som `true`/`false`, `ja`/`nej` eller `1`/`0`. Ogiltig konfiguration SHALL ge ett begripligt fel som visas i webbläsaren. Aktiens valuta SHALL anges per ticker i `ticker_currency` i `import-mapping.php`; en ticker som slutar på `.ST` och saknas där SHALL vara i SEK. Samma valuta SHALL användas för belopp, valutaomräkning och visade valutabeteckningar på servern och i webbläsaren. En ticker utan börssuffix som inte är ett fond-id (`0P…`) SHALL räknas som amerikansk, så att dagens stängningskurs tas med först efter stängningen i New York.

#### Scenario: Läs aktier från konfiguration

- **WHEN** appen öppnas med en giltig `aktier.csv`
- **THEN** varje aktie med ticker blir tillgänglig i diagrammet och i transaktionsformuläret
- **AND** initial synlighet följer aktiens `show_initially`-värde

#### Scenario: Första start utan lokal aktielista

- **WHEN** appen öppnas och `aktier.csv` saknas i datakatalogen
- **THEN** `aktier.csv` skapas från `aktier.example.csv`
- **AND** appen läser aktierna från den nya filen

#### Scenario: Ogiltig eller för stor konfiguration

- **WHEN** konfigurationen innehåller dubbla tickrar, dubbla namn, ogiltigt synlighetsvärde eller fler än 100 aktier
- **THEN** appen visar ett fel som pekar ut konfigurationsproblemet i stället för diagrammet

#### Scenario: Aktie i utländsk valuta

- **WHEN** `TSLA` har valutan `USD` i `ticker_currency` och ett registrerat köp
- **THEN** köpet och marknadsvärdet räknas om från USD till SEK i `Resultat`
- **AND** formuläret, transaktionslistan och `Resultat` visar beloppen med `USD`
- **AND** dagens stängningskurs tas med först efter börsstängningen i New York

#### Scenario: Fond i utländsk valuta

- **WHEN** fonden `0P0000JSS5` har valutan `USD` i `ticker_currency`
- **THEN** dess belopp räknas om från USD till SEK
- **AND** dagens kurs tas med efter den svenska stängningstiden, som för övriga fonder
