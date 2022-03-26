/// <reference types="@cloudflare/workers-types" />
/// <reference types="itty-router" />
/// <reference types="itty-router-extras" />

import type {
  Route as RouteType,
} from "itty-router"


export type Obj<V extends string = any> = Record<string, V>;

export type RequestQuery = URLSearchParams;
export type RequestQueryInit = URLSearchParamsInit;
export type RequestParams = Obj<any>;
export type RequestParamsInit = URLSearchParamsInit | Obj<any>;

export type MethodType = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

interface RequestType extends CfRequestInit {
  method: MethodType | string
  url: string
  optional?: any
}

export interface Request extends RequestType {}
export interface HandlerRequest {
  params: RequestParams | RequestParamsInit | Obj<any>;
  searchParams: URLSearchParams;
  request: Request;
  notionToken?: string;
}
export interface RequestHandler extends HandlerRequest {}
export interface CacheOptions {
  /**
   * Consider the request method a GET regardless of its actual value.
   */
  ignoreMethod?: boolean;
}

export interface Caches {
  default: {
    /**
     * Adds to the cache a response keyed to the given request.
     * Returns a promise that resolves to undefined once the cache stores the response.
     */
    put(request: Request | string, response: Response): Promise<undefined>;
    /**
     * Returns a promise wrapping the response object keyed to that request.
     */
    match(
      request: Request | string,
      options?: CacheOptions
    ): Promise<Response | undefined>;
    /**
     * Deletes the Response object from the cache and
     * returns a Promise for a Boolean response
     */
    delete(request: Request | string, options?: CacheOptions): Promise<boolean>;
  };
}

export interface Methods {
  get: RouteType
  post: RouteType
  puppy: RouteType
}

export type BoldFormatType = ["b"];
export type ItalicFormatType = ["i"];
export type StrikeFormatType = ["s"];
export type CodeFormatType = ["c"];
export type LinkFormatType = ["a", string];
export type DateFormatType = [
  "d",
  {
    type: "date";
    start_date: string;
    date_format: string;
  }
];
export type UserFormatType = ["u", string];
export type PageFormatType = ["p", string];
export type SubDecorationType =
  | BoldFormatType
  | ItalicFormatType
  | StrikeFormatType
  | CodeFormatType
  | LinkFormatType
  | DateFormatType
  | UserFormatType
  | PageFormatType;
export type BaseDecorationType = [string];
export type AdditionalDecorationType = [string, SubDecorationType[]];
export type DecorationType = BaseDecorationType | AdditionalDecorationType;

export type ColumnType =
  | "select"
  | "text"
  | "date"
  | "person"
  | "checkbox"
  | "title"
  | "multi_select"
  | "number"
  | "relation"
  | "file"
  | "email"
  | "phone_number"
  | "url"
  | "formula";

export type ColumnSchemaType = {
  name: string;
  type: ColumnType;
};

export type UserType = { id: string; full_name: string };

export type RowContentType =
  | string
  | boolean
  | number
  | string[]
  | { title: string; id: string }
  | UserType[]
  | DecorationType[]
  | { name: string; url: string }[];

export interface BaseValueType {
  id: string;
  type: string;
  version: number;
  created_time: number;
  last_edited_time: number;
  parent_id: string;
  parent_table: string;
  alive: boolean;
  created_by_table: string;
  created_by_id: string;
  last_edited_by_table: string;
  last_edited_by_id: string;
  content?: Array<string>;
}

export interface CollectionType {
  value: {
    id: string;
    version: number;
    name: Array<string[]>;
    schema: Record<string, ColumnSchemaType>;
    icon: string;
    parent_id: string;
    parent_table: string;
    alive: boolean;
    copied_from: string;
  };
}

export interface RowType {
  value: {
    id: string;
    parent_id: string;
    properties: Record<string, DecorationType[]>;
  };
}

export type JSONData =
  | null
  | boolean
  | number
  | string
  | JSONData[]
  | { [prop: string]: JSONData };

export type BlockMapType = Record<string, BlockType>;

export interface NotionUserType {
  role: string;
  value: {
    id: string;
    version: number;
    email: string;
    given_name: string;
    full_name?: string;
    family_name: string;
    profile_photo: string;
    onboarding_completed: boolean;
    mobile_onboarding_completed: boolean;
  };
}
export interface BlockType {
  role: string;
  value: BaseValueType;
}

export interface RecordMapType {
  block: BlockMapType;
  notion_user: Record<string, NotionUserType>;
  collection: Record<string, CollectionType>;
  collection_view: {
    [key: string]: {
      value: {
        id: string;
        type: CollectionViewType;
      };
    };
  };
}

export interface LoadPageChunkData {
  recordMap: RecordMapType;
  cursor: {
    stack: any[];
  };
}

export type CollectionViewType = "table" | "gallery";

export interface CollectionData {
  recordMap: {
    block: Record<string, RowType>;
    collection_view: {
      [key: string]: {
        value: { type: CollectionViewType };
      };
    };
  };
  result: {
    reducerResults: {
      collection_group_results: { blockIds: string[] };
    };
  };
}

export interface NotionSearchFiltersType {
  isDeletedOnly: boolean;
  excludeTemplates: boolean;
  isNavigableOnly: boolean;
  requireEditPermissions: boolean;
  ancestors?: string[];
  createdBy?: string[];
  editedBy?: string[],
  lastEditedTime?: Record<any, any>,
  createdTime: Record<any, any>
}
export interface NotionSearchParamsType {
  ancestorId: string;
  query: string;
  sort?: string;
  filters?: NotionSearchFiltersType;
  limit?: number;
}

export interface NotionSearchResultType {
  id: string;
  isNavigable: boolean;
  score: number;
  highlight: {
    pathText: string;
    text: string;
  };
}

export interface NotionSearchResultsType {
  recordMap: {
    block: Record<string, RowType>;
  };
  results: NotionSearchResultType[];
  total: number;
}

export interface INotionParams {
  resource: string;
  body: JSONData;
  notionToken?: string;
}


declare let caches: Caches;
declare global {
  const NOTION_TOKEN: string | undefined;
}
