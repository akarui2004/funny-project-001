import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import { errorHandler, ipAllowlist, ipBlacklist } from 'src/http/middlewares';
import { logger } from 'src/utils/logger';
import { getClientIp, type ClientIpInfo } from 'src/utils/get-client-ip';

type TrustProxy = boolean | number | string | string[];

/** Real Express app + real socket; the test client always connects from 127.0.0.1. */
const withApp = async (
  trustProxy: TrustProxy,
  setup: (app: express.Express) => void,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> => {
  const app = express();
  app.set('trust proxy', trustProxy);
  setup(app);
  app.use(errorHandler); // the project's handler turns HttpError into 403 without printing stacks
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
};

/** Resolve what getClientIp reports for a request carrying the given X-Forwarded-For. */
const resolve = async (trustProxy: TrustProxy, xff?: string): Promise<ClientIpInfo> => {
  let info!: ClientIpInfo;
  await withApp(
    trustProxy,
    (app) => app.get('/', (req, res) => { res.json(getClientIp(req)); }),
    async (url) => {
      const res = await fetch(url, { headers: xff === undefined ? {} : { 'x-forwarded-for': xff } });
      info = (await res.json()) as ClientIpInfo;
    },
  );
  return info;
};

/** Status code of a request passing through the given middleware. */
const status = async (trustProxy: TrustProxy, mw: express.RequestHandler, xff?: string): Promise<number> => {
  let code = 0;
  await withApp(
    trustProxy,
    (app) => {
      app.get('/', mw, (_req, res) => { res.send('ok'); });
    },
    async (url) => {
      code = (await fetch(url, { headers: xff === undefined ? {} : { 'x-forwarded-for': xff } })).status;
    },
  );
  return code;
};

describe('getClientIp with Express trust proxy', () => {
  before(() => { logger.silent = true; });

  describe('given no trusted proxy (trust proxy = false)', () => {
    it('without forwarding headers, the client is the socket peer', async () => {
      const info = await resolve(false);
      assert.deepEqual(info, { ip: '127.0.0.1', socketIp: '127.0.0.1', forwardedChain: [] });
    });

    it('why a forged X-Forwarded-For is ignored: nothing vouches for it', async () => {
      const info = await resolve(false, '1.1.1.1');
      assert.equal(info.ip, '127.0.0.1');
      assert.deepEqual(info.forwardedChain, []);
    });
  });

  describe('given one trusted hop (trust proxy = 1)', () => {
    it('without X-Forwarded-For, falls back to the socket peer', async () => {
      assert.equal((await resolve(1)).ip, '127.0.0.1');
    });

    it('given one forwarded address, it is the client and the peer stays the proxy', async () => {
      const info = await resolve(1, '203.0.113.9');
      assert.deepEqual(info, { ip: '203.0.113.9', socketIp: '127.0.0.1', forwardedChain: ['203.0.113.9'] });
    });

    it('why a client-forged leftmost entry loses: only the hop the proxy appended counts', async () => {
      const info = await resolve(1, '9.9.9.9, 203.0.113.9');
      assert.equal(info.ip, '203.0.113.9');
      assert.deepEqual(info.forwardedChain, ['203.0.113.9']);
    });

    it('given an IPv6 client, keeps it', async () => {
      assert.equal((await resolve(1, '2001:db8::7')).ip, '2001:db8::7');
    });

    it('given an IPv4-mapped IPv6 client, reports plain IPv4', async () => {
      const info = await resolve(1, '::ffff:203.0.113.9');
      assert.equal(info.ip, '203.0.113.9');
      assert.deepEqual(info.forwardedChain, ['203.0.113.9']);
    });

    it('given a garbage address, the client is unknown (null) instead of a made-up value', async () => {
      const info = await resolve(1, 'not-an-ip');
      assert.equal(info.ip, null);
      assert.deepEqual(info.forwardedChain, []);
    });
  });

  describe('given two trusted hops (trust proxy = 2, e.g. CDN then load balancer)', () => {
    it('reads the client behind both proxies and lists the whole chain', async () => {
      const info = await resolve(2, '9.9.9.9, 203.0.113.9');
      assert.equal(info.ip, '9.9.9.9');
      assert.deepEqual(info.forwardedChain, ['9.9.9.9', '203.0.113.9']);
    });
  });

  describe('given trusted proxies by address', () => {
    it('for a trusted loopback peer, honors X-Forwarded-For', async () => {
      assert.equal((await resolve('loopback', '203.0.113.9')).ip, '203.0.113.9');
    });

    it('for a trusted CIDR containing the peer, honors X-Forwarded-For', async () => {
      assert.equal((await resolve('127.0.0.0/8', '203.0.113.9')).ip, '203.0.113.9');
      assert.equal((await resolve(['10.0.0.0/8', '127.0.0.1'], '203.0.113.9')).ip, '203.0.113.9');
    });

    it('why the header is ignored when the peer is outside the trusted CIDRs: not our proxy', async () => {
      const info = await resolve('10.0.0.0/8', '203.0.113.9');
      assert.equal(info.ip, '127.0.0.1');
      assert.deepEqual(info.forwardedChain, []);
    });
  });

  describe('given trust proxy = true (the unsafe setting)', () => {
    it('why it must not be used on a public server: the client picks its own IP', async () => {
      const info = await resolve(true, '1.1.1.1, 203.0.113.9');
      assert.equal(info.ip, '1.1.1.1');
    });
  });
});

describe('IP middlewares with Express trust proxy', () => {
  before(() => { logger.silent = true; });
  after(() => { logger.silent = false; });

  describe('ipAllowlist', () => {
    it('given an empty list, allows everyone', async () => {
      assert.equal(await status(false, ipAllowlist([])), 200);
    });

    it('given the real peer in the list, allows it', async () => {
      assert.equal(await status(false, ipAllowlist(['127.0.0.0/8'])), 200);
    });

    it('why spoofing an allowed IP fails without a trusted proxy: X-Forwarded-For is ignored', async () => {
      assert.equal(await status(false, ipAllowlist(['203.0.113.9']), '203.0.113.9'), 403);
    });

    it('given a trusted proxy, matches the forwarded client', async () => {
      assert.equal(await status(1, ipAllowlist(['203.0.113.0/24']), '203.0.113.9'), 200);
      assert.equal(await status(1, ipAllowlist(['203.0.113.0/24']), '198.51.100.1'), 403);
    });

    it('why a forged leftmost entry cannot satisfy the list: only the proxy-appended hop counts', async () => {
      assert.equal(await status(1, ipAllowlist(['203.0.113.9']), '203.0.113.9, 198.51.100.1'), 403);
    });

    it('given an unparseable forwarded address, denies', async () => {
      assert.equal(await status(1, ipAllowlist(['203.0.113.0/24']), 'garbage'), 403);
    });

    it('given a forwarded IPv4-mapped IPv6 address, matches the IPv4 rule', async () => {
      assert.equal(await status(1, ipAllowlist(['203.0.113.0/24']), '::ffff:203.0.113.9'), 200);
    });
  });

  describe('ipBlacklist', () => {
    it('given an empty list, blocks nobody', async () => {
      assert.equal(await status(false, ipBlacklist([])), 200);
    });

    it('given the real peer in the list, blocks it', async () => {
      assert.equal(await status(false, ipBlacklist(['127.0.0.1'])), 403);
    });

    it('why a client cannot dodge the list by forging X-Forwarded-For without a trusted proxy', async () => {
      assert.equal(await status(false, ipBlacklist(['127.0.0.1']), '203.0.113.9'), 403);
    });

    it('given a trusted proxy, blocks the forwarded client but not the proxy', async () => {
      assert.equal(await status(1, ipBlacklist(['203.0.113.9']), '203.0.113.9'), 403);
      assert.equal(await status(1, ipBlacklist(['127.0.0.1']), '203.0.113.9'), 200);
    });

    it('why a forged leftmost entry cannot frame another IP: only the proxy-appended hop counts', async () => {
      assert.equal(await status(1, ipBlacklist(['9.9.9.9']), '9.9.9.9, 203.0.113.9'), 200);
    });

    it('given a forwarded IPv4-mapped IPv6 address, the IPv4 rule still blocks it', async () => {
      assert.equal(await status(1, ipBlacklist(['203.0.113.0/24']), '::ffff:203.0.113.9'), 403);
    });
  });
});
