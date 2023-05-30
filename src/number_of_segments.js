

function displayNumberOfSegments() {
  const id = ap + 'display-number-of-segments'
  if (document.getElementById(id)) return

  const addSegment = document.getElementsByClassName('add-segment')[0]
  if (!addSegment) return

  addSegment.style.display = 'inline-block'
  const counter = document.createElement('div')
  counter.id = id
  const notDefined = saveable.visibleFeatures.displayNumberOfSegments === undefined
  counter.style.display = notDefined || saveable.visibleFeatures.displayNumberOfSegments ? 'inline-block' : 'none'
  counter.dataset.display = 'inline-block'
  counter.title = 'Number of visible segments (all segments)'
  addSegment.after(counter)

  const graphLayer = Dock.layers.getByType('segmentation_with_graph', false)[0]
  const displayState = graphLayer.layer.displayState
  displayState.rootSegments.changed.add(() => {
    updateCounters()
  })
  displayState.hiddenRootSegments.changed.add(() => {
    updateCounters()
  })
  updateCounters()

  function updateCounters() {
    const visibleSegments = displayState.rootSegments.toJSON().length
    const hiddenSegments = displayState.hiddenRootSegments.toJSON().length
    counter.textContent = visibleSegments + ' (' + (visibleSegments + hiddenSegments) + ')'
  }
}

