import crypto from 'crypto';
import delay from 'delay';
import got, { Response, RequiredRetryOptions } from 'got';
import https from 'https';
import vm from 'vm';
import { URLSearchParams } from 'url';

const BUG_REPORT = `
Cloudflare may have changed their technique, or there may be a bug in the script.
Check for recent updates then file a bug report at https://github.com/typectrl/cloudflare/issues
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
  const timeoutReg = /setTimeout\(\s*function\s*\(\){\s*(var\s+(?:[a-z]\s*,\s*)(?:[a-z]\s*,\s*)+(?:[a-z]\s*,\s*).+?\r?\n[\s\S]+?a\.value\s*=.+?)\r?\n[\s\S]+?,\s*(\d{4,5})\);\s*(?:\/\*eoc\*\/)?/;
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
  const val = kValue(body);

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
  const answer = Number(str);

  try {
    return { ms, answer };
  } catch (err) {
    throw new Error(`Error occurred during evaluation: ${err.message}`);
  }
}

export function jschlValue(body: string) {
  const lineReg = /^.*name="jschl_vc".*$/gm;
  const line = lineReg.exec(body);
  if (!line) {
    throw new Error('Failed to find jschl_vc');
  }

  const valueReg = /\svalue="(\w+)"/g;
  const result = valueReg.exec(line[0]);
  if (!result || result.length === 0) {
    throw new Error('Failed to parse value from jschl');
  }

  return result[1];
}

export function kValue(body: string) {
  const kReg = /k\s+=\s+'([^']+)';/g;
  try {
    // Find the id of the div in the javascript code.
    const kResult = kReg.exec(body);
    const k = kResult && kResult.length ? kResult[1] : '';
    const valReg = new RegExp(`<div(.*)id="${k}"(.*)>(.*)</div>`, 'g');
    const valResult = valReg.exec(body);
    return valResult && valResult.length ? valResult[3] : '';
  } catch {
    // If not available, either the code has been modified again, or the old style challenge is used.
    // ignore errors
  }
}

export function passValue(body: string) {
  const lineReg = /^.*name="pass".*$/gm;
  const line = lineReg.exec(body);
  if (!line) {
    throw new Error('Failed to find pass field');
  }

  const valueReg = /\svalue="(.+?)"/g;
  const result = valueReg.exec(line[0]);
  if (!result || result.length === 0) {
    throw new Error('Failed to parse value from pass field');
  }

  return result[1];
}

export function sValue(body: string) {
  const sReg = /name="s"\svalue="([^"]+)/g;
  const s = sReg.exec(body);
  return s && s.length ? s[1] : '';
}

export function getRValue(body: string): object {
  // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
  const match = body.match(/name="(.+?)" value="(.+?)"/);
  if (match) {
    const hiddenInputName = match[1];
    return { [hiddenInputName]: match[2] };
  }

  return {};
}

export function getJschlTk(body: string): string {
  const exp = /\?__cf_chl_jschl_tk__=(\S+)"/gm;
  const result = exp.exec(body);
  if (result && result.length) {
    return result[1];
  }

  return '';
}

export function getMethod(body: string) {
  const methodReg = /method="(.+?)"/g;
  const s = methodReg.exec(body);
  return s && s.length ? s[1] : 'GET';
}

/**
 * sets headers.accept and headers.user-agent if not exist
 * @param headers existing headers
 */
export function setupHeaders(headers: any = {}): any {
  return {
    accept:
      headers.accept ||
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.62 Safari/537.36',
    'upgrade-insecure-requests': '1',
    'accept-language': 'en-US,en;q=0.9',
    connection: 'keep-alive',
    'Cache-Control': 'max-age=0',
  };
}

export class CaptchaError extends Error {
  constructor(message?: string) {
    super(message); // 'Error' breaks prototype chain here
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}

export class CloudflareMaxAttemptsError extends Error {
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

  const newHeaders = setupHeaders(config.headers);
  config.headers = { ...config.headers, ...newHeaders } || newHeaders;
  config.headers.referer = `${error.options.url.href}${error.options.pathname || ''}`;
  config.headers['cache-control'] = config.headers['cache-control'] || 'private';

  const retry: Partial<RequiredRetryOptions> = {
    statusCodes: [408, 413, 429, 500, 502, 504],
    limit: 0,
  };
  config.retry = retry;

  // get form field values
  const jschlVc = jschlValue(body);
  const pass = passValue(body);
  const s = sValue(body);
  const rValue = getRValue(body);
  const method = getMethod(body);
  // solve js challenge
  const challenge = solveChallenge(body, error.options.url.hostname);
  const jschlTk = getJschlTk(body);
  // console.log({ challenge, method, rValue, s, pass, jschlVc, jschlTk });

  // defaults to 6 seconds or ms found in html
  await delay(challenge.ms);

  // make request with answer
  config.prefixUrl = `${error.options.url.protocol}//${error.options.url.hostname}/`;
  if (config.url.startsWith(config.prefixUrl)) {
    config.url = config.url.replace(config.prefixUrl, '');
  }

  const payload: any = {
    ...rValue,
    jschl_vc: jschlVc,
    pass,
    jschl_answer: challenge.answer,
  };

  if (method.toUpperCase() === 'GET') {
    config.method = 'GET';
    config.url = 'cdn-cgi/l/chk_jschl';
    payload.s = s;
    config.searchParams = new URLSearchParams(payload).toString().replace(/&amp;/g, '&');
  } else {
    config.method = 'POST';
    config.searchParams = new URLSearchParams({ __cf_chl_jschl_tk__: jschlTk }).toString();
    const params = new URLSearchParams();
    for (const entry of Object.entries(payload)) {
      params.append(entry[0], entry[1] as string);
    }

    config.body = params.toString();
    config.headers = {
      ...config.headers,
      'content-type': 'application/x-www-form-urlencoded',
    };
    config.followRedirect = true;
  }

  if (!config.agent) {
    config.agent = {
      https: new https.Agent({
        ciphers: crypto.constants.defaultCipherList + ':!ECDHE+SHA:!AES128-SHA',
      }),
    };
  }

  try {
    return await got<T>(config);
  } catch (err) {
    // eslint-disable-next-line no-return-await
    return await catchCloudflare(err, config, attempts + 1);
  }
}
