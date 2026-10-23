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
  const currentRepo = useRef(repo);
  currentRepo.current = repo;
  const request = useRef(0);
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    const ticket = ++request.current;
    locked.current = false;
    setBusy(false);
    setLoading(true);
    setError("");
    repo
      .load()
      .then((d) => {
        if (active && ticket === request.current) setData(d);
      })
      .catch((e) => {
        if (active && ticket === request.current) setError(friendly(e));
      })
      .finally(() => {
        if (active && ticket === request.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo, revision]);
  const refresh = useCallback(() => {
    if (!locked.current) setRevision((n) => n + 1);
  }, []);
  useEffect(() => {
    const resume = () => refresh();
    window.addEventListener("online", resume);
    return () => window.removeEventListener("online", resume);
  }, [refresh]);
  async function mutate(operation) {
    if (locked.current) throw new Error("Aguarde a operação atual.");
    locked.current = true;
    const ticket = ++request.current;
    setBusy(true);
    try {
      await operation(repo);
      const next = await repo.load();
      if (currentRepo.current === repo && ticket === request.current) {
        setData(next);
        setError("");
      }
    } finally {
      if (currentRepo.current === repo && ticket === request.current) {
        locked.current = false;
        setBusy(false);
      }
    }
  }
  return { data, loading, error, busy, refresh, mutate, demo };
}
