/**
 * Test unitario engine impacket (mock child_process.execFile).
 */
import { Wmi } from '../nodes/Wmi/Wmi.node';
import type { IExecuteFunctions, INodeExecutionData, ICredentialDataDecryptedObject } from 'n8n-workflow';

jest.mock('node:child_process', () => {
  return {
    execFile: (_bin: string, _args: string[], _opts: any, cb: (err: any, stdout: string, stderr: string) => void) => {
      // Simula risposta JSON dal wrapper Python
      const fake = JSON.stringify({ data: [{ Caption: 'Microsoft Windows Server 2022', Version: '10.0.20348' }] });
      setImmediate(() => cb(null, fake, ''));
      return { on: () => {} } as any;
    },
  };
});

class Ctx implements Partial<IExecuteFunctions> {
  private params: Record<string, any>;
  private items: INodeExecutionData[] = [{ json: {} }];
  constructor(params: Record<string, any>) { this.params = params; }
  getInputData() { return this.items; }
  getNode() { return { name: 'TestWMI' } as any; }
  getNodeParameter(name: string) { return this.params[name]; }
  async getCredentials<T extends object = ICredentialDataDecryptedObject>(): Promise<T> {
    return {
      host: '10.0.0.1',
      user: 'DOMAIN\\test',
      password: 'x',
      namespace: 'root\\CIMV2'
    } as unknown as T;
  }
  continueOnFail() { return false; }
}

describe('Engine impacket (mock)', () => {
  test('query returns data array', async () => {
    const node = new Wmi();
    const ctx = new Ctx({ engine: 'impacket', operation: 'query', class: 'Win32_OperatingSystem', properties: 'Caption,Version' });
  const res = await node.execute.call(ctx as any);
  const arr = res[0][0].json.data as any[];
  expect(Array.isArray(arr)).toBe(true);
  expect(arr[0].Caption).toContain('Windows');
  });
});
