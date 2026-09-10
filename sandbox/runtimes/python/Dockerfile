FROM python:3.11-alpine

# Tạo user không đặc quyền để thực thi code an toàn
RUN addgroup -g 1001 runner && \
    adduser -D -u 1001 -G runner runner && \
    mkdir -p /workspace && \
    chown -R runner:runner /workspace

WORKDIR /workspace
USER runner:runner

CMD ["python", "-u", "solution.py"]
