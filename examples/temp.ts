import { catchCloudflare } from '../src/index';
import got from 'got';
import { CookieJar } from 'tough-cookie';
import uaString from 'ua-string';

// example helper function
async function main() {
  // cookie jar required
  const cookieJar = new CookieJar();
  const options: any = {
    cookieJar,
    headers: {
      // helps to pass user-agent
      'user-agent': uaString,
    },
    retry: {
      // either disable retry or remove status code 503 from retries
      // retries: 0,
      statusCodes: [408, 413, 429, 500, 502, 504],
    },
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
  .then(x => console.log(x))
  .catch(e => console.error(e));

