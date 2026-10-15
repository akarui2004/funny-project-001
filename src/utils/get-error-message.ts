export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    if ('message' in error && typeof (error as Record<string, unknown>).message === 'string') {
      return (error as Record<string, unknown>).message as string;
    }

    try {
      return JSON.stringify(error);
    } catch (error) {
      return String(error);
    }
  }
  return String(error);
}