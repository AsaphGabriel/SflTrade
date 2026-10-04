1. **Chart Math Alignment:**
   - In `historyService.ts`, `fetchMarketMovers` & `fetchNftMarketMovers`:
     For 24h: Chart uses `gte(targetTime)`. Movers uses `abs(diff)` to find closest. Let's make Movers find the first point `timestamp >= windowStart`.
     For 7D/30D/90D: Chart uses `gte(targetDay)`. Movers uses `<= targetDay`. Change Movers to `r.day >= targetDay` and pick `[0]`.

2. **Chart Layout & SVG Dots:**
   - `PriceChartModal.tsx`: Change `<div className="flex bg-slate-800 p-1 rounded-xl w-full sm:w-auto">` to `<div className="grid grid-cols-4 bg-slate-800 p-1 rounded-xl w-full gap-1">` or `flex w-full justify-between`. Make buttons `flex-1`.
   - `PriceChartSVG.tsx`: Increase height from `h-52` to `h-64` or `h-72`. Increase point hit area using a `<g>` with a transparent `<circle r="16">` and visual `<circle r="4">`.

3. **NFT ID Collisions (The "Completely Wrong" prices):**
   - SFL API wearables and collectibles have colliding IDs (e.g., ID 404 is both Cowgirl Skirt and Scarecrow).
   - `api.ts`: Stop relying on `byId` exclusively. Ensure `byName` is perfect.
   - `historyService.ts`: Change `fetchNftMarketMovers` to SELECT `name, floor_sfl` instead of just `nft_id`. Group by `name` instead of `nft_id`.
   - `fetchNftHistory`: `.eq('name', nftName)` should be the primary filter!
