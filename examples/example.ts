import got from 'got';
import { CookieJar } from 'tough-cookie';
// import cloudscraper from 'cloudscraper';

import { catchCloudflare } from '../src/index';

// example helper function
async function main() {
  // cookie jar is required!
  const cookieJar = new CookieJar();
  const options = {
    // use "url: to describe path
    url: 'https://rlsbb.ru/support-us',
    cookieJar,
    // either disable retry or remove status code 503 from retries
    retry: 0,
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

  return res.body;
}

main()
  .then(res => console.log(res))
  .catch(err => console.error('fail', err));
