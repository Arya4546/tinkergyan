/** Canonical API error codes from the system design document. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'COMPILE_ERROR'
  | 'COMPILE_TIMEOUT'
  | 'INTERNAL_ERROR';

/** Pagination metadata for list endpoints. */
export interface ApiListMeta {
  page: number;
  total: number;
  limit?: number;
}

/** Standard success envelope returned by the API. */
export interface ApiSuccessResponse<TData, TMeta = ApiListMeta> {
  success: true;
  data: TData;
  meta?: TMeta;
}

/** Standard error payload returned by the API. */
export interface ApiErrorBody<TDetails = unknown[]> {
  code: ApiErrorCode;
  message: string;
  details?: TDetails;
}

/** Standard error envelope returned by the API. */
export interface ApiErrorResponse<TDetails = unknown[]> {
  success: false;
  error: ApiErrorBody<TDetails>;
}

/** Standard union shape shared by all API calls. */
export type ApiResponse<TData, TMeta = ApiListMeta, TDetails = unknown[]> =
  | ApiSuccessResponse<TData, TMeta>
  | ApiErrorResponse<TDetails>;
