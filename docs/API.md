# Fintrest.ai — API Endpoints

Base URL: `https://api.fintrest.ai/v1`

## Auth
```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
```

## Dashboard
```
GET    /dashboard                 # market status, top 3 signals, index data
```

## Signals
```
GET    /signals                   # list, params: type, sector, timeframe, limit
GET    /signals/{ticker}          # signal detail + score breakdown
GET    /signals/{ticker}/chart    # OHLCV data for chart
GET    /signals/{ticker}/explain  # Athena Agent A explanation
```

## Portfolio
```
GET    /portfolio                 # all holdings with live P&L
POST   /portfolio/holdings        # add holding
PUT    /portfolio/holdings/{id}   # update
DELETE /portfolio/holdings/{id}
GET    /portfolio/performance     # time-series P&L
GET    /portfolio/rebalance       # Athena Agent C rebalance suggestions
POST   /portfolio/import          # CSV upload
```

## Watchlist
```
GET    /watchlist
POST   /watchlist                 # add ticker
DELETE /watchlist/{ticker}
GET    /watchlist/insights        # Athena Agent E
```

## Alerts
```
GET    /alerts
POST   /alerts                    # create alert
PUT    /alerts/{id}
DELETE /alerts/{id}
GET    /alerts/triggered          # today's triggered alerts
```

## Chat (Athena)
```
POST   /athena/chat               # Agent D — streaming response
GET    /athena/sessions           # chat history
DELETE /athena/sessions/{id}
```

## Markets
```
GET    /markets/overview          # indices, VIX, Fear/Greed
GET    /markets/sectors           # sector performance
```

## Billing
```
GET    /billing/plans
POST   /billing/subscribe
POST   /billing/cancel
GET    /billing/usage             # Athena calls remaining
```

## Admin (internal)
```
POST   /admin/signals/generate    # trigger signal scan
GET    /admin/signals/queue       # pending signals
POST   /admin/alerts/dispatch     # send triggered alerts
```
