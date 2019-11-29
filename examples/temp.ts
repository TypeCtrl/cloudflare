import { catchCloudflare } from '../src/index';
import got, { GotOptions } from 'got';
import { CookieJar } from 'tough-cookie';

// example helper function
async function main() {
  // cookie jar is required!
  const cookieJar = new CookieJar();
  const options: GotOptions<any> = {
    cookieJar,
    // either disable retry or remove status code 503 from retries
    retry: 0,
  };

  let res: got.Response<any>;
  try {
    // success without cloudflare?
    res = await got('https://rlsbb.ru/', options);
  } catch (error) {
    // success with cloudflare?
    res = await catchCloudflare(error, options);
  }

  return res.body;
}

main()
  .then(x => console.log('success', x.body))
  .catch(e => console.error('error', e));

