# Changelog

Tutte le modifiche rilevanti a questo progetto verranno documentate in questo file.

Il formato segue le raccomandazioni di [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il versioning semantico [SemVer](https://semver.org/lang/it/).

## [Unreleased]

### Added (initial)

- (Pianificato) Opzioni avanzate: timeout query, limit risultati, selezione namespace WMI.
- (Pianificato) Validazione opzionale query / whitelist classi.

## [0.1.0] - 2025-08-27

### Added

- Primo rilascio del pacchetto `n8n-nodes-wmi`.
- Nodo WMI per esecuzione query su host Windows remoti (autenticazione host / user / password).
- Credenziali `WMI API` dedicate.
- Esecuzione query generica con ritorno risultati JSON.
- Documentazione README con esempi di query, troubleshooting, sicurezza, suggerimenti.

### Changed (initial)

- Configurazione `package.json` aggiornata (repository, keywords, metadata) per pubblicazione npm.

### Fixed (initial)

- Errori TypeScript relativi a tipizzazione `node-wmi`, configurazione `inputs/outputs` e build.
- Formattazione README (lint markdown).

[Unreleased]: https://github.com/zampierid4p/n8n-nodes-wmi/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/zampierid4p/n8n-nodes-wmi/releases/tag/v0.1.0
