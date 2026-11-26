import { useEffect, useState, useCallback } from 'react';

/**
 * Generic data fetching hook with loading/error/refetch.
 * Usage: const { data, setData, loading, error, refetch, setParams } = useFetch(salesApi.getAll, { range: 'today' })
 */
export default function useFetch(fn, initialParams = {}, initialData = null) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);
  const [tick, setTick] = useState(0);

  const refetch = useCallback((nextParams) => {
    if (nextParams) setParams((prev) => ({ ...prev, ...nextParams }));
    else setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fn(params)
      .then(({ data: res }) => {
        if (!active) return;
        setData(res);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || 'Something went wrong.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params), tick]);

  return { data, setData, loading, error, refetch, params, setParams };
}