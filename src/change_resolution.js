

function changeResolution(e) {
  let res = Object.keys(e.target.dataset).length && e.target.dataset.resolution

  document.querySelectorAll('.kk-utilities-res').forEach(button => button.classList.remove('active'))
  e.target.classList.add('active')
  saveable.resolution = res
  saveToLS()

  viewer.layerManager.managedLayers.forEach(layer => {
    if (!layer || !layer.layer_ || !layer.layer_.sliceViewRenderScaleTarget) return

    layer.layer_.sliceViewRenderScaleTarget.restoreState(res)
  })
}
