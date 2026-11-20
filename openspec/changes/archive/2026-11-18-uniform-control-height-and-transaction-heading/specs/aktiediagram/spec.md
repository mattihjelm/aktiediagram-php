## RENAMED Requirements

- FROM: `### Requirement: Registrera och spara aktiehändelser`
- TO: `### Requirement: Registrera och spara transaktioner`

## MODIFIED Requirements

### Requirement: Layout på telefon

Appen SHALL visa en telefonlayout när sidans bredd är högst 600 CSS-pixlar, och även när enheten styrs med pekskärm och sidans höjd är högst 500 CSS-pixlar, så att en telefon i liggande läge behåller telefonlayouten. Minutdiagrammet SHALL i telefonlayout ligga först på sidan, före huvuddiagrammet, och huvuddiagrammet, aktielegenden, formuläret `Registrera transaktion`, `Resultat` och `Transaktioner` SHALL följa nedanför. Text i telefonlayout SHALL vara mindre än på bred skärm, med brödtext och tabeller i 13 pixlar, och panelernas och tabellernas vänsterindrag SHALL tas bort. I telefonlayout SHALL rubrikerna ovanför diagrammen, sidans rubrik `Aktiernas utveckling …` och minutdiagrammets rubrik `<aktie> – minutkurser`, vara hälften så stora som övriga rubriker i telefonlayout. I telefonlayout SHALL minutdiagrammets y-axelrubrik, till exempel `Kurs (SEK)`, inte visas, och skalvärdena på x- och y-axlarna i både huvuddiagrammet och minutdiagrammet SHALL visas i 30 % av den vanliga storleken. När telefonen vrids SHALL axlarnas rubriker och skalvärden anpassas till den nya layouten utan att sidan laddas om. Sidan SHALL inte rulla i sidled; tabeller SHALL rulla i sidled inom sin egen yta. På bredare skärmar SHALL ordning och textstorlekar vara oförändrade. Det automatiska solo-valet vid sidladdning SHALL följa kravet Senast valda solo-aktie på alla skärmstorlekar.

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

Appen SHALL erbjuda ett formulär med rubriken `Registrera transaktion` och typerna Köp, Sälj och Utdelning. Köp och sälj SHALL ha aktie, datum, antal, kurs och courtage; utdelning SHALL ha aktie, datum, antal aktier, utdelning per aktie och källskatt. Aktie och datum SHALL föreslå senast tillgänglig kurs på eller före valt datum för köp och sälj. Om användaren klickar på en kurva SHALL formuläret förifyllas med vald aktie, datum och kurs, utom vid registrering av utdelning. Belopp per aktie och courtage/källskatt SHALL visas med två decimaler. Formuläret SHALL visa totalbelopp inklusive courtage för köp, nettobelopp efter courtage för sälj och totalt utdelningsbelopp efter källskatt. Giltiga händelser SHALL sparas i `aktiekop.csv` med semikolonseparerade kolumner `date`, `transaction_type`, `ticker`, `quantity`, `price`, `commission`; importerade händelser får även ha `source_id` och `amount_currency`. Ogiltiga värden eller okända aktier SHALL avvisas med ett begripligt fel. Fält, listrutor och knappar, utom kryssrutor, i formuläret `Registrera transaktion` och i delarna `Kurser` och `Datumintervall` SHALL ha samma höjd som formulärets inmatningsfält: 35 pixlar på bred skärm och 33 pixlar i telefonlayout. Delarna `Kurser` och `Datumintervall` SHALL ligga under formuläret med vänsterkanten linjerad med rubriken `Registrera transaktion`.

#### Scenario: Föreslå kurs

- **WHEN** användaren väljer aktie och datum
- **THEN** kursfältet föreslår aktiens senast tillgängliga kurs på eller före datumet med två decimaler
- **AND** användaren kan ändra den föreslagna kursen

#### Scenario: Registrera köp

- **WHEN** användaren skickar in ett giltigt köp
- **THEN** köpet sparas i `aktiekop.csv`
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

- **WHEN** antal eller kurs inte är större än noll, courtage är negativt, datumet saknar tidigare kursdata eller ticker saknar hämtad kursserie
- **THEN** transaktionen sparas inte och formuläret visar ett fel

#### Scenario: Samma höjd på fält och knappar

- **WHEN** appen visas på en bred skärm
- **THEN** typ- och aktielistorna, fälten för datum, tid, antal, kurs och courtage, knappen `Lägg till transaktion`, knapparna `Hämta slutkurser` och `Hämta aktuell kurs` samt datumintervallets start- och slutfält är 35 pixlar höga
- **WHEN** appen visas i telefonlayout
- **THEN** samma fält och knappar är 33 pixlar höga

#### Scenario: Linjerad vänsterkant

- **WHEN** appen visas på en bred skärm
- **THEN** rubrikerna `Kurser` och `Datumintervall` och deras knappar och fält börjar vid samma vänsterkant som rubriken `Registrera transaktion`

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

### Requirement: Konvertera mäklarens transaktionsexport

Appen SHALL kunna importera mäklarens UTF-16-kodade tabbseparerade transaktionsexport som användaren laddar upp i webbläsaren. Importen SHALL mappa kolumnen `Värdepapper` till appens ticker och omvandla köp, försäljningar och utdelningar till appens CSV-format. ISIN SHALL inte användas som ticker. Berkshire-kursen i källan SHALL omvandlas till SEK med exportens växlingskurs. Utdelningens kontantbelopp SHALL importeras som utdelning utan att påverka antal eller anskaffningsvärde; källskatt SHALL registreras som negativ utdelning. Exportens transaktions-ID SHALL sparas för idempotent återimport. Äldre importer utan transaktions-ID SHALL dedupliceras med datum, typ, ticker, antal, kurs och courtage.

Diagrammets transaktionslista SHALL ha knappen `Importera transaktioner` och ett filval bredvid den. En fil SHALL väljas innan importen kan startas; det finns ingen standardfil på servern. Importen SHALL först visa en förhandsgranskning med antal konverterbara transaktioner, dubbletter, nya rader och varningar, utan att ändra `aktiekop.csv`. Nya rader SHALL sparas först när användaren uttryckligen bekräftar importen, och då SHALL exakt de rader som förhandsgranskningen visade som nya sparas, med dubblettkontroll mot filens aktuella innehåll. Efter bekräftelsen SHALL nya diagrammarkeringar och beräkningar läggas till i den öppna vyn utan att sidan laddas om. Filer som inte är en giltig export eller är större än den angivna gränsen SHALL avvisas med ett begripligt fel. Listans rubrik SHALL vara `Transaktioner`. En knapp SHALL kunna dölja och visa utdelningsrader. Kolumnhuvudet `Aktie` SHALL växla mellan alfabetisk sortering A–Ö och listans ursprungliga sortering.

När källrader hoppas över SHALL importsvaret innehålla originalraderna, kolumnrubrikerna och orsaken per rad. Gränssnittet SHALL visa en knapp med antalet omappade rader som öppnar dem i en popup med horisontell och vertikal rullning vid behov.

#### Scenario: Förhandsgranska import

- **WHEN** användaren väljer en exportfil och klickar på `Importera transaktioner`
- **THEN** appen visar antal konverterbara transaktioner, dubbletter, nya rader och varningar
- **AND** `aktiekop.csv` ändras inte

#### Scenario: Tillämpa import

- **WHEN** användaren bekräftar en förhandsgranskad import
- **THEN** nya transaktioner läggs till i `aktiekop.csv`
- **AND** redan importerade dubbletter hoppas över, även om de har sparats efter förhandsgranskningen
- **AND** okända värdepapper eller ogiltiga rader rapporteras som varningar och hoppas över
- **AND** nya markeringar och resultat visas utan att sidan laddas om

#### Scenario: Avbryt import

- **WHEN** användaren avbryter efter förhandsgranskningen
- **THEN** `aktiekop.csv` lämnas oförändrad

#### Scenario: Import utan vald fil eller med ogiltig fil

- **WHEN** användaren startar importen utan att ha valt en fil, eller väljer en fil som inte är en giltig export eller är för stor
- **THEN** appen visar ett fel och ingen förhandsgranskning eller sparning sker

#### Scenario: Granska rader som inte kunde importeras

- **WHEN** importen hoppar över källrader
- **THEN** knappen för omappade rader visar antalet och öppnar en popup med originalraderna och orsaken
- **AND** popupen kan rullas horisontellt och vertikalt när innehållet inte ryms
