import got, { Response, RetryOptions } from 'got';
import delay from 'delay';
import uaString from 'ua-string';

const BUG_REPORT = `\
Cloudflare may have changed their technique, or there may be a bug in the script.
Please read https://github.com/typectrl/cloudflare#updates, then file a \
bug report at https://github.com/typectrl/cloudflare/issues"\
`;

export function isCloudflareChallenge(statusCode: number, headers: any, body: string) {
  const server: string = headers.server;
  return (
    statusCode === 503 &&
    server.startsWith('cloudflare') &&
    body.includes('jschl_vc') &&
    body.includes('jschl_answer')
  );
}

export function isCloudflareCaptcha(body: string) {
  if (body.indexOf('why_captcha') !== -1 || /cdn-cgi\/l\/chk_captcha/i.test(body)) {
    return true;
  }
  return false;
}

export function solveChallenge(body: string, domain: string): number {
  const timeoutReg = /setTimeout\(function\(\){\s+(var s,t,o,p,b,r,e,a,k,i,n,g,f.+?\r?\n[\s\S]+?a\.value =.+?)\r?\n/;
  const timeout = timeoutReg.exec(body);
  let js = timeout && timeout.length ? timeout[1] : '';
  js = js.replace(/a\.value =(.+?) \+ .+?;/i, '$1');
  js = js.replace(/\s{3,}[a-z](?: = |\.).+/g, '');
  js = js.replace(/'; \d+'/g, '');

  // Strip characters that could be used to exit the string context
  // These characters are not currently used in Cloudflare's arithmetic snippet
  js = js.replace(/[\n\\']/, '');

  if (!js.includes('toFixed')) {
    throw new Error(`Error parsing Cloudflare IUAM Javascript challenge. ${BUG_REPORT}`);
  }

  // must eval javascript - potentially unsafe
  try {
    // tslint:disable-next-line:no-eval
    return Number(eval(js).toFixed(10)) + domain.length;
  } catch (err) {
    throw new Error(`Error occurred during evaluation: ${err.message}`);
  }
}

export function jschlValue(body: string) {
  const vcReg = /name="jschl_vc" value="(\w+)"/g;
  const vc = vcReg.exec(body);
  return vc && vc.length ? vc[1] : '';
}

export function passValue(body: string) {
  const passReg = /name="pass" value="(.+?)"/g;
  const p = passReg.exec(body);
  return p && p.length ? p[1] : '';
}

/**
 * sets headers.accept and headers.user-agent if not exist
 * @param headers existing headers
 */
export function setupHeaders(headers: any = {}) {
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
  // must have body present
  if (!error.response || !error.response.body) {
    throw error;
  }
  // must have cookiejar
  if (!options.cookieJar) {
    throw new Error('options.cookieJar required');
  }
  const body: string = error.response.body;
  // error is not cloudflare related - rethrow
  if (!isCloudflareChallenge(error.response.statusCode, error.response.headers, body)) {
    throw error;
  }
  // recaptcha captcha encountered
  if (isCloudflareCaptcha(body)) {
    throw new CaptchaError('Cloudflare captcha encountered');
  }
  // max attempt error
  if (attempts === 4) {
    throw new CloudflareMaxAttemptsError(`Unable to bypass cloudflare attempts: ${attempts}`);
  }
  options.headers = options.headers || {};
  options.headers = setupHeaders(options.headers);
  options.headers.referer = error.url.substring(0, error.url.length - 1) as string + (error.path || '');
  options.headers['cache-control'] = options.headers['cache-control'] || 'private';
  const retry: RetryOptions = options.retry || {};
  options.retry.statusCodes = [408, 413, 429, 500, 502, 504];
  options.retry = retry;

  // get form field values
  const jschlVc = jschlValue(body);
  const pass = passValue(body);
  // solve js challenge
  const jschlAnswer = solveChallenge(body, error.hostname);

  // wait 6 seconds
  await delay(5000);

  // make request with answer
  const submitUrl = `${error.protocol}//${error.hostname}`;
  options.path = '/cdn-cgi/l/chk_jschl';
  options.query = {
    jschl_vc: jschlVc,
    pass,
    jschl_answer: jschlAnswer,
  };
  try {
    return await got(submitUrl, options);
  } catch (err) {
    return catchCloudflare(err, options, attempts + 1);
  }
}
