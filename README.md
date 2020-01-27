# cloudflare scrape [![npm](https://img.shields.io/npm/v/@ctrl/cloudflare.svg?maxAge=3600)](https://www.npmjs.com/package/@ctrl/cloudflare) [![CircleCI](https://circleci.com/gh/TypeCtrl/cloudflare.svg?style=svg)](https://circleci.com/gh/TypeCtrl/cloudflare) [![coverage status](https://codecov.io/gh/typectrl/cloudflare/branch/master/graph/badge.svg)](https://codecov.io/gh/typectrl/cloudflare)

> Bypass Cloudflare's anti-bot page also known as I'm Under Attack Mode

Based on python library [cloudflare-scrape](https://github.com/Anorov/cloudflare-scrape)

The anti-bot page requires a JS obfuscated math problem and http form submission after a setTimeout. The setTimeout is required, so bypassing cloudflare takes about 6 seconds.


### Install
```sh
npm install @ctrl/cloudflare
```

### Use
This package is meant to be used with [got](https://github.com/sindresorhus/got). After a failed request, use the `catchCloudflare` function to resolve your request.

Requires passing cookiejar to got. Reusing the cookiejar in subsequent requests will bypass the cloudflare anti-bot page, until the cookie expires.

Call `catchCloudflare(err, options)` passing the error and the options used to make the request. `catchCloudflare` will rethrow if it is unable to bypass of if the error is not cloudflare related.

```ts
import { catchCloudflare } from '@ctrl/cloudflare';
import got from 'got';
import { CookieJar } from 'tough-cookie';

// example helper function
async function main() {
  // cookie jar is required! speed up future requests by keeping a persistant cookie jar
  const cookieJar = new CookieJar();
  const options = {
    // use "url: to describe path
    url: 'https://rlsbb.ru/support-us',
    cookieJar,
    // either disable retry or remove status code 503 from retries
    retry: 0,
  };

  let res: got.Response<any>;
  try {
    // success without cloudflare?
    res = await got(options);
  } catch (error) {
    // success with cloudflare?
    res = await catchCloudflare(error, options);
  }

  return res.body;
}
```

### See Also
- [cloudflare-scrape](https://github.com/Anorov/cloudflare-scrape) - python bypass using V8
- [cloudscraper](https://github.com/codemanki/cloudscraper) - js cloudflare solver using [request](https://github.com/request/request)
- [cloudflare-scrape-js2py](https://github.com/VeNoMouS/cloudflare-scrape-js2py) - python bypass
