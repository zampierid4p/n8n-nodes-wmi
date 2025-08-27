# Changelog

Tutte le modifiche rilevanti a questo progetto verranno documentate in questo file.

Il formato segue le raccomandazioni di [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versioning semantico [SemVer](https://semver.org/lang/it/).

## [Unreleased]

_Nessuna modifica al momento._

## [0.1.3] - 2025-08-27

### Changed (packaging 0.1.3)

- Aggiunto script di rilascio automatizzato (`scripts/release.js`).
- Migliorato processo build forzando compilazione (`--force`) e pulizia `.tsbuildinfo`.

### Fixed (packaging 0.1.3)

- Ripristinati file compilati mancanti nel pacchetto (problema temporaneo build precedente).

## [0.1.2] - 2025-08-27

### Changed (packaging)

- Rimosso `index.js` non utilizzato; `main` ora punta a `dist/nodes/Wmi/Wmi.node.js`.
- Copia icone limitata al solo nodo WMI (aggiornato `gulpfile.js`).
- Spostato file incrementale TypeScript `.tsbuildinfo` fuori da `dist`.

### Fixed (packaging)

- Esclusa icona di esempio `httpbin.svg` dal pacchetto pubblicato.


## [0.1.1] - 2025-08-27

### Changed (initial)

- Limitata compilazione TypeScript ai soli file WMI (`tsconfig.json`).
- Esclusi file di esempio dalla pubblicazione (`.npmignore`).

### Fixed (initial)

- Evitata pubblicazione accidentale di nodi/credenziali di esempio.

## [0.1.0] - 2025-08-27

### Added

- Primo rilascio del pacchetto `n8n-nodes-wmi`.
- Nodo WMI per esecuzione query su host Windows remoti (autenticazione host / user / password).
- Credenziali `WMI API` dedicate.
- Esecuzione query generica con ritorno risultati JSON.
- Documentazione README con esempi di query, troubleshooting, sicurezza, suggerimenti.

### Changed

- Configurazione `package.json` aggiornata (repository, keywords, metadata) per pubblicazione npm.

### Fixed

- Errori TypeScript relativi a tipizzazione `node-wmi`, configurazione `inputs/outputs` e build.
- Formattazione README (lint markdown).

[Unreleased]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zampierid4p/n8n-nodes-wmi/releases/tag/v0.1.0
