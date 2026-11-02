# ==============================================================================
# Dockerfile - Oculide Frontend (Next.js 14)
# ==============================================================================

FROM node:20-alpine AS base

# Cài đặt libc6-compat nếu cần cho các thư viện native
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 1. Cài đặt dependencies
COPY package*.json ./
RUN npm install

# 2. Sao chép mã nguồn frontend
COPY . .

# 3. Cấu hình cổng và hostname cho Next.js container
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=development

EXPOSE 3000

# 4. Khởi chạy Next.js server
CMD ["npm", "run", "dev"]
