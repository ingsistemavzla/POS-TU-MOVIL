/**
 * FUNCIÓN COMPLETA: processSale
 * Archivo: src/pages/POS.tsx
 * Líneas: 1543-2224
 * 
 * Esta función procesa una venta completa desde el POS, incluyendo:
 * - Validaciones de carrito, usuario, método de pago
 * - Validación de stock
 * - Verificación de ventas duplicadas
 * - Reserva de número de factura
 * - Construcción de items de venta (con manejo de IMEIs)
 * - Llamada a la RPC process_sale
 * - Manejo de errores y sincronización offline
 * - Asignación de factura correlativa
 * - Preparación de datos para modal de confirmación
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
      duration: 10000, // 10 segundos para que el usuario lo vea
    });
    return;
  }

  // Iniciar procesamiento
  setIsProcessingSale(true);

  let reservedInvoice: ReservedInvoice | null = null;
  let invoiceCommitted = false;

  try {
    // Validar que hay una tienda disponible (resolvedStoreId ya está definido arriba)
    if (!resolvedStoreId) {
      toast({
        title: "Tienda requerida",
        description: "Debe seleccionar una tienda antes de procesar la venta.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }
    
    // For cashiers and managers, always use assigned store; for admins, use selected store
    const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
    
    // Validación explícita para Roles Fijos: DEBEN tener assigned_store_id
    if (isRestrictedUser && !(userProfile as any)?.assigned_store_id) {
      toast({
        title: "Error de configuración",
        description: "No tienes una tienda asignada. Contacta al administrador.",
        variant: "destructive",
      });
      setIsProcessingSale(false);
      return;
    }
    
    // Usar resolvedStoreId (ya validado arriba)
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

    // Calcular totales SIN IVA (ya que el IVA se calcula en el backend)
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalUSD = cartSubtotal; // El IVA se calcula en el backend

    // Validar pagos mixtos
    if (isMixedPayment) {
      const mixedTotal = mixedPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      if (isKreceEnabled || isCasheaEnabled) {
        // Con KRece o Cashea: los pagos mixtos deben coincidir con la inicial
        // Asegurar que solo uno esté activo (exclusión mutua)
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
        // Sin financiamiento: los pagos mixtos deben coincidir con el total de la venta (comportamiento original)
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

    // PREPARAR ITEMS DE VENTA - VALIDACIÓN Y CORRECCIÓN DE DATOS
    console.log('🔍 DEBUG: Iniciando construcción de saleItems. Cart:', cart);
    console.log('🔍 DEBUG: Products array length:', products.length);
    
    // ⚠️ AUDITORÍA CRÍTICA: Verificar estado del carrito ANTES de procesamiento
    console.log('🚨 AUDITORÍA CARRITO COMPLETO:');
    cart.forEach((item, index) => {
      console.log(`   [${index}] ${item.name} | category: "${item.category}" | quantity: ${item.quantity} | typeof quantity: ${typeof item.quantity}`);
    });
    
    const saleItems = cart.flatMap(item => {
      // LOGGING DETALLADO DEL ITEM ORIGINAL
      console.log('🔍 DEBUG: Procesando item del carrito:', {
        id: item.id,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        quantity: item.quantity,
        sku: item.sku,
        category: item.category
      });
      
      // CANTIDAD DIRECTA DEL CARRITO - SIN TRANSFORMACIONES
      // ⚠️ CORRECCIÓN CRÍTICA: Usar item.quantity directamente
      const directQty = item.quantity; // Valor directo del estado del carrito
      console.log('🔴 CANTIDAD DIRECTA:', {
        item_quantity: item.quantity,
        directQty: directQty,
        typeof: typeof item.quantity,
        product_name: item.name
      });
      
      // VALIDACIÓN Y CORRECCIÓN DE PRECIO
      // Si el precio es 0 o inválido, usar el precio original del producto
      let cleanPrice = Math.max(0, Number(item.price) || 0);
      let priceSource = 'item.price';
      
      if (cleanPrice === 0 && item.originalPrice && item.originalPrice > 0) {
        cleanPrice = item.originalPrice;
        priceSource = 'item.originalPrice';
        console.log(`💰 DEBUG: Precio corregido desde originalPrice: ${cleanPrice}`);
      }
      // Si aún es 0, buscar el precio en el array de productos cargados
      if (cleanPrice === 0) {
        const productFromList = products.find(p => p.id === item.id);
        if (productFromList?.sale_price_usd && productFromList.sale_price_usd > 0) {
          cleanPrice = productFromList.sale_price_usd;
          priceSource = 'products.sale_price_usd';
          console.log(`💰 DEBUG: Precio corregido desde products array: ${cleanPrice}`);
        } else {
          console.warn(`⚠️ DEBUG: Producto no encontrado en array products para ID: ${item.id}`);
        }
      }
      // Si sigue siendo 0, es un error crítico - usar 0 pero loguear
      if (cleanPrice === 0) {
        console.error('❌ ERROR CRÍTICO: Producto con precio $0.00 después de todas las validaciones:', {
          product_id: item.id,
          item_name: item.name,
          item_price: item.price,
          original_price: item.originalPrice,
          products_array_has_item: products.some(p => p.id === item.id),
          price_source: priceSource
        });
      }
      
      // VALIDACIÓN Y CORRECCIÓN DE NOMBRE
      // Verificar que el nombre no sea genérico o vacío
      let cleanName = String(item.name || '').trim();
      const genericNames = ['Producto sin nombre', 'S/SKU', 'Producto', 'N/A', ''];
      const isGenericName = !cleanName || genericNames.some(generic => 
        cleanName.toLowerCase().includes(generic.toLowerCase())
      );
      let nameSource = 'item.name';
      
      // Si el nombre es genérico o está vacío, buscar el nombre real del producto
      if (isGenericName || !cleanName) {
        const productFromList = products.find(p => p.id === item.id);
        if (productFromList?.name && productFromList.name.trim()) {
          cleanName = productFromList.name.trim();
          nameSource = 'products.name';
          console.log(`📝 DEBUG: Nombre corregido desde products array: "${cleanName}"`);
        } else {
          // Si no se encuentra en la lista, usar un nombre por defecto con SKU
          cleanName = `Producto ${item.sku || item.id}`;
          nameSource = 'fallback';
          console.error('❌ ERROR: No se pudo obtener nombre del producto:', {
            product_id: item.id,
            item_name: item.name,
            sku: item.sku,
            products_array_has_item: products.some(p => p.id === item.id)
          });
        }
      }
      
      // VALIDACIÓN DE SKU
      const cleanSku = String(item.sku || 'SKU-000').trim();
      
      // Construir el objeto final del item
      // ⚠️ CORRECCIÓN CRÍTICA: Usar item.quantity DIRECTAMENTE (sin transformaciones)
      // El Backend es responsable de validar la cantidad
      console.log(`📦 CONSTRUCCIÓN ITEM: ${item.name} | Categoría: ${item.category} | item.quantity: ${item.quantity} | ENVIANDO: ${item.quantity}`);
      
      const finalItem = {
        product_id: item.id,
        qty: item.quantity, // ← CANTIDAD DIRECTA DEL CARRITO
        price_usd: cleanPrice,
        product_name: cleanName,
        product_sku: cleanSku,
        imei: item.category === 'phones' && item.imeis && item.imeis.length > 0 ? null : (item.imei ? String(item.imei).trim() : null)
      };
      
      console.log(`✅ ITEM FINAL: ${cleanName} | qty=${finalItem.qty} | price=${finalItem.price_usd}`);
      
      // LOGGING DEL ITEM FINAL
      console.log('✅ DEBUG: Item final construido:', {
        ...finalItem,
        price_source: priceSource,
        name_source: nameSource
      });
      
      // Si es un teléfono con múltiples IMEIs, crear un item por cada IMEI
      if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
        return item.imeis.map(imei => ({
          ...finalItem,
          qty: 1, // Cada teléfono es cantidad 1
          imei: String(imei).trim()
        }));
      } else {
        // Para productos normales o teléfonos con un solo IMEI
        return [finalItem];
      }
    });
    
    // LOGGING FINAL DE TODOS LOS ITEMS
    console.log('📦 DEBUG: Array final de saleItems que se enviará a process_sale:', JSON.stringify(saleItems, null, 2));
    
    // ⚠️ VERIFICACIÓN FINAL DE CANTIDADES
    console.log('🚨 VERIFICACIÓN FINAL - Cantidades en saleItems:');
    saleItems.forEach((item, index) => {
      console.log(`   [${index}] ${item.product_name} | qty: ${item.qty} | price: $${item.price_usd}`);
    });
    
    const totalUnits = saleItems.reduce((sum, item) => sum + item.qty, 0);
    console.log(`🎯 TOTAL UNIDADES A DESCONTAR: ${totalUnits}`);

    // PREPARAR PAGOS MIXTOS - ULTRA LIMPIO
    const mixedPaymentsData = isMixedPayment ? mixedPayments.map(payment => {
      const cleanMethod = String(payment.method || 'unknown').trim();
      const cleanAmount = Math.max(0, Number(payment.amount) || 0);
      
      return {
        method: cleanMethod,
        amount: cleanAmount
      };
    }) : [];

    // PARÁMETROS ULTRA LIMPIOS - AJUSTADOS PARA COINCIDIR CON LA FUNCIÓN DE SUPABASE
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
      // Guardar tipo de financiamiento en notes para distinguir entre KRECE y Cashea sin modificar BD
      p_notes: (isKreceEnabled || isCasheaEnabled) ? (isKreceEnabled ? 'financing_type:krece' : 'financing_type:cashea') : null,
      p_tax_rate: Number(getTaxRate()) / 100, // Convertir porcentaje a decimal (ej: 16% -> 0.16)
      // Usar los mismos campos de KRECE para Cashea (reutilizando estructura existente)
      p_krece_enabled: Boolean(isKreceEnabled || isCasheaEnabled),
      p_krece_initial_amount_usd: Number(isKreceEnabled ? kreceInitialAmount : (isCasheaEnabled ? casheaInitialAmount : 0)) || 0,
      // Cuando ninguno está activo, será 0 (comportamiento original)
      p_krece_financed_amount_usd: isKreceEnabled ? Number(cartSubtotal - kreceInitialAmount) || 0 :
                                   isCasheaEnabled ? Number(cartSubtotal - casheaInitialAmount) || 0 : 0,
      // Cuando ninguno está activo, será 0 (comportamiento original)
      p_krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? Number((kreceInitialAmount / cartSubtotal) * 100) || 0 :
                                  isCasheaEnabled && cartSubtotal > 0 ? Number((casheaInitialAmount / cartSubtotal) * 100) || 0 : 0,
      p_is_mixed_payment: Boolean(isMixedPayment),
      p_mixed_payments: mixedPaymentsData
    };

    console.log('🚀 DEBUG: Procesando venta con parámetros COMPLETOS:');
    console.log('📋 DEBUG: p_items (saleItems):', JSON.stringify(saleParams.p_items, null, 2));
    console.log('📊 DEBUG: Todos los parámetros:', {
      ...saleParams,
      p_items: saleParams.p_items // Ya logueado arriba
    });

    // Llamar a la función de procesamiento
    const { data, error } = await supabase.rpc('process_sale', saleParams);

    if (error) {
      console.error('Error al procesar la venta:', error);

      if (activeReservation) {
        if (isNetworkError(error)) {
          commitInvoiceState(invoiceTrackerRef.current);
          invoiceCommitted = true;
          const updatedQueue = storeOfflineSale({
            invoice_number: activeReservation.invoiceNumber,
            sequence: activeReservation.sequence, // Usar sequence en vez de dateKey
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

    if (activeReservation) {
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
        console.warn(
          'No se pudo asignar la factura reservada. Intentando nuevamente con otro correlativo.',
          updateError
        );
        revertInvoiceState(activeReservation.previousState);

        try {
          activeReservation = await reserveInvoiceNumber();
        } catch (retryError) {
          console.error('Fallo generando un nuevo correlativo tras el error:', retryError);
          toast({
            title: "Error asignando factura",
            description: "No se pudo asignar un número de factura correlativo. Intenta nuevamente.",
            variant: "destructive",
          });
          setIsProcessingSale(false);
          return;
        }

        updateError = await applyInvoiceToSale(activeReservation);

        if (updateError) {
          revertInvoiceState(activeReservation.previousState);
          console.error('No se pudo asignar un número de factura tras reintento:', updateError);
          toast({
            title: "Error crítico",
            description: "No se pudo asignar un número de factura. Contacta al administrador.",
            variant: "destructive",
          });
          setIsProcessingSale(false);
          return;
        }
      }

      commitInvoiceState(invoiceTrackerRef.current);
      invoiceCommitted = true;
      reservedInvoice = activeReservation;
    }

    let finalInvoiceNumber = activeReservation?.invoiceNumber ?? invoiceNumber;

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
      console.warn('No se pudo verificar la factura almacenada:', fetchError);
    }

    // Obtener información de la tienda seleccionada dinámicamente
    let storeInfo = {};
    console.log('Verificando información de la tienda seleccionada:', {
      selectedStore: selectedStore,
      userProfile: userProfile,
      company_id: userProfile?.company_id
    });
    
    if (selectedStore) {
      // Usar la tienda seleccionada dinámicamente con información fiscal completa
      storeInfo = {
        name: selectedStore.name,
        business_name: selectedStore.business_name,
        tax_id: selectedStore.tax_id,
        fiscal_address: selectedStore.fiscal_address,
        phone_fiscal: selectedStore.phone_fiscal,
        email_fiscal: selectedStore.email_fiscal
      };
      console.log('Información fiscal de la tienda seleccionada obtenida:', storeInfo);
    } else {
      console.warn('No hay tienda seleccionada, usando información del usuario asignado');
      
      // Fallback: usar la tienda asignada al usuario
      if ((userProfile as any)?.assigned_store_id) {
        try {
          console.log('Obteniendo información de la tienda asignada con ID:', (userProfile as any).assigned_store_id);
          
          // OPTIMIZADO: Select Minimal - solo campos necesarios para facturación
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
            console.log('Información de la tienda asignada obtenida:', storeInfo);
          }
        } catch (error) {
          console.error('Error obteniendo información de la tienda asignada:', error);
        }
      }
    }

    // Preparar items para la factura (separar teléfonos con múltiples IMEIs)
    const invoiceItems = cart.flatMap(item => {
      if (item.category === 'phones' && item.imeis && item.imeis.length > 0) {
        // Para teléfonos con múltiples IMEIs, crear un item por cada IMEI
        return item.imeis.map(imei => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          imei: imei
        }));
      } else {
        // Para productos normales o teléfonos con un solo IMEI
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
      customer: selectedCustomer?.name || 'Cliente General',
      customer_id: selectedCustomer?.id_number || null,
      items: invoiceItems, // Usar los items procesados con IMEIs separados
      subtotal_usd: cartSubtotal,
      tax_amount_usd: 0, // El IVA se calcula en el backend
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
      // Cuando ninguno está activo, será 0 (comportamiento original)
      krece_initial_amount: isKreceEnabled ? kreceInitialAmount : 
                            isCasheaEnabled ? casheaInitialAmount : 0,
      krece_financed_amount: isKreceEnabled ? (cartSubtotal - kreceInitialAmount) :
                             isCasheaEnabled ? (cartSubtotal - casheaInitialAmount) : 0,
      krece_initial_percentage: isKreceEnabled && cartSubtotal > 0 ? ((kreceInitialAmount / cartSubtotal) * 100) :
                                isCasheaEnabled && cartSubtotal > 0 ? ((casheaInitialAmount / cartSubtotal) * 100) : 0,
      financing_type: isKreceEnabled ? 'krece' : (isCasheaEnabled ? 'cashea' : null)
    };

    console.log('Datos de venta preparados:', saleData);

    // Mostrar toast de confirmación
    toast({
      title: "✅ Venta completada",
      description: `Factura ${finalInvoiceNumber} generada exitosamente.`,
      duration: 3000,
    });

    // BLOQUEO: Establecer estado de venta completada ANTES de mostrar el modal
    setIsSaleConfirmedAndCompleted(true);
    
    // Mostrar modal de completado
    console.log('🎉 POS - Venta exitosa, abriendo SaleCompletionModal con datos:', saleData.invoice_number);
    setCompletedSaleData(saleData);
    setShowSaleModal(true);
    console.log('🎉 POS - showSaleModal establecido a TRUE');
    
    // Limpiar formulario
    setCart([]);
    setSelectedCustomer(null);
    setSelectedPaymentMethod("");
    setIsKreceEnabled(false);
    setKreceInitialAmount(0);
    setIsCasheaEnabled(false);
    setCasheaInitialAmount(0);
    setIsMixedPayment(false);
    setMixedPayments([]);
    
    // El modal se cierra automáticamente después de 5 segundos
    setIsProcessingSale(false);
    
    console.log('Venta procesada exitosamente:', data);
    
  } catch (error) {
    console.error('Error al procesar la venta:', error);
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





