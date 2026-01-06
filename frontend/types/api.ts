export interface ApiError {
  detail: string;
  status?: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version?: string;
}

export interface DbHealthResponse extends HealthCheckResponse {
  database: string;
  pool_size?: number;
}
