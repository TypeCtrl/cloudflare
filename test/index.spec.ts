import fs from 'fs';
import got from 'got';
import nock from 'nock';
import path from 'path';
import { CookieJar } from 'tough-cookie';
import delay from 'delay';

import {
  catchCloudflare,
  isCloudflareCaptcha,
  solveChallenge,
  getRValue,
  jschlValue,
  passValue,
  sValue,
} from '../src/catchCloudflare';
import { getJschlTk } from '../src/catchCloudflare';

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

  it('should solve 2020_2', () => {
    // s: e885b4e1d4a93b0b61b35e774509ae8893ffc3f5-1555348395-1800-AVgJfh4VVClA4mXWS90lbN3XZgES4G3zzrbRJzAKrLyms0wI/Q2rAmaAN+3VRM7d9qUfuN2bAWJ5752CYLtQp6EVzo2qy5ihe7b1/SBToJPLOuHVkSNUFozcrjR+kGSYbg==
    // jschl_vc: 587fc2b85a3c9428804824be83d7396f
    // pass: 1555348399.578-lFLanmqVHt
    // jschl_answer: 10.5544338984
    const html = fs.readFileSync(path.join(__dirname, './html/2020_2'), 'utf8');
    const challenge = solveChallenge(html, 'masiro.moe');
    expect(challenge.answer).toBe(9.1357171395);
    expect(challenge.ms).toBe(4000);
  });

  it('should get sValue 2019_1', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_1'), 'utf8');
    const pass = sValue(html);
    expect(pass).toBe(
      '952a9c14c8ff41d0a7e2536916d4c48bbe8b614c-1554683886-1800-AUYflGr0kMAOZ6sitOwGdIjGxpLVXarkUQV6c5NBF3iZnTTud7cOG+szYmJXI404pK4OGNJ+qJMQnYig71bNf08dVYaC7FwFYhvDBgfdcTQNMCjDBoMlkFI61kchaoXU/A==',
    );
  });

  it('should get passValue 2019_3', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_3'), 'utf8');
    const pass = passValue(html);
    expect(pass).toBe('1575008532.865-SJzufpXp5T');
  });

  it('should get passValue 2020_1', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_1'), 'utf8');
    const pass = passValue(html);
    expect(pass).toBe('1588275807.664-kzBLOqvn3Q');
  });

  it('should get passValue 2020_2', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_2'), 'utf8');
    const pass = passValue(html);
    expect(pass).toBe('1588287299.732-RcbpS+TZfq');
  });

  it('should get jschlValue 2019_3', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_3'), 'utf8');
    const jsch = jschlValue(html);
    expect(jsch).toBe('37f5c67a82dd9cd6b9239bd185a21e8b');
  });

  it('should get jschlValue 2020_1', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_1'), 'utf8');
    const jsch = jschlValue(html);
    expect(jsch).toBe('d0ee39116ea50487dc16670c6fcdaaed');
  });

  it('should get jschlValue 2020_2', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_2'), 'utf8');
    const jsch = jschlValue(html);
    expect(jsch).toBe('973e8948fd9b003e234792c4d8f0d244');
  });

  it('should get r value 2019_3', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2019_3'), 'utf8');
    const result = getRValue(html);
    expect(result).toHaveProperty(
      'r',
      '6f1075a4b86ca26cfe982f36050e92bdfb709f75-1575008528-0-ATm//i2nsd2Iv5QIdr90QBJ07vIYc7kvjbdrqrCAPF2wjQ6WenG6ZErJOFqWISFxtz03BZY5YeNKnbv8jS6II7ZjnyPzbFRQNjNyf/oAbncGR3ZeWa2RKfEjG5SzrhUjNLwH+KucK29s3kz2UoSCNN9jOLirh0kCkQIR5B0NjOI8YuK5RE9US9UTAgEvEQmo7lgSDmmLY/LgHC3HyNuDUg/DRAuU+r/n9zlk4pfL8RpV80mxrG7Z8sRJ+skTuvxHeN7zr7K4IIsjnpz5ccy/nI8IxiNuQQ5+JR/8ENXCVY1S1UHMPlxIYPldJwpYTVTHMoQXs2ZDKRMsBECy+j/YJllGLtbH/IfdTbor1qih9BYpaQF9dyrp+Usqg5w5o4SgAcon+LhJlADUfxhVy5CagpPXIlcDBJnSi31RRUMFl6aLI4BN7KzWz/6yx709MjezOEz1KndXO+N5WRpDWGp9oasXiDQcRtjRYpjlgBUpzhrb/MYlQ9C2Z773Ti70zM50Y1x3JDFUnjh4SCqsR6Hcu69KcP4FhCH/oFjrTRkrfcWUHcA1VGqMLIdhpMzJRGkkpps6qMFAEcdsILAh5Q9PSdYkGAYGaxNdnOgyXVPloY/dS2bLXP9QOLs+Twqpi4eSve73rSq0+ypnrnA0pmgwc/BIcA3PsSoGSmVz+AOoudAOWQyBsIPbT0Vp0x55ABPMeuYefvGI6RvQ5yEIKBRA8VFkIn/vBjD/b/dasSskb6UduiGrJ8f+OZYRnrRvXF/RQBNobs2c4UZLasbKYf8TZ0nY5P9KNgTilOeMHXtJaPJ6nfWJE7dZea1MHFm2uvO9Dl8ItsF71AcreEOcuPCf9Yf/Kj3SY84WZYAwiYxHKgIAtbLCNpGjeTWgTm5n5fCXRTehhjMZcQihvBOE4OHdrZlEtTcFZme9ELVCoBwV6FV+I+cHr7nlzYpHya6oqacfKu0jE4u9fSEoJVzPLb2oWoMevkoyoreYmvRgFPDvlISuwM5PBpOLB1PgwXY8LumHeV7cQQePlyl9pyGsevTRMgTyJeKkwECyAZjbreSeDV1BdeFd+YZzls55aQmosqJBkCGtDSVvjB7gf+hiS9tSxUAse4yOm7ayYv/dyVBvMY6R8Sjmd0nPYyHzrEhFDFgbeadYnQyt0LDIaxT8RUphIZ/PQl5BndMWVX9zlgLAlNrawnldPkOtL+WD6yuvlbytis1OT5XfhozJTYyPKrg7sen2U8g9Mdsss9Yhj3X9FW6qBrx9s1eN5qrOx97Cf56tqS3OQg1q3jG5Ki7wtfnsdyZAEvzm/gREW69nP2O03EbLkeoRhBPghOZa/dR0n2nKTXo5dhpaGdVstQjToWR50+wFflcMdW7mYg/kwcLeJGP/MYo/u8WyRwRWnP+Al4/ONEOSCvP8dTS7S6PjWWfMl4HMJuOW5GyN7ndhzxzSmreutOig27Fz0KCJprHqgKhXKfuji1ZLYDeWtVHuWKnBQSWgyBfMWpd/gR/bdeYdRzIO1Hjgl5SbMskfKkgJMSqfS1i3v+y/DvbAEqYSQ7aoYDGputMZkBiKeE6AAsBtsV41',
    );
  });

  it('should get r value 2020_1', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_1'), 'utf8');
    const result = getRValue(html);
    expect(result).toHaveProperty(
      'r',
      '09d0006827d8584de98c5e40f1e9bc45e028c969-1588275803-0-AQae7Lk0KG3WoC7L6HMNnYNJNXJAB7g/f+cuv+k8bRdZhuN85ul0nLmeVrbh5RgGnLrygZ20Czh3a1mRd81YlgdIPFbyPdpivA9Bvgk+f0yQFMO59F84IizGdCj0933EZ7/hDY6ZGmtkd3kEpVAiu6E3cCDiKhch++p8HagSCfo5EfICCFm7J0dFurYmjmCrZyOp1qAGKg1O+Q8znmSwXDxFPpWL3e22QuLataJqJYRsPJADKOKTmWSeChPCQjPFQo/XnjKXcFjNA09YsSF1XxgULHAzMRNhnapgBGLcItI4COpYYRMspFvllsEe4eM7epCcxXcE8KWGO+egujF5S0D/VtGTwm11poWXxqzkTJoYd+pSzFKBSsJLYj8YMbo08d8rbRORfmU+HrY6L0twUBxGvFPBMpL8mUr/4YLONxvRO6OOzyE/z2FVwQQisMwrV5/sboRbccHnibvG+bwkNLORSLzrhNSjJxDf2kd3s6rATUYiNTfPG3RhgQf25HcWr8GLqksFGb0pdYracL7RtiFl24bq+uMLS8ZR2xdB9DX8mhjlDBTePzykNl/fXqOQ0z0l74vLa1icJ6XiyWhl/YM4SFy1ql49M/VlOim+IuMpH4pW4uekLMk7ekuwfW0EFGcejEnAmRbmJlofCrMuA1eitkYIKJ09Woqv2V3YnEN+ysa0OIP6M93MdtYTi379j6O7wua0eXlizcN5blKRQGU0qKf0Dlx5YT4ivwW03VyA6i8yJRt+vjcQCFJxsfQC3A1F7Kvv2DL3rCqUrEjiqVFB++AD4pYn8IyMLMYnWY7zGHPz5/2vSQUDdKsrPD3rlXYCymdPs906zQyJdFZLMtGOyNn2Aa1/HbDRfm2BNyn4y9DidQJLWegDSpw6c4Xmo4wtLv7HP0BZNI3RCLvu89b4ekDj5+9siT23lNySIE+UiEXvsPjWWMQVt76VCSyI05gR1RR7Bi9JU58tMWKTPpb9xR1Y2NCzgIoy1HzIY7KlVvngyCFW82UU+FtxH5YEK91xA6ubk+s6Uk0vTLtzf9XMMwB7u0WhcAZOgBqrlWGdr8yOGdM5eOOGvPPHi1rVFvgBhNb2fTyLvvidyX0IW1LW0QQTdyhSfJVxorSVsZMOJzO3S3m4nfD/Ety41Xl9TGYLAEIkNIm6wIEGXqf3Zd9j1ZUOnTEALMw6WWI9mUqrzlX3R/QRD6/LiYh/kaxm9NhwCoVW+IWA/U5bvV3eg/ZQkD5yL8qGURiKQocRThz6aVmy52KBCgzHayaMl/zniIV4Vqn5CpqJCgoM7NMXWzigmKOagmvtOVMgiKqoeCKRORK0/efj7m+UQxdkPpxc8IWSruHuSD3dsNIk41AolSPXXxmwC0O/HUTb/ol3218Y/2G359hTV1+LhLHnLpWCJQS5XLFRtYvDNyMV83qvKWh8JR0n4NVqudUaR+FW1mUmLGiBsnR5A2u8Su0so4vmNEMh2xb1oX7Jo63NF7kMfG1EjdXGxF17/7SwxuAt2z3tLtK4yVXWGHDrtZOL6ktR8rpQc5BfUg/JklWH7M+//fmgzD8cylCWwe58m7/SAh44Uo1THgr3hL32AP8QQPLGU/YC4hTVRRfvlzJwLnWrSarY2dcTw1UXG6tqE1qlKK1XognwfeXMlOkT/G6q6jUxuw==',
    );
  });

  it('should get r value 2020_2', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_2'), 'utf8');
    const result = getRValue(html);
    expect(result).toHaveProperty(
      'r',
      '150ca90f645616f0d9a1ad83b07f9d1d1f0ea6f8-1588287295-0-AQxaDGslm9eECyxG66Vd3c5SrIV6ucqNfAoANEdqNCYp7Gn8gXVcy+l+BwMqaOdPmgQ2cxks5HlBstq33aUMnPWTv2zxbFOXslIzvRfh6zsVUxQpihEXCVy7THQTk80gH8obhbigntqPw60xJ3167xHlVqYbRcLlTDmngigd6sqdEb964e8ppvwdcLMUTPPIr9ERjc3je/JoKduwJ59dDjT4Lqwqtyy+XQfBqlF3+Bc5UFY7iM5l404oBprPp6hH7s20KUGgIPS4iaYtOuvz/GGlzMy2NhiwjzgtxkcRwHhNdnhldhSNr9kj4uqQPwpEMivRALS/M8yBKbpeozeUOJAIUC6vC3Z4Fy8jQJ4XH4DHe6i5qjZO4uSHWQ/NVQB6iM3fXNnIR8Jp+otMGupgfCUzPUsWpj3Rhaz+ZLZj+tXs0YbT7WZUHusr4sVsQNIyCF9CDlXUtcrMdZHR5lhFeyw2yuvYsYDzjBZQ4vUgyrF/if5Q2fpgMVdFWy9WzybZ2UWrqAdF2TUvgTS8Wpe+pGITY7U0OpscEgHZ1iFXcxYBVPln7RGXPG1LLBT/6ulK8P/xk/rAKsi28OLRBxTafeG0uM8iRbLmPYnN1ddlbNxsonUM3zDXlJi15UIioQ1dr3VUEpMHgWzXgbPHEUPtDXndPDeN2fFCiC+GTbK6rVvz5jH8NDmLFct7CcTsdFHqzileMZG1813HGO/tJZM0WtuMHiLC4atDCjWniE83wIUgDym6F7HV5oDwczQcGnz0qf4GEY+jWgFZay+r0BheymZJeuaiXAFbJ6QEs6dyes47jyXmeq3gduwKOPC09y1rsZ9dWu2Vd4P246SJmFwFHq6Pp8GqqJU+vrlzZCuP7QGPiPvao/gn2HyUqzILFQ1AzjQDhzd3fmeQ+rhJchUdVNPAW2bnZcMspIdzBSlNeJ6lZKR8Bh9fSdpCZJ4GsJcsKpQIqQMxQf20x+SJjvbdAtyEwGWPyPTm7BYpu1LuparhL2dK2gRtMxIod7okBiVNV68ry7cTLn/1W8MM3TbHbCqxCEHuam8MmW6wNkWLrBZXOOQkx8ju3xNv5miplmBENa7KphlD6CgvvJP5eh1n0yi1ow7lGHnbYtE4hgNEayDvundyrStEwCzcYnKDn95xOuPo02FCPi698OB6/XAEveECllUjnZ5H8qvxUiPOiHg3JMn/Lim8bRLgaa5BZmGuGJxzshYKLM0gTwqPQ45yWIqBlpj+UFqBGu+NPAe7MGDqTYmgN4NfOFvXsvIztZILDlj/r++FiCM7Y9WUiMud5IQLm5awDk9jXhXmp0AvaMHCNr/fiiQ+O19FudwECBapKJc+qp+GHQxyvwdynElQIYBEoy/12WDdkL9QTe1S/riR/FlhBidycmMbdOGN4kyDrVD+rOAJHvEKedSWT0wOSl+W7X9Um7ZbOcLXghXKIWkjvRynV3Qx9V1ssoDd8oJUDt201qShY3GA0yTgQmiwWITD4Gj/7mo2afVopBDSR7d41eC2l2s3JPEk4ImdWnMqPBp+aVXlVwLo9My6ZToxUjPmKpbqrv0VbY90qWinii6NDlT3f4ioD6sTB31Cf6BRdwg8br0VnoEqAQRzDuyo2QWOzJrcV5DEKDq3Fv60YqZn62vnLNxFR+HJMDOpK917hhVsn3cDIHLyw22JsX4G288=',
    );
  });

  it('should get getJschlTk 2020_1', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_1'), 'utf8');
    const result = getJschlTk(html);
    expect(result).toBe('9cc09a917dd0f41ea2a901ef6ab602f8765dd3ac-1588275803-0-AS7PbgWPNuZrOoQC8TEc6gLGft4j8xF7WwcbbT2FdzWfDtLjzeaBRGzA0GQpiz79TYlpGQYDQwdWAgVQWvtZwO7PF8yWgiPfjqIbRuFTpjfRb1bhpyYPYxc1N8aPIVp0BlsOHU_boML59i95ieENt_exwe9xNCrH3jQg6LVaaAWbxoTWWuQ3z8aPNn1PoRBAotDUDoUj2cQckdcBRbe71S0i-WTeQMWjLPEyMrGXO9o-bhJ4DBDCh2Vji-4h5sQXnFbkTDNa7uXCQvymhFT7reoysmeamj2Sfk5sdTn59Dya');
  });

  it('should get getJschlTk 2020_2', () => {
    const html = fs.readFileSync(path.join(__dirname, './html/2020_2'), 'utf8');
    const result = getJschlTk(html);
    expect(result).toBe('fea604705773e1d4d87454dc26bcc28047d37fb3-1588287295-0-ARliq5DOggxHcf1IvYY8OLDygqlO0qRnDUP2376L2aubAa8RJeTVwDHlsBZm7rxB7U4xRJCTn_ijPDy93CLI8SV6q9j1Z4yPEZ3Hc0KXDa6h-fMx_Hie13fbWURZ2hNfqv8ri991PT5ScHwpF0mbjskoOPPkLKh_0Yf_35yzwlw5znV21jAKdF4rZN8pER3lelvUDuDM4vHQm5XpMRdbumUBiQC22jxSjg-gp7fMUtt-EnlUdVyP1Abudkg1bYi3W_Qk8aTzSMIVLQCYndmwUfg');
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
    const f = nock('http://example.com').get('/search').reply(503, html, {
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
    const f = nock('http://example.com').get('/search').reply(503, html, {
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

  it('should catch cloudflare page and solve challenge 2019 3', async () => {
    // failed request blocked by cloudflare
    const html = fs.readFileSync(path.join(__dirname, './html/2019_3'), 'utf8');
    const f = nock('http://example.com').get('/search').reply(503, html, {
      server: 'cloudflare',
    });

    const success = '<h1>Hello</h1>';
    const n = nock('http://example.com', {
      reqheaders: {
        referer: 'http://example.com/search',
      },
    })
      .post('/search', {
        r:
          '6f1075a4b86ca26cfe982f36050e92bdfb709f75-1575008528-0-ATm//i2nsd2Iv5QIdr90QBJ07vIYc7kvjbdrqrCAPF2wjQ6WenG6ZErJOFqWISFxtz03BZY5YeNKnbv8jS6II7ZjnyPzbFRQNjNyf/oAbncGR3ZeWa2RKfEjG5SzrhUjNLwH+KucK29s3kz2UoSCNN9jOLirh0kCkQIR5B0NjOI8YuK5RE9US9UTAgEvEQmo7lgSDmmLY/LgHC3HyNuDUg/DRAuU+r/n9zlk4pfL8RpV80mxrG7Z8sRJ+skTuvxHeN7zr7K4IIsjnpz5ccy/nI8IxiNuQQ5+JR/8ENXCVY1S1UHMPlxIYPldJwpYTVTHMoQXs2ZDKRMsBECy+j/YJllGLtbH/IfdTbor1qih9BYpaQF9dyrp+Usqg5w5o4SgAcon+LhJlADUfxhVy5CagpPXIlcDBJnSi31RRUMFl6aLI4BN7KzWz/6yx709MjezOEz1KndXO+N5WRpDWGp9oasXiDQcRtjRYpjlgBUpzhrb/MYlQ9C2Z773Ti70zM50Y1x3JDFUnjh4SCqsR6Hcu69KcP4FhCH/oFjrTRkrfcWUHcA1VGqMLIdhpMzJRGkkpps6qMFAEcdsILAh5Q9PSdYkGAYGaxNdnOgyXVPloY/dS2bLXP9QOLs+Twqpi4eSve73rSq0+ypnrnA0pmgwc/BIcA3PsSoGSmVz+AOoudAOWQyBsIPbT0Vp0x55ABPMeuYefvGI6RvQ5yEIKBRA8VFkIn/vBjD/b/dasSskb6UduiGrJ8f+OZYRnrRvXF/RQBNobs2c4UZLasbKYf8TZ0nY5P9KNgTilOeMHXtJaPJ6nfWJE7dZea1MHFm2uvO9Dl8ItsF71AcreEOcuPCf9Yf/Kj3SY84WZYAwiYxHKgIAtbLCNpGjeTWgTm5n5fCXRTehhjMZcQihvBOE4OHdrZlEtTcFZme9ELVCoBwV6FV+I+cHr7nlzYpHya6oqacfKu0jE4u9fSEoJVzPLb2oWoMevkoyoreYmvRgFPDvlISuwM5PBpOLB1PgwXY8LumHeV7cQQePlyl9pyGsevTRMgTyJeKkwECyAZjbreSeDV1BdeFd+YZzls55aQmosqJBkCGtDSVvjB7gf+hiS9tSxUAse4yOm7ayYv/dyVBvMY6R8Sjmd0nPYyHzrEhFDFgbeadYnQyt0LDIaxT8RUphIZ/PQl5BndMWVX9zlgLAlNrawnldPkOtL+WD6yuvlbytis1OT5XfhozJTYyPKrg7sen2U8g9Mdsss9Yhj3X9FW6qBrx9s1eN5qrOx97Cf56tqS3OQg1q3jG5Ki7wtfnsdyZAEvzm/gREW69nP2O03EbLkeoRhBPghOZa/dR0n2nKTXo5dhpaGdVstQjToWR50+wFflcMdW7mYg/kwcLeJGP/MYo/u8WyRwRWnP+Al4/ONEOSCvP8dTS7S6PjWWfMl4HMJuOW5GyN7ndhzxzSmreutOig27Fz0KCJprHqgKhXKfuji1ZLYDeWtVHuWKnBQSWgyBfMWpd/gR/bdeYdRzIO1Hjgl5SbMskfKkgJMSqfS1i3v+y/DvbAEqYSQ7aoYDGputMZkBiKeE6AAsBtsV41',
        jschl_vc: '37f5c67a82dd9cd6b9239bd185a21e8b',
        pass: '1575008532.865-SJzufpXp5T',
        // jschl_answer: 11.0424687495,
        jschl_answer: 14.0424687495,
      })
      .query({
        __cf_chl_jschl_tk__:
          'f539ef78a6f8f16e2bbd6f5ac58521fac384f768-1575008528-0-AWIaFifdVJx1IsVKH1F3nFTl3hj41-_-hUwBdgc71_bOu_193CjxrjpPl-UnZnGjYe2OU_7y64hQ_cptYoZ-oA2BnXQL_J9QlV_Cm-BXF4J16nH-OVR7TVRI4Z1ZqAkRKcmUBuaZxms22Eb6dRzqukKDOMkrer9RVjPv0T1uE_8TZ4zm0ln3Bg8kY9jf9NEHfa5zLtlC5UuA_k89Kfl76dOSVPipJoZgc1UG_1-jdL_GfSbVYicODVgOVUaJb211nAcmK0lFZO3Gretccn_SkeE',
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
