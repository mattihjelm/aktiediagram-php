## ADDED Requirements

### Requirement: Transaktioner i minutdiagrammet

Minutdiagrammet SHALL markera den solo-valda aktiens registrerade köp, sälj och utdelningar vars datum har minutkurser. Eftersom aktiehändelser saknar klockslag SHALL varje markering placeras vid dagens första minut med kurs. Köp och sälj SHALL placeras vid transaktionens kurs omräknad till minutdiagrammets valuta, och utdelningar SHALL placeras på kurskurvan vid den minuten. Markeringarna SHALL ha samma symboler som i huvuddiagrammet, cirkel för köp, nedåtriktad triangel för sälj och romb för utdelning, och aktiens färg från huvuddiagrammet. Hovring över en markering SHALL visa typ, antal, kurs eller utdelning per aktie samt courtage respektive källskatt i transaktionens valuta. Händelser på dagar utan minutkurser SHALL inte visas. Markeringarna SHALL uppdateras när aktiehändelser registreras, ändras, tas bort eller importeras medan aktien är solo-vald. Den låsta punkten, nollpunktslinjen, `Vecka` och `Månad`, arkivet med minutkurser och huvuddiagrammet SHALL inte påverkas.

#### Scenario: Köp i minutdiagrammet

- **WHEN** den solo-valda aktien har ett köp för 10 dagar sedan till 450,00 kr och minutdiagrammet visar månaden
- **THEN** en cirkel visas vid kursen 450,00 kr vid den dagens första minut med kurs
- **AND** hovring över cirkeln visar `KÖP`, antal, kurs och courtage

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
- **THEN** en cirkel visas i minutdiagrammet vid dagens första minut med kurs utan att minutkurserna hämtas på nytt
