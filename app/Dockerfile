# syntax=docker/dockerfile:1.6
FROM node:20-slim AS base

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY sql ./sql

EXPOSE 8080
CMD ["node", "src/index.js"]
