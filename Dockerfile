# Set up build
FROM node:lts@sha256:19863f7a60bf35efb062b8633131a779c290f735953c4dc427a3033900f2b22f AS build

WORKDIR /usr/src

COPY . ./

RUN npm ci --no-optional && \
    npm run compile && \
    rm -rf node_modules .git

FROM node:lts@sha256:359104ed81c918c2ca3bfb01faa069e33949013fde25c6a471b0fa27d19d78ca

WORKDIR "/skill"

RUN npm i -g depcheck

COPY package.json package-lock.json ./

RUN npm ci --no-optional \
    && npm cache clean --force

COPY --from=build /usr/src/ .

WORKDIR "/atm/home"

ENV NODE_NO_WARNINGS 1

ENTRYPOINT ["node", "--no-deprecation", "--no-warnings", "--expose_gc", "--optimize_for_size", "--always_compact", "--max_old_space_size=512", "/skill/node_modules/.bin/atm-skill"]
CMD ["run"]
