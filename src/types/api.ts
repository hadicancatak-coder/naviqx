export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
}
