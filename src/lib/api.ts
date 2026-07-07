export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function withAuth<T>(handler: () => Promise<T>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
    console.error(error);
    return jsonError("Unexpected server error", 500);
  }
}
