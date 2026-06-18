import { useEffect, useState } from "react";
import Papa from "papaparse";

interface CsvState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

export function useCsvData<T = Record<string, unknown>>(url: string): CsvState<T> {
  const [state, setState] = useState<CsvState<T>>({
    data: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: [], loading: true, error: null });

    fetch(url)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(`FILE_NOT_FOUND:${url}`);
          }
          throw new Error(`Failed to load ${url} (${res.status})`);
        }
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        const result = Papa.parse<T>(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });
        setState({ data: result.data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: [], loading: false, error: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
