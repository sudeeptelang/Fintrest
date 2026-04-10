# Fintrest.ai — Database Schema

## users
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
email         TEXT UNIQUE NOT NULL
name          TEXT
plan          TEXT DEFAULT 'free'        -- free | starter | pro | elite
plan_expires  TIMESTAMPTZ
risk_profile  TEXT DEFAULT 'moderate'    -- conservative | moderate | aggressive
created_at    TIMESTAMPTZ DEFAULT NOW()
```

## signals
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
ticker          TEXT NOT NULL
company_name    TEXT
signal_type     TEXT NOT NULL            -- buy | watch | avoid
confidence      INT NOT NULL             -- 0-100
entry_price     DECIMAL(10,2)
target_price    DECIMAL(10,2)
stop_price      DECIMAL(10,2)
timeframe       TEXT                     -- intraday | swing | weekly
sector          TEXT
score_momentum        INT               -- 0-100, weight 25%
score_rel_volume      INT               -- 0-100, weight 15%
score_news            INT               -- 0-100, weight 15%
score_fundamentals    INT               -- 0-100, weight 15%
score_sentiment       INT               -- 0-100, weight 10%
score_trend           INT               -- 0-100, weight 10%
score_risk            INT               -- 0-100, weight 10%
athena_explanation    TEXT
risk_warning          TEXT
generated_at    TIMESTAMPTZ DEFAULT NOW()
expires_at      TIMESTAMPTZ
```

## holdings
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID REFERENCES users(id) ON DELETE CASCADE
ticker        TEXT NOT NULL
shares        DECIMAL(12,4) NOT NULL
avg_cost      DECIMAL(10,2) NOT NULL
purchase_date DATE
notes         TEXT
created_at    TIMESTAMPTZ DEFAULT NOW()
```

## watchlist
```sql
id        UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id   UUID REFERENCES users(id) ON DELETE CASCADE
ticker    TEXT NOT NULL
list_name TEXT DEFAULT 'My Core'
added_at  TIMESTAMPTZ DEFAULT NOW()
UNIQUE(user_id, ticker)
```

## alerts
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID REFERENCES users(id) ON DELETE CASCADE
ticker        TEXT NOT NULL
alert_type    TEXT NOT NULL    -- price | stop_loss | target | volume
trigger_value DECIMAL(10,2)
delivery      TEXT[]           -- ['email', 'push', 'sms']
status        TEXT DEFAULT 'active'   -- active | triggered | dismissed
triggered_at  TIMESTAMPTZ
created_at    TIMESTAMPTZ DEFAULT NOW()
```

## chat_sessions
```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id     UUID REFERENCES users(id) ON DELETE CASCADE
messages    JSONB NOT NULL DEFAULT '[]'
created_at  TIMESTAMPTZ DEFAULT NOW()
updated_at  TIMESTAMPTZ DEFAULT NOW()
```

## signal_views
```sql
id         UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id    UUID REFERENCES users(id)
signal_id  UUID REFERENCES signals(id)
viewed_at  TIMESTAMPTZ DEFAULT NOW()
```
