// ==UserScript==
// @name         Utilities
// @namespace    KrzysztofKruk-FlyWire
// @version      0.12
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


function fix_visibilityOptions_2022_07_30() {
  if (Dock.ls.get('fix_visibilityOptions_2022_07_30') === 'fixed') return

  let settings = Dock.ls.get('utilities', true)
  if (!settings) return

  settings.options['kk-utilities-options-toggle-resolution-buttons'].selector = '#kk-utilities-res-wrapper'

  Dock.ls.set('utilities', settings, true)
  Dock.ls.set('fix_visibilityOptions_2022_07_30', 'fixed')
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
      #${ap}show-neuropils,
      #${ap}res-wrapper {
        display: block;
      }

      #${ap}toggle-background,
      #${ap}jump-to-start,
      #${ap}show-neuropils {
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
        click: (e) => optionsDialogToggleFeatures(e),
        input: (e) => optionsDialogTextInputHandler(e)
      },
      [`#${ap}toggle-background`]: {
        click: toggleBackground
      },
      [`#${ap}show-neuropils`]: {
        click: showNeuropils
      }
    }
  })

  document.addEventListener('fetch', e => fetchHandler(e))
  document.addEventListener('contextmenu', e => hideAllButHandler(e))
  initFields()

  if (typeof DEV !== 'undefined') {
    let button = document.createElement('button')
    button.textContent = 'Test'
    let top = document.getElementsByClassName('neuroglancer-viewer-top-row')[0]
    top.appendChild(button)
    top.addEventListener('click', e => testClickHandler(e))

    function testClickHandler(e) {}
  }


  fix_segmentColors_2022_07_15()
  fix_visibilityOptions_2022_07_30()
}


const optPrefix = ap + 'options-toggle-'

const TYPES = {
  CHECKBOX: 1,
  TEXT: 2,
  NUMBER: 3,
  TEXTAREA: 4,
  RANGE: 5
}

const defaultOptions = {
  [optPrefix + 'jump-to-start']: {
    type: TYPES.CHECKBOX,
    selector: `#${ap}jump-to-start`,
    text: 'Jump to start',
    value: true
  },
  [optPrefix + 'add-point-at-start']: {
    type: TYPES.CHECKBOX,
    selector: `#${ap}add-annotation-at-start-wrapper`,
    text: 'Add point at start',
    value: true
  },
  [optPrefix + 'remove-points-at-start']: {
    type: TYPES.CHECKBOX,
    selector: `#${ap}remove-annotations-at-start-wrapper`,
    text: 'Remove points at start',
    value: true
  },
  [optPrefix + 'resolution-buttons']: {
    type: TYPES.CHECKBOX,
    selector: `#${ap}res-wrapper`,
    text: 'Resolution buttons',
    value: true
  },
  [optPrefix + 'toggle-background']: {
    type: TYPES.CHECKBOX,
    selector: `#${ap}toggle-background`,
    text: 'Background color switch',
    value: true
  },
  [optPrefix + 'show-neuropils']: {
    type: TYPES.CHECKBOX,
    selector: `#${ap}show-neuropils`,
    text: 'Show neuropils',
    value: true
  },
  'neuropils': {
    isGroup: true,
    [optPrefix + 'neuropil-optic-lobe']: {
      type: TYPES.CHECKBOX,
      selector: `#${ap}neropil-optic-lobe`,
      text: 'Show Optic Lobe',
      value: true
    },
    [optPrefix + 'neuropil-medulla']: {
      type: TYPES.CHECKBOX,
      selector: `#${ap}neropil-medulla`,
      text: 'Show Medulla',
      value: true
    },
    [optPrefix + 'neuropil-lobula']: {
      type: TYPES.CHECKBOX,
      selector: `#${ap}neropil-lobula`,
      text: 'Show Lobula',
      value: true
    },
    [optPrefix + 'neuropil-lobula-plate']: {
      type: TYPES.CHECKBOX,
      selector: `#${ap}neropil-lobula-plate`,
      text: 'Show Lobula Plate',
      value: true
    },
    [optPrefix + 'neuropil-accessory-medulla']: {
      type: TYPES.CHECKBOX,
      selector: `#${ap}neropil-accessory-medulla`,
      text: 'Show Accessory Medulla',
      value: true
    },
    [optPrefix + 'neuropil-transparency-on-black']: {
      type: TYPES.TEXT,
      selector: `#${ap}neropil-transparency-on-black`,
      text: 'Neuropil transparency on black background',
      value: 0.1
    },
    [optPrefix + 'neuropil-transparency-on-white']: {
      type: TYPES.TEXT,
      selector: `#${ap}neropil-transparency-on-white`,
      text: 'Neuropil transparency on white background',
      value: 0.05
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
  visibleFeatures: [],
  options: {
    neropils: {
      opticLobe: true,
      medulla: true,
      lobula: true,
      lobulaPlate: true,
      accessoryMedulla: true
    }
  },
  currentResolutionButton: 1,
  backgroundColor: 'black'

}


function loadFromLS() {
  let data = Dock.ls.get('utilities', true)

  if (data) {
    saveable = data
  }

  if (saveable.options && Object.entries(saveable.options).length === 0 || !saveable.options) {
    saveable.options = defaultOptions
  }

  // we have to override defaultOptions with saveable.options,
  // but then we're using the object, which was made by combining these two
  // so we have to assign defaultOptions (now containing options from both object)
  // to saveable.options
  Dock.mergeObjects(defaultOptions, saveable.options)
  saveable.options = defaultOptions
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


function openSegmentInNewTab(e) {
  let button = e.target        // e.target === <button>
  if (!button.classList.contains('segment-copy-button')) {
    button = button.parentNode // e.target === <svg>
  }
  if (!button.classList.contains('segment-copy-button')) {
    button = button.parentNode // e.target === <path>
  }
  if (!button.classList.contains('segment-copy-button')) return

  let state = viewer.saver.pull()
  if (e.ctrlKey) {
    state.state.layers.forEach(layer => {
      if (layer.type !== 'segmentation_with_graph') return

      layer.hiddenSegments = []
    })
  }
  else {
    let segId = Object.keys(button.previousElementSibling.dataset).length && button.previousElementSibling.dataset.segId
  
    state.state.layers.forEach(layer => {
      if (layer.type !== 'segmentation_with_graph') return

      layer.segments = [segId]
      layer.hiddenSegments = []
    })
  }

  let url = new URL(unsafeWindow.location.href)
  let randomString = Dock.getRandomHexString()
  let lsName = 'neuroglancerSaveState_v2-' + randomString
  localStorage.setItem(lsName, JSON.stringify(state))
  unsafeWindow.open(url.origin + '/?local_id=' + randomString, '_blank')
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


function deleteSplitPoint(e) {console.log('deleteSplitPoint.event', e)
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
  console.log('point', point)
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
  if (!saveable.options) return

  for (const [checkboxId, value] of Object.entries(saveable.options)) {
    if (value.isGroup) {
      for (const id of Object.keys(value)) {
        if (id === 'isGroup') continue
        optionsDialogToggleFeature(id)
      }
    }
    else {
      optionsDialogToggleFeature(checkboxId)
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
  let color = viewer.perspectiveViewBackgroundColor.value_

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
  changeNeuropilTransparency(saveable.backgroundColor)
  saveToLS()
}


function showNeuropils() {
  const state = viewer.state.toJSON()
  const isCurrentBackgroundBlack = saveable.options['kk-utilities-options-toggle-toggle-background'].value
  const optionName = 'kk-utilities-options-toggle-neuropil-transparency-on-' + (isCurrentBackgroundBlack ? 'black' : 'white')
  const alpha = saveable.options.neuropils[optionName].value

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
      key: optPrefix + 'neuropil-optic-lobe'
    },
    'Medulla': {
      settings: medulla,
      key: optPrefix + 'neuropil-medulla'
    },
    'Lobula': {
      settings: lobula,
      key: optPrefix + 'neuropil-lobula'
    },
    'Lobula Plate': {
      settings: lobulaPlate,
      key: optPrefix + 'neuropil-lobula-plate'
    },
    'Accessory Medulla': {
      settings: accessoryMedulla,
      key: optPrefix + 'neuropil-accessory-medulla'
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
      if (!Dock.layers.getByName(layerName).length && saveable.options.neuropils[value.key].value) {
        state.layers.push(value.settings)
      }
    }

    viewer.state.restoreState(state)
  }
}


function generateHtmlForNumber(id, name, value, group) {
  return /*html*/`
    <input type="number" id="${id}" data-group="${(group || '')}"  value="${value}">${name}<br />
  `
}


function generateHtmlForText(id, name, value, group) {
  return /*html*/`
    <input type="text" id="${id}" data-group="${(group || '')}"  value="${value}">${name}<br />
  `
}


function generateHtmlForTextarea(id, name, value, group) {
  return /*html*/`
    <textarea id="${id}" data-group="${(group || '')}"  value="${value}">${name}</textarea><br />
  `
}


function generateHtmlForCheckbox(id, name, value, group) {
  return /*html*/`
    <label><input type="checkbox" id="${id}" data-group="${(group || '')}" ${value ? 'checked' : ''}>${name}</label><br />
  `
}


function generateHtmlForRange(id, name, value, group) {
  return /*html*/`
    <label><input
      type="range"
      id="${id}"
      data-group="${(group || '')}"
      value="${value.value}"
      min="${value.min}"
      max="${value.max}"
      step="${value.step}"
    >${name}</label><br />
  `
}


function generateHtmlForInput(type, id, name, value, group) {
  switch (type) {
    case TYPES.CHECKBOX: return generateHtmlForCheckbox(id, name, value, group)
    case TYPES.TEXT: return generateHtmlForText(id, name, value, group)
    case TYPES.NUMBER: return generateHtmlForNumber(id, name, value, group)
    case TYPES.TEXTAREA: return generateHtmlForTextarea(id, name, value, group) // TODO: doesn't have a handler
    case TYPES.RANGE: return generateHtmlForRange(id, name, value, group) // TODO: doesn't have a handler
  }
}


function generateOptionsHtml() {
  let html = ''
  for (const [name, value] of Object.entries(saveable.options)) {
    if (value.isGroup) {
      html += '<div class="kk-utilities-options-wrapper">'

      for (const [subName, subValue] of Object.entries(value)) {

        if (subName === 'isGroup') continue
        if (subValue.value === undefined) { // to migrate from older version
          subValue.value = subValue.state
        }
        html += generateHtmlForInput(subValue.type, subName, subValue.text, subValue.value, name)
      }

      html += '</div>'
    }
    else {
      if (value.value === undefined) { // to migrate from older version
        value.value = value.state
      }
      html += generateHtmlForInput(value.type, name, value.text, value.value)
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
    width: 320,
    afterCreateCallback: () => {
      document.querySelectorAll(`#${optPrefix}neuropil-transparency-on-black, #${optPrefix}neuropil-transparency-on-white`).forEach(el => {
        el.addEventListener('input', e => changeNeuropilTransparencyEventHandler(e))
      })
    }
  }
}


function changeNeuropilTransparencyEventHandler(e) {
  changeNeuropilTransparency(e.target.id.includes('black') ? 'black' : 'white', e.target.value)
}


function changeNeuropilTransparency(backgroundColor) {
  const optionName = 'kk-utilities-options-toggle-neuropil-transparency-on-' + backgroundColor
  const value = saveable.options.neuropils[optionName].value

  const neuropilLayers = Dock.layers.getByType('segmentation', false)
  if (!neuropilLayers.length) return

  const currentBackgroundColor = saveable.backgroundColor
  if (backgroundColor !== currentBackgroundColor) return

  neuropilLayers.forEach(layer => {
    let alpha = layer.layer.displayState.objectAlpha
    alpha.value = value
  })
}


function optionsDialogToggleFeature(elementId) {
  const element = document.getElementById(elementId)
  if (!element || element.type !== 'checkbox') return
  const group = Object.keys(element.dataset).length && element.dataset.group
  const featureSelector = group ? saveable.options[group][elementId].selector : saveable.options[elementId].selector
  const feature = document.querySelectorAll(featureSelector)

  if (!feature) return

  const value = element.checked
  feature.forEach(el => el.style.display = value && Object.keys(el.dataset).length ? el.dataset.display : 'none')

  return value
}


function optionsDialogToggleFeatures(e) {
  let dialogId = ap + 'options-dialog'
  if (e.target.type !== 'checkbox' && e.target.tagName !== 'LABEL') return
  if (e.target.parentNode.parentNode.id !== dialogId &&
      e.target.parentNode.parentNode.parentNode.id !== dialogId) return

  let prefix = ap + 'options-toggle-'
  let elementId
  let featureSelector
  if (e.target.type === 'checkbox') {
    elementId = e.target.id
  }
  else if (e.target.tagName === 'LABEL') {
    elementId = e.target.firstChild.id
  }
  else return

  const element = document.getElementById(elementId)
  const value = optionsDialogToggleFeature(elementId)
  const group = Object.keys(element.dataset).length && element.dataset.group

  if (group) {
    saveable.options[group][elementId].value = value
  }
  else {
    saveable.options[elementId].value = value
  }

  saveToLS()
}


function optionsDialogTextInputHandler(e) {
  if (!['text', 'number', 'range'].includes(e.target.type)) return
  
  const value = parseFloat(e.target.value)

  if (Object.keys(e.target.dataset).length && e.target.dataset.group) {
    const group = e.target.dataset.group
    saveable.options[group][e.target.id].value = value
  }
  else {
    saveable.options[e.target.id].value = value
  }

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
    <button id="kk-utilities-options" title="Options to show or hide elements" data-display="block">Options</button>
  `
}
