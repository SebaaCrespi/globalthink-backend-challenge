# --- STAGE 1: Build ---
FROM node:24-alpine AS builder

WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package.json yarn.lock ./

# Instalar dependencias necesarias para compilar (incluye devDependencies)
RUN yarn install --frozen-lockfile

# Copiar el código fuente del proyecto
COPY . .

# Compilar el proyecto a JavaScript nativo (genera la carpeta /dist)
RUN yarn build

# Instalar solo las dependencias de producción para ahorrar espacio
RUN rm -rf node_modules && yarn install --frozen-lockfile --production

# --- STAGE 2: Production ---
FROM node:24-alpine AS runner

WORKDIR /app

# Definir entorno de producción
ENV NODE_ENV=production

# Copiar solo lo estrictamente necesario desde el stage de compilación
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponer el puerto por defecto de la app
EXPOSE 3000

# Comando para arrancar la aplicación
CMD ["node", "dist/main.js"]