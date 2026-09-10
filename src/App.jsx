import { useCallback, useEffect, useState } from 'react'
import { Viewer } from './components/Viewer'
import { ControlPanel } from './components/ControlPanel'
import { useStudio } from './state/useStudio'

export default function App() {
  const status = useStudio((s) => s.status)
  const statusText = useStudio((s) => s.statusText)
  const loadBuffer = useStudio((s) => s.loadBuffer)
  const [dragging, setDragging] = useState(0)

  const onDrop = useCallback(
    async (e) => {
      e.preventDefault()
      setDragging(0)
      const f = e.dataTransfer?.files?.[0]
      if (f && /\.(glb|gltf)$/i.test(f.name)) loadBuffer(await f.arrayBuffer(), f.name)
    },
    [loadBuffer],
  )

  useEffect(() => {
    const over = (e) => e.preventDefault()
    const enter = (e) => { e.preventDefault(); setDragging((d) => d + 1) }
    const leave = (e) => { e.preventDefault(); setDragging((d) => Math.max(0, d - 1)) }
    addEventListener('dragover', over)
    addEventListener('dragenter', enter)
    addEventListener('dragleave', leave)
    addEventListener('drop', onDrop)
    return () => {
      removeEventListener('dragover', over)
      removeEventListener('dragenter', enter)
      removeEventListener('dragleave', leave)
      removeEventListener('drop', onDrop)
    }
  }, [onDrop])

  return (
    <>
      <div id="stage"><Viewer /></div>

      <div className="panel" id="title">
        <h1>GLB Light Studio</h1>
        <div className="sub">materials &amp; lights, as authored</div>
      </div>

      <ControlPanel />

      {dragging > 0 && <div id="drop"><span>release to load this .glb</span></div>}

      {status !== 'ready' && (
        <div id="load" data-error={status === 'error' ? '1' : '0'}>
          <div>
            <p>{statusText}</p>
            {status === 'error' && (
              <p className="hint">
                Put your model at <code>public/DFA-light.glb</code>, or drop a .glb anywhere on this page.
              </p>
            )}
          </div>
        </div>
      )}

      <div id="hint">drag to orbit · scroll to zoom · drop a .glb to swap the model</div>
    </>
  )
}
