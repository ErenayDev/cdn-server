# CDN

I didn't specified a special name for this repository. You can use this system for your systems.

## What's Included
Hmm. In `server` directory, the backend written in `Elysia.js` greets you. In there you can will edit the `.env.template` then rename it to `.env`. Also I tried to reduce the cognitive load by breaking the project down into files as much as possible. So you can develop this backend more as you can.
Anyway, In the `loadbalancer` directory, the other backend written in `Encore` is in there. This load balancer takes the request's geo location and directs the request to the nearest server.

You can see the `cdn3.png` file for detailed sequence mermaid diagram.

## Installation

### Elysia.js server

------

Install `Bun` runtime first if it is not installed

```sh
curl -fsSL https://bun.sh/install | bash
```

------

Then just go to `server` directory and write this for install dependencies:

```sh
cd server
```

```sh
bun install
```

------

### Encore server

------

Install `encore` runtime first if it is not installed

```sh
curl -L https://encore.dev/install.sh | bash
```

Then just go to `loadbalancer` directory and write this for install dependencies:

```sh
cd loadbalancer
```

```sh
bun install
```

------

(Optional) GeoIP Database Update

If you wanna update your GeoIP database from MaxMind with your license key, please write this after installing dependencies:

```sh
node ./node_modules/geoip-lite/scripts/updatedb.js license_key=YOUR_LICENSE_KEY
```

------

## Running

### Elysia.js server

-------

#### Development

```sh
bun --bun run dev
```

-----

#### Production

Firstly build your backend with:

```sh
bun --bun run build
```

Then just write this to run anywhere you want (Requires Bun, just Node.js it won't work)

```sh
bun --bun dist # dist/index.js | or whatever your file name
```

-------

### Encore server

-------

#### Development

```sh
bun --bun run dev
```

-----

#### Production

Firstly build your backend with:

```sh
encore dev
```

-------

## Known Issues

- A time after, the redis client server connection closes sometimes.

## Contributing

Feel free to open a PR, issue.

<a href="https://github.com/ErenayDev/cdn-server/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ErenayDev/cdn-server" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

### License
GNU GENERAL PUBLIC LICENSE@3
