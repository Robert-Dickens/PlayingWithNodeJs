# API usage examples

The API defaults to `http://localhost:3001`. Check process health at `/health` and open the interactive Swagger UI at `/api-docs`. REST routes are prefixed with `/api`.

Examples use `curl` and JSON. Replace `PRODUCT_ID` and `DETAIL_ID` with IDs returned by create requests.

## Health

```sh
curl http://localhost:3001/health
```

A successful response is HTTP 200 and contains `status`, `timestamp`, and `uptime`. It confirms the API process is serving requests; it does not probe its dependencies.

## Products

### List products

```sh
curl http://localhost:3001/api/products
```

Returns an array of products. Each product has `id`, `name`, `description`, `price`, `stock_quantity`, `created_at`, and `updated_at` fields.

### Create a product

```sh
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wireless Keyboard",
    "description": "Compact Bluetooth keyboard",
    "price": 79.99,
    "stock_quantity": 25
  }'
```

Success returns HTTP 201 with the created product, including its generated ID and timestamps. The route checks for `name` and `price`; include `stock_quantity` because the database insert uses that field. The API does not perform comprehensive input validation.

### Get a product

```sh
curl http://localhost:3001/api/products/PRODUCT_ID
```

Returns HTTP 200 with the product, or HTTP 404 with an error if it does not exist.

### Update a product

```sh
curl -X PUT http://localhost:3001/api/products/PRODUCT_ID \
  -H "Content-Type: application/json" \
  -d '{"price": 69.99, "stock_quantity": 30}'
```

Any provided product fields (`name`, `description`, `price`, `stock_quantity`) are updated. Success returns HTTP 200 and the updated product; a missing ID returns HTTP 404.

### Delete a product

```sh
curl -X DELETE http://localhost:3001/api/products/PRODUCT_ID
```

Returns HTTP 200 with a success message, or HTTP 404 if no product was deleted. Deleting a product cascades to its product-detail database row(s).

## Product details

Product details contain `product_id`, `sku`, optional `weight`, `dimensions`, `color`, and `material`, and timestamps.

### Create product details

```sh
curl -X POST http://localhost:3001/api/product-details \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "PRODUCT_ID",
    "sku": "KEYBOARD-001",
    "weight": 0.8,
    "dimensions": "30x12x2cm",
    "color": "Black",
    "material": "Aluminum"
  }'
```

Returns HTTP 201 with the created detail. The route requires `product_id` and `sku`; SKU values must be unique in the database.

### Get details for a product

```sh
curl http://localhost:3001/api/product-details/product/PRODUCT_ID
```

Returns HTTP 200 with a detail record or HTTP 404 if none is found.

### Update product details

```sh
curl -X PUT http://localhost:3001/api/product-details/DETAIL_ID \
  -H "Content-Type: application/json" \
  -d '{"color": "Silver", "weight": 0.75}'
```

Any provided detail fields (`sku`, `weight`, `dimensions`, `color`, `material`) are updated. Success returns HTTP 200; an unknown detail ID returns HTTP 404.

### Delete product details

```sh
curl -X DELETE http://localhost:3001/api/product-details/DETAIL_ID
```

Returns HTTP 200 with a success message or HTTP 404 if the detail does not exist.

## Socket.IO product updates

Connect a Socket.IO client to the API origin, then subscribe to the `products` room. For example, in a browser client using the installed `socket.io-client` package:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');
socket.emit('subscribe_products');
socket.on('subscribed', (message) => console.log(message));
socket.on('product:created', (product) => console.log('created', product));
socket.on('product:updated', (product) => console.log('updated', product));
socket.on('product:deleted', (event) => console.log('deleted', event));
```

The server acknowledges with `{ "channel": "products" }`. These broadcasts are for product create/update/delete; product-detail CRUD does not currently emit Socket.IO updates.

## Status and errors

- Create product/product details: HTTP 400 for the route's missing required fields; HTTP 201 on success.
- Get/update/delete by ID: HTTP 404 if the requested record does not exist; otherwise HTTP 200.
- An unknown route returns HTTP 404 with `{ "error": "Route not found" }`.
- Some route-level errors use `{ "error": "..." }`; errors passed through the central error handler use a nested error object. Responses are not yet normalized to one shape.

## Endpoint summary

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | API process health |
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get one product |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Update a product |
| DELETE | `/api/products/:id` | Delete a product |
| GET | `/api/product-details/product/:productId` | Get details for a product |
| POST | `/api/product-details` | Create product details |
| PUT | `/api/product-details/:id` | Update product details |
| DELETE | `/api/product-details/:id` | Delete product details |
