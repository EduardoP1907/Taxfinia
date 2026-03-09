# 🚀 Setup Rápido TAXFINIA

## Pasos para poner en marcha el proyecto

### 1. **PostgreSQL con Docker** (Opción más fácil)

```bash
docker run --name taxfinia-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=taxfinia_db \
  -p 5432:5432 \
  -d postgres:15
```

### 2. **Backend**

```bash
cd backend

# Configurar email en .env:
# EMAIL_USER=tu_email@gmail.com
# EMAIL_PASSWORD=tu_app_password_de_gmail

# Instalar dependencias (ya hecho)
# npm install

# Generar Prisma Client
npm run prisma:generate

# Crear tablas en la BD
npm run prisma:migrate

# Iniciar servidor
npm run dev
```

Backend listo en: http://localhost:5000 ✅

### 3. **Frontend** (en otra terminal)

```bash
cd frontend

# Instalar dependencias (ya hecho)
# npm install

# Iniciar servidor
npm run dev
```

Frontend listo en: http://localhost:5173 ✅

---

## 🧪 Probar que funciona

1. Abre http://localhost:5000 en el navegador
   - Deberías ver: `{"message":"TAXFINIA API v1.0","status":"running"}`

2. Prueba el registro desde terminal:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'
```

3. Revisa tu email, recibirás un código OTP de 6 dígitos

4. Verifica el OTP:
```bash
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","code":"TU_CODIGO_AQUI"}'
```

¡Listo! 🎉

---

## ⚡ Comandos útiles

### Ver la BD con Prisma Studio
```bash
cd backend
npm run prisma:studio
```

### Ver logs del contenedor de PostgreSQL
```bash
docker logs taxfinia-postgres
```

### Parar/Iniciar PostgreSQL
```bash
docker stop taxfinia-postgres
docker start taxfinia-postgres
```

### Reiniciar la BD (⚠️ borra todos los datos)
```bash
docker rm -f taxfinia-postgres
# Luego volver a ejecutar el comando docker run del paso 1
```
