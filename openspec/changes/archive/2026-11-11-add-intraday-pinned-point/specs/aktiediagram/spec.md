## ADDED Requirements

### Requirement: Låst punkt i minutdiagrammet

Ett klick på en punkt i minutdiagrammet SHALL låsa den punkten: den markeras i diagrammet med en punkt och en lodrät linje, och en popup visas intill punkten med tid i svensk tid och kurs i aktiens valuta. Popupen SHALL ligga kvar tills den stängs, oavsett var pekaren befinner sig. Popupen SHALL ha knapparna `◀`, `▶` och `×`. `◀` och vänster piltangent SHALL flytta den låsta punkten till föregående minut med kurs, och `▶` och höger piltangent SHALL flytta den till nästa minut med kurs; tid utan handel och minuter utan kurs SHALL hoppas över. Vid första respektive sista minuten SHALL motsvarande knapp vara inaktiverad. `×` och `Esc` SHALL stänga popupen och ta bort markeringen. Piltangenterna SHALL bara styra den låsta punkten när en punkt är låst och fokus inte ligger i ett textfält eller en listruta, och de SHALL då inte rulla sidan. Om den låsta punkten flyttas utanför det synliga tidsintervallet SHALL diagrammet panoreras så att punkten syns, med bibehållen intervallbredd. Ett klick på en annan punkt SHALL flytta låsningen dit. Byte till `Vecka` eller `Månad` SHALL behålla den låsta punkten om den finns i det nya intervallet och annars stänga popupen. Byte av solo-aktie eller avmarkerad solo SHALL stänga popupen. Hovring SHALL fungera som tidigare även när en punkt är låst. Huvuddiagrammets klick för jämförelser SHALL inte påverkas.

#### Scenario: Lås en punkt

- **WHEN** användaren klickar på en punkt i minutdiagrammet
- **THEN** punkten markeras och en popup med tid och kurs visas intill den
- **AND** popupen ligger kvar när pekaren flyttas bort från diagrammet

#### Scenario: Stega med piltangenter

- **WHEN** en punkt är låst och användaren trycker på höger piltangent
- **THEN** markeringen och popupen flyttas till nästa minut med kurs och visar den minutens tid och kurs
- **AND** sidan rullar inte
- **WHEN** användaren trycker på vänster piltangent
- **THEN** markeringen flyttas tillbaka en minut

#### Scenario: Stega över tid utan handel

- **WHEN** den låsta punkten är dagens sista minut med kurs och användaren trycker på `▶`
- **THEN** markeringen flyttas till nästa handelsdags första minut med kurs

#### Scenario: Stega utanför synligt intervall

- **WHEN** den låsta punkten är den sista synliga minuten efter en zoomning och användaren trycker på höger piltangent
- **THEN** diagrammet panoreras så att den nya punkten syns och det synliga intervallet behåller sin bredd

#### Scenario: Första och sista minuten

- **WHEN** den låsta punkten är den sista minuten med kurs
- **THEN** `▶` är inaktiverad och höger piltangent flyttar inte markeringen

#### Scenario: Stäng popupen

- **WHEN** användaren klickar på `×` eller trycker på `Esc`
- **THEN** popupen och markeringen försvinner och piltangenterna styr inte längre diagrammet

#### Scenario: Byt solo-aktie

- **WHEN** en punkt är låst och användaren väljer solo för en annan aktie eller avmarkerar solo
- **THEN** popupen och markeringen försvinner
