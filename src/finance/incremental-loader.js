// Updates are append-only or versioned; Web rules prohibit deletions.
// Watermarks stay as Firestore Timestamps, preserving nanosecond precision.
export function incrementalLoader(names, fetchPage, maximum = 10000) {
  let cache = null;
  let watermarks = {};
  let queue = Promise.resolve();
  const metrics = { queries: 0, documents: 0 };
  async function read({ full = false } = {}) {
    const next = {};
    const nextWatermarks = {};
    const batches = await Promise.allSettled(
      names.map(async (kind) => {
        const rows = new Map(
          !full && cache ? cache[kind].map((row) => [row.id, row]) : [],
        );
        const since = !full && cache ? watermarks[kind] : null;
        let after = null;
        let watermark = since;
        let pages = 0;
        while (true) {
          if (++pages > Math.ceil(maximum / 250) + 2)
            throw new Error(
              "Os dados estão mudando durante a consulta. Aguarde e tente atualizar novamente.",
            );
          const page = await fetchPage(kind, { since, after, size: 250 });
          metrics.queries++;
          metrics.documents += page.rows.length;
          for (const row of page.rows) {
            const old = rows.get(row.id);
            if (!old || row.version >= old.version) rows.set(row.id, row);
          }
          if (rows.size > maximum)
            throw new Error(
              "A coleção excede 10 mil registros. Exporte e consolide o histórico antes de calcular os totais.",
            );
          watermark = page.watermark || watermark;
          if (page.rows.length < 250) break;
          if (!page.after || page.after === after)
            throw new Error(
              "Não foi possível avançar na consulta. Atualize e tente novamente.",
            );
          after = page.after;
        }
        next[kind] = [...rows.values()];
        nextWatermarks[kind] = watermark;
      }),
    );
    const failure = batches.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    // A failed collection must never commit a partial cache or advance a cursor.
    cache = next;
    watermarks = nextWatermarks;
    return next;
  }
  return {
    load(options) {
      const result = queue.then(() => read(options));
      queue = result.catch(() => {});
      return result;
    },
    getReadMetrics: () => ({ ...metrics }),
  };
}
