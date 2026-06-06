export const databaseUrl = process.env.DATABASE_URL;

export {
  createListingsRepository,
  type CreateListingInput,
  type Queryable,
  type UpdateListingExtractionInput
} from "./listingsRepository.ts";

export function requireDatabaseUrl(): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}
