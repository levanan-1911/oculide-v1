# CI/CD Pipeline Overview

Oculide project hiện đã có GitHub Actions CI/CD pipeline hoàn chỉnh.

## 📋 Workflows

### 1. **build-push.yml** - Build & Push Docker Images
- **Trigger**: Push to main/develop, Pull requests
- **Jobs**: 
  - `build-backend`: Build & push backend image
  - `build-frontend`: Build & push frontend image
- **Output**: Images trên Docker Hub
- **Duration**: ~5-10 phút

### 2. **tests.yml** - Run Tests
- **Trigger**: Push to main/develop, Pull requests
- **Jobs**:
  - `test-backend`: pytest + coverage (Python)
  - `test-frontend`: Jest + ESLint (Node.js)
  - `test-docker-build`: Verify Docker builds work
- **Output**: Coverage reports trên Codecov
- **Duration**: ~10-15 phút

### 3. **code-quality.yml** - Code Quality & Security
- **Trigger**: Push to main/develop, Pull requests
- **Jobs**:
  - `lint-backend`: Black, isort, Flake8 (Python)
  - `lint-frontend`: ESLint (JavaScript)
  - `security-scan`: Trivy vulnerability scan
  - `dependency-check`: Check for known vulnerabilities
- **Duration**: ~5-10 phút

### 4. **deploy.yml** - Deployment (Optional)
- **Trigger**: Push to main branch hoặc tag v*
- **Jobs**:
  - `build`: Build images (lại)
  - `deploy`: Deploy notification
- **Duration**: ~5-10 phút
- **Note**: Cần config deploy target (Kubernetes, Docker Swarm, VPS, etc.)

## 🎯 Pipeline Flow

```
Pull Request / Push
    ↓
├─ build-push.yml (Build images)
├─ tests.yml (Run tests)
└─ code-quality.yml (Lint & security)
    ↓
All pass? 
    ↓ YES
    └─ Allowed to merge
    ↓ NO
    └─ Block merge (if branch protection enabled)
```

## 📊 Status Dashboard

Xem tại: https://github.com/levanan-1911/Oculide/actions

## 🔧 Required Setup

### 1. Docker Hub Credentials
```
Settings → Secrets and variables → Actions
- DOCKER_USERNAME: your_docker_hub_username
- DOCKER_PASSWORD: your_docker_hub_pat
```

### 2. Optional: Codecov
```
https://codecov.io → Connect repo
```

### 3. Optional: Branch Protection
```
Settings → Branches → Add rule
- Pattern: main
- Require status checks: tests, code-quality
```

## 📈 Metrics & Coverage

- Backend coverage: `./backend/htmlcov/index.html` (local)
- Frontend coverage: `./frontend/coverage/` (local)
- Codecov: https://codecov.io/gh/levanan-1911/Oculide

## 🚀 Next Steps

1. ✅ Setup Docker Hub credentials in GitHub Secrets
2. ✅ Push code to trigger workflows
3. ⏳ Monitor Actions tab
4. 🔐 Enable branch protection for main
5. 📢 Setup Slack/Discord notifications (optional)
6. 🌐 Configure production deployment (optional)

## 📚 Useful Links

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Docker/build-push-action](https://github.com/docker/build-push-action)
- [pytest Documentation](https://docs.pytest.org/)
- [Jest Testing](https://jestjs.io/)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)

## 💡 Tips

- Workflows run in parallel (faster feedback)
- Use `act` locally to test workflows: https://github.com/nektos/act
- Check workflow syntax: `git push --dry-run`
- Cache is automatic via GHA (GitHub Actions)
- Logs retained for 90 days

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| Docker push fails | Check DOCKER_PASSWORD in Secrets |
| Tests timeout | Increase timeout in workflow |
| Cache not working | May be new branch, will improve over time |
| Flake8 fails | Run `black .` locally before push |

---

**Last Updated**: 2024
