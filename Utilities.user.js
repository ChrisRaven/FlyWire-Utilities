// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.1
// @description  Various functions for FlyWire
// @author       Krzysztof Kruk
// @match        https://ngl.flywire.ai/*
// @updateURL    https://raw.githubusercontent.com/ChrisRaven/Flywire-Utilities/main/utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/Flywire-Utilities/main/utilities.user.js
// @homepageURL  https://github.com/ChrisRaven/Flywire-Utilities
// ==/UserScript==

const DEV = false;


if (globalThis.dockIsReady) return main()

let script = document.createElement('script')
script.src = DEV ? 'http://127.0.0.1:5501/FlyWire-Dock/Dock.js' : 'https://chrisraven.github.io/FlyWire-Dock/Dock.js'
document.head.appendChild(script)

let wait = setInterval(() => {
  if (globalThis.dockIsReady) {
    clearInterval(wait)
    main()
  }
}, 100)


function main() {
  let dock = new Dock()

  dock.addAddon({
    name: 'Utilities',
    id: 'utilities',
    html: generateHtml(),
    css: '',
    events: ''
  })
}


function generateHtml() {
  console.log('utilities')
}