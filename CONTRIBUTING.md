# Contributing

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project.

## Development workflow

To get started with the project, run `pnpm` in the root directory to install the required dependencies for each package:

```sh
pnpm
```

To start the packager:

```sh
expo start
```

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

The type and scope are not decoration: [CHANGELOG.md](./CHANGELOG.md), the
GitHub release and the annotated tag are all generated from them by
`.github/scripts/changelog.py`. A commit that doesn't parse still shows up,
just under "Other".

Breaking changes get a `!` before the colon and a `BREAKING CHANGE:` footer
explaining what callers have to do:

```
feat(api)!: return message ids as strings

BREAKING CHANGE: `message.send` used to return a numeric `id`. Clients
that compared it to a number need to compare strings now.
```

Both markers land the commit under "Breaking changes" at the top of the
release, and the footer text travels with it into all three places.

### Cutting a release

```sh
./scripts/tag-release.sh              # v<version from apps/mobile/app.config.ts>
./scripts/tag-release.sh v1.5.0-rc1   # explicit, e.g. a release candidate
DRY_RUN=1 ./scripts/tag-release.sh    # print the notes and stop
```

The script creates an annotated tag whose message is the generated notes and
pushes it. That push is what starts `release-mobile.yml`: it publishes the
GitHub release and builds the native artifacts. Anything with a suffix (`-rc1`,
`-beta.2`) is marked a prerelease. Store submission stays a separate, opt-in
manual dispatch.

The script also regenerates `CHANGELOG.md`, which can only include the new
version once the tag exists. Commit that through a PR like any other change;
the ruleset on `main` requires one, and CI can't do it for you because a pull
request opened with `GITHUB_TOKEN` never gets its required checks.

Most changes never need any of this. `deploy-mobile.yml` ships an OTA update
on every push to `main`; a tag is only for when native actually changed.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Follow the pull request template when opening a pull request.

## Licensing of contributions

Pegada is [AGPL-3.0-or-later](./LICENSE), with an attribution requirement added under Section 7(b) (see [NOTICE](./NOTICE)). It's real open source: fork it, modify it, run it, ship it. The catch is copyleft, if you distribute it or run a modified version as a network service, you have to release your source too, and you have to keep the attribution.

A separate commercial license is available for people who don't want to release their source. For that to be possible, contributions need to be licensable on the same terms. So by opening a pull request you're confirming two things:

1. **You wrote it, or you have the right to submit it.** It's your own work, or you have permission from whoever owns it, and it doesn't pull in code under a license that conflicts with the AGPL.

2. **You grant a license to use it.** A perpetual, worldwide, irrevocable, royalty-free, non-exclusive license to Gabriel Taveira to use, reproduce, modify, publish, distribute, sublicense, and relicense your contribution as part of Pegada, both under the AGPL and under separate commercial terms.

You keep the copyright on what you wrote. This is a license, not an assignment, so your code stays yours and you can use it anywhere else you want. You're also welcome to add your own copyright line for your contribution.

If point 2 doesn't work for you, no hard feelings. Open an issue describing the fix instead and you'll get credited for it.

### Commercial use

Want to build on this without open-sourcing your own stack? That's a conversation, not a no. Email gabrielstaveira@gmail.com.

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

### Our Standards

Examples of behavior that contributes to a positive environment for our community include:

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility and apologizing to those affected by our mistakes, and learning from the experience
- Focusing on what is best not just for us as individuals, but for the overall community

Examples of unacceptable behavior include:

- The use of sexualized language or imagery, and sexual attention or
  advances of any kind
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or email
  address, without their explicit permission
- Other conduct which could reasonably be considered inappropriate in a
  professional setting

### Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

Community leaders have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, and will communicate reasons for moderation decisions when appropriate.

### Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces. Examples of representing our community include using an official e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the community leaders responsible for enforcement at gabrielstaveira@gmail.com. All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the reporter of any incident.

### Enforcement Guidelines

Community leaders will follow these Community Impact Guidelines in determining the consequences for any action they deem in violation of this Code of Conduct:

#### 1. Correction

**Community Impact**: Use of inappropriate language or other behavior deemed unprofessional or unwelcome in the community.

**Consequence**: A private, written warning from community leaders, providing clarity around the nature of the violation and an explanation of why the behavior was inappropriate. A public apology may be requested.

#### 2. Warning

**Community Impact**: A violation through a single incident or series of actions.

**Consequence**: A warning with consequences for continued behavior. No interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, for a specified period of time. This includes avoiding interactions in community spaces as well as external channels like social media. Violating these terms may lead to a temporary or permanent ban.

#### 3. Temporary Ban

**Community Impact**: A serious violation of community standards, including sustained inappropriate behavior.

**Consequence**: A temporary ban from any sort of interaction or public communication with the community for a specified period of time. No public or private interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, is allowed during this period. Violating these terms may lead to a permanent ban.

#### 4. Permanent Ban

**Community Impact**: Demonstrating a pattern of violation of community standards, including sustained inappropriate behavior, harassment of an individual, or aggression toward or disparagement of classes of individuals.

**Consequence**: A permanent ban from any sort of public interaction within the community.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 2.0,
available at https://www.contributor-covenant.org/version/2/0/code_of_conduct.html.

Community Impact Guidelines were inspired by [Mozilla's code of conduct enforcement ladder](https://github.com/mozilla/diversity).

[homepage]: https://www.contributor-covenant.org

For answers to common questions about this code of conduct, see the FAQ at
https://www.contributor-covenant.org/faq. Translations are available at https://www.contributor-covenant.org/translations.
