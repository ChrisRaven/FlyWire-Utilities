function loadFromLS() {
  let data = Dock.ls.get('utilities', true)

  if (data) {
    Dock.mergeObjects(saveable, data)
    removeWithCtrlShift = saveable.visibleFeatures.removeWithCtrlShift
    hideWithAltShift = saveable.visibleFeatures.hideWithAltShift
  }
}


function saveToLS() {
  Dock.ls.set('utilities', saveable, true)
}

