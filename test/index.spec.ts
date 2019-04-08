import fs from 'fs';
import got, { GotOptions } from 'got';
import nock from 'nock';
import path from 'path';
import { CookieJar } from 'tough-cookie';
import uaString from 'ua-string';
import delay from 'delay';

import { catchCloudflare, isCloudflareCaptcha, solveChallenge } from '../src/index';

// disable timeout for tests
jest.mock('delay');
(delay as any).mockImplementation(async () => Promise.resolve());

describe('cloudflare', () => {
  it('should solve 2018 1', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2018_1'), 'utf8');
    const challenge = solveChallenge(html, 'example-site.dev');
    expect(challenge.answer).toBe('example-site.dev'.length + -5.33265406);
    expect(challenge.ms).toBe(4000);
  });

  it('should solve 2018 2', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2018_2'), 'utf8');
    const challenge = solveChallenge(html, 'example-site.dev');
    expect(challenge.answer).toBe('example-site.dev'.length + -1.9145049856);
    expect(challenge.ms).toBe(4000);
  });

  it('should solve 2019 1', () => {
    // s: 952a9c14c8ff41d0a7e2536916d4c48bbe8b614c-1554683886-1800-AUYflGr0kMAOZ6sitOwGdIjGxpLVXarkUQV6c5NBF3iZnTTud7cOG+szYmJXI404pK4OGNJ+qJMQnYig71bNf08dVYaC7FwFYhvDBgfdcTQNMCjDBoMlkFI61kchaoXU/A==
    // jschl_vc: 1e569d1d635fbd9058c76a0603a48398
    // pass: 1554683890.976-BCVIl1+amT
    // jschl_answer: -53.2834708595
    const html = fs.readFileSync(path.join(__dirname, './html/2019_1'), 'utf8');
    const challenge = solveChallenge(html, 'example-site.dev');
    expect(challenge.answer).toBe(-53.2834707752);
    expect(challenge.ms).toBe(4000);
  });

  it('should spot captcha', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/captcha'), 'utf8');
    expect(isCloudflareCaptcha(html)).toBe(true);
  });

  it('should catch cloudflare page and solve challenge 2018 1', async () => {
    // failed request blocked by cloudflare
    const html = fs.readFileSync(path.join(__dirname, './html/2018_1'), 'utf8');
    const f = nock('http://example.com')
      .get('/search')
      .reply(503, html, {
        server: 'cloudflare',
      });

    const success = '<h1>Hello</h1>';
    const n = nock('http://example.com', {
      reqheaders: {
        referer: 'http://example.com/search',
      },
    })
      .get('/cdn-cgi/l/chk_jschl')
      .query({
        // eslint-disable-next-line @typescript-eslint/camelcase
        jschl_vc: '427c2b1cd4fba29608ee81b200e94bfa',
        pass: '1543827239.915-44n9IE20mS',
        // eslint-disable-next-line @typescript-eslint/camelcase
        jschl_answer: '5.66734594',
        s: '',
      })
      .reply(302, '', {
        Location: 'http://torrentz2.eu/search?f=zoolander',
        server: 'cloudflare',
      });

    const z = nock('http://torrentz2.eu')
      .get('/search')
      .query({
        f: 'zoolander',
      })
      .reply(200, success, {
        location: 'https://torrentz2.eu/searchA?f=zoolander',
      });

    const cookieJar = new CookieJar();
    const options: GotOptions<null> = {
      path: '/search',
      retry: {
        retries: 0,
        statusCodes: [408, 413, 429, 500, 502, 504],
      },
      cookieJar,
      headers: { 'user-agent': uaString },
    };

    let res: any;
    try {
      res = await got.get('http://example.com', options);
      // always will throw
      expect(false).toBe(true);
    } catch (err) {
      // first request is fufilled
      expect(f.isDone()).toBe(true);
      // catch our cloudflare error
      res = await catchCloudflare(err, options);
    }

    expect(res.body).toBe(success);
    expect(n.isDone()).toBe(true);
    expect(z.isDone()).toBe(true);
  });

  it('should catch cloudflare page and solve challenge 2019 1', async () => {
    // failed request blocked by cloudflare
    const html = fs.readFileSync(path.join(__dirname, './html/2019_1'), 'utf8');
    const f = nock('http://example.com')
      .get('/search')
      .reply(503, html, {
        server: 'cloudflare',
      });

    const success = '<h1>Hello</h1>';
    const n = nock('http://example.com', {
      reqheaders: {
        referer: 'http://example.com/search',
      },
    })
      // not sure why this wouldn't work as a query
      .get('/cdn-cgi/l/chk_jschl?jschl_vc=1e569d1d635fbd9058c76a0603a48398&pass=1554683890.976-BCVIl1%2BamT&jschl_answer=-53.2834707752&s=952a9c14c8ff41d0a7e2536916d4c48bbe8b614c-1554683886-1800-AUYflGr0kMAOZ6sitOwGdIjGxpLVXarkUQV6c5NBF3iZnTTud7cOG%2BszYmJXI404pK4OGNJ%2BqJMQnYig71bNf08dVYaC7FwFYhvDBgfdcTQNMCjDBoMlkFI61kchaoXU%2FA%3D%3D')
      .reply(302, '', {
        Location: 'http://torrentz2.eu/search?f=zoolander',
        server: 'cloudflare',
      });

    const z = nock('http://torrentz2.eu')
      .get('/search')
      .query({
        f: 'zoolander',
      })
      .reply(200, success, {
        location: 'https://torrentz2.eu/searchA?f=zoolander',
      });

    const cookieJar = new CookieJar();
    const options: GotOptions<null> = {
      path: '/search',
      retry: {
        retries: 0,
        statusCodes: [408, 413, 429, 500, 502, 504],
      },
      cookieJar,
      headers: { 'user-agent': uaString },
    };

    let res: any;
    try {
      res = await got.get('http://example.com', options);
      // always will throw
      expect(false).toBe(true);
    } catch (err) {
      // first request is fufilled
      expect(f.isDone()).toBe(true);
      // catch our cloudflare error
      res = await catchCloudflare(err, options);
    }

    expect(res.body).toBe(success);
    expect(n.isDone()).toBe(true);
    expect(z.isDone()).toBe(true);
  });

  it('should catch non-puzzle', () => {
    const html = '<div>Hello</div>';
    expect(() => solveChallenge(html, 'example-site.dev')).toThrow();
  });
});
