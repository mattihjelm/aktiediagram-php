## MODIFIED Requirements

### Requirement: Senast valda solo-aktie

Appen SHALL spara den senast solo-valda aktien i `aktievy.json` som `last_solo` varje gång användaren markerar solo för en aktie. När solo avslutas, genom att användaren avmarkerar solo eller klickar på en akties namn i legenden medan solo är aktivt, SHALL `last_solo` tömmas. När sidan öppnas och `last_solo` anger en aktie i `aktier.csv` SHALL den aktien väljas som solo automatiskt, oavsett skärmstorlek, med minutdiagram och filtrerade listor som vid ett manuellt solo-val. När solo därefter avmarkeras SHALL de aktier visas som var synliga innan solo valdes, det vill säga synligheten enligt `aktier.csv`. Ett sparat värde som inte är en aktie i `aktier.csv` SHALL ignoreras. Övriga inställningar i `aktievy.json` SHALL behållas när `last_solo` sparas eller töms.

#### Scenario: Spara solo-val

- **WHEN** användaren markerar solo för Saab
- **THEN** `aktievy.json` innehåller `last_solo` med värdet `SAAB-B.ST`
- **AND** datumintervall och skala i `aktievy.json` är oförändrade

#### Scenario: Avmarkera solo

- **WHEN** användaren avmarkerar solo
- **THEN** `last_solo` töms i `aktievy.json`
- **AND** datumintervall och skala i `aktievy.json` är oförändrade

#### Scenario: Starta med senaste solo-val

- **WHEN** användaren öppnar appen, på dator eller telefon, och `last_solo` är `SAAB-B.ST`
- **THEN** Saab väljs som solo och Saabs minutdiagram visas

#### Scenario: Avmarkera solo efter start

- **WHEN** appen har startat med Saab som solo och användaren avmarkerar solo
- **THEN** de aktier som är markerade som synliga i `aktier.csv` visas igen
- **AND** nästa start sker utan solo

#### Scenario: Ingen sparad solo-aktie

- **WHEN** användaren öppnar appen och `last_solo` saknas eller är tomt
- **THEN** ingen aktie väljs som solo och de synliga aktierna visas enligt `aktier.csv`

#### Scenario: Borttagen aktie

- **WHEN** `last_solo` anger en aktie som inte längre finns i `aktier.csv`
- **THEN** värdet ignoreras och ingen aktie väljs automatiskt

### Requirement: Layout på telefon

Appen SHALL visa en telefonlayout när sidans bredd är högst 600 CSS-pixlar, och även när enheten styrs med pekskärm och sidans höjd är högst 500 CSS-pixlar, så att en telefon i liggande läge behåller telefonlayouten. Minutdiagrammet SHALL i telefonlayout ligga först på sidan, före huvuddiagrammet, och huvuddiagrammet, aktielegenden, formuläret `Registrera aktiehändelse`, `Resultat` och `Transaktioner` SHALL följa nedanför. Text i telefonlayout SHALL vara mindre än på bred skärm, med brödtext och tabeller i 13 pixlar, och panelernas och tabellernas vänsterindrag SHALL tas bort. I telefonlayout SHALL rubrikerna ovanför diagrammen, sidans rubrik `Aktiernas utveckling …` och minutdiagrammets rubrik `<aktie> – minutkurser`, vara hälften så stora som övriga rubriker i telefonlayout. I telefonlayout SHALL minutdiagrammets y-axelrubrik, till exempel `Kurs (SEK)`, inte visas, och skalvärdena på x- och y-axlarna i både huvuddiagrammet och minutdiagrammet SHALL visas i 30 % av den vanliga storleken. När telefonen vrids SHALL axlarnas rubriker och skalvärden anpassas till den nya layouten utan att sidan laddas om. Sidan SHALL inte rulla i sidled; tabeller SHALL rulla i sidled inom sin egen yta. På bredare skärmar SHALL ordning och textstorlekar vara oförändrade. Det automatiska solo-valet vid sidladdning SHALL följa kravet Senast valda solo-aktie på alla skärmstorlekar.

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
- **THEN** sidans ordning och textstorlekar är som tidigare
- **AND** en aktie väljs som solo endast om `last_solo` anger den
