import { INotionParams, LoadPageChunkData, CollectionData, NotionUserType, NotionSearchParamsType, NotionSearchResultsType, CollectionType, RowType, RowContentType } from "./types";
import { getNotionValue } from "./utils";

const NOTION_API = "https://www.notion.so/api/v3";

const loadPageChunkBody = {
  limit: 100,
  cursor: { stack: [] },
  chunkNumber: 0,
  verticalColumns: false,
};

const fetchNotionData = async <T extends any>({
  resource,
  body,
  notionToken,
}: INotionParams): Promise<T> => {
  const res = await fetch(`${NOTION_API}/${resource}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(notionToken && { cookie: `token_v2=${notionToken}` }),
    },
    body: JSON.stringify(body),
  });

  return res.json();
};

export const fetchPageById = async (pageId: string, notionToken?: string) => {
  const res = await fetchNotionData<LoadPageChunkData>({
    resource: "loadPageChunk",
    body: {
      pageId,
      ...loadPageChunkBody,
    },
    notionToken,
  });

  return res;
};

const queryCollectionBody = {
  loader: {
    type: "reducer",
    reducers: {
      collection_group_results: {
        type: "results",
        limit: 999,
        loadContentCover: true,
      },
      "table:uncategorized:title:count": {
        type: "aggregation",
        aggregation: {
          property: "title",
          aggregator: "count",
        },
      },
    },
    searchQuery: "",
    userTimeZone: "Europe/Vienna",
  },
};

export const fetchTableData = async (
  collectionId: string,
  collectionViewId: string,
  notionToken?: string
) => {
  const table = await fetchNotionData<CollectionData>({
    resource: "queryCollection",
    body: {
      collection: {
        id: collectionId,
      },
      collectionView: {
        id: collectionViewId,
      },
      ...queryCollectionBody,
    },
    notionToken,
  });

  return table;
};

export const fetchNotionUsers = async (
  userIds: string[],
  notionToken?: string
) => {
  const users = await fetchNotionData<{ results: NotionUserType[] }>({
    resource: "getRecordValues",
    body: {
      requests: userIds.map(id => ({ id, table: "notion_user" })),
    },
    notionToken,
  });
  if (users && users.results) {
    return users.results.map((u) => {
      const user = {
        id: u.value.id,
        firstName: u.value.given_name,
        lastLame: u.value.family_name,
        fullName: u.value.full_name ?? [u.value.given_name, u.value.family_name].join(' '),
        profilePhoto: u.value.profile_photo,
      };
      return user;
    });
  }
  return [];
};

export const fetchBlocks = async (
  blockList: string[],
  notionToken?: string
) => {
  return await fetchNotionData<LoadPageChunkData>({
    resource: "syncRecordValues",
    body: {
      requests: blockList.map((id) => ({
        id,
        table: "block",
        version: -1,
      })),
    },
    notionToken,
  });
};

export const fetchNotionSearch = async (
  params: NotionSearchParamsType,
  notionToken?: string
) => {
  // TODO: support other types of searches
  return fetchNotionData<{ results: NotionSearchResultsType }>({
    resource: "search",
    body: {
      type: "BlocksInAncestor",
      source: "quick_find_public",
      ancestorId: params.ancestorId,
      filters: {
        isDeletedOnly: false,
        excludeTemplates: true,
        isNavigableOnly: true,
        requireEditPermissions: false,
        ancestors: [],
        createdBy: [],
        editedBy: [],
        lastEditedTime: {},
        createdTime: {},
        ...params.filters,
      },
      sort: params.sort || "Relevance",
      limit: params.limit || 20,
      query: params.query,
    },
    notionToken,
  });
};

export async function getTableData(
  collection: CollectionType,
  collectionViewId: string,
  notionToken?: string,
  raw?: boolean
): Promise<any> {
  const table = await fetchTableData(
    collection.value.id,
    collectionViewId,
    notionToken
  );
  const collectionRows = collection.value.schema;
  const collectionColKeys = Object.keys(collectionRows);
  const tableArr: RowType[] = table.result.reducerResults.collection_group_results.blockIds.map(
    (id: string) => table.recordMap.block[id]
  );
  const tableData = tableArr.filter(
    b => b?.value && b?.value?.properties && (b?.value?.parent_id === collection?.value?.id)
  );
  type Row = { id: string;[key: string]: RowContentType };
  let rows: Row[] = [];

  for (const td of tableData) {
    let row: Row = { id: td.value.id };
    for (const key of collectionColKeys) {
      const val = td.value.properties[key];
      if (val) {
        const schema = collectionRows[key];
        row[schema.name] = raw ? val : getNotionValue(val, schema.type, td);
        if (schema.type === "person" && row[schema.name]) {
          const users = await fetchNotionUsers(row[schema.name] as string[]);
          row[schema.name] = users as any;
        }
      }
    }
    rows = [...rows, row];
  }

  return {
    rows,
    schema: collectionRows
  };
};
