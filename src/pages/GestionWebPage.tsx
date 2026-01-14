import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Edit, 
  Save, 
  X, 
  Image as ImageIcon,
  Eye,
  EyeOff,
  Package,
  DollarSign,
  Globe,
  AlertCircle,
  Upload,
  Loader2,
  Pencil,
  Check,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { PriceListModal, PriceListParams } from '@/components/web/PriceListModal';
import { downloadPriceListPDF } from '@/utils/priceListPdfGenerator';

// ============================================================================
// INTERFACES
// ============================================================================

interface WebProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  sale_price_usd: number;
  tax_rate: number;
  active: boolean;
  total_stock: number;
  web_image_url: string | null;
  web_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface EditingProduct extends WebProduct {
  temp_sale_price_usd: number;
  temp_image_url: string;
  temp_visible: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const GestionWebPage: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  // Estados
  const [products, setProducts] = useState<WebProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all'); // all, visible, hidden
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // ✅ Estado para edición inline de precio
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  
  // ✅ Estado para modal de lista de precios
  const [showPriceListModal, setShowPriceListModal] = useState(false);
  const [generatingPriceList, setGeneratingPriceList] = useState(false);

  // ============================================================================
  // CARGA DE PRODUCTOS (Solo Lectura - Usa RPC)
  // ============================================================================

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // ✅ USAR FUNCIÓN RPC: get_web_products_catalog()
      // Esta función EXCLUYE cost_usd y retorna stock total calculado
      const { data, error } = await supabase.rpc('get_web_products_catalog');

      if (error) {
        console.error('Error fetching web products:', error);
        throw error;
      }

      // Transformar datos a formato WebProduct
      const webProducts: WebProduct[] = (data || []).map((item: any) => ({
        id: item.id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        sale_price_usd: item.sale_price_usd,
        tax_rate: item.tax_rate || 0,
        active: item.active,
        total_stock: item.total_stock || 0,
        web_image_url: item.web_image_url || null,
        // ✅ REGLA: Si no hay imagen, forzar visible = false
        // ✅ REGLA: web_visible solo puede ser true si hay imagen
        // Si no hay imagen, siempre false (oculto por defecto)
        // Si hay imagen, usar el valor de la BD (puede ser true o false)
        // IMPORTANTE: web_visible puede ser false incluso si hay imagen (producto oculto)
        web_visible: (item.web_image_url && item.web_image_url.trim()) 
          ? (item.web_visible === true)  // ✅ Solo true si explícitamente es true en BD
          : false,  // ✅ Sin imagen = siempre oculto
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      // ✅ Log para verificar qué producto se encontró
      const targetProduct = webProducts.find(p => p.id === 'e61c2270-823f-47db-9531-8d04c7e3a853');
      if (targetProduct) {
        console.log('📦 Producto encontrado en lista recargada:', {
          id: targetProduct.id,
          name: targetProduct.name,
          web_image_url: targetProduct.web_image_url,
          web_visible: targetProduct.web_visible,
          updated_at: targetProduct.updated_at
        });
      } else {
        console.warn('⚠️ Producto NO encontrado en lista recargada');
      }

      setProducts(webProducts);
      console.log(`✅ ${webProducts.length} productos cargados en estado`);
    } catch (error: any) {
      console.error('Error in fetchProducts:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los productos",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ VALIDACIÓN: Solo admins pueden acceder
    if (userProfile?.role === 'admin' || userProfile?.role === 'master_admin') {
      fetchProducts();
    } else {
      setLoading(false);
    }
  }, [userProfile?.role]);

  // ============================================================================
  // CARGA DE IMAGEN A SUPABASE STORAGE
  // ============================================================================

  const handleImageUpload = async (file: File) => {
    if (!editingProduct || !userProfile?.company_id) {
      return;
    }

    setUploadingImage(true);

    try {
      // ✅ Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo de archivo inválido",
          description: "Solo se permiten imágenes JPG, PNG o WEBP",
          variant: "destructive",
        });
        return;
      }

      // ✅ Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        toast({
          title: "Archivo muy grande",
          description: "La imagen no debe superar los 5MB",
          variant: "destructive",
        });
        return;
      }

      // ✅ Generar nombre único para el archivo (mismo nombre siempre para el mismo producto)
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingProduct.id}.${fileExt}`; // ✅ Mismo nombre siempre (se sobrescribe)
      const folderPath = `${userProfile.company_id}/`;
      const filePath = `${folderPath}${fileName}`; // ✅ Path relativo al bucket: company_id/product_id.ext

      console.log('📤 Iniciando subida de imagen:', {
        fileName,
        folderPath,
        filePath,
        productId: editingProduct.id,
        companyId: userProfile.company_id
      });

      // ✅ PASO 1: BORRAR TODAS las imágenes anteriores de este producto (limpieza completa)
      try {
        const productIdStr = editingProduct.id;
        const allFilesToDelete: string[] = [];
        
        // ✅ 1.1: Extraer path de la imagen vieja desde la URL almacenada en BD (si existe)
        if (editingProduct.web_image_url && editingProduct.web_image_url.trim()) {
          const oldUrl = editingProduct.web_image_url;
          console.log('🔍 Analizando URL de imagen vieja:', oldUrl);
          
          // Intentar extraer el path desde diferentes formatos de URL
          let oldPath: string | null = null;
          
          // Formato: https://[project].supabase.co/storage/v1/object/public/product-images/[path]
          if (oldUrl.includes('/storage/v1/object/public/product-images/')) {
            const urlParts = oldUrl.split('/storage/v1/object/public/product-images/');
            if (urlParts.length > 1) {
              oldPath = urlParts[1].split('?')[0]; // Remover query params si existen
              console.log('📂 Path extraído desde URL (dentro de product-images):', oldPath);
            }
          }
          // Formato: https://[project].supabase.co/storage/v1/object/public/[path] (fuera del bucket)
          else if (oldUrl.includes('/storage/v1/object/public/')) {
            const urlParts = oldUrl.split('/storage/v1/object/public/');
            if (urlParts.length > 1) {
              const fullPath = urlParts[1].split('?')[0];
              // Si el path empieza con company_id, es una imagen fuera del bucket
              if (fullPath.startsWith(userProfile.company_id)) {
                oldPath = fullPath;
                console.log('📂 Path extraído desde URL (fuera de product-images):', oldPath);
              }
            }
          }
          
          // Si encontramos un path, intentar borrarlo
          if (oldPath) {
            // Intentar borrar desde product-images (ubicación correcta)
            allFilesToDelete.push(oldPath);
            console.log('🗑️ Agregado a lista de borrado (desde URL vieja):', oldPath);
          }
        }
        
        // ✅ 1.2: Buscar en la carpeta correcta dentro del bucket (company_id/)
        console.log('🔍 Buscando archivos en carpeta correcta:', folderPath);
        const { data: files1, error: listError1 } = await supabase.storage
          .from('product-images')
          .list(folderPath, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          });
        
        if (listError1) {
          console.warn('⚠️ Error al listar archivos en carpeta correcta:', listError1);
        } else if (files1) {
          console.log('📁 Archivos encontrados en carpeta correcta:', files1.map(f => f.name));
          const filesInFolder = files1
            .filter(file => file.name.startsWith(productIdStr))
            .map(file => `${folderPath}${file.name}`);
          allFilesToDelete.push(...filesInFolder);
          console.log('🗑️ Archivos a borrar de carpeta correcta:', filesInFolder);
        }
        
        // ✅ 1.3: Eliminar duplicados y borrar todos los archivos encontrados
        const uniqueFilesToDelete = [...new Set(allFilesToDelete)];
        
        if (uniqueFilesToDelete.length > 0) {
          console.log('🗑️ Intentando borrar archivos (sin duplicados):', uniqueFilesToDelete);
          const { error: bulkDeleteError } = await supabase.storage
            .from('product-images')
            .remove(uniqueFilesToDelete);
          
          if (bulkDeleteError) {
            console.error('❌ Error al borrar archivos:', bulkDeleteError);
            console.warn('⚠️ No se pudieron borrar archivos anteriores:', bulkDeleteError);
          } else {
            console.log(`✅ ${uniqueFilesToDelete.length} archivo(s) anterior(es) borrado(s):`, uniqueFilesToDelete);
          }
        } else {
          console.log('ℹ️ No se encontraron archivos anteriores para borrar');
        }
      } catch (deleteError) {
        // Si falla al borrar, continuar de todas formas (no crítico)
        console.error('❌ Error al limpiar imágenes anteriores:', deleteError);
      }

      // ✅ PASO 2: Subir nueva imagen (siempre con upsert para sobrescribir si existe)
      console.log('⬆️ Subiendo archivo a:', filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // ✅ Siempre sobrescribir si existe
        });

      if (uploadError) {
        console.error('❌ Error al subir archivo:', uploadError);
        console.error('❌ Detalles del error:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError.error
        });
        throw uploadError;
      }

      if (!uploadData) {
        console.error('❌ uploadData es null o undefined');
        throw new Error('No se recibió respuesta del servidor al subir la imagen');
      }

      console.log('✅ Archivo subido exitosamente:', uploadData);
      console.log('✅ Detalles del upload:', {
        path: uploadData.path,
        fullPath: uploadData.fullPath,
        id: uploadData.id
      });

      // ✅ Obtener URL pública de la imagen
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // ✅ Agregar timestamp para evitar cache del navegador
      const publicUrlWithCache = `${publicUrl}?t=${Date.now()}`;

      console.log('🔗 URL pública generada:', publicUrl);
      console.log('🔗 URL con cache busting:', publicUrlWithCache);

      // ✅ Actualizar estado local con la nueva URL (con cache busting)
      setEditingProduct(prev => {
        const updated = {
          ...prev,
          temp_image_url: publicUrlWithCache,
          temp_visible: true, // ✅ Auto-activar visibilidad cuando se sube imagen
        };
        console.log('✅ Estado actualizado después de subir imagen:', {
          temp_image_url: updated.temp_image_url,
          temp_visible: updated.temp_visible,
          productId: updated.id,
          switch_habilitado: true,
          switch_activado: true
        });
        return updated;
      });

      toast({
        title: "Imagen subida exitosamente",
        description: "La imagen se guardará al guardar los cambios. El producto se mostrará como visible automáticamente.",
        variant: "success",
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error al subir imagen",
        description: error.message || "No se pudo subir la imagen",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Limpiar input para permitir seleccionar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // FILTROS
  // ============================================================================

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Filtro de búsqueda
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de categoría
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

      // Filtro de visibilidad
      const matchesVisibility = 
        visibilityFilter === 'all' ||
        (visibilityFilter === 'visible' && product.web_visible) ||
        (visibilityFilter === 'hidden' && !product.web_visible);

      return matchesSearch && matchesCategory && matchesVisibility;
    });
  }, [products, searchTerm, categoryFilter, visibilityFilter]);

  // ============================================================================
  // EDICIÓN DE PRODUCTO
  // ============================================================================

  const openEditDialog = (product: WebProduct) => {
    // ✅ REGLA: Si no hay imagen, forzar visible = false
    // ✅ REGLA: El estado visible solo puede ser true si hay imagen
    const hasImage = product.web_image_url && product.web_image_url.trim();
    const safeVisible = hasImage ? (product.web_visible || false) : false;
    
    console.log('📝 Abriendo modal de edición:', {
      productId: product.id,
      productName: product.name,
      hasImage: hasImage,
      web_visible_from_db: product.web_visible,
      safeVisible: safeVisible
    });
    
    setEditingProduct({
      ...product,
      temp_sale_price_usd: product.sale_price_usd,
      temp_image_url: product.web_image_url || '',
      temp_visible: safeVisible, // ✅ Forzar false si no hay imagen
    });
  };

  const closeEditDialog = () => {
    setEditingProduct(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ✅ FUNCIÓN: Actualizar solo el precio (edición inline)
  const handleInlinePriceUpdate = async (productId: string, newPrice: number) => {
    // Validar precio (solo números enteros, sin decimales)
    if (newPrice <= 0 || isNaN(newPrice) || !Number.isInteger(newPrice)) {
      toast({
        title: "Error de validación",
        description: "El precio debe ser un número entero mayor a 0 (sin decimales)",
        variant: "destructive",
      });
      return;
    }

    setSavingPrice(true);
    
    try {
      // Obtener el producto actual para mantener imagen y visibilidad
      const currentProduct = products.find(p => p.id === productId);
      if (!currentProduct) {
        throw new Error('Producto no encontrado');
      }

      // Limpiar cache busting de la URL si existe
      const cleanImageUrl = currentProduct.web_image_url 
        ? currentProduct.web_image_url.split('?')[0].trim() 
        : null;

      console.log('💰 Actualizando precio inline:', {
        productId: productId,
        productName: currentProduct.name,
        oldPrice: currentProduct.sale_price_usd,
        newPrice: newPrice,
        imageUrl: cleanImageUrl,
        visible: currentProduct.web_visible
      });

      // ✅ USAR LA MISMA FUNCIÓN RPC que el modal
      // Esto garantiza que se actualice en products.sale_price_usd
      // y se refleje automáticamente en Almacén/Artículos
      const { data, error } = await supabase.rpc('sync_web_product_price', {
        p_product_id: productId,
        p_sale_price_usd: newPrice, // ✅ Nuevo precio
        p_web_image_url: cleanImageUrl, // ✅ Mantener imagen actual
        p_web_visible: currentProduct.web_visible === true, // ✅ Mantener visibilidad actual
      });

      if (error) {
        console.error('❌ Error al actualizar precio:', error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al actualizar precio');
      }

      console.log('✅ Precio actualizado exitosamente:', {
        previous_price: data.previous_price,
        new_price: data.new_price,
        product_name: data.product_name
      });

      toast({
        title: "Precio actualizado",
        description: `Precio actualizado a $${newPrice.toFixed(2)}. El cambio se refleja en todos los módulos.`,
        variant: "success",
      });

      // Recargar productos para reflejar el cambio
      await fetchProducts();
      
      // Cerrar edición inline
      setEditingPriceId(null);
      setEditingPriceValue('');
    } catch (error: any) {
      console.error('❌ Error updating price:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el precio",
        variant: "destructive",
      });
    } finally {
      setSavingPrice(false);
    }
  };

  // ✅ FUNCIÓN: Iniciar edición inline de precio
  const startInlinePriceEdit = (product: WebProduct) => {
    setEditingPriceId(product.id);
    setEditingPriceValue(product.sale_price_usd.toString());
  };

  // ✅ FUNCIÓN: Cancelar edición inline de precio
  const cancelInlinePriceEdit = () => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  // ✅ FUNCIÓN UNIFICADA: Actualizar visibilidad (usada por tabla y modal)
  // REGLAS DE NEGOCIO:
  // 1. Un producto SIN imagen NO puede ser visible (siempre false)
  // 2. Un producto CON imagen PUEDE ser visible (true) o NO visible (false) - admin decide
  // 3. Si se intenta activar sin imagen → error, no se guarda
  // 4. Si se intenta ocultar (con o sin imagen) → se guarda correctamente
  // 5. Cuando hay imagen y solo se cambia visibilidad → enviar la imagen actual al RPC
  const handleToggleVisibility = async (
    productId: string,
    currentImageUrl: string | null,
    currentPrice: number,
    newVisible: boolean
  ) => {
    // ✅ REGLA 1: Normalizar y validar imagen
    // Limpiar cache busting si existe
    const cleanImageUrl = currentImageUrl ? currentImageUrl.split('?')[0].trim() : null;
    const hasImage = cleanImageUrl && cleanImageUrl.length > 0;
    
    console.log('🔍 Validación de imagen en handleToggleVisibility:', {
      productId,
      currentImageUrl,
      cleanImageUrl,
      hasImage,
      newVisible
    });
    
    // ✅ REGLA 2: Validar que si se intenta activar, debe haber imagen
    if (newVisible && !hasImage) {
      toast({
        title: "No se puede hacer visible",
        description: "Para hacer visible el producto, primero debes cargar una imagen. Un producto visible debe tener una URL de imagen.",
        variant: "destructive",
      });
      return;
    }

    // ✅ REGLA 3: Calcular visibilidad final
    // - Si hay imagen y newVisible = true → finalVisible = true (mostrar)
    // - Si hay imagen y newVisible = false → finalVisible = false (ocultar)
    // - Si NO hay imagen → finalVisible = false (no puede ser visible)
    const finalVisible = hasImage && newVisible ? true : false;

    // ✅ REGLA 4: IMPORTANTE - Si hay imagen, SIEMPRE enviarla al RPC para asegurar que se mantiene
    // Esto es crucial cuando queremos activar un producto que estaba oculto pero tiene imagen
    const imageUrlToSend = hasImage ? cleanImageUrl : null;

    console.log('🔄 Cambiando visibilidad (FUNCIÓN UNIFICADA):', {
      productId: productId,
      hasImage: !!hasImage,
      currentImageUrl: currentImageUrl,
      imageUrlToSend: imageUrlToSend,
      newVisible: newVisible,
      finalVisible: finalVisible
    });

    try {
      console.log('📤 Enviando al RPC sync_web_product_price:', {
        p_product_id: productId,
        p_sale_price_usd: currentPrice,
        p_web_image_url: imageUrlToSend,
        p_web_visible: finalVisible
      });

      // Llamar al RPC para actualizar solo la visibilidad (mantener precio e imagen iguales)
      const { data, error } = await supabase.rpc('sync_web_product_price', {
        p_product_id: productId,
        p_sale_price_usd: currentPrice, // Mantener el precio actual
        p_web_image_url: imageUrlToSend, // Mantener la imagen actual (si existe) o null
        p_web_visible: finalVisible, // Nueva visibilidad
      });

      if (error) {
        console.error('❌ Error al actualizar visibilidad:', error);
        throw error;
      }

      console.log('✅ Respuesta completa del RPC:', data);

      if (!data?.success) {
        console.error('❌ RPC retornó success=false:', data);
        throw new Error(data?.error || 'Error al actualizar visibilidad');
      }

      console.log('✅ Visibilidad actualizada exitosamente en BD:', {
        visible_saved: data.visible_saved,
        visible_final: data.visible_final,
        image_url_old: data.image_url_old,
        image_url_final: data.image_url_final
      });

      // Verificar que se guardó correctamente
      if (data.visible_final !== finalVisible) {
        console.warn('⚠️ ADVERTENCIA: La visibilidad guardada no coincide con la esperada:', {
          esperada: finalVisible,
          guardada: data.visible_final
        });
      }

      toast({
        title: "Visibilidad actualizada",
        description: `Producto ${finalVisible ? 'visible' : 'oculto'} en el catálogo web${!finalVisible && hasImage ? '. El producto tiene imagen pero está oculto.' : ''}`,
        variant: "success",
      });

      // Recargar productos para reflejar cambios
      console.log('🔄 Recargando lista de productos después de cambiar visibilidad...');
      await fetchProducts();
      console.log('✅ Lista de productos recargada');
    } catch (error: any) {
      console.error('❌ Error updating visibility:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la visibilidad en la base de datos",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!editingProduct) return;

    // ✅ VALIDACIÓN 1: Precio debe ser positivo
    if (editingProduct.temp_sale_price_usd <= 0) {
      toast({
        title: "Error de validación",
        description: "El precio de venta debe ser mayor a 0",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDACIÓN 2: Si el usuario intenta activar visible = true sin imagen, bloquear
    // Pero si solo está cambiando el precio y visible ya está en false, permitirlo
    if (editingProduct.temp_visible && !editingProduct.temp_image_url?.trim()) {
      toast({
        title: "Error de validación",
        description: "Un producto visible debe tener una URL de imagen. Desactiva la visibilidad o agrega una imagen.",
        variant: "destructive",
      });
      return;
    }

    // ✅ VALIDACIÓN 3: Si no hay image_url, forzar visible = false (permitir actualizar precio)
    const finalVisible = editingProduct.temp_image_url?.trim() 
      ? editingProduct.temp_visible 
      : false;

    // ✅ LIMPIEZA: Si el usuario borró la URL manualmente, borrar imagen del Storage
    const hadImageBefore = editingProduct.web_image_url && editingProduct.web_image_url.trim();
    const hasImageNow = editingProduct.temp_image_url && editingProduct.temp_image_url.trim();
    
    if (hadImageBefore && !hasImageNow) {
      // Usuario borró la URL, intentar borrar la imagen del Storage
      try {
        const oldUrl = editingProduct.web_image_url;
        if (oldUrl.includes('supabase.co/storage/v1/object/public/product-images/')) {
          const urlParts = oldUrl.split('product-images/');
          if (urlParts.length > 1) {
            const oldFilePath = `product-images/${urlParts[1]}`;
            await supabase.storage
              .from('product-images')
              .remove([oldFilePath]);
            console.log('✅ Imagen anterior borrada del Storage');
          }
        }
      } catch (deleteError) {
        // Si falla al borrar, continuar de todas formas (no crítico)
        console.warn('⚠️ No se pudo borrar la imagen anterior del Storage:', deleteError);
      }
    }

    setSaving(true);

    try {
      // ✅ Limpiar timestamp de cache busting de la URL antes de guardar en BD
      const rawImageUrl = editingProduct.temp_image_url?.trim() || '';
      const cleanImageUrl = rawImageUrl 
        ? rawImageUrl.split('?')[0].trim() // Remover query params (cache busting) y espacios
        : null;
      
      // ✅ Asegurar que si la URL está vacía después del trim, se pase como null
      const finalImageUrl = cleanImageUrl && cleanImageUrl.length > 0 ? cleanImageUrl : null;

      console.log('💾 Guardando cambios:', {
        productId: editingProduct.id,
        price: editingProduct.temp_sale_price_usd,
        rawImageUrl: rawImageUrl,
        cleanImageUrl: cleanImageUrl,
        finalImageUrl: finalImageUrl,
        imageUrlLength: finalImageUrl?.length || 0,
        visible: finalVisible,
        temp_image_url_original: editingProduct.temp_image_url
      });

      // ✅ USAR FUNCIÓN RPC: sync_web_product_price()
      // Esta función actualiza atomicamente:
      // 1. products.sale_price_usd (se refleja instantáneamente en Almacén/Artículos)
      // 2. web_product_metadata (image_url, visible) - Si image_url es null, se limpia en BD
      const rpcParams = {
        p_product_id: editingProduct.id,
        p_sale_price_usd: editingProduct.temp_sale_price_usd,
        p_web_image_url: finalImageUrl, // ✅ URL limpia (sin cache busting) o null si está vacía
        p_web_visible: finalVisible,
      };
      
      console.log('📤 Parámetros enviados al RPC:', {
        ...rpcParams,
        p_web_image_url_length: finalImageUrl?.length || 0,
        p_web_image_url_is_null: finalImageUrl === null,
        p_web_image_url_is_empty: finalImageUrl === '',
        p_web_image_url_type: typeof finalImageUrl
      });

      const { data, error } = await supabase.rpc('sync_web_product_price', rpcParams);

      if (error) {
        console.error('❌ Error en RPC sync_web_product_price:', error);
        throw error;
      }

      console.log('✅ Respuesta del RPC:', data);

      if (!data?.success) {
        console.error('❌ RPC retornó success=false:', data);
        throw new Error(data?.error || 'Error al sincronizar producto');
      }

      console.log('✅ Producto sincronizado exitosamente:', {
        productId: editingProduct.id,
        previousPrice: data.previous_price,
        newPrice: data.new_price,
        imageUrlSent: cleanImageUrl,
        imageUrlOld: data.image_url_old,  // ✅ Imagen anterior
        imageUrlFinal: data.image_url_final,  // ✅ Imagen final guardada
        visibleSent: finalVisible,
        visibleFinal: data.visible_final,
        imageUpdated: data.image_url_old !== data.image_url_final  // ✅ ¿Se actualizó la imagen?
      });

      // ✅ Construir mensaje del toast con información de imagen
      let toastDescription = `Precio: $${data.previous_price} → $${data.new_price}`;
      if (data.image_url_final) {
        toastDescription += ` | Imagen: ${data.image_url_final ? '✅ Guardada' : '❌ No guardada'}`;
      }

      toast({
        title: "Producto sincronizado",
        description: toastDescription,
        variant: "success",
      });

      // Recargar productos para reflejar cambios
      console.log('🔄 Recargando lista de productos...');
      await fetchProducts();
      console.log('✅ Lista de productos recargada');
      
      closeEditDialog();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo sincronizar el producto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // GENERACIÓN DE LISTA DE PRECIOS PDF
  // ============================================================================

  const handleGeneratePriceList = async (params: PriceListParams) => {
    setGeneratingPriceList(true);
    try {
      // Filtrar productos según los parámetros
      let filteredProducts = products.filter(product => {
        // Filtro de categoría
        if (product.category !== params.category) {
          return false;
        }

        // Filtro de visibilidad
        if (params.onlyVisible && !product.web_visible) {
          return false;
        }

        // Filtro de stock
        if (params.onlyWithStock && product.total_stock === 0) {
          return false;
        }

        return true;
      });

      if (filteredProducts.length === 0) {
        toast({
          title: "Sin productos",
          description: "No se encontraron productos que coincidan con los filtros seleccionados",
          variant: "destructive",
        });
        return;
      }

      // Convertir a formato esperado por el generador de PDF
      const productsForPDF = filteredProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        sale_price_usd: p.sale_price_usd,
        total_stock: p.total_stock,
        web_visible: p.web_visible,
      }));

      // Generar y descargar PDF
      await downloadPriceListPDF(productsForPDF, params);

      toast({
        title: "PDF generado",
        description: `Lista de precios generada con ${filteredProducts.length} productos`,
        variant: "success",
      });

      setShowPriceListModal(false);
    } catch (error: any) {
      console.error('Error generating price list PDF:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo generar el PDF de la lista de precios",
        variant: "destructive",
      });
    } finally {
      setGeneratingPriceList(false);
    }
  };

  // ============================================================================
  // VALIDACIÓN DE PERMISOS
  // ============================================================================

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-md h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (userProfile.role !== 'admin' && userProfile.role !== 'master_admin') {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="border-red-500/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              Solo los administradores pueden acceder al módulo de Gestión Web.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Globe className="w-8 h-8" />
            Gestión Web
          </h1>
          <p className="text-white/70 mt-1">
            Sincronización de productos con catálogo web público
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowPriceListModal(true)} 
            className="bg-primary-dark text-white hover:bg-primary-dark/90"
          >
            <FileText className="w-4 h-4 mr-2" />
            Generar Lista de Precios
          </Button>
          <Button onClick={fetchProducts} variant="outline">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/90 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 glass-input"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] glass-input">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-full md:w-[200px] glass-input">
                <SelectValue placeholder="Visibilidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="visible">Visibles</SelectItem>
                <SelectItem value="hidden">Ocultas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Productos - Tabla */}
      {loading ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No se encontraron productos</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead>Nombre del Producto</TableHead>
                    <TableHead className="w-[100px] text-right">Stock</TableHead>
                    <TableHead className="w-[120px] text-right">Precio (USD)</TableHead>
                    <TableHead className="w-[120px] text-center">Visibilidad</TableHead>
                    <TableHead className="w-[100px] text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow 
                      key={product.id}
                      className={`group ${product.web_visible ? '' : 'opacity-75'}`}
                    >
                      {/* Imagen - Miniatura pequeña */}
                      <TableCell>
                        {product.web_image_url ? (
                          <div className="relative w-12 h-12 rounded overflow-hidden border border-white/10 bg-muted flex-shrink-0">
                            <img
                              key={`${product.id}-${product.updated_at}`}
                              src={`${product.web_image_url}${product.web_image_url.includes('?') ? '&' : '?'}t=${new Date(product.updated_at).getTime()}`}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('❌ Error al cargar imagen en miniatura:', product.web_image_url);
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3ESin imagen%3C/text%3E%3C/svg%3E';
                              }}
                              onLoad={() => {
                                console.log('✅ Imagen cargada en miniatura:', product.web_image_url);
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded border border-white/10 bg-muted flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-white/40" />
                          </div>
                        )}
                      </TableCell>

                      {/* Nombre del Producto */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-white">{product.name}</div>
                          <div className="flex items-center gap-2">
                            {product.web_visible ? (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/50 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Visible
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Oculto
                              </Badge>
                            )}
                            <span className="text-xs text-white/60">SKU: {product.sku}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Stock */}
                      <TableCell>
                        <div className="text-right">
                          <span className={`font-semibold ${
                            product.total_stock === 0 ? 'text-red-400' : 'text-blue-400'
                          }`}>
                            {product.total_stock}
                          </span>
                        </div>
                      </TableCell>

                      {/* Precio (USD) - Edición Inline */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {editingPriceId === product.id ? (
                            // ✅ Modo edición: Input editable
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="1"
                                min="1"
                                value={editingPriceValue}
                                onChange={(e) => {
                                  // ✅ Solo permitir números enteros (sin decimales)
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    setEditingPriceValue(value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const newPrice = parseInt(editingPriceValue);
                                    if (!isNaN(newPrice) && newPrice > 0) {
                                      handleInlinePriceUpdate(product.id, newPrice);
                                    }
                                  } else if (e.key === 'Escape') {
                                    cancelInlinePriceEdit();
                                  }
                                }}
                                className="w-24 h-8 text-sm text-right bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-accent-primary"
                                autoFocus
                                disabled={savingPrice}
                                placeholder="0"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const newPrice = parseFloat(editingPriceValue);
                                  if (!isNaN(newPrice) && newPrice > 0) {
                                    handleInlinePriceUpdate(product.id, newPrice);
                                  }
                                }}
                                disabled={savingPrice}
                                className="h-8 w-8 p-0"
                              >
                                {savingPrice ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 text-green-400" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelInlinePriceEdit}
                                disabled={savingPrice}
                                className="h-8 w-8 p-0"
                              >
                                <X className="w-4 h-4 text-red-400" />
                              </Button>
                            </div>
                          ) : (
                            // ✅ Modo visualización: Mostrar precio con botón de editar (siempre visible)
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-accent-primary">
                                ${product.sale_price_usd.toFixed(2)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startInlinePriceEdit(product)}
                                className="h-6 w-6 p-0 opacity-70 hover:opacity-100 transition-opacity"
                                title="Editar precio (clic para editar inline)"
                              >
                                <Pencil className="w-3 h-3 text-white/60 hover:text-accent-primary" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Visibilidad - Switch con indicador visual */}
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              isSelected={product.web_visible === true && !!product.web_image_url?.trim()}
                              isDisabled={!product.web_image_url?.trim()}
                              onChange={(checked) => {
                                console.log('🔄 Switch de tabla cambiado:', {
                                  productId: product.id,
                                  productName: product.name,
                                  hasImage: !!product.web_image_url?.trim(),
                                  web_image_url: product.web_image_url,
                                  currentVisible: product.web_visible,
                                  newChecked: checked
                                });
                                
                                // ✅ VALIDACIÓN: Asegurar que si hay imagen, siempre se pueda activar
                                if (checked && !product.web_image_url?.trim()) {
                                  toast({
                                    title: "No se puede hacer visible",
                                    description: "El producto no tiene imagen. Sube una imagen primero.",
                                    variant: "destructive",
                                  });
                                  return;
                                }
                                
                                // ✅ Usar función unificada con parámetros explícitos
                                handleToggleVisibility(
                                  product.id,
                                  product.web_image_url || null, // Asegurar que siempre sea string o null
                                  product.sale_price_usd,
                                  checked
                                );
                              }}
                              className={cn(
                                // ✅ Personalizar colores del switch (igual que Users.tsx pero invertido)
                                '[&>div>div:first-child]:bg-red-500', // Rojo por defecto (oculto)
                                '[&>div>div:first-child]:data-[selected]:bg-green-500', // Verde cuando está visible
                                '[&>div>div:first-child]:data-[selected]:border-green-600', // Borde verde cuando está visible
                                '[&>div>div:first-child]:opacity-100' // Opacidad completa
                              )}
                            >
                              <span className={cn(
                                "text-xs font-medium",
                                product.web_visible === true && product.web_image_url?.trim()
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              )}>
                                {product.web_visible === true && product.web_image_url?.trim() ? 'Visible' : 'Oculto'}
                              </span>
                            </Switch>
                          </div>
                        </div>
                      </TableCell>

                      {/* Botón Editar */}
                      <TableCell>
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edición */}
      {editingProduct && (
        <Dialog open={!!editingProduct} onOpenChange={closeEditDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Editar Producto Web: {editingProduct.name}
              </DialogTitle>
              <DialogDescription>
                Los cambios se sincronizarán con el sistema POS
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Layout Principal: Imagen a la izquierda, Datos a la derecha */}
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                {/* Columna Izquierda: Imagen y Controles */}
                <div className="space-y-3">
                  {/* Vista Previa de Imagen */}
                  <div>
                    <Label className="text-white/90 font-medium mb-2 block">Imagen del Producto</Label>
                    {editingProduct.temp_image_url?.trim() ? (
                      <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-white/10 bg-white/5">
                        <img
                          src={editingProduct.temp_image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onLoad={() => {
                            console.log('✅ Imagen cargada exitosamente en vista previa:', editingProduct.temp_image_url);
                          }}
                          onError={(e) => {
                            console.error('❌ Error al cargar imagen en vista previa:', editingProduct.temp_image_url);
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23333"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3EImagen no válida%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-square rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                        <div className="text-center text-white/40">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                          <p className="text-xs">Sin imagen</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón Cambiar/Subir Imagen - Verde Glass */}
                  <div>
                    <input
                      ref={fileInputRef}
                      id="image_upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/50"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {editingProduct.temp_image_url ? 'Cambiar Imagen' : 'Subir Imagen'}
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-white/60 mt-1 text-center">
                      JPG, PNG, WEBP. Máx. 5MB
                    </p>
                  </div>

                  {/* URL de Imagen (Manual) */}
                  <div className="space-y-2">
                    <Label htmlFor="image_url" className="text-white/90 text-sm">
                      URL Externa (Alternativa)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="image_url"
                        type="url"
                        value={editingProduct.temp_image_url || ''}
                        onChange={(e) => {
                          const url = e.target.value;
                          const hasImage = url.trim().length > 0;
                          setEditingProduct({
                            ...editingProduct,
                            temp_image_url: url,
                            // ✅ REGLA: Si se elimina la imagen, forzar visible = false y deshabilitar switch
                            temp_visible: hasImage ? (editingProduct.temp_visible || true) : false,
                          });
                          console.log('📝 URL de imagen cambiada:', {
                            url: url,
                            hasImage: hasImage,
                            temp_visible_updated: hasImage ? (editingProduct.temp_visible || true) : false
                          });
                        }}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="glass-input text-sm flex-1"
                      />
                      {editingProduct.temp_image_url && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            console.log('🗑️ Borrando imagen manualmente');
                            setEditingProduct({
                              ...editingProduct,
                              temp_image_url: '',
                              // ✅ REGLA: Al borrar imagen, forzar visible = false
                              temp_visible: false,
                            });
                            toast({
                              title: "Imagen borrada",
                              description: "El producto se ocultará al guardar. El switch está deshabilitado hasta que agregues una nueva imagen.",
                              variant: "default",
                            });
                          }}
                          className="shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-white/60">
                      {editingProduct.temp_image_url 
                        ? 'Modifica la URL o usa el botón X para borrar la imagen'
                        : 'Sin imagen, el producto se ocultará automáticamente'}
                    </p>
                  </div>
                </div>

                {/* Columna Derecha: Datos del Producto */}
                <div className="space-y-4">
                  {/* Información del Producto (Solo Lectura) */}
                  <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                    <div className="space-y-4">
                      <div>
                        <span className="text-xs text-green-400/80 font-medium">SKU</span>
                        <p className="text-sm font-mono text-white mt-1 break-all">{editingProduct.sku}</p>
                      </div>
                      <div>
                        <span className="text-xs text-green-400/80 font-medium">Stock Total</span>
                        <p className={`text-xl font-bold mt-1 ${
                          editingProduct.total_stock === 0 ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {editingProduct.total_stock}
                        </p>
                        <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Se gestiona desde el módulo POS
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Precio de Venta */}
                  <div className="space-y-2">
                    <Label htmlFor="sale_price" className="text-white/90 font-medium">
                      Precio de Venta (USD) *
                    </Label>
                    <Input
                      id="sale_price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editingProduct.temp_sale_price_usd}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setEditingProduct({
                          ...editingProduct,
                          temp_sale_price_usd: value,
                        });
                      }}
                      className="glass-input text-lg font-semibold"
                    />
                    <p className="text-xs text-white/60">
                      Se sincroniza con POS y Almacén/Artículos
                    </p>
                  </div>

                  {/* Visibilidad */}
                  <div className="p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="visible" className="text-white/90 font-medium">
                          Visible en Web
                        </Label>
                        <p className="text-xs text-white/60">
                          {editingProduct.temp_image_url?.trim()
                            ? 'El producto será visible en el catálogo web público'
                            : '⚠️ No se puede hacer visible sin imagen. Sube una imagen usando el botón verde para habilitar esta opción.'}
                        </p>
                      </div>
                      <Switch
                        id="visible"
                        isSelected={editingProduct.temp_visible === true && !!editingProduct.temp_image_url?.trim()}
                        isDisabled={!editingProduct.temp_image_url?.trim()}
                        onChange={async (checked) => {
                          console.log('🔄 Switch de modal cambiado:', {
                            productId: editingProduct.id,
                            hasImage: !!editingProduct.temp_image_url?.trim(),
                            currentVisible: editingProduct.temp_visible,
                            newChecked: checked
                          });

                          // ✅ REGLA: Solo permitir visible = true si hay image_url
                          if (checked && !editingProduct.temp_image_url?.trim()) {
                            toast({
                              title: "No se puede hacer visible",
                              description: "Para hacer visible el producto, primero debes cargar una imagen. Sube una imagen usando el botón verde 'Subir Imagen'.",
                              variant: "destructive",
                            });
                            return;
                          }

                          // ✅ Usar función unificada (igual que en la tabla)
                          const currentImageUrl = editingProduct.temp_image_url?.trim() || null;
                          const willBeVisible = checked && currentImageUrl ? true : false;
                          
                          // Actualizar estado local primero para feedback inmediato
                          setEditingProduct({
                            ...editingProduct,
                            temp_visible: willBeVisible,
                          });

                          // Llamar a la función unificada
                          await handleToggleVisibility(
                            editingProduct.id,
                            currentImageUrl,
                            editingProduct.temp_sale_price_usd,
                            checked
                          );

                          // Recargar productos para actualizar el estado del modal
                          await fetchProducts();
                          
                          // Buscar el producto actualizado y actualizar el estado del modal
                          const updatedProduct = products.find(p => p.id === editingProduct.id);
                          if (updatedProduct) {
                            setEditingProduct({
                              ...editingProduct,
                              temp_visible: updatedProduct.web_visible === true,
                              temp_image_url: updatedProduct.web_image_url || '',
                            });
                          }
                        }}
                        className={cn(
                          // ✅ Personalizar colores del switch (igual que en la tabla)
                          '[&>div>div:first-child]:bg-red-500', // Rojo por defecto (oculto)
                          '[&>div>div:first-child]:data-[selected]:bg-green-500', // Verde cuando está visible
                          '[&>div>div:first-child]:data-[selected]:border-green-600', // Borde verde cuando está visible
                          '[&>div>div:first-child]:opacity-100' // Opacidad completa
                        )}
                      >
                        <span className={cn(
                          "text-xs font-medium",
                          editingProduct.temp_visible === true && editingProduct.temp_image_url?.trim()
                            ? 'text-green-400'
                            : 'text-red-400'
                        )}>
                          {editingProduct.temp_visible === true && editingProduct.temp_image_url?.trim() ? 'Visible' : 'Oculto'}
                        </span>
                      </Switch>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeEditDialog}
                disabled={saving || uploadingImage}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || uploadingImage}
                className="bg-primary-dark text-white hover:bg-primary-dark/90"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-md h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Lista de Precios */}
      <PriceListModal
        open={showPriceListModal}
        onClose={() => setShowPriceListModal(false)}
        onGenerate={handleGeneratePriceList}
      />
    </div>
  );
};

