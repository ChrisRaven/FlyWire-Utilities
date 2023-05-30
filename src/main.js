let batching = false
if (DEV && true) { // set true for batching, set false for other tests
  batching = true
}

document.addEventListener('dock-ready', () => {
  unsafeWindow.GM_xmlhttpRequest = GM_xmlhttpRequest
  main()
})


function main() {
  fix_optionsOrganization_2022_08_15()
  loadFromLS()
  let optionsDialog = Dock.dialog(optionsDialogSettings())

  let dock = new Dock()

  dock.addAddon({
    name: 'Utilities',
    id: ap,
    html: generateHtml(),
    css: /*css*/`
      #${ap} {
        text-align: center;
      }

      #${ap}jump-to-start,
      #${ap}add-annotation-at-start-wrapper,
      #${ap}remove-annotations-at-start-wrapper,
      #${ap}show-neuropils,
      #${ap}res-wrapper,
      #${ap}copy-position {
        display: block;
      }

      #${ap}toggle-background,
      #${ap}jump-to-start,
      #${ap}show-neuropils {
        margin: auto;
      }

      .selected-segment-button {
        border: 2px solid orange;
      }

      #${ap}display-number-of-segments {
        display: inline-block;
        margin-top: 9px;
        padding-left: 10px;
      }
    `,

    events: {
      '.neuroglancer-rendered-data-panel:first-of-type': {
        dblclick: {
          handler: dblClickHandler,
          singleNode: true
        }
      },
      '.neuroglancer-layer-side-panel': {
        contextmenu: (e) => {
          jumpToSegment(e)
          openSegmentsInNewTabHandler(e)
        }
      },
      [`#${ap}jump-to-start`]: {
        click: jumpToStart
      },
      [`.${ap}res`]: {
        click: e => changeResolution(e)
      },
      [`#${ap}add-annotation-at-start`]: {
        click: addAnnotationAtStartChanged
      },
      [`#${ap}remove-annotations-at-start`]: {
        click: removeAnnotationsAtStartChanged
      },
      [`#${ap}options`]: {
        click: () => optionsDialog.show()
      },
      [`#${ap}options-dialog`]: {
        click: (e) => optionsDialogToggleFeatures(e),
        input: (e) => optionsDialogTextInputHandler(e)
      },
      [`#${ap}toggle-background`]: {
        click: toggleBackground
      },
      [`#${ap}show-neuropils`]: {
        click: showNeuropils
      },
      [`#${ap}copy-position-copy`]: {
        click: copyPosition
      },
      [`#${ap}copy-position-paste`]: {
        click: pastePosition
      }
    }
  })

  document.addEventListener('fetch', e => fetchHandler(e))
  document.addEventListener('contextmenu', e => hideAllButHandler(e))
  initFields()

  Dock.addToMainTab('segmentation_with_graph', assignMainTabEvents)
  Dock.addToRightTab('segmentation_with_graph', 'Rendering', displayNumberOfSegments)

  if (typeof DEV !== 'undefined') {
    let button = document.createElement('button')
    button.textContent = 'Test'
    let top = document.getElementsByClassName('neuroglancer-viewer-top-row')[0]
    top.appendChild(button)
    top.addEventListener('click', e => testClickHandler(e))

    function testClickHandler(e) { }
  }

  fix_segmentColors_2022_07_15()
  fix_visibilityOptions_2022_07_30()

  document.addEventListener('keydown', e => {
    if (e.ctrlKey) {
      ctrl = true
    }

    if (e.shiftKey) {
      shift = true
    }

    if (e.altKey) {
      alt = true
    }
  })

  document.addEventListener('keyup', e => {
    // e.ctrlKey and e.shiftKey don't work for some reason
    if (e.key === 'Control') {
      ctrl = false
    }

    if (e.key === 'Shift') {
      shift = false
    }

    if (e.key === 'Alt') {
      alt = false
    }
  })

  let prevPrevId = null
  let prevId = null
  
  viewer.mouseState.changed.add(() => {
    if (ctrl && shift && removeWithCtrlShift && !DEV) {
      const id = viewer.mouseState.pickedValue.toJSON()
      if (id && prevId && prevPrevId && prevId === id && prevPrevId === id) {
        const element = document.querySelector(`button[data-seg-id="${id}"]`)
        if (element) {
          element.click()
        }
      }
      prevPrevId = prevId
      prevId = id
    }
    if (alt && shift && hideWithAltShift) {
      const id = viewer.mouseState.pickedValue.toJSON()
      if (id && prevId && prevPrevId && prevId === id && prevPrevId === id) {
        let element = document.querySelector(`button[data-seg-id="${id}"]`)
        if (element) {
          element = element.parentElement.querySelector('input[type="checkbox"]')
          element.click()
        }
      }

      prevPrevId = prevId
      prevId = id
    }
  })
}


function clearLists() {
  saveable.roots = {}
  saveable.leaves = {}
  saveToLS()
}


function assignMainTabEvents() {
  // setTimeout, because the changed event is called, when the elements aren't yet available in the DOM
  setTimeout(() => {
    document.getElementsByClassName('neuroglancer-rendered-data-panel')
      .forEach(panel => panel.addEventListener('contextmenu', (e) => {
        deleteAnnotationPoint(e)
        deleteSplitPoint(e)
        jumpToSegmentButton(e)
      }))
  }, 0)
}



function fetchHandler(e) {
  let response = e.detail.response
  let body = e.detail && e.detail.params ? e.detail.params.body : null
  let url = e.detail.url
  if (response.code && response.code === 400) return console.error('Utilities: failed operation')

  // we don't have to update segments after merge, because we still have a point from at least one of the merged fragments
  // so we only need to update the rootId right before jumping
  if (url.includes('split?')) {
    saveSegmentsAfterSplit(body)
    saveToLS()
  }
  else if (url.includes('proofreading_drive?')) {
    saveSegmentAfterClaim(response)
    deletePointsAtStart()
    addAnnotationAtStart()
    saveToLS()
  }
  else if (url.includes('split_preview?')) {
    if (!response.illegal_split) return
    let separatedSupervoxels = response.supervoxel_connected_components[2]
    if (!separatedSupervoxels || !separatedSupervoxels.length) return

    body = JSON.parse(body)
    highlightSeparatedSupervoxels(body, separatedSupervoxels)
  }
}


function highlightSeparatedSupervoxels(body, separatedSupervoxels) {
  separatedSupervoxels.forEach(separatedSupervoxel => {
    body.sinks.forEach(sink => {
      if (sink[0] !== separatedSupervoxel) return

      document.querySelector(`[data-seg-id="${separatedSupervoxel}"]`).style.border = '2px solid orange'
    })

    body.sources.forEach(source => {
      if (source[0] !== separatedSupervoxel) return

      document.querySelector(`[data-seg-id="${separatedSupervoxel}"]`).style.border = '2px solid orange'
    })
  })
}