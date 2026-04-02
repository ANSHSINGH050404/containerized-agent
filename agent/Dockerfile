FROM oven/bun:1-slim

RUN apt-get update && apt-get install -y \
    xvfb x11vnc novnc websockify \
    curl git python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /agent
COPY package.json .
COPY bun.lock .
RUN bun install

COPY src/ ./src/

ENV DISPLAY=:99

CMD ["sh", "-c", \
  "Xvfb :99 -screen 0 1280x720x24 & \
   x11vnc -display :99 -forever -nopw & \
   websockify --web /usr/share/novnc 6080 localhost:5900 & \
   bun run src/index.ts"]
