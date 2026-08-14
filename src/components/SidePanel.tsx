import { useEditorStore } from '../stores/editorStore';
import { EditPanel } from './EditPanel';
import { GridSection } from './GridSection';
import { PaperSection } from './PaperSection';
import { PhotoPanel } from './PhotoPanel';
import { SideAccordion } from './SideAccordion';

export function SidePanel() {
  const selectedTarget = useEditorStore((s) => s.selectedTarget);

  return (
    <aside className="side-panel">
      <SideAccordion
        selectedTarget={selectedTarget}
        items={[
          { id: 'photo', title: '사진', content: <PhotoPanel /> },
          { id: 'paper', title: '용지', content: <PaperSection /> },
          { id: 'grid', title: '그리드', content: <GridSection /> },
          { id: 'edit', title: '편집', content: <EditPanel /> },
        ]}
      />
    </aside>
  );
}
