# n8n-nodes-wmi

![npm version](https://img.shields.io/npm/v/n8n-nodes-wmi.svg) ![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-wmi.svg) ![license](https://img.shields.io/npm/l/n8n-nodes-wmi.svg) ![maintenance](https://img.shields.io/maintenance/yes/2025.svg)

Questo è un pacchetto di nodi della community di n8n che permette di:

* Eseguire query WMI (WQL) su macchine Windows remote (engine "node-wmi").
* Eseguire comandi WMIC (alias get / call / list alias) tramite engine vendorizzato `wmi-query` (richiede che n8n giri su Windows e che `wmic` sia disponibile nel PATH).
* Eseguire query WQL via DCOM con engine `impacket` (richiede Python 3 + libreria `impacket`).

Seleziona l'engine nel campo "Engine" del nodo e l'operazione nel campo "Operation".

## Prerequisiti

* n8n installato.
* Accesso a una o più macchine Windows con WMI abilitato e le credenziali necessarie (host, user, password, opzionale domain e namespace).
* Per engine WMIC: n8n deve girare su Windows e il comando `wmic` deve essere disponibile.
* Per engine Impacket: Python 3 installato sull'host n8n + `pip install impacket` (eventuale variabile `PYTHON_BIN` per percorso custom).

## Installazione

1. Vai alla tua directory di installazione di n8n.
2. Esegui il seguente comando:
    `npm install n8n-nodes-wmi`
3. Riavvia n8n.

## Come usare

1. Aggiungi il nodo "WMI" al tuo workflow.
2. Crea nuove credenziali "WMI API", fornendo:
    * Host (FQDN o IP)
    * User (formato `utente` oppure `DOMINIO\\utente`)
    * Domain (opzionale se non incluso nello user)
    * Password
    * Namespace (default `root\\CIMV2`)
3. Nel nodo WMI scegli l'engine:
    * node-wmi: per query WQL standard (operation = query)
    * wmic: per alias (operation = get / call / listAlias)
4. Imposta l'operazione e i relativi campi:
    * Query: puoi lasciare vuota la query e usare Class + Properties + Where
    * Get: richiede Alias (es. `os`, `process`, `service`), opzionale Fields e Where
    * Call: richiede Alias + Action (es. `process` + `terminate`), opzionale Where
    * ListAlias: nessun altro campo richiesto
5. Esegui il workflow. L'output JSON sarà disponibile nel pannello di output del nodo (campo `json.data`).

### Scelta dell'engine

| Scenario | Engine consigliato |
|----------|-------------------|
| Query WQL cross-platform (n8n su Linux/Mac) | node-wmi |
| Azioni o recupero rapido via alias WMIC | wmic |
| Necessità di `call` (start/stop service, ecc.) | wmic |
| Multi-piattaforma senza dipendenze Windows locali | node-wmi |
| WQL via DCOM quando node-wmi fallisce / necessita autenticazione avanzata | impacket |
| Fail-fast verifica ambiente Python+impacket prima della query | impacket + Preflight Check |
| Query WQL remota da host n8n Linux usando binario wmic Samba | wmic-cli |

## Esempi di query WMI (engine node-wmi)

Copiale nel campo Query del nodo.

### Informazioni hardware di base

```sql
SELECT * FROM Win32_ComputerSystem
SELECT * FROM Win32_Processor
SELECT * FROM Win32_BaseBoard
SELECT * FROM Win32_BIOS
```

### Memoria

```sql
SELECT TotalVisibleMemorySize, FreePhysicalMemory FROM Win32_OperatingSystem
SELECT * FROM Win32_PhysicalMemory
```

### Disco

```sql
SELECT * FROM Win32_LogicalDisk WHERE DriveType=3
SELECT DeviceID, Model, InterfaceType, Size FROM Win32_DiskDrive
```

### Rete

```sql
SELECT * FROM Win32_NetworkAdapter WHERE PhysicalAdapter=TRUE
SELECT * FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled=TRUE
```

### Sistema operativo e patch

```sql
SELECT Caption, Version, BuildNumber, LastBootUpTime FROM Win32_OperatingSystem
SELECT HotFixID, InstalledOn FROM Win32_QuickFixEngineering
```

### Processi e servizi

```sql
SELECT Name, ProcessId, ThreadCount, WorkingSetSize FROM Win32_Process
SELECT Name, State, Status, StartMode FROM Win32_Service
```

### Utilizzo CPU (istantaneo per core)

```sql
SELECT Name, PercentProcessorTime FROM Win32_PerfFormattedData_PerfOS_Processor
```

### Event Log (es. ultimi 50 eventi System)

```sql
SELECT * FROM Win32_NTLogEvent WHERE Logfile='System'
```
 
Nota: per filtri temporali più accurati usare il formato WMI datetime (es: 20250101000000.000000+000).

### Esempio filtro con condizioni

```sql
SELECT Name, Status FROM Win32_Service WHERE StartMode='Auto' AND State<>'Running'
```

## Esempi WMIC alias (engine wmic)

### Engine wmic-cli (Linux)

Prerequisiti (Ubuntu/Debian):

```bash
sudo apt-get update && sudo apt-get install -y samba-common-bin
which wmic
```

Uso: Engine = wmic-cli, Operation = query.

Nota: accetta solo query WQL (nessun supporto alias/call). Il comando eseguito è simile a:
`wmic -U DOM/utente%password //HOST "SELECT * FROM Win32_OperatingSystem"`

Variabili opzionali:

* WMIC_BIN per indicare un path alternativo (default `wmic`).


### Engine Impacket (setup rapido)

Installazione su host Linux di n8n:

```bash
sudo apt-get update && sudo apt-get install -y python3 python3-pip
pip install --upgrade pip
pip install impacket
```

Verifica:

```bash
python3 -c "import impacket; import sys; print('Impacket OK')"
```

Uso nel nodo: Engine = impacket, Operation = query, valorizza Query oppure Class/Properties/Where.

Opzione Preflight Check (solo engine impacket): se abilitata il nodo verifica prima dell'esecuzione che l'interprete Python sia risolvibile e che il modulo `impacket` sia importabile, fallendo subito in caso contrario (fail-fast) per evitare timeout lunghi.


Get informazioni sistema operativo (alias os):

```text
Alias = os
Operation = get
Fields (opzionale) = Caption,Version,BuildNumber
```

Elenca servizi non in esecuzione AUTO:

```text
Alias = service
Operation = get
Where = StartMode='Auto' AND State<>'Running'
Fields = Name,State,StartMode
```

Termina un processo specifico (esempio):

```text
Alias = process
Operation = call
Action = terminate
Where = name='notepad.exe'
```

Elenco alias disponibili:

```text
Operation = listAlias
Engine = wmic
```

## Suggerimenti

* Evita SELECT * in ambienti con molte entità: specifica i campi per ridurre i dati.
* Usa filtri WHERE per limitare il carico sulla macchina remota.
* Per query lente valuta di spezzare il lavoro in più workflow o aggiungere un limit (non tutte le classi supportano).
* Se ottieni errori di permessi, assicurati che l'utente appartenga al gruppo "Distributed COM Users" e abbia firewall configurato.
* La latenza dipende dalla configurazione DCOM/WMI e dalla rete: preferisci query mirate.
* Attiva "Verbose Logging" solo per debugging: registra host, utente (non la password), tempi di esecuzione e numero risultati per ogni item.
* Con operation=query puoi lasciare vuota la Query e usare Class/Properties/Where per costruzione automatica.
* Per domain puoi scriverlo nel campo dedicato o direttamente nello user come `DOMINIO\\utente`.
* Engine impacket: utile se hai limitazioni DCOM particolari o vuoi futura estensione Kerberos (non ancora implementata qui).

## Troubleshooting

| Problema | Possibili cause | Soluzione |
|----------|-----------------|-----------|
| `Access denied` | Utente senza permessi WMI/DCOM | Aggiungi al gruppo Administrators o Distributed COM Users; verifica WMI Control > Security |
| Timeout / nessuna risposta | Firewall o porte DCOM chiuse | Apri TCP 135 + range porte dinamiche (49152–65535) o configura range statico DCOM |
| `Provider failure` | Provider corrotto / namespace errato | Verifica con `wbemtest`, ripara repository WMI (`winmgmt /salvagerepository`) |
| Risultati vuoti | Classe non disponibile | Controlla documentazione MSDN / versione Windows |
| `RPC server unavailable` | Servizio WMI fermo o firewall | Riavvia servizi Winmgmt & RPC, controlla firewall |

### Porte e requisiti di rete

* TCP 135 (RPC Endpoint Mapper)
* Range dinamico DCOM 49152–65535 (o range ridotto configurato in registro)

### Sicurezza

* Usa account con privilegi minimi.
* Evita di dare a n8n il permesso di eseguire chiamate WMIC destructive senza controlli (operation=call).
* Per engine impacket mantieni aggiornato il pacchetto `impacket` e limita l'accesso alla shell Python.
* Evita credenziali Domain Admin nei workflow.
* Ruota periodicamente le password archiviate.
* Limita i permessi dei workflow contenenti il nodo.



## Licenza

MIT

---

Changelog completo in `CHANGELOG.md`.
