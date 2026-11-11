import { Express, RequestHandler, Router } from 'express';

const mountPrefixes = new WeakMap<Router, string>();

type UseTarget = Pick<Express, 'use'> | Pick<Router, 'use'>;

const joinPath = (a: string, b: string): string => {
  const joined = `${a}/${b}`.replace(/\/+/g, '/');
  return joined.length > 1 ? joined.replace(/\/$/, '') : joined;
};

export const mountRouter = (parent: UseTarget, prefix: string, ...handlers: [...RequestHandler[], Router]): void => {
  mountPrefixes.set(handlers[handlers.length - 1] as Router, prefix);
  (parent.use as (...args: unknown[]) => unknown)(prefix, ...handlers);
};

type RouteLayer = {
  route?: { path: string | string[]; methods: Record<string, boolean>; };
  handle?: { stack?: RouteLayer[]; };
};

export const listRoutes = (app: Express): string[] => {
  const lines: string[] = [];

  const walk = (stack: RouteLayer[], prefix: string): void => {
    for (const layer of stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods)
          .map((method) => (method === '_all' ? 'ALL' : method.toUpperCase()))
          .join('|');
        const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
        for (const path of paths) lines.push(`[${methods}] ${joinPath(prefix, path)}`);
      } else if (layer.handle?.stack) {
        const mountPrefix = mountPrefixes.get(layer.handle as unknown as Router);
        if (mountPrefix === undefined) {
          const firstPath = layer.handle.stack.find((child) => child.route)?.route?.path;
          throw new Error(
            `Router under "${prefix || '/'}" (first route: ${String(firstPath ?? 'none')}) ` +
            'was mounted without mountRouter, so its prefix is unknown',
          );
        }
        walk(layer.handle.stack, joinPath(prefix, mountPrefix));
      }
    }
  };

  walk(app.router.stack as unknown as RouteLayer[], '');
  return lines;
};
