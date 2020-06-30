import got from 'got';
import { CookieJar } from 'tough-cookie';
const tunnel = require('tunnel');
const parse = require('parse-headers')
const cookie = require('cookie')

import { catchCloudflare } from '../src/index';

// example helper function
async function main() {
  // cookie jar is required!
  const cookieJar = new CookieJar();
  const options = {
    // use "url: to describe path
    url: 'http://soap2day.is',
    cookieJar,
    // either disable retry or remove status code 503 from retries
    retry: 0,

    agent: {
      https: tunnel.httpOverHttp({
        proxy: {
          host: 'ip',
          port: 1256,

          // Basic authorization for proxy server if necessary
          proxyAuth: '',

          // Header fields for proxy server if necessary
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.129 Safari/537.36',
          },
        },
      }),
    },
  };

  let res: any;
  try {
    // success without cloudflare?
    // const res = await cloudscraper({
    //   method: 'GET',
    //   url: 'https://rlsbb.ru/support-us',
    // });
    res = await got.get(options);
    return res;
  } catch (error) {
    // success with cloudflare?
    res = await catchCloudflare(error, options);
  }

  return cookie.parse(parse(res.req._header).cookie);
}

main()
  .then((res) => console.log(res))
  .catch((err) => console.error('fail', err));
