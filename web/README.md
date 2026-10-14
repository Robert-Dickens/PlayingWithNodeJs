# CommerceFlow web client

The web client is a React, TypeScript, Vite, and Tailwind CSS admin dashboard for the product catalog API. It uses a responsive sidebar, Flowbite-inspired tables and forms, and a toolbar notification center.

## Features

- Overview cards for product count, stock totals, and product-detail coverage
- Product create, edit, search, and delete screens backed by `/api/products`
- Product-detail create, edit, search, and delete screens backed by `/api/product-details`
- Live product create/update/delete notifications received over Socket.IO
- A notification drawer with unread tracking, mark-read and clear actions, and up to 100 entries persisted in browser local storage

Product-detail changes do not emit server push events; activity performed from this browser is shown locally. The detail screen uses the API's per-product lookup and currently displays one returned detail record per product.

## Local development

From this directory:

```sh
npm ci
npm run dev
```

Vite serves the client at <http://localhost:5173>. The API must be running for product data and live updates. Set `VITE_API_URL` to the API origin or its `/api` base path; by default, REST requests use `http://localhost:3001/api` and Socket.IO connects to `http://localhost:3001`.

## Checks and production build

```sh
npm run lint
npx tsc --noEmit --project tsconfig.json
npm run build
```

For the full-stack setup, see [the solution getting-started guide](../GETTING_STARTED.md).
