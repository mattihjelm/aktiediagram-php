## ADDED Requirements

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

## MODIFIED Requirements

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
