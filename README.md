# Shopify Automation for Order and Customer Evaluation

## Verified checkout — November 25, 2026

The storefront-to-COD-confirmation flow has passed in visible Chrome with Cypress page-source rewriting disabled (`modifyObstructiveCode: false`). Individual confirmation screenshots and an optional checkout video provide evidence. A 101-customer batch is resumable; consult your local `reports/<RUN_ID>/orders.json` for its current progress rather than assuming all slots completed.

Earlier runs with default instrumentation did not initialize checkout payment controls. An Electron comparison received HTTP 429. Stop on rate-limit responses instead of repeatedly retrying or bypassing Shopify limits.

Customer names are unique. Review the exact 101 customers in `cypress/fixtures/customers.json`. The script consumes this file directly.

Creates up to 101 new orders through the actual storefront UI, using Cash on Delivery and only `omar+user1@teamento.com` through `omar+user101@teamento.com`. Each order opts into email marketing and uses fictional German QA customer details. No cards or real payment credentials are used. No fulfillment is performed.

## Run

```sh
npm install --cache .cache/npm
npm run dry-run
ORDER_COUNT=1 npm run orders
npm run orders
```

The default is visible Chrome, matching the verified configuration. To record one checkout: `RECORD_VIDEO=true START_INDEX=3 ORDER_COUNT=1 npm run orders`. Use an unconfirmed slot: confirmed slots are skipped. Videos remain local under `reports/<RUN_ID>/videos/` and are not committed.

The default run is **101 order slots**, not the store's existing total. Confirmed slots are skipped when resuming the same RUN_ID. The first single-order verification is included in those 101 slots.

`RUN_ID=omar-20261125` is the default batch. Keep it unchanged to resume. Change it only to intentionally create an entirely new batch. `START_INDEX` and `ORDER_COUNT` can select a subset within user1–user101. Optional storefront password: `CYPRESS_storefrontPassword`, supplied in the process environment for the run only. Do not commit credentials.

Orders and confirmation URLs are recorded in `reports/<RUN_ID>/orders.json`; screenshots are saved alongside. These reports are private local artifacts, excluded from Git. A `submitting` record is intentionally blocked from resubmission: check Shopify using its exact email and resolve the record before resuming. Cypress retries are disabled, and the batch stops after the first failure. Submissions are spaced at least 15 seconds apart.

The suite follows home page New Balance 574 quick-add → Add to cart → Cart → Check out → unique subscribed email → German address → COD → Pay now → confirmation. It requires available stock, enabled German shipping and COD. It does not bypass CAPTCHA or checkout restrictions. If Shopify shows a development-store order cap, stop and resolve it rather than retrying the submission.

Shopify test gateway orders and manual COD orders can behave differently in Shopify customer purchase segments; COD is intentional for this task.
