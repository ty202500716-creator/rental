import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
export function useApi(route) {
  const [d, setD] = useState(null), [e, setE] = useState('');
  const load = useCallback(() => { setE(''); return api(route).then(setD).catch(x => setE(x.message)); }, [route]);
  useEffect(() => { load(); }, [load]);
  return { d, e, load };
}
