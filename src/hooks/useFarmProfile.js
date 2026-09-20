import { useState, useCallback, useRef, useEffect } from 'react';
import { resolveFarmIdFromUsername, fetchFarmDataSmart } from '../services/api';

export default function useFarmProfile(onFarmLoaded) {
  const [farmData, setFarmData] = useState(null);
  const farmInitializedRef = useRef(false);

  const searchFarm = useCallback(async (query, apiKeyOverride = null, forceRefresh = false) => {
    if (!query) return;
    let landId = query;
    const apiKeyToUse = apiKeyOverride ?? localStorage.getItem('sfl_api_key') ?? '';

    if (/[a-zA-Z]/.test(query)) {
      const resolvedId = await resolveFarmIdFromUsername(query);
      if (resolvedId) {
        landId = resolvedId;
      } else {
        console.warn(`[FarmSearch] Não foi possível encontrar Farm ID para o nick '${query}'`);
        return;
      }
    }

    try {
      const normalizedData = await fetchFarmDataSmart({
        farmId: landId,
        apiKey: apiKeyToUse,
        forceRefresh
      });

      if (normalizedData && normalizedData.land) {
        const land = normalizedData.land;
        if (onFarmLoaded) {
          onFarmLoaded(land);
        }
        setFarmData(normalizedData);
      } else {
        setFarmData(null);
      }
    } catch (err) {
      console.error('[FarmSearch] Erro ao carregar dados da fazenda:', err);
      setFarmData(null);
    }
  }, [onFarmLoaded]);

  useEffect(() => {
    const savedFarm = localStorage.getItem('sfl_farm_id');
    if (savedFarm && !farmInitializedRef.current) {
      farmInitializedRef.current = true;
      searchFarm(savedFarm);
    }
  }, [searchFarm]);

  return { farmData, setFarmData, searchFarm };
}
