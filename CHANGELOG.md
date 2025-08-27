# Changelog

Tutte le modifiche rilevanti a questo progetto verranno documentate in questo file.

Il formato segue le raccomandazioni di [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versioning semantico [SemVer](https://semver.org/lang/it/).

## [Unreleased]

_Nessuna modifica al momento._

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

[Unreleased]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/zampierid4p/n8n-nodes-wmi/releases/tag/v0.1.0
