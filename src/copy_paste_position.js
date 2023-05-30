
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
