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

# 3. Build production bundle (nhận build args từ docker-compose)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_LIVEKIT_URL
ARG BACKEND_INTERNAL_URL=http://backend:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}
ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}
ENV NODE_ENV=production

RUN npm run build

# 4. Cấu hình cổng và hostname cho Next.js container
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# 5. Khởi chạy Next.js production server
CMD ["npm", "run", "start"]
