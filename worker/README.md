# DEFY backend (Cloudflare Worker)

Optional. The game works without it: no percentile, no live counter, and the local habit model makes every prediction. With it, BehaviorGPT joins the prediction and the site shows how you rank against other players.

The Worker holds the BehaviorGPT key so the browser never sees it. It stores only an anonymous score histogram and run ids in KV. It never stores an IP address.

## Deploy (Wilson)

Run these from the `worker/` folder unless noted.

1. Log in to Cloudflare.

```
npx wrangler login
```

2. Create the KV namespace, then paste the printed id into `wrangler.toml` in place of `REPLACE_WITH_KV_ID`.

```
npx wrangler kv namespace create DEFY_KV
```

3. Store the BehaviorGPT key as a secret. Wrangler asks you to paste it, so it never lands in a file or your shell history.

```
npx wrangler secret put UNBOXAI_API_KEY
```

4. Upload the 96-item catalog and note the catalog id it prints. Run this from the repo root. `read -s` takes the key without echoing it or saving it to your shell history.

```
pip install behaviorgpt "numpy>=2"   # pyarrow needs NumPy 2; an older conda numpy breaks the upload
read -s UNBOXAI_API_KEY && export UNBOXAI_API_KEY
python3 scripts/upload_catalog.py
```

5. Put that id into `wrangler.toml` in place of `REPLACE_WITH_CATALOG_ID` (`UNBOX_CATALOG_ID`).

6. Deploy. Wrangler prints the Worker URL.

```
npx wrangler deploy
```

7. Point the site at the Worker and redeploy it. The Pages workflow (`.github/workflows/pages.yml`) reads the `VITE_API_BASE` repo variable at build time.

```
gh variable set VITE_API_BASE --repo wilsonwu-ai/sundai-hack-148 --body https://defy-api.<your-subdomain>.workers.dev
gh workflow run pages.yml --repo wilsonwu-ai/sundai-hack-148
```

## Local try-out

```
npx wrangler dev
```

Then run the site with `VITE_API_BASE=http://localhost:8787 npm run dev`. Origins on `http://localhost:<port>` and `http://127.0.0.1:<port>` are allowed.

## Routes

| route | what it does |
|---|---|
| `POST /api/rank` | Validates the picks so far, asks BehaviorGPT to rank the 4 cards, returns `{ scores, engine, ms }`. Answers `502` or `503` with `{ fallback: true }` when it cannot, and the game then uses the habit model. |
| `POST /api/result` | Records one finished run once per `runId` (kept 7 days) and updates the histogram. |
| `GET /api/stats` | Returns `{ n, histogram, mean }`, cached for 30 seconds. |

## Settings

| name | where | note |
|---|---|---|
| `UNBOXAI_API_KEY` | secret | BehaviorGPT key. Without it `/api/rank` answers `503`. |
| `UNBOX_CATALOG_ID` | `wrangler.toml` | Catalog id from step 4. |
| `ALLOWED_ORIGIN` | `wrangler.toml` | The one site origin allowed to call the API. |
| `UPSTREAM_TIMEOUT_MS` | optional var | Upstream wait in milliseconds. Default 1500. |

## Known limits

- The per-IP limit (60 rank calls a minute) lives in each Worker instance's memory, so it is best effort.
- The histogram is a read, change, write on one KV key. Two results landing at the same instant can lose one count. That is fine for a toy leaderboard.
