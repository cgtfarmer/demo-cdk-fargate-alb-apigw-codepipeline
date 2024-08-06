FROM node:18.15.0 AS user-service-development

WORKDIR /home/node/app

RUN apt-get update && \
    apt-get install -y -qq --no-install-recommends \
    awscli

CMD npm run start


FROM user-service-development AS user-service

WORKDIR /home/node/app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

CMD npm run start
