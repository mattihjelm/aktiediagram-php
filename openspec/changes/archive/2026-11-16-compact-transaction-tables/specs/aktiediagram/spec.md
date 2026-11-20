## ADDED Requirements

### Requirement: Kolumnrubriker i Resultat och Transaktioner

Tabellen `Resultat` SHALL ha kolumnrubrikerna `Aktie`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Värde` och `Värde SEK` i den ordningen, där `Kurs` är senaste kurs, `Avkastn` är resultat exklusive utdelningar, `Tot avkastn` är totalt resultat i SEK och `Tot avkastn (%)` är resultatet i procent. Tabellen `Transaktioner` SHALL ha kolumnrubrikerna `Datum`, `Tid`, `Typ`, `Aktie`, `Antal`, `Kurs`, `Avgår` och `Värde` i den ordningen, där `Kurs` är kurs eller utdelning per aktie, `Avgår` är courtage eller källskatt och `Värde` är totalbelopp inklusive courtage för köp och nettobelopp för sälj och utdelning. Kolumnrubrikerna SHALL få brytas på två rader, medan värdena SHALL visas på en rad. Kolumnernas innehåll, beräkningar, sortering och filter SHALL vara oförändrade.

#### Scenario: Rubriker i Resultat

- **WHEN** tabellen `Resultat` visas
- **THEN** rubrikerna är `Aktie`, `Antal`, `Kurs`, `GAV`, `Avkastn`, `Utdelning`, `Tot avkastn`, `Tot avkastn (%)`, `Värde`, `Värde SEK`

#### Scenario: Rubriker i Transaktioner

- **WHEN** tabellen `Transaktioner` visas
- **THEN** rubrikerna är `Datum`, `Tid`, `Typ`, `Aktie`, `Antal`, `Kurs`, `Avgår`, `Värde`
- **AND** sortering på `Aktie` och döljning av utdelningar fungerar som tidigare

## MODIFIED Requirements

### Requirement: Klockslag för köp och sälj

`aktiekop.csv` SHALL kunna ha en valfri sista kolumn `time` med klockslaget för en händelse i svensk tid i formatet `HH:MM`. Kolumnen får vara tom. När appen första gången skriver till en fil som saknar kolumnen SHALL den lägga till `time` i rubrikraden och ett tomt värde på varje befintlig rad utan att ändra några andra värden. Klockslag som användaren har fyllt i för hand SHALL bevaras när appen lägger till nya rader. Ett värde i `time` som inte är ett giltigt klockslag mellan 00:00 och 23:59 SHALL behandlas som saknat utan att filen slutar fungera. Formuläret `Registrera aktiehändelse` SHALL ha ett valfritt fält `Tid` för köp och sälj som inte visas för utdelning; ett ifyllt klockslag SHALL sparas i `time`, och ett ogiltigt klockslag SHALL avvisas med ett begripligt fel. Transaktionslistan SHALL visa klockslaget i en egen kolumn `Tid` direkt efter `Datum`, som är tom när klockslag saknas, och kolumnen `Datum` SHALL bara visa datumet. I minutdiagrammet SHALL hovringen över ett köp eller sälj med klockslag börja med klockslaget. Importerade händelser SHALL sparas med tomt `time`. Huvuddiagrammets markeringar SHALL fortfarande placeras per dag.

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

### Requirement: Visa aktuell portföljställning bredvid transaktionslistan

Under diagrammet SHALL en sammanställning med rubriken `Resultat` visas till vänster om listan `Transaktioner`. Tabellen `Resultat` SHALL på breda skärmar vara så bred som dess kolumner och radåtgärder behöver, och listan `Transaktioner` SHALL få resten av bredden. Tabellen SHALL visa aktiens namn, kvarvarande antal, senaste kurs, värde i aktiens valuta (senaste kurs multiplicerad med kvarvarande antal), värde i SEK, GAV, resultat exklusive utdelningar, utdelningar, totalt resultat i SEK och resultat i procent. Datumkolumn SHALL inte visas i resultatlistan. Kursvärdet SHALL visas kursivt efter att en aktuell intradagskurs har hämtats för aktien under den aktuella appsessionen. Resultatet SHALL inkludera realiserad vinst/förlust från registrerade försäljningar och orealiserad vinst/förlust från kvarvarande aktier. Resultat exklusive utdelningar SHALL inte innehålla registrerade utdelningar eller källskatt; utdelningskolumnen SHALL visa nettoutdelning och källskatt i SEK. GAV SHALL räknas med viktat genomsnittligt anskaffningsvärde, inklusive courtage. Utländska köp SHALL räknas om till SEK med valutakurs för transaktionsdagen eller närmast föregående tillgängliga valutadag; marknadsvärdet SHALL räknas om med senast tillgängliga valutakurs. Tabellen SHALL uppdateras efter en ny transaktion och efter uppdatering av marknadsdata, inklusive aktuella intradagskurser. Varje rad SHALL ha en kompakt ikonknapp med uppdateringssymbol längst till höger som hämtar aktuell kurs enbart för den radens aktie och uppdaterar dess radresultat.

Registrerade utdelningar SHALL räknas som kontant avkastning i SEK-resultatet, utan att ändra aktieantal eller GAV. Eventuell källskatt SHALL minska utdelningsresultatet.

#### Scenario: Visa aktuell ställning från flera köp

- **WHEN** en aktie har en eller flera registrerade köp
- **THEN** sammanställningen visar senaste stängningsdatum och kurs, kvarvarande antal, GAV samt resultat i kronor och procent
- **AND** sammanställningen ligger till vänster om transaktionslistan på breda skärmar och är inte bredare än sitt innehåll
- **AND** resultatet räknar med courtage och växelkurs för utländska aktier

#### Scenario: Ta med försäljningar i ställningen

- **WHEN** aktien har registrerade köp och försäljningar
- **THEN** kvarvarande antal och anskaffningsvärde minskas med sålda aktier enligt viktat genomsnitt
- **AND** realiserat resultat från försäljningen läggs till orealiserat resultat
