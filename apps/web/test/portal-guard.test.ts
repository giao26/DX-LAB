// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
vi.mock('next/headers',()=>({cookies:vi.fn(async()=>({get:()=>({value:'signed-cookie'})}))}));
vi.mock('next/navigation',()=>({redirect:vi.fn((url:string)=>{throw new Error(`NEXT_REDIRECT:${url}`);})}));
vi.mock('../lib/session',()=>({SESSION_COOKIE:'cookie',getSession:vi.fn(),currentIdentity:vi.fn(),SessionError:class extends Error {constructor(public status:number){super();}}}));
import { requirePortal } from '../lib/portal';
import { currentIdentity, getSession } from '../lib/session';
const session={token:'opaque',sub:'staff',csrf:'csrf',expires:Date.now()+30000};
beforeEach(()=>{vi.mocked(getSession).mockReset();vi.mocked(currentIdentity).mockReset();});
for(const path of ['/portal/resources','/portal/h','/portal/dashboard?section=d#d','/portal/dashboard?section=i#i']) test(`missing session redirects to own destination ${path}`,async()=>{
  vi.mocked(getSession).mockReturnValue(undefined);
  await expect(requirePortal(path)).rejects.toThrow(`NEXT_REDIRECT:/bff/session/login?returnTo=${encodeURIComponent(path)}`);
});
test('layout missing session emits no private header and leaves redirect to page',async()=>{
  vi.mocked(getSession).mockReturnValue(undefined);
  expect(await requirePortal('/portal',false,true)).toBeUndefined();
});
test('configuration error has safe service unavailable redirect',async()=>{
  vi.mocked(getSession).mockImplementation(()=>{throw new Error('bad secret');});
  await expect(requirePortal()).rejects.toThrow('NEXT_REDIRECT:/bff/session/error?status=503');
});
for(const reason of ['logout','expiry']) test(`${reason} during identity lookup cannot render`,async()=>{
  vi.mocked(getSession).mockReturnValueOnce(session).mockReturnValueOnce(undefined);
  vi.mocked(currentIdentity).mockResolvedValue({sub:'staff',roles:['employee'],groups:[]});
  await expect(requirePortal('/portal/h')).rejects.toThrow('NEXT_REDIRECT:/bff/session/error?status=403');
  expect(getSession).toHaveBeenNthCalledWith(2,'signed-cookie');
});
