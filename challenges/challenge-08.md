<!-- FUNCTION_SIGNATURE
/**
 * @param {string} toy - The toy to find the first unique one letter
 * @returns {string} The first unique letter in the toy
 */
function findUniqueToy(toy) {
  // Code here
  return ''
}
-->

[<](https://adventjs.dev/challenges/2025/7)

# Challenge \#8: 🎁 Find the unique toy chevron-down

[>](https://adventjs.dev/challenges/2025/9)

InstructionsResults

EASY

Santa 🎅 wants to know what the first non-repeated letter is in a toy's name 🎁.

Write a function that takes a `string` and returns the first letter that is not repeated, ignoring uppercase and lowercase when counting, but returning the letter as it appears in the string.

If there is none, return an empty string ("").

Examples:

```js
findUniqueToy('Gift') // 'G'
// ℹ️ The G is the first letter that is not repeated
// and we return it exactly as it appears

findUniqueToy('sS') // ''
// ℹ️ The letters are repeated, since it doesn't distinguish uppercase

findUniqueToy('reindeeR') // 'i'
// ℹ️ The r is repeated (even if it's uppercase)
// and the e as well, so the first one is 'i'

// More cases:
findUniqueToy('AaBbCc') // ''
findUniqueToy('abcDEF') // 'a'
findUniqueToy('aAaAaAF') // 'F'
findUniqueToy('sTreSS') // 'T'
findUniqueToy('z') // 'z'
```