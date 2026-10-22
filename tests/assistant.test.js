import test from 'node:test';
import assert from 'node:assert/strict';
import { askClara, resolveEndpoint } from '../public/js/assistant.js';

const origin = 'https://clara.example/front/';
const options = (overrides = {}) => ({ config: { assistantEndpoint: '/api/chat' }, origin, ...overrides });

test('demo is explicit and never calls a service', async () => {
  const result = await askClara('Una lezione su Foscolo', 'text', options({ config: { assistantEndpoint: null }, fetchImpl: () => assert.fail('Network in demo') }));
  assert.equal(result.demo, true);
  assert.match(result.reply, /non è ancora collegato/);
});

test('configured adapter sends selected mode and message to the same origin', async () => {
  const controller = new AbortController();
  const result = await askClara('  Una lezione  ', 'voice', options({ signal: controller.signal, fetchImpl: async (url, init) => {
    assert.equal(url.href, 'https://clara.example/api/chat');
    assert.equal(init.method, 'POST');
    assert.equal(init.credentials, 'same-origin');
    assert.equal(init.signal, controller.signal);
    assert.deepEqual(JSON.parse(init.body), { message: 'Una lezione', responseMode: 'voice' });
    return { ok: true, json: async () => ({ reply: 'Iniziamo dalla domanda generatrice.' }) };
  } }));
  assert.equal(result.demo, false);
  assert.equal(result.reply, 'Iniziamo dalla domanda generatrice.');
});

test('untrusted destinations are rejected and relative deployments work', () => {
  for (const endpoint of ['https://other.example/api', '//other.example/api', 'javascript:alert(1)', 'data:text/plain,test']) {
    assert.throws(() => resolveEndpoint(endpoint, origin));
  }
  assert.equal(resolveEndpoint('./api/chat', origin).pathname, '/front/api/chat');
});

test('empty, oversized requests and invalid modes are rejected', async () => {
  for (const [message, mode] of [['   ', 'text'], ['x'.repeat(4001), 'text'], ['Hi', 'invalid']]) {
    await assert.rejects(askClara(message, mode, options({ fetchImpl: () => assert.fail('Invalid request sent') })));
  }
});

test('service failures, expired sessions and invalid responses surface as errors', async () => {
  for (const response of [{ ok: false, status: 500 }, { ok: false, status: 401 }, { ok: true, json: async () => ({ reply: '' }) }, { ok: true, json: async () => ({ reply: 12 }) }, { ok: true, json: async () => ({ reply: 'x'.repeat(20001) }) }]) {
    await assert.rejects(askClara('Una richiesta', 'text', options({ fetchImpl: async () => response })));
  }
});

test('abort propagates to the caller without a fabricated answer', async () => {
  await assert.rejects(askClara('Una richiesta', 'text', options({ fetchImpl: async () => { throw new DOMException('Aborted', 'AbortError'); } })), { name: 'AbortError' });
});
