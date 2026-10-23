import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth";
import { financeRepository } from "./repository";
import { friendly } from "../api";
const empty = { accounts: [], entries: [], series: [], budgets: [], goals: [] };
export function useFinance() {
  const { user, demo } = useAuth();
  const repo = useMemo(() => financeRepository(user, demo), [user.id, demo]);
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const loadedRepo = useRef(null);
  const fullRefresh = useRef(true);
  const currentRepo = useRef(repo);
  currentRepo.current = repo;
  const request = useRef(0);
  const locked = useRef(false);
  const deferredRefresh = useRef(false);
  useEffect(() => {
    let active = true;
    const ticket = ++request.current;
    locked.current = false;
    setBusy(false);
    setLoading(loadedRepo.current !== repo);
    setRefreshing(true);
    setError("");
    repo
      .load({ full: fullRefresh.current })
      .then((d) => {
        if (active && ticket === request.current) {
          setData(d);
          loadedRepo.current = repo;
          setLastSynced(new Date());
        }
      })
      .catch((e) => {
        if (active && ticket === request.current) setError(friendly(e));
      })
      .finally(() => {
        if (active && ticket === request.current) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    fullRefresh.current = false;
    return () => {
      active = false;
    };
  }, [repo, revision]);
  const refresh = useCallback((full = false) => {
    if (!locked.current) {
      fullRefresh.current = full === true;
      setRevision((n) => n + 1);
    } else deferredRefresh.current = true;
  }, []);
  useEffect(() => {
    let timer;
    const unsubscribe = repo.subscribeChanges(() => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      timer = setTimeout(() => refresh(), 250);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [repo, refresh]);
  useEffect(() => {
    let lastFocus = 0;
    const resume = () => refresh();
    const focus = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFocus > 1000
      ) {
        lastFocus = Date.now();
        refresh();
      }
    };
    window.addEventListener("online", resume);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refresh]);
  async function mutate(operation) {
    if (locked.current) throw new Error("Aguarde a operação atual.");
    locked.current = true;
    const ticket = ++request.current;
    setBusy(true);
    setRefreshing(false);
    try {
      await operation(repo);
      const next = await repo.load();
      if (currentRepo.current === repo && ticket === request.current) {
        setData(next);
        setError("");
        setLastSynced(new Date());
      }
    } finally {
      if (currentRepo.current === repo && ticket === request.current) {
        locked.current = false;
        setBusy(false);
        if (deferredRefresh.current) {
          deferredRefresh.current = false;
          setRevision((n) => n + 1);
        }
      }
    }
  }
  return {
    data,
    loading,
    error,
    busy,
    refreshing,
    lastSynced,
    refresh,
    mutate,
    demo,
  };
}
