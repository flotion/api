import { json, error } from "itty-router-extras";
import { JSONData, DecorationType, ColumnType, RowType, RowContentType } from "./types";

export const createResponse = (
  body: JSONData | any,
  headers?: HeadersInit,
  statusCode?: number
) => json(body, {
  status: statusCode || 200,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    ...headers,
  },
});

export const idToUuid = (path: string) =>
  `${path.slice(0, 8)}-${path.slice(8, 12)}-${path.slice(12, 16)}-${path.slice(16, 20)}-${path.slice(20)}`;

export const parsePageId = (id: string) => {
  if (id) {
    const rawId = id.replace(/\-/g, "").slice(-32);
    return idToUuid(rawId);
  }
};

export const getNotionValue = (
  val: DecorationType[],
  type: ColumnType,
  row: RowType
): RowContentType => {
  switch (type) {
    case "text":
      return getTextContent(val);
    case "person":
      return (
        val.filter((v) => v.length > 1).map((v) => v[1]![0][1] as string) || []
      );
    case "checkbox":
      return val[0][0] === "Yes";
    case "date":
      if (val[0][1]![0][0] === "d") return new Date(val[0]![1]![0]![1]!.start_date).toJSON();
      else return "";
    case "title":
      return getTextContent(val);
    case "select":
    case "email":
    case "phone_number":
    case "url":
    case "formula":
      return val[0][0];
    case "multi_select":
      return val[0][0].split(",") as string[];
    case "number":
      return Number(val[0][0]);
    case "relation":
      return val
        .filter(([symbol]) => symbol === "‣")
        .map(([_, relation]) => relation![0][1] as string);
    case "file":
      return val
        .filter((v) => v.length > 1)
        .map((v) => {
          const rawUrl = v[1]![0][1] as string;

          const url = new URL(
            `https://www.notion.so${rawUrl.startsWith("/image")
              ? rawUrl
              : `/image/${encodeURIComponent(rawUrl)}`
            }`
          );

          url.searchParams.set("table", "block");
          url.searchParams.set("id", row.value.id);
          url.searchParams.set("cache", "v2");

          return { name: v[0] as string, url: url.toString(), rawUrl };
        });
    default:
      console.log({ val, type });
      return "Not supported";
  }
};

export const getTextContent = (text: DecorationType[]) => {
  return text.reduce((prev, current) => prev + current[0], "");
};

export function getCacheKey(request: Request & CfRequestInit): string | null {
  const headers = request.headers as Headers;
  const pragma = headers.get("pragma");
  const query = new URL(request.url).searchParams as URLSearchParams;
  if (pragma === "no-cache" || headers.has("no-cache") || query.has("no-cache")) {
    return null;
  }

  const cacheControl = headers.get("cache-control");
  if (cacheControl) {
    const directives = new Set(cacheControl.split(/[ \s]*[,][ \s]*/).map(s => s.trim()));
    if (directives.has("no-store") || directives.has("no-cache")) {
      return null;
    }
  }

  return new URL(request.url).href;
}

