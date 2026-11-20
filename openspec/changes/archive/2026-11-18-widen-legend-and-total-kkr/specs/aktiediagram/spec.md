## MODIFIED Requirements

### Requirement: Kurvornas synlighet och legend

Diagrammet SHALL visa en extern aktielegend med en solo-checkbox och klickbart aktienamn för varje tillgänglig aktie. Klick på aktienamnet SHALL växla kurvan och dess transaktionsmarkeringar av eller på och spara aktiens synlighet i `aktier.csv` så den används vid nästa start. Solo SHALL visa endast den valda aktien och dess transaktioner, och avmarkering SHALL återställa synligheten från före sololäget. Solo-läget SHALL inte ändra sparade synlighetsinställningar. Kurvnamn vid kurvornas slut SHALL vara förbundna med sina slutpunkter av tunna svarta ledarlinjer och placeras så att etiketterna inte överlappa. Hovring över ett externt aktienamn SHALL tillfälligt öka motsvarande kurvas tjocklek från 2 px till 5 px. Legendens vinst/förlustinformation SHALL följa respektive aktienamn. Utanför telefonlayouten SHALL legenden vara cirka 20 % bredare och ha cirka 20 % större text än tidigare: aktienamn i 17 pixlar och avkastningsraden, rubriken, hjälptexten och sorteringsknapparna i 14,5 pixlar. Avkastningsraden under varje aktie SHALL visas i en mörkare färg än tidigare för bättre läsbarhet. Legendens rubrik SHALL ha tre sorteringsknappar: `Osorterad`, som visar aktierna i ordningen i `aktier.csv`, `Namn`, som sorterar efter visningsnamn i svensk alfabetisk ordning, och `%/mån`, som sorterar efter månadsavkastning i procent med högst först och aktier utan månadsavkastning sist i ordningen i `aktier.csv`. Den valda knappen SHALL vara markerad. Valet SHALL sparas i `aktievy.json` som `legend_sort` med värdet `none`, `name` eller `monthly` och användas vid nästa start; utan sparat eller med ogiltigt värde SHALL `Osorterad` gälla. Sorteringen SHALL endast ändra ordningen i legenden; kurvor, färger, kurvetiketter, solo-val, synlighet, listorna `Transaktioner` och `Resultat` samt `aktier.csv` SHALL inte påverkas. Vid sortering på `%/mån` SHALL ordningen uppdateras när månadsavkastningen räknas om.

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
- **THEN** aktielegenden är cirka 20 % bredare än tidigare och aktienamnen visas i 17 pixlar
- **WHEN** appen visas i telefonlayout
- **THEN** legendens text är 13 pixlar som tidigare

### Requirement: Beräkna resultat per aktie

För aktier med registrerade köp SHALL den externa legenden visa uppskattad vinst eller förlust, månadsresultat i valuta och månadsavkastning i procent. Avkastningsraden under aktien SHALL visa månadsresultat i valuta, månadsavkastning i procent och årsavkastning, och sist den uppskattade vinsten eller förlusten i tusental med en decimal, i formen `<belopp> kkr` för kronor och `<belopp> k<valuta>` för andra valutor, till exempel `+500,00 kr/mån · +1,50%/mån · +19,56%/år · +8,2 kkr`. Saknas månadsavkastning SHALL raden vara `—/mån · <belopp>`. Efter månadsavkastningen SHALL motsvarande årsavkastning visas, beräknad med ränta på ränta som (1 + månadsavkastningen)^12 − 1 och angiven med två decimaler i formen `<procent>%/år`. Årsavkastningen SHALL inte visas när månadsavkastning saknas eller är −100 % eller lägre. Beräkningen SHALL utgå från aktuell senast tillgänglig kurs gånger kvarvarande antal, minus anskaffningskostnad inklusive courtage, med hänsyn till registrerade försäljningar. Resultatet SHALL uppdateras när en ny transaktion registreras. Historiskt antal Sirius XM (`SIRI`) SHALL räknas om till nuvarande aktiebas för transaktioner före 2024-09-10. Om månadsberäkning inte kan göras SHALL detta anges med `—/mån`.

#### Scenario: Beräkna resultat från flera affärer

- **WHEN** en aktie har flera köp och eventuella försäljningar
- **THEN** legendens resultat omfattar transaktionerna, courtage och aktuell position
- **AND** vinst/förlust, resultat per månad, procent per månad och procent per år visas

#### Scenario: Uppdatera efter ny transaktion

- **WHEN** ett köp eller en försäljning sparas
- **THEN** vinst/förlustetiketten för den berörda aktien räknas om

#### Scenario: Årsavkastning ur månadsavkastning

- **WHEN** en aktie har månadsavkastningen +1,50 %
- **THEN** legenden visar `+1,50%/mån · +19,56%/år`

#### Scenario: Månadsavkastning saknas

- **WHEN** legenden visar `—/mån` för en aktie
- **THEN** ingen årsavkastning visas för aktien

#### Scenario: Totalavkastning i tusental sist

- **WHEN** en aktie i kronor har vinsten 8 234,50 kr, månadsresultatet 500,00 kr och månadsavkastningen +1,50 %
- **THEN** legenden visar `+500,00 kr/mån · +1,50%/mån · +19,56%/år · +8,2 kkr`

#### Scenario: Utländsk valuta i tusental

- **WHEN** en aktie i USD har förlusten 420,00 USD
- **THEN** raden slutar med `−0,4 kUSD`
