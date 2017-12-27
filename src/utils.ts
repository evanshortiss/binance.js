import { randomBytes, createHmac } from 'crypto'
import log from './log'

/**
 * Returns a SHA256 based HMAC signature to include with REST API requests.
 * The input should be the output of querystring.stringify.
 * @param inputs
 * @param apisecret
 */
export function getHmac (input: string, apisecret: string) {
  log(`generate hmac for request`)

  const hmac = createHmac(
    'sha256',
    new Buffer(apisecret)
  ).update(input).digest('hex')

  log(`generated hmac of "${hmac}" for request"`)

  return hmac
}
