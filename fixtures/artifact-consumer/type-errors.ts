// Negative type fixtures. Each `@ts-expect-error` must actually error, or the
// declaration surface has silently widened.
import { greet, version } from 'slowmcp'

// @ts-expect-error greet requires a string argument
greet(42)

// @ts-expect-error greet requires an argument
greet()

// @ts-expect-error greet returns string, not number
const wrong: number = greet('Detroit')

// @ts-expect-error version is a string, not a number
const alsoWrong: number = version

// @ts-expect-error the package exports no `createServer` yet
export { createServer } from 'slowmcp'

void wrong
void alsoWrong
