import { useState } from 'react';
import { Sidebar, type SectionId } from '@/components/Sidebar';
import { DueDiligence } from '@/modules/DueDiligence';
import { AuditRAI } from '@/modules/AuditRAI';
import { GeneratoreLisp } from '@/modules/GeneratoreLisp';
import { Impianti } from '@/modules/Impianti';
import { Computo } from '@/modules/Computo';
import { Bozze } from '@/modules/Bozze';

function App() {
  const [section, setSection] = useState<SectionId>('due-diligence');

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar section={section} onChange={setSection} />
      <main className="flex-1 min-w-0">
        {section === 'due-diligence' && <DueDiligence />}
        {section === 'rai' && <AuditRAI />}
        {section === 'lisp' && <GeneratoreLisp />}
        {section === 'impianti' && <Impianti />}
        {section === 'computo' && <Computo />}
        {section === 'atti' && <Bozze />}
      </main>
    </div>
  );
}

export default App;
