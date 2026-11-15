# syntax=docker/dockerfile:1.7
# Release image: official PocketBase binary + migrations, hooks, seed files and the built SPA.
# Build from the repo root: docker build -f docker/Dockerfile --build-arg PB_VERSION=0.40.6 .
# (just docker build)

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
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /pb
COPY --from=pocketbase /out/pocketbase /pb/pocketbase
COPY pb/pb_migrations /pb/pb_migrations
COPY pb/pb_hooks /pb/pb_hooks
COPY pb/seed /pb/seed
COPY --from=web /src/web/dist /pb/pb_public
ENV CATALOG_SEED_DIR=/pb/seed
VOLUME /pb/pb_data
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8090/api/health >/dev/null || exit 1
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks", "--publicDir=/pb/pb_public"]
