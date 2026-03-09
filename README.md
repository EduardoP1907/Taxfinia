# 🧮 TAXFINIA - Sistema de Análisis Financiero

## 📦 Proyecto Inicializado

**Backend:** Node.js + Express + TypeScript + Prisma + PostgreSQL
**Frontend:** React + TypeScript + Vite + TailwindCSS + Zustand

---

## 🚀 Setup Inicial

### 1. **Base de Datos PostgreSQL**

Necesitas tener PostgreSQL instalado y corriendo.

**Opción A: PostgreSQL Local**
```bash
# Instalar PostgreSQL (si no lo tienes)
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Crear la base de datos
createdb taxfinia_db

# O usando psql:
psql -U postgres
CREATE DATABASE taxfinia_db;
\q
```

**Opción B: PostgreSQL en Docker (Recomendado)**
```bash
docker run --name taxfinia-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=taxfinia_db -p 5432:5432 -d postgres:15
```

### 2. **Configurar Backend**

```bash
cd backend

# Editar archivo .env con tus credenciales reales:
# - DATABASE_URL (ajusta usuario/password si es necesario)
# - EMAIL_USER y EMAIL_PASSWORD (usa App Password de Gmail)
# - JWT_SECRET (genera uno seguro)

# Generar cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones
npm run prisma:migrate

# Iniciar servidor de desarrollo
npm run dev
```

El backend correrá en: **http://localhost:5000**

### 3. **Configurar Frontend**

```bash
cd frontend

# Verificar que el archivo .env existe con:
# VITE_API_URL=http://localhost:5000/api

# Iniciar servidor de desarrollo
npm run dev
```

El frontend correrá en: **http://localhost:5173**

---

## 📧 Configurar Gmail para Enviar OTP

1. Ve a tu cuenta de Google
2. Habilita "Verificación en 2 pasos"
3. Genera una "Contraseña de aplicación"
4. Usa esa contraseña en `EMAIL_PASSWORD` del archivo `.env`

**Guía:** https://support.google.com/accounts/answer/185833

---

## 🗂️ Estructura del Proyecto

```
taxfinia-app/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # Modelos de base de datos
│   ├── src/
│   │   ├── config/                # Configuraciones
│   │   ├── controllers/           # Controladores de rutas
│   │   ├── middlewares/           # Middlewares (auth, etc)
│   │   ├── routes/                # Definición de rutas
│   │   ├── services/              # Lógica de negocio
│   │   ├── types/                 # Tipos TypeScript
│   │   ├── utils/                 # Utilidades (JWT, email, OTP)
│   │   └── index.ts               # Punto de entrada
│   ├── .env                       # Variables de entorno
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/            # Componentes reutilizables
    │   ├── pages/                 # Páginas/vistas
    │   ├── services/              # Servicios API
    │   ├── store/                 # Estado global (Zustand)
    │   ├── types/                 # Tipos TypeScript
    │   ├── utils/                 # Utilidades
    │   └── App.tsx                # Componente principal
    ├── .env                       # Variables de entorno
    └── package.json
```

---

## 🔐 Sistema de Autenticación Implementado

### **Flujo de Registro:**
1. Usuario se registra con email y contraseña
2. Sistema genera código OTP de 6 dígitos
3. Se envía email con el código OTP
4. Usuario ingresa código para verificar su cuenta
5. Al verificar, recibe tokens JWT (access + refresh)

### **Flujo de Login:**
1. Usuario ingresa email y contraseña
2. Sistema valida credenciales
3. Retorna tokens JWT y datos del usuario

### **Endpoints API Disponibles:**

```
POST /api/auth/register          - Registrar nuevo usuario
POST /api/auth/verify-otp        - Verificar código OTP
POST /api/auth/login             - Iniciar sesión
POST /api/auth/resend-otp        - Reenviar código OTP
POST /api/auth/logout            - Cerrar sesión
GET  /api/auth/me                - Obtener usuario actual (protegido)
```

---

## 🧪 Probar la API con curl/Postman

### 1. Registro
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Juan",
    "lastName": "Pérez"
  }'
```

### 2. Verificar OTP
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

---

## 📝 Próximos Pasos

### ✅ **Completado:**
- ✅ Backend con Express + TypeScript
- ✅ Base de datos con Prisma
- ✅ Sistema de autenticación con OTP
- ✅ Envío de emails
- ✅ Generación de tokens JWT
- ✅ Middleware de autenticación
- ✅ Frontend con React + TypeScript + Vite
- ✅ Configuración de TailwindCSS
- ✅ Store de autenticación con Zustand
- ✅ Servicios de API con Axios

### 🚧 **Pendiente (para continuar):**
- [ ] Componentes UI de registro y login
- [ ] Página de verificación OTP
- [ ] Dashboard principal
- [ ] Sistema de rutas protegidas
- [ ] CRUD de empresas
- [ ] Entrada de datos financieros
- [ ] Cálculo de ratios
- [ ] Generación de informes

---

## 🐛 Troubleshooting

### Error: "could not connect to server"
- Verifica que PostgreSQL esté corriendo
- Revisa el `DATABASE_URL` en `.env`

### Error: "Authentication failed" en Gmail
- Usa una "App Password", no tu contraseña normal
- Habilita "Verificación en 2 pasos" en Google

### Error de CORS
- Verifica que `FRONTEND_URL` en backend coincida con la URL del frontend

---

## 📚 Tecnologías Utilizadas

**Backend:**
- Express.js - Framework web
- Prisma - ORM
- PostgreSQL - Base de datos
- JWT - Autenticación
- Bcrypt - Hash de contraseñas
- Nodemailer - Envío de emails

**Frontend:**
- React 18 - UI library
- TypeScript - Type safety
- Vite - Build tool
- TailwindCSS - Styling
- Zustand - State management
- Axios - HTTP client
- React Router - Routing

---

## 👨‍💻 Autor

**Claude** - AI Assistant by Anthropic
**Proyecto:** TAXFINIA 2025
**Fecha:** Noviembre 2024
