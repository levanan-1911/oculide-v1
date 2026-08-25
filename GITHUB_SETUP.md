# GitHub Actions Setup Guide

Để GitHub Actions hoạt động đúng cách, bạn cần setup một số secrets và configurations.

## 1. Tạo Docker Hub Account & Personal Access Token

### Bước 1a: Tạo Personal Access Token (PAT) trên Docker Hub
1. Đăng nhập vào [Docker Hub](https://hub.docker.com)
2. Vào Settings → Security → Personal access tokens
3. Nhấn "Generate new token"
4. Đặt tên: `github-actions`
5. Permissions: Read, Write, Delete
6. Nhấn "Generate"
7. Copy token (bạn sẽ chỉ thấy 1 lần)

## 2. Thêm Secrets vào GitHub Repository

### Bước 2a: Vào GitHub Repository Settings
1. Đi tới https://github.com/levanan-1911/Oculide
2. Vào `Settings` → `Secrets and variables` → `Actions`

### Bước 2b: Thêm các Secrets sau
Nhấn "New repository secret" và thêm:

| Secret Name | Value |
|------------|-------|
| `DOCKER_USERNAME` | Docker Hub username của bạn |
| `DOCKER_PASSWORD` | Personal Access Token từ bước 1a |

**Example:**
```
DOCKER_USERNAME: levanan1911
DOCKER_PASSWORD: dckr_pat_abc123xyz...
```

## 3. Setup Environment Variables (Optional)

Nếu muốn custom các environment variables, bạn có thể:

### Bước 3a: Tạo `.env` file locally (không push lên GitHub)
```bash
cp .env.example .env
# Edit .env với values của bạn
```

### Bước 3b: Thêm .env vào .gitignore
```bash
echo ".env" >> .gitignore
```

## 4. Verify Workflows

### Bước 4a: Trigger workflows manually
1. Vào `Actions` tab trên GitHub repo
2. Chọn workflow (e.g., "Build and Push Docker Images")
3. Nhấn "Run workflow" → "Run workflow"

### Bước 4b: Check workflow status
- Xanh ✅ = Thành công
- Đỏ ❌ = Thất bại
- Vàng ⏳ = Đang chạy

### Bước 4c: Xem logs
1. Nhấn vào workflow run
2. Xem chi tiết từng job

## 5. Troubleshooting

### Docker login failed
- **Nguyên nhân**: DOCKER_PASSWORD sai hoặc expired
- **Fix**: Tạo PAT mới trên Docker Hub

### Image build takes too long
- **Nguyên nhân**: GitHub Actions cache bị disabled
- **Fix**: Chắc chắn `cache-from: type=gha` và `cache-to: type=gha,mode=max` trong workflow

### Tests không chạy
- **Nguyên nhân**: Redis service không khả dụng
- **Fix**: Kiểm tra docker-compose.yml đã setup services dependencies đúng

## 6. Next Steps

### Optional: Setup Deploy secrets
Nếu muốn auto-deploy lên production server:

1. Thêm `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_KEY` secrets
2. Cập nhật `deploy.yml` workflow
3. Config SSH key-based authentication

### Optional: Setup Codecov
1. Đi tới [codecov.io](https://codecov.io)
2. Connect GitHub repo
3. Upload coverage reports tự động (đã setup trong workflows)

### Optional: Setup Slack/Discord Notifications
Thêm vào workflow:
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

## 7. Monitoring

### View all workflow runs
- Vào `Actions` tab → xem history

### Setup branch protection rules
1. Vào `Settings` → `Branches` → `Add rule`
2. Branch name pattern: `main`
3. Enable "Require status checks to pass before merging"
4. Select workflows: `tests.yml`, `code-quality.yml`

Bây giờ mỗi PR vào main phải pass tests trước khi merge!

## 8. Useful Commands

```bash
# Test GitHub Actions locally (optional)
# Install: https://github.com/nektos/act
act -j build-backend

# Push và trigger workflows
git add .
git commit -m "Setup GitHub Actions CI/CD"
git push origin main

# View live logs
git log --oneline -10
```

## Support

Nếu có vấn đề:
1. Kiểm tra GitHub Actions logs
2. Xem file `.github/workflows/*.yml`
3. Đọc error messages kỹ
4. Check Docker Hub credentials
