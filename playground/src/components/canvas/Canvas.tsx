import { useDroppable } from '@dnd-kit/core'
import { useEmailStore } from '@/store/email-store'
import { CanvasComponent } from './CanvasComponent'
import { DropZone } from './DropZone'
import { AnimatePresence, motion } from 'framer-motion'
import { MailPlus } from 'lucide-react'

interface CanvasProps {
  isDragging: boolean
}

// Fallback droppable for the whole canvas body
function CanvasBody({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: 'canvas-body' })
  return <div ref={setNodeRef} className="min-h-full">{children}</div>
}

export function Canvas({ isDragging }: CanvasProps) {
  const { components, selectComponent } = useEmailStore()

  return (
    // Plain overflow-auto div — no Radix ScrollArea which breaks dnd coordinate tracking
    <div
      className="flex-1 h-full overflow-y-auto dot-grid-bg"
      onClick={() => selectComponent(null)}
    >
      <div className="p-6 min-h-full">
        <div className="max-w-150 mx-auto">
          {/* Browser chrome mockup frame */}
          <div className="rounded-xl shadow-2xl shadow-black/20 overflow-hidden border border-border/40 bg-card">
            {/* Title bar */}
            <div className="bg-surface border-b border-border/40 px-4 py-2 flex items-center gap-2 select-none">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
              <span className="text-[10px] text-muted-foreground ml-2 font-mono">email.mc</span>
            </div>

            {/* Email content — white bg always, like a real email */}
            <CanvasBody>
              <div className="bg-white min-h-125 relative">
                {/* Empty state */}
                {components.length === 0 && !isDragging && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <MailPlus className="h-12 w-12 mb-4 text-zinc-300" />
                    <p className="text-sm font-medium text-zinc-400">Drag a Section here to start</p>
                    <p className="text-xs text-zinc-400/70 mt-1">Layout → Section → Column → Content</p>
                  </motion.div>
                )}

                {/* First drop zone — always present, expands during drag */}
                <DropZone
                  id="canvas-drop-0"
                  index={0}
                  label="Drop here"
                  isDragging={isDragging}
                  isEmpty={components.length === 0}
                />

                <AnimatePresence mode="popLayout">
                  {components.map((comp, idx) => (
                    <motion.div
                      key={comp.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                    >
                      <CanvasComponent component={comp} isDragging={isDragging} />
                      <DropZone
                        id={`canvas-drop-${idx + 1}`}
                        index={idx + 1}
                        label="Drop here"
                        isDragging={isDragging}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CanvasBody>
          </div>
        </div>
      </div>
    </div>
  )
}
