function jumpToSegment(e) {
  if (!e.target.classList.contains('segment-button')) return
  if (e.ctrlKey) return

  let segId = Object.keys(e.target.dataset).length && e.target.dataset.segId

  viewer.selectedLayer.layer_.layer_.meshLayer.chunkManager.memoize.map.forEach(el => {
    if (el.constructor.name !== 'GrapheneMeshSource') return

    for (const [key, value] of el.chunks) {
      const keyAsInts = key.split(',').map(num => parseInt(num, 10))
      const keyAsString = new Uint64(...keyAsInts).toJSON()
      if (keyAsString !== segId) continue

      const firstFragmentId = value.fragmentIds[0].split(':')[0]

      for (const [fragmentId, data] of value.source.fragmentSource.chunks) {
        const id = fragmentId.split(':')[0]

        if (id !== firstFragmentId) continue 
        
        const positions = data.meshData.vertexPositions
        const point = Array.prototype.slice.call(positions, 0, 3)
        const targetPosition = Dock.divideVec3(point, Dock.getVoxelSize())
        Dock.jumpToCoords(targetPosition)
        break
      }
      break
    }
  })
}
