function jumpToSegmentButton(e) {
  if (!e.ctrlKey) return

  document.getElementsByClassName('selected-segment-button').forEach(el => el.classList.remove('selected-segment-button'))
  // "selectedSeg" class is added automatically, whenever user hovers their mouse cursor over a segment in 2D or 3D
  const element = document.getElementsByClassName('selectedSeg')[0]
  if (!element) return

  element.scrollIntoView()
  element.parentElement.classList.add('selected-segment-button')
}
