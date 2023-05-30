function showNeuropils() {
  const state = viewer.state.toJSON()
  const optionName = 'neuropils_' +  saveable.backgroundColor + 'BackgroundTransparency'
  const alpha = parseFloat(saveable[optionName])

  const opticLobe = {
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141_v3",
    "type": "segmentation",
    "objectAlpha": alpha,
    "segmentColors": {
      "2": "#d3b936",
      "6": "#2dc830",
      "14": "#367aba",
      "29": "#8736c9",
      "36": "#2dc830",
      "43": "#d3b936",
      "51": "#367aba",
      "56": "#8736c9"
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
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141_v3",
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
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141_v3",
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
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141_v3",
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
    
    "source": "precomputed://gs://flywire_neuropil_meshes/neuropils/neuropil_mesh_v141_v3",
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

// created as an object passed to a map for readability purposes
const layersNames = new Map(Object.entries({
  43: 'left medulla',
  51: 'left lobula',
  6: 'left lobula plate',
  56: 'left accessory medulla',

  2: 'right medulla',
  14: 'right lobula',
  36: 'right lobula plate',
  29: 'right accessory medulla'
}))

function nameLayers() {
  viewer.selectedLayer.changed.add(check)
  
  function check() {
    document.getElementsByClassName('segment-button').forEach(segment => {
      const segId = segment.dataset.segId
      if (layersNames.has(segId)) {
        segment.textContent = layersNames.get(segId)
      }
    })
  }

  // for a case, when the first layer displayed after a refresh is one of the containing any of the neuropils
  check()
}

document.addEventListener('dock-ready', nameLayers)
