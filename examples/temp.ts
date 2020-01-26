import { catchCloudflare } from '../src/index';
import got, { GotOptions } from 'got';
import { CookieJar } from 'tough-cookie';
import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';
import * as cloudscraper from 'cloudscraper';
import XHRAdapter from '@pollyjs/adapter-xhr';
import FetchAdapter from '@pollyjs/adapter-fetch';

// Register the node http adapter so its accessible by all future polly instances
Polly.register(NodeHttpAdapter);
Polly.register(XHRAdapter);
Polly.register(FSPersister);
Polly.register(FetchAdapter);

const polly = new Polly('rlsbb', {
  adapters: ['node-http'],
  persister: 'fs',
});

polly.configure({ recordFailedRequests: true });

polly.server.get('/*').passthrough().configure({ recordFailedRequests: true });
polly.server.post('/*').passthrough().configure({ recordFailedRequests: true });

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
    res = await got.get('https://rlsbb.ru', options);
    return res;
  } catch (error) {
    // success with cloudflare?
    res = await catchCloudflare(error, options);
  }

  return res.body;
}

main()
  .then((res) => console.log('success'))
  .then(() => polly.stop())
  .catch(() => console.error('fail'));

