// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.5
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


// addon prefix - used in all nodes, that have to have an ID
let ap = 'kk-utilities-'

function main() {
  loadFromLS()
  let optionsDialog = Dock.dialog(optionsDialogSettings())

  let dock = new Dock()

  dock.addAddon({
    name: 'Utilities',
    id: ap,
    html: generateHtml(),
    css: /*css*/`#${ap} { text-align: center; }`,
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
      [`#${ap}jump-to-start`]: {
        click: jumpToStart
      },
      [`.${ap}res`]: {
        click: e => changeResolution(e.target.dataset.resolution)
      },
      [`#${ap}add-annotation-at-start`]: {
        click: addAnnotationAtStartChanged
      },
      [`#${ap}remove-annotations-at-start`]: {
        click: removeAnnotationsAtStartChanged
      },
      [`#${ap}options`]: {
        click: () => optionsDialog.show()
      },
      [`#${ap}options-dialog`]: {
        click: (e) => optionsDialogToggleFeatures(e)
      },
      '.neuroglancer-viewer-top-row': {
        click: removeAnnotationsAtStart
      }
    }
  })

  document.addEventListener('fetch', e => fetchHandler(e))
  document.addEventListener('contextmenu', e => hideAllButHandler(e))
  initFields()

}


const optPrefix = ap + 'options-toggle-'

const defaultOptions = {
  [optPrefix + 'jump-to-start']: {
    selector: `#${ap}jump-to-start`,
    text: 'Jump to start',
    state: true
  },
  [optPrefix + 'add-point-at-start']: {
    selector: `#${ap}add-annotation-at-start-wrapper`,
    text: 'Add point at start',
    state: true
  },
  [optPrefix + 'remove-points-at-start']: {
    selector: `#${ap}remove-annotations-at-start-wrapper`,
    text: 'Remove points at start',
    state: true
  },
  [optPrefix + 'resolution-buttons']: {
    selector: `.${ap}res`,
    text: 'Resolution buttons',
    state: true
  }
}

let saveable = {
  roots: {},
  leaves: {},
  startCoords: null,
  addAnnotationAtStartState: false,
  removeAnnotationsAtStartState: false,
  startAnnotationId: 0,
  visibleFeatures: [],
  options: {}
}


function loadFromLS() {
  let data = Dock.ls.get('utilities', true)

  if (data) {
    saveable = data
  }

  if (saveable.options && Object.entries(saveable.options).length === 0 || !saveable.options) {
    saveable.options = defaultOptions
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
    saveSegmentsAfterSplit(body)

    saveToLS()
  }
  else if (url.includes('proofreading_drive?')) {
    saveSegmentAfterClaim(response)
    removeAnnotationsAtStart()
    addAnnotationAtStart()

    saveToLS()
  }
}


function saveSegmentAfterClaim(response) {
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
}


function saveSegmentsAfterSplit(body) {
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
  if (!document.getElementById(`${ap}add-annotation-at-start`).checked) return
  
  // remove previous annotation if exists
  if (saveable.startAnnotationId) {
    Dock.annotations.remove(saveable.startAnnotationId)
  }

  let refId = Dock.annotations.add(saveable.startCoords, 0, 'START')

  saveable.startAnnotationId = refId
  saveToLS()
}


function removeLayer(index) {
  let manager = viewer.layerManager
  let layer = manager.managedLayers[index]

  layer.layerChanged.remove(manager.layersChanged.dispatch)
  layer.readyStateChanged.remove(manager.readyStateChanged.dispatch)
  layer.specificationChanged.remove(manager.specificationChanged.dispatch)
  layer.dispose()
  manager.managedLayers.splice(index, 1)
  manager.layerSet.delete(layer)
  manager.layersChanged.dispatch()
}


function removeAnnotationsAtStart() {
  if (!document.getElementById(`${ap}remove-annotations-at-start`).checked) return

  let indexes = []  
  // with this first loop we only collect indexes, because removing elements with given indexes
  // inside the loop, will shorten the array, over which the loop iterates,
  // and we wouldn't be able to iterate over the whole array
  viewer.layerManager.managedLayers.forEach((layer, index) => {
    if (layer.initialSpecification.type === 'annotation') {
      indexes.push(index)
    }
  })
  // we are reversing the indexes to start removing layers from the last one
  // otherwise, each removing will shift all the next layers to the left
  // and the indexes will no longer match
  indexes.reverse().forEach(index => removeLayer(index))
}


function initFields() {
  document.getElementById(`${ap}add-annotation-at-start`).checked = saveable.addAnnotationAtStartState
  document.getElementById(`${ap}remove-annotations-at-start`).checked = saveable.removeAnnotationsAtStartState
  initOptions()
}

function initOptions() {
  if (!saveable.options) return

  for (const checkboxId of Object.keys(saveable.options)) {
    optionsDialogToggleFeature(checkboxId)
  }
}


function addAnnotationAtStartChanged() {
  saveable.addAnnotationAtStartState = document.getElementById(`${ap}add-annotation-at-start`).checked
  saveToLS()
}

function removeAnnotationsAtStartChanged() {
  saveable.removeAnnotationsAtStartState = document.getElementById(`${ap}remove-annotations-at-start`).checked
  saveToLS()
}


function generateOptionsHtml() {
  let html = ''
  for (const [checkboxId, option] of Object.entries(saveable.options)) {
    html += `<label><input type="checkbox" id="${checkboxId}" ${option.state ? 'checked' : ''}>${option.text}</label><br />`
  }

  return html
}


function optionsDialogSettings() {
  let prefix = ap + 'options-'
  let dialogId = ap + 'options-dialog'

  return {
    html: generateOptionsHtml(),
    css: /*css*/`
      #${dialogId} label {
        font-size: 13px;
        padding-bottom: 5px;
        display: inline-block;
      }

      #${dialogId} input[type="checkbox"] {
        margin-right: 15px;
      }
    `,
    id: dialogId,
    okCallback: () => {},
    okLabel: 'Close'
  }
}


function optionsDialogToggleFeature(checkboxId) {
  let checkbox = document.getElementById(checkboxId)
  let featureSelector = saveable.options[checkboxId].selector
  let feature = document.querySelectorAll(featureSelector)

  if (!feature || !checkbox) return

  let state = checkbox.checked
  feature.forEach(el => el.style.display = state ? el.dataset.display : 'none')

  return state
}


function optionsDialogToggleFeatures(e) {
  let dialogId = ap + 'options-dialog'
  if (e.target.type !== 'checkbox' && e.target.tagName !== 'LABEL') return
  if (e.target.parentNode.parentNode.id !== dialogId && e.target.parentNode.parentNode.parentNode.id !== dialogId) return

  let prefix = ap + 'options-toggle-'
  let checkboxId
  let featureSelector
  if (e.target.type === 'checkbox') {
    checkboxId = e.target.id
  }
  else if (e.target.tagName === 'LABEL') {
    checkboxId = e.target.firstChild.id
  }
  else return

  let state = optionsDialogToggleFeature(checkboxId)
  saveable.options[checkboxId].state = state
  saveToLS()
}



function generateHtml() {
  return /*html*/`
    <button id="kk-utilities-jump-to-start" data-display="inline-block" title="Jump to point, at which you've started this cell">Jump to start</button><br />
    <label data-display="inline-block" id="kk-utilities-add-annotation-at-start-wrapper" title="Adds annotation at the starting point of the cell">
      <input type="checkbox" id="kk-utilities-add-annotation-at-start">
      Add point at start
    </label><br>
    <label data-display="inline-block" id="kk-utilities-remove-annotations-at-start-wrapper" title="Removes all annotations, when a new cell has been claimed">
      <input type="checkbox" id="kk-utilities-remove-annotations-at-start">
      Remove points at start
    </label><br>
    <button class="kk-utilities-res" data-resolution="1" data-display="inline-block" title="Changes slides resolution to 1px">1px</button>
    <button class="kk-utilities-res" data-resolution="5" data-display="inline-block" title="Changes slides resolution to 5px">5px</button><br>
    <button id="kk-utilities-options" title="Options to show or hide elements">Options</button>
  `
}
