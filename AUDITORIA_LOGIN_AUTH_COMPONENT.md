# 🔍 AUDITORÍA TÉCNICA: Componente Login/Auth

## 📋 RESUMEN EJECUTIVO

**Archivos Analizados:**
- `src/pages/AuthPage.tsx` - Componente contenedor principal
- `src/components/auth/LoginForm.tsx` - Formulario de inicio de sesión
- `src/components/auth/RegisterForm.tsx` - Formulario de registro

---

## 1️⃣ STATE MAP

### **AuthPage.tsx**
- `isLogin` (boolean) - Controla si se muestra LoginForm o RegisterForm
  - Valor inicial: `true`
  - Cambia mediante `toggleMode()`

### **LoginForm.tsx**
- `email` (string) - Email del usuario
  - Valor inicial: `''`
  - Actualizado por: `setEmail(e.target.value)`
  
- `password` (string) - Contraseña del usuario
  - Valor inicial: `''`
  - Actualizado por: `setPassword(e.target.value)`
  
- `loading` (boolean) - Estado de carga durante autenticación
  - Valor inicial: `false`
  - Se activa antes de `signIn()`, se desactiva en `finally`
  
- `error` (string | null) - Mensaje de error de autenticación
  - Valor inicial: `null`
  - Se establece si `signIn()` retorna error

### **RegisterForm.tsx**
- `formData` (object) - Estado combinado del formulario
  - Campos: `name`, `email`, `password`, `confirmPassword`
  - Valor inicial: Todos `''`
  - Actualizado por: `handleInputChange(field, value)`
  
- `loading` (boolean) - Estado de carga durante registro
  - Valor inicial: `false`
  
- `error` (string | null) - Mensaje de error de validación/registro
  - Valor inicial: `null`
  
- `success` (boolean) - Estado de éxito del registro
  - Valor inicial: `false`
  - Se activa cuando `signUp()` es exitoso
  
- `userEmail` (string) - Email del usuario registrado (para mostrar en modal)
  - Valor inicial: `''`
  - Se establece cuando `success = true`

---

## 2️⃣ HANDLERS

### **AuthPage.tsx**
- `toggleMode()` - Alterna entre modo Login y Register
  - Lógica: `setIsLogin(!isLogin)`
  - Se pasa como prop `onToggleMode` a los formularios

### **LoginForm.tsx**
- `handleSubmit(e: React.FormEvent)` - Maneja el envío del formulario
  - Flujo:
    1. `e.preventDefault()`
    2. `setLoading(true)`, `setError(null)`
    3. Llama a `signIn(email, password)` del contexto
    4. Si hay error → `setError(error.message)`
    5. Si no hay error → AuthContext maneja redirección automática
    6. `finally` → `setLoading(false)`
  - Nota: No maneja redirección manual, depende de `AuthContext`

### **RegisterForm.tsx**
- `handleInputChange(field: string, value: string)` - Actualiza campos del formulario
  - Lógica: `setFormData(prev => ({ ...prev, [field]: value }))`
  - Usado en todos los inputs mediante `onChange`

- `handleSubmit(e: React.FormEvent)` - Maneja el envío del formulario de registro
  - Flujo:
    1. `e.preventDefault()`
    2. `setLoading(true)`, `setError(null)`, `setSuccess(false)`
    3. Validaciones:
       - Nombre no vacío
       - Contraseñas coinciden
       - Contraseña mínimo 6 caracteres
    4. Consulta a `public.users` para verificar si email ya tiene perfil
    5. Extrae `company_id`, `role`, `assigned_store_id` del perfil existente (si existe)
    6. Llama a `signUp()` con metadata para trigger de base de datos
    7. Si éxito → `setSuccess(true)`, `setUserEmail(email)`
    8. Si error → `setError(error.message)`
    9. `setLoading(false)`

---

## 3️⃣ DEPENDENCIES

### **AuthPage.tsx**
- **React Hooks:**
  - `useState` - Para `isLogin`
  - `useEffect` - Para limpiar cache al montar
  
- **Utilidades:**
  - `clearAuthCache` - Función para limpiar cache de Supabase Auth
  
- **Componentes:**
  - `LoginForm` - Formulario de login
  - `RegisterForm` - Formulario de registro

### **LoginForm.tsx**
- **React Hooks:**
  - `useState` - Para email, password, loading, error
  
- **Contextos:**
  - `useAuth()` - Hook del contexto de autenticación
    - Extrae: `signIn(email, password)`
  
- **Componentes UI (Shadcn):**
  - `Button` - Botón de submit y toggle
  - `Input` - Campos de email y password
  - `Label` - Etiquetas de campos
  - `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` - Contenedor del formulario
  - `Alert`, `AlertDescription` - Mensaje de error
  
- **Iconos:**
  - `Loader2` (lucide-react) - Spinner de carga

### **RegisterForm.tsx**
- **React Hooks:**
  - `useState` - Para formData, loading, error, success, userEmail
  
- **Contextos:**
  - `useAuth()` - Hook del contexto de autenticación
    - Extrae: `signUp(email, password, companyName, userName, companyId?, role?, assignedStoreId?)`
  
- **Supabase Client:**
  - `supabase` - Cliente de Supabase para consultar `public.users`
    - Uso: Verificar si email ya tiene perfil creado por admin
  
- **Componentes UI (Shadcn):**
  - `Button` - Botón de submit y toggle
  - `Input` - Campos del formulario
  - `Label` - Etiquetas de campos
  - `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` - Contenedor del formulario
  - `Alert`, `AlertDescription` - Mensajes de error/éxito
  - `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle` - Modal de confirmación
  
- **Iconos:**
  - `Loader2`, `CheckCircle`, `Mail`, `ExternalLink` (lucide-react)

---

## 4️⃣ DOM STRUCTURE

### **AuthPage.tsx**
```
<div className="min-h-screen flex flex-col items-center justify-center bg-sidebar p-4">
  {/* Logo Container */}
  <div className="mb-8 flex justify-center">
    <img src="/logo_login.png" alt="Logo" />
  </div>
  
  {/* Form Container - Conditional Rendering */}
  <div className="w-full max-w-md">
    {isLogin ? <LoginForm /> : <RegisterForm />}
  </div>
</div>
```

### **LoginForm.tsx**
```
<Card>
  <CardHeader>
    <CardTitle>Iniciar Sesión</CardTitle>
    <CardDescription>Ingresa tus credenciales...</CardDescription>
  </CardHeader>
  
  <CardContent>
    <form onSubmit={handleSubmit}>
      {/* Error Alert - Conditional */}
      {error && <Alert variant="destructive">...</Alert>}
      
      {/* Email Input */}
      <div>
        <Label>Correo Electrónico</Label>
        <Input type="email" value={email} onChange={...} />
      </div>
      
      {/* Password Input */}
      <div>
        <Label>Contraseña</Label>
        <Input type="password" value={password} onChange={...} />
      </div>
      
      {/* Submit Button */}
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 />}
        Iniciar Sesión
      </Button>
      
      {/* Toggle to Register */}
      <Button variant="link" onClick={onToggleMode}>
        ¿No tienes cuenta? Registrar empresa
      </Button>
    </form>
  </CardContent>
</Card>
```

### **RegisterForm.tsx**
```
<>
  <Card>
    <CardHeader>
      <CardTitle>Registrar Usuario</CardTitle>
      <CardDescription>Crea tu cuenta...</CardDescription>
    </CardHeader>
    
    <CardContent>
      <form onSubmit={handleSubmit}>
        {/* Error Alert - Conditional */}
        {error && <Alert variant="destructive">...</Alert>}
        
        {/* Success Alert - Conditional */}
        {success && <Alert variant="success">...</Alert>}
        
        {/* Name Input */}
        <div>
          <Label>Nombre Completo</Label>
          <Input type="text" value={formData.name} onChange={...} />
        </div>
        
        {/* Email Input */}
        <div>
          <Label>Correo Electrónico</Label>
          <Input type="email" value={formData.email} onChange={...} />
        </div>
        
        {/* Password Input */}
        <div>
          <Label>Contraseña</Label>
          <Input type="password" value={formData.password} onChange={...} />
        </div>
        
        {/* Confirm Password Input */}
        <div>
          <Label>Confirmar Contraseña</Label>
          <Input type="password" value={formData.confirmPassword} onChange={...} />
        </div>
        
        {/* Submit Button */}
        <Button type="submit" disabled={loading || success}>
          {loading && <Loader2 />}
          {success ? 'Registro Exitoso' : 'Registrar Usuario'}
        </Button>
        
        {/* Toggle to Login - Conditional Text */}
        <Button variant="link" onClick={onToggleMode}>
          {success ? 'Ir a Iniciar Sesión' : '¿Ya tienes cuenta? Iniciar sesión'}
        </Button>
      </form>
    </CardContent>
  </Card>
  
  {/* Success Modal - Conditional */}
  <Dialog open={success} onOpenChange={setSuccess}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>¡Registro Exitoso!</DialogTitle>
        <DialogDescription>
          {/* Success message with email */}
        </DialogDescription>
      </DialogHeader>
      <Button onClick={() => { setSuccess(false); onToggleMode(); }}>
        Ir a Iniciar Sesión
      </Button>
    </DialogContent>
  </Dialog>
</>
```

---

## 5️⃣ FLUJO DE AUTENTICACIÓN

### **Login Flow:**
1. Usuario ingresa email/password
2. `handleSubmit` → `signIn(email, password)`
3. `AuthContext.signIn()`:
   - Autentica con Supabase
   - Espera a que `fetchUserProfile()` complete
   - Si éxito → `RoleBasedRedirect` en `App.tsx` redirige según rol
   - Si error → Muestra error en `LoginForm`

### **Register Flow:**
1. Usuario completa formulario
2. Validaciones locales (nombre, contraseñas, longitud)
3. Consulta a `public.users` para verificar perfil existente
4. `handleSubmit` → `signUp()` con metadata:
   - `company_id`, `role`, `assigned_store_id` (si existen)
   - Trigger `handle_new_user()` crea perfil automáticamente
5. Si éxito → Muestra modal de confirmación
6. Usuario puede ir a Login

---

## 6️⃣ PUNTOS CRÍTICOS PARA REFACTOR

### **LoginForm.tsx:**
- ✅ Estado local simple (4 variables)
- ✅ Handler único (`handleSubmit`)
- ✅ Sin lógica de redirección (manejada por AuthContext)
- ⚠️ Depende completamente de `AuthContext` para flujo post-login

### **RegisterForm.tsx:**
- ⚠️ Estado más complejo (5 variables, incluyendo objeto `formData`)
- ⚠️ Lógica de validación inline en `handleSubmit`
- ⚠️ Consulta a Supabase directamente (no usa hook)
- ⚠️ Modal de éxito duplicado (también hay Alert de éxito)

### **AuthPage.tsx:**
- ✅ Muy simple, solo toggle entre formularios
- ✅ Limpia cache al montar (útil para debugging)

---

## 7️⃣ NOTAS TÉCNICAS

### **Integración con AuthContext:**
- `signIn()` espera a que `fetchUserProfile()` complete antes de retornar
- Redirección automática vía `RoleBasedRedirect` en `App.tsx`
- No hay manejo manual de navegación en los formularios

### **Trigger de Base de Datos:**
- `RegisterForm` pasa metadata a `signUp()` para trigger `handle_new_user()`
- Si `company_id` no está en metadata, el trigger NO crea perfil
- El formulario verifica perfil existente antes de registrar

### **Estilos Actuales:**
- Usa clases de Tailwind con tema "Legacy Pro"
- Cards con `shadow-lg`, `ring-1 ring-primary/20`
- Inputs con `h-9` (Login) y `h-8` (Register) - inconsistencia
- Botones con variantes `default` y `link`

---

## ✅ CONCLUSIÓN

**Estructura General:** Simple y directa, con separación clara de responsabilidades.

**Puntos de Atención para Refactor:**
1. Unificar altura de inputs (h-9 vs h-8)
2. Extraer validaciones de RegisterForm a función separada
3. Considerar usar hook personalizado para consulta de perfil existente
4. Simplificar modal de éxito (eliminar duplicación con Alert)

**Compatibilidad:** Los componentes están bien integrados con `AuthContext` y no requieren cambios en la lógica de negocio para un refactor visual.


