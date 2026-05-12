import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_REGISTRY as FALLBACK, type BrandEntry } from "@/lib/brand";

let cache: BrandEntry[] | null = null;
let inflight: Promise<BrandEntry[]> | null = null;

async function load(): Promise<BrandEntry[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data, error } = await supabase
      .from("brand_registry")
      .select("key,name,mark,category,notes")
      .order("sort_order", { ascending: true });
    if (error || !data?.length) return FALLBACK;
    const mapped: BrandEntry[] = data.map((b: any) => ({
      key: b.key,
      name: b.name,
      mark: b.mark,
      display: `${b.name}${b.mark}`,
      category: b.category,
      notes: b.notes ?? undefined,
    }));
    cache = mapped;
    return mapped;
  })();
  return inflight;
}

export function invalidateBrandCache() {
  cache = null;
  inflight = null;
}

export function useBrands() {
  const [brands, setBrands] = useState<BrandEntry[]>(cache ?? FALLBACK);
  const [loading, setLoading] = useState(!cache);
  useEffect(() => {
    let alive = true;
    load().then(b => { if (alive) { setBrands(b); setLoading(false); } });
    return () => { alive = false; };
  }, []);
  return { brands, loading };
}
