import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApi } from "./server.ts";

test("POST /listings stores a manually submitted immobilie1 URL", async () => {
  const app = buildApi();

  const createResponse = await app.inject({
    method: "POST",
    url: "/listings",
    payload: {
      sourceUrl: "https://anbieter.immobilie1.de/immobilien/nordrhein-westfalen/wohnung/mieten"
    }
  });

  assert.equal(createResponse.statusCode, 201);

  const created = createResponse.json();
  assert.equal(created.sourceId, "immobilie1");
  assert.equal(created.sourceUrl, "https://anbieter.immobilie1.de/immobilien/nordrhein-westfalen/wohnung/mieten");
  assert.equal(created.title, "Manual listing from immobilie1");
  assert.equal(created.reviewStatus, "new");
  assert.equal(created.applicationStatus, "new");
  assert.ok(created.id);
  assert.ok(created.createdAt);
  assert.ok(created.updatedAt);

  const listResponse = await app.inject({
    method: "GET",
    url: "/listings"
  });

  assert.equal(listResponse.statusCode, 200);
  assert.deepEqual(listResponse.json(), [created]);
});

test("POST /listings rejects invalid URLs", async () => {
  const app = buildApi();

  const response = await app.inject({
    method: "POST",
    url: "/listings",
    payload: {
      sourceUrl: "not a url"
    }
  });

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.json(), {
    error: "sourceUrl must be a valid http or https URL"
  });
});
