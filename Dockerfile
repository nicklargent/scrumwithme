FROM node:20-alpine

WORKDIR /app

COPY build/ ./
RUN npm install --omit=dev

EXPOSE 4000
ENTRYPOINT ["node", "app/app.js"]