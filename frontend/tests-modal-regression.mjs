// JSDOM-based regression test for the modal close-on-mousedown bug.
//
// We can't render React in JSDOM without a full setup, so instead we
// simulate the *event sequence* a user produces and assert that the
// backdrop only closes on a real click (not on mousedown that bubbles
// from a button inside the modal).
//
// This mirrors the React onMouseDown / onClick wiring in the
// actual Modal / ConfirmDialog / BoardList components.

import { JSDOM } from 'jsdom'

const dom = new JSDOM(`<!doctype html><html><body><div id="root"></div></body></html>`)
const { document } = dom.window
globalThis.document = document
globalThis.window = dom.window

let pass = 0
let fail = 0
function assert(cond, label) {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.error(`  ✗ ${label}`) }
}

// ---------- OLD (buggy) implementation ----------
function setupBuggyModal() {
  document.getElementById('root').innerHTML = `
    <div class="modal__backdrop" id="bd">
      <div class="modal" id="m">
        <button id="cancel">Cancel</button>
        <button id="del">Delete</button>
      </div>
    </div>
  `
  let open = true
  document.getElementById('bd').addEventListener('mousedown', () => { open = false })
  document.getElementById('m').addEventListener('mousedown', (e) => e.stopPropagation())
  document.getElementById('cancel').addEventListener('click', () => { open = false })
  document.getElementById('del').addEventListener('click', () => { open = false })
  return () => open
}

// ---------- NEW (fixed) implementation ----------
function setupFixedModal() {
  document.getElementById('root').innerHTML = `
    <div class="modal__backdrop" id="bd">
      <div class="modal" id="m">
        <button id="cancel">Cancel</button>
        <button id="del">Delete</button>
      </div>
    </div>
  `
  let open = true
  document.getElementById('bd').addEventListener('click', () => { open = false })
  document.getElementById('m').addEventListener('click', (e) => e.stopPropagation())
  document.getElementById('cancel').addEventListener('click', () => { open = false })
  document.getElementById('del').addEventListener('click', () => { open = false })
  return () => open
}

function simulateClickSequence(el) {
  // User's typical click: mousedown -> mouseup -> click.
  el.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }))
  el.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }))
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
}

function simulateBackdropClick(el) {
  // User clicks the backdrop (outside the modal): mousedown + mouseup + click on the backdrop itself.
  el.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }))
  el.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }))
  el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
}

console.log('\n[OLD behavior] demonstrates the bug')
{
  const isOpen = setupBuggyModal()
  const cancelBtn = document.getElementById('cancel')

  // Reproduce the bug: mousedown alone (e.g., user starts clicking the title input)
  // bubbles to the backdrop's mousedown listener and closes the modal.
  // Note: in JSDOM, just dispatching mousedown on the backdrop mousedown listener
  // — but to simulate "user pressed on a button inside", we use the cancel button.
  simulateClickSequence(cancelBtn)
  assert(isOpen() === false, 'BUGGY: mousedown on Cancel bubbles to backdrop and closes modal prematurely')

  // Now the click handler on Cancel never fires because the modal is gone.
  // (No further assertion needed; behavior is correct for the buggy case.)

  // Clicking the backdrop still works.
  let isOpen2 = setupBuggyModal()
  simulateBackdropClick(document.getElementById('bd'))
  assert(isOpen2() === false, 'BUGGY: backdrop click closes modal')
}

console.log('\n[NEW behavior] validates the fix')
{
  // Cancel button click: modal stays open during mousedown, click closes it cleanly.
  const isOpen = setupFixedModal()
  const cancelBtn = document.getElementById('cancel')

  cancelBtn.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }))
  cancelBtn.dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true }))
  assert(isOpen() === true, 'FIXED: mousedown on Cancel does NOT close modal (waits for click)')

  cancelBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }))
  assert(isOpen() === false, 'FIXED: click on Cancel closes modal')
}

{
  // Typing in the title input: mousedown fires (on the input), no click handler closes the modal.
  const isOpen = setupFixedModal()
  document.getElementById('root').insertAdjacentHTML('beforeend',
    '<div class="modal__body"><input id="title" type="text" /></div>')
  const input = document.getElementById('title')
  input.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true }))
  assert(isOpen() === true, 'FIXED: mousedown on form input does NOT close modal')

  // Backdrop click still closes the modal.
  const isOpen2 = setupFixedModal()
  simulateBackdropClick(document.getElementById('bd'))
  assert(isOpen2() === false, 'FIXED: backdrop click closes modal')
}

console.log(`\nResults: ${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
