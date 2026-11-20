<?php
// Mappning från mäklarexportens kolumn Värdepapper till appens ticker.
// Texten måste matcha exakt; ISIN används avsiktligt inte.
return [
    'security_to_ticker' => [
        'ABB' => 'ABB.ST', 'Addtech' => 'ADDT-B.ST', 'Alfa Laval' => 'ALFA.ST',
        'Assa Abloy' => 'ASSA-B.ST', 'AstraZeneca' => 'AZN.ST', 'Atlas Copco' => 'ATCO-B.ST',
        'Boliden' => 'BOL.ST', 'Cibus Real Estate' => 'CIBUS.ST', 'Epiroc' => 'EPI-B.ST', 'EQT' => 'EQT.ST',
        'Ericsson' => 'ERIC-B.ST', 'Essity' => 'ESSITY-B.ST', 'Evolution' => 'EVO.ST',
        'H&M' => 'HM-B.ST', 'Hexagon' => 'HEXA-B.ST', 'Industrivärden' => 'INDU-C.ST',
        'Industrivärden C' => 'INDU-C.ST', 'Industrivärden A' => 'INDU-A.ST',
        'Investor' => 'INVE-B.ST', 'Lifco' => 'LIFCO-B.ST', 'NIBE' => 'NIBE-B.ST',
        'Nordea' => 'NDA-SE.ST', 'Saab' => 'SAAB-B.ST', 'SAAB B' => 'SAAB-B.ST',
        'Sandvik' => 'SAND.ST', 'SEB' => 'SEB-A.ST', 'Skanska' => 'SKA-B.ST',
        'SKF' => 'SKF-B.ST', 'SCA' => 'SCA-B.ST', 'Handelsbanken' => 'SHB-A.ST',
        'Tele2 B' => 'TEL2-B.ST',
        'Swedbank' => 'SWED-A.ST', 'Tele2' => 'TEL2-B.ST', 'Telia' => 'TELIA.ST',
        'Volvo' => 'VOLV-B.ST', 'Volvo B' => 'VOLV-B.ST',
        'Berkshire Hathaway B' => 'BRK-B', 'Latour B' => 'LATO-B.ST',
        'Nasdaq' => 'NDAQ', 'Electrolux B' => 'ELUX-B.ST', 'Sirius XM' => 'SIRI',
        'Rheinmetall' => 'RHM.DE', 'Rivian Automotive A' => 'RIVN',
        'Alleima' => 'ALLEI.ST', 'Heba B' => 'HEBA-B.ST', 'Tesla' => 'TSLA', 'Volvo A' => 'VOLV-A.ST',
        // Fonder: Yahoo använder Morningstar-id (0P…) med .ST; kursen är fondens NAV en gång per dag.
        'Spiltan Räntefond Sverige' => '0P00009NT9.ST', 'Spiltan Högräntefond' => '0P00012F8Z.ST',
        'Aktiespararna Direktavkastning A' => '0P00018JII.ST', 'Aktiespararna Topp Sverige A' => '0P00000K10.ST',
        'AMF Aktiefond Global' => '0P00000L33.ST', 'AMF Aktiefond Tillväxtmarknader' => '0P0001ISQQ.ST',
        'AMF Balansfond' => '0P00000EXD.ST', 'AMF Räntefond Kort' => '0P00000T7U.ST',
        'AMF Räntefond Lång' => '0P00000K19.ST', 'AMF Räntefond Mix' => '0P0000V3HS.ST',
        'Carnegie Obligationsfond A' => '0P00000JZZ.ST',
        'Danske Invest Globala Realräntor SEK h' => '0P0000PWOM.ST',
        'Handelsbanken Global Index (A1 SEK)' => '0P0001F3XN.ST',
        'Handelsbanken Global Småb Index (A1 SEK)' => '0P0001C5YO.ST',
        'Länsförsäkringar Global Index' => '0P0000YVZ3.ST',
        'Nordnet Global Index' => '0P0001K6NH.ST', 'Nordnet One Balanserad SEK' => '0P0001P4AL.ST',
        'Nordnet One Försiktig SEK' => '0P0001P4AK.ST', 'Nordnet Sverige Index' => '0P0000J24W.ST',
        'Nordnet Teknologi Index' => '0P0001M5YO.ST', 'Nordnet USA Index' => '0P0001K6NL.ST',
        'SEB Global High Yield C H-SEK' => '0P0000JBG2.ST', 'SEB Sverige Indexnära A (SEK)' => '0P0000I3KB.ST',
        'Storebrand Sverige Plus A SEK' => '0P00018N0G.ST',
        'Swedbank Robur Access Asien A' => '0P00016L22.ST', 'Swedbank Robur Access Global A' => '0P00016L3S.ST',
        'Swedbank Robur Access Mix A' => '0P00000LDX.ST', 'Swedbank Robur Access Sverige A' => '0P00016KI8.ST',
        'Swedbank Robur Access USA A' => '0P00016L23.ST', 'Swedbank Robur Realränta A' => '0P00000NKF.ST',
        'Vontobel Commodity B USD' => '0P0000JSS5',
        // Hittade via ISIN: Öhman Obligationsfond heter nu Lannebo Obligationsfond (A, ackumulerande);
        // Nordea Realräntefond K är tillväxtklassen FI0008813449; UBS-ETF:en handlas på Xetra.
        'ÖHMAN OBLIGATIONSFOND' => '0P0001244U.ST',
        'Nordea Realräntefond K SEK' => '0P00000H58.ST',
        'UBS ETF (LU) Bloomberg MSCI US Liquid Corporates Sustainable UCITS ETF (hedged to EUR) A-acc' => 'UET0.DE',
    ],
    // Valuta som importerade belopp lagras i per ticker; övriga .ST-aktier är i SEK.
    'ticker_currency' => [
        'BRK-B' => 'SEK', // Berkshire-kursen i exporten räknas om till SEK.
        'NDAQ' => 'USD', 'SIRI' => 'USD', 'RIVN' => 'USD', 'RHM.DE' => 'EUR',
        'TSLA' => 'USD', '0P0000JSS5' => 'USD', 'UET0.DE' => 'EUR',
    ],
];
