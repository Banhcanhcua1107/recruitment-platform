import { toSlug } from "@/lib/slug";

export function companySlug(name: string): string {
  return toSlug(name?.trim() ?? "");
}
