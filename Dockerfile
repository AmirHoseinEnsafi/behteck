FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ARG MONGODBURL

ENV MONGODBURL=${MONGODBURL}

VOLUME ["/app"]

EXPOSE 3000

CMD ["node", "src/index.js"]