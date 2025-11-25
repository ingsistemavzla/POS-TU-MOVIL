-- Agregar columnas a la tabla sales para soportar Krece y pagos mixtos
ALTER TABLE public.sales 
ADD COLUMN krece_enabled boolean DEFAULT false,
ADD COLUMN krece_initial_amount_usd numeric DEFAULT 0,
ADD COLUMN krece_financed_amount_usd numeric DEFAULT 0,
ADD COLUMN krece_initial_percentage numeric DEFAULT 0,
ADD COLUMN is_mixed_payment boolean DEFAULT false;

-- Agregar comentarios
COMMENT ON COLUMN public.sales.krece_enabled IS 'Indica si la venta fue financiada por Krece';
COMMENT ON COLUMN public.sales.krece_initial_amount_usd IS 'Monto de la inicial pagada en USD';
COMMENT ON COLUMN public.sales.krece_financed_amount_usd IS 'Monto financiado por Krece en USD';
COMMENT ON COLUMN public.sales.krece_initial_percentage IS 'Porcentaje de la inicial sobre el total';
COMMENT ON COLUMN public.sales.is_mixed_payment IS 'Indica si la venta fue pagada con múltiples métodos';

-- Crear índices para mejor rendimiento
CREATE INDEX idx_sales_krece_enabled ON public.sales(krece_enabled);
CREATE INDEX idx_sales_is_mixed_payment ON public.sales(is_mixed_payment);









