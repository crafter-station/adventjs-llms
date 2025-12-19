const url = "https://api.firecrawl.dev/v2/scrape";

interface ChallengeData {
  markdown: string;
  defaultCode: string | null;
}

async function fetchChallenge(
  challengeNumber: number,
): Promise<ChallengeData | null> {
  const options = {
    method: "POST",
    headers: {
      Authorization: "Bearer fc-ce0a78118f6549e1a9294abccfc46864",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `https://adventjs.dev/challenges/2025/${challengeNumber}`,
      onlyMainContent: false,
      includeTags: ["#challenge"],
      excludeTags: [
        ".border-r.h-full.border-[#2b0e16].flex.items-center.justify-center.w-10.shrink-0.transition-colors.opacity-50.cursor-not-allowed.text-[#2b0e16]/50",
      ],
      maxAge: 172800000,
      formats: ["markdown", "rawHtml"],
    }),
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    const markdown = data.data?.markdown || null;
    const rawHtml = data.data?.rawHtml || "";

    let defaultCode: string | null = null;
    const nextDataMatch = rawHtml.match(
      /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1]);
        defaultCode =
          nextData.props?.pageProps?.defaultCode?.javascript || null;
      } catch {
        console.error(
          `Failed to parse __NEXT_DATA__ for challenge ${challengeNumber}`,
        );
      }
    }

    if (!markdown) return null;

    return { markdown, defaultCode };
  } catch (error) {
    console.error(`Error fetching challenge ${challengeNumber}:`, error);
    return null;
  }
}

async function main() {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  const challengesDir = path.join(import.meta.dirname, "../challenges");
  await fs.mkdir(challengesDir, { recursive: true });

  for (let i = 1; i <= 18; i++) {
    console.log(`Fetching challenge ${i}...`);
    const data = await fetchChallenge(i);

    if (data) {
      let content = "";

      if (data.defaultCode) {
        content += `<!-- FUNCTION_SIGNATURE\n${data.defaultCode}\n-->\n\n`;
      }

      content += data.markdown;

      const filePath = path.join(
        challengesDir,
        `challenge-${i.toString().padStart(2, "0")}.md`,
      );
      await fs.writeFile(filePath, content);
      console.log(
        `Saved challenge ${i}${data.defaultCode ? " (with signature)" : ""}`,
      );
    } else {
      console.log(`Failed to fetch challenge ${i}`);
    }
  }

  console.log("Done!");
}

main();
