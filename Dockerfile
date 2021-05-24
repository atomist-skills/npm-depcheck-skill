# Set up build
FROM node:lts@sha256:9025a77b2f37fcda3bbd367587367a9f2251d16a756ed544550b8a571e16a653 AS build

WORKDIR /usr/src

COPY . ./

RUN npm ci --no-optional && \
    npm run compile && \
    rm -rf node_modules .git

FROM atomist/skill:node14@sha256:1f5574256296251d381a78d1987b83723534b419409d54a1a12b5595e23fb47f

WORKDIR "/skill"

RUN npm i -g depcheck

COPY package.json package-lock.json ./

RUN npm ci --no-optional \
    && rm -rf /root/.npm

COPY --from=build /usr/src/ .

WORKDIR "/atm/home"

ENTRYPOINT ["node", "--no-deprecation", "--no-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=512", "/skill/node_modules/.bin/atm-skill"]
CMD ["run"]
