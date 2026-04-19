import type { Dispatcher } from 'undici';

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const proxyUrl = process.env.GEMINI_HTTPS_PROXY?.trim();
  if (!proxyUrl) return;

  const undici = await import('undici');
  const direct = undici.getGlobalDispatcher();
  const proxy = new undici.ProxyAgent(proxyUrl);

  const PROXIED_HOSTS = new Set<string>([
    'generativelanguage.googleapis.com',
    'aiplatform.googleapis.com',
  ]);

  class HostRouteDispatcher extends undici.Dispatcher {
    dispatch(opts: Dispatcher.DispatchOptions, handler: Dispatcher.DispatchHandlers): boolean {
      const host = resolveHost(opts);
      const chosen = host && PROXIED_HOSTS.has(host) ? proxy : direct;
      return chosen.dispatch(opts, handler);
    }
  }

  undici.setGlobalDispatcher(new HostRouteDispatcher());

  console.log(
    `[instrumentation] routing ${[...PROXIED_HOSTS].join(', ')} via ${new URL(proxyUrl).host}`,
  );
}

function resolveHost(opts: Dispatcher.DispatchOptions): string | null {
  const origin = opts.origin;
  if (!origin) return null;
  try {
    return typeof origin === 'string' ? new URL(origin).hostname : origin.hostname;
  } catch {
    return null;
  }
}
