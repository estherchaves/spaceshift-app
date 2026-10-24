import { EditorRoute } from '@/pages/EditorPage/EditorRoute.jsx'
import { ProjectsPage } from '@/pages/ProjectsPage/ProjectsPage.jsx'
import { parseRoute, useHash } from './router.js'
import { Toaster } from './Toaster.jsx'

/** Raiz da aplicação: lista de projetos ou editor, conforme o endereço. */
export default function App() {
  const route = parseRoute(useHash())
  return (
    <>
      {route.name === 'editor' ? <EditorRoute key={route.projectId} projectId={route.projectId} /> : <ProjectsPage />}
      <Toaster />
    </>
  )
}
