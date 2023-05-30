
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
