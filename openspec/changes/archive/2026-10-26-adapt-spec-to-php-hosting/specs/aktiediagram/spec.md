## ADDED Requirements

### Requirement: Drift på webbhotell

Appen SHALL köras som PHP på ett delat webbhotell (one.com) utan Python, utan långlivad serverprocess och utan skalåtkomst. Varje sida och API-anrop SHALL hanteras av PHP per förfrågan, och diagrammet SHALL renderas av JavaScript i webbläsaren. Transaktionsformuläret SHALL spara data via `/api/purchases`. På breda fönster SHALL uppdateringsknappen och datumfälten ligga till höger om köpformuläret, ungefär centrerade ovanför diagrammet. Layouten SHALL anpassa diagram, legend och transaktionskontroller för smalare fönster. Samtidiga skrivningar till samma datafil SHALL inte kunna lämna filen trasig eller ofullständig.

#### Scenario: Öppna appen

- **WHEN** en inloggad användare öppnar appens adress i webbläsaren och kursdata kan hämtas
- **THEN** det interaktiva diagrammet visas med transaktionsformulär, transaktionslista och resultat
- **AND** ingen process behöver startas eller stoppas på servern

#### Scenario: Samtidiga skrivningar

- **WHEN** två förfrågningar sparar till `aktiekop.csv` eller `aktier.csv` samtidigt
- **THEN** båda ändringarna sparas i sin helhet eller så får en av förfrågningarna ett fel
- **AND** filen förblir giltig och innehåller inga halvskrivna rader

### Requirement: Inloggning

Appen SHALL kräva inloggning med ett lösenord för en enda användare innan någon sida, kursdata eller transaktionsdata visas. Lösenordet SHALL lagras endast som en hash. En lyckad inloggning SHALL skapa en session som gäller för både sidor och API-anrop. Oinloggade sidförfrågningar SHALL skickas till inloggningssidan. Oinloggade API-anrop SHALL besvaras med HTTP 401 utan data och utan att ändra några filer. Skrivande API-anrop SHALL avvisas om de inte kommer från appens egna sidor i en inloggad session. Upprepade misslyckade inloggningsförsök SHALL fördröjas eller tillfälligt spärras. Appen SHALL ha en knapp `Logga ut` som avslutar sessionen. Sessionen SHALL upphöra efter en period av inaktivitet. Inloggning SHALL endast ske över HTTPS.

#### Scenario: Logga in

- **WHEN** användaren anger rätt lösenord på inloggningssidan
- **THEN** appen visas och API-anropen fungerar i samma session

#### Scenario: Fel lösenord

- **WHEN** användaren anger fel lösenord
- **THEN** inloggningssidan visas igen med ett felmeddelande utan att ange om något annat än lösenordet var fel
- **AND** efter flera misslyckade försök i följd fördröjs eller spärras nya försök tillfälligt

#### Scenario: Oinloggad förfrågan

- **WHEN** någon utan giltig session öppnar appens sida
- **THEN** inloggningssidan visas i stället för appen
- **WHEN** någon utan giltig session anropar ett API, till exempel `/api/purchases`
- **THEN** svaret är HTTP 401 utan transaktions- eller kursdata
- **AND** inga datafiler ändras

#### Scenario: Förfalskad skrivförfrågan

- **WHEN** en annan webbplats får den inloggade användarens webbläsare att skicka en skrivförfrågan till appen
- **THEN** förfrågan avvisas och inga datafiler ändras

#### Scenario: Logga ut

- **WHEN** användaren klickar på `Logga ut`
- **THEN** sessionen avslutas och inloggningssidan visas
- **AND** efterföljande API-anrop besvaras med HTTP 401

### Requirement: Skyddade datafiler

Datafilerna `aktier.csv`, `aktier.example.csv`, `aktiekop.csv`, `aktievy.json` samt konfigurationsfiler med lösenordshash eller andra hemligheter SHALL inte kunna hämtas, listas eller skrivas direkt över HTTP, oavsett inloggning. Datan SHALL endast nås via appens API efter inloggning. Uppladdade importfiler SHALL inte bli åtkomliga via en webbadress.

#### Scenario: Direkt hämtning av datafil

- **WHEN** någon begär en datafil direkt via dess webbadress, till exempel `/data/aktiekop.csv`, med eller utan inloggning
- **THEN** servern svarar med HTTP 403 eller 404 utan filens innehåll

#### Scenario: Kataloglistning

- **WHEN** någon begär katalogen som innehåller datafilerna
- **THEN** ingen fillista visas

## MODIFIED Requirements

### Requirement: Konfigurerbar aktielista

Appen SHALL läsa aktietickrar, visningsnamn och initial synlighet från `aktier.csv` i appens skyddade datakatalog. Om `aktier.csv` saknas SHALL den skapas som en kopia av `aktier.example.csv`. Rader utan ticker SHALL ignoreras. Listan SHALL stödja högst 50 aktier. Ticker och visningsnamn SHALL vara unika. Initial synlighet SHALL kunna anges som `true`/`false`, `ja`/`nej` eller `1`/`0`. Ogiltig konfiguration SHALL ge ett begripligt fel som visas i webbläsaren.

#### Scenario: Läs aktier från konfiguration

- **WHEN** appen öppnas med en giltig `aktier.csv`
- **THEN** varje aktie med ticker blir tillgänglig i diagrammet och i transaktionsformuläret
- **AND** initial synlighet följer aktiens `show_initially`-värde

#### Scenario: Första start utan lokal aktielista

- **WHEN** appen öppnas och `aktier.csv` saknas i datakatalogen
- **THEN** `aktier.csv` skapas från `aktier.example.csv`
- **AND** appen läser aktierna från den nya filen

#### Scenario: Ogiltig eller för stor konfiguration

- **WHEN** konfigurationen innehåller dubbla tickrar, dubbla namn, ogiltigt synlighetsvärde eller fler än 50 aktier
- **THEN** appen visar ett fel som pekar ut konfigurationsproblemet i stället för diagrammet

### Requirement: Historiska kurser och indexerat jämförelsediagram

Appen SHALL hämta justerade dagskurser från Yahoo Finance med historik från 2010-01-01. Hämtningen SHALL göras av servern när appen eller ett API-anrop behöver kursdata. Dagens kurs SHALL endast inkluderas efter respektive börsstängning och en kort publiceringsmarginal. Kurserna SHALL visas som separata kurvor i ett gemensamt diagram. Varje kurva SHALL indexeras till 100 vid den första tillgängliga kursen inom det synliga datumintervallet. Berkshire Hathaway B (`BRK-B`) SHALL räknas om från USD till SEK med hämtad USD/SEK-kurs. Aktier utan användbar kursdata SHALL hoppas över utan att stoppa övriga diagrammet.

Diagrammets titel SHALL visa tidsstämpeln för den senast ändrade programfilen i appkatalogen i lokalt tidsformat `ÅÅÅÅ-MM-DD HH:MM`, så att den återspeglar senaste driftsättningen. Git-metadata, datakatalogen med `aktier.csv`, `aktiekop.csv` och `aktievy.json`, cachade kursdata och uppladdade filer SHALL inte påverka tidsstämpeln.

#### Scenario: Starta diagrammet

- **WHEN** appen har hämtat historiska kurser för aktierna
- **THEN** diagrammet visar deras indexutveckling i samma koordinatsystem
- **AND** synligt startdatum är som standard 2020-01-01
- **AND** slutdatumet är den senaste tillgängliga slutkursens datum utan framtida tomt intervall

#### Scenario: Visa aktuellt datum efter intradagsuppdatering

- **WHEN** en aktuell kurs hämtas för en aktie
- **THEN** diagrammets synliga slutdatum och nedre datumreglage utökas till dagens datum i svensk tidszon
- **AND** aktier som inte har uppdaterats får inga syntetiska datapunkter för de saknade datumen

#### Scenario: Visa aktuell kurs till och med dagens datum

- **WHEN** användaren hämtar en aktuell intradagskurs efter dagens slutkursdatum
- **THEN** diagrammets högra gräns och slutdatumfält utökas till intradagskursens datum

#### Scenario: Ändra synligt datumintervall

- **WHEN** användaren flyttar datumreglaget eller zoomar diagrammet
- **THEN** varje aktie indexeras om till 100 vid sin första tillgängliga kurs inom det nya synliga intervallet
- **AND** köp- och säljmarkeringarnas höjd räknas om mot samma indexbas
- **AND** y-axeln anpassas efter de synliga kurvorna

#### Scenario: Ange synliga datum direkt

- **WHEN** användaren anger start- och slutdatum i ISO-formatet `ÅÅÅÅ-MM-DD`
- **THEN** diagrammets synliga datumintervall och nedre datumreglage uppdateras till dessa datum
- **AND** varje aktie indexeras om vid det nya synliga startdatumet
- **WHEN** användaren i stället flyttar handtagen i datumreglaget
- **THEN** start- och slutdatumfälten uppdateras så att de motsvarar det synliga intervallet
- **AND** ogiltiga datum, datum utanför tillgänglig historik eller startdatum efter slutdatum accepteras inte

#### Scenario: Återanvänd senaste datumintervall

- **WHEN** användaren ändrar det synliga intervallet med datumfälten, datumreglaget eller zoomning
- **THEN** start- och slutdatum sparas i `aktievy.json`
- **WHEN** appen öppnas nästa gång
- **THEN** det sparade intervallet används och begränsas till tillgänglig kurshistorik

#### Scenario: Historik saknas för en aktie

- **WHEN** en ticker inte ger användbara kursdata
- **THEN** appen visar i webbläsaren att den aktien hoppas över
- **AND** övriga tillgängliga aktier visas normalt

#### Scenario: Hämta nya slutkurser utan omstart

- **WHEN** användaren klickar på knappen för senaste slutkurser
- **THEN** appen hämtar Yahoo Finance-data senare än den senast inlästa dagen
- **AND** kurser inkluderas först efter respektive börsstängning och en kort publiceringsmarginal
- **AND** nya kurser läggs till i diagrammet, rangeslidern och resultatberäkningen utan att sidan laddas om
- **WHEN** ingen senare slutkurs finns
- **THEN** appen meddelar att ingen ny slutkurs är tillgänglig

#### Scenario: Hämta aktuella intradagskurser

- **WHEN** användaren klickar på `Hämta aktuell kurs`
- **THEN** appen hämtar senaste tillgängliga intradagskurs från Yahoo Finance för aktierna
- **AND** diagram, legend och vinst/förlust-tabellen uppdateras med kurserna utan att sidan laddas om
- **AND** Berkshire-kursen räknas om till SEK

#### Scenario: Yahoo Finance kan inte nås

- **WHEN** servern inte får svar från Yahoo Finance
- **THEN** appen visar ett begripligt fel i webbläsaren
- **AND** redan inlästa kurser och sparade transaktioner påverkas inte

### Requirement: Konvertera mäklarens transaktionsexport

Appen SHALL kunna importera mäklarens UTF-16-kodade tabbseparerade transaktionsexport som användaren laddar upp i webbläsaren. Importen SHALL mappa kolumnen `Värdepapper` till appens ticker och omvandla köp, försäljningar och utdelningar till appens CSV-format. ISIN SHALL inte användas som ticker. Berkshire-kursen i källan SHALL omvandlas till SEK med exportens växlingskurs. Utdelningens kontantbelopp SHALL importeras som utdelning utan att påverka antal eller anskaffningsvärde; källskatt SHALL registreras som negativ utdelning. Exportens transaktions-ID SHALL sparas för idempotent återimport. Äldre importer utan transaktions-ID SHALL dedupliceras med datum, typ, ticker, antal, kurs och courtage.

Diagrammets transaktionslista SHALL ha knappen `Importera aktiehändelser` och ett filval bredvid den. En fil SHALL väljas innan importen kan startas; det finns ingen standardfil på servern. Importen SHALL först visa en förhandsgranskning med antal konverterbara transaktioner, dubbletter, nya rader och varningar, utan att ändra `aktiekop.csv`. Nya rader SHALL sparas först när användaren uttryckligen bekräftar importen, och då SHALL exakt de rader som förhandsgranskningen visade som nya sparas, med dubblettkontroll mot filens aktuella innehåll. Efter bekräftelsen SHALL nya diagrammarkeringar och beräkningar läggas till i den öppna vyn utan att sidan laddas om. Filer som inte är en giltig export eller är större än den angivna gränsen SHALL avvisas med ett begripligt fel. Listans rubrik SHALL vara `Transaktioner`. En knapp SHALL kunna dölja och visa utdelningsrader. Kolumnhuvudet `Aktie` SHALL växla mellan alfabetisk sortering A–Ö och listans ursprungliga sortering.

När källrader hoppas över SHALL importsvaret innehålla originalraderna, kolumnrubrikerna och orsaken per rad. Gränssnittet SHALL visa en knapp med antalet omappade rader som öppnar dem i en popup med horisontell och vertikal rullning vid behov.

#### Scenario: Förhandsgranska import

- **WHEN** användaren väljer en exportfil och klickar på `Importera aktiehändelser`
- **THEN** appen visar antal konverterbara transaktioner, dubbletter, nya rader och varningar
- **AND** `aktiekop.csv` ändras inte

#### Scenario: Tillämpa import

- **WHEN** användaren bekräftar en förhandsgranskad import
- **THEN** nya transaktioner läggs till i `aktiekop.csv`
- **AND** redan importerade dubbletter hoppas över, även om de har sparats efter förhandsgranskningen
- **AND** okända värdepapper eller ogiltiga rader rapporteras som varningar och hoppas över
- **AND** nya markeringar och resultat visas utan att sidan laddas om

#### Scenario: Avbryt import

- **WHEN** användaren avbryter efter förhandsgranskningen
- **THEN** `aktiekop.csv` lämnas oförändrad

#### Scenario: Import utan vald fil eller med ogiltig fil

- **WHEN** användaren startar importen utan att ha valt en fil, eller väljer en fil som inte är en giltig export eller är för stor
- **THEN** appen visar ett fel och ingen förhandsgranskning eller sparning sker

#### Scenario: Granska rader som inte kunde importeras

- **WHEN** importen hoppar över källrader
- **THEN** knappen för omappade rader visar antalet och öppnar en popup med originalraderna och orsaken
- **AND** popupen kan rullas horisontellt och vertikalt när innehållet inte ryms

## REMOVED Requirements

### Requirement: Lokal körning

**Reason**: Appen körs inte längre som ett lokalt Python-program med loopback-server, automatisk webbläsaröppning, statisk kopia `aktier_graf.html` och stopp med Ctrl+C. Det finns ingen Python och ingen långlivad process på webbhotellet.

**Migration**: Ersätts av kraven `Drift på webbhotell`, `Inloggning` och `Skyddade datafiler`. Appen nås via webbhotellets adress efter inloggning. Befintliga `aktier.csv`, `aktiekop.csv` och `aktievy.json` kopieras oförändrade till den skyddade datakatalogen.
