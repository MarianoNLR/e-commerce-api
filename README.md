# 🛒 E-commerce API – Backend

## API REST para un sistema de e-commerce. Maneja usuarios, productos, carritos y órdenes, e integra pasarela de pago, Google OAuth2 y envíos de correos.

### Repositorio frontend: https://github.com/MarianoNLR/e-commerce-react

### 🔴 Link API: https://e-commerce-api-gpfg.onrender.com/
### Estado: En Desarrollo. Algunas funcionalidades están incompletas o pendientes de revisión.



## 🚀 Funcionalidades

- CRUD de productos

- Registro y login de usuarios con correo y contraseña

- Registro y login de usuarios con Google OAuth2

- Autenticación con JWT

- Roles y permisos

- Carrito de compras

- Creación de órdenes

- Integración de pagos de prueba (MercadoPago)

## 🧰 Tecnologías
- Node.js
- Express
- MongoDB + Mongoose
- JWT
- MercadoPago (sandbox)
- dotenv
- CASL (roles/permisos)

## Testing
- Vitest
- Supertest
- MongoMemoryServer

## ⚙️ Configuración y ejecución
### Clonar el proyecto 
`git clone https://github.com/MarianoNLR/e-commerce-api.git`

### Instalar dependencias
`npm install`

### Variables de entorno (.env)
- PORT
- MONGODB_URI
- JWT_SECRET
- MP_ACCESS_TOKEN
- GMAIL_APP_PASSWORD
- GMAIL_APP_EMAIL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- BASE_URL
- CLOUD_NAME
- CLOUD_API_KEY
- CLOUD_API_SECRET

### Iniciar Servidor
`npm run dev`

### Ejecutar Tests
`npm test`

## 📚 Documentación API
Pendiente


