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

