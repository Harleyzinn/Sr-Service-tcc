import { createContext, useContext, useEffect, useState } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { api, demoProfile, friendly } from "./api";
import { configured, authClient } from "./firebase";
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [demo, setDemo] = useState(
    () => sessionStorage.getItem("sr-demo-role") || null,
  );
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [team, setTeam] = useState(false);
  useEffect(() => {
    let active = true;
    let revision = 0;
    setError("");
    setLoading(true);
    if (demo) {
      const u = demoProfile(demo);
      setUser(u);
      api
        .profile(u, demo)
        .then((p) => {
          if (active) setProfile(p);
        })
        .catch((e) => {
          if (active) setError(friendly(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }
    if (!configured) {
      setUser(null);
      setProfile(null);
      setTeam(false);
      setLoading(false);
      return;
    }
    const unsubscribe = onIdTokenChanged(
      authClient,
      async (raw) => {
        const current = ++revision;
        if (!active) return;
        setLoading(true);
        if (!raw?.emailVerified) {
          setUser(null);
          setProfile(null);
          setTeam(false);
          setLoading(false);
          return;
        }
        try {
          const token = await raw.getIdTokenResult();
          const nextUser = {
            id: raw.uid,
            email: raw.email,
            displayName: raw.displayName,
          };
          const nextProfile = await api.profile(nextUser, null);
          if (active && current === revision) {
            setUser(nextUser);
            setProfile(nextProfile);
            setTeam(token.claims.admin === true);
            setError("");
          }
        } catch (e) {
          if (active && current === revision) {
            setError(friendly(e));
            setUser(null);
            setProfile(null);
            setTeam(false);
          }
        } finally {
          if (active && current === revision) setLoading(false);
        }
      },
      (e) => {
        if (active) {
          setError(friendly(e));
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
      revision++;
      unsubscribe();
    };
  }, [demo]);
  const startDemo = (role) => {
    sessionStorage.setItem("sr-demo-role", role);
    setDemo(role);
  };
  const logout = async () => {
    if (!demo && authClient) await signOut(authClient);
    sessionStorage.removeItem("sr-demo-role");
    setDemo(null);
    setUser(null);
    setProfile(null);
    setTeam(false);
    setError("");
  };
  return (
    <Context.Provider
      value={{
        user,
        profile,
        setProfile,
        demo,
        admin: demo ? demo === "admin" : team,
        loading,
        error,
        configured,
        startDemo,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
