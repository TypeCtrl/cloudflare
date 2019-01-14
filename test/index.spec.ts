import fs from 'fs';
import path from 'path';
import { CookieJar } from 'tough-cookie';

import { solveChallenge, isCloudflareCaptcha } from '../src/index';

describe('Dummy test', () => {
  it('should solve 2018 1', () => {
    const html = fs.readFileSync(path.join(__dirname, `./2018_1.html`), 'utf8');
    expect(solveChallenge(html, 'example-site.dev')).toBe('example-site.dev'.length + -5.33265406);
  });

  it('should solve 2018 2', () => {
    const html = fs.readFileSync(path.join(__dirname, `./2018_2.html`), 'utf8');
    expect(solveChallenge(html, 'example-site.dev')).toBe('example-site.dev'.length + -1.9145049856);
  });

  it('should spot captcha', () => {
    const html = fs.readFileSync(path.join(__dirname, `./captcha.html`), 'utf8');
    expect(isCloudflareCaptcha(html)).toBe(true);
  });

  // it('should be instantiable', async () => {
  //   const scraper = create();
  //   const scraped = await scraper.get('', { cookieJar: new CookieJar() }).catch(e => console.log(e));
  //   console.log(scraped);
  // });
});
