export function isSupabaseSignedAssetUrl(src: string | null | undefined): boolean {
  if (!src || src.startsWith('/')) {
    return false;
  }

  try {
    const url = new URL(src);
    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith('.supabase.co') &&
      url.pathname.includes('/storage/v1/object/sign/')
    );
  } catch {
    return false;
  }
}

export function shouldBypassImageOptimization(src: string | null | undefined): boolean {
  return isSupabaseSignedAssetUrl(src);
}
