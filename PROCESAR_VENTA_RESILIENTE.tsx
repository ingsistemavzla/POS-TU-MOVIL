/**
 * FUNCIÓN CORREGIDA: processSale (Versión Resiliente)
 * Archivo: src/pages/POS.tsx
 * 
 * CORRECCIÓN QUIRÚRGICA APLICADA:
 * - Aislamiento del éxito persistido: Toast de éxito y limpieza de formulario se ejecutan INMEDIATAMENTE después de obtener saleId
 * - Blindaje de operaciones secundarias: Todas las operaciones asíncronas posteriores están envueltas en try/catch internos
 * - Resiliencia: Si una operación secundaria falla, muestra advertencia pero NO interrumpe el flujo de éxito
 */

const processSale = async () => {
  // Prevenir procesamiento múltiple simultáneo
  if (isProcessingSale) {
    return;
  }

  // Validaciones básicas
  if (cart.length === 0) {
    toast({
      title: "Carrito vacío",
      description: "Agrega productos al carrito antes de procesar la venta.",
      variant: "destructive",
    });
    return;
  }

  if (!userProfile) {
    toast({
      title: "Error de autenticación",
      description: "No hay usuario autenticado. Por favor, inicia sesión nuevamente.",
      variant: "destructive",
    });
    return;
  }

  // Validar método de pago (considerando financiamiento)
  if (!isMixedPayment) {
    const isFinancingActive = isKreceEnabled || isCasheaEnabled;
    const currentPaymentMethod = isFinancingActive
      ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
      : selectedPaymentMethod;

    if (!currentPaymentMethod) {
      toast({
        title: "Método de pago requerido",
        description: "Debe seleccionar un método de pago antes de procesar la venta.",
        variant: "destructive",
      });
      return;
    }
  }

  if (isMixedPayment && mixedPayments.length === 0) {
    toast({
      title: "Pagos mixtos requeridos",
      description: "Debe agregar al menos un método de pago mixto.",
      variant: "destructive",
    });
    return;
  }

  // Validar stock
  for (const item of cart) {
    const availableStock = await getProductStock(item.id);
    if (item.quantity > availableStock) {
      toast({
        title: "Stock insuficiente",
        description: `No hay suficiente stock para: ${item.name}. Disponible: ${availableStock}`,
        variant: "destructive",
      });
      return;
    }
  }

  // Verificar ventas duplicadas
  const duplicateCheck = await checkDuplicateSale();
  if (duplicateCheck.isDuplicate) {
    toast({
      title: "⚠️ Posible venta duplicada",
      description: `Se detectó una venta similar realizada recientemente (Factura: ${duplicateCheck.duplicateSale?.invoice_number || 'N/A'}). Verifica los datos de facturación antes de continuar.`,
      variant: "destructive",
      duration: 10000,
    });
    return;
  }

  // Iniciar procesamiento
  setIsProcessingSale(true);

  let reservedInvoice: ReservedInvoice | null = null;
  let invoiceCommitted = false;

  try {
    // Validar que hay una tienda disponible
    if (!resolvedStoreId) {
      toast({
        title: "Tienda requerida",
        description: "Debe seleccionar una tienda antes de procesar la venta.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }
    
    const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
    
    if (isRestrictedUser && !(userProfile as any)?.assigned_store_id) {
      toast({
        title: "Error de configuración",
        description: "No tienes una tienda asignada. Contacta al administrador.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }
    
    const storeId = resolvedStoreId;
    
    if (!storeId) {
      toast({
        title: "Error",
        description: "No se ha seleccionado una tienda",
        variant: "destructive"
      });
      setIsProcessingSale(false);
      return;
    }

    // Calcular totales
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalUSD = cartSubtotal;

    // Validar pagos mixtos
    if (isMixedPayment) {
      const mixedTotal = mixedPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      if (isKreceEnabled || isCasheaEnabled) {
        const financingInitialAmount = isKreceEnabled ? kreceInitialAmount : 
                                       isCasheaEnabled ? casheaInitialAmount : 0;
        const financingType = isKreceEnabled ? 'KRece' : 
                              isCasheaEnabled ? 'Cashea' : '';
        
        if (financingInitialAmount > 0 && Math.abs(mixedTotal - financingInitialAmount) > 0.01) {
          toast({
            title: "Error en pagos mixtos",
            description: `Con ${financingType} activo, el total de pagos mixtos ($${mixedTotal.toFixed(2)}) debe coincidir con la inicial ($${financingInitialAmount.toFixed(2)})`,
            variant: "destructive",
          });
          setIsProcessingSale(false);
          return;
        }
      } else {
        if (Math.abs(mixedTotal - totalUSD) > 0.01) {
          toast({
            title: "Error en pagos mixtos",
            description: `El total de pagos mixtos ($${mixedTotal.toFixed(2)}) no coincide con el total de la venta ($${totalUSD.toFixed(2)})`,
            variant: "destructive",
          });
          setIsProcessingSale(false);
          return;
        }
      }
    }

    // Reservar número de factura
    try {
      reservedInvoice = await reserveInvoiceNumber();
    } catch (invoiceError) {
      console.error('No se pudo generar un número de factura correlativo:', invoiceError);
      toast({
        title: "Error generando factura",
        description: invoiceError instanceof Error
          ? invoiceError.message
          : 'No se pudo generar un número de factura correlativo. Intenta nuevamente.',
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }

    if (!reservedInvoice) {
      toast({
        title: "Error reservando factura",
        description: "No se pudo reservar un número de factura. Intente nuevamente.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }

    let activeReservation: ReservedInvoice | null = reservedInvoice;
    const invoiceNumber = activeReservation.invoiceNumber;

    // PREPARAR ITEMS DE VENTA
    const saleItems = cart.flatMap(item => {
      // Validación y corrección de precio
      let cleanPrice = Math.max(0, Number(item.price) || 0);
      
      if (cleanPrice === 0 && item.originalPrice && item.originalPrice > 0) {
        cleanPrice = item.originalPrice;
      }
      
      if (cleanPrice === 0) {
        const productFromList = products.find(p => p.id === item.id);
        if (productFromList?.sale_price_usd && productFromList.sale_price_usd > 0) {
          cleanPrice = productFromList.sale_price_usd;
        }
      }
      
      // Validación y corrección de nombre
      let cleanName = String(item.name || '').trim();
      const genericNames = ['Producto sin nombre', 'S/SKU', 'Producto', 'N/A', ''];
      const isGenericName = !cleanName || genericNames.some(generic => 
        cleanName.toLowerCase().includes(generic.toLowerCase())
      );
      
      if (isGenericName || !cleanName) {
        const productFromList = products.find(p => p.id === item.id);
        if (productFromList?.name && productFromList.name.trim()) {
          cleanName = productFromList.name.trim();
        } else {
          cleanName = `Producto ${item.sku || item.id}`;
        }
      }
      
      const cleanSku = String(item.sku || 'SKU-000').trim();
      
      const finalItem = {
        product_id: item.id,
        qty: item.quantity,
        price_usd: cleanPrice,
        product_name: cleanName,
        product_sku: cleanSku,
        imei: item.category === 'phones' && item.imeis && item.imeis.length > 0 ? null : (item.imei ? String(item.imei).trim() : null)
      };
      
      // Si es un teléfono con múltiples IMEIs, crear un item por cada IMEI
      if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
        return item.imeis.map(imei => ({
          ...finalItem,
          qty: 1,
          imei: String(imei).trim()
        }));
      } else {
        return [finalItem];
      }
    });

    // PREPARAR PAGOS MIXTOS
    const mixedPaymentsData = isMixedPayment ? mixedPayments.map(payment => {
      const cleanMethod = String(payment.method || 'unknown').trim();
      const cleanAmount = Math.max(0, Number(payment.amount) || 0);
      
      return {
        method: cleanMethod,
        amount: cleanAmount
      };
    }) : [];

    // PARÁMETROS PARA RPC
    const saleParams = {
      p_company_id: userProfile.company_id,
      p_store_id: storeId,
      p_cashier_id: userProfile.id,
      p_customer_id: selectedCustomer?.id || null,
      p_payment_method: (isKreceEnabled || isCasheaEnabled) ? String(isKreceEnabled ? (kreceInitialPaymentMethod || 'cash_usd') : (casheaInitialPaymentMethod || 'cash_usd')).trim() : String(selectedPaymentMethod || 'cash_usd').trim(),
      p_customer_name: String(selectedCustomer?.name || 'Cliente General').trim(),
      p_bcv_rate: Number(bcvRate) || 41.73,
      p_customer_id_number: selectedCustomer?.id_number ? String(selectedCustomer.id_number).trim() : null,
      p_items: saleItems,
      p_notes: (isKreceEnabled || isCasheaEnabled) ? (isKreceEnabled ? 'financing_type:krece' : 'financing_type:cashea') : null,
      p_tax_rate: Number(getTaxRate()) / 100,
      p_krece_enabled: Boolean(isKreceEnabled || isCasheaEnabled),
      p_krece_initial_amount_usd: Number(isKreceEnabled ? kreceInitialAmount : (isCasheaEnabled ? casheaInitialAmount : 0)) || 0,
      p_krece_financed_amount_usd: isKreceEnabled ? Number(cartSubtotal - kreceInitialAmount) || 0 :
                                   isCasheaEnabled ? Number(cartSubtotal - casheaInitialAmount) || 0 : 0,
      p_krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? Number((kreceInitialAmount / cartSubtotal) * 100) || 0 :
                                  isCasheaEnabled && cartSubtotal > 0 ? Number((casheaInitialAmount / cartSubtotal) * 100) || 0 : 0,
      p_is_mixed_payment: Boolean(isMixedPayment),
      p_mixed_payments: mixedPaymentsData
    };

    // ====================================================================================
    // 🎯 PUNTO CRÍTICO: LLAMADA AL RPC process_sale
    // ====================================================================================
    const { data, error } = await supabase.rpc('process_sale', saleParams);

    if (error) {
      console.error('Error al procesar la venta:', error);

      if (activeReservation) {
        if (isNetworkError(error)) {
          commitInvoiceState(invoiceTrackerRef.current);
          invoiceCommitted = true;
          const updatedQueue = storeOfflineSale({
            invoice_number: activeReservation.invoiceNumber,
            sequence: activeReservation.sequence,
            saleParams,
            cartSnapshot: cart,
            customer: selectedCustomer,
            createdAt: new Date().toISOString(),
            store_id: storeId,
            total_usd: totalUSD,
          });
          if (updatedQueue) {
            pendingOfflineSalesRef.current = updatedQueue;
          }
          alert(
            `La venta se almacenó temporalmente por falla de red. Factura reservada ${activeReservation.invoiceNumber}.`
          );
        } else {
          revertInvoiceState(activeReservation.previousState);
          toast({
            title: "Error al procesar venta",
            description: error.message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error al procesar venta",
          description: error.message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
          variant: "destructive",
        });
      }
      setIsProcessingSale(false);
      return;
    }

    if (!data) {
      if (activeReservation) {
        revertInvoiceState(activeReservation.previousState);
      }
      toast({
        title: "Error del servidor",
        description: "No se recibió respuesta del servidor. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }

    const saleId =
      typeof data === 'string'
        ? data
        : Array.isArray(data)
        ? (data[0] as any)?.id
        : (data as any)?.id;

    if (!saleId) {
      if (activeReservation) {
        revertInvoiceState(activeReservation.previousState);
      }
      console.error('No se recibió un identificador válido para la venta:', data);
      toast({
        title: "Error de identificación",
        description: "No se pudo identificar la venta procesada. Por favor, intenta nuevamente.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }

    // ====================================================================================
    // ✅ AISLAMIENTO DEL ÉXITO PERSISTIDO - PRIORIDAD ABSOLUTA
    // ====================================================================================
    // La venta fue procesada exitosamente. Declarar éxito INMEDIATAMENTE antes de
    // cualquier operación secundaria que pueda fallar.
    // ====================================================================================

    // Guardar snapshot del carrito para el modal (antes de limpiar)
    const cartSnapshot = [...cart];
    const customerSnapshot = selectedCustomer;

    // Limpiar formulario INMEDIATAMENTE (la venta ya está persistida)
    setCart([]);
    setSelectedCustomer(null);
    setSelectedPaymentMethod("");
    setIsKreceEnabled(false);
    setKreceInitialAmount(0);
    setIsCasheaEnabled(false);
    setCasheaInitialAmount(0);
    setIsMixedPayment(false);
    setMixedPayments([]);
    
    // Establecer estado de venta completada
    setIsSaleConfirmedAndCompleted(true);
    
    // Mostrar toast de éxito INMEDIATAMENTE
    toast({
      title: "✅ Venta completada",
      description: `Venta procesada exitosamente. Asignando número de factura...`,
      duration: 3000,
    });

    // ====================================================================================
    // 🔒 BLINDAJE DE OPERACIONES SECUNDARIAS
    // ====================================================================================
    // Todas las operaciones asíncronas posteriores están envueltas en try/catch internos
    // para que NO interrumpan el flujo de éxito ya declarado.
    // ====================================================================================

    let finalInvoiceNumber = invoiceNumber;
    let storeInfo: any = {};

    // ====================================================================================
    // OPERACIÓN SECUNDARIA 1: Asignación de Factura Correlativa
    // ====================================================================================
    if (activeReservation) {
      try {
        const applyInvoiceToSale = async (reservation: ReservedInvoice) => {
          const payload: Database['public']['Tables']['sales']['Update'] = {
            invoice_number: reservation.invoiceNumber,
          };
          const { error: updateError } = await supabase
            .from('sales')
            .update(payload as any)
            .eq('id', saleId);
          return updateError;
        };

        let updateError = await applyInvoiceToSale(activeReservation);

        if (updateError) {
          console.warn('No se pudo asignar la factura reservada. Intentando nuevamente con otro correlativo.', updateError);
          revertInvoiceState(activeReservation.previousState);

          try {
            activeReservation = await reserveInvoiceNumber();
            if (activeReservation) {
              updateError = await applyInvoiceToSale(activeReservation);
              
              if (updateError) {
                console.error('No se pudo asignar un número de factura tras reintento:', updateError);
                // NO hacer return aquí - solo mostrar advertencia
                toast({
                  title: "⚠️ Advertencia",
                  description: "La venta fue procesada exitosamente, pero no se pudo asignar un número de factura correlativo. Contacta al administrador.",
                  variant: "warning",
                  duration: 5000,
                });
              } else {
                commitInvoiceState(invoiceTrackerRef.current);
                invoiceCommitted = true;
                reservedInvoice = activeReservation;
                finalInvoiceNumber = activeReservation.invoiceNumber;
              }
            }
          } catch (retryError) {
            console.error('Fallo generando un nuevo correlativo tras el error:', retryError);
            toast({
              title: "⚠️ Advertencia",
              description: "La venta fue procesada exitosamente, pero no se pudo asignar un número de factura correlativo. Contacta al administrador.",
              variant: "warning",
              duration: 5000,
            });
          }
        } else {
          commitInvoiceState(invoiceTrackerRef.current);
          invoiceCommitted = true;
          finalInvoiceNumber = activeReservation.invoiceNumber;
        }
      } catch (invoiceError) {
        console.warn('Error en asignación de factura (no crítico):', invoiceError);
        toast({
          title: "⚠️ Advertencia",
          description: "La venta fue procesada exitosamente, pero hubo un problema al asignar el número de factura. Contacta al administrador si es necesario.",
          variant: "warning",
          duration: 5000,
        });
      }
    }

    // ====================================================================================
    // OPERACIÓN SECUNDARIA 2: Verificación de Factura Almacenada
    // ====================================================================================
    try {
      const saleRowResponse = await supabase
        .from('sales')
        .select('invoice_number')
        .eq('id', saleId)
        .maybeSingle();

      if (saleRowResponse.error) {
        console.warn('No se pudo verificar la factura almacenada:', saleRowResponse.error);
      } else {
        const saleRow = saleRowResponse.data as Database['public']['Tables']['sales']['Row'] | null;
        if (saleRow?.invoice_number) {
          finalInvoiceNumber = saleRow.invoice_number;
        }
      }
    } catch (fetchError) {
      console.warn('No se pudo verificar la factura almacenada (no crítico):', fetchError);
      // No mostrar toast - ya tenemos el número de factura de la reserva
    }

    // ====================================================================================
    // OPERACIÓN SECUNDARIA 3: Obtención de Datos de Tienda (Información Fiscal)
    // ====================================================================================
    try {
      if (selectedStore) {
        // Usar la tienda seleccionada con información fiscal completa
        storeInfo = {
          name: selectedStore.name,
          business_name: selectedStore.business_name,
          tax_id: selectedStore.tax_id,
          fiscal_address: selectedStore.fiscal_address,
          phone_fiscal: selectedStore.phone_fiscal,
          email_fiscal: selectedStore.email_fiscal
        };
      } else if ((userProfile as any)?.assigned_store_id) {
        // Fallback: usar la tienda asignada al usuario
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
          .eq('id', (userProfile as any).assigned_store_id)
          .single();
        
        if (!storeError && storeData) {
          storeInfo = {
            name: (storeData as any).name,
            business_name: (storeData as any).business_name,
            tax_id: (storeData as any).tax_id,
            fiscal_address: (storeData as any).fiscal_address,
            phone_fiscal: (storeData as any).phone_fiscal,
            email_fiscal: (storeData as any).email_fiscal
          };
        }
      }
    } catch (storeError) {
      console.warn('Error obteniendo información de la tienda (no crítico):', storeError);
      // Usar objeto vacío como fallback - no interrumpe el flujo
      storeInfo = {};
    }

    // ====================================================================================
    // FLUJO FINAL DE PRESENTACIÓN
    // ====================================================================================
    // Preparar datos para el modal usando información obtenida con resiliencia
    // ====================================================================================

    // Preparar items para la factura (usar snapshot del carrito)
    const invoiceItems = cartSnapshot.flatMap(item => {
      if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
        return item.imeis.map(imei => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          imei: imei
        }));
      } else {
        return [{
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imei: item.imei
        }];
      }
    });

    // Preparar datos para el modal
    const saleData = {
      sale_id: saleId,
      invoice_number: finalInvoiceNumber,
      customer: customerSnapshot?.name || 'Cliente General',
      customer_id: customerSnapshot?.id_number || null,
      items: invoiceItems,
      subtotal_usd: cartSubtotal,
      tax_amount_usd: 0,
      total_usd: totalUSD,
      total_bs: totalUSD * bcvRate,
      bcv_rate: bcvRate,
      payment_method: (isKreceEnabled || isCasheaEnabled) 
        ? (isKreceEnabled ? kreceInitialPaymentMethod : casheaInitialPaymentMethod)
        : selectedPaymentMethod,
      sale_date: new Date().toISOString(),
      store_info: storeInfo,
      cashier_name: userProfile.name || 'Sistema',
      krece_enabled: isKreceEnabled || isCasheaEnabled,
      krece_initial_amount: isKreceEnabled ? kreceInitialAmount : 
                            isCasheaEnabled ? casheaInitialAmount : 0,
      krece_financed_amount: isKreceEnabled ? (cartSubtotal - kreceInitialAmount) :
                             isCasheaEnabled ? (cartSubtotal - casheaInitialAmount) : 0,
      krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? ((kreceInitialAmount / cartSubtotal) * 100) :
                                isCasheaEnabled && cartSubtotal > 0 ? ((casheaInitialAmount / cartSubtotal) * 100) : 0,
      financing_type: isKreceEnabled ? 'krece' : (isCasheaEnabled ? 'cashea' : null)
    };

    // Mostrar modal de completado
    setCompletedSaleData(saleData);
    setShowSaleModal(true);
    
    // Finalizar procesamiento
    setIsProcessingSale(false);
    
    console.log('Venta procesada exitosamente:', data);
    
  } catch (error) {
    // Este catch solo debe capturar errores del RPC principal o errores inesperados
    // NO debe capturar errores de operaciones secundarias (ya están blindadas)
    console.error('Error crítico al procesar la venta:', error);
    
    if (reservedInvoice && !invoiceCommitted) {
      revertInvoiceState(reservedInvoice.previousState);
    }
    
    toast({
      title: "Error al procesar venta",
      description: (error as Error).message || "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
      variant: "destructive",
    });
    setIsProcessingSale(false);
  }
};





