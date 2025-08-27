# n8n-nodes-wmi

![npm version](https://img.shields.io/npm/v/n8n-nodes-wmi.svg) ![npm downloads](https://img.shields.io/npm/dm/n8n-nodes-wmi.svg) ![license](https://img.shields.io/npm/l/n8n-nodes-wmi.svg) ![maintenance](https://img.shields.io/maintenance/yes/2025.svg)

Questo è un pacchetto di nodi della community di n8n che permette di eseguire query WMI (Windows Management Instrumentation) su macchine Windows remote.

## Prerequisiti

* n8n installato.
* Accesso a una macchina Windows con WMI abilitato e le credenziali necessarie (host, utente, password).

## Installazione

1. Vai alla tua directory di installazione di n8n.
2. Esegui il seguente comando:
    `npm install n8n-nodes-wmi`
3. Riavvia n8n.

## Come usare

1. Aggiungi il nodo "WMI" al tuo workflow.
2. Crea nuove credenziali "WMI API", fornendo l'host, il nome utente e la password per la macchina Windows a cui vuoi connetterti.
3. Nel nodo WMI, inserisci la query WMI che vuoi eseguire (es. `SELECT * FROM Win32_Processor`).
4. Esegui il workflow. L'output della query sarà disponibile nel pannello di output del nodo.

## Esempi di query WMI

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

## Suggerimenti

* Evita SELECT * in ambienti con molte entità: specifica i campi per ridurre i dati.
* Usa filtri WHERE per limitare il carico sulla macchina remota.
* Per query lente valuta di spezzare il lavoro in più workflow o aggiungere un limit (non tutte le classi supportano).
* Se ottieni errori di permessi, assicurati che l'utente appartenga al gruppo "Distributed COM Users" e abbia firewall configurato.
* La latenza dipende dalla configurazione DCOM/WMI e dalla rete: preferisci query mirate.
* Attiva "Verbose Logging" (impostazione del nodo) solo per debugging: registra host, utente (non la password), tempi di esecuzione e numero risultati per ogni item.

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
* Evita credenziali Domain Admin nei workflow.
* Ruota periodicamente le password archiviate.
* Limita i permessi dei workflow contenenti il nodo.



## Licenza

MIT
