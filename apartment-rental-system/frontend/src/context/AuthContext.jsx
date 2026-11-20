import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api.js';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
const AUTH_SYNC_KEY = 'ars:auth:changed';
const AUTH_REFRESH_EVENT = 'ars:auth:refresh';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);   // undefined = still checking session
  const [sessionError, setSessionError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const lastVisibilitySync = useRef(0);
  const syncSession = useCallback(async () => {
    try {
      const {user: sessionUser} = await api('auth/me');
      setUser(previous => JSON.stringify(previous) === JSON.stringify(sessionUser) ? previous : sessionUser);
      setSessionError('');
      return sessionUser;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setSessionError('');
        setLoginMessage(error.message.startsWith('Your account is suspended/deactivated.') ? error.message : '');
        return null;
      }
      setSessionError(error.message || 'Could not refresh your session. Check your connection and try again.');
      return undefined;
    }
  }, []);
  const broadcastSessionChange = useCallback(() => {
    try {
      localStorage.setItem(AUTH_SYNC_KEY, String(Date.now()));
      localStorage.removeItem(AUTH_SYNC_KEY);
    } catch {
      // Session synchronization is best-effort when browser storage is unavailable.
    }
  }, []);
  const updateUser = useCallback(nextUser => {
    setUser(nextUser);
    setLoginMessage('');
    setSessionError('');
    broadcastSessionChange();
  }, [broadcastSessionChange]);
  useEffect(() => {
    syncSession();
    lastVisibilitySync.current = Date.now();
    const onStorage = event => {
      if (event.key === AUTH_SYNC_KEY && event.newValue !== null) syncSession();
    };
    const onAuthRefresh = event => {
      const message=event.detail?.message||'';
      if(event.detail?.status===401&&message.startsWith('Your account is suspended/deactivated.')){
        setUser(null);
        setSessionError('');
        setLoginMessage(message);
      }else syncSession();
    };
    const onVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && now - lastVisibilitySync.current >= 60000) {
        lastVisibilitySync.current = now;
        syncSession();
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_REFRESH_EVENT, onAuthRefresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_REFRESH_EVENT, onAuthRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [syncSession]);
  const logout = async () => {
    try {
      await api('auth/logout', {});
    } finally {
      setUser(null);
      setLoginMessage('');
      broadcastSessionChange();
    }
  };
  return <Ctx.Provider value={{ user, setUser: updateUser, logout, sessionError, syncSession, loginMessage, clearLoginMessage:()=>setLoginMessage('') }}>{children}</Ctx.Provider>;
}
