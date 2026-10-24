FROM node:22.23.4-alpine3.24 AS production
RUN apk add --no-cache --upgrade ca-certificates ca-certificates-bundle
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV PORT=5004
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY build ./build
EXPOSE 5004
CMD ["node", "build/index.js"]
