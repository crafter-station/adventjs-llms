import { gateway, generateText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { challenges } from "../src/db/schema";

const model = gateway("anthropic/claude-opus-4.5");

const TEST_GENERATION_PROMPT = `You are a test case generator. Given a coding challenge, generate JavaScript test code with assertions.

RULES:
1. Extract ALL test cases from the examples in the challenge description
2. Use assertions that throw Error on failure (do NOT use console.assert)
3. Compare using appropriate method:
   - Arrays/Objects: JSON.stringify comparison
   - Strings: direct === (for multiline, compare trimmed or normalize)
   - Numbers/Booleans: direct ===
4. Include descriptive error messages showing expected vs actual
5. End with console.log('All tests passed!')
6. Do NOT define the function - it will be prepended by the system
7. Wrap each test in an IIFE to isolate variable scope
8. For multiline string outputs (like ASCII art), parse the expected output from the comments carefully

EXAMPLE OUTPUT FORMAT:
\`\`\`javascript
// Test 1
(() => {
  const input = ['car', 'doll#arm', 'ball', '#train'];
  const result = filterGifts(input);
  const expected = ['car', 'ball'];
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(\`Test 1 failed: expected \${JSON.stringify(expected)}, got \${JSON.stringify(result)}\`);
  }
})();

// Test 2
(() => {
  const result = filterGifts([]);
  const expected = [];
  if (JSON.stringify(result) !== JSON.stringify(expected)) {
    throw new Error(\`Test 2 failed: expected \${JSON.stringify(expected)}, got \${JSON.stringify(result)}\`);
  }
})();

console.log('All tests passed!');
\`\`\`

Generate ONLY the test code inside a single code block, no explanation.`;

function extractCodeFromResponse(response: string): string {
  const codeBlockMatch = response.match(/```(?:javascript|js)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  return response.trim();
}

async function generateTestCases() {
  const allChallenges = await db
    .select()
    .from(challenges)
    .orderBy(challenges.id);

  console.log(`Found ${allChallenges.length} challenges`);

  for (const challenge of allChallenges) {
    console.log(
      `\n--- Generating tests for Challenge ${challenge.id}: ${challenge.title} ---`,
    );

    const prompt = `FUNCTION SIGNATURE:
\`\`\`javascript
${challenge.functionSignature}
\`\`\`

CHALLENGE DESCRIPTION:
${challenge.description}

Generate the test code now:`;

    try {
      const result = await generateText({
        model,
        system: TEST_GENERATION_PROMPT,
        prompt,
        maxOutputTokens: 4096,
      });

      const testCode = extractCodeFromResponse(result.text);

      console.log(`Generated test code (${testCode.length} chars):`);
      console.log(
        testCode.slice(0, 500) + (testCode.length > 500 ? "..." : ""),
      );

      await db
        .update(challenges)
        .set({ testCases: testCode })
        .where(eq(challenges.id, challenge.id));

      console.log(`✓ Saved test cases for challenge ${challenge.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `✗ Failed to generate tests for challenge ${challenge.id}: ${errorMessage}`,
      );
    }
  }

  console.log("\n--- Done generating test cases! ---");
  process.exit(0);
}

generateTestCases().catch((err) => {
  console.error("Failed to generate test cases:", err);
  process.exit(1);
});
