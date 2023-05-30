
function hideAllButHandler(e) {
  let target = e.target

  if (!target.classList.contains('segment-checkbox')) return

  document.querySelectorAll('.segment-checkbox').forEach(el => {
    if (el.checked && el !== target && el.title !== 'Uncheck to hide all segments') {
      el.click()
    }
  })

  if (!target.checked) {
    target.click()
  }
}

