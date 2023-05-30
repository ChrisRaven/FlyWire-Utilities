
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
