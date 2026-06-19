# Imagen base Ubuntu 24.04 para coincidir con el paquete .deb de Audiveris.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Dependencias del sistema:
# - poppler-utils: pdftoppm para extraer paginas de PDF
# - tesseract-ocr + idiomas: OCR de texto que usa Audiveris
# - xvfb: framebuffer virtual (Audiveris arranca AWT aunque sea en batch)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
    poppler-utils \
    tesseract-ocr tesseract-ocr-eng tesseract-ocr-spa \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 via repositorio oficial de NodeSource (metodo keyring, fiable).
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Audiveris (el .deb incluye su propio JRE; apt resuelve sus dependencias nativas).
ARG AUDIVERIS_VERSION=5.10.2
RUN apt-get update \
    && curl -fsSL -o /tmp/audiveris.deb \
       "https://github.com/Audiveris/audiveris/releases/download/${AUDIVERIS_VERSION}/Audiveris-${AUDIVERIS_VERSION}-ubuntu24.04-x86_64.deb" \
    && apt-get install -y --no-install-recommends /tmp/audiveris.deb \
    && rm /tmp/audiveris.deb \
    && rm -rf /var/lib/apt/lists/*

# Audiveris busca los datos de Tesseract via TESSDATA_PREFIX.
ENV AUDIVERIS_CMD=/opt/audiveris/bin/Audiveris
ENV TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata
ENV USE_XVFB=1

# Audiveris usa Tesseract en modo legacy; el paquete de Ubuntu solo trae datos
# LSTM. Descargamos traineddata con soporte legacy (reconoce nombres de voz,
# titulos y letra en las imagenes). El reconocimiento de notas funciona en
# cualquier caso; esto mejora el OCR de texto.
RUN curl -fsSL -o "${TESSDATA_PREFIX}/eng.traineddata" \
      https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata \
    && curl -fsSL -o "${TESSDATA_PREFIX}/spa.traineddata" \
      https://github.com/tesseract-ocr/tessdata/raw/main/spa.traineddata

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/index.js"]
