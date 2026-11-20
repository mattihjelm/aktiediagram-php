## ADDED Requirements

### Requirement: Nollpunktslinje i minutdiagrammet

När den solo-valda aktien finns i innehavet SHALL minutdiagrammet visa en vågrät streckad linje vid nollpunkten, märkt `Nollpunkt <pris> <valuta>` med två decimaler. Nollpunkten SHALL vara GAV minus aktiens totala utdelning efter källskatt dividerad med antal aktier i innehavet. GAV och antal SHALL vara samma värden som i portföljtabellens kolumner `GAV` och `Antal`, och utdelningen SHALL omfatta alla registrerade utdelningar för aktien. Nollpunkten SHALL anges i minutdiagrammets valuta. Utdelningar i en annan valuta än aktiens SHALL räknas om med valutakurserna på respektive utdelningsdag. Om aktiens transaktioner är i kronor men minutdiagrammet visar en annan valuta SHALL nollpunkten räknas om med den senaste valutakursen. Om nollpunkten ligger utanför det synliga kursintervallet SHALL etiketten visas vid diagrammets övre eller nedre kant med en pil mot linjen, och y-axeln SHALL fortsätta att anpassas till kurserna. Om aktien inte finns i innehavet, eller om en valutakurs som behövs saknas, SHALL ingen linje visas och minutdiagrammet i övrigt fungera som vanligt. Nollpunkten SHALL uppdateras när aktiehändelser registreras, ändras, tas bort eller importeras medan aktien är solo-vald. Den låsta punkten i minutdiagrammet SHALL fungera som tidigare när linjen visas.

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
