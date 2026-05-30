import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

assert(
  !/catch\s*\{[\s\S]*state\.customers\s*=\s*demoCustomers/.test(source),
  'loadCustomers must not replace failed API responses with demoCustomers'
)

assert(
  /function changeCustomerPageSize\(size\) \{[\s\S]*loadCustomers\(0\)/.test(source) &&
    !/function changeCustomerPageSize\(size\) \{[\s\S]*nextSize === state\.customerPage\.size[\s\S]*loadCustomers\(0\)/.test(source),
  'customer page-size changes must immediately reload the first page'
)

assert(
  /function changeChannelPageSize\(size\) \{[\s\S]*loadChannels\(0\)/.test(source) &&
    !/function changeChannelPageSize\(size\) \{[\s\S]*nextSize === state\.channelPage\.size[\s\S]*loadChannels\(0\)/.test(source),
  'channel page-size changes must immediately reload the first page'
)

assert(
  /request\('\/api\/customers\/summary'\)/.test(source),
  'dashboard customer totals must be loaded from /api/customers/summary'
)

assert(
  !/const withEmail = state\.customers\.filter/.test(source) &&
    !/const pending = state\.customers\.filter/.test(source),
  'dashboard customer totals must not be calculated from the current customer page'
)

assert(
  /\/api\/customers\/\$\{customer\.id\}\/email\/verify/.test(source),
  'customer asset page must call the manual email verification endpoint'
)

assert(
  /verifyCustomerEmail/.test(source) && /验证邮箱|标记已验证/.test(source),
  'customer asset page must expose a manual email verification action'
)
