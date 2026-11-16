# syntax=docker/dockerfile:1.7
# Release image: official PocketBase binary + migrations, hooks, seed files and the built SPA.
# Build from the repo root: docker build -f docker/Dockerfile --build-arg PB_VERSION=0.40.6 .
# (just docker build locally on reko-3; releases are built by .github/workflows/release.yml)

FROM node:24-alpine AS web
WORKDIR /src/web
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

FROM alpine:3.22 AS pocketbase
ARG PB_VERSION
ARG TARGETARCH
RUN apk add --no-cache curl unzip \
 && curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" -o /tmp/pb.zip \
 && unzip /tmp/pb.zip pocketbase -d /out

FROM alpine:3.22
# Release identity (just release / .github/workflows/release.yml). Baked into build.json,
# which /api/meta reads (pb_hooks/meta.pb.js): never a service variable, so it cannot lie.
ARG APP_VERSION=dev
ARG APP_BUILD_HASH=dev
ARG APP_BUILD_DATE=
LABEL org.opencontainers.image.title="catalog" \
      org.opencontainers.image.source="https://github.com/AngelMaldonado/catalog" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_BUILD_HASH}" \
      org.opencontainers.image.created="${APP_BUILD_DATE}"
RUN apk add --no-cache ca-certificates tzdata \
 && adduser -D -H -u 1000 catalog \
 && mkdir -p /pb/pb_data && chown catalog:catalog /pb/pb_data
WORKDIR /pb
COPY --from=pocketbase /out/pocketbase /pb/pocketbase
COPY pb/pb_migrations /pb/pb_migrations
COPY pb/pb_hooks /pb/pb_hooks
COPY pb/seed /pb/seed
COPY --from=web /src/web/dist /pb/pb_public
RUN printf '{"version":"%s","buildHash":"%s"}\n' "$APP_VERSION" "$APP_BUILD_HASH" > /pb/build.json
ENV CATALOG_SEED_DIR=/pb/seed
# the named volume inherits this owner (uid 1000)
VOLUME /pb/pb_data
USER catalog
EXPOSE 8090
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8090/api/health >/dev/null || exit 1
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks", "--publicDir=/pb/pb_public", "--hooksWatch=false"]
