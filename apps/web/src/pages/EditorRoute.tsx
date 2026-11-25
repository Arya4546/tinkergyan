/**
 * EditorRoute.tsx — /editor and /editor/:id open the Python editor for
 * Python projects and the block/C++ editor for everything else.
 */
import { lazy } from 'react';
import { useSearchParams } from 'react-router-dom';

const Editor = lazy(() => import('./Editor'));
const PythonEditor = lazy(() => import('./PythonEditor'));

export default function EditorRoute() {
  const [searchParams] = useSearchParams();
  return searchParams.get('engine') === 'python' ? <PythonEditor /> : <Editor />;
}
