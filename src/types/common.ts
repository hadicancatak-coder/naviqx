export type ID = string

export type ISODate = string

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type UnknownRecord = Record<string, unknown>
