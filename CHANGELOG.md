# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-12-17

Initial release of @trestleinc/bridge.

### Added

- **Cards** - Field definitions with types and security levels
  - Types: text, number, boolean, date, json
  - Security levels: public, internal, confidential, restricted
  - Subject types: person, organization, transaction
- **Procedures** - Data collection definitions
  - Types: form, import, api
  - Card mappings with field paths and transformations
  - Subject operations: create, update, upsert
- **Deliverables** - Reactive triggers
  - Required cards specification
  - Prerequisites and conditions
  - HTTP callback and Convex action support
  - Status management: active, paused, archived
- **Evaluations** - Execution tracking
  - Scheduling support
  - Status tracking: pending, running, completed, failed, cancelled
  - Result capture with duration and errors
- **Namespaced API**
  - `card.{get, find, list, create}`
  - `procedure.{get, list, create, update, remove}`
  - `deliverable.{get, list, create, update, evaluate}`
  - `evaluation.{get, list, start, cancel, complete}`
- **Server hooks** for authorization and side effects
