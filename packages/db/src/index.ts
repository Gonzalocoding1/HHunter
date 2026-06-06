export const databaseUrl = process.env.DATABASE_URL;

export function requireDatabaseUrl(): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
}
