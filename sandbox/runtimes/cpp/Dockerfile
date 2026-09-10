FROM alpine:3.19

RUN apk add --no-cache g++ musl-dev && \
    addgroup -g 1001 runner && \
    adduser -D -u 1001 -G runner runner && \
    mkdir -p /workspace && \
    chown -R runner:runner /workspace

WORKDIR /workspace

COPY --chown=runner:runner run.sh /run.sh
RUN chmod +x /run.sh

USER runner:runner

CMD ["/run.sh"]
