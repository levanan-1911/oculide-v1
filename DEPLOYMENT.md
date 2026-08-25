# Deployment Guide

Complete guide for deploying the Online Exam System with AI Proctoring.

## Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM available
- 20GB disk space
- Ports 3000, 8000, 1433, 6379, 7880-7882 available

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Oculide
```

### 2. Configure Environment Variables

```bash
# Backend configuration
cd backend
cp .env.example .env
# Edit .env with your settings
```

### 3. Build and Start All Services

```bash
cd ..
docker-compose up -d
```

This will start:
- SQL Server (port 1433)
- Redis (port 6379)
- LiveKit Server (ports 7880-7882)
- Backend API (port 8000)
- Celery Workers (grading and proctoring)
- Frontend (port 3000)

### 4. Initialize Database

```bash
# Connect to SQL Server
docker exec -it exam-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd'

# Run the schema
:r /database/schema.sql
GO
exit
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- LiveKit Dashboard: http://localhost:7880

## Service Details

### SQL Server
- **Container**: exam-sqlserver
- **Port**: 1433
- **Default Password**: YourStrong@Passw0rd (change in production)
- **Database**: ExamSystem

### Redis
- **Container**: exam-redis
- **Port**: 6379
- **Used for**: Celery broker and backend

### LiveKit Server
- **Container**: exam-livekit
- **Ports**: 7880 (HTTP), 7881 (HTTPS), 7882 (RTC)
- **API Key**: devkey (change in production)
- **API Secret**: secret (change in production)

### Backend API
- **Container**: exam-backend
- **Port**: 8000
- **Health Check**: http://localhost:8000/health

### Celery Workers
- **Grading Worker**: exam-celery-grading
- **Proctoring Worker**: exam-celery-proctoring
- **Monitoring**: Use Flower (optional)

### Frontend
- **Container**: exam-frontend
- **Port**: 3000
- **Environment**: NEXT_PUBLIC_API_URL

## Manual Deployment

### Backend Only

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env

# Run database migrations
# (Run schema.sql manually)

# Start the server
uvicorn main:app --reload
```

### Frontend Only

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env

# Run development server
npm run dev

# Or build for production
npm run build
npm start
```

### Celery Workers

```bash
cd backend

# Start grading worker
celery -A celery_app worker -Q grading --loglevel=info

# Start proctoring worker
celery -A celery_app worker -Q proctoring --loglevel=info

# Start Flower for monitoring
pip install flower
celery -A celery_app flower
```

## Testing

### Backend Tests

```bash
cd backend
pytest tests/
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Integration Tests

```bash
# Test API endpoints
curl http://localhost:8000/api/auth/me

# Test WebSocket connection
wscat -c ws://localhost:8000/ws/1/1
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up proper CORS origins
- [ ] Enable rate limiting
- [ ] Configure backup strategy
- [ ] Set up monitoring and logging

### Scaling

#### Horizontal Scaling

```bash
# Scale backend
docker-compose up -d --scale backend=3

# Scale Celery workers
docker-compose up -d --scale celery-grading=5
docker-compose up -d --scale celery-proctoring=3
```

#### Load Balancing

Use Nginx or HAProxy in front of multiple backend instances.

### Monitoring

#### Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f celery-grading
```

#### Metrics

- **Backend**: Use Prometheus + Grafana
- **Celery**: Use Flower (http://localhost:5555)
- **Database**: SQL Server monitoring tools
- **LiveKit**: Built-in metrics endpoint

## Troubleshooting

### Common Issues

**Backend won't start**
- Check database connection in .env
- Verify SQL Server is running
- Check port conflicts

**Celery workers not processing tasks**
- Verify Redis is running
- Check Celery logs
- Ensure task routing is correct

**Frontend can't connect to backend**
- Check CORS configuration
- Verify API URL in .env
- Check network connectivity

**LiveKit connection issues**
- Verify LiveKit server is running
- Check API key and secret
- Ensure ports are open

### Reset Everything

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Backup and Restore

### Database Backup

```bash
# Backup
docker exec exam-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' \
  -Q "BACKUP DATABASE ExamSystem TO DISK = '/var/opt/mssql/backup/ExamSystem.bak'"

# Copy backup
docker cp exam-sqlserver:/var/opt/mssql/backup/ExamSystem.bak ./backup/
```

### Database Restore

```bash
# Copy backup
docker cp ./backup/ExamSystem.bak exam-sqlserver:/var/opt/mssql/backup/

# Restore
docker exec exam-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P 'YourStrong@Passw0rd' \
  -Q "RESTORE DATABASE ExamSystem FROM DISK = '/var/opt/mssql/backup/ExamSystem.bak'"
```

## Performance Tuning

### Database

- Increase memory allocation
- Optimize indexes
- Use connection pooling

### Celery

- Increase worker concurrency
- Adjust prefetch multiplier
- Use task priorities

### Frontend

- Enable CDN for static assets
- Implement caching
- Use Next.js ISR/SSR

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Review documentation in individual service READMEs
- Check API documentation at /docs endpoint
