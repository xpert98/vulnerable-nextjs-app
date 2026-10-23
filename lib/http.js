/**
 * Read JSON, urlencoded, or multipart request bodies.
 *
 * Accepting more than JSON is intentional: it keeps the forms/lab easy to
 * drive with curl and gives CSRF-style requests a way to reach handlers.
 */
export async function readBody(request) {
  const contentType = request.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await request.json();
    }

    if (
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      const form = await request.formData();
      return Object.fromEntries(form.entries());
    }
  } catch {
    // Fall through to an empty object below.
  }

  return {};
}
