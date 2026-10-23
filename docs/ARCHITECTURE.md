# SpaceShift: arquitetura

Este documento descreve a arquitetura do SpaceShift, as decisões técnicas e a
estrutura de pastas completa. As pastas marcadas com uma fase ainda não
existem: são criadas quando essa fase for implementada.

## 1. Princípios

1. **Uma única fonte de verdade.** O projeto (divisão + disposições + móveis)
   vive num store Zustand. A planta 2D e a cena 3D são duas *vistas* que leem
   o mesmo estado e enviam as mesmas ações. Não há dados duplicados entre vistas.
2. **Domínio independente da interface.** Tudo o que está em `src/core/` é
   JavaScript puro, sem React nem DOM: unidades, coordenadas, geometria,
   validação e modelo de dados. É testado isoladamente e pode ser reutilizado
   num backend Node no futuro.
3. **Metros no modelo, píxeis só no ecrã.** O modelo guarda medidas em metros
   (arredondadas ao milímetro). A conversão para píxeis acontece apenas na
   camada de visualização, através de um objeto `viewport`.
4. **Dependências num só sentido.** `core` ← `store` ← `features` ← `pages`/`app`.
   O `core` nunca importa nada de cima. O lint (`import/no-cycle`) falha se
   surgir uma dependência circular.
5. **Persistência atrás de uma interface.** O editor fala com um
   `ProjectRepository`; a primeira implementação usa LocalStorage e uma futura
   implementação pode falar com uma API (autenticação, base de dados, cloud)
   sem mexer no editor.

## 2. Stack e decisões técnicas

| Área | Escolha | Porquê |
| --- | --- | --- |
| Linguagem | JavaScript (ES2022) + JSDoc | Pedido do projeto. Os contratos de dados estão em `core/model/types.js` como `@typedef`, o que dá autocompletar no editor sem TypeScript. |
| Build | Vite 8 | Arranque instantâneo, HMR, build com Rolldown. |
| UI | React 19 | Componentes funcionais e hooks. |
| 2D | SVG renderizado pelo React | Vetorial e nítido em qualquer zoom. Cada móvel é um elemento DOM (eventos de rato, acessibilidade, testes com Testing Library) e a planta exporta-se para PNG desenhando o SVG num `<canvas>`. Para dezenas ou poucas centenas de objetos o desempenho é amplamente suficiente. |
| 3D | three + @react-three/fiber + @react-three/drei | Cena declarativa ligada ao mesmo store. Drei fornece `OrbitControls`, `ContactShadows`, etc. A cena 3D será carregada com `React.lazy` para não atrasar a abertura da planta. |
| Estado | Zustand | Store pequeno, sem boilerplate, com seletores para evitar re-renderizações e acessível fora do React (útil para atalhos de teclado e testes). |
| Undo/Redo | Histórico próprio de *snapshots* do documento | O documento é pequeno e imutável, por isso guardar estados é simples e fiável. Os arrastos são agrupados numa transação: um único passo no histórico por gesto. |
| Ícones | lucide-react | Traço fino, coerente com a direção visual. |
| Persistência | LocalStorage, com esquema versionado | Ver secção 5. |
| Testes | Vitest + Testing Library + jsdom | Mesma configuração do Vite, rápido. |
| Lint | Oxlint (vem no template oficial do Vite 8) | Muito rápido. Ativámos os plugins `react`, `import` e `vitest` e as regras `import/no-cycle` e `no-unused-vars`. Avisos fazem falhar o lint. |
| CSS | CSS moderno com *custom properties* e um ficheiro `.css` por componente | Sem framework, como pedido. Tokens em `styles/tokens.css`. |

Sem TypeScript, sem bibliotecas externas de modelos 3D e sem URLs remotos:
todos os móveis 3D serão geometria procedimental do Three.js.

## 3. Sistema de coordenadas

```
           X →
   (0,0) ┌──────────────────┐
         │                  │
   Z ↓   │     divisão      │  depth (largura da divisão)
         │                  │
         └──────────────────┘ (width, depth)
              width (comprimento)
```

- **Mundo (metros):** origem no canto superior esquerdo *interior* da divisão.
  X para a direita, Z para baixo na planta. As paredes são desenhadas por fora
  deste retângulo, por isso o espaço útil é exatamente `width × depth`.
- **Ecrã (píxeis CSS):** `ecrã = mundo × scale + offset`. O `scale` (px/m) é
  igual nos dois eixos, logo as proporções mantêm-se com qualquer zoom ou
  tamanho de janela. Ver `core/coordinates/viewport.js`.
- **Cena 3D:** o mesmo X e Z, com Y para cima. Um objeto com altura `h` e
  elevação `e` fica com o centro em `y = e + h/2`.
- **Rotação:** guardada em graus `[0, 360)`, no sentido horário visto de cima.
  Em Three.js `rotation.y = −graus × π/180`. Ver `core/coordinates/sceneMapping.js`.
- **Móveis:** `position` é o centro. `dimensions.width` é o comprimento no eixo
  X local, `dimensions.depth` a largura no eixo Z local e `dimensions.height` a
  altura. Na interface aparecem como Comprimento / Largura / Altura.

## 4. Geometria

- Cada móvel é um retângulo orientado (OBB). `getFootprint()` devolve os 4
  cantos reais tendo em conta a rotação.
- **Colisões:** Teorema do Eixo Separador (SAT) entre polígonos convexos, com
  tolerância de 1 mm para que móveis encostados não contem como sobrepostos.
  Devolve também a profundidade de penetração. Não comparamos centros nem
  caixas alinhadas (os testes incluem um caso em que as caixas alinhadas
  dariam um falso positivo).
- **Limites da divisão:** os cantos rodados são comparados com as paredes e
  devolvemos quanto o móvel ultrapassa cada parede.
- **Circulação (Fase 6):** distância mínima entre pegadas e entre pegadas e
  paredes, comparada com `settings.circulationMin` (0,9 m por omissão,
  configurável). É apresentada como *aviso*, distinto dos *erros*
  geométricos, e como orientação, não como garantia de conformidade legal.

## 5. Modelo de dados (esquema v1)

```js
{
  schemaVersion: 1,
  id: 'project_…', name: 'Sala da Ana',
  createdAt: '2026-10-23T18:00:00.000Z', updatedAt: '…',
  room: {
    type: 'living',            // ROOM_TYPES
    width: 5, depth: 4,        // m, interior
    wallHeight: 2.7, wallThickness: 0.15,
    wallColor: '#f2f0eb', floorMaterial: 'oak', floorColor: '#c9a77c',
  },
  layouts: [                   // disposições alternativas para comparar
    {
      id: 'layout_…', name: 'Disposição 1', createdAt: '…',
      items: [{
        id: 'item_…', catalogId: 'sofa-3', name: 'Sofá de 3 lugares', category: 'sofas',
        position: { x: 2.5, z: 1 }, rotation: 0, elevation: 0,
        dimensions: { width: 2.2, depth: 0.9, height: 0.85 },
        color: '#8a8f94', finish: 'linen', locked: false,
      }],
    },
  ],
  activeLayoutId: 'layout_…',
  settings: { gridSize: 0.1, snapToGrid: true, rotationStep: 15, circulationMin: 0.9 },
}
```

- A divisão é partilhada por todas as disposições; cada disposição tem a sua
  lista de móveis. É isto que permite comparar soluções para o mesmo espaço.
- Os móveis guardam uma cópia das medidas e da cor: o projeto continua a abrir
  mesmo que o catálogo mude.
- **Versões e migrações:** `MIGRATIONS[n]` converte da versão `n` para `n+1`.
  `migrateProject()` aplica a cadeia e recusa projetos de versões futuras com
  uma mensagem clara.
- **Leitura segura:** `parseProject(texto)` faz JSON → migração → validação e
  nunca lança exceções. Devolve `{ ok: true, project }` ou
  `{ ok: false, error: { code, message, details } }` com mensagens em
  português e o caminho de cada campo inválido. Um projeto corrompido no
  LocalStorage mostra um erro e não bloqueia a aplicação.
- **Ficheiro exportado:** `{ format: 'spaceshift.project', exportedAt, project }`.

O catálogo (Fase 4) segue o contrato `CatalogEntry` em `core/model/types.js`:
id, nome, categoria, medidas, limites de redimensionamento (ou `null` se
fixas), cor, acabamentos, preço indicativo opcional, chave do desenho 2D e
chave do modelo 3D.

## 6. Estrutura de pastas

```
spaceshift/
├── index.html
├── package.json
├── vite.config.js              # Vite + Vitest, alias @ → src
├── jsconfig.json               # alias @ para o editor
├── .oxlintrc.json
├── docs/
│   └── ARCHITECTURE.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx                # ponto de entrada                    ✓ Fase 1
    ├── app/
    │   ├── App.jsx             # raiz (Fase 1: ecrã provisório)      ✓ Fase 1
    │   ├── App.css
    │   └── routes.js           # Fase 2: escolha de página (início / editor)
    ├── pages/                  # Fase 2
    │   ├── ProjectsPage/       # lista, criar, duplicar, renomear, eliminar
    │   └── EditorPage/         # compõe as barras e painéis do editor
    ├── components/             # Fase 2: UI genérica, sem lógica de domínio
    │   ├── ui/                 # Button, IconButton, NumberField, Select, Toggle,
    │   │                       # Dialog, Tooltip, Tabs, EmptyState, Toast
    │   └── layout/             # TopBar, SidePanel, StatusBar, ResponsiveShell
    ├── features/               # módulos com UI + lógica de uma área do produto
    │   ├── editor2d/           # Fase 3: PlanCanvas (SVG), Grid, Rulers,
    │   │                       # FurnitureShape, SelectionHandles, useViewport,
    │   │                       # useDragItem, symbols/ (desenhos 2D)
    │   ├── catalog/            # Fase 4: CatalogPanel, CatalogCard, filtros,
    │   │                       # data/furniture.js (15+ móveis)
    │   ├── inspector/          # Fase 4: painel de propriedades
    │   ├── scene3d/            # Fase 5: Scene3D, Room3D, Furniture3D,
    │   │                       # models/ (geometria procedimental), Lights
    │   ├── analysis/           # Fase 6: painel de problemas e marcadores
    │   ├── projects/           # Fase 7: UI de gestão de projetos e disposições
    │   └── export/             # Fase 7: PNG, JSON, ficha de impressão
    ├── core/                   # JS puro, sem React, 100% testável
    │   ├── units/units.js      # metros, mm, formatação pt-PT        ✓ Fase 1
    │   ├── coordinates/
    │   │   ├── viewport.js     # mundo ↔ ecrã, zoom, pan, enquadrar ✓ Fase 1
    │   │   └── sceneMapping.js # planta ↔ Three.js                  ✓ Fase 1
    │   ├── geometry/           # vec2, ângulos, polígonos, pegadas,
    │   │   │                   # colisões SAT, snap                   ✓ Fase 1
    │   │   └── clearance.js    # Fase 6: distâncias e circulação
    │   ├── model/              # tipos, constantes, fábricas, métricas,
    │   │                       # validação, migrações, (de)serialização ✓ Fase 1
    │   ├── analysis/           # Fase 6: analyzeLayout() → erros e avisos
    │   └── history/            # Fase 7: pilha undo/redo com transações
    ├── store/                  # Fase 2–3: Zustand
    │   ├── projectStore.js     # documento + ações (addItem, moveItem…)
    │   ├── editorStore.js      # estado efémero: seleção, vista 2D/3D, ferramenta
    │   └── selectors.js
    ├── services/               # Fase 7: fronteira com o exterior
    │   ├── persistence/
    │   │   ├── ProjectRepository.js     # contrato (list, get, save, remove)
    │   │   └── localStorageRepository.js
    │   └── export/             # renderização PNG, download de ficheiros
    ├── hooks/                  # hooks genéricos: useKeyboardShortcuts,
    │                           # useResizeObserver, usePointerDrag
    ├── utils/                  # utilitários sem domínio (download, debounce)
    ├── styles/
    │   ├── tokens.css          # cores, tipografia, espaçamentos      ✓ Fase 1
    │   └── base.css            # reset e base                         ✓ Fase 1
    └── test/
        ├── setup.js            # jest-dom + limpeza                   ✓ Fase 1
        └── dependencies.test.js # confirma que as dependências resolvem ✓ Fase 1
```

Os testes ficam ao lado do código que testam (`*.test.js`).

## 7. Fluxo de dados (alvo)

```
 CatalogPanel ─┐                                         ┌─ PlanCanvas (SVG)
 Inspector ────┼─► ações do store ─► projeto (Zustand) ──┼─ Scene3D (R3F)
 Atalhos ──────┘        │                 │              ├─ StatusBar
                        ▼                 ▼              └─ AnalysisPanel
                    histórico       analyzeLayout() (memoizado)
                                          │
                                 repositório (LocalStorage → API)
```

## 8. Preparação para backend

- `services/persistence/ProjectRepository.js` define métodos assíncronos
  (`list`, `get`, `save`, `remove`) mesmo para LocalStorage, para que trocar
  para `fetch()` não mude quem os chama.
- Os ids são strings opacas (`project_<uuid>`), compatíveis com uma base de dados.
- O esquema versionado e a validação podem ser reutilizados no servidor.
