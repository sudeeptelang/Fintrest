# Fintrest.ai — Mobile (Flutter)

## Stack
- **Flutter** / **Dart**
- Targets iOS and Android
- Shared API client with web backend

## Design Reference
See `docs/fintrest_screens_v2_final.html` for all 22 screen designs.
The mobile app implements the same screens shown in dark phone shells.

## Design Rules
- Match the Finxoom warm editorial aesthetic from the HTML mockups
- Background: `#f4f1eb` (warm parchment) — never pure white
- Primary accent: `#00b87c`
- Font: Satoshi for headings (weight 900), body (500/700); DM Mono for prices/tickers
- Athena AI output always in navy gradient cards
- Bottom nav: 5 tabs (Home, Signals, Athena, Portfolio, Alerts)
- Signal entry/target/stop always shown as a grouped unit
- Compliance footer on every signal screen

## API
All data comes from the C# backend API. See `@docs/API.md` for endpoints.
Auth via Supabase JWT tokens.
