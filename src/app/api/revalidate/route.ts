import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.REVALIDATION_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paths } = await request.json();

    if (!paths || !Array.isArray(paths)) {
      return Response.json(
        { error: "Invalid request body, expected { paths: string[] }" },
        { status: 400 },
      );
    }

    for (const path of paths) {
      revalidatePath(path);
    }

    return Response.json({ revalidated: true, paths });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
