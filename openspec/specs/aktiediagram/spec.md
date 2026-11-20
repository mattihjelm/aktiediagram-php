# Aktiediagram och portföljtransaktioner

## Purpose

Beskriver aktieappen som PHP-app på ett delat webbhotell: hämtning och jämförelse av aktiekurser, interaktivt diagram, köp och säljaffärer, portföljresultat samt import från mäklarens transaktionsexport.

## Requirements

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

### Requirement: Historiska kurser och indexerat jämförelsediagram

Appen SHALL hämta justerade dagskurser från Yahoo Finance med historik från 2010-01-01. Hämtningen SHALL göras av servern när appen eller ett API-anrop behöver kursdata. Dagens kurs SHALL endast inkluderas efter respektive börsstängning och en kort publiceringsmarginal. Kurserna SHALL visas som separata kurvor i ett gemensamt diagram. Varje kurva SHALL indexeras till 100 vid den första tillgängliga kursen inom det synliga datumintervallet. Berkshire Hathaway B (`BRK-B`) SHALL räknas om från USD till SEK med hämtad USD/SEK-kurs. Aktier utan användbar kursdata SHALL hoppas över utan att stoppa övriga diagrammet.

Diagrammets titel SHALL visa tidsstämpeln för den senast ändrade programfilen i appkatalogen i lokalt tidsformat `ÅÅÅÅ-MM-DD HH:MM`, så att den återspeglar senaste driftsättningen. Git-metadata, datakatalogen med `aktier.csv`, `aktiekop.csv` och `aktievy.json`, cachade kursdata och uppladdade filer SHALL inte påverka tidsstämpeln.

#### Scenario: Starta diagrammet

- **WHEN** appen har hämtat historiska kurser för aktierna
- **THEN** diagrammet visar deras indexutveckling i samma koordinatsystem
- **AND** synligt startdatum är som standard 2020-01-01
- **AND** slutdatumet är den senaste tillgängliga slutkursens datum utan framtida tomt intervall

#### Scenario: Visa aktuellt datum efter intradagsuppdatering

- **WHEN** en aktuell kurs hämtas för en aktie
- **THEN** diagrammets synliga slutdatum och nedre datumreglage utökas till dagens datum i svensk tidszon
- **AND** aktier som inte har uppdaterats får inga syntetiska datapunkter för de saknade datumen

#### Scenario: Visa aktuell kurs till och med dagens datum

- **WHEN** användaren hämtar en aktuell intradagskurs efter dagens slutkursdatum
- **THEN** diagrammets högra gräns och slutdatumfält utökas till intradagskursens datum

#### Scenario: Ändra synligt datumintervall

- **WHEN** användaren flyttar datumreglaget eller zoomar diagrammet
- **THEN** varje aktie indexeras om till 100 vid sin första tillgängliga kurs inom det nya synliga intervallet
- **AND** köp- och säljmarkeringarnas höjd räknas om mot samma indexbas
- **AND** y-axeln anpassas efter de synliga kurvorna

#### Scenario: Ange synliga datum direkt

- **WHEN** användaren anger start- och slutdatum i ISO-formatet `ÅÅÅÅ-MM-DD`
- **THEN** diagrammets synliga datumintervall och nedre datumreglage uppdateras till dessa datum
- **AND** varje aktie indexeras om vid det nya synliga startdatumet
- **WHEN** användaren i stället flyttar handtagen i datumreglaget
- **THEN** start- och slutdatumfälten uppdateras så att de motsvarar det synliga intervallet
- **AND** ogiltiga datum, datum utanför tillgänglig historik eller startdatum efter slutdatum accepteras inte

#### Scenario: Återanvänd senaste datumintervall

- **WHEN** användaren ändrar det synliga intervallet med datumfälten, datumreglaget eller zoomning
- **THEN** start- och slutdatum sparas i `aktievy.json`
- **WHEN** appen öppnas nästa gång
- **THEN** det sparade intervallet används och begränsas till tillgänglig kurshistorik

#### Scenario: Historik saknas för en aktie

- **WHEN** en ticker inte ger användbara kursdata
- **THEN** appen visar i webbläsaren att den aktien hoppas över
- **AND** övriga tillgängliga aktier visas normalt

#### Scenario: Hämta nya slutkurser utan omstart

- **WHEN** användaren klickar på knappen för senaste slutkurser
- **THEN** appen hämtar Yahoo Finance-data senare än den senast inlästa dagen
- **AND** kurser inkluderas först efter respektive börsstängning och en kort publiceringsmarginal
- **AND** nya kurser läggs till i diagrammet, rangeslidern och resultatberäkningen utan att sidan laddas om
- **WHEN** ingen senare slutkurs finns
- **THEN** appen meddelar att ingen ny slutkurs är tillgänglig

#### Scenario: Hämta aktuella intradagskurser

- **WHEN** användaren klickar på `Hämta aktuell kurs`
- **THEN** appen hämtar senaste tillgängliga intradagskurs från Yahoo Finance för aktierna
- **AND** diagram, legend och vinst/förlust-tabellen uppdateras med kurserna utan att sidan laddas om
- **AND** Berkshire-kursen räknas om till SEK

#### Scenario: Yahoo Finance kan inte nås

- **WHEN** servern inte får svar från Yahoo Finance
- **THEN** appen visar ett begripligt fel i webbläsaren
- **AND** redan inlästa kurser och sparade transaktioner påverkas inte

### Requirement: Kurvornas synlighet och legend

Diagrammet SHALL visa en extern värdepapperslista, `Värdepapperslistan`, med en solo-checkbox och klickbart aktienamn för varje tillgänglig aktie. Klick på aktienamnet SHALL växla kurvan och dess transaktionsmarkeringar av eller på och spara synligheten så att den används vid nästa start: i `aktier.csv` för ett värdepapper utan konto och i `aktievy.json` för ett värdepapper med konto, enligt kravet Konto per transaktion. Solo SHALL visa endast den valda aktien och dess transaktioner, och avmarkering SHALL återställa synligheten från före sololäget. Solo-läget SHALL inte ändra sparade synlighetsinställningar. Kurvnamn vid kurvornas slut SHALL vara förbundna med sina slutpunkter av tunna svarta ledarlinjer och placeras så att etiketterna inte överlappa. Hovring över ett externt aktienamn SHALL tillfälligt öka motsvarande kurvas tjocklek från 2 px till 5 px. Legendens vinst/förlustinformation SHALL följa respektive aktienamn. Utanför telefonlayouten SHALL legenden vara cirka 20 % bredare och ha cirka 20 % större text än tidigare: aktienamn i 17 pixlar och avkastningsraden, rubriken, hjälptexten och sorteringsknapparna i 14,5 pixlar. Aktienamnet och avkastningsraden under varje aktie SHALL visas med en textfärg som är 30 % mörkare än tidigare, det vill säga varje färgkanal multiplicerad med 0,7: aktienamnet i `#1b2432` och avkastningsraden i `#1e2631`. Dolda aktier SHALL fortfarande visas nedtonade. Listans kolumnrubrik SHALL vara `Värdepapper / resultat`. Legendens rubrik SHALL ha fem sorteringsknappar: `Osorterad`, som visar aktierna i ordningen i `aktier.csv`, `Namn`, som sorterar efter visningsnamn i svensk alfabetisk ordning, `%/mån`, som sorterar efter månadsavkastning i procent med högst först och aktier utan månadsavkastning sist i ordningen i `aktier.csv`, `Total`, som sorterar efter den totala avkastningen omräknad till SEK med senaste valutakurs, med högst först och aktier utan avkastning sist i ordningen i `aktier.csv`, och `Total %`, som sorterar efter total avkastning i procent, samma värde som kolumnen `Tot avkastn (%)` i `Resultat`, med högst först och aktier utan värde sist i ordningen i `aktier.csv`. Den valda knappen SHALL vara markerad. Valet SHALL sparas i `aktievy.json` som `legend_sort` med värdet `none`, `name`, `monthly`, `total` eller `total_percent` och användas vid nästa start; utan sparat eller med ogiltigt värde SHALL `Osorterad` gälla. Sorteringen SHALL endast ändra ordningen i legenden; kurvor, färger, kurvetiketter, solo-val, synlighet, listorna `Transaktioner` och `Resultat` samt `aktier.csv` SHALL inte påverkas. Vid sortering på `%/mån`, `Total` eller `Total %` SHALL ordningen uppdateras när avkastningen räknas om.

Sist i legendens rubrik, efter sorteringsknapparna, SHALL ett sökfält med etiketten `Sök värdepapper` filtrera listans rader till värdepapper vars visningsnamn, inklusive kontot inom parentes, innehåller den inskrivna texten var som helst i namnet, utan hänsyn till versaler och gemener. Ett tomt sökfält SHALL visa alla värdepapper. Filtret SHALL uppdateras medan användaren skriver, utan att fältet tappar fokus, och SHALL gälla tillsammans med vald sortering. Filtret SHALL endast ändra vilka rader legenden visar; kurvor, synlighet, solo-val, sparade inställningar och listorna `Transaktioner` och `Resultat` SHALL inte påverkas, och söktexten SHALL inte sparas. När inget värdepapper matchar SHALL legenden visa texten `Inga värdepapper matchar sökningen.`

När solo väljs SHALL listorna `Transaktioner` och `Resultat` filtreras till den valda aktien om kryssrutan `Filtrera aktier enligt solo-val` är markerad. Kryssrutan SHALL vara markerad som standard. En separat kryssruta `Filtrera enligt diagramval` SHALL filtrera båda listorna till aktier vars kurvor är synliga i diagrammet och vara avmarkerad som standard. Båda filtren SHALL kunna användas samtidigt; då visas endast aktier som uppfyller båda valen. Listan `Resultat` SHALL visas ovanför listan `Transaktioner` enligt kravet Visa aktuell portföljställning bredvid transaktionslistan.

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
- **AND** sparade synlighetsvärden i `aktier.csv` och `aktievy.json` lämnas oförändrade

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


#### Scenario: Sortera på total avkastning i procent

- **WHEN** användaren klickar på `Total %`
- **THEN** värdepapperslistan visar värdepapperet med högst `Tot avkastn (%)` först och värdepapper utan värde sist
- **AND** knappen `Total %` är markerad och `aktievy.json` innehåller `legend_sort` med värdet `total_percent`
- **WHEN** appen öppnas igen
- **THEN** listan är sorterad på `Total %`

#### Scenario: Mörkare text i värdepapperslistan

- **WHEN** värdepapperslistan visas
- **THEN** aktienamnen har textfärgen `#1b2432` och avkastningsraderna `#1e2631`

#### Scenario: Sök på del av namnet

- **WHEN** användaren skriver `glob` i `Sök värdepapper`
- **THEN** listan visar endast värdepapper med `glob` någonstans i namnet, oavsett versaler och gemener
- **AND** kurvornas synlighet, solo-valet och listorna `Transaktioner` och `Resultat` är oförändrade
- **WHEN** användaren tömmer sökfältet
- **THEN** alla värdepapper visas igen i vald sortering

#### Scenario: Sök på konto

- **WHEN** användaren skriver `(i)` i `Sök värdepapper`
- **THEN** listan visar endast värdepapper på konto `I`

#### Scenario: Ingen träff

- **WHEN** söktexten inte finns i något värdepappers namn
- **THEN** legenden visar `Inga värdepapper matchar sökningen.`

#### Scenario: Söktexten sparas inte

- **WHEN** användaren har skrivit en söktext och laddar om sidan
- **THEN** sökfältet är tomt och alla värdepapper visas

### Requirement: Senast valda solo-aktie

Appen SHALL spara det senast solo-valda värdepapperet, med konto om det har ett, i `aktievy.json` som `last_solo` varje gång användaren markerar solo för en aktie. När solo avslutas, genom att användaren avmarkerar solo eller klickar på en akties namn i legenden medan solo är aktivt, SHALL `last_solo` tömmas. När sidan öppnas och `last_solo` anger ett värdepapper i diagrammet SHALL det väljas som solo automatiskt, oavsett skärmstorlek, med minutdiagram och filtrerade listor som vid ett manuellt solo-val. När solo därefter avmarkeras SHALL de aktier visas som var synliga innan solo valdes, det vill säga den sparade synligheten. Ett äldre sparat värde som är en ticker utan konto SHALL välja tickerns första värdepapper i kontoordning A–Z. Ett sparat värde som inte motsvarar något värdepapper i diagrammet SHALL ignoreras. Övriga inställningar i `aktievy.json` SHALL behållas när `last_solo` sparas eller töms.

#### Scenario: Spara solo-val

- **WHEN** användaren markerar solo för `Saab (T)`
- **THEN** `aktievy.json` innehåller `last_solo` som anger Saab på konto `T`
- **AND** datumintervall och skala i `aktievy.json` är oförändrade

#### Scenario: Avmarkera solo

- **WHEN** användaren avmarkerar solo
- **THEN** `last_solo` töms i `aktievy.json`
- **AND** datumintervall och skala i `aktievy.json` är oförändrade

#### Scenario: Starta med senaste solo-val

- **WHEN** användaren öppnar appen, på dator eller telefon, och `last_solo` anger Saab på konto `T`
- **THEN** `Saab (T)` väljs som solo och Saabs minutdiagram visas

#### Scenario: Avmarkera solo efter start

- **WHEN** appen har startat med Saab som solo och användaren avmarkerar solo
- **THEN** de värdepapper som är sparade som synliga visas igen
- **AND** nästa start sker utan solo

#### Scenario: Ingen sparad solo-aktie

- **WHEN** användaren öppnar appen och `last_solo` saknas eller är tomt
- **THEN** inget värdepapper väljs som solo och värdepapperen visas enligt sparad synlighet

#### Scenario: Borttagen aktie

- **WHEN** `last_solo` anger en aktie som inte längre finns i `aktier.csv`
- **THEN** värdet ignoreras och ingen aktie väljs automatiskt

#### Scenario: Äldre sparad solo-aktie utan konto

- **WHEN** `last_solo` är `SAAB-B.ST` och Saab har transaktioner på konto `T`
- **THEN** `Saab (T)` väljs som solo

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

### Requirement: Kurvetiketter inne i huvuddiagrammet

Huvuddiagrammets kurvnamn vid kurvornas slut SHALL placeras inne i diagramytan, till vänster om respektive kurvas sista synliga punkt, med tunna ledarlinjer och utan att etiketterna överlappar varandra. Diagrammets högermarginal SHALL inte reserveras för etiketterna. Y-axelns rubrik SHALL inte visas med linjär skala; rubrikerna för logaritmisk skala och för måtten SHALL visas som tidigare.

#### Scenario: Etiketter inne i diagrammet

- **WHEN** huvuddiagrammet visar flera aktier
- **THEN** varje kurvnamn visas inne i diagramytan vid kurvans slut med en ledarlinje till slutpunkten
- **AND** diagramytan sträcker sig nästan ända till diagrammets högra kant

#### Scenario: Ingen indexrubrik

- **WHEN** linjär skala är vald
- **THEN** texten `Index (100 = synligt startdatum)` visas inte vid y-axeln

### Requirement: Kursinformation och jämförelsemarkeringar

Hovring över diagrammet SHALL visa datum samt både aktiens kurs och dess indexvärde för aktier vars kurvor är synliga. Datum SHALL visas med år, månad och dag. Informationen SHALL begränsas till högst två rader per aktie. Ett diagramklick SHALL välja den närmaste synliga aktiekurvan inom rimligt visuellt avstånd och uppdatera aktie, datum och föreslagen kurs i transaktionsformuläret. Två klick på samma kurva SHALL skapa en bestående jämförelseetikett med aktienamn, procentuell kursförändring, procent per månad och förfluten tid i månader. Jämförelsen SHALL markeras med två horisontella linjer och en vertikal linje. Dubbelklick utanför kurvorna SHALL rensa jämförelser utan att ändra datumintervallet. När en akties kurva döljs, genom klick på aktiens namn i legenden eller genom att solo väljs för en annan aktie, SHALL aktiens jämförelser och en påbörjad jämförelse på dess kurva tas bort; jämförelser på andra kurvor SHALL ligga kvar. Solo för samma aktie SHALL inte ta bort dess jämförelser. Jämförelser som tagits bort SHALL inte komma tillbaka när kurvan visas igen.

#### Scenario: Läs kurser vid hovring

- **WHEN** användaren hovrar över diagrammet
- **THEN** hovringsinformationen visar datum, aktiekurs och index för synliga aktier
- **AND** informationen per aktie ryms på högst två rader

#### Scenario: Jämför två punkter på en kurva

- **WHEN** användaren klickar på två punkter på samma kurva
- **THEN** diagrammet visar förändringen i procent, procent per månad och tidsintervallet i månader
- **AND** etiketten anger aktiens namn och jämförelsen ligger kvar tills den rensas eller aktiens kurva döljs

#### Scenario: Rensa jämförelser

- **WHEN** användaren dubbelklickar utanför kurvorna
- **THEN** samtliga jämförelseetiketter tas bort
- **AND** datumintervallet lämnas oförändrat

#### Scenario: Dölj aktien med jämförelse

- **WHEN** en jämförelse finns på Saabs kurva och användaren klickar på Saab i legenden så att kurvan döljs
- **THEN** Saabs jämförelseetikett och dess linjer tas bort
- **AND** jämförelser på andra aktiers kurvor ligger kvar
- **WHEN** användaren klickar på Saab igen så att kurvan visas
- **THEN** jämförelsen visas inte igen

#### Scenario: Solo för en annan aktie

- **WHEN** en jämförelse finns på Saabs kurva och användaren markerar solo för Volvo
- **THEN** Saabs jämförelseetikett tas bort
- **AND** den finns inte heller kvar när solo avmarkeras

#### Scenario: Solo för samma aktie

- **WHEN** en jämförelse finns på Saabs kurva och användaren markerar solo för Saab
- **THEN** jämförelseetiketten ligger kvar

### Requirement: Logaritmisk skala

Diagrammet SHALL ha skalvalet `Skala` till höger om datumintervallets start- och slutfält med kryssrutorna `Linjär`, `Logaritmisk`, `Avvikelse från 200-dagars medel`, `Fall från tidigare topp` och `Förändring över 3 månader`. De tre sista är mått. De tillåtna kombinationerna SHALL vara endast `Linjär`, endast `Logaritmisk`, endast ett mått, eller `Logaritmisk` tillsammans med ett mått. Att markera `Linjär` SHALL avmarkera alla andra, att markera `Logaritmisk` eller ett mått SHALL avmarkera `Linjär`, att markera ett mått SHALL avmarkera övriga mått, och om användaren avmarkerar den sista markerade kryssrutan SHALL `Linjär` markeras. När `Linjär` är markerad SHALL alla kurvor dela en gemensam linjär y-axel som tidigare. När `Logaritmisk` är markerad SHALL varje aktie och dess transaktionsmarkeringar visas på en egen dold logaritmisk y-axel. Alla dessa axlar SHALL ha samma logaritmiska spann, satt av den synliga kurva som varierar mest inom det synliga datumintervallet, så att lika stora procentuella rörelser blir lika höga för alla aktier. Varje kurva SHALL centreras på sin egen nivå, och de logaritmiska axlarnas skalvärden SHALL inte visas. Spannet SHALL räknas om när datumintervallet ändras eller när aktier visas eller döljs. Indexeringen till 100 vid synligt startdatum, hovervärden, legendens resultat och jämförelser SHALL vara desamma med linjär och logaritmisk skala. Valet SHALL sparas i `aktievy.json` och återställas nästa gång appen öppnas. En `aktievy.json` utan inställningen SHALL ge linjär skala, och en `aktievy.json` som bara anger logaritmisk skala på det äldre sättet SHALL ge logaritmisk skala.

#### Scenario: Slå på logaritmisk skala

- **WHEN** användaren markerar `Logaritmisk` medan `Linjär` är markerad
- **THEN** `Linjär` avmarkeras och varje kurva visas på en egen dold logaritmisk axel utan att sidan laddas om
- **AND** den synliga kurva som varierar mest fyller diagrammets höjd och övriga kurvor har samma skala centrerad på sin egen nivå
- **AND** kurvornas indexvärden, hovervärden och slutetiketter är desamma som på linjär skala

#### Scenario: Slå av logaritmisk skala

- **WHEN** användaren markerar `Linjär`
- **THEN** alla andra kryssrutor avmarkeras och alla kurvor visas åter på en gemensam linjär y-axel med synliga skalvärden

#### Scenario: Avmarkera sista kryssrutan

- **WHEN** endast `Logaritmisk` är markerad och användaren avmarkerar den
- **THEN** `Linjär` markeras och diagrammet visas med linjär y-axel

#### Scenario: Byt mått

- **WHEN** `Logaritmisk` och `Avvikelse från 200-dagars medel` är markerade och användaren markerar `Fall från tidigare topp`
- **THEN** `Avvikelse från 200-dagars medel` avmarkeras, `Logaritmisk` förblir markerad och de prickade kurvorna visar fallet från toppen

#### Scenario: Ändra datumintervall på logaritmisk skala

- **WHEN** logaritmisk skala är vald och användaren ändrar det synliga datumintervallet
- **THEN** kurvorna indexeras om till 100 vid det nya startdatumet
- **AND** skalan förblir logaritmisk och det gemensamma spannet räknas om för det nya intervallet

#### Scenario: Visa eller dölj aktie på logaritmisk skala

- **WHEN** logaritmisk skala är vald och användaren visar en aktie som varierar mer än de andra synliga
- **THEN** spannet ökar så att den aktien fyller höjden och övriga kurvor blir flackare
- **WHEN** den aktien döljs igen
- **THEN** spannet återgår till att sättas av de kvarvarande synliga kurvorna

#### Scenario: Valet sparas

- **WHEN** användaren har markerat en tillåten kombination i `Skala` och öppnar appen igen
- **THEN** samma kryssrutor är markerade och diagrammet visas med det läget

#### Scenario: Äldre vyinställning

- **WHEN** `aktievy.json` bara innehåller `start` och `end`
- **THEN** diagrammet visas med linjär y-axel och det sparade datumintervallet
- **WHEN** `aktievy.json` innehåller `log_scale` med värdet `true` men ingen `scale`
- **THEN** `Logaritmisk` är markerad och diagrammet visas med logaritmisk y-axel

### Requirement: Avvikelse från glidande medel

Skalvalet SHALL ha kryssrutan `Avvikelse från 200-dagars medel`. Avvikelsen för en aktie SHALL vara den procentuella avvikelsen mellan aktiens stängningskurs och dess eget glidande medelvärde över de 200 senaste handelsdagarna till och med samma dag, beräknat som `(kurs / medelvärde − 1) × 100`. Medelvärdet SHALL beräknas över aktiens hela hämtade kurshistorik, så att en dags värde inte beror på det synliga datumintervallet, och de första 199 handelsdagarna i aktiens historik SHALL sakna värde. När endast `Avvikelse från 200-dagars medel` är markerad SHALL varje aktie visas som sin avvikelse; alla kurvor SHALL dela en gemensam linjär y-axel i procent med rubriken `Avvikelse från 200-dagars medel (%)` och en vågrät referenslinje vid 0 %, och y-axeln SHALL anpassas till de synliga värdena i det synliga datumintervallet. Hovring SHALL då visa datum, aktiens kurs och avvikelsen i procent med en decimal i stället för indexvärdet. Kurvornas slutetiketter och transaktionsmarkeringarna SHALL placeras på avvikelsekurvan vid sitt datum. Jämförelser SHALL fortfarande visa den procentuella kursförändringen mellan de två klickade punkterna, procent per månad och förfluten tid, medan jämförelsens linjer ritas vid punkternas avvikelsevärden. Nollpunktslinjen för en solo-vald aktie SHALL inte visas när endast avvikelse är vald. När både `Logaritmisk` och `Avvikelse från 200-dagars medel` är markerade SHALL aktiekurvorna, deras transaktionsmarkeringar, slutetiketter, jämförelser och nollpunktslinje visas exakt som med enbart logaritmisk skala, och dessutom SHALL varje synlig aktie ha en avvikelsekurva i samma färg som en tunn prickad linje mot en synlig y-axel till vänster i procent med rubriken `Avvikelse från 200-dagars medel (%)` och en vågrät referenslinje vid 0 %; den axeln SHALL anpassas till de synliga avvikelsevärdena. Hovring SHALL i det läget även visa avvikelsen för varje synlig aktie. Avvikelsekurvorna SHALL inte kunna väljas för jämförelser eller transaktionsformuläret, SHALL inte ha egna slutetiketter eller markeringar och SHALL döljas och visas tillsammans med sin aktie. Byte av läge SHALL ske utan att sidan laddas om, och legendens resultat, transaktionslistan och minutdiagrammet SHALL inte påverkas.

#### Scenario: Välj avvikelse från glidande medel

- **WHEN** användaren markerar `Avvikelse från 200-dagars medel` medan `Linjär` är markerad
- **THEN** `Linjär` avmarkeras och varje synlig aktie visas som procentuell avvikelse från sitt 200-dagars glidande medelvärde på en gemensam axel i procent med en referenslinje vid 0 %
- **AND** sidan laddas inte om

#### Scenario: Jämförbara nedgångar

- **WHEN** en aktie låg 25 % under sitt glidande medel 2020 och 10 % under det 2025
- **THEN** nedgången 2020 visas som ungefär −25 % och nedgången 2025 som ungefär −10 % på samma axel, oberoende av kursnivån

#### Scenario: Oberoende av synligt intervall

- **WHEN** användaren ändrar det synliga datumintervallet i avvikelseläget
- **THEN** varje dags avvikelsevärde är oförändrat och y-axeln anpassas till de nya synliga värdena

#### Scenario: Början av historiken

- **WHEN** det synliga intervallet omfattar en akties första 199 handelsdagar
- **THEN** kurvan saknar värden för de dagarna och börjar vid den 200:e handelsdagen

#### Scenario: Hovring och jämförelse i avvikelseläget

- **WHEN** användaren hovrar över en kurva när endast avvikelse är vald
- **THEN** datum, kurs och avvikelse i procent visas
- **WHEN** användaren klickar på två punkter på samma kurva
- **THEN** jämförelsen visar kursförändringen mellan punkterna och dess linjer ritas vid punkternas avvikelsevärden

#### Scenario: Solo i avvikelseläget

- **WHEN** en aktie i innehavet är solo-vald och endast avvikelse är vald
- **THEN** ingen nollpunktslinje visas i huvuddiagrammet
- **AND** nollpunktslinjen visas igen när `Linjär` eller `Logaritmisk` markeras

#### Scenario: Logaritmisk skala och avvikelse samtidigt

- **WHEN** användaren markerar både `Logaritmisk` och `Avvikelse från 200-dagars medel`
- **THEN** aktiekurvorna visas på egna dolda logaritmiska axlar som med enbart logaritmisk skala
- **AND** varje synlig aktie har dessutom en tunn prickad avvikelsekurva i samma färg mot en synlig vänster y-axel i procent med en referenslinje vid 0 %
- **AND** hovring visar både kurs, index och avvikelse

#### Scenario: Avvikelsekurvor i kombinationsläget

- **WHEN** både logaritmisk skala och avvikelse är valda och användaren döljer en aktie
- **THEN** både aktiekurvan och dess avvikelsekurva döljs
- **WHEN** användaren klickar på en avvikelsekurva
- **THEN** ingen jämförelsepunkt väljs och transaktionsformuläret ändras inte

### Requirement: Fall från tidigare topp och förändring över 3 månader

Skalvalet SHALL ha kryssrutorna `Fall från tidigare topp` och `Förändring över 3 månader` efter `Avvikelse från 200-dagars medel`. Fall från tidigare topp SHALL för varje dag vara `(kurs / högsta stängningskurs till och med samma dag − 1) × 100`, räknat över aktiens hela hämtade kurshistorik, så att värdet är 0 % vid varje ny högsta nivå och negativt däremellan. Förändring över 3 månader SHALL för varje dag vara `(kurs / stängningskurs 63 handelsdagar tidigare − 1) × 100`, och de första 63 handelsdagarna i aktiens historik SHALL sakna värde. Inget av måtten SHALL bero på det synliga datumintervallet. Varje mått SHALL visas på samma sätt som `Avvikelse från 200-dagars medel`: ensamt som aktiens kurva på en gemensam y-axel i procent med referenslinje vid 0 %, hovring med kurs och måttets värde, slutetiketter, transaktionsmarkeringar och jämförelselinjer på måttkurvan och utan nollpunktslinje; tillsammans med `Logaritmisk` som tunna prickade kurvor per synlig aktie mot en synlig vänster y-axel i procent, utöver de logaritmiska kurvorna. Y-axelns rubrik SHALL vara `Fall från tidigare topp (%)` respektive `Förändring över 3 månader (%)`, och hovringen SHALL namnge måttet.

#### Scenario: Fall från tidigare topp

- **WHEN** användaren markerar `Fall från tidigare topp`
- **THEN** varje synlig aktie visas som procent under sin högsta stängningskurs hittills, med 0 % vid nya toppar
- **AND** en nedgång på 25 % från toppen visas som −25 % oavsett kursnivå

#### Scenario: Förändring över 3 månader

- **WHEN** användaren markerar `Förändring över 3 månader`
- **THEN** varje synlig aktie visas som kursförändringen i procent mot 63 handelsdagar tidigare
- **AND** de första 63 handelsdagarna i aktiens historik saknar värde

#### Scenario: Måttet tillsammans med logaritmisk skala

- **WHEN** `Logaritmisk` och `Fall från tidigare topp` är markerade
- **THEN** de logaritmiska kurvorna visas som med enbart logaritmisk skala
- **AND** varje synlig aktie har en tunn prickad kurva för fallet från toppen mot en vänster y-axel i procent med rubriken `Fall från tidigare topp (%)`

### Requirement: Minutkurser för solo-vald aktie

När en aktie visas solo SHALL ett separat minutdiagram visas under huvuddiagrammet med rubriken `<aktiens namn> – minutkurser`. Minutdiagrammet SHALL visa aktiens verkliga kurs i aktiens handelsvaluta minut för minut för de senaste 30 dagarna som Yahoo Finance tillhandahåller, och valutan SHALL framgå av y-axeln och hovervärdet. Tider SHALL visas i svensk tid. Diagrammet SHALL öppnas med den senaste veckan synlig och ha knapparna `Vecka` och `Månad` som visar de senaste 7 respektive 30 dagarna; y-axeln SHALL anpassas till kurserna i det synliga intervallet. Tid utan handel, som nätter, helger och helgdagar, SHALL döljas på tidsaxeln så att handelsdagarna ligger intill varandra. Minutkurserna SHALL hämtas när solo väljs, och medan de hämtas SHALL en statustext visas. Om hämtningen misslyckas SHALL ett felmeddelande visas i minutdiagrammets ruta utan att huvuddiagrammet påverkas. När solo avmarkeras SHALL minutdiagrammet döljas, och när solo flyttas till en annan aktie SHALL minutdiagrammet visa den nya aktien. Minutkurser SHALL endast kunna hämtas för inloggad användare och för aktier i `aktier.csv`. Huvuddiagrammet, den logaritmiska skalan och `aktievy.json` SHALL inte påverkas av minutdiagrammet.

#### Scenario: Välj solo

- **WHEN** användaren markerar solo för en aktie
- **THEN** ett minutdiagram visas under huvuddiagrammet med aktiens minutkurser i aktiens valuta
- **AND** den senaste veckan är synlig och knappen `Vecka` är vald

#### Scenario: Zooma ut till en månad

- **WHEN** användaren klickar på `Månad`
- **THEN** minutdiagrammet visar de senaste 30 dagarna med minutkurser
- **AND** y-axeln anpassas till kurserna i hela intervallet
- **WHEN** användaren klickar på `Vecka`
- **THEN** minutdiagrammet visar åter de senaste 7 dagarna

#### Scenario: Tid utan handel döljs

- **WHEN** minutdiagrammet visar en period som innehåller nätter och en helg
- **THEN** tidsaxeln hoppar över tiden utan handel och kurvan har inga tomma partier för den tiden

#### Scenario: Byt eller avsluta solo

- **WHEN** användaren flyttar solo till en annan aktie
- **THEN** minutdiagrammet visar den nya aktiens minutkurser
- **WHEN** användaren avmarkerar solo
- **THEN** minutdiagrammet döljs och huvuddiagrammet är oförändrat

#### Scenario: Hämtningen misslyckas

- **WHEN** Yahoo Finance inte kan nås eller inte returnerar minutkurser för aktien
- **THEN** minutdiagrammets ruta visar ett felmeddelande
- **AND** huvuddiagrammet och solo-läget fungerar som vanligt

#### Scenario: Okänd aktie

- **WHEN** någon begär minutkurser för en symbol som inte finns i `aktier.csv`
- **THEN** begäran avvisas och ingen hämtning från Yahoo Finance görs

### Requirement: Senaste kurs i minutdiagrammets statusrad

Minutdiagrammets statusrad SHALL visa tiden för den senaste minutkursen följd av själva kursen med två decimaler och valuta, i formen `Senaste kurs <tid>: <kurs> <valuta>`, där kronor visas som `kr`. Eventuella varningar om ofullständig hämtning SHALL visas efter.

#### Scenario: Senaste kurs med pris

- **WHEN** minutkurserna för Saab har hämtats och den senaste minuten är 2026-11-16 15:42 med kursen 641,4 kr
- **THEN** statusraden visar `Senaste kurs 2026-11-16 15:42: 641,40 kr`

### Requirement: Låst punkt i minutdiagrammet

Ett klick på en punkt i minutdiagrammet SHALL låsa den punkten: den markeras i diagrammet med en punkt och en lodrät linje, och en popup visas intill punkten med tid i svensk tid och kurs i aktiens valuta. Popupen SHALL ligga kvar tills den stängs, oavsett var pekaren befinner sig. Popupen SHALL ha knapparna `◀`, `▶` och `×`. `◀` och vänster piltangent SHALL flytta den låsta punkten till föregående minut med kurs, och `▶` och höger piltangent SHALL flytta den till nästa minut med kurs; tid utan handel och minuter utan kurs SHALL hoppas över. Vid första respektive sista minuten SHALL motsvarande knapp vara inaktiverad. `×` och `Esc` SHALL stänga popupen och ta bort markeringen. Piltangenterna SHALL bara styra den låsta punkten när en punkt är låst och fokus inte ligger i ett textfält eller en listruta, och de SHALL då inte rulla sidan. Om den låsta punkten flyttas utanför det synliga tidsintervallet SHALL diagrammet panoreras så att punkten syns, med bibehållen intervallbredd. Ett klick på en annan punkt SHALL flytta låsningen dit. Byte till `Vecka` eller `Månad` SHALL behålla den låsta punkten om den finns i det nya intervallet och annars stänga popupen. Byte av solo-aktie eller avmarkerad solo SHALL stänga popupen. Hovring SHALL fungera som tidigare även när en punkt är låst. Huvuddiagrammets klick för jämförelser SHALL inte påverkas.

#### Scenario: Lås en punkt

- **WHEN** användaren klickar på en punkt i minutdiagrammet
- **THEN** punkten markeras och en popup med tid och kurs visas intill den
- **AND** popupen ligger kvar när pekaren flyttas bort från diagrammet

#### Scenario: Stega med piltangenter

- **WHEN** en punkt är låst och användaren trycker på höger piltangent
- **THEN** markeringen och popupen flyttas till nästa minut med kurs och visar den minutens tid och kurs
- **AND** sidan rullar inte
- **WHEN** användaren trycker på vänster piltangent
- **THEN** markeringen flyttas tillbaka en minut

#### Scenario: Stega över tid utan handel

- **WHEN** den låsta punkten är dagens sista minut med kurs och användaren trycker på `▶`
- **THEN** markeringen flyttas till nästa handelsdags första minut med kurs

#### Scenario: Stega utanför synligt intervall

- **WHEN** den låsta punkten är den sista synliga minuten efter en zoomning och användaren trycker på höger piltangent
- **THEN** diagrammet panoreras så att den nya punkten syns och det synliga intervallet behåller sin bredd

#### Scenario: Första och sista minuten

- **WHEN** den låsta punkten är den sista minuten med kurs
- **THEN** `▶` är inaktiverad och höger piltangent flyttar inte markeringen

#### Scenario: Stäng popupen

- **WHEN** användaren klickar på `×` eller trycker på `Esc`
- **THEN** popupen och markeringen försvinner och piltangenterna styr inte längre diagrammet

#### Scenario: Byt solo-aktie

- **WHEN** en punkt är låst och användaren väljer solo för en annan aktie eller avmarkerar solo
- **THEN** popupen och markeringen försvinner

### Requirement: Nollpunktslinje i minutdiagrammet

När den solo-valda aktien finns i innehavet SHALL minutdiagrammet visa en vågrät streckad linje vid nollpunkten, märkt `Nollpunkt <pris> <valuta>` med två decimaler. Nollpunkten SHALL vara GAV minus aktiens totala utdelning efter källskatt dividerad med antal aktier i innehavet. GAV och antal SHALL vara samma värden som i portföljtabellens kolumner `GAV` och `Antal`, och utdelningen SHALL omfatta alla registrerade utdelningar för aktien. Nollpunkten SHALL anges i minutdiagrammets valuta. Utdelningar i en annan valuta än aktiens SHALL räknas om med valutakurserna på respektive utdelningsdag. Om aktiens transaktioner är i kronor men minutdiagrammet visar en annan valuta SHALL nollpunkten räknas om med den senaste valutakursen. Om nollpunkten ligger utanför det synliga kursintervallet SHALL etiketten visas vid diagrammets övre eller nedre kant med en pil mot linjen, och y-axeln SHALL fortsätta att anpassas till kurserna. Om aktien inte finns i innehavet, eller om en valutakurs som behövs saknas, SHALL ingen linje visas och minutdiagrammet i övrigt fungera som vanligt. Nollpunkten SHALL uppdateras när transaktioner registreras, ändras, tas bort eller importeras medan aktien är solo-vald. Den låsta punkten i minutdiagrammet SHALL fungera som tidigare när linjen visas.

#### Scenario: Aktie i innehavet

- **WHEN** användaren väljer solo för en aktie med 10 aktier i innehav, GAV 200,00 kr och totalt 50,00 kr i utdelning efter källskatt
- **THEN** minutdiagrammet visar en vågrät linje märkt `Nollpunkt 195,00 kr`

#### Scenario: Aktie utan innehav

- **WHEN** användaren väljer solo för en aktie som inte finns i innehavet
- **THEN** minutdiagrammet visas utan nollpunktslinje

#### Scenario: Utdelning i annan valuta

- **WHEN** en USD-aktie har utdelningar registrerade i SEK
- **THEN** utdelningarna räknas om till USD med valutakursen på respektive utdelningsdag innan nollpunkten beräknas

#### Scenario: Transaktioner i kronor, minutkurser i USD

- **WHEN** aktiens transaktioner är i kronor och minutdiagrammet visar USD
- **THEN** nollpunkten visas i USD, omräknad med den senaste USD/SEK-kursen

#### Scenario: Nollpunkt utanför synligt intervall

- **WHEN** nollpunkten ligger under det synliga kursintervallet
- **THEN** etiketten visas vid diagrammets nedre kant med en nedåtpil
- **AND** y-axeln är anpassad till kurserna, inte till nollpunkten

#### Scenario: Ny transaktion medan aktien är solo

- **WHEN** användaren registrerar ett köp av den solo-valda aktien
- **THEN** nollpunktslinjen flyttas till den nya nollpunkten utan att minutkurserna hämtas på nytt

#### Scenario: Låst punkt och nollpunkt

- **WHEN** en punkt är låst och nollpunktslinjen visas
- **THEN** både den lodräta linjen för den låsta punkten och nollpunktslinjen syns
- **AND** när popupen stängs finns nollpunktslinjen kvar

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

### Requirement: Transaktioner i minutdiagrammet

Minutdiagrammet SHALL markera den solo-valda aktiens registrerade köp, sälj och utdelningar vars datum har minutkurser. Ett köp eller sälj med klockslag SHALL placeras vid den första minuten med kurs på eller efter klockslaget samma dag, eller vid dagens sista minut med kurs om klockslaget ligger efter den. Köp och sälj utan klockslag samt utdelningar SHALL placeras vid dagens första minut med kurs. Köp och sälj SHALL placeras vid transaktionens kurs omräknad till minutdiagrammets valuta, och utdelningar SHALL placeras på kurskurvan vid sin minut. Markeringarna SHALL ha samma symboler som i huvuddiagrammet, cirkel för köp, nedåtriktad triangel för sälj och romb för utdelning, och aktiens färg från huvuddiagrammet. Hovring över en markering SHALL visa typ, antal, kurs eller utdelning per aktie samt courtage respektive källskatt i transaktionens valuta, och klockslaget när det finns. Händelser på dagar utan minutkurser SHALL inte visas. Markeringarna SHALL uppdateras när transaktioner registreras, ändras, tas bort eller importeras medan aktien är solo-vald. Den låsta punkten, nollpunktslinjen, `Vecka` och `Månad`, arkivet med minutkurser och huvuddiagrammet SHALL inte påverkas.

#### Scenario: Köp i minutdiagrammet

- **WHEN** den solo-valda aktien har ett köp utan klockslag för 10 dagar sedan till 450,00 kr och minutdiagrammet visar månaden
- **THEN** en cirkel visas vid kursen 450,00 kr vid den dagens första minut med kurs
- **AND** hovring över cirkeln visar `KÖP`, antal, kurs och courtage

#### Scenario: Köp med klockslag

- **WHEN** den solo-valda aktien har ett köp med klockslaget 10:42 en dag med minutkurser
- **THEN** cirkeln visas vid den första minuten med kurs från 10:42 den dagen
- **AND** hovringen visar `kl. 10:42`

#### Scenario: Klockslag efter handelns slut

- **WHEN** ett sälj har klockslaget 18:05 och dagens sista minut med kurs är 17:29
- **THEN** triangeln visas vid 17:29 samma dag

#### Scenario: Utdelning i minutdiagrammet

- **WHEN** den solo-valda aktien har en utdelning för 5 dagar sedan
- **THEN** en romb visas på kurskurvan vid den dagens första minut med kurs
- **AND** hovring visar utdelning per aktie, antal och källskatt

#### Scenario: Annan valuta

- **WHEN** aktiens transaktioner är i kronor men minutdiagrammet visar USD
- **THEN** köp och sälj placeras vid transaktionskursen omräknad till USD

#### Scenario: Äldre händelser

- **WHEN** en händelse är äldre än minutkurserna eller infaller en dag utan handel
- **THEN** den visas inte i minutdiagrammet

#### Scenario: Ny händelse medan aktien är solo

- **WHEN** användaren registrerar ett köp av den solo-valda aktien med dagens datum
- **THEN** en cirkel visas i minutdiagrammet vid klockslaget, eller vid dagens första minut med kurs om klockslag saknas, utan att minutkurserna hämtas på nytt

### Requirement: Nollpunktslinje i huvuddiagrammet vid solo

När en aktie är solo-vald och finns i innehavet SHALL huvuddiagrammet visa en vågrät streckad linje vid aktiens nollpunkt, märkt `Nollpunkt <pris> <valuta>` med två decimaler. Nollpunkten SHALL beräknas som i minutdiagrammet, GAV minus aktiens totala utdelning efter källskatt dividerad med antal aktier i innehavet, och anges i huvuddiagrammets valuta för aktien. Linjen SHALL ritas på diagrammets indexskala, som nollpunkten dividerad med aktiens kurs vid det synliga startdatumet gånger 100, och SHALL flyttas när det synliga datumintervallet ändras så att den alltid motsvarar samma kurs som kurvan. Linjen SHALL fungera både med linjär och logaritmisk skala. Om nollpunkten ligger utanför det synliga intervallet på y-axeln SHALL etiketten visas vid diagrammets övre eller nedre kant med en pil mot linjen, och y-axeln SHALL fortsätta att anpassas till kurvan. Utan solo-vald aktie, när aktien inte finns i innehavet eller när en valutakurs som behövs saknas SHALL ingen linje visas. Linjen SHALL uppdateras när transaktioner registreras, ändras, tas bort eller importeras och SHALL försvinna när solo avmarkeras. Jämförelser, slutetiketter, hovervärden och `aktievy.json` SHALL inte påverkas.

#### Scenario: Solo-vald aktie i innehavet

- **WHEN** användaren väljer solo för en aktie med nollpunkten 420,00 kr och aktiens kurs vid synligt startdatum är 400,00 kr
- **THEN** huvuddiagrammet visar en vågrät linje vid index 105,00 märkt `Nollpunkt 420,00 kr`

#### Scenario: Ändrat datumintervall

- **WHEN** en nollpunktslinje visas och användaren ändrar det synliga datumintervallet
- **THEN** linjen flyttas till nollpunkten dividerad med den nya startkursen gånger 100

#### Scenario: Ingen solo eller inget innehav

- **WHEN** ingen aktie är solo-vald, eller den solo-valda aktien inte finns i innehavet
- **THEN** huvuddiagrammet visas utan nollpunktslinje

#### Scenario: Avmarkerad solo

- **WHEN** användaren avmarkerar solo
- **THEN** nollpunktslinjen försvinner och diagrammet visar de tidigare valda aktierna

#### Scenario: Logaritmisk skala

- **WHEN** logaritmisk skala är vald och en aktie med innehav är solo-vald
- **THEN** nollpunktslinjen visas på aktiens egen logaritmiska axel vid samma kurs som med linjär skala

#### Scenario: Nollpunkt utanför synligt intervall

- **WHEN** nollpunkten ligger över kurvans synliga intervall
- **THEN** etiketten visas vid diagrammets övre kant med en uppåtpil
- **AND** y-axeln är anpassad till kurvan, inte till nollpunkten

### Requirement: Registrera och spara transaktioner

Appen SHALL erbjuda ett formulär med rubriken `Registrera transaktion` och typerna Köp, Sälj och Utdelning. Formuläret SHALL ha ett obligatoriskt fält `Konto` för alla typer. Köp och sälj SHALL ha aktie, datum, antal, kurs och courtage; utdelning SHALL ha aktie, datum, antal aktier, utdelning per aktie och källskatt. Aktie och datum SHALL föreslå senast tillgänglig kurs på eller före valt datum för köp och sälj. Om användaren klickar på en kurva SHALL formuläret förifyllas med vald aktie, datum och kurs, utom vid registrering av utdelning, och med kurvans konto när kurvan har ett konto. `Konto` SHALL ta emot en bokstav A–Z, gemener SHALL sparas som versaler, och fältet SHALL föreslå de konton som redan finns i `aktiekop.csv`; innan något annat har valts SHALL fältet vara ifyllt med `T`. Belopp per aktie och courtage/källskatt SHALL visas med två decimaler. Formuläret SHALL visa totalbelopp inklusive courtage för köp, nettobelopp efter courtage för sälj och totalt utdelningsbelopp efter källskatt. Giltiga händelser SHALL sparas i `aktiekop.csv` med semikolonseparerade kolumner `date`, `transaction_type`, `ticker`, `quantity`, `price`, `commission` och `account`; importerade händelser får även ha `source_id` och `amount_currency`. Ogiltiga värden, ett konto som inte är en bokstav A–Z eller okända aktier SHALL avvisas med ett begripligt fel. Fält, listrutor och knappar, utom kryssrutor, i formuläret `Registrera transaktion` och i delarna `Kurser` och `Datumintervall` SHALL ha samma höjd som formulärets inmatningsfält: 35 pixlar på bred skärm och 33 pixlar i telefonlayout. Delarna `Kurser` och `Datumintervall` SHALL ligga under formuläret med vänsterkanten linjerad med rubriken `Registrera transaktion`.

#### Scenario: Föreslå kurs

- **WHEN** användaren väljer aktie och datum
- **THEN** kursfältet föreslår aktiens senast tillgängliga kurs på eller före datumet med två decimaler
- **AND** användaren kan ändra den föreslagna kursen

#### Scenario: Registrera köp

- **WHEN** användaren skickar in ett giltigt köp
- **THEN** köpet sparas i `aktiekop.csv` med valt konto
- **AND** formuläret visar bekräftelse och köpmarkeringen läggs omedelbart till i diagrammet

#### Scenario: Registrera sälj

- **WHEN** användaren skickar in en giltig säljtransaktion
- **THEN** transaktionen sparas som `SÄLJ`
- **AND** den visas och påverkar portföljresultatet som en säljtransaktion

#### Scenario: Registrera utdelning

- **WHEN** användaren skickar in en giltig utdelning med antal aktier, utdelning per aktie och källskatt
- **THEN** transaktionen sparas som `UTDELNING` med både antal och belopp per aktie
- **AND** nettoutdelningen visas som antal gånger utdelning per aktie minus källskatt
- **AND** utdelningen påverkar resultatet men inte innehavets antal eller anskaffningsvärde

#### Scenario: Ogiltig transaktion

- **WHEN** antal eller kurs inte är större än noll, courtage är negativt, kontot saknas eller inte är en bokstav A–Z, datumet saknar tidigare kursdata eller ticker saknar hämtad kursserie
- **THEN** transaktionen sparas inte och formuläret visar ett fel

#### Scenario: Samma höjd på fält och knappar

- **WHEN** appen visas på en bred skärm
- **THEN** typ- och aktielistorna, fälten för datum, tid, antal, kurs och courtage, knappen `Lägg till transaktion`, knapparna `Hämta slutkurser` och `Hämta aktuell kurs` samt datumintervallets start- och slutfält är 35 pixlar höga
- **WHEN** appen visas i telefonlayout
- **THEN** samma fält och knappar är 33 pixlar höga

#### Scenario: Linjerad vänsterkant

- **WHEN** appen visas på en bred skärm
- **THEN** rubrikerna `Kurser` och `Datumintervall` och deras knappar och fält börjar vid samma vänsterkant som rubriken `Registrera transaktion`

#### Scenario: Konto vid registrering

- **WHEN** användaren skriver `i` i `Konto` och registrerar ett köp av Tele2
- **THEN** raden sparas med `account` `I`
- **AND** köpet visas på `Tele2 (I)`

#### Scenario: Konto från klickad kurva

- **WHEN** användaren klickar på kurvan `Tele2 (I)`
- **THEN** formulärets aktie är Tele2 och `Konto` är `I`

### Requirement: Klockslag för köp och sälj

`aktiekop.csv` SHALL kunna ha en valfri sista kolumn `time` med klockslaget för en händelse i svensk tid i formatet `HH:MM`. Kolumnen får vara tom. När appen första gången skriver till en fil som saknar kolumnen SHALL den lägga till `time` i rubrikraden och ett tomt värde på varje befintlig rad utan att ändra några andra värden. Klockslag som användaren har fyllt i för hand SHALL bevaras när appen lägger till nya rader. Ett värde i `time` som inte är ett giltigt klockslag mellan 00:00 och 23:59 SHALL behandlas som saknat utan att filen slutar fungera. Formuläret `Registrera transaktion` SHALL ha ett valfritt fält `Tid` för köp och sälj som inte visas för utdelning; ett ifyllt klockslag SHALL sparas i `time`, och ett ogiltigt klockslag SHALL avvisas med ett begripligt fel. Transaktionslistan SHALL visa klockslaget i en egen kolumn `Tid` direkt efter `Datum`, som är tom när klockslag saknas, och kolumnen `Datum` SHALL bara visa datumet. I minutdiagrammet SHALL hovringen över ett köp eller sälj med klockslag börja med klockslaget. Importerade händelser SHALL sparas med tomt `time`. Huvuddiagrammets markeringar SHALL fortfarande placeras per dag.

#### Scenario: Registrera köp med klockslag

- **WHEN** användaren registrerar ett köp med datum 2026-11-11 och tid 10:42
- **THEN** raden sparas i `aktiekop.csv` med `time` 10:42
- **AND** transaktionslistan visar `2026-11-11` i kolumnen `Datum` och `10:42` i kolumnen `Tid`
- **AND** hovringen över köpet i minutdiagrammet börjar med `10:42`

#### Scenario: Registrera utan klockslag

- **WHEN** användaren registrerar ett köp utan att fylla i tid, eller en utdelning
- **THEN** raden sparas med tomt `time`
- **AND** kolumnen `Tid` är tom för händelsen

#### Scenario: Ogiltigt klockslag

- **WHEN** användaren anger tiden 25:10
- **THEN** händelsen avvisas med ett felmeddelande och `aktiekop.csv` ändras inte

#### Scenario: Fil utan tidskolumn

- **WHEN** `aktiekop.csv` saknar kolumnen `time` och användaren registrerar en ny händelse
- **THEN** filen får kolumnen `time` sist i rubrikraden, befintliga rader får tomt `time` och alla övriga värden är oförändrade

#### Scenario: Klockslag ifyllda för hand

- **WHEN** användaren har fyllt i `time` för hand på några rader och sedan registrerar en ny händelse i appen
- **THEN** de handifyllda klockslagen finns kvar oförändrade

#### Scenario: Felaktigt handifyllt klockslag

- **WHEN** en rad i `aktiekop.csv` har `time` med värdet `9.30`
- **THEN** filen läses som vanligt och händelsen behandlas som om klockslag saknas

### Requirement: Visa transaktioner i diagram och lista

Köp SHALL visas i huvuddiagrammet som små cirklar med mörk kontur. Sälj SHALL visas som nedåtriktade trianglar och utdelning som romber. Transaktionsmarkeringarna SHALL inte visas i det nedre översiktsdiagrammet/rangeslidern. Under diagrammet SHALL finnas en lista över registrerade transaktioner med datum, typ, aktie, antal, kurs/belopp per aktie, courtage/källskatt och total- eller nettobelopp. Listan SHALL uppdateras direkt när en transaktion har sparats. Varje rad i listan `Transaktioner` SHALL ha en knapp `Ta bort` längst till höger. Ett första klick SHALL inte ta bort något utan visa `Bekräfta` och `Avbryt` på raden; först `Bekräfta` SHALL ta bort raden ur `aktiekop.csv`. Borttagningen SHALL gälla exakt den rad som visades, även när flera rader har samma innehåll, och om `aktiekop.csv` har ändrats på annat sätt sedan sidan laddades SHALL ingenting tas bort och ett fel visas. Efter borttagning SHALL markeringen försvinna ur diagrammet och minutdiagrammet, och `Transaktioner`, `Resultat` och värdepapperslistans avkastning SHALL räknas om utan att sidan laddas om. Rader från mäklarimporten SHALL kunna tas bort på samma sätt; en senare import av samma exportfil SHALL då lägga till raden igen. Varje giltig händelse i `aktiekop.csv` för en aktie i `aktier.csv` SHALL visas i transaktionslistan och räknas med i `Resultat`, även när den infaller före aktiens första kurs hos Yahoo Finance; en sådan händelse SHALL sakna markering i huvuddiagrammet, medan händelser från och med den första kursen markeras som tidigare.

#### Scenario: Visa en registrerad transaktion

- **WHEN** en transaktion finns i `aktiekop.csv`
- **THEN** den visas i transaktionslistan och på motsvarande datum i huvuddiagrammet
- **AND** listans belopp visar antal multiplicerat med kurs, justerat med courtage
- **AND** markeringen förekommer inte i rangesliderns översiktskurva

#### Scenario: Transaktion före första kursen

- **WHEN** en fond har ett köp 2019 i `aktiekop.csv` och dess kurshistorik hos Yahoo Finance börjar 2022
- **THEN** köpet visas i transaktionslistan
- **AND** köpet ingår i fondens antal, GAV och avkastning i `Resultat`
- **AND** köpet har ingen markering i huvuddiagrammet

#### Scenario: Ta bort en dubblerad utdelning

- **WHEN** Tele2 har två utdelningar för samma utbetalning och användaren klickar `Ta bort` och sedan `Bekräfta` på den ena
- **THEN** raden tas bort ur `aktiekop.csv` och ur listan `Transaktioner`
- **AND** utdelningskolumnen i `Resultat`, värdepapperslistans avkastning och markeringarna i diagrammet räknas om
- **AND** den andra utdelningen finns kvar

#### Scenario: Avbryt borttagning

- **WHEN** användaren klickar `Ta bort` och sedan `Avbryt`
- **THEN** ingen rad tas bort och raden visar åter knappen `Ta bort`

#### Scenario: Filen har ändrats

- **WHEN** raden som ska tas bort inte längre finns på samma plats med samma innehåll i `aktiekop.csv`
- **THEN** ingenting tas bort och ett felmeddelande ber användaren ladda om sidan

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

### Requirement: Visa aktuell portföljställning bredvid transaktionslistan

Under diagrammet SHALL en sammanställning med rubriken `Resultat` visas, och listan `Transaktioner` SHALL visas under den, på alla skärmbredder. Tabellen `Resultat` SHALL vara så bred som dess kolumner och radåtgärder behöver och SHALL rulla i sidled inom sin egen yta när den inte ryms; sidan SHALL inte rulla i sidled. Listan `Transaktioner` SHALL visa cirka tio transaktionsrader under kolumnrubrikerna och rulla vertikalt inom sin egen yta när det finns fler rader. När tabellerna `Resultat` och `Transaktioner` får plats bredvid varandra i sin fulla bredd SHALL listan `Transaktioner`, med rubrik, importkontroller och tabell, i stället visas till höger om `Resultat` under diagrammet, med rubrikerna på samma rad. Listan SHALL då vara lika hög som tabellen `Resultat`, dock minst cirka tio transaktionsrader, och rulla vertikalt inom sin egen yta. Byte mellan layouterna SHALL ske när fönstrets bredd eller tabellernas innehåll ändras, utan att sidan laddas om, och import, borttagning, filter och sortering i `Transaktioner` SHALL fungera likadant i båda layouterna. Tabellen SHALL visa aktiens namn, kvarvarande antal, senaste kurs, värde i aktiens valuta (senaste kurs multiplicerad med kvarvarande antal), värde i SEK, GAV, resultat exklusive utdelningar, utdelningar, totalt resultat i SEK, resultat i procent samt orealiserat resultat i SEK och i procent. Datumkolumn SHALL inte visas i resultatlistan. Kursvärdet SHALL visas kursivt efter att en aktuell intradagskurs har hämtats för aktien under den aktuella appsessionen. Resultatet SHALL inkludera realiserad vinst/förlust från registrerade försäljningar och orealiserad vinst/förlust från kvarvarande aktier. Resultat exklusive utdelningar SHALL inte innehålla registrerade utdelningar eller källskatt; utdelningskolumnen SHALL visa nettoutdelning och källskatt i SEK. GAV SHALL räknas med viktat genomsnittligt anskaffningsvärde, inklusive courtage. Utländska köp SHALL räknas om till SEK med valutakurs för transaktionsdagen eller närmast föregående tillgängliga valutadag; marknadsvärdet SHALL räknas om med senast tillgängliga valutakurs. Tabellen SHALL uppdateras efter en ny transaktion och efter uppdatering av marknadsdata, inklusive aktuella intradagskurser. Varje rad SHALL ha en kompakt ikonknapp med uppdateringssymbol längst till höger som hämtar aktuell kurs enbart för den radens aktie och uppdaterar dess radresultat.

Registrerade utdelningar SHALL räknas som kontant avkastning i SEK-resultatet, utan att ändra aktieantal eller GAV. Eventuell källskatt SHALL minska utdelningsresultatet.

Orealiserat resultat SHALL vara kvarvarande antal gånger senaste kurs gånger senast tillgängliga valutakurs, minus kvarvarande anskaffningsvärde i SEK enligt viktat genomsnitt inklusive courtage och omräknat med valutakursen för respektive köp. Det SHALL inte innehålla utdelningar, källskatt eller realiserat resultat från försäljningar. Orealiserat resultat i procent SHALL vara det orealiserade resultatet delat med kvarvarande anskaffningsvärde i SEK, med två decimaler, på samma sätt som mäklarens avkastning per innehav. Båda värdena SHALL visas som `—` när kvarvarande antal är noll eller när en valutakurs saknas.

#### Scenario: Visa aktuell ställning från flera köp

- **WHEN** en aktie har en eller flera registrerade köp
- **THEN** sammanställningen visar senaste stängningsdatum och kurs, kvarvarande antal, GAV samt resultat i kronor och procent
- **AND** sammanställningen ligger ovanför transaktionslistan och är inte bredare än sitt innehåll
- **AND** resultatet räknar med courtage och växelkurs för utländska aktier

#### Scenario: Resultat ovanför Transaktioner

- **WHEN** tabellerna inte ryms bredvid varandra, till exempel i telefonlayout
- **THEN** `Resultat` ligger överst och `Transaktioner` direkt under, och båda tabellerna kan läsas utan att sidan rullar i sidled
- **AND** en `Resultat` som är bredare än sin yta rullar i sidled inom tabellens yta

#### Scenario: Transaktioner till höger om Resultat när det finns plats

- **WHEN** fönstret är så brett att `Resultat` och `Transaktioner` ryms bredvid varandra i full bredd
- **THEN** `Transaktioner` ligger till höger om `Resultat` under diagrammet, med rubrikerna `Resultat` och `Transaktioner` på samma rad
- **AND** listan är lika hög som tabellen `Resultat`, dock minst cirka tio rader, och fler rader nås genom att rulla listan medan kolumnrubrikerna ligger kvar överst
- **AND** sidan rullar inte i sidled

#### Scenario: Smalare fönster igen

- **WHEN** fönstret görs så smalt att tabellerna inte längre ryms bredvid varandra
- **THEN** `Transaktioner` flyttas tillbaka under `Resultat` med cirka tio rader, utan att sidan laddas om

#### Scenario: Tio rader i Transaktioner

- **WHEN** det finns fler än tio transaktioner
- **THEN** listan `Transaktioner` visar cirka tio rader under kolumnrubrikerna
- **AND** övriga rader nås genom att rulla listan, medan kolumnrubrikerna ligger kvar överst

#### Scenario: Ta med försäljningar i ställningen

- **WHEN** aktien har registrerade köp och försäljningar
- **THEN** kvarvarande antal och anskaffningsvärde minskas med sålda aktier enligt viktat genomsnitt
- **AND** realiserat resultat från försäljningen läggs till orealiserat resultat

#### Scenario: Orealiserat resultat som hos mäklaren

- **WHEN** en fond har 100 andelar kvar med GAV 200,00 kr, senaste kurs 250,00 kr och tidigare försäljningar med vinst
- **THEN** `Orealiserat` visar +5 000,00 kr och `Orealiserat (%)` visar +25,00%
- **AND** `Avkastn`, `Tot avkastn` och `Tot avkastn (%)` räknar fortfarande med den realiserade vinsten och alla köp

#### Scenario: Utdelning ingår inte i orealiserat

- **WHEN** en aktie har registrerade utdelningar
- **THEN** `Orealiserat` och `Orealiserat (%)` är desamma som utan utdelningarna

#### Scenario: Allt sålt

- **WHEN** alla aktier i ett värdepapper är sålda
- **THEN** `Orealiserat` och `Orealiserat (%)` visar `—`

### Requirement: Kolumnrubriker i Resultat och Transaktioner

Tabellen `Resultat` SHALL ha kolumnrubrikerna `Värdepapper`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Orealiserat`, `Orealiserat (%)`, `Värde` och `Värde SEK` i den ordningen, där `Kurs` är senaste kurs, `Avkastn` är resultat exklusive utdelningar, `Tot avkastn` är totalt resultat i SEK, `Tot avkastn (%)` är resultatet i procent, `Orealiserat` är orealiserat resultat i SEK på kvarvarande innehav och `Orealiserat (%)` är det i procent av kvarvarande anskaffningsvärde. Tabellen `Transaktioner` SHALL ha kolumnrubrikerna `Datum`, `Tid`, `Typ`, `Värdepapper`, `Antal`, `Kurs`, `Avgår` och `Värde` i den ordningen, där `Kurs` är kurs eller utdelning per aktie, `Avgår` är courtage eller källskatt och `Värde` är totalbelopp inklusive courtage för köp och nettobelopp för sälj och utdelning. Kolumnrubrikerna SHALL få brytas på två rader, medan värdena SHALL visas på en rad. Övriga kolumners innehåll, beräkningar, sortering och filter SHALL vara oförändrade.

#### Scenario: Rubriker i Resultat

- **WHEN** tabellen `Resultat` visas
- **THEN** rubrikerna är `Värdepapper`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Orealiserat`, `Orealiserat (%)`, `Värde`, `Värde SEK`

#### Scenario: Rubriker i Transaktioner

- **WHEN** tabellen `Transaktioner` visas
- **THEN** rubrikerna är `Datum`, `Tid`, `Typ`, `Värdepapper`, `Antal`, `Kurs`, `Avgår`, `Värde`
- **AND** sortering på `Värdepapper` och döljning av utdelningar fungerar som tidigare

### Requirement: Konvertera mäklarens transaktionsexport

Appen SHALL kunna importera mäklarens UTF-16-kodade tabbseparerade transaktionsexport som användaren laddar upp i webbläsaren. Importen SHALL mappa kolumnen `Värdepapper` till appens ticker och omvandla köp, försäljningar och utdelningar till appens CSV-format. ISIN SHALL inte användas som ticker. Berkshire-kursen i källan SHALL omvandlas till SEK med exportens växlingskurs. Utdelningens kontantbelopp SHALL importeras som utdelning utan att påverka antal eller anskaffningsvärde; källskatt SHALL registreras som negativ utdelning. Exportens transaktions-ID SHALL sparas för idempotent återimport. Äldre importer utan transaktions-ID SHALL dedupliceras med datum, typ, ticker, antal, kurs och courtage. Användaren SHALL välja ett konto, en bokstav A–Z, i fältet `Konto` bredvid knappen `Importera transaktioner` innan importen kan startas; fältet SHALL föreslå de konton som redan finns i `aktiekop.csv`. Kontot SHALL gälla alla rader i filen och sparas i kolumnen `account`. Dubblettkontrollen SHALL endast jämföra med befintliga rader på samma konto, både för transaktions-ID och för transaktionsdetaljer.

Diagrammets transaktionslista SHALL ha knappen `Importera transaktioner` och ett filval bredvid den. En fil SHALL väljas innan importen kan startas; det finns ingen standardfil på servern. Importen SHALL först visa en förhandsgranskning med valt konto, antal konverterbara transaktioner, dubbletter, nya rader och varningar, utan att ändra `aktiekop.csv`. Nya rader SHALL sparas först när användaren uttryckligen bekräftar importen, och då SHALL exakt de rader som förhandsgranskningen visade som nya sparas, med dubblettkontroll mot filens aktuella innehåll. Efter bekräftelsen SHALL nya diagrammarkeringar och beräkningar läggas till i den öppna vyn utan att sidan laddas om. Filer som inte är en giltig export eller är större än den angivna gränsen SHALL avvisas med ett begripligt fel. Listans rubrik SHALL vara `Transaktioner`. En knapp SHALL kunna dölja och visa utdelningsrader. Kolumnhuvudet `Värdepapper` SHALL växla mellan alfabetisk sortering A–Ö och listans ursprungliga sortering.

När källrader hoppas över SHALL importsvaret innehålla originalraderna, kolumnrubrikerna och orsaken per rad. Gränssnittet SHALL visa en knapp med antalet omappade rader som öppnar dem i en popup med horisontell och vertikal rullning vid behov.

#### Scenario: Förhandsgranska import

- **WHEN** användaren väljer en exportfil, anger konto och klickar på `Importera transaktioner`
- **THEN** appen visar valt konto, antal konverterbara transaktioner, dubbletter, nya rader och varningar
- **AND** `aktiekop.csv` ändras inte

#### Scenario: Tillämpa import

- **WHEN** användaren bekräftar en förhandsgranskad import
- **THEN** nya transaktioner läggs till i `aktiekop.csv` med valt konto
- **AND** redan importerade dubbletter hoppas över, även om de har sparats efter förhandsgranskningen
- **AND** okända värdepapper eller ogiltiga rader rapporteras som varningar och hoppas över
- **AND** nya markeringar och resultat visas utan att sidan laddas om

#### Scenario: Avbryt import

- **WHEN** användaren avbryter efter förhandsgranskningen
- **THEN** `aktiekop.csv` lämnas oförändrad

#### Scenario: Import utan vald fil eller med ogiltig fil

- **WHEN** användaren startar importen utan att ha valt en fil eller ett giltigt konto, eller väljer en fil som inte är en giltig export eller är för stor
- **THEN** appen visar ett fel och ingen förhandsgranskning eller sparning sker

#### Scenario: Granska rader som inte kunde importeras

- **WHEN** importen hoppar över källrader
- **THEN** knappen för omappade rader visar antalet och öppnar en popup med originalraderna och orsaken
- **AND** popupen kan rullas horisontellt och vertikalt när innehållet inte ryms

#### Scenario: Samma export på ett annat konto

- **WHEN** en export har importerats på konto `T` och samma fil sedan importeras på konto `I`
- **THEN** förhandsgranskningen visar raderna som nya för konto `I`
- **WHEN** samma fil importeras på konto `T` igen
- **THEN** alla rader räknas som dubbletter

### Requirement: Konto per transaktion

Varje transaktion i `aktiekop.csv` SHALL ha ett konto i kolumnen `account`, sist bland kolumnerna, som är en bokstav `A`–`Z` och sparas som versal. En rad som saknar konto SHALL räknas som konto `T`, och när appen skriver filen SHALL sådana rader få värdet `T`. `aktier.csv` SHALL vara oförändrad. Ett värdepapper i `aktier.csv` som har transaktioner SHALL visas som ett separat värdepapper per konto som har transaktioner i det, med egen kurva, egna transaktionsmarkeringar, egen rad i värdepapperslistan, egen rad i `Resultat`, eget solo-val, egna jämförelsepunkter och egen kurvetikett; innehav, anskaffningsvärde, utdelningar och avkastning SHALL räknas endast på det kontots transaktioner. Kursen SHALL vara densamma för alla konton av samma värdepapper. Ett värdepapper utan transaktioner SHALL visas som ett värdepapper utan konto. Var som helst där namnet på ett värdepapper med konto visas, bland annat i värdepapperslistan, kurvetiketter, hovringstext, `Transaktioner`, `Resultat`, minutdiagrammets rubrik, solo-kryssrutans etikett, statusmeddelanden och jämförelseetiketter, SHALL kontot visas inom parentes efter namnet, till exempel `Tele2 (T)`; ett värdepapper utan konto SHALL visas utan parentes. Värdepapper med flera konton SHALL ligga intill varandra i kontoordning A–Z där värdepapperslistan följer ordningen i `aktier.csv`.

Synligheten för ett värdepapper med konto SHALL sparas i `aktievy.json` under `series_visible`, med värdepapperets ticker och konto som nyckel, och användas vid nästa start; saknas ett sparat värde SHALL aktiens `show_initially` i `aktier.csv` gälla. Synligheten för ett värdepapper utan konto SHALL sparas i `aktier.csv` som tidigare. `last_solo` SHALL ange värdepapperet inklusive konto.

När en transaktion registreras eller importeras för ett konto som värdepapperet ännu inte visas med, eller för ett värdepapper som saknar transaktioner, SHALL sidan laddas om efter att transaktionen sparats så att det nya värdepapperet visas, och bekräftelsen SHALL visas efter omladdningen. När den sista transaktionen för ett konto tas bort SHALL värdepapperet med det kontot finnas kvar utan transaktioner tills sidan laddas om.

#### Scenario: Samma aktie på två konton

- **WHEN** `aktiekop.csv` har köp av Tele2 på konto `T` och på konto `I`
- **THEN** diagrammet har två kurvor med samma kursutveckling, `Tele2 (T)` och `Tele2 (I)`, med var sina markeringar
- **AND** värdepapperslistan och `Resultat` har en rad för varje konto, och varje rad räknar bara med sitt kontos transaktioner
- **AND** `Transaktioner` visar `Tele2 (T)` och `Tele2 (I)` på respektive rad

#### Scenario: Äldre rader utan konto

- **WHEN** `aktiekop.csv` saknar kolumnen `account`
- **THEN** alla transaktioner visas på konto `T`, till exempel `Saab (T)`
- **AND** när appen nästa gång skriver filen har den kolumnen `account` med värdet `T` på de raderna

#### Scenario: Värdepapper utan transaktioner

- **WHEN** en aktie i `aktier.csv` saknar transaktioner
- **THEN** den visas en gång utan parentes, till exempel `Volvo`

#### Scenario: Solo för ett konto

- **WHEN** användaren markerar solo för `Tele2 (I)`
- **THEN** endast den kurvan och kontots markeringar visas, minutdiagrammet heter `Tele2 (I) – minutkurser` och visar bara kontots transaktioner
- **AND** `Transaktioner` och `Resultat` filtreras till `Tele2 (I)` när solo-filtret är på

#### Scenario: Spara synlighet per konto

- **WHEN** användaren döljer `Tele2 (I)` och laddar om sidan
- **THEN** `Tele2 (I)` är dold och `Tele2 (T)` visas enligt sitt eget sparade värde
- **AND** `aktier.csv` är oförändrad

#### Scenario: Första transaktionen på ett nytt konto

- **WHEN** användaren registrerar det första köpet av Tele2 på konto `I`
- **THEN** köpet sparas, sidan laddas om och `Tele2 (I)` visas med köpet
- **AND** bekräftelsen visas efter omladdningen

### Requirement: Drift på webbhotell

Appen SHALL köras som PHP på ett delat webbhotell (one.com) utan Python, utan långlivad serverprocess och utan skalåtkomst. Varje sida och API-anrop SHALL hanteras av PHP per förfrågan, och diagrammet SHALL renderas av JavaScript i webbläsaren. Transaktionsformuläret SHALL spara data via `/api/purchases`. På breda fönster SHALL uppdateringsknappen och datumfälten ligga till höger om köpformuläret, ungefär centrerade ovanför diagrammet. Layouten SHALL anpassa diagram, legend och transaktionskontroller för smalare fönster. Samtidiga skrivningar till samma datafil SHALL inte kunna lämna filen trasig eller ofullständig.

#### Scenario: Öppna appen

- **WHEN** en inloggad användare öppnar appens adress i webbläsaren och kursdata kan hämtas
- **THEN** det interaktiva diagrammet visas med transaktionsformulär, transaktionslista och resultat
- **AND** ingen process behöver startas eller stoppas på servern

#### Scenario: Samtidiga skrivningar

- **WHEN** två förfrågningar sparar till `aktiekop.csv` eller `aktier.csv` samtidigt
- **THEN** båda ändringarna sparas i sin helhet eller så får en av förfrågningarna ett fel
- **AND** filen förblir giltig och innehåller inga halvskrivna rader

### Requirement: Inloggning

Appen SHALL kräva inloggning med ett lösenord för en enda användare innan någon sida, kursdata eller transaktionsdata visas. Lösenordet SHALL lagras endast som en hash. En lyckad inloggning SHALL skapa en session som gäller för både sidor och API-anrop. Oinloggade sidförfrågningar SHALL skickas till inloggningssidan. Oinloggade API-anrop SHALL besvaras med HTTP 401 utan data och utan att ändra några filer. Skrivande API-anrop SHALL avvisas om de inte kommer från appens egna sidor i en inloggad session. Upprepade misslyckade inloggningsförsök SHALL fördröjas eller tillfälligt spärras. Appen SHALL ha en knapp `Logga ut` som avslutar sessionen. Sessionen SHALL upphöra efter en period av inaktivitet. Inloggning SHALL endast ske över HTTPS.

#### Scenario: Logga in

- **WHEN** användaren anger rätt lösenord på inloggningssidan
- **THEN** appen visas och API-anropen fungerar i samma session

#### Scenario: Fel lösenord

- **WHEN** användaren anger fel lösenord
- **THEN** inloggningssidan visas igen med ett felmeddelande utan att ange om något annat än lösenordet var fel
- **AND** efter flera misslyckade försök i följd fördröjs eller spärras nya försök tillfälligt

#### Scenario: Oinloggad förfrågan

- **WHEN** någon utan giltig session öppnar appens sida
- **THEN** inloggningssidan visas i stället för appen
- **WHEN** någon utan giltig session anropar ett API, till exempel `/api/purchases`
- **THEN** svaret är HTTP 401 utan transaktions- eller kursdata
- **AND** inga datafiler ändras

#### Scenario: Förfalskad skrivförfrågan

- **WHEN** en annan webbplats får den inloggade användarens webbläsare att skicka en skrivförfrågan till appen
- **THEN** förfrågan avvisas och inga datafiler ändras

#### Scenario: Logga ut

- **WHEN** användaren klickar på `Logga ut`
- **THEN** sessionen avslutas och inloggningssidan visas
- **AND** efterföljande API-anrop besvaras med HTTP 401

### Requirement: Skyddade datafiler

Datafilerna `aktier.csv`, `aktier.example.csv`, `aktiekop.csv`, `aktievy.json` samt konfigurationsfiler med lösenordshash eller andra hemligheter SHALL inte kunna hämtas, listas eller skrivas direkt över HTTP, oavsett inloggning. Datan SHALL endast nås via appens API efter inloggning. Uppladdade importfiler SHALL inte bli åtkomliga via en webbadress.

#### Scenario: Direkt hämtning av datafil

- **WHEN** någon begär en datafil direkt via dess webbadress, till exempel `/data/aktiekop.csv`, med eller utan inloggning
- **THEN** servern svarar med HTTP 403 eller 404 utan filens innehåll

#### Scenario: Kataloglistning

- **WHEN** någon begär katalogen som innehåller datafilerna
- **THEN** ingen fillista visas
