// Shared helpers for bulk create/delete against the age-classifier proxy
// routes. Each entity only exposes single-item POST (upsert) and DELETE /:id
// endpoints upstream, so bulk operations are composed by fanning out one
// request per item and tallying the outcomes.

export type BulkResult = { ok: number; failed: number };

export async function bulkDelete(
  apiRoute: string,
  ids: string[]
): Promise<BulkResult> {
  const results = await Promise.allSettled(
    ids.map((id) =>
      fetch(`${apiRoute}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }).then((r) => {
        if (!r.ok) throw new Error(`Failed to delete ${id}`);
      })
    )
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  return { ok: results.length - failed, failed };
}

export async function bulkCreate<T>(
  apiRoute: string,
  items: T[]
): Promise<BulkResult> {
  const results = await Promise.allSettled(
    items.map((body) =>
      fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => {
        if (!r.ok) throw new Error("Failed to create");
      })
    )
  );
  const failed = results.filter((r) => r.status === "rejected").length;
  return { ok: results.length - failed, failed };
}
