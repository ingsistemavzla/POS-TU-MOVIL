import { supabase } from "@/integrations/supabase/client";

interface DolarApiResponse {
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number;
  fechaActualizacion: string;
}

/**
 * Obtiene la tasa BCV desde la API de DolarAPI
 * @returns Promise<number> - La tasa BCV oficial
 */
export const fetchBcvRateFromApi = async (): Promise<number | null> => {
  try {
    const response = await fetch('https://ve.dolarapi.com/v1/dolares');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: DolarApiResponse[] = await response.json();
    
    // Buscar la tasa "oficial"
    const oficialRate = data.find(rate => rate.fuente === 'oficial');
    
    if (oficialRate && oficialRate.promedio) {
      return Number(oficialRate.promedio);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching BCV rate from API:', error);
    return null;
  }
};

/**
 * Obtiene la tasa BCV desde la base de datos como fallback
 * @returns Promise<number | null> - La tasa BCV más reciente
 */
export const fetchBcvRateFromDatabase = async (): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('bcv_rates')
      .select('rate')
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      console.error('Error fetching BCV rate from database:', error);
      return null;
    }
    
    if (data && typeof (data as any).rate === 'number') {
      return (data as any).rate as number;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching BCV rate from database:', error);
    return null;
  }
};

/**
 * Guarda la tasa BCV en la base de datos
 * @param rate - La tasa BCV a guardar
 * @returns Promise<boolean> - True si se guardó correctamente
 */
export const saveBcvRateToDatabase = async (rate: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('bcv_rates')
      .insert({
        rate: rate,
        fetched_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving BCV rate to database:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving BCV rate to database:', error);
    return false;
  }
};

/**
 * Obtiene la tasa BCV con fallback automático
 * Primero intenta desde la API, si falla usa la base de datos
 * @returns Promise<number | null> - La tasa BCV
 */
export const getBcvRate = async (): Promise<number | null> => {
  // Intentar obtener desde la API
  const apiRate = await fetchBcvRateFromApi();
  
  if (apiRate !== null) {
    // Guardar en base de datos para backup
    await saveBcvRateToDatabase(apiRate);
    return apiRate;
  }
  
  // Fallback a base de datos
  return await fetchBcvRateFromDatabase();
};
