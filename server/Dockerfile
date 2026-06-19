FROM eclipse-temurin:21-jre AS base

RUN apt-get update && apt-get install -y \
    curl \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_VERSION=22
RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

ARG AUDIVERIS_VERSION=5.6.1
RUN curl -fsSL -o /tmp/audiveris.zip \
    "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-linux-x64.zip" \
    && mkdir -p /opt/audiveris \
    && cd /opt/audiveris && unzip /tmp/audiveris.zip \
    && rm /tmp/audiveris.zip \
    && chmod +x /opt/audiveris/bin/Audiveris || true

ENV AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
ENV PATH="/opt/audiveris/bin:${PATH}"

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production

COPY . .
RUN npx tsc || true

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/index.js"]
