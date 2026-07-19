# [MyPWAIndia](https://mypayindia.sbs)
The React MyPayIndia responsive web app is an official albeit alternative client for using [MyPayIndia](https://mypayindia.com). 

> [!WARNING]
This **is not** the source code for MyPayIndia, the website.

## Why?
At the start of May, this remake was born. The original PWA was becoming quite difficult to maintain as the monolithic-ness of it was becoming quite large, and I feared that, by splitting the files up I would've certainly broke something. So, I created this. The second incarnation of MyPWAIndia, in React, began at the very end of April, but was spearheaded around May 5th to 7th.

MyPWAIndia (usually) achieves quad-100 scores on Lighthouse, works on anything with a modern JavaScript engine, and uses near-to-naught RAM. For, what it does, I guess...? It is hosted entirely on Cloudflare Workers (uses Pages for the frontend and Workers for the bastion backend)

## The bastion
[bastion.mypayindia.sbs](https://bastion.mypayindia.sbs) (named after the [Bruckell Bastion](https://beamng.fandom.com/wiki/Bruckell_Bastion)) is basically just a proxy for MyPWAIndia to talk with MyPayIndia. It's a Cloudflare Worker.

Sessions are managed both within the bastion (a cookie) and on the frontend (a session token), i.e., you can delete the cookie but the app will still remember you. To fully log out, go to [/i/flow/logout](https://mypayindia.sbs/i/flow/logout) - that logs both sides out.

Aside from handling data and sessions, it also handles [the button](https://mypayindia.sbs/iotm/button) and proxies clicks.

## About this repo
This repo is not intended for self-hosting or contributing; it is meant to just show how the app works. Please do not create pull requests, they will not be merged.

You are, however, free to fork it and do absolutely anything you want with the code, and redistribute that code... provided you abide by the MIT license. You also must affirm your fork is... a fork and **unaffiliated** with MyPayIndia or MyPWAIndia and **you may not** use any official branding.

## Bundling & loading
The app is built with Vite. The output is deliberately **unminified** (no sourcemaps either)

### Bundling
The entry point keeps a stable name, `/i/scripts/mypwaindia.js`, and everything else is split into named chunks (`/i/scripts/mpi_[name]-[hash].js`). Chunking is done artisanally in [vite.config.js](vite.config.js) via `manualChunks`:

- Pages are grouped by feature: `flow` (login/logout/onboarding), `transfers`, `history`, `links`, `social`, `settings`, `iotm`, `tools` (MyCLiIndia), `client` (dashboard/account), `scambait`, and so on
- `node_modules` gets its own chunk, except for the three.js/globe.gl stack which is quarantined into `globe` (c. 4.9MB & only needed by the [team globe](https://mypayindia.sbs/i/team/globe))
- Context providers live in `bastion`, the status/connection components in `stability`

### Loading
Every page in [app.tsx](src/app.tsx) is a `React.lazy()` import, and `modulePreload` is off, so a chunk is only fetched the first time you navigate to a route inside it. If that fails, its caught by an error boundary that offers a reload

While the entry script loads, you see the splash screen, which is inlined straight into [index.html](index.html) with just CSS. Once React initializes, the splash fades out and the app fades in. Load time is also logged to the console

### Service worker
The PWA side uses Workbox ([sw.ts](src/sw.ts) via vite-plugin-pwa's `injectManifest`):

- Everything (JS, CSS, HTML, fonts, images) is precached on install, **except** the globe chunk
- Runtime requests for pages, scripts and styles are network-first with a 4 second timeout, then fall back to cache
- Updates use a prompt & the new worker waits until you confirm rather than automatic

### Side builder: a single index.html 
`npm run minify` runs a second config ([vite.config.minify.js](vite.config.minify.js)) that inlines the entire app (scripts, styles, assets) into one `index.html` in `dist-minify/`, minified with esbuild and with the PWA disabled. That's just an experiment... please don't ever use that

## "Scambait" mode
Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app - but to their dismay, that geriatric geezer on the other end is using a mysterious online bank: MyPayIndia.

The mode hides things a scammer may find suspicious (e.g., the leaderboard) and exposes fabricated pages containing credit card information, fake transactions dating since 2017, and changes INR to Dollars ($).

**Learn more & activate: https://mypayindia.sbs/i/flow/scambaitmode**

## [The Button](https://mypayindia.sbs/iotm/button)
The MyPWAIndia Button brings more features and information than the original, like:
- tracks who is actively clicking
- an estimated ETA to surpass someone above you on the leaderboard
- Cool animations
- An onboard autoclicker:

The Button has an onboard autoclicker, unlockable by either subscribing 50 INR / 2wk or answering 5 progressively more difficult math equations. That maths game is probably the most over-engineered bit of the entire app, so here's how it works:

- Questions are generated locally and escalate from single-digit addition to, by question 5, things like `48213 x 7331` (answers are kept as BigInts because they outgrow safe integers)
- You get 45 seconds per question. A wrong answer or a timeout restarts it all
- Leaving the page (e.g., to open a calculator) shaves 15 seconds off your clock
- A `debugger` statement fires every 150ms; if it stalls, DevTools is declared open and you restart
- The equation is unselectable (no copy-pasting into a solver), right-click is blocked, and a MutationObserver plus a poll watch for style tampering... which also restarts you
- Winning unlocks the autoclicker for the current session only; leave the button (as in just navigating away) and you're doing all of this again

Considering these measures are entirely client-sided, you could bypass these obstacles. And if you're determined enough, you can have it. Or subscribe. Or just use a native autoclicker...

## Route map
The routes throughout this app are heavily inspired by the Twitter PWA, if not directly lifted from it:

### Public
- **/dash** - home
- **/account** - account information and masthead
- **/account/restrictions** - account restrictions
- **/account/transfer** - transfer funds screen
- **/account/transfer/bulk** - bulk transfers, enqueue people and amount then send them all at once
- **/account/history** - transaction history

### Payment links
- **/i/flow/links** - links home, list & create & revoke
- **/i/flow/links/interim/:token** - claim/inspect a link by token

(**/links**, **/links/claim** and **/links/claim/:token** still work as compatibility redirects)

### Internal/information (hence the /i)
- **/i/leaderboard** - top 10 richest accounts
- **/i/team** - list of team members
- **/i/team/globe** - team members on a 3D globe (the 4.9MB chunk)
- **/i/release_notes** - app release notes
- **/i/acknowledgements** - thanks and acknowledgements

### Internal flow (hence the /i/flow)
- **/i/flow/login** - log in
- **/i/flow/logout** - log out
- **/i/flow/onboarding** - onboarding disclaimer screen
- **/i/flow/onboarding/wizard** - setup wizard after onboarder
- **/i/flow/connection** - stupid connection checker
- **/i/flow/mci** - MyCLiIndia, a fake Unix-like command line
- **/i/flow/mci/focus** - MyCLiIndia, fullscreen
- **/i/flow/mpti** - MyPWAToysIndia, fuck with shit, basically a debug page
- **/i/flow/subscriptions** - manage subscriptions
- **/i/flow/sessions** - view and manage active login sessions
- **/i/flow/transaction/:id** - transaction detail viewer
- **/i/flow/transaction:old/:id** - the old transaction viewer
- **/i/flow/theme** - apply a theme from a shared link
- **/i/flow/settings** - apply settings from a shared link

### Investment Opportunities™
- **/iotm** - home
- **/iotm/button** - the button, reinterpreted, with more calculations and an onboard autoclicker

(I couldn't port any other games, so they just link externally)

### Scambait
- **/dash/cards** - 3 fake randomly generated credit cards: everyday, savings & business, complete with CVV and numbers
- **/dash/statements** - 1000 randomly generated fake statements with various American businesses and random people (in place of /account/history)
- **/i/flow/scambaitmode** - redirects to /settings/scambait

### Control
- **/settings** - app settings (takes you to /settings/appearance)
- **/settings/:category** - settings by category

There's also a pile of compatibility redirects mirroring MyPayIndia.com's own URLs (e.g., /account/transfers/new > /account/transfer), so you can take a mypayindia.com link, swap the `.com` for `.sbs`, and get the PWA experience. The few things the PWA doesn't do bounce you back to MyPayIndia.com

I have no idea what they mean inside Twitter, but **i** means both internal and information, **i/flow** means internal flow and control

Read [app.tsx](src/app.tsx) for a full map

# License
[MIT](LICENSE)