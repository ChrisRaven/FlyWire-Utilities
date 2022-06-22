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
// @updateURL    https://raw.githubusercontent.com/ChrisRaven/FlyWire-Utilities/main/utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/FlyWire-Utilities/main/utilities.user.js
// @homepageURL  https://github.com/ChrisRaven/FlyWire-Utilities
// ==/UserScript==

const DEV = false;


if (unsafeWindow.dockIsReady) return main()

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
    let coords = document
    .querySelector('.neuroglancer-mouse-position-widget')
      .innerHTML
      .split(',')
      .map(el => el.trim().split(' ')[1])

    let id = document.querySelector('div[data-type="segmentation_with_graph"] .neuroglancer-layer-item-value').textContent
    id = id.split('+')[0]
    // we save both leaves and roots. Leaves for permanent points of reference and roots for comparing with roots in the sidebar list
    leaves[id] = coords
    Dock.getRootId(id, rootId => {
      roots[rootId] = coords
    })
  })

  document.getElementsByClassName('neuroglancer-layer-side-panel')[0].addEventListener('contextmenu', e => {
    if (!e.target.classList.contains('segment-button')) return

    let segId = e.target.dataset.segId
    let coords = roots[segId]
    // if we don't have coords for a given rootId, we check every leave to see, if any of them didn't change their rootId in the meantime
    if (!coords) {
      console.log('roots we already have', roots)
      for (const [leafId, coords] of Object.entries(leaves)) {
        Dock.getRootId(leafId, rootId => {console.log('in getRootId', segId, rootId)
          if (rootId === segId) {
            roots[rootId] = coords
            gotoSegment(roots[segId])
          }
        })
      }
    }
    else {
      gotoSegment(coords)
    }
  })
}


let roots = {}
let leaves = {}


function gotoSegment(coords) {
  coords = [coords[0] * 4, coords[1] * 4, coords[2] * 40]
  viewer.layerSpecification.setSpatialCoordinates(coords)
}


function generateHtml() {
  // console.log('utilities')
}