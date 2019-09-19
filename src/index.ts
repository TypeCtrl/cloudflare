import { Buffer } from 'buffer';
import crypto from 'crypto';
import delay from 'delay';
import got, { Response, RetryOptions } from 'got';
import https from 'https';
import uaString from 'ua-string';
import vm from 'vm';

const BUG_REPORT = `\
Cloudflare may have changed their technique, or there may be a bug in the script.
Please read https://github.com/typectrl/cloudflare#updates, then file a \
bug report at https://github.com/typectrl/cloudflare/issues"\
`;

export function isCloudflareChallenge(statusCode: number, headers: any, body: string) {
  const { server } = headers;
  return (
    statusCode === 503 &&
    server.startsWith('cloudflare') &&
    body.includes('jschl_vc') &&
    body.includes('jschl_answer')
  );
}

export function isCloudflareCaptcha(body: string) {
  if (body.includes('why_captcha') || /cdn-cgi\/l\/chk_captcha/i.test(body)) {
    return true;
  }

  return false;
}

export function solveChallenge(body: string, domain: string) {
  // regex without selecting setTimeout delay ms for reference
  // const timeoutReg = /setTimeout\(function\(\){\s+(var s,t,o,p,b,r,e,a,k,i,n,g,f.+?\r?\n[\s\S]+?a\.value =.+?)\r?\n/;
  const timeoutReg = /setTimeout\(function\(\){\s+(var s,t,o,p,b,r,e,a,k,i,n,g,f.+?\r?\n[\s\S]+?a\.value =.+?)\r?\n[\s\S]+(\d{4,5})\);/;
  const timeout = timeoutReg.exec(body);
  let js = timeout && timeout.length ? timeout[1] : '';
  js = js.replace(/a\.value = (.+\.toFixed\(10\);).+", r"\1/i, '$1');
  js = js.replace(/(e\s=\sfunction\(s\)\s{[\s\S]*};)/g, '');
  js = js.replace(/\s{3,}[a-z](?: = |\.).+/g, '');
  js = js.replace(/'; \d+'/g, '');
  // Strip characters that could be used to exit the string context
  // These characters are not currently used in Cloudflare's arithmetic snippet
  js = js.replace(/[\n\\']/, '');
  js = js.replace('; 121', '');

  if (!js.includes('toFixed')) {
    throw new Error(`Error parsing Cloudflare IUAM Javascript challenge. ${BUG_REPORT}`);
  }

  // get setTimeout length that cloudflare has mandated
  const ms = timeout && timeout.length > 1 ? Number(timeout[2]) : 6000;

  // 2019-03-20: Cloudflare sometimes stores part of the challenge in a div which is later
  // added using document.getElementById(x).innerHTML, so it is necessary to simulate that
  // method and value.
  let k = '';
  let val = '';
  const kReg = /k\s+=\s+'([^']+)';/g;
  try {
    // Find the id of the div in the javascript code.
    const kResult = kReg.exec(body);
    k = kResult && kResult.length ? kResult[1] : '';
    const valReg = new RegExp(`<div(.*)id="${k}"(.*)>(.*)</div>`, 'g');
    const valResult = valReg.exec(body);
    val = valResult && valResult.length ? valResult[3] : '';
  } catch {
    // If not available, either the code has been modified again, or the old style challenge is used.
    // ignore errors
  }

  const dom = `var t = "${domain}";`;
  const a = 'var a = {};';
  const o = 'var o = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";';
  const e = `var e = function(s) {{
      s += "==".slice(2 - (s.length & 3));
      var bm, r = "", r1, r2, i = 0;
      for (; i < s.length;) {{
          bm = o.indexOf(s.charAt(i++)) << 18 | o.indexOf(s.charAt(i++)) << 12 | (r1 = o.indexOf(s.charAt(i++))) << 6 | (r2 = o.indexOf(s.charAt(i++)));
          r += r1 === 64 ? g(bm >> 16 & 255) : r2 === 64 ? g(bm >> 16 & 255, bm >> 8 & 255) : g(bm >> 16 & 255, bm >> 8 & 255, bm & 255);
      }}
      return r;
  }};`;
  const g = 'var g = String.fromCharCode;';
  const document = `var document= {getElementById: function(x) { return {innerHTML:"${val}"};}};`;
  const atob = 'var atob = function(str) {return Buffer.from(str, "base64").toString("binary");};';
  const jsx = a + o + e + dom + atob + g + document + js;
  const str = vm.runInNewContext(jsx, { Buffer, g: String.fromCharCode }, { timeout: 5000 });
  // must eval javascript - potentially very unsafe
  // eslint-disable-next-line no-eval
  const answer = Number(str);

  try {
    return { ms, answer };
  } catch (err) {
    throw new Error(`Error occurred during evaluation: ${err.message}`);
  }
}

export function jschlValue(body: string) {
  const vcReg = /name="jschl_vc"\svalue="(\w+)"/g;
  const vc = vcReg.exec(body);
  return vc && vc.length ? vc[1] : '';
}

export function passValue(body: string) {
  const passReg = /name="pass"\svalue="(.+?)"/g;
  const p = passReg.exec(body);
  return p && p.length ? p[1] : '';
}

export function sValue(body: string) {
  const sReg = /name="s"\svalue="([^"]+)/g;
  const s = sReg.exec(body);
  return s && s.length ? s[1] : '';
}

/**
 * sets headers.accept and headers.user-agent if not exist
 * @param headers existing headers
 */
export function setupHeaders(headers: any = {}): any {
  headers.accept =
    headers.accept ||
    'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5';
  headers['user-agent'] = headers['user-agent'] || uaString;
  return headers;
}

class CaptchaError extends Error {
  constructor(message?: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

class CloudflareMaxAttemptsError extends Error {
  constructor(message?: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

export async function catchCloudflare<T extends Buffer | string | object>(
  error: any,
  options: any,
  attempts = 1,
): Promise<Response<T>> {
  const config: any = { ...options };
  // must have body present
  if (!error.response || !error.response.body) {
    throw error;
  }

  // must have cookiejar
  if (!config.cookieJar) {
    throw new Error('options.cookieJar required');
  }

  const { body } = error.response;

  // recaptcha captcha encountered
  if (isCloudflareCaptcha(body)) {
    throw new CaptchaError('Cloudflare captcha encountered');
  }

  // error is not cloudflare related - rethrow
  if (!isCloudflareChallenge(error.response.statusCode, error.response.headers, body)) {
    throw error;
  }

  // max attempt error
  if (attempts === 4) {
    throw new CloudflareMaxAttemptsError(`Unable to bypass cloudflare attempts: ${attempts}`);
  }

  config.headers = config.headers || {};
  config.headers = setupHeaders(config.headers);
  config.headers.referer = `${error.url.substring(0, error.url.length - 1)}${error.path || ''}`;
  config.headers['cache-control'] = config.headers['cache-control'] || 'private';
  const retry: RetryOptions = config.retry || {};
  config.retry.statusCodes = [408, 413, 429, 500, 502, 504];
  config.retry = retry;

  // get form field values
  const jschlVc = jschlValue(body);
  const pass = passValue(body);
  const s = sValue(body);
  // solve js challenge
  const challenge = solveChallenge(body, error.hostname);

  // defaults to 6 seconds or ms found in html
  await delay(challenge.ms);

  // make request with answer
  const submitUrl = `${error.protocol}//${error.hostname}`;
  config.path = '/cdn-cgi/l/chk_jschl';
  config.query = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    jschl_vc: jschlVc,
    pass,
    // eslint-disable-next-line @typescript-eslint/camelcase
    jschl_answer: challenge.answer,
    s,
  };

  if (!config.agent) {
    config.agent = {
      https: new https.Agent({
        ciphers: crypto.constants.defaultCipherList + ':!ECDHE+SHA:!AES128-SHA',
      }),
    };
  }

  try {
    return await got(submitUrl, config);
  } catch (err) {
    return catchCloudflare(err, config, attempts + 1);
  }
}
