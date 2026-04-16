<a name="readme-top"></a>

![][cover]

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/SillyTavern/SillyTavern.svg)](https://github.com/SillyTavern/SillyTavern/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/SillyTavern/SillyTavern.svg)](https://github.com/SillyTavern/SillyTavern/forks)
[![GitHub Issues](https://img.shields.io/github/issues/SillyTavern/SillyTavern.svg)](https://github.com/SillyTavern/SillyTavern/issues)
[![GitHub Pull Requests](https://img.shields.io/github/issues-pr/SillyTavern/SillyTavern.svg)](https://github.com/SillyTavern/SillyTavern/pulls)

</div>

---
TurtleTavern is a fork of SillyTavern with some stuff I wanted but can't muster the courage to PR lol. Also it's faster now or something.

### Features
* **Turtle Buttons** — Agnai-style clickable character buttons for group chats, with a new "Turtle Buttons" activation strategy that requires manual member selection via buttons instead of auto-activation.
* **Persistent character/group dates** — Character creation dates are stored in a `date_added.json` file, so moving characters between instances preserves their original dates. Group dates are persisted in the group JSON itself. Includes repair scripts for migrating from old date formats.
* **SQLite character index** — Characters are indexed in SQLite for fast list loading without re-parsing every PNG. The index auto-updates on character changes and can be manually rebuilt via the toolbar button. Enabled by default via `performance.useCharacterIndex`.
* **Turtle Tools** — Character card utilities: remove all asterisks, normalize smart quotes, mass find & replace across card fields, and find & replace across chat messages (with swipe support).
* **Replace Vowels** — Replaces Latin vowels with Cyrillic look-alikes in prompts, as a workaround for certain token filtering systems. Toggleable in the API drawer.

### Performance
* **Smaller client bundle** — lib.js reduced from ~1.9 MB to ~940 KB by switching highlight.js to core-only (6 languages), replacing full lodash with individual imports, removing unused chalk from the client, and optimizing chevrotain imports.
* **Cached version endpoint** — `getVersion()` no longer spawns git subprocesses on every call; the result is cached for the process lifetime.
* **Memory debugging** — Built-in memory logging to `memory-debug.log` with per-request heap delta tracking and periodic snapshots (useful for diagnosing leaks on large instances).

### Requirements
* **Node.js >= 22** (upstream requires >= 20)

---

SillyTavern provides a single unified interface for many LLM APIs (KoboldAI/CPP, Horde, NovelAI, Ooba, Tabby, OpenAI, OpenRouter, Claude, Mistral and more), a mobile-friendly layout, Visual Novel Mode, Automatic1111 & ComfyUI API image generation integration, TTS, WorldInfo (lorebooks), customizable UI, auto-translate, more prompt options than you'd ever want or need, and endless growth potential via third-party extensions.

We have a [Documentation website](https://docs.sillytavern.app/) to answer most of your questions and help you get started.

## What is SillyTavern?

SillyTavern (or ST for short) is a locally installed user interface that allows you to interact with text generation LLMs, image generation engines, and TTS voice models.

Beginning in February 2023 as a fork of TavernAI 1.2.8, SillyTavern now has over 300 contributors and 3 years of independent development under its belt, and continues to serve as a leading software for savvy AI hobbyists.

## Our Vision

1. We aim to empower users with as much utility and control over their LLM prompts as possible. The steep learning curve is part of the fun!
2. We do not provide any online or hosted services, nor programmatically track any user data.
3. SillyTavern is a passion project brought to you by a dedicated community of LLM enthusiasts, and will always be free and open sourced.

## Do I need a powerful PC to run SillyTavern?

The hardware requirements are minimal: it will run on anything that can run NodeJS 22 or higher. If you intend to do LLM inference on your local machine, we recommend a 3000-series NVIDIA graphics card with at least 6GB of VRAM, but actual requirements may vary depending on the model and backend you choose to use.

## Questions or suggestions?

### Discord server

| [![][discord-shield-badge]][discord-link] | [Join our Discord community!](https://discord.gg/sillytavern) Get support, share favorite characters and prompts. |
| :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |

Or get in touch with the developers directly:

* Discord: cohee, rossascends, wolfsblvt
* Reddit: [/u/RossAscends](https://www.reddit.com/user/RossAscends/), [/u/sillylossy](https://www.reddit.com/user/sillylossy/), [u/Wolfsblvt](https://www.reddit.com/user/Wolfsblvt/)
* [Post a GitHub issue](https://github.com/SillyTavern/SillyTavern/issues)

### I like your project! How do I contribute?

1. Send pull requests. Learn how to contribute: [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Send feature suggestions and issue reports using the provided templates.
3. Read this entire readme file and check the documentation website first, to avoid sending duplicate issues.

## Screenshots

<img width="500" alt="image" src="https://github.com/user-attachments/assets/9b5f32f0-c3b3-4102-b3f5-0e9213c0f50f">
<img width="500" alt="image" src="https://github.com/user-attachments/assets/913fdbaa-7d33-42f1-ae2c-89dca41c53d1">

## Installation

For detailed installation instructions, please visit our documentation:

* **[Windows Installation Guide](https://docs.sillytavern.app/installation/windows/)**
* **[MacOS/Linux Installation Guide](https://docs.sillytavern.app/installation/linuxmacos/)**
* **[Android (Termux) Installation Guide](https://docs.sillytavern.app/installation/android-(termux)/)**
* **[Docker Installation Guide](https://docs.sillytavern.app/installation/docker/)**

## License and credits

**This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.**

* [TavernAI](https://github.com/TavernAI/TavernAI) 1.2.8 by Humi: MIT License
* Portions of CncAnon's TavernAITurbo mod used with permission
* Visual Novel Mode inspired by the work of PepperTaco (<https://github.com/peppertaco/Tavern/>)
* Noto Sans font by Google (OFL license)
* Lexer/Parser by Chevrotain (Apache-2.0 license) <https://github.com/chevrotain/chevrotain>
* Icon theme by Font Awesome <https://fontawesome.com> (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
* Default content by @OtisAlejandro (Seraphina character and lorebook) and @kallmeflocc (10K Discord Users Celebratory Background)
* Docker guide by [@mrguymiah](https://github.com/mrguymiah) and [@Bronya-Rand](https://github.com/Bronya-Rand)
* kokoro-js library by [@hexgrad](https://github.com/hexgrad) (Apache-2.0 License)

## Top Contributors

[![Contributors](https://contrib.rocks/image?repo=SillyTavern/SillyTavern)](https://github.com/SillyTavern/SillyTavern/graphs/contributors)

<!-- LINK GROUP -->
[cover]: https://github.com/user-attachments/assets/01a6ae9a-16aa-45f2-8bff-32b5dc587e44
[discord-link]: https://discord.gg/sillytavern
[discord-shield-badge]: https://img.shields.io/discord/1100685673633153084?color=5865F2&label=discord&labelColor=black&logo=discord&logoColor=white&style=for-the-badge
