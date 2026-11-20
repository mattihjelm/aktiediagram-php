## ADDED Requirements

### Requirement: Klockslag för köp och sälj

`aktiekop.csv` SHALL kunna ha en valfri sista kolumn `time` med klockslaget för en händelse i svensk tid i formatet `HH:MM`. Kolumnen får vara tom. När appen första gången skriver till en fil som saknar kolumnen SHALL den lägga till `time` i rubrikraden och ett tomt värde på varje befintlig rad utan att ändra några andra värden. Klockslag som användaren har fyllt i för hand SHALL bevaras när appen lägger till nya rader. Ett värde i `time` som inte är ett giltigt klockslag mellan 00:00 och 23:59 SHALL behandlas som saknat utan att filen slutar fungera. Formuläret `Registrera aktiehändelse` SHALL ha ett valfritt fält `Tid` för köp och sälj som inte visas för utdelning; ett ifyllt klockslag SHALL sparas i `time`, och ett ogiltigt klockslag SHALL avvisas med ett begripligt fel. Transaktionslistan SHALL visa klockslaget efter datumet när det finns. Importerade händelser SHALL sparas med tomt `time`. Huvuddiagrammets markeringar SHALL fortfarande placeras per dag.

#### Scenario: Registrera köp med klockslag

- **WHEN** användaren registrerar ett köp med datum 2026-11-11 och tid 10:42
- **THEN** raden sparas i `aktiekop.csv` med `time` 10:42
- **AND** transaktionslistan visar `2026-11-11 10:42`

#### Scenario: Registrera utan klockslag

- **WHEN** användaren registrerar ett köp utan att fylla i tid, eller en utdelning
- **THEN** raden sparas med tomt `time`

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

## MODIFIED Requirements

### Requirement: Transaktioner i minutdiagrammet

Minutdiagrammet SHALL markera den solo-valda aktiens registrerade köp, sälj och utdelningar vars datum har minutkurser. Ett köp eller sälj med klockslag SHALL placeras vid den första minuten med kurs på eller efter klockslaget samma dag, eller vid dagens sista minut med kurs om klockslaget ligger efter den. Köp och sälj utan klockslag samt utdelningar SHALL placeras vid dagens första minut med kurs. Köp och sälj SHALL placeras vid transaktionens kurs omräknad till minutdiagrammets valuta, och utdelningar SHALL placeras på kurskurvan vid sin minut. Markeringarna SHALL ha samma symboler som i huvuddiagrammet, cirkel för köp, nedåtriktad triangel för sälj och romb för utdelning, och aktiens färg från huvuddiagrammet. Hovring över en markering SHALL visa typ, antal, kurs eller utdelning per aktie samt courtage respektive källskatt i transaktionens valuta, och klockslaget när det finns. Händelser på dagar utan minutkurser SHALL inte visas. Markeringarna SHALL uppdateras när aktiehändelser registreras, ändras, tas bort eller importeras medan aktien är solo-vald. Den låsta punkten, nollpunktslinjen, `Vecka` och `Månad`, arkivet med minutkurser och huvuddiagrammet SHALL inte påverkas.

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
