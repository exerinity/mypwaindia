# [MyPWAIndia](https://mypayindia.sbs)
The React MyPayIndia responsive web app is an alternative client for using [MyPayIndia](https://mypayindia.com). The previous, vanilla JS PWA can be found here: [source](https://github.com/MyPayIndiaDevs/pwa) - [run](https://legacy.app.mypayindia.com/)

MyPayIndia is a project of about half-a-dozen people or more; MyPWAIndia is entirely maintained by [me](https://exerinity.com).

> [!WARNING]
This **is not** the source code for MyPayIndia. This is the source code for an app that uses its API wearing the same name.

## Genesis: why?
At the start of May, this remake was born. The original PWA was becoming quite difficult to maintain as the monolithic-ness of it was becoming quite large, and I feared that, by splitting the files up I would've certainly broke something. So, I created this. The second incarnation of MyPWAIndia, in React, began at the very end of April, but was spearheaded around May 5th to 7th.

## About this repo
This repo is not intended for self-hosting or contributing; it is meant to just show how the app works. Please do not create pull requests, they will not be merged.

## The builder: why is it so aggressive?
~~Corporations. This is meant to parody corporations. And corporations put as many walls up as possible with their web apps.~~

It's not anymore. I lobotomized it, so its mostly just one big JavaScript file you can read. I realized that, nobody gives a shit about that "vibe" of being locked-down and corporate, and all I was really doing is upsetting actual users.

## "Scambait" mode
Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app - but to their dismay, that geriatric geezer on the other end is using a mysterious online bank: MyPayIndia.

**Learn more: https://mypayindia.sbs/i/flow/scambaitmode**

## Route map
The routes throughout this app are heavily inspired by the Twitter PWA, if not directly lifted from it:

### Public
- **/dash** - home
- **/account** - account information and masthead
- **/account/restrictions** - account restrictions
- **/account/transfer** - transfer funds screen
- **/account/history** - transaction history

### Payment links
- **/links** - links home, list & create & revoke
- **/links/claim** - claim/inspect a link
- **/links/claim/:token** - claim a link by token

### Internal
- **/i/leaderboard** - top 10 richest accounts
- **/i/team** - list of team members
- **/i/release_notes** - app release notes
- **/i/acknowledgements** - thanks and acknowledgements
- **/i/transaction/:id** - transaction detail viewer

### Internal flow
- **/i/flow/login** - log in
- **/i/flow/logout** - log out
- **/i/flow/onboarding** - onboarding disclaimer screen
- **/i/flow/button** - IOTM button
- **/i/flow/connection** - stupid connection checker
- **/i/flow/mci** - MyCLiIndia, a fake Unix-like command line
- **/i/flow/mci/focus** - MyCLiIndia, fullscreen

### Scambait
- **/dash/cards** - 3 fake randomly generated credit cards: everyday, savings & business, complete with CVV and numbers
- **/dash/statements** - 1000 randomly generated fake statements with various American businesses and random people (in place of /account/history)

### Control
- **/settings** - app settings
- **/settings/:category** - settings by category

# License
[MIT](LICENSE)