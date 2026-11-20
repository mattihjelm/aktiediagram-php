## MODIFIED Requirements

### Requirement: Visa transaktioner i diagram och lista

Köp SHALL visas i huvuddiagrammet som små cirklar med mörk kontur. Sälj SHALL visas som nedåtriktade trianglar och utdelning som romber. Transaktionsmarkeringarna SHALL inte visas i det nedre översiktsdiagrammet/rangeslidern. Under diagrammet SHALL finnas en lista över registrerade transaktioner med datum, typ, aktie, antal, kurs/belopp per aktie, courtage/källskatt och total- eller nettobelopp. Listan SHALL uppdateras direkt när en transaktion har sparats. Varje giltig händelse i `aktiekop.csv` för en aktie i `aktier.csv` SHALL visas i transaktionslistan och räknas med i `Resultat`, även när den infaller före aktiens första kurs hos Yahoo Finance; en sådan händelse SHALL sakna markering i huvuddiagrammet, medan händelser från och med den första kursen markeras som tidigare.

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
