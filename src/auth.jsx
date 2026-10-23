import { createContext, useContext, useEffect, useState, useRef } from "react";
import { onIdTokenChanged, signOut } from "firebase/auth";
import { api, demoProfile, friendly } from "./api";
import { configured, authClient } from "./firebase";
import { clearUserDrafts } from "./draft";
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
  const activeUser = useRef(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    setError("");
    setLoading(true);
    if (demo) {
      activeUser.current = null;
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
        const sameUser = Boolean(raw?.uid && activeUser.current === raw.uid);
        if (!sameUser) {
          setLoading(true);
          setUser(null);
          setProfile(null);
          setTeam(false);
        }
        if (!raw?.emailVerified) {
          activeUser.current = null;
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
          const nextProfile = sameUser
            ? null
            : await api.profile(nextUser, null);
          if (active && current === revision) {
            if (!sameUser) {
              setUser(nextUser);
              setProfile(nextProfile);
            }
            activeUser.current = raw.uid;
            setTeam(token.claims.admin === true);
            setError("");
          }
        } catch (e) {
          if (active && current === revision) {
            setError(friendly(e));
            if (!sameUser) {
              setUser(null);
              setProfile(null);
              activeUser.current = null;
            }
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
    if (user) clearUserDrafts(user.id, demo);
    activeUser.current = null;
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
