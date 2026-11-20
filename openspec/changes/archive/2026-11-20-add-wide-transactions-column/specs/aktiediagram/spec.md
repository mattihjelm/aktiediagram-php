## MODIFIED Requirements

### Requirement: Visa aktuell portföljställning bredvid transaktionslistan

Under diagrammet SHALL en sammanställning med rubriken `Resultat` visas, och listan `Transaktioner` SHALL visas under den, på alla skärmbredder. Tabellen `Resultat` SHALL vara så bred som dess kolumner och radåtgärder behöver och SHALL rulla i sidled inom sin egen yta när den inte ryms; sidan SHALL inte rulla i sidled. Listan `Transaktioner` SHALL visa cirka tio transaktionsrader under kolumnrubrikerna och rulla vertikalt inom sin egen yta när det finns fler rader. När tabellerna `Resultat` och `Transaktioner` får plats bredvid varandra i sin fulla bredd SHALL listan `Transaktioner`, med rubrik, importkontroller och tabell, i stället visas till höger om `Resultat` under diagrammet, med rubrikerna på samma rad. Listan SHALL då vara lika hög som tabellen `Resultat`, dock minst cirka tio transaktionsrader, och rulla vertikalt inom sin egen yta. Byte mellan layouterna SHALL ske när fönstrets bredd eller tabellernas innehåll ändras, utan att sidan laddas om, och import, borttagning, filter och sortering i `Transaktioner` SHALL fungera likadant i båda layouterna. Tabellen SHALL visa aktiens namn, kvarvarande antal, senaste kurs, värde i aktiens valuta (senaste kurs multiplicerad med kvarvarande antal), värde i SEK, GAV, resultat exklusive utdelningar, utdelningar, totalt resultat i SEK, resultat i procent samt orealiserat resultat i SEK och i procent. Datumkolumn SHALL inte visas i resultatlistan. Kursvärdet SHALL visas kursivt efter att en aktuell intradagskurs har hämtats för aktien under den aktuella appsessionen. Resultatet SHALL inkludera realiserad vinst/förlust från registrerade försäljningar och orealiserad vinst/förlust från kvarvarande aktier. Resultat exklusive utdelningar SHALL inte innehålla registrerade utdelningar eller källskatt; utdelningskolumnen SHALL visa nettoutdelning och källskatt i SEK. GAV SHALL räknas med viktat genomsnittligt anskaffningsvärde, inklusive courtage. Utländska köp SHALL räknas om till SEK med valutakurs för transaktionsdagen eller närmast föregående tillgängliga valutadag; marknadsvärdet SHALL räknas om med senast tillgängliga valutakurs. Tabellen SHALL uppdateras efter en ny transaktion och efter uppdatering av marknadsdata, inklusive aktuella intradagskurser. Varje rad SHALL ha en kompakt ikonknapp med uppdateringssymbol längst till höger som hämtar aktuell kurs enbart för den radens aktie och uppdaterar dess radresultat.

Registrerade utdelningar SHALL räknas som kontant avkastning i SEK-resultatet, utan att ändra aktieantal eller GAV. Eventuell källskatt SHALL minska utdelningsresultatet.

Orealiserat resultat SHALL vara kvarvarande antal gånger senaste kurs gånger senast tillgängliga valutakurs, minus kvarvarande anskaffningsvärde i SEK enligt viktat genomsnitt inklusive courtage och omräknat med valutakursen för respektive köp. Det SHALL inte innehålla utdelningar, källskatt eller realiserat resultat från försäljningar. Orealiserat resultat i procent SHALL vara det orealiserade resultatet delat med kvarvarande anskaffningsvärde i SEK, med två decimaler, på samma sätt som mäklarens avkastning per innehav. Båda värdena SHALL visas som `—` när kvarvarande antal är noll eller när en valutakurs saknas.

#### Scenario: Visa aktuell ställning från flera köp

- **WHEN** en aktie har en eller flera registrerade köp
- **THEN** sammanställningen visar senaste stängningsdatum och kurs, kvarvarande antal, GAV samt resultat i kronor och procent
- **AND** sammanställningen ligger ovanför transaktionslistan och är inte bredare än sitt innehåll
- **AND** resultatet räknar med courtage och växelkurs för utländska aktier

#### Scenario: Resultat ovanför Transaktioner

- **WHEN** tabellerna inte ryms bredvid varandra, till exempel i telefonlayout
- **THEN** `Resultat` ligger överst och `Transaktioner` direkt under, och båda tabellerna kan läsas utan att sidan rullar i sidled
- **AND** en `Resultat` som är bredare än sin yta rullar i sidled inom tabellens yta

#### Scenario: Transaktioner till höger om Resultat när det finns plats

- **WHEN** fönstret är så brett att `Resultat` och `Transaktioner` ryms bredvid varandra i full bredd
- **THEN** `Transaktioner` ligger till höger om `Resultat` under diagrammet, med rubrikerna `Resultat` och `Transaktioner` på samma rad
- **AND** listan är lika hög som tabellen `Resultat`, dock minst cirka tio rader, och fler rader nås genom att rulla listan medan kolumnrubrikerna ligger kvar överst
- **AND** sidan rullar inte i sidled

#### Scenario: Smalare fönster igen

- **WHEN** fönstret görs så smalt att tabellerna inte längre ryms bredvid varandra
- **THEN** `Transaktioner` flyttas tillbaka under `Resultat` med cirka tio rader, utan att sidan laddas om

#### Scenario: Tio rader i Transaktioner

- **WHEN** det finns fler än tio transaktioner
- **THEN** listan `Transaktioner` visar cirka tio rader under kolumnrubrikerna
- **AND** övriga rader nås genom att rulla listan, medan kolumnrubrikerna ligger kvar överst

#### Scenario: Ta med försäljningar i ställningen

- **WHEN** aktien har registrerade köp och försäljningar
- **THEN** kvarvarande antal och anskaffningsvärde minskas med sålda aktier enligt viktat genomsnitt
- **AND** realiserat resultat från försäljningen läggs till orealiserat resultat

#### Scenario: Orealiserat resultat som hos mäklaren

- **WHEN** en fond har 100 andelar kvar med GAV 200,00 kr, senaste kurs 250,00 kr och tidigare försäljningar med vinst
- **THEN** `Orealiserat` visar +5 000,00 kr och `Orealiserat (%)` visar +25,00%
- **AND** `Avkastn`, `Tot avkastn` och `Tot avkastn (%)` räknar fortfarande med den realiserade vinsten och alla köp

#### Scenario: Utdelning ingår inte i orealiserat

- **WHEN** en aktie har registrerade utdelningar
- **THEN** `Orealiserat` och `Orealiserat (%)` är desamma som utan utdelningarna

#### Scenario: Allt sålt

- **WHEN** alla aktier i ett värdepapper är sålda
- **THEN** `Orealiserat` och `Orealiserat (%)` visar `—`

