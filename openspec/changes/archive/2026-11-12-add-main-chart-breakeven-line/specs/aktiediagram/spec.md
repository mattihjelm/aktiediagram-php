## ADDED Requirements

### Requirement: Nollpunktslinje i huvuddiagrammet vid solo

När en aktie är solo-vald och finns i innehavet SHALL huvuddiagrammet visa en vågrät streckad linje vid aktiens nollpunkt, märkt `Nollpunkt <pris> <valuta>` med två decimaler. Nollpunkten SHALL beräknas som i minutdiagrammet, GAV minus aktiens totala utdelning efter källskatt dividerad med antal aktier i innehavet, och anges i huvuddiagrammets valuta för aktien. Linjen SHALL ritas på diagrammets indexskala, som nollpunkten dividerad med aktiens kurs vid det synliga startdatumet gånger 100, och SHALL flyttas när det synliga datumintervallet ändras så att den alltid motsvarar samma kurs som kurvan. Linjen SHALL fungera både med linjär och logaritmisk skala. Om nollpunkten ligger utanför det synliga intervallet på y-axeln SHALL etiketten visas vid diagrammets övre eller nedre kant med en pil mot linjen, och y-axeln SHALL fortsätta att anpassas till kurvan. Utan solo-vald aktie, när aktien inte finns i innehavet eller när en valutakurs som behövs saknas SHALL ingen linje visas. Linjen SHALL uppdateras när aktiehändelser registreras, ändras, tas bort eller importeras och SHALL försvinna när solo avmarkeras. Jämförelser, slutetiketter, hovervärden och `aktievy.json` SHALL inte påverkas.

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
