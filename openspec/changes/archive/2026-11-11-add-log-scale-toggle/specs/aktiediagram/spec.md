## ADDED Requirements

### Requirement: Logaritmisk skala

Diagrammet SHALL ha en kryssruta `Logaritmisk skala` till höger om datumintervallets start- och slutfält. När kryssrutan inte är markerad SHALL alla kurvor dela en gemensam linjär y-axel som tidigare. När den är markerad SHALL varje aktie och dess transaktionsmarkeringar visas på en egen dold logaritmisk y-axel. Alla dessa axlar SHALL ha samma logaritmiska spann, satt av den synliga kurva som varierar mest inom det synliga datumintervallet, så att lika stora procentuella rörelser blir lika höga för alla aktier. Varje kurva SHALL centreras på sin egen nivå, och y-axelns skalvärden SHALL inte visas. Spannet SHALL räknas om när datumintervallet ändras eller när aktier visas eller döljs. Indexeringen till 100 vid synligt startdatum, hovervärden, legendens resultat och jämförelser SHALL vara oförändrade oavsett skala. Valet SHALL sparas i `aktievy.json` och återställas nästa gång appen öppnas. En `aktievy.json` utan inställningen SHALL ge linjär skala.

#### Scenario: Slå på logaritmisk skala

- **WHEN** användaren markerar `Logaritmisk skala`
- **THEN** varje kurva visas på en egen dold logaritmisk axel utan att sidan laddas om
- **AND** den synliga kurva som varierar mest fyller diagrammets höjd och övriga kurvor har samma skala centrerad på sin egen nivå
- **AND** kurvornas indexvärden, hovervärden och slutetiketter är desamma som på linjär skala

#### Scenario: Slå av logaritmisk skala

- **WHEN** användaren avmarkerar `Logaritmisk skala`
- **THEN** alla kurvor visas åter på en gemensam linjär y-axel med synliga skalvärden

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

- **WHEN** användaren har valt logaritmisk skala och öppnar appen igen
- **THEN** kryssrutan är markerad och diagrammet visas med logaritmisk y-axel

#### Scenario: Äldre vyinställning

- **WHEN** `aktievy.json` bara innehåller `start` och `end`
- **THEN** diagrammet visas med linjär y-axel och det sparade datumintervallet
