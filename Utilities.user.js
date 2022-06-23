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
    events: {
      '.neuroglancer-rendered-data-panel:first-of-type': {
        dblclick: {
          handler: dblClickHandler,
          singleNode: true
        }
      },
      '.neuroglancer-layer-side-panel': {
        contextmenu: (e) => contextmenuHandler(e)
      },
      '#kk-utilities-jump-to-start': {
        click: jumpToStart
      },
      document: {
        fetch: e => fetchHandler(e)
      }
    }
  })

  loadFromLS()
}


let roots = {}
let leaves = {}
let start


function loadFromLS() {
  let data = Dock.ls.get('utilities', true)

  if (data) {
    ({roots, leaves, start} = data)
  }
}


function saveToLS() {
  Dock.ls.set('utilities', {roots: roots, leaves: leaves, start: start}, true)
}

function clearLists() {
  roots = {}
  leaves = {}
  Dock.ls.remove('utilities')
}


function dblClickHandler() {
  let mouseCoords = Dock.getCurrentMouseCoords()
  let id = Dock.getHighlightedSupervoxelId()

  // we save both leaves and roots. Leaves for permanent points of reference and roots for comparing with roots in the sidebar list
  leaves[id] = mouseCoords
  Dock.getRootId(id, rootId => {
    roots[rootId] = mouseCoords
    saveToLS()
  })
}


function contextmenuHandler(e) {
  if (!e.target.classList.contains('segment-button')) return

  let segId = e.target.dataset.segId
  let coords = roots[segId]
  // if we don't have coords for a given rootId, we check every leave to see, if any of them didn't change their rootId in the meantime
  if (!coords) {
    for (const [leafId, coords] of Object.entries(leaves)) {
      Dock.getRootId(leafId, rootId => {
        if (rootId === segId) {
          roots[rootId] = coords
          saveToLS()
          Dock.jumpToCoords(coords)
        }
      })
    }
  }
  else {
    Dock.jumpToCoords(coords)
  }
}

function fetchHandler(e) {
  let response = e.detail.response
  let body = e.detail && e.detail.params ? e.detail.params.body : null
  let url = e.detail.url
  if (response.code && response.code === 400) return console.error('Utilities: failed split')

  if (url.includes('split?')) {
    let voxelSize = Dock.getVoxelSize()

    body = JSON.parse(body)
    let point = body.sources[0]
    let leafId = point[0]
    point.shift()
    let coords = Dock.divideVec3(point, voxelSize)
    leaves[leafId] = coords

    point = body.sinks[0]
    leafId = point[0]
    point.shift()
    coords = Dock.divideVec3(point, voxelSize)
    leaves[leafId] = coords

    saveToLS()
  }
  else if (url.includes('proofreading_drive?')) {
    clearLists()
    let coords = Dock.getCurrentCoords()
    let leafId = response.supervoxel_id
    leaves[leafId] = coords
    start = coords

    saveToLS()
  }
}


function jumpToStart() {
  if (!start) return

  Dock.jumpToCoords(start)
}


function generateHtml() {
  return '<button id="kk-utilities-jump-to-start">Jump to start</button>'
}