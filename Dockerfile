# Set up build
FROM node:lts@sha256:4164d987bfceb62b17db4938d535dd31fc50d6ee0b4e00ac7a774f82af408d48 AS build

WORKDIR /usr/src

COPY . ./

RUN npm ci --no-optional && \
    npm run compile && \
    rm -rf node_modules .git

FROM atomist/skill:node14@sha256:c58582642c85f2767523a3b65cbddd41f50814c98fe1c805b44c8caf5f0ad89e

WORKDIR "/skill"

RUN npm i -g depcheck

COPY package.json package-lock.json ./

RUN npm ci --no-optional \
    && rm -rf /root/.npm

COPY --from=build /usr/src/ .

WORKDIR "/atm/home"

ENTRYPOINT ["node", "--no-deprecation", "--no-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=512", "/skill/node_modules/.bin/atm-skill"]
CMD ["run"]
