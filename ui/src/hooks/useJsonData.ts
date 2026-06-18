import { useEffect, useState } from "react";

interface JsonState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useJsonData<T>(url: string): JsonState<T> {
  const [state, setState] = useState<JsonState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true, error: null });

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
        return res.json() as Promise<T>;
      })
      .then((json) => {
        if (!cancelled) setState({ data: json, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
