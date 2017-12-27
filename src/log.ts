import * as debug from 'debug'

const name = 'binance.js'
const log = debug(`${name}:default`)

export default log

export function getLogger (subname: string) {
  return debug(`${name}:${subname}`)
}
