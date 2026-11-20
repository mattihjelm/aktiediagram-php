## ADDED Requirements

### Requirement: Avvikelse från glidande medel

Skalvalet SHALL ha kryssrutan `Avvikelse från 200-dagars medel`. Avvikelsen för en aktie SHALL vara den procentuella avvikelsen mellan aktiens stängningskurs och dess eget glidande medelvärde över de 200 senaste handelsdagarna till och med samma dag, beräknat som `(kurs / medelvärde − 1) × 100`. Medelvärdet SHALL beräknas över aktiens hela hämtade kurshistorik, så att en dags värde inte beror på det synliga datumintervallet, och de första 199 handelsdagarna i aktiens historik SHALL sakna värde. När endast `Avvikelse från 200-dagars medel` är markerad SHALL varje aktie visas som sin avvikelse; alla kurvor SHALL dela en gemensam linjär y-axel i procent med rubriken `Avvikelse från 200-dagars medel (%)` och en vågrät referenslinje vid 0 %, och y-axeln SHALL anpassas till de synliga värdena i det synliga datumintervallet. Hovring SHALL då visa datum, aktiens kurs och avvikelsen i procent med en decimal i stället för indexvärdet. Kurvornas slutetiketter och transaktionsmarkeringarna SHALL placeras på avvikelsekurvan vid sitt datum. Jämförelser SHALL fortfarande visa den procentuella kursförändringen mellan de två klickade punkterna, procent per månad och förfluten tid, medan jämförelsens linjer ritas vid punkternas avvikelsevärden. Nollpunktslinjen för en solo-vald aktie SHALL inte visas när endast avvikelse är vald. När både `Logaritmisk` och `Avvikelse från 200-dagars medel` är markerade SHALL aktiekurvorna, deras transaktionsmarkeringar, slutetiketter, jämförelser och nollpunktslinje visas exakt som med enbart logaritmisk skala, och dessutom SHALL varje synlig aktie ha en avvikelsekurva i samma färg som en tunn prickad linje mot en synlig y-axel till vänster i procent med rubriken `Avvikelse från 200-dagars medel (%)` och en vågrät referenslinje vid 0 %; den axeln SHALL anpassas till de synliga avvikelsevärdena. Hovring SHALL i det läget även visa avvikelsen för varje synlig aktie. Avvikelsekurvorna SHALL inte kunna väljas för jämförelser eller transaktionsformuläret, SHALL inte ha egna slutetiketter eller markeringar och SHALL döljas och visas tillsammans med sin aktie. Byte av läge SHALL ske utan att sidan laddas om, och legendens resultat, transaktionslistan och minutdiagrammet SHALL inte påverkas.

#### Scenario: Välj avvikelse från glidande medel

- **WHEN** användaren markerar `Avvikelse från 200-dagars medel` medan `Linjär` är markerad
- **THEN** `Linjär` avmarkeras och varje synlig aktie visas som procentuell avvikelse från sitt 200-dagars glidande medelvärde på en gemensam axel i procent med en referenslinje vid 0 %
- **AND** sidan laddas inte om

#### Scenario: Jämförbara nedgångar

- **WHEN** en aktie låg 25 % under sitt glidande medel 2020 och 10 % under det 2025
- **THEN** nedgången 2020 visas som ungefär −25 % och nedgången 2025 som ungefär −10 % på samma axel, oberoende av kursnivån

#### Scenario: Oberoende av synligt intervall

- **WHEN** användaren ändrar det synliga datumintervallet i avvikelseläget
- **THEN** varje dags avvikelsevärde är oförändrat och y-axeln anpassas till de nya synliga värdena

#### Scenario: Början av historiken

- **WHEN** det synliga intervallet omfattar en akties första 199 handelsdagar
- **THEN** kurvan saknar värden för de dagarna och börjar vid den 200:e handelsdagen

#### Scenario: Hovring och jämförelse i avvikelseläget

- **WHEN** användaren hovrar över en kurva när endast avvikelse är vald
- **THEN** datum, kurs och avvikelse i procent visas
- **WHEN** användaren klickar på två punkter på samma kurva
- **THEN** jämförelsen visar kursförändringen mellan punkterna och dess linjer ritas vid punkternas avvikelsevärden

#### Scenario: Solo i avvikelseläget

- **WHEN** en aktie i innehavet är solo-vald och endast avvikelse är vald
- **THEN** ingen nollpunktslinje visas i huvuddiagrammet
- **AND** nollpunktslinjen visas igen när `Linjär` eller `Logaritmisk` markeras

#### Scenario: Logaritmisk skala och avvikelse samtidigt

- **WHEN** användaren markerar både `Logaritmisk` och `Avvikelse från 200-dagars medel`
- **THEN** aktiekurvorna visas på egna dolda logaritmiska axlar som med enbart logaritmisk skala
- **AND** varje synlig aktie har dessutom en tunn prickad avvikelsekurva i samma färg mot en synlig vänster y-axel i procent med en referenslinje vid 0 %
- **AND** hovring visar både kurs, index och avvikelse

#### Scenario: Avvikelsekurvor i kombinationsläget

- **WHEN** både logaritmisk skala och avvikelse är valda och användaren döljer en aktie
- **THEN** både aktiekurvan och dess avvikelsekurva döljs
- **WHEN** användaren klickar på en avvikelsekurva
- **THEN** ingen jämförelsepunkt väljs och transaktionsformuläret ändras inte

## MODIFIED Requirements

### Requirement: Logaritmisk skala

Diagrammet SHALL ha skalvalet `Skala` till höger om datumintervallets start- och slutfält med tre kryssrutor: `Linjär`, `Logaritmisk` och `Avvikelse från 200-dagars medel`. De tillåtna kombinationerna SHALL vara endast `Linjär`, endast `Logaritmisk`, endast `Avvikelse från 200-dagars medel`, eller `Logaritmisk` och `Avvikelse från 200-dagars medel` tillsammans. Att markera `Linjär` SHALL avmarkera de två andra, att markera `Logaritmisk` eller `Avvikelse från 200-dagars medel` SHALL avmarkera `Linjär`, och om användaren avmarkerar den sista markerade kryssrutan SHALL `Linjär` markeras. När `Linjär` är markerad SHALL alla kurvor dela en gemensam linjär y-axel som tidigare. När `Logaritmisk` är markerad SHALL varje aktie och dess transaktionsmarkeringar visas på en egen dold logaritmisk y-axel. Alla dessa axlar SHALL ha samma logaritmiska spann, satt av den synliga kurva som varierar mest inom det synliga datumintervallet, så att lika stora procentuella rörelser blir lika höga för alla aktier. Varje kurva SHALL centreras på sin egen nivå, och de logaritmiska axlarnas skalvärden SHALL inte visas. Spannet SHALL räknas om när datumintervallet ändras eller när aktier visas eller döljs. Indexeringen till 100 vid synligt startdatum, hovervärden, legendens resultat och jämförelser SHALL vara desamma med linjär och logaritmisk skala. Valet SHALL sparas i `aktievy.json` och återställas nästa gång appen öppnas. En `aktievy.json` utan inställningen SHALL ge linjär skala, och en `aktievy.json` som bara anger logaritmisk skala på det äldre sättet SHALL ge logaritmisk skala.

#### Scenario: Slå på logaritmisk skala

- **WHEN** användaren markerar `Logaritmisk` medan `Linjär` är markerad
- **THEN** `Linjär` avmarkeras och varje kurva visas på en egen dold logaritmisk axel utan att sidan laddas om
- **AND** den synliga kurva som varierar mest fyller diagrammets höjd och övriga kurvor har samma skala centrerad på sin egen nivå
- **AND** kurvornas indexvärden, hovervärden och slutetiketter är desamma som på linjär skala

#### Scenario: Slå av logaritmisk skala

- **WHEN** användaren markerar `Linjär`
- **THEN** `Logaritmisk` och `Avvikelse från 200-dagars medel` avmarkeras och alla kurvor visas åter på en gemensam linjär y-axel med synliga skalvärden

#### Scenario: Avmarkera sista kryssrutan

- **WHEN** endast `Logaritmisk` är markerad och användaren avmarkerar den
- **THEN** `Linjär` markeras och diagrammet visas med linjär y-axel

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
