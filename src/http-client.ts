import { ApiRequestError } from "./errors";

export interface ShelfSummary {
  publicId: string;
  name: string;
  status: string;
  template: string | null;
  pageCount: number | null;
  reviewMode: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ListShelvesResponse {
  data: ShelfSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateShelfInput {
  pdfBytes: Uint8Array;
  fileName: string;
  name?: string;
  template?: "book" | "legal-contract" | "academic-paper";
  review?: boolean;
}

export interface ShelvHttpClientConfig {
  apiKey: string;
  apiBaseUrl: string;
  fetchImplementation?: typeof fetch;
}

export class ShelvHttpClient {
  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(config: ShelvHttpClientConfig) {
    this.apiKey = config.apiKey;
    this.apiBaseUrl = config.apiBaseUrl.replace(/\/$/, "");
    this.fetchImplementation = config.fetchImplementation ?? fetch;
  }

  async listShelves(params?: {
    page?: number;
    limit?: number;
  }): Promise<ListShelvesResponse> {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));

    const path =
      search.size > 0 ? `/v1/shelves?${search.toString()}` : "/v1/shelves";

    return this.requestJson<ListShelvesResponse>("GET", path);
  }

  async createShelf(input: CreateShelfInput): Promise<ShelfSummary> {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([Buffer.from(input.pdfBytes)], { type: "application/pdf" }),
      input.fileName,
    );

    if (input.name) formData.append("name", input.name);
    if (input.template) formData.append("template", input.template);
    if (typeof input.review === "boolean") {
      formData.append("review", input.review ? "true" : "false");
    }

    return this.requestJson<ShelfSummary>("POST", "/v1/shelves", {
      body: formData,
    });
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    path: string,
    options?: { body?: BodyInit },
  ): Promise<T> {
    const response = await this.fetchImplementation(
      `${this.apiBaseUrl}${path}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: options?.body,
      },
    );

    if (!response.ok) {
      throw new ApiRequestError(
        method,
        path,
        response.status,
        await this.parseErrorBody(response),
      );
    }

    return (await response.json()) as T;
  }

  private async parseErrorBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch {
        return { message: "Failed to parse API error body" };
      }
    }

    try {
      return await response.text();
    } catch {
      return null;
    }
  }
}
