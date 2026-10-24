import { describe, expect, it } from 'vitest'
import { editorPath, parseRoute, projectsPath } from './router.js'

describe('rotas', () => {
  it('lê a lista e o editor a partir do hash', () => {
    expect(parseRoute('')).toEqual({ name: 'projects' })
    expect(parseRoute(projectsPath())).toEqual({ name: 'projects' })
    expect(parseRoute(editorPath('project_abc'))).toEqual({ name: 'editor', projectId: 'project_abc' })
    expect(parseRoute('#/qualquer/coisa')).toEqual({ name: 'projects' })
  })
})
