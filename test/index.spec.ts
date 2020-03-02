import fs from 'fs';
import got from 'got';
import nock from 'nock';
import path from 'path';
import { CookieJar } from 'tough-cookie';
import delay from 'delay';

import { catchCloudflare, isCloudflareCaptcha, solveChallenge, getRValue } from '../src/index';

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

  it('should solve 2019 2', () => {
    // s: e885b4e1d4a93b0b61b35e774509ae8893ffc3f5-1555348395-1800-AVgJfh4VVClA4mXWS90lbN3XZgES4G3zzrbRJzAKrLyms0wI/Q2rAmaAN+3VRM7d9qUfuN2bAWJ5752CYLtQp6EVzo2qy5ihe7b1/SBToJPLOuHVkSNUFozcrjR+kGSYbg==
    // jschl_vc: 587fc2b85a3c9428804824be83d7396f
    // pass: 1555348399.578-lFLanmqVHt
    // jschl_answer: 10.5544338984
    const html = fs.readFileSync(path.join(__dirname, './html/2019_2'), 'utf8');
    const challenge = solveChallenge(html, 'rlsbb.ru');
    // i dunno
    expect(challenge.answer).toBe(30.8145977062);
    expect(challenge.ms).toBe(4000);
  });

  it('should spot captcha', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/captcha'), 'utf8');
    expect(isCloudflareCaptcha(html)).toBe(true);
  });

  it('should spot captcha 2019', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_captcha_1'), 'utf8');
    expect(isCloudflareCaptcha(html)).toBe(true);
  });

  it('should spot captcha 2019 2', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_captcha_2'), 'utf8');
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
        jschl_vc: '427c2b1cd4fba29608ee81b200e94bfa',
        pass: '1543827239.915-44n9IE20mS',
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
    const options: any = {
      url: 'http://example.com/search',
      retry: {
        retries: 0,
        statusCodes: [408, 413, 429, 500, 502, 504],
      },
      cookieJar,
    };

    let res: any;
    try {
      res = await got.get(options);
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
      .get(
        '/cdn-cgi/l/chk_jschl?jschl_vc=1e569d1d635fbd9058c76a0603a48398&pass=1554683890.976-BCVIl1%2BamT&jschl_answer=-53.2834707752&s=952a9c14c8ff41d0a7e2536916d4c48bbe8b614c-1554683886-1800-AUYflGr0kMAOZ6sitOwGdIjGxpLVXarkUQV6c5NBF3iZnTTud7cOG%2BszYmJXI404pK4OGNJ%2BqJMQnYig71bNf08dVYaC7FwFYhvDBgfdcTQNMCjDBoMlkFI61kchaoXU%2FA%3D%3D',
      )
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
    const options: any = {
      url: 'http://example.com/search',
      retry: {
        retries: 0,
        statusCodes: [408, 413, 429, 500, 502, 504],
      },
      cookieJar,
    };

    let res: any;
    try {
      res = await got.get(options);
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

  it('should get r value', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_3'), 'utf8');
    const result = getRValue(html);
    expect(result).toHaveProperty(
      'r',
      '6f1075a4b86ca26cfe982f36050e92bdfb709f75-1575008528-0-ATm//i2nsd2Iv5QIdr90QBJ07vIYc7kvjbdrqrCAPF2wjQ6WenG6ZErJOFqWISFxtz03BZY5YeNKnbv8jS6II7ZjnyPzbFRQNjNyf/oAbncGR3ZeWa2RKfEjG5SzrhUjNLwH+KucK29s3kz2UoSCNN9jOLirh0kCkQIR5B0NjOI8YuK5RE9US9UTAgEvEQmo7lgSDmmLY/LgHC3HyNuDUg/DRAuU+r/n9zlk4pfL8RpV80mxrG7Z8sRJ+skTuvxHeN7zr7K4IIsjnpz5ccy/nI8IxiNuQQ5+JR/8ENXCVY1S1UHMPlxIYPldJwpYTVTHMoQXs2ZDKRMsBECy+j/YJllGLtbH/IfdTbor1qih9BYpaQF9dyrp+Usqg5w5o4SgAcon+LhJlADUfxhVy5CagpPXIlcDBJnSi31RRUMFl6aLI4BN7KzWz/6yx709MjezOEz1KndXO+N5WRpDWGp9oasXiDQcRtjRYpjlgBUpzhrb/MYlQ9C2Z773Ti70zM50Y1x3JDFUnjh4SCqsR6Hcu69KcP4FhCH/oFjrTRkrfcWUHcA1VGqMLIdhpMzJRGkkpps6qMFAEcdsILAh5Q9PSdYkGAYGaxNdnOgyXVPloY/dS2bLXP9QOLs+Twqpi4eSve73rSq0+ypnrnA0pmgwc/BIcA3PsSoGSmVz+AOoudAOWQyBsIPbT0Vp0x55ABPMeuYefvGI6RvQ5yEIKBRA8VFkIn/vBjD/b/dasSskb6UduiGrJ8f+OZYRnrRvXF/RQBNobs2c4UZLasbKYf8TZ0nY5P9KNgTilOeMHXtJaPJ6nfWJE7dZea1MHFm2uvO9Dl8ItsF71AcreEOcuPCf9Yf/Kj3SY84WZYAwiYxHKgIAtbLCNpGjeTWgTm5n5fCXRTehhjMZcQihvBOE4OHdrZlEtTcFZme9ELVCoBwV6FV+I+cHr7nlzYpHya6oqacfKu0jE4u9fSEoJVzPLb2oWoMevkoyoreYmvRgFPDvlISuwM5PBpOLB1PgwXY8LumHeV7cQQePlyl9pyGsevTRMgTyJeKkwECyAZjbreSeDV1BdeFd+YZzls55aQmosqJBkCGtDSVvjB7gf+hiS9tSxUAse4yOm7ayYv/dyVBvMY6R8Sjmd0nPYyHzrEhFDFgbeadYnQyt0LDIaxT8RUphIZ/PQl5BndMWVX9zlgLAlNrawnldPkOtL+WD6yuvlbytis1OT5XfhozJTYyPKrg7sen2U8g9Mdsss9Yhj3X9FW6qBrx9s1eN5qrOx97Cf56tqS3OQg1q3jG5Ki7wtfnsdyZAEvzm/gREW69nP2O03EbLkeoRhBPghOZa/dR0n2nKTXo5dhpaGdVstQjToWR50+wFflcMdW7mYg/kwcLeJGP/MYo/u8WyRwRWnP+Al4/ONEOSCvP8dTS7S6PjWWfMl4HMJuOW5GyN7ndhzxzSmreutOig27Fz0KCJprHqgKhXKfuji1ZLYDeWtVHuWKnBQSWgyBfMWpd/gR/bdeYdRzIO1Hjgl5SbMskfKkgJMSqfS1i3v+y/DvbAEqYSQ7aoYDGputMZkBiKeE6AAsBtsV41',
    );
  });

  it('should catch cloudflare page and solve challenge 2019 3', async () => {
    // failed request blocked by cloudflare
    const html = fs.readFileSync(path.join(__dirname, './html/2019_3'), 'utf8');
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
      .post(
        '/search',
        {
          r:
            '6f1075a4b86ca26cfe982f36050e92bdfb709f75-1575008528-0-ATm//i2nsd2Iv5QIdr90QBJ07vIYc7kvjbdrqrCAPF2wjQ6WenG6ZErJOFqWISFxtz03BZY5YeNKnbv8jS6II7ZjnyPzbFRQNjNyf/oAbncGR3ZeWa2RKfEjG5SzrhUjNLwH+KucK29s3kz2UoSCNN9jOLirh0kCkQIR5B0NjOI8YuK5RE9US9UTAgEvEQmo7lgSDmmLY/LgHC3HyNuDUg/DRAuU+r/n9zlk4pfL8RpV80mxrG7Z8sRJ+skTuvxHeN7zr7K4IIsjnpz5ccy/nI8IxiNuQQ5+JR/8ENXCVY1S1UHMPlxIYPldJwpYTVTHMoQXs2ZDKRMsBECy+j/YJllGLtbH/IfdTbor1qih9BYpaQF9dyrp+Usqg5w5o4SgAcon+LhJlADUfxhVy5CagpPXIlcDBJnSi31RRUMFl6aLI4BN7KzWz/6yx709MjezOEz1KndXO+N5WRpDWGp9oasXiDQcRtjRYpjlgBUpzhrb/MYlQ9C2Z773Ti70zM50Y1x3JDFUnjh4SCqsR6Hcu69KcP4FhCH/oFjrTRkrfcWUHcA1VGqMLIdhpMzJRGkkpps6qMFAEcdsILAh5Q9PSdYkGAYGaxNdnOgyXVPloY/dS2bLXP9QOLs+Twqpi4eSve73rSq0+ypnrnA0pmgwc/BIcA3PsSoGSmVz+AOoudAOWQyBsIPbT0Vp0x55ABPMeuYefvGI6RvQ5yEIKBRA8VFkIn/vBjD/b/dasSskb6UduiGrJ8f+OZYRnrRvXF/RQBNobs2c4UZLasbKYf8TZ0nY5P9KNgTilOeMHXtJaPJ6nfWJE7dZea1MHFm2uvO9Dl8ItsF71AcreEOcuPCf9Yf/Kj3SY84WZYAwiYxHKgIAtbLCNpGjeTWgTm5n5fCXRTehhjMZcQihvBOE4OHdrZlEtTcFZme9ELVCoBwV6FV+I+cHr7nlzYpHya6oqacfKu0jE4u9fSEoJVzPLb2oWoMevkoyoreYmvRgFPDvlISuwM5PBpOLB1PgwXY8LumHeV7cQQePlyl9pyGsevTRMgTyJeKkwECyAZjbreSeDV1BdeFd+YZzls55aQmosqJBkCGtDSVvjB7gf+hiS9tSxUAse4yOm7ayYv/dyVBvMY6R8Sjmd0nPYyHzrEhFDFgbeadYnQyt0LDIaxT8RUphIZ/PQl5BndMWVX9zlgLAlNrawnldPkOtL+WD6yuvlbytis1OT5XfhozJTYyPKrg7sen2U8g9Mdsss9Yhj3X9FW6qBrx9s1eN5qrOx97Cf56tqS3OQg1q3jG5Ki7wtfnsdyZAEvzm/gREW69nP2O03EbLkeoRhBPghOZa/dR0n2nKTXo5dhpaGdVstQjToWR50+wFflcMdW7mYg/kwcLeJGP/MYo/u8WyRwRWnP+Al4/ONEOSCvP8dTS7S6PjWWfMl4HMJuOW5GyN7ndhzxzSmreutOig27Fz0KCJprHqgKhXKfuji1ZLYDeWtVHuWKnBQSWgyBfMWpd/gR/bdeYdRzIO1Hjgl5SbMskfKkgJMSqfS1i3v+y/DvbAEqYSQ7aoYDGputMZkBiKeE6AAsBtsV41',
          jschl_vc: '37f5c67a82dd9cd6b9239bd185a21e8b',
          pass: '1575008532.865-SJzufpXp5T',
          // jschl_answer: 11.0424687495,
          jschl_answer: 14.0424687495,
        },
      )
      .query({
        __cf_chl_jschl_tk__: 'f539ef78a6f8f16e2bbd6f5ac58521fac384f768-1575008528-0-AWIaFifdVJx1IsVKH1F3nFTl3hj41-_-hUwBdgc71_bOu_193CjxrjpPl-UnZnGjYe2OU_7y64hQ_cptYoZ-oA2BnXQL_J9QlV_Cm-BXF4J16nH-OVR7TVRI4Z1ZqAkRKcmUBuaZxms22Eb6dRzqukKDOMkrer9RVjPv0T1uE_8TZ4zm0ln3Bg8kY9jf9NEHfa5zLtlC5UuA_k89Kfl76dOSVPipJoZgc1UG_1-jdL_GfSbVYicODVgOVUaJb211nAcmK0lFZO3Gretccn_SkeE',
      })
      .reply(200, success);

    const cookieJar = new CookieJar();
    const options: any = {
      url: 'http://example.com/search',
      retry: {
        retries: 0,
        statusCodes: [408, 413, 429, 500, 502, 504],
      },
      cookieJar,
    };

    let res: any;
    try {
      res = await got.get(options);
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
  });
});
