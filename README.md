# Club de Vóley — Backend

Guía rápida para clonar, instalar y empezar a trabajar. Si buscas la lista completa de endpoints o las decisiones de diseño, están en `docs/ENDPOINTS.md`.

## Requisitos antes de empezar

- **Node.js 20 o superior** — verifica con `node -v`. Si no lo tienes: [nodejs.org](https://nodejs.org).
- **Git** instalado y configurado (`git --version`).
- Que **Eduardo** te haya agregado como colaborador del repo en GitHub (o que el repo sea público para ti).
- Pedirle a Eduardo (por el grupo) las **3 credenciales de Supabase** (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Todos usamos el mismo proyecto de Supabase — nadie crea uno nuevo.

## 1. Clonar el repo

```bash
git clone https://github.com/ariancerna/HerramientasDesarrollo_Grupo4_Backend.git
cd HerramientasDesarrollo_Grupo4_Backend
```

## 2. Instalar dependencias

```bash
npm install
```

Esto crea la carpeta `node_modules/` (no se sube a GitHub, es normal no verla en el repo).

## 3. Configurar las variables de entorno

1. Duplica el archivo de ejemplo:
```bash
   cp .env.example .env        # Mac/Linux
   copy .env.example .env      # Windows (cmd)
```
2. Abre `.env` y pega las 3 credenciales de Supabase que te pasó el equipo:
3. El resto de valores (`PORT`, `NODE_ENV`, `CORS_ORIGIN`) déjalos como están.

⚠️ `.env` nunca se sube a Git (ya está en `.gitignore`). Si por error lo agregas con `git add .env`, avisa al grupo — hay que rotar las claves de Supabase.

## 4. Levantar el servidor

```bash
npm run dev
```

Si todo está bien, verás en la terminal:
Club de Vóley API escuchando en http://localhost:4000
Entorno: development

## 5. Verificar que funciona

Abre en el navegador (o `curl`):

- `http://localhost:4000/api/v1/health` → debe responder `{"status":"ok", ...}`
- `http://localhost:4000/api/v1/docs` → Swagger UI con los endpoints que ya están registrados (los que faltan aparecerán a medida que cada quien programe su módulo)

Si algo de esto no responde, revisa el paso 3 (`.env`) antes de seguir.

## 6. Elegir en qué trabajar

1. Habla con el grupo (o revisa el tablero de tareas) para ver qué módulo te toca (`src/modules/<tu-modulo>/`).
2. Crea tu rama:
```bash
   git checkout -b feature/<tu-modulo>
```
3. Programa tu módulo (`*.schema.ts`, `*.repository.ts`, `*.service.ts`, `*.controller.ts`, `*.routes.ts` — ya están creados como plantilla con `TODO`).
4. Cuando tu módulo funcione, agrégalo a Swagger: crea `src/docs/data/<tu-modulo>.docs.ts` (copia cualquiera de los que ya existen como plantilla) y descomenta tu línea en `src/docs/data/index.ts`.
5. Prueba en `http://localhost:4000/api/v1/docs` con el botón **Authorize** (pega tu token) y **Try it out** en cada endpoint.

