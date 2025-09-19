# Middlewares de Autenticación

Este módulo contiene middlewares para proteger rutas en tu API usando Better Auth y Hono.

## Middlewares Disponibles

### `requireAuth`
Middleware básico que verifica si el usuario tiene una sesión válida.

**Lo que hace:**
- Verifica que existe una sesión activa
- Comprueba que la sesión no haya expirado
- Añade información del usuario y sesión al contexto de Hono

**Uso:**
```typescript
import { requireAuth } from "../middleware";

router.get("/profile", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});
```

### `requireOrganization`
Middleware que verifica que el usuario pertenezca a una organización.

**Lo que hace:**
- Busca la membresía del usuario en la base de datos
- Obtiene información de la organización
- Añade datos de membresía y organización al contexto

**Uso:**
```typescript
import { requireAuth, requireOrganization } from "../middleware";

router.get("/organization", requireAuth, requireOrganization, async (c) => {
  const user = c.get("user");
  const organization = c.get("organization");
  const member = c.get("member");
  
  return c.json({ user, organization, memberRole: member.role });
});
```

### `requireRole`
Middleware que verifica que el usuario tenga un rol específico en su organización.

**Lo que hace:**
- Verifica que el usuario tiene uno de los roles permitidos
- Debe usarse después de `requireAuth` y `requireOrganization`

**Uso:**
```typescript
import { requireAuth, requireOrganization, requireRole } from "../middleware";

// Solo administradores y propietarios
router.get("/admin", 
  requireAuth, 
  requireOrganization, 
  requireRole(["admin", "owner"]), 
  async (c) => {
    const member = c.get("member");
    return c.json({ message: "Panel de administración", role: member.role });
  }
);
```

### `requireEmailVerified`
Middleware que verifica que el usuario haya verificado su email.

**Lo que hace:**
- Comprueba que `user.emailVerified` sea `true`
- Debe usarse después de `requireAuth`

**Uso:**
```typescript
import { requireAuth, requireEmailVerified } from "../middleware";

router.get("/dashboard", requireAuth, requireEmailVerified, async (c) => {
  const user = c.get("user");
  return c.json({ message: "Dashboard verificado", user });
});
```

## Orden de Middlewares

Es importante usar los middlewares en el orden correcto:

1. **requireAuth** (siempre primero)
2. **requireEmailVerified** (opcional, después de requireAuth)
3. **requireOrganization** (opcional, después de requireAuth)
4. **requireRole** (opcional, después de requireOrganization)

## Tipos TypeScript

Para obtener tipado correcto en tus rutas, usa el tipo `AuthContext`:

```typescript
import { Hono } from "hono";
import { AuthContext, requireAuth } from "../middleware";

const router = new Hono<AuthContext>();

router.get("/protected", requireAuth, async (c) => {
  // 'user' está completamente tipado
  const user = c.get("user");
  console.log(user.email); // TypeScript conoce estas propiedades
});
```

## Manejo de Errores

Los middlewares lanzan `HTTPException` con códigos de estado apropiados:

- **401**: No autorizado (sin sesión o sesión expirada)
- **403**: Prohibido (sin organización, sin rol requerido, email no verificado)
- **500**: Error interno del servidor

```typescript
import { HTTPException } from "hono/http-exception";

router.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: "Error interno del servidor" }, 500);
});
```

## Ejemplo Completo

```typescript
import { Hono } from "hono";
import { 
  requireAuth, 
  requireOrganization, 
  requireRole, 
  requireEmailVerified,
  type AuthContext 
} from "../middleware";

const protectedRouter = new Hono<AuthContext>();

// Ruta que solo requiere autenticación
protectedRouter.get("/profile", requireAuth, async (c) => {
  const user = c.get("user");
  return c.json({ user });
});

// Ruta que requiere email verificado
protectedRouter.get("/dashboard", 
  requireAuth, 
  requireEmailVerified, 
  async (c) => {
    return c.json({ message: "Dashboard accesible" });
  }
);

// Ruta que requiere pertenencia a organización
protectedRouter.get("/team", 
  requireAuth, 
  requireOrganization, 
  async (c) => {
    const organization = c.get("organization");
    const member = c.get("member");
    
    return c.json({ 
      organization: organization.name,
      role: member.role 
    });
  }
);

// Ruta que requiere rol de administrador
protectedRouter.post("/admin/action", 
  requireAuth, 
  requireOrganization, 
  requireRole(["admin", "owner"]), 
  async (c) => {
    // Solo admins y owners pueden acceder
    return c.json({ message: "Acción ejecutada" });
  }
);

export default protectedRouter;
```
