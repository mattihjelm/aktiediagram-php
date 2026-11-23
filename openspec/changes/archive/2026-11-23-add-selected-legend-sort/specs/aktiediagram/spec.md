## MODIFIED Requirements

### Requirement: Kurvornas synlighet och legend

Diagrammet SHALL visa en extern värdepapperslista, `Värdepapperslistan`, med en solo-checkbox och klickbart aktienamn för varje tillgänglig aktie. Klick på aktienamnet SHALL växla kurvan och dess transaktionsmarkeringar av eller på och spara synligheten så att den används vid nästa start: i `aktier.csv` för ett värdepapper utan konto och i `aktievy.json` för ett värdepapper med konto, enligt kravet Konto per transaktion. Solo SHALL visa endast den valda aktien och dess transaktioner, och avmarkering SHALL återställa synligheten från före sololäget. Solo-läget SHALL inte ändra sparade synlighetsinställningar. Kurvnamn vid kurvornas slut SHALL vara förbundna med sina slutpunkter av tunna svarta ledarlinjer och placeras så att etiketterna inte överlappa. Hovring över ett externt aktienamn SHALL tillfälligt öka motsvarande kurvas tjocklek från 2 px till 5 px. Legendens vinst/förlustinformation SHALL följa respektive aktienamn. Utanför telefonlayouten SHALL legenden vara cirka 20 % bredare och ha cirka 20 % större text än tidigare: aktienamn i 17 pixlar och avkastningsraden, rubriken, hjälptexten och sorteringsknapparna i 14,5 pixlar. Aktienamnet och avkastningsraden under varje aktie SHALL visas med en textfärg som är 30 % mörkare än tidigare, det vill säga varje färgkanal multiplicerad med 0,7: aktienamnet i `#1b2432` och avkastningsraden i `#1e2631`. Dolda aktier SHALL fortfarande visas nedtonade. Listans kolumnrubrik SHALL vara `Värdepapper / resultat`. Legendens rubrik SHALL ha sex sorteringsknappar: `Osorterad`, som visar aktierna i ordningen i `aktier.csv`, `Namn`, som sorterar efter visningsnamn i svensk alfabetisk ordning, `%/mån`, som sorterar efter månadsavkastning i procent med högst först och aktier utan månadsavkastning sist i ordningen i `aktier.csv`, `Total`, som sorterar efter den totala avkastningen omräknad till SEK med senaste valutakurs, med högst först och aktier utan avkastning sist i ordningen i `aktier.csv`, och `Total %`, som sorterar efter total avkastning i procent, samma värde som kolumnen `Tot avkastn (%)` i `Resultat`, med högst först och aktier utan värde sist i ordningen i `aktier.csv`, och `Valda`, som visar värdepapperen i den sparade gruppen av valda värdepapper överst i den ordning de lades till i gruppen och övriga därefter i ordningen i `aktier.csv`. Den valda knappen SHALL vara markerad. Valet SHALL sparas i `aktievy.json` som `legend_sort` med värdet `none`, `name`, `monthly`, `total`, `total_percent` eller `selected` och användas vid nästa start; utan sparat eller med ogiltigt värde SHALL `Osorterad` gälla. Sorteringen SHALL endast ändra ordningen i legenden; kurvor, färger, kurvetiketter, solo-val, synlighet, listorna `Transaktioner` och `Resultat` samt `aktier.csv` SHALL inte påverkas. Vid sortering på `%/mån`, `Total` eller `Total %` SHALL ordningen uppdateras när avkastningen räknas om.

Sist i legendens rubrik, efter sorteringsknapparna, SHALL ett sökfält med etiketten `Sök värdepapper` filtrera listans rader till värdepapper vars visningsnamn, inklusive kontot inom parentes, innehåller den inskrivna texten var som helst i namnet, utan hänsyn till versaler och gemener. Ett tomt sökfält SHALL visa alla värdepapper. Filtret SHALL uppdateras medan användaren skriver, utan att fältet tappar fokus, och SHALL gälla tillsammans med vald sortering. Filtret SHALL endast ändra vilka rader legenden visar; kurvor, synlighet, solo-val, sparade inställningar och listorna `Transaktioner` och `Resultat` SHALL inte påverkas, och söktexten SHALL inte sparas. När inget värdepapper matchar SHALL legenden visa texten `Inga värdepapper matchar sökningen.`

Gruppen av valda värdepapper SHALL sparas i `aktievy.json` som `legend_selected`, en lista med värdepappersnycklar (`TICKER` eller `TICKER|KONTO`). När användaren väljer `Valda` och ingen grupp är sparad SHALL gruppen bli de värdepapper som visas i diagrammet i det ögonblicket, i den ordning de stod i listan. När en grupp redan är sparad SHALL `Valda` visa den sparade gruppen överst, även om andra värdepapper har visats eller dolts sedan dess. Medan `Valda` är vald SHALL ett värdepapper som visas genom klick på dess namn läggas sist i gruppen, så att det hamnar bland de valda överst, och ett värdepapper som döljs genom klick på dess namn tas bort ur gruppen. Medan en annan sortering är vald SHALL gruppen inte ändras. Solo SHALL inte ändra gruppen. Värdepappersnycklar i gruppen som inte finns i diagrammet SHALL ignoreras. Övriga inställningar i `aktievy.json` SHALL behållas när gruppen sparas.

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

#### Scenario: Sortera på valda värdepapper första gången

- **WHEN** ingen grupp av valda värdepapper är sparad och användaren klickar på `Valda`
- **THEN** värdepapperslistan visar de värdepapper som visas i diagrammet överst och övriga därefter i ordningen i `aktier.csv`
- **AND** knappen `Valda` är markerad och `aktievy.json` innehåller `legend_sort` med värdet `selected` och `legend_selected` med de visade värdepapperen

#### Scenario: Valda sparas mellan sorteringar

- **WHEN** användaren har valt `Valda`, byter till `Namn`, visar eller döljer värdepapper och sedan klickar på `Valda` igen
- **THEN** samma grupp som tidigare visas överst och `legend_selected` är oförändrad

#### Scenario: Visa ett till värdepapper medan Valda är vald

- **WHEN** `Valda` är vald och användaren klickar på namnet på ett dolt värdepapper
- **THEN** värdepapperet visas i diagrammet och hamnar sist bland de valda överst i listan
- **AND** värdepapperet läggs till i `legend_selected`

#### Scenario: Dölja ett värdepapper medan Valda är vald

- **WHEN** `Valda` är vald och användaren klickar på namnet på ett synligt värdepapper
- **THEN** värdepapperet döljs, tas bort ur `legend_selected` och flyttas ner bland övriga värdepapper

#### Scenario: Valda vid start

- **WHEN** appen öppnas och `legend_sort` i `aktievy.json` är `selected`
- **THEN** `Valda` är markerad och värdepapperen i `legend_selected` visas överst
