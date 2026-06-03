/** Unwrap list payload from a typical API success response. */
export const listData = (res) => res?.data?.data ?? [];

/** Unwrap paginated list + meta from API response. */
export const paginatedData = (res) => ({
  rows: res?.data?.data ?? [],
  pagination: res?.data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 },
});
