# SkyHR API - Guía de Better Auth

## Introducción

Este proyecto utiliza [Better Auth](https://better-auth.com) versión 1.3.12 como sistema de autenticación. Better Auth es una biblioteca moderna de autenticación para aplicaciones TypeScript que proporciona un conjunto completo de funciones de autenticación listas para usar.

## Configuración Actual

### Características Habilitadas

- **Autenticación Email/Password**: Sistema básico de registro e inicio de sesión
- **Plugin de Organizaciones**: Gestión completa de organizaciones multi-tenant
- **Teams**: Equipos dentro de organizaciones con roles personalizados
- **Sesiones Personalizadas**: Duración de 7 días con actualización diaria
- **Adaptador Drizzle**: Integración con PostgreSQL usando Drizzle ORM
- **Soporte Expo**: Plugin nativo para aplicaciones móviles con Expo

### Variables de Entorno Requeridas

```env
BETTER_AUTH_SECRET=tu_clave_secreta_aqui
BETTER_AUTH_URL=http://localhost:8080
TRUSTED_ORIGINS=http://localhost:3000,https://tu-dominio.com,skyhr://,exp://
```

## Estructura de Base de Datos

### Tablas Core de Better Auth

| Tabla | Descripción |
|-------|-------------|
| `users` | Información de usuarios con campos adicionales (`user_face_url`) |
| `sessions` | Sesiones activas con soporte para organizaciones |
| `accounts` | Cuentas vinculadas a usuarios (email/password, OAuth) |
| `verificationTokens` | Tokens de verificación de email |

### Tablas del Plugin de Organizaciones

| Tabla | Descripción |
|-------|-------------|
| `organization` | Organizaciones con suscripciones |
| `member` | Miembros de organizaciones con roles |
| `invitation` | Invitaciones pendientes a organizaciones |
| `team` | Equipos dentro de organizaciones |
| `teamMember` | Miembros de equipos |

## Endpoints Disponibles

Todos los endpoints están disponibles bajo la ruta base `/auth/*`

### Autenticación Básica

#### Registro de Usuario
```
POST /auth/sign-up/email
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123",
  "name": "Nombre Usuario"
}
```

#### Inicio de Sesión
```
POST /auth/sign-in/email
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "contraseña123"
}
```

#### Cerrar Sesión
```
POST /auth/sign-out
```

#### Verificar Sesión
```
GET /auth/session
```

### Gestión de Usuarios

#### Obtener Usuario Actual
```
GET /auth/user
```

#### Actualizar Usuario
```
POST /auth/user/update
Content-Type: application/json

{
  "name": "Nuevo Nombre",
  "user_face_url": "https://ejemplo.com/avatar.jpg"
}
```

#### Cambiar Contraseña
```
POST /auth/user/change-password
Content-Type: application/json

{
  "currentPassword": "contraseña_actual",
  "newPassword": "nueva_contraseña"
}
```

### Verificación de Email

#### Solicitar Verificación
```
POST /auth/send-verification-email
Content-Type: application/json

{
  "email": "usuario@ejemplo.com"
}
```

#### Verificar Email
```
POST /auth/verify-email
Content-Type: application/json

{
  "token": "token_de_verificacion"
}
```

### Recuperación de Contraseña

#### Solicitar Reset
```
POST /auth/forget-password
Content-Type: application/json

{
  "email": "usuario@ejemplo.com"
}
```

#### Resetear Contraseña
```
POST /auth/reset-password
Content-Type: application/json

{
  "token": "token_de_reset",
  "password": "nueva_contraseña"
}
```

### Gestión de Organizaciones

#### Crear Organización
```
POST /auth/organization/create
Content-Type: application/json

{
  "name": "Mi Organización",
  "slug": "mi-organizacion"
}
```

#### Obtener Organizaciones del Usuario
```
GET /auth/organization/list
```

#### Cambiar Organización Activa
```
POST /auth/organization/set-active
Content-Type: application/json

{
  "organizationId": "org_id_aqui"
}
```

#### Actualizar Organización
```
POST /auth/organization/update
Content-Type: application/json

{
  "organizationId": "org_id_aqui",
  "name": "Nuevo Nombre",
  "slug": "nuevo-slug"
}
```

#### Eliminar Organización
```
POST /auth/organization/delete
Content-Type: application/json

{
  "organizationId": "org_id_aqui"
}
```

### Gestión de Miembros

#### Invitar Miembro
```
POST /auth/organization/invite-member
Content-Type: application/json

{
  "email": "nuevo@ejemplo.com",
  "role": "member",
  "organizationId": "org_id_aqui"
}
```

#### Aceptar Invitación
```
POST /auth/organization/accept-invitation
Content-Type: application/json

{
  "invitationId": "invitation_id_aqui"
}
```

#### Rechazar Invitación
```
POST /auth/organization/reject-invitation
Content-Type: application/json

{
  "invitationId": "invitation_id_aqui"
}
```

#### Cancelar Invitación
```
POST /auth/organization/cancel-invitation
Content-Type: application/json

{
  "invitationId": "invitation_id_aqui"
}
```

#### Obtener Miembros
```
GET /auth/organization/get-members?organizationId=org_id_aqui
```

#### Actualizar Rol de Miembro
```
POST /auth/organization/update-member-role
Content-Type: application/json

{
  "organizationId": "org_id_aqui",
  "userId": "user_id_aqui",
  "role": "admin"
}
```

#### Remover Miembro
```
POST /auth/organization/remove-member
Content-Type: application/json

{
  "organizationId": "org_id_aqui",
  "userId": "user_id_aqui"
}
```

#### Salir de Organización
```
POST /auth/organization/leave
Content-Type: application/json

{
  "organizationId": "org_id_aqui"
}
```

### Gestión de Teams

#### Crear Team
```
POST /auth/organization/create-team
Content-Type: application/json

{
  "name": "Equipo de Desarrollo",
  "organizationId": "org_id_aqui"
}
```

#### Obtener Teams
```
GET /auth/organization/get-teams?organizationId=org_id_aqui
```

#### Agregar Miembro a Team
```
POST /auth/organization/add-team-member
Content-Type: application/json

{
  "teamId": "team_id_aqui",
  "userId": "user_id_aqui",
  "role": "member"
}
```

#### Remover Miembro de Team
```
POST /auth/organization/remove-team-member
Content-Type: application/json

{
  "teamId": "team_id_aqui",
  "userId": "user_id_aqui"
}
```

#### Actualizar Team
```
POST /auth/organization/update-team
Content-Type: application/json

{
  "teamId": "team_id_aqui",
  "name": "Nuevo Nombre del Team"
}
```

#### Eliminar Team
```
POST /auth/organization/delete-team
Content-Type: application/json

{
  "teamId": "team_id_aqui"
}
```

## Roles y Permisos

### Roles de Organización

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| `owner` | Propietario de la organización | Control total, incluye transferir propiedad |
| `admin` | Administrador | Control total excepto eliminar organización |
| `member` | Miembro regular | Permisos limitados según configuración |

### Roles de Team

Los roles de team son personalizables, por defecto:
- `member`: Miembro del equipo
- `admin`: Administrador del equipo

## Configuración del Cliente

### Configuración para Web

```typescript
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: "http://localhost:8080",
  basePath: "/auth"
})
```

### Configuración para Expo

#### Instalar Dependencias

```bash
# En tu proyecto Expo
npm install better-auth @better-auth/expo expo-secure-store

# Si usas autenticación social (opcional)
npm install expo-linking expo-web-browser expo-constants
```

#### Configurar metro.config.js

```javascript
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname)
config.resolver.unstable_enablePackageExports = true; 

module.exports = config;
```

#### Configurar app.json

```json
{
  "expo": {
    "scheme": "skyhr"
  }
}
```

#### Cliente para Expo

```typescript
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: "http://localhost:8080", // Tu URL del servidor
  plugins: [
    expoClient({
      scheme: "skyhr",
      storagePrefix: "skyhr",
      storage: SecureStore,
    })
  ]
});
```

### Uso en Expo

#### Autenticación Básica

```typescript
// screens/SignIn.tsx
import { useState } from "react";
import { View, TextInput, Button, Text } from "react-native";
import { authClient } from "../lib/auth-client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { data: session } = authClient.useSession();

  const handleLogin = async () => {
    await authClient.signIn.email({
      email,
      password,
    });
  };

  if (session) {
    return <Text>Bienvenido, {session.user.name}!</Text>;
  }

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Iniciar Sesión" onPress={handleLogin} />
    </View>
  );
}
```

#### Autenticación Social

```typescript
// screens/SocialSignIn.tsx
import { Button } from "react-native";
import { authClient } from "../lib/auth-client";

export default function SocialSignIn() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard" // Se convierte a skyhr://dashboard
    });
  };

  return <Button title="Continuar con Google" onPress={handleGoogleLogin} />;
}
```

#### Requests Autenticados

```typescript
// utils/api.ts
import { authClient } from "../lib/auth-client";

export const makeAuthenticatedRequest = async (endpoint: string, options: RequestInit = {}) => {
  const cookies = authClient.getCookie();
  
  const response = await fetch(`http://localhost:8080${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      "Cookie": cookies,
    },
    credentials: "omit" // Importante: evita conflictos con cookies manuales
  });
  
  return response.json();
};

// Ejemplo de uso
const getUserData = async () => {
  return makeAuthenticatedRequest("/api/user");
};
```

### Hooks Disponibles

```typescript
import { 
  useSession, 
  useSignIn, 
  useSignUp, 
  useSignOut,
  useOrganization,
  useListOrganizations 
} from "better-auth/react"

// Funciona igual en web y Expo
function UserProfile() {
  const { data: session } = useSession()
  const { signOut } = useSignOut()
  
  return session ? (
    <div>
      <p>Bienvenido, {session.user.name}!</p>
      <button onClick={() => signOut()}>Cerrar Sesión</button>
    </div>
  ) : (
    <p>No autenticado</p>
  )
}
```

## Middleware de Autenticación

Para proteger rutas en el servidor:

```typescript
import { auth } from "./src/core/auth"

// Middleware de autenticación
export const authMiddleware = async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.header()
  })
  
  if (!session) {
    return c.json({ error: "No autorizado" }, 401)
  }
  
  c.set("user", session.user)
  c.set("session", session.session)
  await next()
}
```

## Límites y Restricciones

- **Teams por Organización**: Máximo 10 teams
- **Duración de Sesión**: 7 días con renovación cada 24 horas
- **Creación de Organizaciones**: Habilitada para todos los usuarios

## Scripts de Base de Datos

```bash
# Generar migraciones
bun run db:generate

# Ejecutar migraciones
bun run db:migrate

# Push directo a BD (desarrollo)
bun run db:push

# Abrir Drizzle Studio
bun run db:studio
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
bun run dev

# El servidor estará disponible en http://localhost:8080
# Los endpoints de auth en http://localhost:8080/auth/*
```

## Convenciones de Nomenclatura de Archivos

Este proyecto sigue convenciones específicas para mantener consistencia y claridad en la estructura de archivos:

### Reglas de Nomenclatura

#### 1. Archivos de Módulos (Module Components)
Para archivos que pertenecen a un módulo específico, usa **notación con punto**:

```
module.function.ts
```

**Ejemplos:**
- `health.routes.ts` - Rutas del módulo health
- `health.controller.ts` - Controlador del módulo health
- `storage.service.ts` - Servicio del módulo storage
- `auth.routes.ts` - Rutas del módulo auth

#### 2. Archivos de Tipo/Propósito (Type/Role Files)
Para archivos que describen su tipo o propósito, usa **kebab-case (guiones)**:

```
type-purpose.ts
```

**Ejemplos:**
- `auth-middleware.ts` - Middleware de autenticación
- `s3-adapter.ts` - Adaptador para S3
- `multer-adapter.ts` - Adaptador para Multer
- `storage-interface.ts` - Interface de almacenamiento

### Estructura de Directorios

```
src/
├── middleware/
│   ├── auth-middleware.ts      # Tipo de archivo: middleware
│   └── cors-middleware.ts      # Tipo de archivo: middleware
├── modules/
│   ├── health/
│   │   ├── health.routes.ts    # Componente de módulo
│   │   ├── health.controller.ts # Componente de módulo
│   │   └── health.service.ts   # Componente de módulo
│   ├── storage/
│   │   ├── storage.routes.ts   # Componente de módulo
│   │   ├── storage.controller.ts # Componente de módulo
│   │   ├── storage.service.ts  # Componente de módulo
│   │   └── adapters/
│   │       ├── s3-adapter.ts   # Tipo de archivo: adapter
│   │       └── multer-adapter.ts # Tipo de archivo: adapter
│   └── auth/
│       └── auth.routes.ts      # Componente de módulo
```

### Rationale

1. **Separación Clara**: La notación con punto separa claramente el módulo de su función
2. **Agrupación Natural**: Los archivos se agrupan automáticamente en exploradores de archivos
3. **Escalabilidad**: Funciona bien tanto para nombres simples como complejos
4. **Consistencia**: Diferentes tipos de archivos siguen patrones diferentes pero consistentes
5. **Frameworks Modernos**: Sigue convenciones adoptadas por NestJS, Angular y otros frameworks TypeScript

## Ventajas de Better Auth + Expo

### ¿Por qué esta combinación es perfecta?

1. **Una sola configuración**: La misma autenticación funciona en web y móvil
2. **Almacenamiento seguro automático**: expo-secure-store se configura automáticamente
3. **Deep links nativos**: Soporte automático para OAuth y navegación
4. **Session persistente**: Las sesiones se mantienen al reiniciar la app
5. **Sin complejidad JWT**: Better Auth maneja internamente la seguridad
6. **Soporte multi-organización**: Teams y organizaciones funcionan igual en ambas plataformas

### Comparación con otras soluciones

| Característica | Better Auth + Expo | Auth0 + Expo | Firebase Auth |
|---------------|------------------|-------------|---------------|
| **Configuración** | ✅ Simple, una sola config | ❌ Configuración compleja | ⚠️ Moderada |
| **Costo** | ✅ Gratis | ❌ Costoso en escala | ⚠️ Gratis limitado |
| **Organizaciones** | ✅ Nativo, completo | ✅ Disponible | ❌ Requiere implementación |
| **Teams** | ✅ Incluido | ✅ Disponible | ❌ Requiere implementación |
| **Almacenamiento Local** | ✅ Automático y seguro | ⚠️ Manual | ⚠️ Manual |
| **Deep Links** | ✅ Automático | ⚠️ Configuración manual | ⚠️ Configuración manual |
| **Base de Datos** | ✅ Tu control total | ❌ Dependes del proveedor | ❌ Vendor lock-in |

## Consideraciones de Seguridad

1. **Secreto de Autenticación**: Usa una clave fuerte para `BETTER_AUTH_SECRET`
2. **HTTPS en Producción**: Configura HTTPS para todas las URLs de producción
3. **Orígenes Confiables**: Especifica solo los dominios necesarios en `TRUSTED_ORIGINS`
4. **Validación del Frontend**: Siempre valida los permisos en el servidor
5. **Deep Link Security**: El esquema `skyhr://` debe ser único y registrado
6. **Expo SecureStore**: Better Auth usa automáticamente el almacenamiento más seguro disponible

## Recursos Adicionales

- [Documentación de Better Auth](https://better-auth.com)
- [Plugin de Organizaciones](https://better-auth.com/docs/plugins/organization)
- [Integración con Expo](https://www.better-auth.com/docs/integrations/expo)
- [Guía de Drizzle](https://orm.drizzle.team/)
