## MODIFIED Requirements

### Requirement: Visa aktuell portföljställning bredvid transaktionslistan

Under diagrammet SHALL en sammanställning med rubriken `Resultat` visas, och listan `Transaktioner` SHALL visas under den, på alla skärmbredder. Tabellen `Resultat` SHALL vara så bred som dess kolumner och radåtgärder behöver och SHALL rulla i sidled inom sin egen yta när den inte ryms; sidan SHALL inte rulla i sidled. Listan `Transaktioner` SHALL visa cirka tio transaktionsrader under kolumnrubrikerna och rulla vertikalt inom sin egen yta när det finns fler rader. Tabellen SHALL visa aktiens namn, kvarvarande antal, senaste kurs, värde i aktiens valuta (senaste kurs multiplicerad med kvarvarande antal), värde i SEK, GAV, resultat exklusive utdelningar, utdelningar, totalt resultat i SEK, resultat i procent samt orealiserat resultat i SEK och i procent. Datumkolumn SHALL inte visas i resultatlistan. Kursvärdet SHALL visas kursivt efter att en aktuell intradagskurs har hämtats för aktien under den aktuella appsessionen. Resultatet SHALL inkludera realiserad vinst/förlust från registrerade försäljningar och orealiserad vinst/förlust från kvarvarande aktier. Resultat exklusive utdelningar SHALL inte innehålla registrerade utdelningar eller källskatt; utdelningskolumnen SHALL visa nettoutdelning och källskatt i SEK. GAV SHALL räknas med viktat genomsnittligt anskaffningsvärde, inklusive courtage. Utländska köp SHALL räknas om till SEK med valutakurs för transaktionsdagen eller närmast föregående tillgängliga valutadag; marknadsvärdet SHALL räknas om med senast tillgängliga valutakurs. Tabellen SHALL uppdateras efter en ny transaktion och efter uppdatering av marknadsdata, inklusive aktuella intradagskurser. Varje rad SHALL ha en kompakt ikonknapp med uppdateringssymbol längst till höger som hämtar aktuell kurs enbart för den radens aktie och uppdaterar dess radresultat.

Registrerade utdelningar SHALL räknas som kontant avkastning i SEK-resultatet, utan att ändra aktieantal eller GAV. Eventuell källskatt SHALL minska utdelningsresultatet.

Orealiserat resultat SHALL vara kvarvarande antal gånger senaste kurs gånger senast tillgängliga valutakurs, minus kvarvarande anskaffningsvärde i SEK enligt viktat genomsnitt inklusive courtage och omräknat med valutakursen för respektive köp. Det SHALL inte innehålla utdelningar, källskatt eller realiserat resultat från försäljningar. Orealiserat resultat i procent SHALL vara det orealiserade resultatet delat med kvarvarande anskaffningsvärde i SEK, med två decimaler, på samma sätt som mäklarens avkastning per innehav. Båda värdena SHALL visas som `—` när kvarvarande antal är noll eller när en valutakurs saknas.

#### Scenario: Visa aktuell ställning från flera köp

- **WHEN** en aktie har en eller flera registrerade köp
- **THEN** sammanställningen visar senaste stängningsdatum och kurs, kvarvarande antal, GAV samt resultat i kronor och procent
- **AND** sammanställningen ligger ovanför transaktionslistan och är inte bredare än sitt innehåll
- **AND** resultatet räknar med courtage och växelkurs för utländska aktier

#### Scenario: Resultat ovanför Transaktioner

- **WHEN** appen visas på en bred skärm, i smalare fönster eller i telefonlayout
- **THEN** `Resultat` ligger överst och `Transaktioner` direkt under, och båda tabellerna kan läsas utan att sidan rullar i sidled
- **AND** en `Resultat` som är bredare än sin yta rullar i sidled inom tabellens yta

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

