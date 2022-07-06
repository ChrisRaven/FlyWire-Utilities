// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.4
// @description  Various functionalities for FlyWire
// @author       Krzysztof Kruk
// @match        https://ngl.flywire.ai/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      services.itanna.io
// @updateURL    https://raw.githubusercontent.com/ChrisRaven/FlyWire-Utilities/main/Utilities.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/FlyWire-Utilities/main/Utilities.user.js
// @homepageURL  https://github.com/ChrisRaven/FlyWire-Utilities
// ==/UserScript==

if (!document.getElementById('dock-script')) {
  let script = document.createElement('script')
  script.id = 'dock-script'
  script.src = typeof DEV !== 'undefined' ? 'http://127.0.0.1:5501/FlyWire-Dock/Dock.js' : 'https://chrisraven.github.io/FlyWire-Dock/Dock.js'
  document.head.appendChild(script)
}

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
    css: '#utilities { text-align: center; }',
    events: {
      '.neuroglancer-rendered-data-panel:first-of-type': {
        dblclick: {
          handler: dblClickHandler,
          singleNode: true
        },
        contextmenu: (e) => deleteSplitpoint(e)
      },
      '.neuroglancer-layer-side-panel': {
        contextmenu: (e) => contextmenuHandler(e)
      },
      '#kk-utilities-jump-to-start': {
        click: jumpToStart
      },
      '.kk-utilities-res': {
        click: e => changeResolution(e.target.dataset.resolution)
      },
      '#kk-utilities-add-annotation-at-start': {
        click: addAnnotationAtStartChanged
      }
    }
  })

  document.addEventListener('fetch', e => fetchHandler(e))
  document.addEventListener('contextmenu', e => hideAllButHandler(e))
  loadFromLS()
  initStateForAddAnnotationAtStart()
}


let saveable = {
  roots: {},
  leaves: {},
  startCoords: null,
  addAnnotationAtStartState: false,
  startAnnotationId: 0
}


function loadFromLS() {
  let data = Dock.ls.get('utilities', true)

  if (data) {
    saveable = data
  }
}


function saveToLS() {
  Dock.ls.set('utilities', saveable, true)
}


function clearLists() {
  saveable.roots = {}
  saveable.leaves = {}
  saveToLS()
}


function dblClickHandler() {
  let mouseCoords = Dock.getCurrentMouseCoords()
  let id = Dock.getHighlightedSupervoxelId()

  // we save both leaves and roots. Leaves for permanent points of reference and roots for comparing with roots in the sidebar list
  saveable.leaves[id] = mouseCoords
  Dock.getRootId(id, rootId => {
    saveable.roots[rootId] = mouseCoords
    saveToLS()
  })
}


function contextmenuHandler(e) {
  if (!e.target.classList.contains('segment-button')) return

  let segId = e.target.dataset.segId
  let coords = saveable.roots[segId]
  // if we don't have coords for a given rootId, we check every leave to see, if any of them didn't change their rootId in the meantime
  if (!coords) {
    for (const [leafId, coords] of Object.entries(leaves)) {
      Dock.getRootId(leafId, rootId => {
        if (rootId === segId) {
          saveable.roots[rootId] = coords
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
  if (response.code && response.code === 400) return console.error('Utilities: failed operation')

  if (url.includes('split?')) {
    let voxelSize = Dock.getVoxelSize()

    body = JSON.parse(body)
    let point = body.sources[0]
    let leafId = point[0]
    point.shift()
    let coords = Dock.divideVec3(point, voxelSize)
    saveable.leaves[leafId] = coords

    point = body.sinks[0]
    leafId = point[0]
    point.shift()
    coords = Dock.divideVec3(point, voxelSize)
    saveable.leaves[leafId] = coords
    saveToLS()
  }
  else if (url.includes('proofreading_drive?')) {
    clearLists()
    let coords = response.ngl_coordinates

    // source: webpack:///src/state.ts (FlyWire)
    const coordsSpaced = coords.slice(1, -1).split(" ")
    const xyz = []
    for (const coord of coordsSpaced) {
      if (coord === '') continue
      xyz.push(parseInt(coord))
    }
    coords = xyz

    let leafId = response.supervoxel_id
    saveable.leaves[leafId] = coords
    saveable.startCoords = coords

    addAnnotationAtStart()

    saveToLS()
  }
}



function hideAllButHandler(e) {
  let target = e.target

  if (!target.classList.contains('segment-checkbox')) return

  document.querySelectorAll('.segment-checkbox').forEach(el => {
    if (el.checked && el !== target && el.title !== 'Uncheck to hide all segments') {
      el.click()
    }
  })

  if (!target.checked) {
    target.click()
  }
}


function jumpToStart() {
  if (!saveable.startCoords) return

  Dock.jumpToCoords(saveable.startCoords)
}


function changeResolution(res) {
  viewer.layerManager.managedLayers.forEach(layer => {
    if (!layer || !layer.layer_ || !layer.layer_.sliceViewRenderScaleTarget) return

    layer.layer_.sliceViewRenderScaleTarget.restoreState(res)
  })
}


function deleteSplitpoint(e) {
  if (!e.ctrlKey) return

  let id = Dock.getHighlightedSupervoxelId()
  let graphLayer = viewer.selectedLayer.layer.layer.graphOperationLayerState.value
  let refId = null
  let source = null

  if (!graphLayer) return

  [...graphLayer.annotationLayerStateA.value.source].forEach(el => {
    if (el.description === id) {
      refId = el.id
      source = 'A'
      return false
    }
  })
  
  if (!refId) {
    [...graphLayer.annotationLayerStateB.value.source].forEach(el => {
      if (el.description === id) {
        refId = el.id
        source = 'B'
        return false
      }
    })
  }

  if (!refId) return

  let annotationLayer = source === 'A' ? graphLayer.annotationLayerStateA : graphLayer.annotationLayerStateB
  let ref = annotationLayer.value.source.getReference(refId)

  if (!ref) return

  annotationLayer.value.source.delete(ref)
}


function addAnnotationAtStart() {
  if (!document.getElementById('kk-utilities-add-annotation-at-start').checked) return
  
  // remove previous annotation if exists
  if (saveable.startAnnotationId) {
    Dock.annotations.remove(saveable.startAnnotationId)
  }

  let refId = Dock.annotations.add(saveable.startCoords, 0, 'START')

  saveable.startAnnotationId = refId
  saveToLS()
}


function initStateForAddAnnotationAtStart() {
  document.getElementById('kk-utilities-add-annotation-at-start').checked = saveable.addAnnotationAtStartState
}


function addAnnotationAtStartChanged() {
  saveable.addAnnotationAtStartState = document.getElementById('kk-utilities-add-annotation-at-start').checked
  saveToLS()
}


function generateHtml() {
  return /*html*/`
    <button id="kk-utilities-jump-to-start">Jump to start</button><br />
    <label>
      <input type="checkbox" id="kk-utilities-add-annotation-at-start">
      Add point at start
    </label><br>
    <button class="kk-utilities-res" data-resolution="1">1px</button>
    <button class="kk-utilities-res" data-resolution="5">5px</button>
  `
}
