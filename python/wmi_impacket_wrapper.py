#!/usr/bin/env python3
"""
Wrapper Python per eseguire query WMI (WQL) via impacket.

Requisiti:
  pip install impacket

Uso (CLI):
  python wmi_impacket_wrapper.py \
    --host 10.0.0.5 \
    --user Administrator \
    --password '***' \
    --domain MYDOM \
    --namespace root\\\\CIMV2 \
    --query "SELECT Caption,Version FROM Win32_OperatingSystem"

Output: JSON su stdout { "data": [ {...}, ... ] }
Exit codes:
  0 success
  2 usage error / param mancanti
  3 errore esecuzione WMI

Nota: questo script implementa solo operazione di tipo "query".
"""
import argparse
import json
import sys
import traceback
from typing import Any, Dict, List

try:
    from impacket.dcerpc.v5.dcomrt import DCOMConnection
    from impacket.dcerpc.v5.dcom import wmi
    from impacket.dcerpc.v5.dtypes import NULL
except Exception as e:  # pragma: no cover
    print(json.dumps({"error": f"Impacket non installato: {e}"}), file=sys.stderr)
    sys.exit(3)


def exec_query(host: str, user: str, password: str, domain: str, namespace: str, query: str, auth_level: str = 'default') -> List[Dict[str, Any]]:
    dcom = None
    results: List[Dict[str, Any]] = []
    try:
        dcom = DCOMConnection(host, user, password, domain, '', '', oxidResolver=True)
        iInterface = dcom.CoCreateInstanceEx(wmi.CLSID_WbemLevel1Login, wmi.IID_IWbemLevel1Login)
        iWbemLevel1Login = wmi.IWbemLevel1Login(iInterface)
        iWbemServices = iWbemLevel1Login.NTLMLogin(namespace, NULL, NULL)
        iWbemLevel1Login.RemRelease()
        enum = iWbemServices.ExecQuery(query)
        while True:
            try:
                pEnum = enum.Next(0xffffffff, 1)[0]
                record = pEnum.getProperties()
                row: Dict[str, Any] = {}
                for k, v in record.items():
                    row[k] = v.get('value')
                results.append(row)
            except Exception as e:  # fine enumerazione quando S_FALSE
                if 'S_FALSE' in str(e):
                    break
                raise
        enum.RemRelease()
        iWbemServices.RemRelease()
    finally:
        if dcom:
            try:
                dcom.disconnect()
            except Exception:  # pragma: no cover
                pass
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description='Esegue query WMI via impacket')
    parser.add_argument('--host', required=True)
    parser.add_argument('--user', required=True)
    parser.add_argument('--password', required=True)
    parser.add_argument('--domain', default='')
    parser.add_argument('--namespace', default='root\\\\CIMV2')
    parser.add_argument('--query', required=True)
    parser.add_argument('--auth-level', choices=['default', 'integrity', 'privacy'], default='default')
    parser.add_argument('--json', action='store_true', help='Forza output JSON (default)')
    args = parser.parse_args()

    try:
        data = exec_query(args.host, args.user, args.password, args.domain, args.namespace, args.query, args.auth_level)
        print(json.dumps({'data': data}, ensure_ascii=False))
        return 0
    except Exception as e:  # pragma: no cover
        print(json.dumps({'error': str(e), 'trace': traceback.format_exc()}), file=sys.stderr)
        return 3


if __name__ == '__main__':  # pragma: no cover
    sys.exit(main())
