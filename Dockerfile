FROM node:16.4.0-buster

EXPOSE 8000

WORKDIR /code

RUN apt-get update && \
    apt-get install -y --no-install-recommends libgbm-dev chromium && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* 

COPY . .

RUN npm install

CMD ["node", "mftp.js"]