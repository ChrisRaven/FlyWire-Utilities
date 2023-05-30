

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

