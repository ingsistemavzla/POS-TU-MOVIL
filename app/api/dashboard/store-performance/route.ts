import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Configuración de Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://swsqmsbyikznalrvydny.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3c3Ftc2J5aWt6bmFscnZ5ZG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTYxODYsImV4cCI6MjA3OTU5MjE4Nn0.fMBkdy28G5ebXYI0BKvIe9AL7N4d7q_zj5tZoF5m_yU";

/**
 * GET /api/dashboard/store-performance
 * 
 * Obtiene el rendimiento de las tiendas para el dashboard
 * 
 * Query Parameters:
 * - start_date (opcional): Fecha de inicio en formato ISO 8601
 * - end_date (opcional): Fecha de fin en formato ISO 8601
 * 
 * Returns:
 * - 200: { summary: StorePerformanceSummary[] }
 * - 401: No autenticado
 * - 500: Error del servidor
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Obtener parámetros de la URL
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // 2. Crear cliente de Supabase con cookies para autenticación
    const cookieStore = await cookies();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    // 3. Validar autenticación - Obtener usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado', message: 'Debes iniciar sesión para acceder a este recurso' },
        { status: 401 }
      );
    }

    // 4. Obtener company_id desde el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('company_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado', message: 'No se pudo obtener el perfil del usuario' },
        { status: 404 }
      );
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { error: 'Sin compañía', message: 'El usuario no tiene una compañía asignada' },
        { status: 400 }
      );
    }

    // 5. Preparar parámetros para la RPC
    const rpcParams: {
      p_company_id: string;
      p_start_date?: string;
      p_end_date?: string;
    } = {
      p_company_id: profile.company_id,
    };

    // Agregar fechas si están presentes
    if (startDate) {
      rpcParams.p_start_date = startDate;
    }
    if (endDate) {
      rpcParams.p_end_date = endDate;
    }

    // 6. Llamar a la RPC get_dashboard_store_performance
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'get_dashboard_store_performance',
      rpcParams
    );

    if (rpcError) {
      console.error('Error en RPC get_dashboard_store_performance:', rpcError);
      return NextResponse.json(
        { 
          error: 'Error al obtener datos', 
          message: rpcError.message || 'Error desconocido al consultar el rendimiento de tiendas' 
        },
        { status: 500 }
      );
    }

    // 7. Validar que el resultado no tenga error
    if (rpcResult && typeof rpcResult === 'object' && 'error' in rpcResult && rpcResult.error) {
      return NextResponse.json(
        { 
          error: 'Error en la consulta', 
          message: rpcResult.message || 'La función retornó un error' 
        },
        { status: 500 }
      );
    }

    // 8. Retornar JSON con summary
    return NextResponse.json(
      { summary: rpcResult?.summary || [] },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error inesperado en /api/dashboard/store-performance:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Error desconocido' 
      },
      { status: 500 }
    );
  }
}


