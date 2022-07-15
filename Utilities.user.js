// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.8
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


function fix_segmentColors_2022_07_15() {
  if (Dock.ls.get('fix_segmentColors_2022_07_15') === 'fixed') return

  Object.entries(localStorage).forEach(entry => {
    if (entry[0].includes('neuroglancerSaveState_v2-')) {
      let e = JSON.parse(entry[1])
      if (e.state && e.state.layers) {
        e.state.layers.forEach(layer => {
          if (layer.type === 'segmentation_with_graph' && layer.segmentColors) {
            layer.segmentColors = {}
            localStorage.setItem(entry[0], JSON.stringify(e))
          }
        })
      }
    }
  })
  Dock.ls.set('fix_segmentColors_2022_07_15', 'fixed')
}

function main() {
  loadFromLS()
  let optionsDialog = Dock.dialog(optionsDialogSettings())

  let dock = new Dock()

  dock.addAddon({
    name: 'Utilities',
    id: ap,
    html: generateHtml(),
    css: /*css*/`
      #${ap} {
        text-align: center;
      }

      #${ap}jump-to-start,
      #${ap}add-annotation-at-start-wrapper,
      #${ap}remove-annotations-at-start-wrapper,
      #${ap}res-wrapper {
        display: block;
      }

      #${ap}jump-to-start {
        margin: auto;
      }
      `,
    events: {
      '.neuroglancer-rendered-data-panel:first-of-type': {
        dblclick: {
          handler: dblClickHandler,
          singleNode: true
        }
      },
      '.neuroglancer-rendered-data-panel': {
        contextmenu: (e) => {
          deleteAnnotationPoint(e)
          deleteSplitPoint(e)
        }
      },
      '.neuroglancer-layer-side-panel': {
        contextmenu: (e) => {
          jumpToSegment(e)
          openSegmentInNewTab(e)
        }
      },
      [`#${ap}jump-to-start`]: {
        click: jumpToStart
      },
      [`.${ap}res`]: {
        click: e => changeResolution(e)
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
      }
    }
  })

  document.addEventListener('fetch', e => fetchHandler(e))
  document.addEventListener('contextmenu', e => hideAllButHandler(e))
  initFields()

  loadStateForSingleSegment()

  if (typeof DEV !== 'undefined') {
    let button = document.createElement('button')
    button.textContent = 'Test'
    let top = document.getElementsByClassName('neuroglancer-viewer-top-row')[0]
    top.appendChild(button)
    top.addEventListener('click', e => testClickHandler(e))

    function testClickHandler(e) {}
  }


  fix_segmentColors_2022_07_15()
}


function loadStateForSingleSegment() {
  let url = new URL(unsafeWindow.location.href)
  if (!url.searchParams.has('kk_seg_id')) return

  let segId = url.searchParams.get('kk_seg_id')

  url.searchParams.delete('kk_seg_id')
  window.history.pushState('', '', url.href)

  viewer.selectedLayer.layer.layer.displayState.rootSegments.clear()
  viewer.selectedLayer.layer.layer.displayState.rootSegments.add(Dock.stringToUint64(segId))
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
    selector: `#${ap}res-wrapper`,
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
  options: {},
  currentResolutionButton: 1
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


function jumpToSegment(e) {
  if (!e.target.classList.contains('segment-button')) return

  let segId = e.target.dataset.segId
  let coords = saveable.roots[segId]
  // if we don't have coords for a given rootId, we check every leave to see, if any of them didn't change their rootId in the meantime
  if (!coords) {
    for (const [leafId, coords] of Object.entries(saveable.leaves)) {
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


function openSegmentInNewTab(e) {
  let button = e.target        // e.target === <button>
  if (!button.classList.contains('segment-copy-button')) {
    button = button.parentNode // e.target === <svg>
  }
  if (!button.classList.contains('segment-copy-button')) {
    button = button.parentNode // e.target === <path>
  }
  if (!button.classList.contains('segment-copy-button')) return

  let segId = button.previousElementSibling.dataset.segId
  let url = new URL(unsafeWindow.location.href)
  let randomString = Dock.getRandomHexString()
  let lsName = 'neuroglancerSaveState_v2-' + randomString
  localStorage.setItem(lsName, JSON.stringify(viewer.saver.pull()))
  url.searchParams.set('local_id', randomString)
  url.searchParams.append('kk_seg_id', segId)
  unsafeWindow.open(url.href, '_blank');
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
    deletePointsAtStart()
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


function changeResolution(e) {
  let res = e.target.dataset.resolution

  document.querySelectorAll('.kk-utilities-res').forEach(button => button.classList.remove('active'))
  e.target.classList.add('active')
  saveable.resolution = res
  saveToLS()

  viewer.layerManager.managedLayers.forEach(layer => {
    if (!layer || !layer.layer_ || !layer.layer_.sliceViewRenderScaleTarget) return

    layer.layer_.sliceViewRenderScaleTarget.restoreState(res)
  })
}


function deleteSplitPoint(e) {
  if (!e.ctrlKey) return

  let value
  let type

  if (!viewer.mouseState.pickedRenderLayer) {
    type = 'description'
    value = Dock.getHighlightedSupervoxelId()
  }

  if (!value) {
    type = 'id'
    value = viewer.mouseState.pickedAnnotationId
  }

  if (!value) return

  let point = Dock.annotations.getMulticutRef(type, value)
  if (!point) return

  point.source.delete(point.reference)
  point.reference.dispose()
}


function deleteAnnotationPoint(e) {
  if (!e.ctrlKey) return

  let mouseState = viewer.mouseState
  let annotationId = mouseState.pickedAnnotationId

  if (mouseState.active && annotationId) {
    Dock.annotations.remove(annotationId)
  }
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


function deletePointsAtStart() {
  if (!document.getElementById(`${ap}remove-annotations-at-start`).checked) return

  deleteAnnotations()
  deleteMulticutPoints()
  deletePath()
}


function deleteAnnotations() {
  let annotationLayers = Dock.layers.getByType('annotation')
  let annotationIndexes = annotationLayers.map(layer => layer.index)
  // we are reversing the indexes to start removing layers from the last one
  // otherwise, each removing will shift all the next layers to the left
  // and the indexes will no longer match
  annotationIndexes.reverse().forEach(index => Dock.layers.remove(index))
}


function deleteMulticutPoints() {
  let graphLayer = viewer.selectedLayer.layer.layer.graphOperationLayerState.value
  let sourceA = graphLayer.annotationLayerStateA.value.source
  let sourceB = graphLayer.annotationLayerStateB.value.source

  // source: src\neuroglancer\ui\graph_multicut.ts
  for (const annotation of sourceA) {
    const ref = sourceA.getReference(annotation.id);
    try {
      sourceA.delete(ref);
    } finally {
      ref.dispose();
    }
  }
  for (const annotation of sourceB) {
    const ref = sourceB.getReference(annotation.id);
    try {
      sourceB.delete(ref);
    } finally {
      ref.dispose();
    }
  }
}


function deletePath() {
  viewer.selectedLayer.layer_.layer_.pathFinderState.pathBetweenSupervoxels.clear()
}


function initFields() {
  document.getElementById(`${ap}add-annotation-at-start`).checked = saveable.addAnnotationAtStartState
  document.getElementById(`${ap}remove-annotations-at-start`).checked = saveable.removeAnnotationsAtStartState
  if (saveable.resolution) {
    let resButton = document.querySelector(`#kk-utilities-res-wrapper > [data-resolution="${saveable.resolution}"]`)
    resButton.classList.add('active')
  }
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
    <button id="kk-utilities-jump-to-start" data-display="block" title="Jump to point, at which you've started this cell">Jump to start</button>
    <label data-display="block" id="kk-utilities-add-annotation-at-start-wrapper" title="Adds annotation at the starting point of the cell">
      <input type="checkbox" id="kk-utilities-add-annotation-at-start">
      Add point at start
    </label>
    <label data-display="block" id="kk-utilities-remove-annotations-at-start-wrapper" title="Removes all annotations, when a new cell has been claimed">
      <input type="checkbox" id="kk-utilities-remove-annotations-at-start">
      Remove points at start
    </label>
    <div id="kk-utilities-res-wrapper" data-display="block">
      <button class="kk-utilities-res" data-resolution="1" title="Changes slides resolution to 1px">1px</button>
      <button class="kk-utilities-res" data-resolution="5" title="Changes slides resolution to 5px">5px</button>
    </div>
    <button id="kk-utilities-options" title="Options to show or hide elements">Options</button>
  `
}
