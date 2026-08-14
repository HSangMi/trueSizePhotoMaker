import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { SelectedTarget } from '../types/editor';

export type AccordionSectionId = 'photo' | 'paper' | 'grid' | 'edit';

interface AccordionItem {
  id: AccordionSectionId;
  title: string;
  content: ReactNode;
}

interface SideAccordionProps {
  items: AccordionItem[];
  selectedTarget: SelectedTarget;
}

function selectionKey(target: SelectedTarget): string | null {
  if (!target) return null;
  if (target.type === 'uploaded') return `uploaded:${target.imageId}`;
  return `cell:${target.cellId}`;
}

/**
 * Multi-open accordion.
 * Auto-opens "edit" when a new edit target is selected,
 * while keeping other opened sections unchanged.
 */
export function SideAccordion({ items, selectedTarget }: SideAccordionProps) {
  const [openIds, setOpenIds] = useState<AccordionSectionId[]>(['photo']);
  const prevKey = useRef<string | null>(null);

  useEffect(() => {
    const key = selectionKey(selectedTarget);

    if (key && key !== prevKey.current) {
      setOpenIds((prev) =>
          prev.includes('edit') ? prev : [...prev, 'edit']
      );
    }

    prevKey.current = key;
  }, [selectedTarget]);

  const toggleAccordion = (id: AccordionSectionId) => {
    setOpenIds((prev) =>
        prev.includes(id)
            ? prev.filter((openId) => openId !== id)
            : [...prev, id]
    );
  };

  return (
      <div className="side-accordion">
        {items.map((item) => {
          const open = openIds.includes(item.id);

          return (
              <section
                  key={item.id}
                  className={
                    open
                        ? 'accordion-item accordion-item-open'
                        : 'accordion-item'
                  }
              >
                <button
                    type="button"
                    className="accordion-header"
                    aria-expanded={open}
                    onClick={() => toggleAccordion(item.id)}
                >
                  <span>{item.title}</span>

                  <span className="accordion-chevron" aria-hidden>
                {open ? '▾' : '▸'}
              </span>
                </button>

                {open && (
                    <div className="accordion-body">
                      {item.content}
                    </div>
                )}
              </section>
          );
        })}
      </div>
  );
}