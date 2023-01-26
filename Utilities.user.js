// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.20.0.1
// @description  Various functionalities for FlyWire
// @author       Krzysztof Kruk
// @match        https://ngl.flywire.ai/*
// @match        https://proofreading.flywire.ai/*
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
const ap = 'kk-utilities-'


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


function fix_visibilityOptions_2022_07_30() {
  if (Dock.ls.get('fix_visibilityOptions_2022_07_30') === 'fixed') return

  let settings = Dock.ls.get('utilities', true)
  if (!settings) return

  if (!settings.options) return
  settings.options['kk-utilities-options-toggle-resolution-buttons'].selector = '#kk-utilities-res-wrapper'

  Dock.ls.set('utilities', settings, true)
  Dock.ls.set('fix_visibilityOptions_2022_07_30', 'fixed')
}


function fix_optionsOrganization_2022_08_15() {
  if (Dock.ls.get('fix_optionsOrganization_2022_08_15') === 'fixed') return

  let settings = Dock.ls.get('utilities', true)
  if (!settings) return

  function update(oldName, newName) {
    let option
    let value
    
    option = settings.options[oldName]
    if (!option) return
    value = option.value === undefined ? option.state : option.value
    settings[newName] = value
  }

  if (settings.options) {
    update('kk-utilities-options-toggle-jump-to-start', 'jumpToStart')
    update('kk-utilities-options-toggle-add-point-at-start', 'addPointAtStart')
    update('kk-utilities-options-toggle-remove-points-at-start', 'removePointsAtStart')
    update('kk-utilities-options-toggle-resolution-buttons', 'resolutionButtons')
    update('kk-utilities-options-toggle-toggle-background', 'toggleBackground')
    update('kk-utilities-options-toggle-show-neuropils', 'showNeuropils')
    delete settings.options
  }

  let leaves = {}
  for(const [key, value] of Object.entries(settings.leaves)) {
    if (value[0] !== null && value[0] !== undefined && !isNaN(value[0])) {
      leaves[key] = value
    }
  }
  settings.leaves = leaves

  let roots = {}
  for(const [key, value] of Object.entries(settings.roots)) {
    if (value[0] !== null && value[0] !== undefined && !isNaN(value[0])) {
      roots[key] = value
    }
  }
  settings.roots = roots

  Dock.ls.set('utilities', settings, true)
  Dock.ls.set('fix_optionsOrganization_2022_08_15', 'fixed')
}


let shift = false
let ctrl = false
let removeWithCtrlShift = false

function main() {
  fix_optionsOrganization_2022_08_15()
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
      #${ap}show-neuropils,
      #${ap}res-wrapper,
      #${ap}copy-position {
        display: block;
      }

      #${ap}toggle-background,
      #${ap}jump-to-start,
      #${ap}show-neuropils {
        margin: auto;
      }

      .selected-segment-button {
        border: 2px solid orange;
      }

      #${ap}display-number-of-segments {
        display: inline-block;
        margin-top: 9px;
        padding-left: 10px;
      }
      `,
    events: {
      '.neuroglancer-rendered-data-panel:first-of-type': {
        dblclick: {
          handler: dblClickHandler,
          singleNode: true
        }
      },
      '.neuroglancer-layer-side-panel': {
        contextmenu: (e) => {
          jumpToSegment(e)
          openSegmentsInNewTabHandler(e)
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
        click: (e) => optionsDialogToggleFeatures(e),
        input: (e) => optionsDialogTextInputHandler(e)
      },
      [`#${ap}toggle-background`]: {
        click: toggleBackground
      },
      [`#${ap}show-neuropils`]: {
        click: showNeuropils
      },
      [`#${ap}copy-position-copy`]: {
        click: copyPosition
      },
      [`#${ap}copy-position-paste`]: {
        click: pastePosition
      }
    }
  })

  document.addEventListener('fetch', e => fetchHandler(e))
  document.addEventListener('contextmenu', e => hideAllButHandler(e))
  initFields()

  Dock.addToMainTab('segmentation_with_graph', assignMainTabEvents)
  Dock.addToRightTab('segmentation_with_graph', 'Rendering', displayNumberOfSegments)

  if (typeof DEV !== 'undefined') {
    let button = document.createElement('button')
    button.textContent = 'Test'
    let top = document.getElementsByClassName('neuroglancer-viewer-top-row')[0]
    top.appendChild(button)
    top.addEventListener('click', e => testClickHandler(e))

    function testClickHandler(e) { }
  }

  fix_segmentColors_2022_07_15()
  fix_visibilityOptions_2022_07_30()

  document.addEventListener('keydown', e => {
    if (e.ctrlKey) {
      ctrl = true
    }

    if (e.shiftKey) {
      shift = true
    }
  })

  document.addEventListener('keyup', e => {
    // e.ctrlKey and e.shiftKey don't work for some reason
    if (e.key === 'Control') {
      ctrl = false
    }

    if (e.key === 'Shift') {
      shift = false
    }
  })

  viewer.mouseState.changed.add(() => {
    if (ctrl && shift && removeWithCtrlShift) {
      const id = viewer.mouseState.pickedValue.toJSON()
      if (id) {
        const element = document.querySelector(`button[data-seg-id="${id}"]`)
        if (element) {
          element.click()
        }
      }
    }
  })
}


const op = ap + 'option-'

const TYPES = {
  CHECKBOX: 1,
  TEXT: 2,
  NUMBER: 3,
  TEXTAREA: 4,
  RANGE: 5
}

const options = {
  jumpToStart: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'jump-to-start',
    featureSelector: `#${ap}jump-to-start`,
    text: 'Jump to start'
  },
  addPointAtStart: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'add-point-at-start',
    featureSelector: `#${ap}add-annotation-at-start-wrapper`,
    text: 'Add point at start'
  },
  removePointsAtStart: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'remove-points-at-start',
    featureSelector: `#${ap}remove-annotations-at-start-wrapper`,
    text: 'Remove points at start'
  },
  resolutionButtons: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'resolution-buttons',
    featureSelector: `#${ap}res-wrapper`,
    text: 'Resolution buttons'
  },
  toggleBackground: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'toggle-background',
    featureSelector: `#${ap}toggle-background`,
    text: 'Background color switch'
  },
  displayNumberOfSegments: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'display-number-of-segments',
    featureSelector: `#${ap}display-number-of-segments`,
    text: 'Display number of segments'
  },
  showNeuropils: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'show-neuropils',
    featureSelector: `#${ap}show-neuropils`,
    text: 'Show neuropils'
  },
  copyPosition: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'copy-position',
    featureSelector: `#${ap}copy-position-wrapper`,
    text: 'Copy position'
  },
  removeWithCtrlShift: {
    type: TYPES.CHECKBOX,
    optionSelector: op + 'remove-with-ctrl-shift',
    text: 'Remove segments when Ctrl and Shift are pressed'
  },
  neuropils: {
    isGroup: true,
    neuropils_opticLobe: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-optic-lobe',
      text: 'Show Optic Lobe'
    },
    neuropils_medulla: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-medulla',
      text: 'Show Medulla'
    },
    neuropils_lobula: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-lobula',
      text: 'Show Lobula'
    },
    neuropils_lobulaPlate: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-lobula-plate',
      text: 'Show Lobula Plate'
    },
    neuropils_accessoryMedulla: {
      type: TYPES.CHECKBOX,
      optionSelector: op + 'neuropil-accessory-medulla',
      text: 'Show Accessory Medulla'
    },
    neuropils_blackBackgroundTransparency: {
      type: TYPES.TEXT,
      optionSelector: op + 'neuropil-transparency-on-black',
      text: 'Neuropil transparency on black background'
    },
    neuropils_whiteBackgroundTransparency: {
      type: TYPES.TEXT,
      optionSelector: op + 'neuropil-transparency-on-white',
      text: 'Neuropil transparency on white background'
    }
  }
}

let saveable = {
  roots: {},
  leaves: {},
  startCoords: null,
  addAnnotationAtStartState: false,
  removeAnnotationsAtStartState: false,
  startAnnotationId: 0,
  visibleFeatures: {
    jumpToStart: true,
    addPointAtStart: true,
    removePointsAtStart: true,
    resolutionButtons: true,
    background: true,
    neuropils: true,
    copyPosition: true,
    removeWithCtrlShift: false
  },
  neuropils_opticLobe: true,
  neuropils_medulla: true,
  neuropils_lobula: true,
  neuropils_lobulaPlate: true,
  neuropils_accessoryMedulla: true,
  neuropils_blackBackgroundTransparency: 0.1,
  neuropils_whiteBackgroundTransparency: 0.05,
  currentResolutionButton: 1,
  backgroundColor: 'black',
  displayNumberOfSegments: true
}


function loadFromLS() {
  let data = Dock.ls.get('utilities', true)

  if (data) {
    Dock.mergeObjects(saveable, data)
    removeWithCtrlShift = saveable.visibleFeatures.removeWithCtrlShift
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


function assignMainTabEvents() {
  // setTimeout, because the changed event is called, when the elements aren't yet available in the DOM
  setTimeout(() => {
    document.getElementsByClassName('neuroglancer-rendered-data-panel')
      .forEach(panel => panel.addEventListener('contextmenu', (e) => {
        deleteAnnotationPoint(e)
        deleteSplitPoint(e)
        jumpToSegmentButton(e)
      }))
  }, 0)
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
  if (e.ctrlKey) return

  let segId = Object.keys(e.target.dataset).length && e.target.dataset.segId
  let coords = saveable.roots[segId]

  if (coords) return Dock.jumpToCoords(coords)

  // if we don't have coords for a given rootId, we check every leaf to see, if any of them didn't change their rootId in the meantime
  let numberOfConnectionsNeeded = Object.keys(saveable.leaves).length

  for (const [leafId, coords] of Object.entries(saveable.leaves)) {
    Dock.getRootId(leafId, rootId => {
      if (rootId === segId) {
        saveable.roots[rootId] = coords
        saveToLS()
        Dock.jumpToCoords(coords)
      }
      else if (!--numberOfConnectionsNeeded) {
        jumpToSegmentNewWay(segId)
      }
    })
  }
}


function jumpToSegmentNewWay(segId) {
  for (const [key, el] of viewer.chunkManager.memoize.map) {
    if (!el.fragmentSource) continue

    let requests = []
    for (const [key, chunk] of el.fragmentSource.meshSource.chunks) {
      let fragmentId = chunk.fragmentIds[0].split(':')[0]
      if (parseInt(fragmentId, 10) < 1000) continue

      for (const [key, chunk] of el.fragmentSource.chunks) {
        if (key.split(':')[0] !== fragmentId) continue

        let request = Dock.getRootId(fragmentId, rootId => {
          if (!rootId || rootId !== segId) return

          requests.forEach(request => {
            request.abort()
          })

          let voxelSize = Dock.getVoxelSize()
          let positions = chunk.meshData.vertexPositions
          let x = positions[0] / voxelSize[0]
          let y = positions[1] / voxelSize[1]
          let z = positions[2] / voxelSize[2]
          Dock.jumpToCoords([x, y, z])
        })

        requests.push(request)
      }
    }
  }
}


function jumpToSegmentButton(e) {
  if (!e.ctrlKey) return

  document.getElementsByClassName('selected-segment-button').forEach(el => el.classList.remove('selected-segment-button'))
  const element = document.getElementsByClassName('selectedSeg')[0]
  if (!element) return

  element.scrollIntoView()
  element.parentElement.classList.add('selected-segment-button')
}


function openSegmentsInNewTabHandler(e) {
  let button = e.target        // e.target === <button>
  if (!button.classList.contains('segment-copy-button')) {
    button = button.parentNode // e.target === <svg>
  }
  if (!button.classList.contains('segment-copy-button')) {
    button = button.parentNode // e.target === <path>
  }
  if (!button.classList.contains('segment-copy-button')) return

  const state = viewer.saver.pull()
  let ids
  if (e.ctrlKey) {
    state.state.layers.forEach(layer => {
      if (layer.type !== 'segmentation_with_graph') return

      ids = layer.segments
    })
  }
  else {
    ids = Object.keys(button.previousElementSibling.dataset).length && [button.previousElementSibling.dataset.segId]
  }

  if (!ids) return

  openSegmentsInNewTab(ids)
}


function openSegmentsInNewTab(ids) {

  function prepareState(ids) {
    const state = viewer.saver.pull()

    state.state.layers.forEach(layer => {
      if (layer.type !== 'segmentation_with_graph') return

      layer.segments = ids
      layer.hiddenSegments = []
    })

    return state
  }

  // TODO: move to Dock as "saveNeuroglancerState" and add "getNeuroglancerState" method there
  function addToLS(state) {
    const stateId = Dock.getRandomHexString()
    const stateKey = 'neuroglancerSaveState_v2'
    const lsName = stateKey + '-' + stateId
    
    // Source: neuroglancer/save_state/savet_state.ts -> SaveState -> robustSet()
    while (true) {
      try {
        localStorage.setItem(lsName, JSON.stringify(state))
        let stateManager = localStorage.getItem(stateKey)
        if (stateManager) {
          stateManager = JSON.parse(stateManager)
          stateManager.push(stateId)
          localStorage.setItem(stateKey, JSON.stringify(stateManager))
        }
        break
      }
      catch (e) {
        
        const manager = JSON.parse(localStorage.getItem(stateKey))
        if (!manager.length) throw e

        const targets = manager.splice(0, 1);
        const serializedManager = JSON.stringify(manager)
        localStorage.setItem(stateKey, serializedManager)
        targets.forEach(key => localStorage.removeItem(`${stateKey}-${key}`))
      }
    }

    return stateId
  }

  function openInNewTab(stateId) {
    const url = new URL(unsafeWindow.location.href)

    unsafeWindow.open(url.origin + '/?local_id=' + stateId, '_blank')
  }

  const newState = prepareState(ids)
  const stateId = addToLS(newState)
  openInNewTab(stateId)
}


function fetchHandler(e) {
  let response = e.detail.response
  let body = e.detail && e.detail.params ? e.detail.params.body : null
  let url = e.detail.url
  if (response.code && response.code === 400) return console.error('Utilities: failed operation')

  // we don't have to update segments after merge, because we still have a point from at least one of the merged fragments
  // so we only need to update the rootId right before jumping
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
  else if (url.includes('split_preview?')) {
    if (!response.illegal_split) return
    let separatedSupervoxels = response.supervoxel_connected_components[2]
    if (!separatedSupervoxels || !separatedSupervoxels.length) return

    body = JSON.parse(body)
    highlightSeparatedSupervoxels(body, separatedSupervoxels)
  }
}


function highlightSeparatedSupervoxels(body, separatedSupervoxels) {
  separatedSupervoxels.forEach(separatedSupervoxel => {
    body.sinks.forEach(sink => {
      if (sink[0] !== separatedSupervoxel) return

      document.querySelector(`[data-seg-id="${separatedSupervoxel}"]`).style.border = '2px solid orange'
    })

    body.sources.forEach(source => {
      if (source[0] !== separatedSupervoxel) return

      document.querySelector(`[data-seg-id="${separatedSupervoxel}"]`).style.border = '2px solid orange'
    })
  })
}


function saveSegmentAfterClaim(response) {
  clearLists()
  let coords = response.ngl_coordinates

  if (!coords) return // happens, when there are no cells to proofread

  // source: webpack:///src/state.ts (FlyWire)
  const coordsSpaced = coords.slice(1, -1).split(" ")
  const xyz = []
  for (const coord of coordsSpaced) {
    if (coord === '') continue
    xyz.push(parseInt(coord, 10))
  }
  coords = xyz

  let leafId = response.supervoxel_id
  let rootId = response.root_id
  saveable.leaves[leafId] = coords
  saveable.roots[rootId] = coords
  saveable.startCoords = coords
}


function saveSegmentsAfterSplit(body) {
  let voxelSize = Dock.getVoxelSize()

  body = JSON.parse(body)

  let point = body.sources[0]
  let leafId = point[0]
  point.shift() // the point is in format [segId, x, y, z]
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
  let res = Object.keys(e.target.dataset).length && e.target.dataset.resolution

  document.querySelectorAll('.kk-utilities-res').forEach(button => button.classList.remove('active'))
  e.target.classList.add('active')
  saveable.resolution = res
  saveToLS()

  viewer.layerManager.managedLayers.forEach(layer => {
    if (!layer || !layer.layer_ || !layer.layer_.sliceViewRenderScaleTarget) return

    layer.layer_.sliceViewRenderScaleTarget.restoreState(res)
  })
}


function deleteSplitPoint(e) {// console.log('deleteSplitPoint.event', e)
  if (!e.ctrlKey) return
// console.log('after ctrlKey')
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
  // console.log('value', value)
  // console.log('type', type)
  
  if (!value) return
// console.log('after value')
  let point = Dock.annotations.getMulticutRef(type, value)
  // console.log('point', point)
  if (!point) return
// console.log('after point')
// console.log('point.reference', point.reference)
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
  if (!Dock.annotations.getAnnotationLayer()) return
  
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
  let graphLayer = Dock.layers.getByType('segmentation_with_graph', false)[0].layer.graphOperationLayerState.value
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
  Dock.layers.getByType('segmentation_with_graph', false)[0].layer.pathFinderState.pathBetweenSupervoxels.clear()
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
  if (!options) return

  for (const [optionName, value] of Object.entries(options)) {
    if (value.isGroup) {
      const subOptions = Object.entries(value)
      for (const [optionName, value] of subOptions) {
        if (optionName === 'isGroup') continue
        optionsDialogToggleFeature(optionName, value)
      }
    }
    else {
      optionsDialogToggleFeature(optionName, value)
    }
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


function toggleBackground() {
  let graphLayer = Dock.layers.getByType('segmentation_with_graph', false)[0]
  let color = viewer.perspectiveViewBackgroundColor.value

  if (saveable.backgroundColor === 'black') {
    color[0] = 1
    color[1] = 1
    color[2] = 1
    saveable.backgroundColor = 'white'
  }
  else {
    color[0] = 0
    color[1] = 0
    color[2] = 0
    saveable.backgroundColor = 'black'
  }

  graphLayer.layer.layersChanged.dispatch()

  const backgroundColor = saveable.backgroundColor
  const optionName = 'neuropils_' + backgroundColor + 'BackgroundTransparency'
  const value = saveable[optionName]
  changeNeuropilTransparency(backgroundColor, value)

  saveToLS()
}


function showNeuropils() {
  const state = viewer.state.toJSON()
  const optionName = 'neuropils_' +  saveable.backgroundColor + 'BackgroundTransparency'
  const alpha = parseFloat(saveable[optionName])

  const opticLobe = {
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141.surf_v2",
    "type": "segmentation",
    "objectAlpha": alpha,
    "segmentColors": {
      "2": "#d3b936",
      "6": "#2dc830",
      "14": "#367aba",
      "29": "#8736c9",
      "36": "#3ed048",
      "43": "#d3a936",
      "51": "#3681ba",
      "56": "#54348d"
    },
    "segments": [
      "14",
      "2",
      "29",
      "36",
      "43",
      "51",
      "56",
      "6"
    ],
    "skeletonRendering": {
      "mode2d": "lines_and_points",
      "mode3d": "lines"
    },
    "name": "Optic Lobe"
  }

  const medulla = {
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141.surf_v2",
    "type": "segmentation",
    "objectAlpha": alpha,
    "segmentColors": {
      "2": "#d3b936",
      "43": "#d3a936"
    },
    "segments": [
      "2",
      "43"
    ],
    "skeletonRendering": {
      "mode2d": "lines_and_points",
      "mode3d": "lines"
    },
    "name": "Medulla"
  }

  const lobula = {
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141.surf_v2",
    "type": "segmentation",
    "objectAlpha": alpha,
    "segmentColors": {
      "14": "#367aba",
      "51": "#367aba"
    },
    "segments": [
      "14",
      "51"
    ],
    "skeletonRendering": {
      "mode2d": "lines_and_points",
      "mode3d": "lines"
    },
    "name": "Lobula"
  }

  const lobulaPlate = {
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141.surf_v2",
    "type": "segmentation",
    "objectAlpha": alpha,
    "segmentColors": {
      "6": "#2dc830",
      "36": "#2dc830"
    },
    "segments": [
      "6",
      "36"
    ],
    "skeletonRendering": {
      "mode2d": "lines_and_points",
      "mode3d": "lines"
    },
    "name": "Lobula Plate"
  }

  const accessoryMedulla = {
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141.surf_v2",
    "type": "segmentation",
    "objectAlpha": alpha,
    "segmentColors": {
      "29": "#8736c9",
      "56": "#8736c9"
    },
    "segments": [
      "29",
      "56"
    ],
    "skeletonRendering": {
      "mode2d": "lines_and_points",
      "mode3d": "lines"
    },
    "name": "Accessory Medulla"
  }

  const neuropils = {
    'Optic Lobe': {
      settings: opticLobe,
      optionName: 'neuropils_opticLobe',
      key: op + 'neuropil-optic-lobe'
    },
    'Medulla': {
      settings: medulla,
      optionName: 'neuropils_medulla',
      key: op + 'neuropil-medulla'
    },
    'Lobula': {
      settings: lobula,
      optionName: 'neuropils_lobula',
      key: op + 'neuropil-lobula'
    },
    'Lobula Plate': {
      settings: lobulaPlate,
      optionName: 'neuropils_lobulaPlate',
      key: op + 'neuropil-lobula-plate'
    },
    'Accessory Medulla': {
      settings: accessoryMedulla,
      optionName: 'neuropils_accessoryMedulla',
      key: op + 'neuropil-accessory-medulla'
    }
  }

  let aLayerExists = false
  for (const [layerName, value] of Object.entries(neuropils)) {
    let layer = Dock.layers.getByName(layerName)
    if (layer.length) {
      Dock.layers.remove(layer[0].index)
      aLayerExists = true
    }
  }

  if (!aLayerExists) {
    for (const [layerName, value] of Object.entries(neuropils)) {
      if (!Dock.layers.getByName(layerName).length && saveable[value.optionName]) {
        state.layers.push(value.settings)
      }
    }

    viewer.state.restoreState(state)
  }
}


function changeNeuropilTransparencyEventHandler(e) {
  changeNeuropilTransparency(e.target.id.includes('black') ? 'black' : 'white', e.target.value)
}


function changeNeuropilTransparency(backgroundColor, value) {
  const optionName = 'neuropils_' + backgroundColor + 'BackgroundTransparency'
  const neuropilLayers = Dock.layers.getByType('segmentation', false)

  if (!neuropilLayers.length) return

  const currentBackgroundColor = saveable.backgroundColor
  if (backgroundColor !== currentBackgroundColor) return

  neuropilLayers.forEach(layer => {
    let alpha = layer.layer.displayState.objectAlpha
    alpha.value = value
  })
  saveable[optionName] = value
  saveToLS()
}


function displayNumberOfSegments() {
  const id = ap + 'display-number-of-segments'
  if (document.getElementById(id)) return

  const addSegment = document.getElementsByClassName('add-segment')[0]
  if (!addSegment) return

  addSegment.style.display = 'inline-block'
  const counter = document.createElement('div')
  counter.id = id
  const notDefined = saveable.visibleFeatures.displayNumberOfSegments === undefined
  counter.style.display = notDefined || saveable.visibleFeatures.displayNumberOfSegments ? 'inline-block' : 'none'
  counter.dataset.display = 'inline-block'
  counter.title = 'Number of visible segments (all segments)'
  addSegment.after(counter)

  const graphLayer = Dock.layers.getByType('segmentation_with_graph', false)[0]
  const displayState = graphLayer.layer.displayState
  displayState.rootSegments.changed.add(() => {
    updateCounters()
  })
  displayState.hiddenRootSegments.changed.add(() => {
    updateCounters()
  })
  updateCounters()

  function updateCounters() {
    const visibleSegments = displayState.rootSegments.toJSON().length
    const hiddenSegments = displayState.hiddenRootSegments.toJSON().length
    counter.textContent = visibleSegments + ' (' + (visibleSegments + hiddenSegments) + ')'
  }
}


function copyPosition() {
  const pose = viewer.perspectiveNavigationState.pose

  const data = {
    zoom: viewer.perspectiveNavigationState.zoomFactor.value,

    coords0: pose.position.spatialCoordinates[0],
    coords1: pose.position.spatialCoordinates[1],
    coords2: pose.position.spatialCoordinates[2],

    orient0: pose.orientation.orientation[0],
    orient1: pose.orientation.orientation[1],
    orient2: pose.orientation.orientation[2],
    orient3: pose.orientation.orientation[3]
  }

  navigator.clipboard.writeText(JSON.stringify(data))
}


function pastePosition() {
  const pose = viewer.perspectiveNavigationState.pose

  navigator.clipboard.readText()
    .then(data => {
      try {
        data = JSON.parse(data)

        if (data.zoom !== undefined) {
          viewer.perspectiveNavigationState.zoomFactor.value = data.zoom
        }

        if (data.coords0 !== undefined) {
          pose.position.spatialCoordinates[0] = data.coords0
          pose.position.spatialCoordinates[1] = data.coords1
          pose.position.spatialCoordinates[2] = data.coords2

          pose.position.markSpatialCoordinatesChanged()
        }

        if (data.orient1 !== undefined) {
          pose.orientation.orientation[0] = data.orient0
          pose.orientation.orientation[1] = data.orient1
          pose.orientation.orientation[2] = data.orient2
          pose.orientation.orientation[3] = data.orient3

          pose.orientation.changed.dispatch()
        }
      }
      catch {
        console.error('Incorrect data in the clipboard')
      }
    })
}


// below only code for options
function generateHtmlForNumber(optionName, params, value, group) {
  return /*html*/`
    <input
      type="number"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      value="${value}"
    >${params.text}<br />
  `
}


function generateHtmlForText(optionName, params, value, group) {
  return /*html*/`
    <input
      type="text"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      value="${value}"
    >${params.text}<br />
  `
}


function generateHtmlForTextarea(optionName, params, value, group) {
  return /*html*/`
    <textarea
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      value="${value}"
    >${params.text}</textarea><br />
  `
}


function generateHtmlForCheckbox(optionName, params, value, group) {
  return /*html*/`
    <label><input
      type="checkbox"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      data-option-name="${optionName}"
      ${value ? 'checked' : ''}
    >${params.text}</label><br />
  `
}


function generateHtmlForRange(optionName, params, value, group) {
  return /*html*/`
    <label><input
      type="range"
      id="${params.optionSelector}"
      data-group="${(group || '')}"
      value="${value}"
      min="${params.min}"
      max="${params.max}"
      step="${params.step}"
    >${params.text}</label><br />
  `
}


function generateHtmlForInput(optionName, group) {
  let params = group ? options[group][optionName] : options[optionName]
  let value = saveable[optionName]
  let func

  let type = group ? options[group][optionName].type : options[optionName].type

  switch (type) {
    case TYPES.CHECKBOX: func = generateHtmlForCheckbox; break
    case TYPES.TEXT: func = generateHtmlForText; break
    case TYPES.NUMBER: func = generateHtmlForNumber; break
    case TYPES.TEXTAREA: func = generateHtmlForTextarea; break // TODO: doesn't have a handler
    case TYPES.RANGE: func = generateHtmlForRange; break // TODO: doesn't have a handler
  }

  return func(optionName, params, value, group)
}


function generateOptionsHtml() {
  let html = ''
  for (const [optionName, value] of Object.entries(options)) {
    if (value.isGroup) {
      html += '<div class="kk-utilities-options-wrapper">'

      const subOptions = Object.entries(value)
      for (const [subOptionName, subValue] of subOptions) {

        if (subOptionName === 'isGroup') continue
        html += generateHtmlForInput(subOptionName, optionName) // optionName === group name in this case
      }

      html += '</div>'
    }
    else {
      html += generateHtmlForInput(optionName)
    }
  }

  return html
}


function optionsDialogSettings() {
  let prefix = ap + 'options-'
  let dialogId = ap + 'options-dialog'

  return {
    html: generateOptionsHtml(),
    css: /*css*/`
      #${dialogId} {
        font-size: 13px;
        padding-bottom: 5px;
        display: inline-block;
      }

      #${dialogId} input[type="checkbox"] {
        margin-right: 15px;
      }

      #${dialogId} input[type="text"] {
        width: 30px !important;
        margin-right: 10px !important;
        height: 15px !important;
        margin-left: 4px !important;
      }

      .kk-utilities-options-wrapper {
        border: 1px solid gray;
        border-radius: 4px;
      }
    `,
    id: dialogId,
    okCallback: () => {},
    okLabel: 'Close',
    width: 330,
    afterCreateCallback: () => {
      document.querySelectorAll(`#${op}neuropil-transparency-on-black, #${op}neuropil-transparency-on-white`).forEach(el => {
        el.addEventListener('input', e => changeNeuropilTransparencyEventHandler(e))
      })
    }
  }
}


function optionsDialogToggleFeature(optionName, value) {
  const element = document.getElementById(value.optionSelector)
  if (!element || element.type !== 'checkbox') return
  const group = Object.keys(element.dataset).length && element.dataset.group
  const feature = document.querySelectorAll(value.featureSelector)

  if (!feature) return

  const state = element.checked
  feature.forEach(el => el.style.display = state && Object.keys(el.dataset).length ? el.dataset.display : 'none')

  if (optionName === 'removeWithCtrlShift') {
    console.log(value.optionSelector)
    removeWithCtrlShift = document.getElementById(value.optionSelector).checked
  }

  return state
}


function optionsDialogToggleFeatures(e) {
  let dialogId = ap + 'options-dialog'
  if (e.target.type !== 'checkbox' && e.target.tagName !== 'LABEL') return

  let dialog = e.target
  do {
    dialog = dialog.parentNode
  }
  while (dialog.id !== dialogId && dialog.tagName !== 'BODY')
  
  if (dialog.id !== dialogId) return

  let elementId
  if (e.target.type === 'checkbox') {
    elementId = e.target.id
  }
  else if (e.target.tagName === 'LABEL') {
    elementId = e.target.firstChild.id
  }
  else return

  const element = document.getElementById(elementId)
  const optionName = Object.keys(element.dataset).length && element.dataset.optionName
  if (!optionName) return
  const group = Object.keys(element.dataset).length && element.dataset.group

  const values = group ? options[group][optionName] : options[optionName]
  const value = optionsDialogToggleFeature(optionName, values)

  saveable[optionName] = value
  saveable.visibleFeatures[optionName] = value
  saveToLS()
}


function optionsDialogTextInputHandler(e) {
  const node = e.target

  if (!['text', 'number', 'range'].includes(node.type)) return
  if (!Object.keys(node.dataset).length || node.dataset.optionName) return

  const optionName = node.dataset.optionName
  saveable[optionName] = node.value
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
    <button id="kk-utilities-toggle-background" data-display="block" title="Switches between white and black background">Background</button>
    <button id="kk-utilities-show-neuropils" data-display="block" title="Shows or hides optic lobe neuropils as separate layers">Neuropils</button>
    <div id="kk-utilities-copy-position-wrapper" data-display="block">
      <button id="kk-utilities-copy-position-copy" title="Copy current position">C-Pos</button>
      <button id="kk-utilities-copy-position-paste" title="Paste copied position">P-Pos</button>
    </div>
    <button id="kk-utilities-options" title="Options to show or hide elements" data-display="block">Options</button>
  `
}
