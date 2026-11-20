## MODIFIED Requirements

### Requirement: Visa transaktioner i diagram och lista

Köp SHALL visas i huvuddiagrammet som små cirklar med mörk kontur. Sälj SHALL visas som nedåtriktade trianglar och utdelning som romber. Transaktionsmarkeringarna SHALL inte visas i det nedre översiktsdiagrammet/rangeslidern. Under diagrammet SHALL finnas en lista över registrerade transaktioner med datum, typ, aktie, antal, kurs/belopp per aktie, courtage/källskatt och total- eller nettobelopp. Listan SHALL uppdateras direkt när en transaktion har sparats. Varje rad i listan `Transaktioner` SHALL ha en knapp `Ta bort` längst till höger. Ett första klick SHALL inte ta bort något utan visa `Bekräfta` och `Avbryt` på raden; först `Bekräfta` SHALL ta bort raden ur `aktiekop.csv`. Borttagningen SHALL gälla exakt den rad som visades, även när flera rader har samma innehåll, och om `aktiekop.csv` har ändrats på annat sätt sedan sidan laddades SHALL ingenting tas bort och ett fel visas. Efter borttagning SHALL markeringen försvinna ur diagrammet och minutdiagrammet, och `Transaktioner`, `Resultat` och värdepapperslistans avkastning SHALL räknas om utan att sidan laddas om. Rader från mäklarimporten SHALL kunna tas bort på samma sätt; en senare import av samma exportfil SHALL då lägga till raden igen. Varje giltig händelse i `aktiekop.csv` för en aktie i `aktier.csv` SHALL visas i transaktionslistan och räknas med i `Resultat`, även när den infaller före aktiens första kurs hos Yahoo Finance; en sådan händelse SHALL sakna markering i huvuddiagrammet, medan händelser från och med den första kursen markeras som tidigare.

#### Scenario: Visa en registrerad transaktion

- **WHEN** en transaktion finns i `aktiekop.csv`
- **THEN** den visas i transaktionslistan och på motsvarande datum i huvuddiagrammet
- **AND** listans belopp visar antal multiplicerat med kurs, justerat med courtage
- **AND** markeringen förekommer inte i rangesliderns översiktskurva

#### Scenario: Transaktion före första kursen

- **WHEN** en fond har ett köp 2019 i `aktiekop.csv` och dess kurshistorik hos Yahoo Finance börjar 2022
- **THEN** köpet visas i transaktionslistan
- **AND** köpet ingår i fondens antal, GAV och avkastning i `Resultat`
- **AND** köpet har ingen markering i huvuddiagrammet

#### Scenario: Ta bort en dubblerad utdelning

- **WHEN** Tele2 har två utdelningar för samma utbetalning och användaren klickar `Ta bort` och sedan `Bekräfta` på den ena
- **THEN** raden tas bort ur `aktiekop.csv` och ur listan `Transaktioner`
- **AND** utdelningskolumnen i `Resultat`, värdepapperslistans avkastning och markeringarna i diagrammet räknas om
- **AND** den andra utdelningen finns kvar

#### Scenario: Avbryt borttagning

- **WHEN** användaren klickar `Ta bort` och sedan `Avbryt`
- **THEN** ingen rad tas bort och raden visar åter knappen `Ta bort`

#### Scenario: Filen har ändrats

- **WHEN** raden som ska tas bort inte längre finns på samma plats med samma innehåll i `aktiekop.csv`
- **THEN** ingenting tas bort och ett felmeddelande ber användaren ladda om sidan
