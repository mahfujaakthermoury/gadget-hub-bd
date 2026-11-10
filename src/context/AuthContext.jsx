import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const restoreSession = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setStatus("loading");
    setError("");

    try {
      const currentUser = await getCurrentUser();
      if (currentRequestId !== requestId.current) return null;
      setUser(currentUser);
      setStatus("authenticated");
      return currentUser;
    } catch (requestError) {
      if (currentRequestId !== requestId.current) return null;
      setUser(null);
      if (requestError.status === 401) {
        setStatus("unauthenticated");
        return null;
      }

      setError(requestError.message);
      setStatus("unavailable");
      return null;
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (credentials) => {
    const result = await loginUser(credentials);
    requestId.current += 1;
    setUser(result.user);
    setError("");
    setStatus("authenticated");
    return result;
  }, []);

  const register = useCallback((details) => registerUser(details), []);

  const logout = useCallback(async () => {
    try {
      return await logoutUser();
    } finally {
      requestId.current += 1;
      setUser(null);
      setError("");
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      error,
      isLoading: status === "loading",
      isAuthenticated: status === "authenticated" && Boolean(user),
      login,
      register,
      logout,
      refreshUser: restoreSession,
    }),
    [user, status, error, login, register, logout, restoreSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }
  return context;
}
