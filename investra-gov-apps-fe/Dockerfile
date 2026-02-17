FROM node:20-alpine

WORKDIR /app

RUN chown -R node:node /app

COPY --chown=node:node package*.json ./

USER node

RUN npm ci

COPY --chown=node:node . .

ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
