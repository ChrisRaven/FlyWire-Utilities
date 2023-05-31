function saveSegmentAfterClaim(response) {
  let coords = response.ngl_coordinates

  if (!coords) return // happens, when there are no cells to proofread

  // source: webpack:///src/state.ts (FlyWire)
  const coordsSpaced = coords.slice(1, -1).split(" ")
  const xyz = []
  for (const coord of coordsSpaced) {
    if (coord === '') continue
    xyz.push(parseInt(coord, 10))
  }
  saveable.startCoords = coords
}
