
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
