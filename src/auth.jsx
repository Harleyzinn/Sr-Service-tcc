import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api, configured, demoProfile, friendly, supabase } from "./api";
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [demo, setDemo] = useState(
    () => sessionStorage.getItem("sr-demo-role") || null,
  );
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const loadProfile = useCallback(async (u, mode) => {
    setError("");
    try {
      setProfile(u ? await api.profile(u, mode) : null);
    } catch (e) {
      setError(friendly(e));
      setProfile(null);
    }
  }, []);
  useEffect(() => {
    let active = true;
    if (demo) {
      const u = demoProfile(demo);
      setUser(u);
      loadProfile(u, demo).finally(() => setLoading(false));
      return;
    }
    if (!configured) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) setError(friendly(error));
        setUser(data.session?.user || null);
        await loadProfile(data.session?.user, null);
        if (active) setLoading(false);
      })
      .catch((e) => {
        if (active) {
          setError(friendly(e));
          setLoading(false);
        }
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setUser(session?.user || null);
      setTimeout(() => {
        if (active) loadProfile(session?.user, null);
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [demo, loadProfile]);
  const startDemo = (role) => {
    sessionStorage.setItem("sr-demo-role", role);
    setDemo(role);
  };
  const logout = async () => {
    if (!demo && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    sessionStorage.removeItem("sr-demo-role");
    setDemo(null);
    setUser(null);
    setProfile(null);
  };
  const admin = demo ? demo === "admin" : user?.app_metadata?.role === "admin";
  return (
    <Context.Provider
      value={{
        user,
        profile,
        setProfile,
        demo,
        admin,
        loading,
        error,
        configured,
        startDemo,
        logout,
        recovery,
        setRecovery,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
