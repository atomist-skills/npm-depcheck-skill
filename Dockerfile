# Set up build
FROM node:lts@sha256:9025a77b2f37fcda3bbd367587367a9f2251d16a756ed544550b8a571e16a653 AS build

WORKDIR /usr/src

COPY . ./

RUN npm ci --no-optional && \
    npm run compile && \
    rm -rf node_modules .git

FROM atomist/skill:node14@sha256:1248c259f5b77ac47aed85143ae01daf618cf2dbcabd59244f64cdb5fc8234e1

WORKDIR "/skill"

RUN npm i -g depcheck

COPY package.json package-lock.json ./

RUN npm ci --no-optional \
    && rm -rf /root/.npm

COPY --from=build /usr/src/ .

WORKDIR "/atm/home"

ENTRYPOINT ["node", "--no-deprecation", "--no-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=512", "/skill/node_modules/.bin/atm-skill"]
CMD ["run"]
