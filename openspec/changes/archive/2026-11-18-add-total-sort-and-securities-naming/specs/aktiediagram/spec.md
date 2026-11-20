## MODIFIED Requirements

### Requirement: Kurvornas synlighet och legend

Diagrammet SHALL visa en extern värdepapperslista, `Värdepapperslistan`, med en solo-checkbox och klickbart aktienamn för varje tillgänglig aktie. Klick på aktienamnet SHALL växla kurvan och dess transaktionsmarkeringar av eller på och spara aktiens synlighet i `aktier.csv` så den används vid nästa start. Solo SHALL visa endast den valda aktien och dess transaktioner, och avmarkering SHALL återställa synligheten från före sololäget. Solo-läget SHALL inte ändra sparade synlighetsinställningar. Kurvnamn vid kurvornas slut SHALL vara förbundna med sina slutpunkter av tunna svarta ledarlinjer och placeras så att etiketterna inte överlappa. Hovring över ett externt aktienamn SHALL tillfälligt öka motsvarande kurvas tjocklek från 2 px till 5 px. Legendens vinst/förlustinformation SHALL följa respektive aktienamn. Utanför telefonlayouten SHALL legenden vara cirka 20 % bredare och ha cirka 20 % större text än tidigare: aktienamn i 17 pixlar och avkastningsraden, rubriken, hjälptexten och sorteringsknapparna i 14,5 pixlar. Avkastningsraden under varje aktie SHALL visas i en mörkare färg än tidigare för bättre läsbarhet. Listans kolumnrubrik SHALL vara `Värdepapper / resultat`. Legendens rubrik SHALL ha fyra sorteringsknappar: `Osorterad`, som visar aktierna i ordningen i `aktier.csv`, `Namn`, som sorterar efter visningsnamn i svensk alfabetisk ordning, `%/mån`, som sorterar efter månadsavkastning i procent med högst först och aktier utan månadsavkastning sist i ordningen i `aktier.csv`, och `Total`, som sorterar efter den totala avkastningen omräknad till SEK med senaste valutakurs, med högst först och aktier utan avkastning sist i ordningen i `aktier.csv`. Den valda knappen SHALL vara markerad. Valet SHALL sparas i `aktievy.json` som `legend_sort` med värdet `none`, `name`, `monthly` eller `total` och användas vid nästa start; utan sparat eller med ogiltigt värde SHALL `Osorterad` gälla. Sorteringen SHALL endast ändra ordningen i legenden; kurvor, färger, kurvetiketter, solo-val, synlighet, listorna `Transaktioner` och `Resultat` samt `aktier.csv` SHALL inte påverkas. Vid sortering på `%/mån` eller `Total` SHALL ordningen uppdateras när avkastningen räknas om.

När solo väljs SHALL listorna `Transaktioner` och `Resultat` filtreras till den valda aktien om kryssrutan `Filtrera aktier enligt solo-val` är markerad. Kryssrutan SHALL vara markerad som standard. En separat kryssruta `Filtrera enligt diagramval` SHALL filtrera båda listorna till aktier vars kurvor är synliga i diagrammet och vara avmarkerad som standard. Båda filtren SHALL kunna användas samtidigt; då visas endast aktier som uppfyller båda valen. Listornas rubriker SHALL ligga på samma rad och deras kolumnrubriker SHALL linjeras vertikalt på breda skärmar.

#### Scenario: Växla aktie

- **WHEN** användaren klickar på en akties namn i den externa legenden
- **THEN** aktiens kurva och köp-/säljmarkeringar växlas tillsammans
- **AND** synligheten sparas i `aktier.csv` och återanvänds vid nästa start
- **AND** y-axeln räknas om efter synliga aktier

#### Scenario: Visa en aktie solo

- **WHEN** användaren markerar solo för en aktie
- **THEN** endast den aktiens kurva och transaktionsmarkeringar visas
- **WHEN** användaren avmarkerar solo
- **THEN** synligheten återställs till läget före solo-valet
- **AND** sparade synlighetsvärden i `aktier.csv` lämnas oförändrade

#### Scenario: Filtrera listor enligt solo-val

- **WHEN** användaren markerar solo för en aktie och `Filtrera aktier enligt solo-val` är ikryssad
- **THEN** både `Transaktioner` och `Resultat` visar endast den valda aktien
- **WHEN** kryssrutan avmarkeras
- **THEN** båda listorna visar alla aktier oavsett solo-val

#### Scenario: Filtrera listor enligt diagramval

- **WHEN** användaren markerar `Filtrera enligt diagramval`
- **THEN** både `Transaktioner` och `Resultat` visar endast aktier vars kurvor är synliga
- **AND** listorna uppdateras när användaren slår en kurva av eller på
- **WHEN** kryssrutan avmarkeras
- **THEN** diagrammets synlighet filtrerar inte listorna

#### Scenario: Markera kurva med hovring

- **WHEN** pekaren förs över ett aktienamn i den externa legenden
- **THEN** motsvarande kurva blir 5 px tjock
- **WHEN** pekaren lämnar aktienamnet
- **THEN** kurvan återgår till 2 px

#### Scenario: Sortera legenden på månadsavkastning

- **WHEN** användaren klickar på `%/mån`
- **THEN** legenden visar aktien med högst procent per månad först och aktier utan månadsavkastning sist
- **AND** knappen `%/mån` är markerad och `aktievy.json` innehåller `legend_sort` med värdet `monthly`
- **AND** diagrammets kurvor och `aktier.csv` är oförändrade

#### Scenario: Sortera legenden på namn

- **WHEN** användaren klickar på `Namn`
- **THEN** legenden visar aktierna i svensk alfabetisk ordning efter visningsnamn, med `Å`, `Ä` och `Ö` sist

#### Scenario: Återgå till osorterad ordning

- **WHEN** användaren klickar på `Osorterad`
- **THEN** legenden visar aktierna i samma ordning som i `aktier.csv`

#### Scenario: Sparad sortering vid start

- **WHEN** appen öppnas och `legend_sort` i `aktievy.json` är `name`
- **THEN** legenden visas sorterad på namn och `Namn` är markerad

#### Scenario: Bredare legend med större text

- **WHEN** appen visas på en bred skärm utanför telefonlayouten
- **THEN** värdepapperslistan är cirka 20 % bredare än tidigare och aktienamnen visas i 17 pixlar
- **WHEN** appen visas i telefonlayout
- **THEN** legendens text är 13 pixlar som tidigare

#### Scenario: Sortera på total avkastning

- **WHEN** användaren klickar på `Total`
- **THEN** värdepapperslistan visar det värdepapper med högst total avkastning i SEK först, där belopp i USD och EUR räknas om med senaste valutakurs, och värdepapper utan avkastning sist
- **AND** knappen `Total` är markerad och `aktievy.json` innehåller `legend_sort` med värdet `total`

#### Scenario: Namn och rubrik i värdepapperslistan

- **WHEN** värdepapperslistan visas
- **THEN** kolumnrubriken är `Värdepapper / resultat` och listan har namnet `Värdepapperslistan` för skärmläsare

### Requirement: Kolumnrubriker i Resultat och Transaktioner

Tabellen `Resultat` SHALL ha kolumnrubrikerna `Värdepapper`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Värde` och `Värde SEK` i den ordningen, där `Kurs` är senaste kurs, `Avkastn` är resultat exklusive utdelningar, `Tot avkastn` är totalt resultat i SEK och `Tot avkastn (%)` är resultatet i procent. Tabellen `Transaktioner` SHALL ha kolumnrubrikerna `Datum`, `Tid`, `Typ`, `Värdepapper`, `Antal`, `Kurs`, `Avgår` och `Värde` i den ordningen, där `Kurs` är kurs eller utdelning per aktie, `Avgår` är courtage eller källskatt och `Värde` är totalbelopp inklusive courtage för köp och nettobelopp för sälj och utdelning. Kolumnrubrikerna SHALL få brytas på två rader, medan värdena SHALL visas på en rad. Kolumnernas innehåll, beräkningar, sortering och filter SHALL vara oförändrade.

#### Scenario: Rubriker i Resultat

- **WHEN** tabellen `Resultat` visas
- **THEN** rubrikerna är `Värdepapper`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Värde`, `Värde SEK`

#### Scenario: Rubriker i Transaktioner

- **WHEN** tabellen `Transaktioner` visas
- **THEN** rubrikerna är `Datum`, `Tid`, `Typ`, `Värdepapper`, `Antal`, `Kurs`, `Avgår`, `Värde`
- **AND** sortering på `Värdepapper` och döljning av utdelningar fungerar som tidigare

### Requirement: Layout på telefon

Appen SHALL visa en telefonlayout när sidans bredd är högst 600 CSS-pixlar, och även när enheten styrs med pekskärm och sidans höjd är högst 500 CSS-pixlar, så att en telefon i liggande läge behåller telefonlayouten. Minutdiagrammet SHALL i telefonlayout ligga först på sidan, före huvuddiagrammet, och huvuddiagrammet, värdepapperslistan, formuläret `Registrera transaktion`, `Resultat` och `Transaktioner` SHALL följa nedanför. Text i telefonlayout SHALL vara mindre än på bred skärm, med brödtext och tabeller i 13 pixlar, och panelernas och tabellernas vänsterindrag SHALL tas bort. I telefonlayout SHALL rubrikerna ovanför diagrammen, sidans rubrik `Aktiernas utveckling …` och minutdiagrammets rubrik `<aktie> – minutkurser`, vara hälften så stora som övriga rubriker i telefonlayout. I telefonlayout SHALL minutdiagrammets y-axelrubrik, till exempel `Kurs (SEK)`, inte visas, och skalvärdena på x- och y-axlarna i både huvuddiagrammet och minutdiagrammet SHALL visas i 30 % av den vanliga storleken. När telefonen vrids SHALL axlarnas rubriker och skalvärden anpassas till den nya layouten utan att sidan laddas om. Sidan SHALL inte rulla i sidled; tabeller SHALL rulla i sidled inom sin egen yta. På bredare skärmar SHALL ordning och textstorlekar vara oförändrade. Det automatiska solo-valet vid sidladdning SHALL följa kravet Senast valda solo-aktie på alla skärmstorlekar.

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
