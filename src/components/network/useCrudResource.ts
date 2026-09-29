import useSWR, { mutate } from "swr";
import { fetcher } from "@/utils/fetcher";
import { toast } from "@/hooks/use-toast";

export type MutationResult = { ok: boolean; error?: string; message?: string };

/**
 * List + create/update/delete against one /api/network/* endpoint.
 * Mutations resolve to { ok, error } so forms can show server errors inline
 * (e.g. 409 duplicates); successes toast and revalidate every endpoint passed
 * in `alsoRevalidate` (mapping lists that join this table).
 */
export function useCrudResource<T>(endpoint: string, alsoRevalidate: string[] = []) {
  const swr = useSWR<T[]>(endpoint, fetcher, { revalidateOnFocus: false });

  async function send(method: "POST" | "PUT" | "DELETE", body: object): Promise<MutationResult> {
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: MutationResult = await res.json().catch(() => ({
        ok: false,
        error: `Request failed (${res.status})`,
      }));
      if (!res.ok || !data.ok) {
        return { ok: false, error: data.error || `Request failed (${res.status})` };
      }
      toast({ variant: "success", description: data.message || "Saved" });
      await swr.mutate();
      alsoRevalidate.forEach((key) => mutate(key));
      return data;
    } catch {
      return { ok: false, error: "Network error — please try again" };
    }
  }

  return {
    rows: swr.data ?? [],
    isLoading: swr.isLoading,
    error: swr.error as Error | undefined,
    create: (body: Record<string, unknown>) => send("POST", body),
    update: (body: Record<string, unknown> & { id: string }) => send("PUT", body),
    remove: async (id: string) => {
      const result = await send("DELETE", { id });
      if (!result.ok) toast({ variant: "destructive", description: result.error });
      return result;
    },
  };
}
