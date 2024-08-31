ARG CI

FROM node:20-alpine

ARG CI

ENV CI_COMMIT_SHORT_SHA="PRODUCTION__MOCK__CI_COMMIT_SHORT_SHA"

ENV NODE_ENV="production"
ENV PORT=8200

RUN apk update \
  && apk add wget

WORKDIR /usr/src/app

COPY package*.json yarn.lock tsconfig.json install-runners.dev.sh ./

RUN yarn install

COPY ./src ./src

# Dependency audit
RUN yarn audit

# Building assets
RUN yarn run build 

RUN rm -fr ./src

# compilation test:
RUN yarn start

EXPOSE 8200

CMD [ "yarn", "start" ]