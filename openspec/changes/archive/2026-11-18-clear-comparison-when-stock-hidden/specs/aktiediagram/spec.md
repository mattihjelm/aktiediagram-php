## MODIFIED Requirements

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
