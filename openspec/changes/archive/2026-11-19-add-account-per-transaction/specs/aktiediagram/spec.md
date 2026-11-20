## ADDED Requirements

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

## MODIFIED Requirements

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

### Requirement: Kurvornas synlighet och legend

Diagrammet SHALL visa en extern värdepapperslista, `Värdepapperslistan`, med en solo-checkbox och klickbart aktienamn för varje tillgänglig aktie. Klick på aktienamnet SHALL växla kurvan och dess transaktionsmarkeringar av eller på och spara synligheten så att den används vid nästa start: i `aktier.csv` för ett värdepapper utan konto och i `aktievy.json` för ett värdepapper med konto, enligt kravet Konto per transaktion. Solo SHALL visa endast den valda aktien och dess transaktioner, och avmarkering SHALL återställa synligheten från före sololäget. Solo-läget SHALL inte ändra sparade synlighetsinställningar. Kurvnamn vid kurvornas slut SHALL vara förbundna med sina slutpunkter av tunna svarta ledarlinjer och placeras så att etiketterna inte överlappa. Hovring över ett externt aktienamn SHALL tillfälligt öka motsvarande kurvas tjocklek från 2 px till 5 px. Legendens vinst/förlustinformation SHALL följa respektive aktienamn. Utanför telefonlayouten SHALL legenden vara cirka 20 % bredare och ha cirka 20 % större text än tidigare: aktienamn i 17 pixlar och avkastningsraden, rubriken, hjälptexten och sorteringsknapparna i 14,5 pixlar. Avkastningsraden under varje aktie SHALL visas i en mörkare färg än tidigare för bättre läsbarhet. Listans kolumnrubrik SHALL vara `Värdepapper / resultat`. Legendens rubrik SHALL ha fyra sorteringsknappar: `Osorterad`, som visar aktierna i ordningen i `aktier.csv`, `Namn`, som sorterar efter visningsnamn i svensk alfabetisk ordning, `%/mån`, som sorterar efter månadsavkastning i procent med högst först och aktier utan månadsavkastning sist i ordningen i `aktier.csv`, och `Total`, som sorterar efter den totala avkastningen omräknad till SEK med senaste valutakurs, med högst först och aktier utan avkastning sist i ordningen i `aktier.csv`. Den valda knappen SHALL vara markerad. Valet SHALL sparas i `aktievy.json` som `legend_sort` med värdet `none`, `name`, `monthly` eller `total` och användas vid nästa start; utan sparat eller med ogiltigt värde SHALL `Osorterad` gälla. Sorteringen SHALL endast ändra ordningen i legenden; kurvor, färger, kurvetiketter, solo-val, synlighet, listorna `Transaktioner` och `Resultat` samt `aktier.csv` SHALL inte påverkas. Vid sortering på `%/mån` eller `Total` SHALL ordningen uppdateras när avkastningen räknas om.

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
