// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.1
// @description  Various functions for FlyWire
// @author       Krzysztof Kruk
// @match        https://ngl.flywire.ai/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      services.itanna.io
// @updateURL    https://raw.githubusercontent.com/ChrisRaven/Flywire-Utilities/main/utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/Flywire-Utilities/main/utilities.user.js
// @homepageURL  https://github.com/ChrisRaven/Flywire-Utilities
// ==/UserScript==

const DEV = false;


if (unsaveWindow.dockIsReady) return main()

let script = document.createElement('script')
script.src = DEV ? 'http://127.0.0.1:5501/FlyWire-Dock/Dock.js' : 'https://chrisraven.github.io/FlyWire-Dock/Dock.js'
document.head.appendChild(script)

let wait = setInterval(() => {
  if (unsafeWindow.dockIsReady) {
    unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest
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

  document.getElementsByClassName('neuroglancer-rendered-data-panel')[0].addEventListener('dblclick', (e) => {
    let currentCoords = document
                        .querySelector('.neuroglancer-position-widget-input').value
                        .split(',')
                        .map(el => el.trim())
    console.log(currentCoords)
  })
}


function generateHtml() {
  console.log('utilities')
}