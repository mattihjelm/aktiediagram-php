## ADDED Requirements

### Requirement: Minutkurser för solo-vald aktie

När en aktie visas solo SHALL ett separat minutdiagram visas under huvuddiagrammet med rubriken `<aktiens namn> – minutkurser`. Minutdiagrammet SHALL visa aktiens verkliga kurs i aktiens handelsvaluta minut för minut för de senaste 30 dagarna som Yahoo Finance tillhandahåller, och valutan SHALL framgå av y-axeln och hovervärdet. Tider SHALL visas i svensk tid. Diagrammet SHALL öppnas med den senaste veckan synlig och ha knapparna `Vecka` och `Månad` som visar de senaste 7 respektive 30 dagarna; y-axeln SHALL anpassas till kurserna i det synliga intervallet. Tid utan handel, som nätter, helger och helgdagar, SHALL döljas på tidsaxeln så att handelsdagarna ligger intill varandra. Minutkurserna SHALL hämtas när solo väljs, och medan de hämtas SHALL en statustext visas. Om hämtningen misslyckas SHALL ett felmeddelande visas i minutdiagrammets ruta utan att huvuddiagrammet påverkas. När solo avmarkeras SHALL minutdiagrammet döljas, och när solo flyttas till en annan aktie SHALL minutdiagrammet visa den nya aktien. Minutkurser SHALL endast kunna hämtas för inloggad användare och för aktier i `aktier.csv`. Huvuddiagrammet, den logaritmiska skalan och `aktievy.json` SHALL inte påverkas av minutdiagrammet.

#### Scenario: Välj solo

- **WHEN** användaren markerar solo för en aktie
- **THEN** ett minutdiagram visas under huvuddiagrammet med aktiens minutkurser i aktiens valuta
- **AND** den senaste veckan är synlig och knappen `Vecka` är vald

#### Scenario: Zooma ut till en månad

- **WHEN** användaren klickar på `Månad`
- **THEN** minutdiagrammet visar de senaste 30 dagarna med minutkurser
- **AND** y-axeln anpassas till kurserna i hela intervallet
- **WHEN** användaren klickar på `Vecka`
- **THEN** minutdiagrammet visar åter de senaste 7 dagarna

#### Scenario: Tid utan handel döljs

- **WHEN** minutdiagrammet visar en period som innehåller nätter och en helg
- **THEN** tidsaxeln hoppar över tiden utan handel och kurvan har inga tomma partier för den tiden

#### Scenario: Byt eller avsluta solo

- **WHEN** användaren flyttar solo till en annan aktie
- **THEN** minutdiagrammet visar den nya aktiens minutkurser
- **WHEN** användaren avmarkerar solo
- **THEN** minutdiagrammet döljs och huvuddiagrammet är oförändrat

#### Scenario: Hämtningen misslyckas

- **WHEN** Yahoo Finance inte kan nås eller inte returnerar minutkurser för aktien
- **THEN** minutdiagrammets ruta visar ett felmeddelande
- **AND** huvuddiagrammet och solo-läget fungerar som vanligt

#### Scenario: Okänd aktie

- **WHEN** någon begär minutkurser för en symbol som inte finns i `aktier.csv`
- **THEN** begäran avvisas och ingen hämtning från Yahoo Finance görs
