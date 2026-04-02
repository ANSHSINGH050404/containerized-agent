FROM oven/bun:1-slim

WORKDIR /app
COPY package.json .
COPY bun.lock .
RUN bun install

COPY src/ ./src/

EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
