# [MyPWAIndia](https://mypayindia.sbs)
The React MyPayIndia responsive web app is [the official](https://mypayindia.com/app) albeit alternative client for using [MyPayIndia](https://mypayindia.com). 

> [!WARNING]
This **is not** the source code for MyPayIndia, the website.

## Why?
At the start of May, this remake was born. The original PWA was becoming quite difficult to maintain as the monolithic-ness of it was becoming quite large, and I feared that, by splitting the files up I would've certainly broke something. So, I created this. The second incarnation of MyPWAIndia, in React, began at the very end of April, but was spearheaded around May 5th to 7th.

MyPWAIndia (usually) achieves quad-100 scores on Lighthouse, works on anything with a modern JavaScript engine, and uses near-to-naught RAM. For, what it does, I guess...? It is hosted entirely on Cloudflare Workers (one Worker serves both the frontend and a backend proxy)

## About this repo
This repo is not intended for self-hosting or contributing; it is meant to just show how the app works. Please do not create pull requests, they will not be merged.

You are, however, free to fork it and do absolutely anything you want with the code, and redistribute that code... provided you abide by the MIT license. You also must affirm your fork is... a fork and **unaffiliated** with MyPayIndia or MyPWAIndia and **you may not** use any official branding.

### Tree
```
src/
├─ app.tsx          every route in one file
├─ main.tsx         entry point
├─ sw.ts            service worker
├─ pages/           account, information, iotm, pwa, scambait, settings, transfer
├─ flow/            the modals (login, logout, wizard, link claim, transaction)
│  └─ pages/        full pages that are still "flow": links, sessions, toys,
│                   onboarding, subscriptions, connection, theme/settings apply
├─ components/      shell, ui, account, cli, lock, data
├─ context/         auth, settings, toasts, global data, the data cache
├─ hooks/           api calls, cached queries, page titles, refresh timers
├─ api/             one module per API surface, all going through client.ts
├─ worker/          the Cloudflare Worker: bastion proxy, news, button subscribe
├─ styles/          one stylesheet per area, stitched together by index.css
└─ data/            world countries & centroids for the globe
```

## The bastion
The bastion is the proxy that lets MyPWAIndia talk to MyPayIndia (named after the [Bruckell Bastion](https://beamng.fandom.com/wiki/Bruckell_Bastion)). It used to be its own Cloudflare Worker at [bastion.mypayindia.sbs](https://bastion.mypayindia.sbs), but it's now folded into the same Worker that serves this site, reachable under **/i/api**. (the standalone one stays up for old app versions and staging)

Besides proxying data, it runs the session layer and handles [the button](https://mypayindia.sbs/iotm/button), proxying its clicks.

Everything the Worker answers for sits under `/i/`, and anything it doesn't recognise falls through to the static assets :

- **/i/api**, **/i/api/pwa**, **/i/accountservices**, **/i/iotm**, **/i/staging** - proxied to the bastion with the `/i` stripped
- **/i/api/buttonac/** - button autoclicker subscriptions
- **/i/pwa/meta/news** - fetches MyPayIndia's news feed, decodes it and rewrites its links so they resolve, which is what [/i/news](https://mypayindia.sbs/i/news) renders

**Sessions live in two places:** a cookie on the bastion side and a session token on the frontend. Deleting the cookie won't log you out (the app still remembers you via the token), so to clear both, use [/i/flow/logout](https://mypayindia.sbs/i/flow/logout).

## Bundling & loading
The app is built with Vite. The output is deliberately **unminified** (no sourcemaps either)

### Bundling
The entry point is `/i/scripts/mypwaindia_index-[hash].js` and everything else is split into named chunks (`/i/scripts/mpi_[name]-[hash].js`). Chunking is done artisanally in [vite.config.js](vite.config.js) via `manualChunks`, matching on file paths:

- Pages are grouped by feature: `flow` (onboarding), `transfers`, `history` (history/statements/old transactions), `links`, `social` (leaderboard/team), `teammap`, `settings`, `iotm` & `iotm_button`, `cli` (MyCLiIndia), `tools` (MyPWAToysIndia), `client` (dashboard/account), `scambait`, `subs`, `info` and `misc`
- `node_modules` gets its own chunk. The globe.gl stack is quarantined into `globe`, while its shared three.js runtime lives in `node/mpi_three`; both stay lazy
- Context providers live in `bastion`, the status components in `stability`
- Anything that doesn't match a rule (news, sessions, the flow modals) gets an automatic chunk named after its module

### Loading
Every page in [app.tsx](src/app.tsx) is a `React.lazy()` import, and `modulePreload` is off, so a chunk is only fetched the first time you navigate to a route inside it. If that fails, its caught by an error boundary that offers a reload

While the entry script loads, you see the splash screen, which is inlined straight into [index.html](index.html) with just CSS. A tiny inline script runs before it to read your saved theme out of local storage and paint the background & theme-color to match, so there's no flash of the wrong colour. Once React initializes, the splash fades out and the app fades in. Load time is also logged to the console

### Service worker
The PWA side uses Workbox ([sw.ts](src/sw.ts) via vite-plugin-pwa's `injectManifest`):

- Everything (JS, CSS, HTML, fonts, images) is precached on install, **except** the globe chunk
- Runtime requests for pages, scripts and styles are network-first with a 4 second timeout, then fall back to cache
- If a navigation fails entirely, the precached `index.html` is served, so the app still boots offline
- Updates use a prompt & the new worker waits until you confirm rather than automatic

### Side builder: a single index.html 
`npm run minify` runs a second config ([vite.config.minify.js](vite.config.minify.js)) that inlines the entire app (scripts, styles, assets) into one `index.html` in `dist-minify/`, minified with esbuild and with the PWA disabled. That's just an experiment... please don't ever use that

## "Scambait" mode
Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app - but to their dismay, that geriatric geezer on the other end is using a mysterious online bank: MyPayIndia.

The mode hides things a scammer may find suspicious (the whole Meta group in the sidebar, so the leaderboard and team, plus transfers, payment links, subscriptions, IOTM and MyCLiIndia) and exposes fabricated pages containing credit card information and a bank statement history, and changes INR to Dollars ($).

**Learn more & activate: https://mypayindia.sbs/settings/scambait**

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
- **/account/history/simple** - a lighter, cardless history for small screens
- **/subscriptions** - manage subscriptions

(everything above except /dash sits behind an auth guard: signed out, you get a toast and a bounce to the login flow, which remembers where you were going and returns you there after signing in)

### Payment links
- **/account/links** - links home, list & create & revoke
- **/i/flow/links/interstitial/:token** - claim/inspect a link by token

(**/links**, **/links/claim** and **/links/claim/:token** still work as compatibility redirects)

### Internal/information (hence the /i)
- **/i/leaderboard** - top 10 richest accounts
- **/i/team** - list of team members
- **/i/team/globe** - team members on a 3D globe (the 4.9MB chunk)
- **/i/news** - MyPayIndia's news feed
- **/i/news/:slug** - a single news item
- **/i/release_notes** - app release notes
- **/i/acknowledgements** - thanks and acknowledgements
- **/i/how_pwa** - how to install the app on whatever you're holding
- **/i/onboarding** - onboarding disclaimer screen
- **/i/connecttest** - connection checker
- **/i/theme** - apply a theme from a shared link
- **/i/sharedsett** - apply settings from a shared link
- **/i/debug** - ...debug page
- **/i/sessions** - view and manage active login sessions

### Internal flow (hence the /i/flow)
- **/i/flow/login** - log in
- **/i/flow/logout** - log out
- **/i/flow/onboarding/wizard** - setup wizard after onboarder
- **/i/flow/transaction/:id** - transaction detail viewer
- **/i/flow/links/interstitial/:token** - claim/inspect a payment link

`/i/flow/*` is for server driven flows. There are no regular pages under that prefix. Every path under `/i/flow/` is passed to the flow API

#### Flow composite
When you visit `/i/flow/{task}`, [flow_conductor.tsx](src/flow/flow_conductor.tsx) immediately opens a modal and takes the complete path after `/i/flow/` and sends it as `flow_name` to:

```
GET /api/pwa/flow/task?flow_name={task}
```

That means `/i/flow/login` requests `login`, while `/i/flow/transaction/6767` requests `transaction/6767`. Path matching and parameter extraction belong to the server task module

The API returns a flow token, presentation instructions and one or more typed subtasks. The conductor keeps the original modal mounted and populates it with the subtask when ready. A response looks roughly like this:

```json
{
  "success": true,
  "data": {
    "flow_token": "transaction.6767...",
    "status": "success",
    "presentation": {
      "kind": "modal",
      "close_behavior": "return_or_dash"
    },
    "subtasks": [
      {
        "subtask_id": "TransactionDetail",
        "type": "transaction_detail",
        "transaction_detail": {}
      }
    ]
  }
}
```

Actions with `link_type: "task"` continue the flow by posting the flow token and subtask input to the same endpoint. Actions with `link_type: "abort"` do the same before closing: the modal body clears, the abort input is acknowledged by the server, and the client exits the flow after the request settles

In a nutshell, this idea is copied from Twitter, like https://twitter.com/i/flow/add_email calls https://api.twitter.com/1.1/onboarding/task.json?flow_name=add_email

### Investment Opportunities™
- **/iotm** - home
- **/iotm/button** - the button, reinterpreted, with more calculations and an onboard autoclicker

(I couldn't port any other games, so they just link externally)

### Scambait
- **/dash/cards** - 3 fake randomly generated credit cards: everyday, savings & business, complete with CVV, numbers, routing and SWIFT
- **/dash/statements** - 450 generated statements with various American businesses and random people (in place of /account/history). They're seeded off the account id, so the same account always gets the same history, walking backwards from this month until it has enough (about a year and a half)
- **/settings/scambait** - configure scambait mode

### Control
- **/settings** - app settings (takes you to /settings/appearance)
- **/settings/:category** - settings by category
- **/settings/sessions** - redirects to /i/sessions

The categories list ([categories.ts](src/pages/settings/categories.ts)) also carries entries that just point elsewhere (sessions, logout, toys, account management on the main site), and some hide themselves in scambait mode

There's also a pile of compatibility redirects mirroring MyPayIndia.com's own URLs (e.g., /account/transfers/new > /account/transfer), so you can take a mypayindia.com link, swap the `.com` for `.sbs`, and get the PWA experience. The few things the PWA doesn't do bounce you back to MyPayIndia.com

I have no idea what they mean inside Twitter, but **i** means both internal and information, **i/flow** means internal flow and control

Read [app.tsx](src/app.tsx) for a full map

# Run yourself
If you have Bun:

```
git clone https://github.com/exerinity/mypwaindia.git && cd mypwaindia && bun i && bun run dev
```

or npm:

```
git clone https://github.com/exerinity/mypwaindia.git && cd mypwaindia && npm i && npm run dev
```

And to build:

```
bun run build # or npm
```

Run that:
```
bun run preview # or npm
```
## Building minified
```
bun run minify
```

This spits out a humongous index.html with absolutely everything in `dist-minify/`. Again, I really recommend you *don't* use this unless you're in a warzone and need an ultimately portable version of the app, or have a grudge against lazy loading scripts...

### Run that minified file
```
bun run minirun
```

### Build and preview in the same go
```
bun run stage
```

## Running the backend:
```
wrangler dev
```

*See all scripts in [package.json](package.json)*
# License
[MIT](LICENSE)
