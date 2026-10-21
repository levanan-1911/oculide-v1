# ==============================================================================
# Dockerfile - Oculide Frontend (Next.js 14)
# ==============================================================================

FROM node:18-alpine AS base

WORKDIR /app

# 1. Cài đặt dependencies
COPY package*.json ./
RUN npm install

# 2. Sao chép mã nguồn frontend
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=development

# Khởi chạy Next.js development server
CMD ["npm", "run", "dev"]
