import {
  ThrowableRouter as Router,
  json,
  error,
  withParams
} from "itty-router-extras";

import type {
  Request as TRequest,
} from "itty-router";

import type {
  BlockType,
  CollectionType,
  HandlerRequest,
} from "./types";

import {
  parsePageId,
  getCacheKey,
  createResponse,
} from "./utils";

import {
  fetchPageById,
  fetchBlocks,
  fetchNotionSearch,
  fetchNotionUsers,
  getTableData
} from "./notion";

const NOTION_API_TOKEN =
  typeof NOTION_TOKEN !== "undefined" ? NOTION_TOKEN : undefined;

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
interface RequestT extends TRequest {
  method: Method | string
  url: string
  optional?: any
}

type Request = RequestT & CfRequestInit;

const handleRequest = async (event: FetchEvent): Promise<Response> => {
  const request = event.request as Request;
  const headers = request.headers as Headers;
  const { pathname, searchParams } = new URL(request.url);
  const notionToken =
    NOTION_API_TOKEN ||
    (headers.get("Authorization") || "").split("Bearer ")[1] ||
    undefined;

  const cacheKey = getCacheKey(request as globalThis.Request);
  let response: Response;
  let cache: Cache = (caches as any).default;
  cache = cache || await caches.open('notion-api');
  try {
    response = await cache.match(cacheKey);
  } catch {
    response = await router.handle(request, notionToken);
    event.waitUntil(cache.put(request as RequestInfo, response as Response))
  }
  return response;
}

// export default {
//   fetch: router.handle // yep, it's this easy.
// }

const router: Router = Router<Request, Method>()
const version = 1;

type Env = unknown;

// begin routes
router.options("*", () => new Response(null, {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  }
}));

// /v1/page/:pageId
router.get(`/v${version}/page/:pageId`, withParams, async (req: HandlerRequest, env: Env, ctx: ExecutionContext) => {
  const pageId = parsePageId((req.params as any).pageId);
  const page = await fetchPageById(pageId!, req.notionToken);

  const baseBlocks = page.recordMap.block;

  let allBlocks: { [id: string]: BlockType & { collection?: any } } = {
    ...baseBlocks,
  };
  let allBlockKeys: any[];

  while (true) {
    allBlockKeys = Object.keys(allBlocks);

    const pendingBlocks = allBlockKeys.flatMap((blockId) => {
      const block = allBlocks[blockId];
      const content = block.value && block.value.content;

      if (!content || (block.value.type === "page" && blockId !== pageId!)) {
        // skips pages other than the requested page
        return [];
      }

      return content.filter((id: string) => !allBlocks[id]);
    });

    if (!pendingBlocks.length) {
      break;
    }

    const newBlocks = await fetchBlocks(pendingBlocks, req.notionToken).then(
      (res) => res.recordMap.block
    );

    allBlocks = { ...allBlocks, ...newBlocks };
  }

  const collection = page.recordMap.collection
    ? page.recordMap.collection[Object.keys(page.recordMap.collection)[0]]
    : null;

  const collectionView = page.recordMap.collection_view
    ? page.recordMap.collection_view[
    Object.keys(page.recordMap.collection_view)[0]
    ]
    : null;

  if (collection && collectionView) {
    const pendingCollections = allBlockKeys.flatMap((blockId) => {
      const block = allBlocks[blockId];

      return (block.value && block.value.type === "collection_view") ? [block.value.id] : [];
    });

    for (let b of pendingCollections) {
      const collPage = await fetchPageById(b!, req.notionToken);

      const coll = Object.keys(collPage.recordMap.collection).map(
        (k) => collPage.recordMap.collection[k]
      )[0];

      const collView: {
        value: { id: CollectionType["value"]["id"] };
      } = Object.keys(collPage.recordMap.collection_view).map(
        (k) => collPage.recordMap.collection_view[k]
      )[0];

      const { rows, schema } = await getTableData(
        coll,
        collView.value.id,
        req.notionToken,
        true
      );

      const viewIds = (allBlocks[b] as any).value.view_ids as string[];

      allBlocks[b] = {
        ...allBlocks[b],
        collection: {
          title: coll.value.name,
          schema,
          types: viewIds.map((id) => {
            const col = collPage.recordMap.collection_view[id];
            return col ? col.value : undefined;
          }),
          data: rows,
        },
      };
    }
  }

  return json(allBlocks);
});

// /v1/table/:pageId
router.get(`/v${version}/table/:pageId`, withParams, async (req: HandlerRequest, env: Env, ctx: ExecutionContext) => {
  const pageId = parsePageId((req.params as any).pageId);
  const page = await fetchPageById(pageId!, req.notionToken);

  if (!page.recordMap.collection)
    return createResponse(
      JSON.stringify({ error: "No table found on Notion page: " + pageId }),
      {},
      401
    );

  const collection = Object.keys(page.recordMap.collection).map(
    (k) => page.recordMap.collection[k]
  )[0];

  const collectionView: {
    value: { id: CollectionType["value"]["id"] };
  } = Object.keys(page.recordMap.collection_view)
    .map(k => page.recordMap.collection_view[k])[0];

  const { rows } = await getTableData(
    collection,
    collectionView.value.id,
    req.notionToken
  );

  return createResponse(rows);
});

// /v1/user/:userId
router.get(`/v${version}/user/:userId`, withParams, async (req: HandlerRequest, env: Env, ctx: ExecutionContext) => {
  const users = await fetchNotionUsers([(req.params as any).userId], req.notionToken);
  return json(users[0], {});
});

// /v1/search
router.get(`/v${version}/search`, withParams, async (req: HandlerRequest, env: Env, ctx: ExecutionContext) => {
  const ancestorId = parsePageId(req.searchParams.get("ancestorId") || "");
  const query = req.searchParams.get("query") || "";
  const limit = Number(req.searchParams.get("limit") || 20);

  if (!ancestorId) {
    return createResponse(
      { error: 'missing required "ancestorId"' },
      { "Content-Type": "application/json" },
      400
    );
  }

  const results = await fetchNotionSearch(
    {
      ancestorId,
      query,
      limit,
    },
    req.notionToken
  );

  return createResponse(results);
});

router.get("*", async () =>
  error(404, {
    error: `Route not found!`,
    routes: [`/v${version}/page/:pageId`, `/v${version}/table/:pageId`, `/v${version}/user/:pageId`]
  })
);

// alternative advanced/manual approach for downstream control
export default {
  async fetch(...args: any[]) {
    return router.handle.apply(null, ...args)
      .then((response: Response) => response)
      .catch(console.error)
  }
}
