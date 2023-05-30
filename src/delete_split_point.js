
function deleteSplitPoint(e) {// console.log('deleteSplitPoint.event', e)
  if (!e.ctrlKey) return
// console.log('after ctrlKey')
  let value
  let type

  if (!viewer.mouseState.pickedRenderLayer) {
    type = 'description'
    value = Dock.getHighlightedSupervoxelId()
  }

  if (!value) {
    type = 'id'
    value = viewer.mouseState.pickedAnnotationId
  }
  // console.log('value', value)
  // console.log('type', type)
  
  if (!value) return
// console.log('after value')
  let point = Dock.annotations.getMulticutRef(type, value)
  // console.log('point', point)
  if (!point) return
// console.log('after point')
// console.log('point.reference', point.reference)
  point.source.delete(point.reference)
  point.reference.dispose()
}
