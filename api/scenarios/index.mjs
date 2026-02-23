import { CosmosClient } from "@azure/cosmos";

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});
const container = client.database("cashflowdb").container("scenarios");

export default async function (context, req) {
  const userId = req.headers["x-ms-client-principal-id"];
  if (!userId) {
    context.res = { status: 401, body: { error: "Not authenticated" } };
    return;
  }

  const method = req.method.toUpperCase();

  try {
    if (method === "GET") {
      const { resources } = await container.items
        .query({
          query: "SELECT * FROM c WHERE c.userId = @uid",
          parameters: [{ name: "@uid", value: userId }],
        })
        .fetchAll();
      context.res = { status: 200, body: resources };

    } else if (method === "POST") {
      const body = req.body;
      if (!body || !body.scenarios) {
        context.res = { status: 400, body: { error: "Missing scenarios" } };
        return;
      }
      const doc = {
        id: userId,
        userId: userId,
        scenarios: body.scenarios,
        updatedAt: new Date().toISOString(),
      };
      await container.items.upsert(doc);
      context.res = { status: 200, body: { ok: true } };

    } else if (method === "DELETE") {
      try {
        await container.item(userId, userId).delete();
      } catch (e) {
        if (e.code !== 404) throw e;
      }
      context.res = { status: 200, body: { ok: true } };
    }
  } catch (err) {
    context.res = { status: 500, body: { error: err.message } };
  }
}
